import { google } from 'googleapis';
import { initializeApp, getApps } from 'firebase-admin/app';
import { v5 as uuidv5 } from 'uuid';
import { insertRoles, insertRateCards } from '@dataconnect/generated-server';

// Namespace for deterministic UUIDs
const NAMESPACE = '1b671a64-40d5-491e-99b0-da01ff1f3341';

if (getApps().length === 0) {
  initializeApp();
}

export async function runRateCardSync(spreadsheetId: string, sheetName: string) {
  console.log(`Starting Google Sheets Sync for Rate Cards...`);
  console.log(`Spreadsheet: ${spreadsheetId}, Sheet: ${sheetName}`);
  
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  let response;
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetName,
    });
  } catch (e: any) {
    throw new Error(`Failed to fetch Google Sheet. Make sure you shared the sheet with the Service Account email. Error: ${e.message}`);
  }

  const rows = response.data.values;
  if (!rows || rows.length < 5) {
    throw new Error("Sheet does not have enough rows to parse Rate Cards.");
  }

  // Find where "Role" is to align rows
  let roleRowIdx = 1;
  if (rows[1][1] === 'Role') {
    roleRowIdx = 1;
  } else if (rows[0][1] === 'Role') {
    roleRowIdx = 0;
  }
  
  const headerRow = rows[roleRowIdx];
  const currencyRow = rows[roleRowIdx + 1];

  // The first rate card starts at col 2
  const rateCardNames = headerRow.slice(2);
  const rateCardCurrencies = currencyRow.slice(2);

  const roleUpserts = [];
  const rateCardUpserts = [];

  const BATCH_SIZE = 500;
  let rolesUpsertedCount = 0;
  let rateCardsUpsertedCount = 0;

  console.log(`Found ${rateCardNames.filter(Boolean).length} rate cards.`);

  for (let i = roleRowIdx + 3; i < rows.length; i++) {
    const row = rows[i];
    const roleName = row[1]?.trim();
    if (!roleName || roleName === 'N/A' || roleName === 'Role' || roleName === '') continue;

    // Deterministic UUID for role
    const roleId = uuidv5(`role-${roleName.toLowerCase()}`, NAMESPACE);
    
    // Parse Capacity (from column AC, but let's default to 80% if not found, though the app assumes 40 billable hours)
    // The previous app logic defaulted billableCapacityHours to 40
    
    roleUpserts.push({
      id: roleId,
      name: roleName,
      billableCapacityHours: 40,
      createdAt: new Date().toISOString()
    });

    // Parse Rate Cards for this role
    for (let j = 0; j < rateCardNames.length; j++) {
      const rateCardName = rateCardNames[j]?.trim();
      const currency = rateCardCurrencies[j]?.trim() || "GBP";
      
      if (!rateCardName) continue;
      
      const rawVal = (row[j + 2] || "").toString().trim().replace(/[£$€,]/g, "");
      if (!rawVal || rawVal.toLowerCase() === "blank" || rawVal.toLowerCase() === "n/a" || rawVal === "") continue;
      
      const rate = parseFloat(rawVal);
      if (isNaN(rate) || rate <= 0) continue;

      const rateCardId = uuidv5(`rc-${rateCardName}-${roleId}`, NAMESPACE);

      rateCardUpserts.push({
        id: rateCardId,
        name: rateCardName,
        roleId: roleId,
        hourlyRate: rate,
        currency: currency.toUpperCase(),
        createdAt: new Date().toISOString()
      });
    }
  }

  console.log(`Prepared ${roleUpserts.length} Roles and ${rateCardUpserts.length} Rate Cards for upsert.`);

  // Insert Roles
  for (let i = 0; i < roleUpserts.length; i += BATCH_SIZE) {
    const batch = roleUpserts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (record) => {
      try {
        await insertRoles(record);
        rolesUpsertedCount++;
      } catch (e: any) {
        console.error(`Failed to insert role ${record.name}:`, e.message);
      }
    }));
  }

  // Insert Rate Cards
  for (let i = 0; i < rateCardUpserts.length; i += BATCH_SIZE) {
    const batch = rateCardUpserts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (record) => {
      try {
        await insertRateCards(record);
        rateCardsUpsertedCount++;
      } catch (e: any) {
        console.error(`Failed to insert rate card ${record.name}:`, e.message);
      }
    }));
  }

  console.log(`Sync Complete: Upserted ${rolesUpsertedCount} roles and ${rateCardsUpsertedCount} rate card entries.`);
  return { success: true, rolesUpserted: rolesUpsertedCount, rateCardsUpserted: rateCardsUpsertedCount };
}
