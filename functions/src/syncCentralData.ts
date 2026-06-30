import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { google } from "googleapis";
import { v5 as uuidv5 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { initializeApp, getApps } from "firebase-admin/app";

// Ensure Apps are initialized
if (!getApps().length) {
  initializeApp();
}

// Fixed namespace for deterministic UUID generation
const NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

// Centralized Sheet ID
const SHEET_ID = "1kHXAbVe-EAD-l63C7o4c1bJcvL0ECEyylXrspV8fJCQ";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    }
    _supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

// Helper to convert Excel serial dates or "dd/mm/yyyy" to YYYY-MM-DD
function parseDate(value: any): string | null {
  if (!value) return null;
  const strVal = String(value).trim();
  
  if (strVal.includes("/")) {
    const parts = strVal.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      if (yyyy.length === 4) {
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
    }
  }

  const serial = parseFloat(strVal);
  if (!isNaN(serial) && serial > 10000) {
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split("T")[0];
  }

  return null;
}

function parseNumber(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value).replace(/,/g, "").replace(/£|\$|€|%/g, ""));
  return isNaN(parsed) ? null : parsed;
}

export async function runSync() {
  logger.info("Starting centralized sheet sync");
  const supabase = getSupabase();

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: authClient as any });

  // 1. ROLES & RATE CARDS
  logger.info("Syncing Roles and Rate Cards...");
  const rolesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Roles & Capacities!A2:B",
  });
  const rateCardsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "UK Rate Cards!A2:Z",
  });

  const rolesRows = rolesResponse.data.values || [];
  const rateCardsRows = rateCardsResponse.data.values || [];
  
  const roleIdMap = new Map<string, string>(); // name -> id

  // Process Roles
  const rolesBatchMap = new Map<string, any>();
  let upsertedRoles = 0;
  for (const row of rolesRows) {
    const name = row[0];
    if (!name || name === "") continue;

    const roleId = uuidv5(`role_${name.toLowerCase()}`, NAMESPACE);
    roleIdMap.set(name.toLowerCase(), roleId);

    const capStr = String(row[1] || "").replace("%", "");
    const cap = parseFloat(capStr);
    const capacityHours = isNaN(cap) ? 37.5 : (cap / 100) * 37.5;

    rolesBatchMap.set(roleId, {
      id: roleId,
      name,
      billable_capacity_hours: capacityHours,
      created_at: new Date().toISOString(),
    });
    upsertedRoles++;
  }
  
  const rolesBatch = Array.from(rolesBatchMap.values());
  if (rolesBatch.length > 0) {
    const { error } = await supabase.from("roles" as any).upsert(rolesBatch);
    if (error) throw new Error(`Roles Upsert Error: ${error.message}`);
  }

  // Process Rate Cards
  const clientNames = rateCardsRows[0] || [];
  const currencies = rateCardsRows[1] || [];
  let upsertedRateCards = 0;
  const rateCardsBatchMap = new Map<string, any>();

  for (let i = 3; i < rateCardsRows.length; i++) {
    const row = rateCardsRows[i];
    const roleName = row[1];
    if (!roleName) continue;

    const roleId = roleIdMap.get(roleName.toLowerCase());

    for (let colIdx = 2; colIdx < clientNames.length; colIdx++) {
      const clientName = clientNames[colIdx];
      const currency = currencies[colIdx] || "GBP";
      if (!clientName) continue;

      const rateVal = parseNumber(row[colIdx]);
      if (rateVal === null) continue;

      const rateCardId = uuidv5(`ratecard_${clientName}_${roleName}`, NAMESPACE);
      
      rateCardsBatchMap.set(rateCardId, {
        id: rateCardId,
        name: clientName,
        currency,
        hourly_rate: rateVal,
        role_id: roleId || null,
        created_at: new Date().toISOString(),
      });
      upsertedRateCards++;
    }
  }

  const rateCardsBatch = Array.from(rateCardsBatchMap.values());
  if (rateCardsBatch.length > 0) {
    for (let i = 0; i < rateCardsBatch.length; i += 500) {
      const { error } = await supabase.from("rate_cards" as any).upsert(rateCardsBatch.slice(i, i + 500));
      if (error) throw new Error(`RateCards Upsert Error: ${error.message}`);
    }
  }

  // 2. PEOPLE
  logger.info("Syncing People...");
  const peopleResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "People Counter Global!A3:O", 
  });
  const peopleRows = peopleResponse.data.values || [];
  let upsertedPeople = 0;

  const sheetPersonIds = new Set<string>();
  const nameToCurrentId = new Map<string, string>();
  const peopleBatchMap = new Map<string, any>();

  for (const row of peopleRows) {
    const name = row[0];
    if (!name) continue;
    const code = row[1];
    const roleName = row[2];
    const type = row[3];
    const team = row[4];
    const status = row[5];
    const ukPct = parseNumber(row[6]);
    const usPct = parseNumber(row[7]);
    const imcPct = parseNumber(row[8]);
    const startDate = parseDate(row[9]);
    const endDate = parseDate(row[10]);
    const overallStart = parseDate(row[11]);
    const overallEnd = parseDate(row[12]);
    const monthlySalary = parseNumber(row[13]);
    const office = row[14];

    const personKey = code ? `person_${code.toLowerCase().trim()}` : `person_${name.toLowerCase().trim()}`;
    const personId = uuidv5(personKey, NAMESPACE);
    const roleId = roleName ? roleIdMap.get(roleName.toLowerCase()) : null;

    peopleBatchMap.set(personId, {
      id: personId,
      name,
      code,
      type,
      team,
      status,
      office: office || "Unknown",
      uk_percentage: ukPct,
      us_percentage: usPct,
      imc_percentage: imcPct,
      employment_start_date: startDate,
      employment_end_date: endDate,
      overall_start_date: overallStart,
      overall_end_date: overallEnd,
      monthly_salary: monthlySalary,
      annual_salary: monthlySalary !== null ? monthlySalary * 12 : null,
      role_id: roleId || null,
      created_at: new Date().toISOString(),
    });
    upsertedPeople++;
    sheetPersonIds.add(personId);

    // Map normalized name to the current active/latest contract ID in the sheet
    const normName = name.toLowerCase().trim();
    const prevId = nameToCurrentId.get(normName);
    if (!prevId) {
      nameToCurrentId.set(normName, personId);
    } else {
      if (!endDate) {
        nameToCurrentId.set(normName, personId);
      }
    }
  }

  const peopleBatch = Array.from(peopleBatchMap.values());
  if (peopleBatch.length > 0) {
    for (let i = 0; i < peopleBatch.length; i += 500) {
      const { error } = await supabase.from("people" as any).upsert(peopleBatch.slice(i, i + 500));
      if (error) throw new Error(`People Upsert Error: ${error.message}`);
    }
  }

  // Perform stale records cleanup & relinking
  logger.info("Performing people cleanup and time entry relinking...");
  try {
    const existingPeopleRes = await supabase.from("people" as any).select("*");
    const existingPeople = existingPeopleRes.data || [];

    const timeEntriesRes = await supabase.from("time_entries" as any).select("*");
    const allTimeEntries = timeEntriesRes.data || [];
    
    const deactivationsMap = new Map<string, any>();

    for (const p of existingPeople) {
      if (!sheetPersonIds.has(p.id)) {
        const normName = p.name.toLowerCase().trim();
        const targetCurrentId = nameToCurrentId.get(normName);

        if (targetCurrentId) {
          const staleEntries = allTimeEntries.filter((e: any) => e.person_id === p.id);
          if (staleEntries.length > 0) {
            logger.info(`Relinking ${staleEntries.length} time entries from stale ID ${p.id} to new ID ${targetCurrentId}`);
            for (const entry of staleEntries) {
              await supabase.from("time_entries" as any).update({ person_id: targetCurrentId }).eq("id", entry.id);
            }
          }
          await supabase.from("people" as any).delete().eq("id", p.id);
        } else {
          deactivationsMap.set(p.id, {
            id: p.id,
            name: p.name,
            code: p.code,
            type: p.type || null,
            team: p.team || null,
            status: p.status || null,
            office: p.office || "Unknown",
            uk_percentage: p.uk_percentage || null,
            us_percentage: p.us_percentage || null,
            imc_percentage: p.imc_percentage || null,
            employment_start_date: p.employment_start_date || null,
            employment_end_date: p.employment_end_date || null,
            overall_start_date: p.overall_start_date || null,
            overall_end_date: p.overall_end_date || null,
            monthly_salary: p.monthly_salary || null,
            annual_salary: p.annual_salary || null,
            role_id: p.role_id || null,
            created_at: p.created_at || new Date().toISOString(),
          });
        }
      }
    }
    
    const deactivations = Array.from(deactivationsMap.values());
    if (deactivations.length > 0) {
      for (let i = 0; i < deactivations.length; i += 500) {
        await supabase.from("people" as any).upsert(deactivations.slice(i, i + 500));
      }
    }
  } catch (err: any) {
    logger.error("Failed to run cleanup / relinking in sync script:", err);
  }

  // 3. PROJECTS
  logger.info("Syncing Projects...");
  
  // Load Scopes first to extract opportunity numbers
  const titleToOppNumber = new Map<string, string>();
  try {
    const scopesResponseForOpp = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Scopes!A2:C",
    });
    const scopesRowsForOpp = scopesResponseForOpp.data.values || [];
    for (const row of scopesRowsForOpp) {
      const oppNumber = row[0];
      const title = row[2];
      if (oppNumber && title) {
        titleToOppNumber.set(title.trim(), oppNumber.trim());
      }
    }
    logger.info(`Loaded ${titleToOppNumber.size} title-to-opportunity mappings from Scopes`);
  } catch (err: any) {
    logger.error("Failed to load Scopes for opportunity number mapping", err);
  }

  const projectsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Data summary - P&L phased (de-risked)!B5:Z",
  });
  const projectsRows = projectsResponse.data.values || [];
  let upsertedProjects = 0;
  const projectsBatchMap = new Map<string, any>();

  const projectMap = new Map<string, string>(); // oppName -> id

  for (const row of projectsRows) {
    const title = row[0];
    if (!title) continue;

    const projectId = uuidv5(`project_${title}`, NAMESPACE);
    projectMap.set(title, projectId);

    const createdDate = parseDate(row[7]);
    const closeDate = parseDate(row[8]);
    const startDate = parseDate(row[9]);
    const endDate = parseDate(row[10]);

    if (!startDate || !endDate) continue;

    const price = parseNumber(row[11]);
    const oppNumber = titleToOppNumber.get(title.trim()) || null;
    const oppRecordType = title.toLowerCase().includes("rfp") || title.toLowerCase().includes("rfi")
      ? "Agency - RFP / RFI"
      : "Agency - Execution";

    projectsBatchMap.set(projectId, {
      id: projectId,
      title,
      sf_account: row[1] || "",
      parent_account: row[2] || "",
      ultimate_parent: row[3] || "",
      office: row[4] || "",
      new_repeat: row[5] || "",
      stage: row[6] || "",
      created_date: createdDate,
      close_date: closeDate,
      start_date: startDate,
      end_date: endDate,
      probability: parseNumber(row[19]),
      start_week: row[20] || "",
      end_week: row[21] || "",
      duration_weeks: parseNumber(row[22]),
      duration_weeks_rounded: parseNumber(row[23]),
      rate_card_discount: 0,
      opportunity_number: oppNumber,
      opportunity_record_type: oppRecordType,
      revenue: price,
      budget_cost: parseNumber(row[12]),
      contracted_infl_cost: parseNumber(row[13]),
      actual_cost: parseNumber(row[14]),
      media_cost: parseNumber(row[15]),
      gp_full_value: parseNumber(row[16]),
      gp_check: row[17] || "",
      gp_full_value_per_day: parseNumber(row[18]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    upsertedProjects++;
  }

  const projectsBatch = Array.from(projectsBatchMap.values());
  if (projectsBatch.length > 0) {
    for (let i = 0; i < projectsBatch.length; i += 500) {
      const { error } = await supabase.from("projects" as any).upsert(projectsBatch.slice(i, i + 500));
      if (error) throw new Error(`Projects Upsert Error: ${error.message}`);
    }
  }

  // 4. SCOPES & ALLOCATIONS
  logger.info("Syncing Scopes...");
  const scopesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Scopes!A2:X",
  });
  const scopesRows = scopesResponse.data.values || [];
  let upsertedScopes = 0;
  const scopesBatchMap = new Map<string, any>();

  for (const row of scopesRows) {
    const oppName = row[2];
    const roleName = row[4];
    const scopedHours = parseNumber(row[5]);

    if (!oppName || !roleName || scopedHours === null) continue;

    const projectId = projectMap.get(oppName);
    const roleId = roleIdMap.get(roleName.toLowerCase());

    if (!projectId) continue;

    const scopeId = uuidv5(`scope_${projectId}_${roleId || roleName}`, NAMESPACE);

    // Extract phases (Phase 1 to Phase 12 are columns 7 to 18)
    const phasePercentages: any = {};
    for (let i = 0; i < 12; i++) {
      const val = row[7 + i];
      if (val) {
        phasePercentages[`phase${i + 1}`] = String(val);
      }
    }

    scopesBatchMap.set(scopeId, {
      id: scopeId,
      project_id: projectId,
      role_id: roleId || null,
      scoped_hours: scopedHours,
      phase_percentages: phasePercentages,
      created_at: new Date().toISOString(),
    });
    upsertedScopes++;
  }
  
  const scopesBatch = Array.from(scopesBatchMap.values());
  if (scopesBatch.length > 0) {
    for (let i = 0; i < scopesBatch.length; i += 500) {
      const { error } = await supabase.from("project_scopes" as any).upsert(scopesBatch.slice(i, i + 500));
      if (error) throw new Error(`Project Scopes Upsert Error: ${error.message}`);
    }
  }

  logger.info(`Sync complete! Roles: ${upsertedRoles}, RateCards: ${upsertedRateCards}, People: ${upsertedPeople}, Projects: ${upsertedProjects}, Scopes: ${upsertedScopes}`);
}

export const syncCentralDataCron = onSchedule({ schedule: "0 7 * * *", timeZone: "Europe/London" }, async (event) => {
  await runSync();
});

export const syncCentralDataHttp = onRequest({ region: "us-east4", serviceAccount: "pharaoh-54a0e@appspot.gserviceaccount.com", timeoutSeconds: 500, memory: "512MiB" }, async (req, res) => {
  try {
    await runSync();
    res.status(200).send({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    logger.error("Error running sync", err);
    res.status(500).send({ error: err.message });
  }
});

export const syncCentralDataCallable = onCall({ region: "us-east4", timeoutSeconds: 500, memory: "1GiB" }, async (request) => {
  try {
    await runSync();
    return { success: true, timestamp: new Date().toISOString() };
  } catch (err: any) {
    logger.error("Error running sync", err);
    throw new Error(err.message);
  }
});
