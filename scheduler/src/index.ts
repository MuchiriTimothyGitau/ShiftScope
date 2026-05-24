import { createClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import { checkRegistryVersion } from './registry';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
const scrapeQueue = new Queue('scrape', {
  connection: {
    url: process.env.REDIS_URL
  }
});

export async function runScanCycle() {
  const { data: deps, error } = await supabase
    .from('dependency_manifest')
    .select('id, name, ecosystem, pinned_version, last_scanned_at');

  if (error) {
    throw error;
  }

  for (const dep of deps ?? []) {
    const latestVersion = await checkRegistryVersion(dep.name, dep.ecosystem);
    if (latestVersion !== dep.pinned_version) {
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

// If this file is run directly, execute the scan cycle
if (require.main === module) {
  runScanCycle()
    .then(() => {
      console.log('Scan cycle completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Scan cycle failed:', error);
      process.exit(1);
    });
}