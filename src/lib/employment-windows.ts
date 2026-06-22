import { eachDayOfInterval, isWeekend } from "date-fns";

/**
 * Period-aware employment resolution.
 *
 * People can have multiple rows in the `people` table — one per role/team window,
 * including separate rows for parental-leave periods. To bucket time correctly,
 * we resolve each person's effective (team, role, office, capacity) per date.
 */

export interface EmploymentWindow {
  start: Date | null;
  end: Date | null;
  team: string;
  teamLower: string;
  role: string;
  roleId: string | null;
  office: string;
  capacityPerDay: number;
  annualSalary: number | null;
  personId: string;
}

export interface PersonRow {
  id: string;
  name: string;
  team?: string | null;
  office?: string | null;
  role_id?: string | null;
  annual_salary?: number | null;
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  overall_start_date?: string | null;
  overall_end_date?: string | null;
  roles?: { name?: string; billable_capacity_hours?: number | null } | null;
}

export const PARENTAL_LEAVE_TEAMS = new Set(["parental leave"]);

export function normName(name: string | null | undefined): string {
  return (name || "").trim().toLowerCase();
}

/** Build per-name array of employment windows, sorted ascending by start. */
export function buildEmploymentWindows(
  people: PersonRow[],
): Map<string, EmploymentWindow[]> {
  const map = new Map<string, EmploymentWindow[]>();

  for (const p of people) {
    const key = normName(p.name);
    if (!key) continue;

    const start = p.employment_start_date
      ? new Date(p.employment_start_date)
      : p.overall_start_date
        ? new Date(p.overall_start_date)
        : null;
    const end = p.employment_end_date
      ? new Date(p.employment_end_date)
      : p.overall_end_date
        ? new Date(p.overall_end_date)
        : null;

    const team = (p.team || "").trim();
    const win: EmploymentWindow = {
      start,
      end,
      team,
      teamLower: team.toLowerCase(),
      role: p.roles?.name || "",
      roleId: p.role_id || null,
      office: p.office || "",
      capacityPerDay: Number(p.roles?.billable_capacity_hours) || 7.5,
      annualSalary: p.annual_salary != null ? Number(p.annual_salary) : null,
      personId: p.id,
    };

    const arr = map.get(key) || [];
    arr.push(win);
    map.set(key, arr);
  }

  for (const arr of map.values()) {
    arr.sort((a, b) => {
      const sa = a.start ? a.start.getTime() : -Infinity;
      const sb = b.start ? b.start.getTime() : -Infinity;
      return sa - sb;
    });
  }

  return map;
}

/** Map every people row id → normalised name. */
export function buildPersonIdToName(people: PersonRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of people) {
    if (p.id && p.name) m.set(p.id, normName(p.name));
  }
  return m;
}

export interface ResolveOptions {
  /** Team names (lowercased) to exclude. Defaults to parental leave. */
  excludeTeams?: Set<string>;
  /** Optional whitelist (lowercased). If set, only windows with these teams qualify. */
  allowedTeams?: Set<string>;
}

/**
 * Find the employment window covering `date` for `name`.
 * Returns null if no window covers the date, or if the covering window is excluded.
 */
export function resolveEffectiveWindow(
  name: string | null | undefined,
  date: Date,
  windows: Map<string, EmploymentWindow[]>,
  opts: ResolveOptions = {},
): EmploymentWindow | null {
  const key = normName(name);
  if (!key) return null;
  const arr = windows.get(key);
  if (!arr || arr.length === 0) return null;

  const exclude = opts.excludeTeams ?? PARENTAL_LEAVE_TEAMS;
  const allow = opts.allowedTeams;
  const t = date.getTime();

  // Linear scan — windows per person are tiny (typically <5).
  for (const w of arr) {
    const okStart = !w.start || w.start.getTime() <= t;
    const okEnd = !w.end || w.end.getTime() >= t;
    if (okStart && okEnd) {
      if (exclude.has(w.teamLower)) return null;
      if (allow && !allow.has(w.teamLower)) return null;
      return w;
    }
  }
  return null;
}

/** True if the date falls inside a parental-leave window for this person. */
export function isInParentalLeaveWindow(
  name: string | null | undefined,
  date: Date,
  windows: Map<string, EmploymentWindow[]>,
): boolean {
  const key = normName(name);
  if (!key) return false;
  const arr = windows.get(key);
  if (!arr) return false;
  const t = date.getTime();
  for (const w of arr) {
    if (!PARENTAL_LEAVE_TEAMS.has(w.teamLower)) continue;
    const okStart = !w.start || w.start.getTime() <= t;
    const okEnd = !w.end || w.end.getTime() >= t;
    if (okStart && okEnd) return true;
  }
  return false;
}

/** Working days (Mon–Fri) in [start,end] excluding any parental-leave days for name. */
export function getWorkingDaysExcludingLeaveWindows(
  name: string | null | undefined,
  start: Date,
  end: Date,
  windows: Map<string, EmploymentWindow[]>,
): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter(
    (d) => !isWeekend(d) && !isInParentalLeaveWindow(name, d, windows),
  ).length;
}
