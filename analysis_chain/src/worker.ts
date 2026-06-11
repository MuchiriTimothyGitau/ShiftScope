import { createClient } from '@supabase/supabase-js';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { runAnalysisChain } from './chain';
import { ScrapeBundle } from './types.js';
import { assessRisk } from '../../scheduler/src/security/index.js';
import { WorkerMonitor } from '../../scheduler/src/monitor.js';
import { assertValidEnv } from '../../scheduler/src/security/env-validator.js';
import { setupGracefulShutdown, registerWorkerShutdown, registerRedisShutdown } from '../../scheduler/src/resilience/shutdown.js';

assertValidEnv('analysis');
setupGracefulShutdown();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const monitor = new WorkerMonitor('analysis-chain');
monitor.connect().catch(() => {});

async function processAnalysisJob(job: any): Promise<void> {
  const startTime = Date.now();
  await monitor.recordJobStart(job.id!);
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

  const heuristicRisk = assessRisk(
    scrape.dep_name,
    scrape.ecosystem,
    {
      name: scrape.dep_name,
      latestVersion: scrape.new_version,
      deprecated: scrape.structured?.deprecated,
      weeklyDownloads: scrape.structured?.weekly_downloads,
      hasScripts: !!scrape.structured?.scripts,
      scripts: scrape.structured?.scripts,
    },
    scrape.old_version,
  );

  const brief = await runAnalysisChain(bundle);

  const chainTraceWithSecurity = {
    ...brief.chain_trace,
    heuristic_risk_assessment: heuristicRisk,
  };

  const { error: insertError } = await supabase
    .from('impact_briefs')
    .insert({
      dep_id: scrape.dep_id,
      dep_name: brief.dep_name,
      old_version: brief.old_version,
      new_version: brief.new_version,
      severity: brief.severity,
      summary: brief.summary,
      breaking_changes: brief.breaking_changes,
      pre_cve_signals: brief.pre_cve_signals,
      estimated_fix_minutes: brief.estimated_fix_minutes,
      safe_to_upgrade: brief.safe_to_upgrade,
      chain_trace: chainTraceWithSecurity,
    });

  if (insertError) {
    await monitor.recordJobFailed(job.id!, insertError.message);
    throw insertError;
  }

  await monitor.recordJobComplete(job.id!, Date.now() - startTime);
}

const worker = new Worker('analysis', processAnalysisJob, {
  connection,
  concurrency: 3,
  lockDuration: 120_000,
  settings: {
    backoffStrategy: (attemptsMade: number) => Math.min(attemptsMade * 5000, 60_000),
  },
});

registerWorkerShutdown(worker);
registerRedisShutdown(connection);

worker.on('completed', async (job) => {
  const stats = await monitor.getAggregateStats();
  console.log(stats);
});

worker.on('failed', async (job, err) => {
  if (job) await monitor.recordJobFailed(job.id!, err.message);
  console.error(`Analysis job ${job?.id} failed:`, err);
});

worker.on('drained', () => {
  console.log('Analysis queue drained — no pending jobs');
});

setInterval(async () => {
  const stats = await monitor.getAggregateStats().catch(() => 'Monitor unavailable');
  console.log(stats);
}, 60_000);

console.log('Analysis chain worker started (monitoring enabled)');
