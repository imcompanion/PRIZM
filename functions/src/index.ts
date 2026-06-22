import { onSchedule } from "firebase-functions/v2/scheduler";
import { runSync } from "./syncSheets";

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
