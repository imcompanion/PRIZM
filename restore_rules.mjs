import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hyfgyfuvligacjwxjnce.supabase.co";
const SUPABASE_KEY = "sb_secret_GNp6xr3aVo_IggfTL-H3Fg_sVSCFvv3";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function restore() {
  const rules = JSON.parse(fs.readFileSync('./supabase_backup/billability_rules.json', 'utf8'));
  const conditions = JSON.parse(fs.readFileSync('./supabase_backup/billability_rule_conditions.json', 'utf8'));

  console.log(`Restoring ${rules.length} rules...`);
  const { error: rulesErr } = await supabase.from('billability_rules').insert(rules);
  if (rulesErr) {
    console.error("Rules insert error:", rulesErr);
    return;
  }

  console.log(`Restoring ${conditions.length} conditions...`);
  const { error: condErr } = await supabase.from('billability_rule_conditions').insert(conditions);
  if (condErr) {
    console.error("Conditions insert error:", condErr);
    return;
  }

  console.log("Successfully restored all billability rules and conditions!");
}

restore().catch(console.error);
