import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[key] = val;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const typesPath = path.join(__dirname, 'src/integrations/supabase/types.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

const tables = [];
const lines = typesContent.split('\n');
let insideTables = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Tables: {')) {
    insideTables = true;
    continue;
  }
  if (insideTables && line.includes('Views: {')) break;
  if (insideTables) {
    const match = line.match(/^ {6}([a-zA-Z0-9_]+): \{/);
    if (match) tables.push(match[1]);
  }
}

const backupDir = path.join(__dirname, 'supabase_backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

async function extractAll() {
  for (const table of tables) {
    let allData = [];
    let offset = 0;
    const limit = 1000;
    
    console.log(`Extracting data for table: ${table}...`);
    while (true) {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Range': `${offset}-${offset + limit - 1}`
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch ${table}: ${response.status} ${response.statusText}`);
          break;
        }
        
        const data = await response.json();
        allData = allData.concat(data);
        
        if (data.length < limit) {
          break; // No more data
        }
        offset += limit;
      } catch (e) {
        console.error(`Error fetching ${table}:`, e);
        break;
      }
    }
    fs.writeFileSync(path.join(backupDir, `${table}.json`), JSON.stringify(allData, null, 2));
    console.log(`✓ Successfully saved ${allData.length} records for ${table}`);
  }
  console.log('Extraction complete!');
}

extractAll();
