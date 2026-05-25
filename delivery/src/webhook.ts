import { createHmac, timingSafeEqual } from 'crypto';
import { ImpactBrief } from '../../scheduler/src/types';

export function signPayload(payload: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
}

export async function sendWebhookAlert(brief: ImpactBrief, url: string): Promise<void> {
  const secret = process.env.WEBHOOK_SECRET || '';
  const payload = JSON.stringify(brief);
  const signature = signPayload(payload, secret);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ShiftScope-Signature': signature,
    },
    body: payload,
  });

  if (!resp.ok) {
    throw new Error(`Webhook returned ${resp.status}: ${resp.statusText}`);
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string
): boolean {
  const expected = signPayload(rawBody, secret);
  if (expected.length !== receivedSignature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSignature));
}
