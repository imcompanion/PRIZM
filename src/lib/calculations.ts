// Working days calculation
// 52 weeks * 5 days = 260 days
// Minus 8 UK bank holidays = 252
// Minus 30 days annual leave = 222
const WORKING_DAYS_PER_YEAR = 222;
const HOURS_PER_DAY = 7.5;

export const WORKING_HOURS_PER_YEAR = WORKING_DAYS_PER_YEAR * HOURS_PER_DAY; // 1665

const SALARY_MARKUP = 0.15; // 15% for taxes and benefits

export function calculateInternalCostPerHour(annualSalary: number, billableCapacityHours: number = HOURS_PER_DAY): number {
  const billableCapacityPct = billableCapacityHours / HOURS_PER_DAY;
  const billableHoursPerYear = WORKING_HOURS_PER_YEAR * billableCapacityPct;
  return (annualSalary * (1 + SALARY_MARKUP)) / billableHoursPerYear;
}

export function formatCurrency(amount: number, currencyOrOffice: string = "UK"): string {
  const currencyMap: Record<string, { locale: string; currency: string }> = {
    GBP: { locale: "en-GB", currency: "GBP" },
    USD: { locale: "en-US", currency: "USD" },
    EUR: { locale: "en-IE", currency: "EUR" },
    UK: { locale: "en-GB", currency: "GBP" },
    US: { locale: "en-US", currency: "USD" },
  };
  const cfg = currencyMap[currencyOrOffice.toUpperCase()] ?? currencyMap.GBP;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateBudgetedFee(scopedHours: number, hourlyRate: number): number {
  return scopedHours * hourlyRate;
}

export function calculateProjectProfit(
  scopedHours: number,
  rateCardHourlyRate: number,
  actualHours: number,
  internalCostPerHour: number
): number {
  const revenue = scopedHours * rateCardHourlyRate;
  const cost = actualHours * internalCostPerHour;
  return revenue - cost;
}

export function formatCurrencyFixed(amount: number, currencyOrOffice: string = "UK"): string {
  const currencyMap: Record<string, { locale: string; currency: string }> = {
    GBP: { locale: "en-GB", currency: "GBP" },
    USD: { locale: "en-US", currency: "USD" },
    EUR: { locale: "en-IE", currency: "EUR" },
    UK: { locale: "en-GB", currency: "GBP" },
    US: { locale: "en-US", currency: "USD" },
  };
  const cfg = currencyMap[currencyOrOffice.toUpperCase()] ?? currencyMap.GBP;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: cfg.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}
