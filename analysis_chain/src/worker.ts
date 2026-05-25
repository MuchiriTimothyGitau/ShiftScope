import { createClient } from '@supabase/supabase-js';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runAnalysisChain } from './chain';
import { ScrapeBundle } from '../../scheduler/src/types';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

async function processAnalysisJob(job: any): Promise<void> {
  const { scrape_id } = job.data;

  const { data: scrape, error } = await supabase
    .from('raw_scrapes')
    .select('*')
    .eq('id', scrape_id)
    .single();

  if (error || !scrape) throw new Error(`Scrape ${scrape_id} not found`);

  const bundle: ScrapeBundle = {
    dep_name: scrape.dep_name,
    old_version: scrape.old_version,
    new_version: scrape.new_version,
    ecosystem: scrape.ecosystem,
    changelog_text: scrape.structured?.changelog_text || '',
    issues_text: scrape.structured?.issues_text || '',
    community_snippets: scrape.structured?.community_snippets || '',
    preCvuSignals: scrape.structured?.pre_cve_signals || [],
  };

  const brief = await runAnalysisChain(bundle);

  const { error: insertError } = await supabase
    .from('impact_briefs')
    .insert({
      dep_id: scrape.dep_id,
      old_version: brief.old_version,
      new_version: brief.new_version,
      severity: brief.severity,
      summary: brief.summary,
      breaking_changes: brief.breaking_changes,
      pre_cve_signals: brief.pre_cve_signals,
      estimated_fix_minutes: brief.estimated_fix_minutes,
      safe_to_upgrade: brief.safe_to_upgrade,
      chain_trace: brief.chain_trace,
    });

  if (insertError) throw insertError;
}

const worker = new Worker('analysis', processAnalysisJob, {
  connection,
  concurrency: 3,
  lockDuration: 120_000,
});

worker.on('completed', (job) => {
  console.log(`Analysis job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Analysis job ${job?.id} failed:`, err);
});

console.log('Analysis chain worker started');
