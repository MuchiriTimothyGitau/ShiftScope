import { describe, it, expect } from 'vitest';
import type { ImpactBrief } from '../src/types.js';

const mockBrief: ImpactBrief = {
  dep_name: 'express',
  old_version: '3.10.1',
  new_version: '4.21.2',
  severity: 'critical',
  summary: 'Express 3.x is highly deprecated.',
  breaking_changes: [
    {
      description: 'Removed app.configure',
      affected_pattern: 'app.configure()',
      before_code: 'app.configure("development", fn)',
      after_code: 'if (process.env.NODE_ENV === "development") fn()',
      fix_description: 'Replace with conditional checks.',
      file_hint: 'src/app.js',
      estimated_minutes: 15,
    },
  ],
  pre_cve_signals: [
    {
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-43799',
      title: 'Prototype Pollution in Router',
      date: '2024-06-01',
      credibility_score: 0.95,
    },
  ],
  estimated_fix_minutes: 15,
  safe_to_upgrade: true,
  chain_trace: {},
};

describe('Slack Alert Builder', () => {
  it('should build Slack blocks with correct header', async () => {
    const { buildSlackBlocks } = await import('../src/slack.js');
    const blocks = buildSlackBlocks(mockBrief);
    const headerBlock = blocks[0] as any;
    expect(headerBlock.type).toBe('header');
    expect(headerBlock.text.text).toContain('express');
    expect(headerBlock.text.text).toContain('3.10.1');
  });

  it('should include breaking changes in blocks', async () => {
    const { buildSlackBlocks } = await import('../src/slack.js');
    const blocks = buildSlackBlocks(mockBrief);
    const breakingBlock = blocks.find(b => (b as any).type === 'section');
    expect(breakingBlock).toBeDefined();
    expect((breakingBlock as any).text.text).toContain('app.configure');
  });
});

describe('Email Builder', () => {
  it('should build HTML with dep name in subject', async () => {
    const { buildEmailHtml } = await import('../src/email.js');
    const html = buildEmailHtml(mockBrief);
    expect(html).toContain('express');
    expect(html).toContain('CRITICAL');
  });

  it('should include breaking changes table', async () => {
    const { buildEmailHtml } = await import('../src/email.js');
    const html = buildEmailHtml(mockBrief);
    expect(html).toContain('app.configure');
    expect(html).toContain('Breaking Changes');
  });
});

describe('Webhook Signer', () => {
  it('should sign payload correctly', async () => {
    const { signPayload, verifyWebhookSignature } = await import('../src/webhook.js');
    const payload = JSON.stringify(mockBrief);
    const secret = 'test-secret';
    const signature = signPayload(payload, secret);
    expect(signature).toMatch(/^sha256=/);

    const valid = verifyWebhookSignature(payload, signature, secret);
    expect(valid).toBe(true);
  });

  it('should reject invalid signature', async () => {
    const { verifyWebhookSignature } = await import('../src/webhook.js');
    const payload = JSON.stringify(mockBrief);
    const secret = 'test-secret';
    const result = verifyWebhookSignature(payload, 'sha256=bad', secret);
    expect(result).toBe(false);
  });
});
