import { createClient } from '@supabase/supabase-js';
import { checkRegistryVersion } from './registry';
import { scrapeQueue } from './queue';
import { parseLockfile } from './lockfile_parser';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function runScanCycle() {
  const { data: deps, error } = await supabase
    .from('dependency_manifest')
    .select('id, name, ecosystem, pinned_version, last_scanned_at');

  if (error) throw error;

  for (const dep of deps ?? []) {
    const latestVersion = await checkRegistryVersion(dep.name, dep.ecosystem);
    if (latestVersion && latestVersion !== dep.pinned_version) {
      await scrapeQueue.add('scrape-dep', {
        dep_id: dep.id,
        dep_name: dep.name,
        ecosystem: dep.ecosystem,
        old_version: dep.pinned_version,
        new_version: latestVersion,
      });
    }
  }
}

export async function processLockfile(
  projectId: string,
  content: string,
  filename: string
): Promise<void> {
  const records = parseLockfile(content, filename);
  const batch = records.map(r => ({
    project_id: projectId,
    name: r.name,
    ecosystem: r.ecosystem,
    pinned_version: r.pinned_version,
    version_spec: r.version_spec || null,
    is_direct: r.is_direct,
    is_dev: r.is_dev,
  }));

  if (batch.length === 0) return;

  const { error } = await supabase.from('dependency_manifest').upsert(batch, {
    onConflict: 'project_id,name',
    ignoreDuplicates: false,
  });

  if (error) throw error;
}

if (require.main === module) {
  const interval = parseInt(process.env.SCAN_INTERVAL_MINUTES || '15', 10) * 60_000;

  const run = async () => {
    try {
      await runScanCycle();
    } catch (err) {
      console.error('Scan cycle failed:', err);
    }
  };

  run();
  setInterval(run, interval);
}
