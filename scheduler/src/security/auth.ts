// API key authentication for webhook endpoints.

import { createHmac, timingSafeEqual } from 'crypto';

const API_KEYS = new Set<string>();

let initialized = false;
function init() {
  if (initialized) return;
  const keys = process.env.WEBHOOK_API_KEYS || '';
  for (const key of keys.split(',')) {
    const trimmed = key.trim();
    if (trimmed) API_KEYS.add(trimmed);
  }
  initialized = true;
}

export function authenticateRequest(authHeader: string | null | undefined): { valid: boolean; reason?: string } {
  init();

  if (!authHeader) {
    return { valid: false, reason: 'Missing Authorization header' };
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') {
    return { valid: false, reason: 'Authorization scheme must be Bearer' };
  }

  if (!token || token.length < 16) {
    return { valid: false, reason: 'Invalid API key format' };
  }

  if (!API_KEYS.has(token)) {
    return { valid: false, reason: 'Unknown API key' };
  }

  return { valid: true };
}

export function generateApiKey(): string {
  const { randomBytes } = require('crypto');
  return `ss_${randomBytes(32).toString('hex')}`;
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const received = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    if (expected.length !== received.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}
