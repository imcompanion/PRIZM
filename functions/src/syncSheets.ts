import { google } from 'googleapis';
import { initializeApp } from 'firebase-admin/app';
import { insertTimeEntries } from '@dataconnect/generated-server';

// Initialize the Firebase Admin SDK (used for default credentials if needed)
initializeApp();

import fs from 'fs';
import path from 'path';

// Configuration
// We load the heterogeneous mapping from the JSON file
let sheetMappings: any[] = [];
try {
  const mappingsPath = path.join(__dirname, '../sheet-mappings.json');
  sheetMappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf-8'));
} catch (e) {
  console.warn('Could not read sheet-mappings.json, continuing with empty array.');
}
const LOOKBACK_DAYS = 90;

/**
 * Helper to convert Excel serial dates to standard Date objects if needed,
 * or parse string dates.
 */
function parseDate(dateStr: string | number): Date {
  if (typeof dateStr === 'number') {
    return new Date((dateStr - (25567 + 2)) * 86400 * 1000);
  }
  return new Date(dateStr);
}

export async function runSync() {
  console.log("Starting Google Sheets Autonomous Sync...");
  
  // Authenticate with Google APIs using the Service Account default credentials
  // This automatically uses the Firebase Cloud Function's attached service account.
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const recentEntries: any[] = [];
  
  for (const mapping of sheetMappings) {
    const { spreadsheetId, range, columns } = mapping;
    console.log(`\nFetching data from Spreadsheet: ${spreadsheetId} (Range: ${range})`);
    
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log(`No data found in spreadsheet: ${spreadsheetId}`);
        continue;
      }

      console.log(`Found ${rows.length - 1} total rows in the sheet.`);

      // Calculate the 90-day cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);
      const cutoffTime = cutoffDate.getTime();

      console.log(`Filtering for entries on or after ${cutoffDate.toISOString().split('T')[0]}...`);

      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Dynamically pull from the exact column index defined in JSON
        const dateStr = row[columns.date]; 
        const hoursStr = row[columns.hours]; 
        const projectId = row[columns.projectId]; 
        const personId = row[columns.personId]; 
        const notes = columns.notes !== undefined ? row[columns.notes] : ""; 

        if (!dateStr || !hoursStr) continue;

        const entryDate = parseDate(dateStr);
        
        if (entryDate.getTime() >= cutoffTime) {
          recentEntries.push({
            id: `auto-${personId}-${entryDate.getTime()}`, // deterministic ID or use UUID
            date: entryDate.toISOString().split('T')[0], // YYYY-MM-DD format
            hours: parseFloat(hoursStr),
            notes: notes || "",
            projectId: projectId,
            personId: personId,
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error(`Error processing spreadsheet ${spreadsheetId}:`, err);
    }
  }

  console.log(`\nFound ${recentEntries.length} total entries within the 90-day lookback window across all ${sheetMappings.length} sheets.`);

  // Batch insert into Firebase Data Connect
  const BATCH_SIZE = 500;
  let successCount = 0;
  
  for (let i = 0; i < recentEntries.length; i += BATCH_SIZE) {
    const batch = recentEntries.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (record) => {
      try {
        // We use the generated SDK to write to Data Connect
        await insertTimeEntries(record);
        successCount++;
      } catch (error) {
        console.error(`Failed to insert record for ${record.date}`, error);
      }
    }));
    
    console.log(`Inserted batch ${i / BATCH_SIZE + 1}...`);
  }

  console.log(`Sync complete! Successfully upserted ${successCount} records.`);
}
