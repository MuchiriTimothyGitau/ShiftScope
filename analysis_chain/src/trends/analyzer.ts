import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface TrendResult {
  community_sentiment: 'positive' | 'negative' | 'mixed' | 'unknown';
  common_issues: string[];
  migration_patterns: string[];
  risk_trend: 'improving' | 'stable' | 'deteriorating' | 'unknown';
  upgrade_recommendation: 'safe' | 'cautious' | 'avoid' | 'investigate';
  supporting_evidence: string[];
}

export async function analyzeTrends(
  depName: string,
  oldVersion: string,
  newVersion: string,
  ecosystem: string,
  changelogText: string,
  communitySnippets: string,
  issuesText: string,
): Promise<TrendResult> {
  const prompt = `You are a software engineer analyzing upgrade trends for an open-source package.

Package: ${depName} (${ecosystem})
Upgrade: ${oldVersion} → ${newVersion}

Changelog / Release Notes:
${changelogText || 'Not available'}

Community Discussion (Reddit, HN, etc.):
${communitySnippets || 'Not available'}

GitHub Issues (breaking-change labeled):
${issuesText || 'Not available'}

Analyze the community sentiment, common issues, and migration difficulty.

Respond with a JSON object exactly matching this interface:
{
  "community_sentiment": "positive|negative|mixed|unknown",
  "common_issues": ["array of specific issues reported by the community"],
  "migration_patterns": ["array of migration patterns or workarounds mentioned"],
  "risk_trend": "improving|stable|deteriorating|unknown",
  "upgrade_recommendation": "safe|cautious|avoid|investigate",
  "supporting_evidence": ["specific quotes or evidence from the data"]
}

Base your recommendation on:
- If breaking changes exist and community reaction is negative → "avoid" or "cautious"
- If security fixes and community sentiment is positive → "safe"
- If unmaintained or widespread issues → "investigate"
- If minor/patch upgrade with no controversy → "safe"`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, '').trim();
    return JSON.parse(cleaned) as TrendResult;
  } catch (err) {
    console.error(`Trend analysis failed for ${depName}:`, err);
    return {
      community_sentiment: 'unknown',
      common_issues: [],
      migration_patterns: [],
      risk_trend: 'unknown',
      upgrade_recommendation: 'investigate',
      supporting_evidence: ['Analysis failed — manual review needed'],
    };
  }
}

export function extractTrendsAcrossDeps(briefs: { dep_name: string; severity: string; trend_signals?: any[] }[]): string[] {
  if (briefs.length === 0) return [];

  const trends: string[] = [];
  const highSeverity = briefs.filter(b => b.severity === 'critical' || b.severity === 'high');

  if (highSeverity.length > 2) {
    trends.push(`ALERT: ${highSeverity.length} high-severity advisories in this scan cycle`);
  }

  const ecosystemBreakdown = briefs.reduce<Record<string, number>>((acc, b) => {
    const eco = b.dep_name.includes('/') ? 'scoped' : 'npm';
    acc[eco] = (acc[eco] || 0) + 1;
    return acc;
  }, {});

  for (const [eco, count] of Object.entries(ecosystemBreakdown)) {
    trends.push(`${count} package(s) from ${eco} ecosystem need attention`);
  }

  return trends;
}
