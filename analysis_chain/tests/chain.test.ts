import { describe, it, expect, vi } from 'vitest';
import { runAnalysisChain } from '../src/chain';
import { ScrapeBundle } from '../../scheduler/src/types';

const mockGenerateContent = vi.hoisted(() => vi.fn()
  .mockResolvedValueOnce({ response: { text: () => 'axios 3.0 removes timeout.' } })
  .mockResolvedValueOnce({ response: { text: () => JSON.stringify([{ description: 'timeout removed', affected_pattern: 'axios.get timeout', migration_note: 'use AbortController', confidence: 'confirmed', source_url: null }]) } })
  .mockResolvedValueOnce({ response: { text: () => JSON.stringify({
    malware_indicators: [],
    code_analysis: { suspicious_patterns: [], obfuscation_detected: false, network_activity: false, file_system_access: false, crypto_usage: false, installer_behavior: false },
    dependency_risk: { typo_squatting: false, dependency_confusion: false, malicious_dependency_chain: false, known_vulnerability: false },
    overall_assessment: 'No indicators found',
    confidence: 0,
  }) } })
  .mockResolvedValueOnce({ response: { text: () => JSON.stringify({
    community_sentiment: 'positive', common_issues: [], migration_patterns: [],
    risk_trend: 'stable', upgrade_recommendation: 'safe', supporting_evidence: ['No community concerns'],
  }) } })
  .mockResolvedValueOnce({ response: { text: () => JSON.stringify([{ description: 'timeout removed', affected_pattern: 'axios.get timeout' }]) } })
  .mockResolvedValueOnce({ response: { text: () => JSON.stringify({ before_code: 'axios.get(url, {timeout: 5000})', after_code: 'axios.get(url, {signal: ctrl.signal})', fix_description: 'Replace timeout with AbortController', file_hint: 'src/**/*.js', estimated_minutes: 12 }) } })
  .mockResolvedValueOnce({ response: { text: () => JSON.stringify({ severity: 'critical', estimated_fix_minutes: 12, safe_to_upgrade: true }) } })
);

vi.mock('@google/generative-ai', () => {
  class MockGenAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  }
  return { GoogleGenerativeAI: MockGenAI };
});

const MOCK_SCRAPE_BUNDLE: ScrapeBundle = {
  dep_name: 'axios',
  old_version: '1.6.8',
  new_version: '3.0.0',
  ecosystem: 'npm',
  changelog_text: 'Breaking: timeout option removed. Use AbortController instead.',
  issues_text: 'Issue #123: timeout removed in v3',
  community_snippets: 'Reddit: axios 3.0 removed timeout option',
  preCvuSignals: [{ url: 'https://example.com/cve', title: 'Pre-CVE signal', date: '2026-05-01', credibility_score: 0.8 }],
};

describe('Analysis Chain', () => {
  it('produces a valid impact brief with all 7 steps', async () => {
    const brief = await runAnalysisChain(MOCK_SCRAPE_BUNDLE);
    expect(brief.severity).toBe('critical');
    expect(brief.dep_name).toBe('axios');
    expect(brief.breaking_changes).toHaveLength(1);
    expect(brief.breaking_changes[0].before_code).toContain('timeout');
    expect(brief.safe_to_upgrade).toBe(true);
    expect(brief.chain_trace).toHaveProperty('step1');
    expect(brief.chain_trace).toHaveProperty('step6');
    expect(brief.chain_trace).toHaveProperty('step7');
  });
});
