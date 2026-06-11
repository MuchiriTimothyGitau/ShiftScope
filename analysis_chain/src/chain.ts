import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildStep1Prompt } from './prompts/step1_summarise';
import { buildStep2Prompt } from './prompts/step2_breaking_changes';
import { buildStep3Prompt } from './prompts/step3_cross_reference';
import { buildStep4Prompt } from './prompts/step4_generate_fix';
import { buildStep5Prompt } from './prompts/step5_score_severity';
import { securityScan } from './security/scanner';
import { analyzeTrends } from './trends/analyzer';
import { ScrapeBundle, ImpactBrief, ChainTrace } from './types.js';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const pro = genai.getGenerativeModel({ model: 'gemini-2.5-pro' });
const flash = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

function safeJsonParse(text: string, fallback: any): any {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return fallback;
  }
}

function buildApiSurfaceDiff(data: ScrapeBundle): string {
  return data.changelog_text.slice(0, 5000);
}

export async function runAnalysisChain(scrapeData: ScrapeBundle): Promise<ImpactBrief> {
  const trace: ChainTrace = {};

  const step1Prompt = buildStep1Prompt({
    name: scrapeData.dep_name,
    old_version: scrapeData.old_version,
    new_version: scrapeData.new_version,
    changelog_text: scrapeData.changelog_text,
  });
  const step1Resp = await flash.generateContent(step1Prompt);
  trace.step1 = { prompt: step1Prompt, response: step1Resp.response.text() };
  const summary = step1Resp.response.text();

  const step2Prompt = buildStep2Prompt({
    name: scrapeData.dep_name,
    old_version: scrapeData.old_version,
    new_version: scrapeData.new_version,
    summary,
    changelog_text: scrapeData.changelog_text,
    issues_text: scrapeData.issues_text,
    community_snippets: scrapeData.community_snippets,
  });
  const step2Resp = await pro.generateContent(step2Prompt);
  trace.step2 = { prompt: step2Prompt, response: step2Resp.response.text() };
  const breakingChanges = safeJsonParse(step2Resp.response.text(), []);

  const [securityResult, trendResult] = await Promise.all([
    securityScan(
      scrapeData.dep_name,
      scrapeData.ecosystem,
      scrapeData.changelog_text,
      scrapeData.community_snippets,
      scrapeData.issues_text,
      scrapeData.preCvuSignals,
    ),
    analyzeTrends(
      scrapeData.dep_name,
      scrapeData.old_version,
      scrapeData.new_version,
      scrapeData.ecosystem,
      scrapeData.changelog_text,
      scrapeData.community_snippets,
      scrapeData.issues_text,
    ),
  ]);
  trace.step6 = { prompt: 'Security scan (parallel)', response: JSON.stringify(securityResult) };
  trace.step7 = { prompt: 'Trend analysis (parallel)', response: JSON.stringify(trendResult) };

  const step3Prompt = buildStep3Prompt({
    name: scrapeData.dep_name,
    ecosystem: scrapeData.ecosystem,
    breaking_changes: breakingChanges,
    api_surface_diff: buildApiSurfaceDiff(scrapeData),
  });
  const step3Resp = await pro.generateContent(step3Prompt);
  trace.step3 = { prompt: step3Prompt, response: step3Resp.response.text() };
  const relevant = safeJsonParse(step3Resp.response.text(), []);

  const fixes: any[] = [];
  for (const change of relevant) {
    const step4Prompt = buildStep4Prompt({
      breaking_change: change,
      ecosystem: scrapeData.ecosystem,
      usage_context: buildApiSurfaceDiff(scrapeData),
    });
    const step4Resp = await pro.generateContent(step4Prompt);
    fixes.push(safeJsonParse(step4Resp.response.text(), {}));
  }
  trace.step4 = { fixes };

  const step5Prompt = buildStep5Prompt({
    summary,
    fixes,
    pre_cve_signals: scrapeData.preCvuSignals,
  });
  const step5Resp = await flash.generateContent(step5Prompt);
  trace.step5 = { prompt: step5Prompt, response: step5Resp.response.text() };
  const scoring = safeJsonParse(step5Resp.response.text(), { severity: 'low' });

  const supplyChainRisk = securityResult?.dependency_risk;
  const hasMalwareSignals = securityResult?.malware_indicators?.length > 0;
  const securityAdjustedSeverity =
    supplyChainRisk?.typo_squatting || supplyChainRisk?.dependency_confusion || hasMalwareSignals
      ? 'critical'
      : scoring.severity ?? 'low';

  return {
    dep_name: scrapeData.dep_name,
    old_version: scrapeData.old_version,
    new_version: scrapeData.new_version,
    summary,
    breaking_changes: fixes,
    pre_cve_signals: scrapeData.preCvuSignals,
    severity: securityAdjustedSeverity,
    estimated_fix_minutes: scoring.estimated_fix_minutes ?? 0,
    safe_to_upgrade: supplyChainRisk?.typo_squatting ? false : (scoring.safe_to_upgrade ?? true),
    chain_trace: trace,
    risk_assessment: {
      overall_risk_score: securityResult?.confidence ? Math.round(securityResult.confidence * 10) : 0,
      risk_level: securityAdjustedSeverity === 'critical' ? 'high' : (scoring.severity === 'critical' ? 'critical' : 'low'),
      signals: [],
      malware_indicators: securityResult?.malware_indicators || [],
      supply_chain_indicators: supplyChainRisk ? [
        ...(supplyChainRisk.typo_squatting ? [{ type: 'typo_squatting', description: 'Package name mimics a popular package', risk: 'high' as const }] : []),
        ...(supplyChainRisk.dependency_confusion ? [{ type: 'dependency_confusion', description: 'Package may be a dependency confusion attack', risk: 'high' as const }] : []),
        ...(supplyChainRisk.malicious_dependency_chain ? [{ type: 'malicious_chain', description: 'Package pulls in known malicious dependencies', risk: 'high' as const }] : []),
      ] : [],
      typosquat_result: null,
    },
    trend_signals: [
      ...(trendResult?.common_issues?.map(i => ({
        category: 'common_issue',
        signal: i,
        frequency: 'unknown',
        sources: ['community_analysis'],
        extracted_at: new Date().toISOString(),
      })) || []),
      ...(trendResult?.migration_patterns?.map(p => ({
        category: 'migration_pattern',
        signal: p,
        frequency: 'unknown',
        sources: ['community_analysis'],
        extracted_at: new Date().toISOString(),
      })) || []),
    ],
    upgrade_sentiment: trendResult?.upgrade_recommendation === 'safe' ? 'positive'
      : trendResult?.upgrade_recommendation === 'avoid' ? 'negative'
      : trendResult?.upgrade_recommendation === 'cautious' ? 'mixed'
      : 'unknown',
  };
}
