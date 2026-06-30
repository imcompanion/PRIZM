import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hyfgyfuvligacjwxjnce.supabase.co";
const SUPABASE_KEY = "sb_secret_GNp6xr3aVo_IggfTL-H3Fg_sVSCFvv3";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAllData(table, columns) {
  let all = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + step - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < step) break;
    from += step;
  }
  return all;
}

async function run() {
  console.log("Fetching all projects...");
  const allProjects = await fetchAllData("projects", "id, title");
  
  const projectMapByName = new Map();

  for (const p of allProjects) {
    if (p.title) {
      projectMapByName.set(p.title.toLowerCase().trim(), p.id);
    }
  }

  console.log("Fetching time entries with missing project_id...");
  const unmappedEntries = await fetchAllData("time_entries", "*");
  const entriesToFix = unmappedEntries.filter(e => e.project_id === null && e.project_name);
  
  console.log(`Found ${entriesToFix.length} time entries that can potentially be mapped.`);

  let fixCount = 0;
  const BATCH_SIZE = 1000;
  let batch = [];

  for (const e of entriesToFix) {
    let newProjectId = null;

    if (e.project_name) {
      const pname = e.project_name.toLowerCase().trim();
      newProjectId = projectMapByName.get(pname);
    }

    if (newProjectId) {
      e.project_id = newProjectId;
      batch.push(e);
      fixCount++;
    }
  }

  console.log(`Starting ${batch.length} updates via bulk upsert...`);
  let updatedCount = 0;
  
  const chunkSize = 1000;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    const { error } = await supabase.from("time_entries").upsert(chunk);
    if (error) {
      console.error("Upsert error:", error);
    }
    updatedCount += chunk.length;
    process.stdout.write(`\rUpdated ${updatedCount} entries...`);
  }

  console.log(`\nSuccessfully backfilled project_id for ${updatedCount} time entries.`);
}

run().catch(console.error);
