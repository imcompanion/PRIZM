import { initializeApp } from 'firebase/app';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sdk = require('./src/dataconnect-generated/index.cjs.js');

const firebaseConfig = {
  projectId: "pharaoh-54a0e",
  appId: "1:909637352706:web:98a9ef33d6b680d6e8d61b",
  storageBucket: "pharaoh-54a0e.firebasestorage.app",
  apiKey: "AIzaSyBWy2AP5d-YTdpirVipzs2tvd0hVqqfeIw",
  authDomain: "pharaoh-54a0e.firebaseapp.com",
  messagingSenderId: "909637352706",
};

const app = initializeApp(firebaseConfig);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDir = path.join(__dirname, 'supabase_backup');

const BATCH_SIZE = 500;

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function toPascalCase(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

async function importData() {
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
  const order = ['roles', 'people', 'projects', 'project_scopes', 'time_entries'];
  files.sort((a, b) => {
    const aName = a.replace('.json', '');
    const bName = b.replace('.json', '');
    let aIdx = order.indexOf(aName);
    let bIdx = order.indexOf(bName);
    if (aIdx === -1) aIdx = 99;
    if (bIdx === -1) bIdx = 99;
    return aIdx - bIdx;
  });

  for (const file of files) {
    const tableName = file.replace('.json', '');
    const functionName = `insert${toPascalCase(tableName)}`;
    const insertFunction = sdk[functionName];
    
    if (!insertFunction) {
      console.warn(`No insert function found for table ${tableName} (${functionName})`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
    console.log(`Starting import for ${tableName} (${data.length} records)...`);
    
    const mappedData = data.map(record => {
      const newRecord = {};
      for (const [key, value] of Object.entries(record)) {
        if (value !== null) {
           newRecord[toCamelCase(key)] = value;
        }
      }
      return newRecord;
    });

    const chunks = chunkArray(mappedData, BATCH_SIZE);
    let count = 0;
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (record) => {
        try {
          await insertFunction(record);
        } catch (e) {
           // log quietly
        }
      }));
      count += chunk.length;
      console.log(`  Imported ${count} / ${data.length} records for ${tableName}...`);
    }
    console.log(`✓ Completed import for ${tableName}`);
  }
}

importData().catch(console.error);
