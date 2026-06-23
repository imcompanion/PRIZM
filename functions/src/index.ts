import { onSchedule } from "firebase-functions/v2/scheduler";
import { runSync } from "./syncSheets";
import { runRateCardSync } from "./syncRateCards";
import { onCall } from "firebase-functions/v2/https";

/**
 * Scheduled Cloud Function that runs the Google Sheets Sync every 24 hours.
 * 
 * - memory: "1GiB" prevents out-of-memory crashes when parsing large JSON arrays.
 * - timeoutSeconds: 540 (9 minutes) gives plenty of headroom for batch upserting.
 */
export const autonomousSheetSync = onSchedule(
  {
    schedule: "every 24 hours",
    timeoutSeconds: 540, 
    memory: "1GiB",
    region: "us-east4" // Must match your Data Connect region for lowest latency
  },
  async (event) => {
    console.log("Triggered autonomousSheetSync cron job.");
    try {
      await runSync();
      console.log("Cron job completed successfully.");
    } catch (error) {
      console.error("Cron job failed:", error);
    }
  }
);

export const syncRateCards = onCall(
  {
    timeoutSeconds: 540,
    memory: "1GiB",
    region: "us-east4" // Must match your Data Connect region for lowest latency
  },
  async (request) => {
    // Basic auth check
    if (!request.auth) {
      throw new Error("You must be logged in to sync rate cards.");
    }
    
    try {
      const { spreadsheetId, sheetName } = request.data;
      if (!spreadsheetId || !sheetName) {
         throw new Error("spreadsheetId and sheetName are required.");
      }
      return await runRateCardSync(spreadsheetId, sheetName);
    } catch (error: any) {
      console.error("syncRateCards failed:", error);
      throw new Error(error.message);
    }
  }
);
