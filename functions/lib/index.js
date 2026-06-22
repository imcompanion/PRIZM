"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autonomousSheetSync = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const syncSheets_1 = require("./syncSheets");
/**
 * Scheduled Cloud Function that runs the Google Sheets Sync every 24 hours.
 *
 * - memory: "1GiB" prevents out-of-memory crashes when parsing large JSON arrays.
 * - timeoutSeconds: 540 (9 minutes) gives plenty of headroom for batch upserting.
 */
exports.autonomousSheetSync = (0, scheduler_1.onSchedule)({
    schedule: "every 24 hours",
    timeoutSeconds: 540,
    memory: "1GiB",
    region: "us-east4" // Must match your Data Connect region for lowest latency
}, async (event) => {
    console.log("Triggered autonomousSheetSync cron job.");
    try {
        await (0, syncSheets_1.runSync)();
        console.log("Cron job completed successfully.");
    }
    catch (error) {
        console.error("Cron job failed:", error);
    }
});
//# sourceMappingURL=index.js.map