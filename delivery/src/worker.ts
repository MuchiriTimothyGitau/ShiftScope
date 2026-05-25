import { createClient } from '@supabase/supabase-js';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { sendSlackAlert } from './slack';
import { sendEmailAlert } from './email';
import { sendWebhookAlert } from './webhook';
import { ImpactBrief } from '../../scheduler/src/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

async function processDeliveryJob(job: any): Promise<void> {
  const { brief_id, severity } = job.data;

  const { data: brief, error } = await supabase
    .from('impact_briefs')
    .select('*')
    .eq('id', brief_id)
    .single();

  if (error || !brief) throw new Error(`Brief ${brief_id} not found`);

  const impactBrief: ImpactBrief = {
    dep_name: brief.dep_name || '',
    old_version: brief.old_version,
    new_version: brief.new_version,
    severity: brief.severity,
    summary: brief.summary || '',
    breaking_changes: brief.breaking_changes || [],
    pre_cve_signals: brief.pre_cve_signals || [],
    estimated_fix_minutes: brief.estimated_fix_minutes || 0,
    safe_to_upgrade: brief.safe_to_upgrade ?? true,
    chain_trace: brief.chain_trace || {},
  };

  const channels: string[] = [];

  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_DEFAULT_CHANNEL) {
    channels.push('slack');
  }
  if (process.env.RESEND_API_KEY) {
    channels.push('email');
  }
  if (process.env.WEBHOOK_SECRET) {
    channels.push('webhook');
  }
  channels.push('dashboard');

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'slack':
          await sendSlackAlert(impactBrief);
          break;
        case 'email':
          if (process.env.ALERT_EMAIL_TO) {
            await sendEmailAlert(impactBrief, process.env.ALERT_EMAIL_TO);
          }
          break;
        case 'webhook':
          if (process.env.WEBHOOK_URL) {
            await sendWebhookAlert(impactBrief, process.env.WEBHOOK_URL);
          }
          break;
        case 'dashboard':
          break;
      }
    } catch (err) {
      console.error(`Delivery to ${channel} failed:`, err);
    }
  }

  await supabase.from('alert_deliveries').insert({
    brief_id,
    channel: channels.join(','),
    status: 'sent',
    delivered_at: new Date().toISOString(),
  });
}

const worker = new Worker('delivery', processDeliveryJob, {
  connection,
  concurrency: 5,
  lockDuration: 60_000,
});

worker.on('completed', (job) => {
  console.log(`Delivery job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Delivery job ${job?.id} failed:`, err);
});

console.log('Delivery engine worker started');
