import { describe, it, expect, vi } from 'vitest';
import { runAnalysisChain } from '../src/chain';
import { ScrapeBundle } from '../../scheduler/src/types';

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockReturnValue({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
        .mockResolvedValueOnce({ response: { text: () => 'axios 3.0 removes timeout.' } })
        .mockResolvedValueOnce({ response: { text: () => JSON.stringify([{ description: 'timeout removed', affected_pattern: 'axios.get timeout', migration_note: 'use AbortController', confidence: 'confirmed', source_url: null }]) } })
        .mockResolvedValueOnce({ response: { text: () => JSON.stringify([{ description: 'timeout removed', affected_pattern: 'axios.get timeout' }]) } })
        .mockResolvedValueOnce({ response: { text: () => JSON.stringify({ before_code: 'axios.get(url, {timeout: 5000})', after_code: 'axios.get(url, {signal: ctrl.signal})', fix_description: 'Replace timeout with AbortController', file_hint: 'src/**/*.js', estimated_minutes: 12 }) } })
        .mockResolvedValueOnce({ response: { text: () => JSON.stringify({ severity: 'critical', estimated_fix_minutes: 12, safe_to_upgrade: true }) } })
    })
  })
}));

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
  it('produces a valid impact brief with severity critical', async () => {
    const brief = await runAnalysisChain(MOCK_SCRAPE_BUNDLE);
    expect(brief.severity).toBe('critical');
    expect(brief.breaking_changes).toHaveLength(1);
    expect(brief.breaking_changes[0].before_code).toContain('timeout');
    expect(brief.safe_to_upgrade).toBe(true);
    expect(brief.chain_trace).toHaveProperty('step1');
  });

  it('sets dep_name from scrape data', async () => {
    const brief = await runAnalysisChain(MOCK_SCRAPE_BUNDLE);
    expect(brief.dep_name).toBe('axios');
  });
});
