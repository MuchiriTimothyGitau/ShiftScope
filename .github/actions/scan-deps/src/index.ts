import * as core from '@actions/core';
import * as fs from 'fs';
import { parseLockfile } from '../../../../scheduler/src/lockfile_parser/index';
import { assessRisk, RiskAssessment } from '../../../../scheduler/src/security/risk-scanner';

interface Finding {
  dep_name: string;
  current_version: string;
  ecosystem: string;
  risk: RiskAssessment;
}

async function run(): Promise<void> {
  try {
    const lockfilePath = core.getInput('lockfile-path', { required: true });
    const ecosystemHint = core.getInput('ecosystem');
    const failOn = core.getInput('fail-on') as RiskAssessment['risk_level'];

    if (!fs.existsSync(lockfilePath)) {
      core.setFailed(`Lockfile not found at "${lockfilePath}"`);
      return;
    }

    const content = fs.readFileSync(lockfilePath, 'utf-8');
    const filename = lockfilePath.split(/[/\\]/).pop() || '';

    const deps = parseLockfile(filename, content);
    if (!deps.length) {
      core.info('No dependencies found in lockfile');
      core.setOutput('findings-count', '0');
      core.setOutput('risk-score', '0');
      core.setOutput('findings-json', '[]');
      return;
    }

    const findings: Finding[] = [];

    for (const dep of deps) {
      const risk = assessRisk(dep.name, dep.ecosystem as any, {}, dep.version);
      const finding: Finding = {
        dep_name: dep.name,
        current_version: dep.version,
        ecosystem: dep.ecosystem,
        risk,
      };
      findings.push(finding);

      const sev = risk.risk_level;
      const msg = `[${sev.toUpperCase()}] ${dep.name}@${dep.version} — score ${risk.overall_risk_score}: ${risk.signals.map(s => s.description).join('; ')}`;

      if (sev === 'critical' || sev === 'high') {
        core.error(msg, { file: lockfilePath, title: dep.name });
      } else if (sev === 'medium') {
        core.warning(msg, { file: lockfilePath, title: dep.name });
      } else {
        core.notice(msg, { file: lockfilePath, title: dep.name });
      }
    }

    const maxScore = Math.max(...findings.map(f => f.risk.overall_risk_score), 0);
    const criticalCount = findings.filter(f => f.risk.risk_level === 'critical').length;
    const highCount = findings.filter(f => f.risk.risk_level === 'high').length;

    core.setOutput('findings-count', String(findings.length));
    core.setOutput('risk-score', String(maxScore));
    core.setOutput('findings-json', JSON.stringify(findings));

    const severityRank = { 'none': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    if (severityRank[failOn] <= severityRank['high'] && (criticalCount + highCount) > 0) {
      core.setFailed(`Found ${criticalCount} critical + ${highCount} high-severity issues (fail-on: ${failOn})`);
    }
  } catch (err: any) {
    core.setFailed(err.message);
  }
}

run();
