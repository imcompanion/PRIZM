"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSync = runSync;
const googleapis_1 = require("googleapis");
const app_1 = require("firebase-admin/app");
const dataconnect_generated_1 = require("./dataconnect-generated");
// Initialize the Firebase Admin SDK (used for default credentials if needed)
(0, app_1.initializeApp)();
// Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "YOUR_SPREADSHEET_ID_HERE";
const RANGE = "Time Entries!A:J"; // Adjust based on your sheet layout
const LOOKBACK_DAYS = 90;
/**
 * Helper to convert Excel serial dates to standard Date objects if needed,
 * or parse string dates.
 */
function parseDate(dateStr) {
    if (typeof dateStr === 'number') {
        return new Date((dateStr - (25567 + 2)) * 86400 * 1000);
    }
    return new Date(dateStr);
}
async function runSync() {
    console.log("Starting Google Sheets Autonomous Sync...");
    // Authenticate with Google APIs using the Service Account default credentials
    // This automatically uses the Firebase Cloud Function's attached service account.
    const auth = new googleapis_1.google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
    console.log(`Fetching data from Spreadsheet: ${SPREADSHEET_ID}`);
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: RANGE,
    });
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        console.log("No data found in spreadsheet.");
        return;
    }
    // Assuming the first row is the header row
    const headers = rows[0];
    console.log(`Found ${rows.length - 1} total rows in the sheet.`);
    // Calculate the 90-day cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOOKBACK_DAYS);
    const cutoffTime = cutoffDate.getTime();
    console.log(`Filtering for entries on or after ${cutoffDate.toISOString().split('T')[0]}...`);
    const recentEntries = [];
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Map columns based on your sheet structure.
        // Replace indexes with actual column positions from your sheet
        const dateStr = row[0]; // Example: Date is column A
        const hoursStr = row[1]; // Example: Hours is column B
        const projectId = row[2]; // Example: Project ID is column C
        const personId = row[3]; // Example: Person ID is column D
        const notes = row[4]; // Example: Notes is column E
        if (!dateStr || !hoursStr)
            continue;
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
    console.log(`Found ${recentEntries.length} entries within the 90-day lookback window.`);
    // Batch insert into Firebase Data Connect
    const BATCH_SIZE = 500;
    let successCount = 0;
    for (let i = 0; i < recentEntries.length; i += BATCH_SIZE) {
        const batch = recentEntries.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (record) => {
            try {
                // We use the generated SDK to write to Data Connect
                await (0, dataconnect_generated_1.insertTimeEntries)(record);
                successCount++;
            }
            catch (error) {
                console.error(`Failed to insert record for ${record.date}`, error);
            }
        }));
        console.log(`Inserted batch ${i / BATCH_SIZE + 1}...`);
    }
    console.log(`Sync complete! Successfully upserted ${successCount} records.`);
}
//# sourceMappingURL=syncSheets.js.map