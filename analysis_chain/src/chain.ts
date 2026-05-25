import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildStep1Prompt } from './prompts/step1_summarise';
import { buildStep2Prompt } from './prompts/step2_breaking_changes';
import { buildStep3Prompt } from './prompts/step3_cross_reference';
import { buildStep4Prompt } from './prompts/step4_generate_fix';
import { buildStep5Prompt } from './prompts/step5_score_severity';
import { ScrapeBundle, ImpactBrief, ChainTrace } from '../../scheduler/src/types';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const pro = genai.getGenerativeModel({ model: 'gemini-1.5-pro' });
const flash = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  return {
    dep_name: scrapeData.dep_name,
    old_version: scrapeData.old_version,
    new_version: scrapeData.new_version,
    summary,
    breaking_changes: fixes,
    pre_cve_signals: scrapeData.preCvuSignals,
    severity: scoring.severity ?? 'low',
    estimated_fix_minutes: scoring.estimated_fix_minutes ?? 0,
    safe_to_upgrade: scoring.safe_to_upgrade ?? true,
    chain_trace: trace,
  };
}
