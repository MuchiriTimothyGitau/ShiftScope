import * as vscode from 'vscode';

interface DepEntry {
  name: string;
  version: string;
  ecosystem: string;
}

interface Finding {
  dep_name: string;
  current_version: string;
  ecosystem: string;
  overall_risk_score: number;
  risk_level: string;
  signals: { category: string; description: string; severity: string; score: number }[];
  typosquat: { is_suspicious: boolean; lookalike_of: string | null };
}

function parseNpmLock(content: string): DepEntry[] {
  try {
    const json = JSON.parse(content);
    const deps: DepEntry[] = [];
    const all = { ...json.dependencies, ...json.devDependencies, ...json.optionalDependencies };
    for (const [name, info] of Object.entries(all)) {
      const pkg = info as any;
      deps.push({ name, version: pkg.version?.replace(/^\^|~|>=?|<=?/, '') || 'unknown', ecosystem: 'npm' });
    }
    return deps;
  } catch { return []; }
}

function parseRequirements(content: string): DepEntry[] {
  return content.split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('-'))
    .map(l => {
      const m = l.match(/^([a-zA-Z0-9_.-]+)\s*([><=!~]+)\s*([\d.]+)/);
      return m ? { name: m[1], version: m[3], ecosystem: 'pypi' } : null;
    }).filter(Boolean) as DepEntry[];
}

function parseCargoLock(content: string): DepEntry[] {
  const deps: DepEntry[] = [];
  const regex = /name\s*=\s*"([^"]+)"\s*\nversion\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    deps.push({ name: m[1], version: m[2], ecosystem: 'crates' });
  }
  return deps;
}

const TYPOSQUAT_DATASET = [
  'react', 'vue', 'angular', 'express', 'lodash', 'axios', 'chalk',
  'moment', 'underscore', 'request', 'async', 'bluebird', 'commander',
  'debug', 'colors', 'body-parser', 'cookie-parser', 'mongoose',
  'passport', 'socket.io', 'webpack', 'gulp', 'grunt', 'babel',
  'eslint', 'prettier', 'typescript', 'nodemon', 'mocha', 'jest',
];

function checkTyposquat(name: string): { is_suspicious: boolean; lookalike_of: string | null; risk_score: number } {
  const lower = name.toLowerCase();
  for (const popular of TYPOSQUAT_DATASET) {
    const pLower = popular.toLowerCase();
    if (lower === pLower) continue;
    const dist = levenshtein(lower, pLower);
    if (dist <= 2 && dist > 0) {
      return { is_suspicious: true, lookalike_of: popular, risk_score: Math.max(1, 8 - dist * 2) };
    }
  }
  return { is_suspicious: false, lookalike_of: null, risk_score: 0 };
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function assessLocal(name: string, version: string, ecosystem: string): Finding {
  const signals: Finding['signals'] = [];
  let score = 0;

  const typo = checkTyposquat(name);
  if (typo.is_suspicious) {
    signals.push({
      category: 'typosquatting',
      description: `Package "${name}" resembles popular package "${typo.lookalike_of}"`,
      severity: typo.risk_score >= 5 ? 'high' : 'medium',
      score: typo.risk_score,
    });
    score += typo.risk_score * 1.5;
  }

  if (/^0\.\d+\.\d+$/.test(version) || version === '0.0.0') {
    signals.push({
      category: 'pre_release',
      description: `Package "${name}" is on pre-release version ${version}`,
      severity: 'medium', score: 4,
    });
    score += 4;
  }

  if (!version || version === 'latest' || version === '*') {
    signals.push({
      category: 'unpinned_version',
      description: `Package "${name}" has unpinned version "${version}"`,
      severity: 'medium', score: 5,
    });
    score += 5;
  }

  let riskLevel = 'none';
  if (score >= 15) riskLevel = 'critical';
  else if (score >= 10) riskLevel = 'high';
  else if (score >= 5) riskLevel = 'medium';
  else if (score >= 2) riskLevel = 'low';

  return {
    dep_name: name, current_version: version, ecosystem,
    overall_risk_score: Math.min(Math.round(score * 10) / 10, 10),
    risk_level: riskLevel, signals, typosquat: { is_suspicious: typo.is_suspicious, lookalike_of: typo.lookalike_of },
  };
}

function detectEcosystem(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes('package.json') || f.endsWith('.js') || f.endsWith('.ts')) return 'npm';
  if (f.includes('requirements') || f.endsWith('.txt') || f.endsWith('.pip')) return 'pypi';
  if (f.includes('cargo.lock') || f.includes('cargo.toml')) return 'crates';
  if (f.includes('go.sum') || f.includes('go.mod')) return 'go';
  return 'npm';
}

function parseDeps(filename: string, content: string): DepEntry[] {
  const f = filename.toLowerCase();
  if (f.includes('package.json')) return parseNpmLock(content);
  if (f.includes('requirements') || f.endsWith('.txt')) return parseRequirements(content);
  if (f.includes('cargo.lock')) return parseCargoLock(content);
  return parseNpmLock(content);
}

export function showResults(context: vscode.ExtensionContext, findings: Finding[], filename: string) {
  const panel = vscode.window.createWebviewPanel(
    'shiftscopeResults',
    `ShiftScope: ${filename}`,
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const critical = findings.filter(f => f.risk_level === 'critical').length;
  const high = findings.filter(f => f.risk_level === 'high').length;
  const medium = findings.filter(f => f.risk_level === 'medium').length;
  const low = findings.filter(f => f.risk_level === 'low').length;
  const maxScore = Math.max(...findings.map(f => f.overall_risk_score), 0);

  const rows = findings.map(f => `
    <tr class="severity-${f.risk_level}">
      <td><span class="badge badge-${f.risk_level}">${f.risk_level}</span></td>
      <td><strong>${f.dep_name}</strong></td>
      <td>${f.current_version}</td>
      <td>${f.ecosystem}</td>
      <td>${f.overall_risk_score}</td>
      <td>${f.signals.map(s => `<span class="signal">${s.description}</span>`).join('')}</td>
    </tr>`).join('');

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
  h1 { margin: 0 0 8px; font-size: 1.5em; }
  .summary { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .stat { padding: 12px 20px; border-radius: 8px; text-align: center; min-width: 80px; }
  .stat-value { font-size: 2em; font-weight: bold; }
  .stat-label { font-size: 0.8em; opacity: 0.8; }
  .stat-critical { background: rgba(255, 70, 70, 0.2); border: 1px solid #ff4646; }
  .stat-high { background: rgba(255, 165, 0, 0.2); border: 1px solid #ffa500; }
  .stat-medium { background: rgba(255, 255, 0, 0.15); border: 1px solid #ffd700; }
  .stat-low { background: rgba(100, 149, 237, 0.2); border: 1px solid #6495ed; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; font-weight: 600; text-transform: uppercase; }
  .badge-critical { background: #ff4646; color: #fff; }
  .badge-high { background: #ffa500; color: #000; }
  .badge-medium { background: #ffd700; color: #000; }
  .badge-low { background: #6495ed; color: #fff; }
  .badge-none { background: #4caf50; color: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); }
  th { position: sticky; top: 0; background: var(--vscode-editor-background); }
  .signal { display: inline-block; margin: 2px 4px 2px 0; padding: 1px 6px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 4px; font-size: 0.85em; }
  .empty { text-align: center; padding: 40px; opacity: 0.6; }
  .risk-meter { height: 8px; border-radius: 4px; background: #333; margin: 8px 0 16px; overflow: hidden; }
  .risk-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
</style>
</head>
<body>
  <h1>🔍 ShiftScope — ${filename}</h1>
  <div class="risk-meter"><div class="risk-fill" style="width:${maxScore * 10}%;background:${maxScore >= 8 ? '#ff4646' : maxScore >= 5 ? '#ffa500' : maxScore >= 2 ? '#ffd700' : '#4caf50'}"></div></div>

  <div class="summary">
    <div class="stat stat-critical"><div class="stat-value">${critical}</div><div class="stat-label">Critical</div></div>
    <div class="stat stat-high"><div class="stat-value">${high}</div><div class="stat-label">High</div></div>
    <div class="stat stat-medium"><div class="stat-value">${medium}</div><div class="stat-label">Medium</div></div>
    <div class="stat stat-low"><div class="stat-value">${low}</div><div class="stat-label">Low</div></div>
    <div class="stat" style="background:rgba(76,175,80,0.15);border:1px solid #4caf50"><div class="stat-value">${findings.length - critical - high - medium - low}</div><div class="stat-label">Safe</div></div>
  </div>

  ${findings.length === 0 ? '<div class="empty">No dependencies found.</div>' : `
  <table>
    <thead><tr><th>Risk</th><th>Package</th><th>Version</th><th>Eco</th><th>Score</th><th>Signals</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`}
</body>
</html>`;
}

export async function scanFile(context: vscode.ExtensionContext, scanWorkspace = false) {
  let files: vscode.Uri[] = [];

  if (scanWorkspace) {
    const patterns = ['**/package.json', '**/requirements.txt', '**/Cargo.lock', '**/go.sum'];
    for (const p of patterns) {
      const found = await vscode.workspace.findFiles(p, '**/node_modules/**', 20);
      files.push(...found);
    }
  } else {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor. Open a lockfile first.');
      return;
    }
    files = [editor.document.uri];
  }

  if (!files.length) {
    vscode.window.showInformationMessage('No lockfiles found in workspace.');
    return;
  }

  for (const file of files) {
    const doc = await vscode.workspace.openTextDocument(file);
    const content = doc.getText();
    const filename = file.path.split('/').pop() || '';
    const deps = parseDeps(filename, content);

    if (!deps.length) {
      vscode.window.showInformationMessage(`No dependencies found in ${filename}.`);
      continue;
    }

    const findings = deps.map(d => assessLocal(d.name, d.version, d.ecosystem));
    showResults(context, findings, filename);

    const diags: vscode.Diagnostic[] = [];
    const collection = vscode.languages.createDiagnosticCollection('shiftscope');

    for (const f of findings) {
      if (f.risk_level === 'critical' || f.risk_level === 'high') {
        const line = content.split('\n').findIndex(l => l.includes(`"${f.dep_name}"`));
        const range = new vscode.Range(
          new vscode.Position(Math.max(0, line), 0),
          new vscode.Position(Math.max(0, line), 200),
        );
        const diag = new vscode.Diagnostic(
          range,
          `[${f.risk_level.toUpperCase()}] ${f.dep_name} — ${f.signals.map(s => s.description).join('; ')}`,
          f.risk_level === 'critical' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
        );
        diag.source = 'ShiftScope';
        diags.push(diag);
      }
    }
    collection.set(file, diags);
  }
}
