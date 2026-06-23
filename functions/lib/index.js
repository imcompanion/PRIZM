"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRateCards = exports.autonomousSheetSync = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const syncSheets_1 = require("./syncSheets");
const syncRateCards_1 = require("./syncRateCards");
const https_1 = require("firebase-functions/v2/https");
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
exports.syncRateCards = (0, https_1.onCall)({
    timeoutSeconds: 540,
    memory: "1GiB",
    region: "us-east4" // Must match your Data Connect region for lowest latency
}, async (request) => {
    // Basic auth check
    if (!request.auth) {
        throw new Error("You must be logged in to sync rate cards.");
    }
    try {
        const { spreadsheetId, sheetName } = request.data;
        if (!spreadsheetId || !sheetName) {
            throw new Error("spreadsheetId and sheetName are required.");
        }
        return await (0, syncRateCards_1.runRateCardSync)(spreadsheetId, sheetName);
    }
    catch (error) {
        console.error("syncRateCards failed:", error);
        throw new Error(error.message);
    }
});
//# sourceMappingURL=index.js.map