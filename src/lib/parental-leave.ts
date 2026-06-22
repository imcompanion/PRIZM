// Backwards-compat thin wrapper. The canonical implementation lives in
// `employment-windows.ts` (period-aware employment resolution). All new code
// should import from there directly.

import { eachDayOfInterval, isWeekend } from "date-fns";

export interface LeaveInterval {
  start: Date;
  end: Date;
}

/**
 * Build a map of person name (lowercased, trimmed) → array of parental leave intervals.
 * Scans all people records for team matching "parental leave" (case-insensitive).
 */
export function buildParentalLeaveMap(people: any[]): Map<string, LeaveInterval[]> {
  const map = new Map<string, LeaveInterval[]>();

  for (const p of people) {
    if (!p?.name) continue;
    const team = (p.team || "").toLowerCase().trim();
    if (team !== "parental leave") continue;

    const start = p.employment_start_date ? new Date(p.employment_start_date) : null;
    const end = p.employment_end_date ? new Date(p.employment_end_date) : null;
    if (!start || !end) continue;

    const normName = p.name.trim().toLowerCase();
    if (!map.has(normName)) map.set(normName, []);
    map.get(normName)!.push({ start, end });
  }

  return map;
}

export function isOnParentalLeave(date: Date, leaveIntervals: LeaveInterval[] | undefined): boolean {
  if (!leaveIntervals || leaveIntervals.length === 0) return false;
  const time = date.getTime();
  return leaveIntervals.some(iv => time >= iv.start.getTime() && time <= iv.end.getTime());
}

export function getWorkingDaysExcludingLeave(
  start: Date,
  end: Date,
  leaveIntervals: LeaveInterval[] | undefined,
): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d) && !isOnParentalLeave(d, leaveIntervals)).length;
}
