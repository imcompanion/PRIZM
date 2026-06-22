// Fetch historical GBP→USD exchange rates from frankfurter.app
// and compute averages for project date ranges.

const rateCache = new Map<string, Record<string, number>>();

/**
 * Fetch daily GBP→USD rates for a date range from frankfurter.app.
 * Results are cached in memory by the range key.
 */
async function fetchDailyRates(startDate: string, endDate: string): Promise<Record<string, number>> {
  const key = `${startDate}..${endDate}`;
  if (rateCache.has(key)) return rateCache.get(key)!;

  try {
    const resp = await fetch(`https://api.frankfurter.dev/v1/${startDate}..${endDate}?base=GBP&symbols=USD`);
    if (!resp.ok) throw new Error(`FX API ${resp.status}`);
    const data = await resp.json();
    // data.rates = { "2025-01-02": { "USD": 1.25 }, ... }
    const rates: Record<string, number> = {};
    for (const [date, currencies] of Object.entries(data.rates || {})) {
      const usd = (currencies as Record<string, number>).USD;
      if (usd) rates[date] = usd;
    }
    rateCache.set(key, rates);
    return rates;
  } catch (e) {
    console.warn("Failed to fetch FX rates:", e);
    return {};
  }
}

/**
 * Get the average GBP→USD rate for a specific project date range.
 * Uses a pre-fetched daily rates map (from a broader range) for efficiency.
 */
function averageRateForRange(
  dailyRates: Record<string, number>,
  startDate: string,
  endDate: string
): number | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let sum = 0;
  let count = 0;

  for (const [dateStr, rate] of Object.entries(dailyRates)) {
    const d = new Date(dateStr);
    if (d >= start && d <= end) {
      sum += rate;
      count++;
    }
  }

  return count > 0 ? sum / count : null;
}

const DEFAULT_GBP_USD = 1.35;

/**
 * For a single project, fetch its average GBP→USD rate.
 * Returns the rate or fallback.
 */
export async function getProjectFxRate(startDate: string, endDate: string): Promise<number> {
  const rates = await fetchDailyRates(startDate, endDate);
  return averageRateForRange(rates, startDate, endDate) ?? DEFAULT_GBP_USD;
}

/**
 * For multiple projects, fetch rates in one batch (min start to max end)
 * and return a map of projectId → GBP/USD rate.
 */
export async function getBatchProjectFxRates(
  projects: Array<{ id: string; startDate: string; endDate: string }>
): Promise<Record<string, number>> {
  if (projects.length === 0) return {};

  // Find overall date range
  let minStart = projects[0].startDate;
  let maxEnd = projects[0].endDate;
  for (const p of projects) {
    if (p.startDate < minStart) minStart = p.startDate;
    if (p.endDate > maxEnd) maxEnd = p.endDate;
  }

  // Fetch all daily rates in one call
  const dailyRates = await fetchDailyRates(minStart, maxEnd);

  // Compute per-project averages
  const result: Record<string, number> = {};
  for (const p of projects) {
    result[p.id] = averageRateForRange(dailyRates, p.startDate, p.endDate) ?? DEFAULT_GBP_USD;
  }
  return result;
}
