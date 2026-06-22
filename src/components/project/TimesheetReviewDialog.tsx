import { useMemo, useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { eachWeekOfInterval, startOfWeek, endOfWeek, format, eachDayOfInterval, isWeekend, differenceInWeeks, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Clock } from "lucide-react";
import { isInParentalLeaveWindow, buildEmploymentWindows } from "@/lib/employment-windows";

interface TimeEntry {
  person_id: string;
  date: string;
  hours: number;
  people?: {
    name: string;
    roles?: {
      name: string;
      billable_capacity_hours: number;
    };
  };
}

interface CompletenessData {
  personId: string;
  name: string;
  role: string;
  loggedHours: number;
  expectedHours: number;
  pct: number;
  employmentStart?: string | null;
  employmentEnd?: string | null;
  capacityPerDay?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeEntries: TimeEntry[];
  flaggedNames: string[];
  projectStartDate: string;
  projectEndDate: string;
  completenessData?: CompletenessData[];
}

function getRecencyLabel(lastEntryDate: Date | null, today: Date): { text: string; severity: "red" | "amber" | "green" } {
  if (!lastEntryDate) return { text: "No entries logged", severity: "red" };
  const daysDiff = differenceInDays(today, lastEntryDate);
  const weeksDiff = differenceInWeeks(today, lastEntryDate);
  if (daysDiff <= 7) return { text: "Logged this week", severity: "green" };
  if (weeksDiff <= 2) return { text: `Last logged ${weeksDiff} week${weeksDiff > 1 ? "s" : ""} ago`, severity: "amber" };
  return { text: `Last logged ${weeksDiff} weeks ago`, severity: "red" };
}

const severityColors = {
  green: "text-emerald-600",
  amber: "text-amber-500",
  red: "text-destructive",
};

/** Check if a week overlaps with a person's employment period */
function isWeekEmployed(weekStart: Date, weekEnd: Date, empStart: Date | null, empEnd: Date | null): boolean {
  if (empStart && weekEnd < empStart) return false;
  if (empEnd && weekStart > empEnd) return false;
  return true;
}

function HeatmapCell({ hours, expected, employed, onLeave }: { hours: number; expected: number; employed: boolean; onLeave?: boolean }) {
  if (!employed) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full h-7 rounded-sm bg-muted/40 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/40">–</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Not employed during this week
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (onLeave) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full h-7 rounded-sm bg-muted/40 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/40">–</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">On parental leave</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const ratio = expected > 0 ? hours / expected : 0;
  let bg = "bg-destructive/20";
  if (hours === 0) bg = "bg-destructive/30";
  else if (ratio >= 0.9) bg = "bg-emerald-500/30";
  else if (ratio >= 0.6) bg = "bg-amber-400/30";
  else bg = "bg-destructive/20";

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-full h-7 rounded-sm ${bg} flex items-center justify-center`}>
            <span className="text-[10px] font-medium text-foreground/70">
              {hours > 0 ? `${hours}` : "–"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {hours}h / {expected}h expected
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TimesheetReviewDialog({ open, onOpenChange, timeEntries, flaggedNames, projectStartDate, projectEndDate, completenessData }: Props) {
  const [allPersonEntries, setAllPersonEntries] = useState<TimeEntry[]>([]);
  const [extraPeople, setExtraPeople] = useState<{ id: string; name: string; role: string; capacity: number; employmentStart: string | null; employmentEnd: string | null }[]>([]);
  const [allPeopleRowsForLeave, setAllPeopleRowsForLeave] = useState<any[]>([]);

  useEffect(() => {
    if (!open || flaggedNames.length === 0) return;
    const fetchAllEntries = async () => {
      const flaggedLower = flaggedNames.map(n => n.toLowerCase());

      // Always fetch ALL people records for flagged names to find sibling IDs (same person, different roles/employment periods)
      const allPeopleRecords: any[] = [];
      let pFrom = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, name, team, employment_start_date, employment_end_date, overall_start_date, overall_end_date, roles(name, billable_capacity_hours)")
          .order("name")
          .range(pFrom, pFrom + 999);
        if (error) break;
        allPeopleRecords.push(...(data || []));
        if (!data || data.length < 1000) break;
        pFrom += 1000;
      }
      // Keep all rows for flagged names (incl. parental-leave team rows) so we can mark leave weeks
      setAllPeopleRowsForLeave(allPeopleRecords.filter((p: any) => flaggedLower.includes((p.name || "").toLowerCase())));

      const allPersonIds = new Set<string>();
      const newExtraPeople: typeof extraPeople = [];

      // Get person IDs from project time entries
      timeEntries
        .filter(te => te.people?.name && flaggedLower.includes(te.people.name.toLowerCase()))
        .forEach(te => allPersonIds.add(te.person_id));

      // Also get person IDs from completenessData
      completenessData?.forEach(cd => {
        if (cd.personId && flaggedLower.includes(cd.name.toLowerCase())) {
          allPersonIds.add(cd.personId);
        }
      });

      // Find ALL sibling IDs by name from the people table (handles role changes creating new records)
      if (allPeopleRecords) {
        for (const p of allPeopleRecords) {
          if (flaggedLower.includes(p.name.toLowerCase())) {
            const isNew = !allPersonIds.has(p.id);
            allPersonIds.add(p.id);
            if (isNew) {
              newExtraPeople.push({
                id: p.id,
                name: p.name,
                role: (p.roles as any)?.name || "Unknown",
                capacity: (p.roles as any)?.billable_capacity_hours || 7.5,
                employmentStart: p.overall_start_date || p.employment_start_date,
                employmentEnd: p.overall_end_date || p.employment_end_date,
              });
            }
          }
        }
      }
      setExtraPeople(newExtraPeople);

      const personIds = [...allPersonIds];
      if (personIds.length === 0) { setAllPersonEntries([]); return; }
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("person_id, date, hours, people(name)")
          .in("person_id", personIds)
          .gte("date", projectStartDate)
          .lte("date", projectEndDate)
          .order("id")
          .range(from, from + pageSize - 1);
        if (error) {
          console.error("[TimesheetReviewDialog] fetch error", error);
          break;
        }
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      setAllPersonEntries(allData);
    };
    fetchAllEntries();
  }, [open, flaggedNames, timeEntries, projectStartDate, projectEndDate]);

  const { weeks, people, completeness, personWeeklyHours, personLastEntry, personEmployment } = useMemo(() => {
    const today = new Date();
    const projStart = new Date(projectStartDate);
    const projEnd = new Date(projectEndDate);
    const effectiveEnd = today < projEnd ? today : projEnd;

    const flaggedLower = flaggedNames.map(n => n.toLowerCase());
    const relevantEntries = timeEntries.filter(
      te => te.people?.name && flaggedLower.includes(te.people.name.toLowerCase())
    );

    // Build people map
    const peopleMap: Record<string, { personId: string; name: string; role: string; capacity: number }> = {};
    relevantEntries.forEach(te => {
      if (te.people?.name && !peopleMap[te.person_id]) {
        peopleMap[te.person_id] = {
          personId: te.person_id,
          name: te.people.name,
          role: te.people.roles?.name || "Unknown",
          capacity: te.people.roles?.billable_capacity_hours || 7.5,
        };
      }
    });

    // Also add people from completenessData who may not have time entries on this project
    completenessData?.forEach(cd => {
      const existing = Object.values(peopleMap).find(p => p.name.toLowerCase() === cd.name.toLowerCase());
      if (!existing && cd.personId) {
        peopleMap[cd.personId] = {
          personId: cd.personId,
          name: cd.name,
          role: cd.role,
          capacity: cd.capacityPerDay || 7.5,
        };
      } else if (existing && cd.capacityPerDay) {
        // Update capacity from completenessData if available
        existing.capacity = cd.capacityPerDay;
      }
    });

    // Also add extra people fetched from DB (stale people not on this project)
    extraPeople.forEach(ep => {
      if (!peopleMap[ep.id]) {
        peopleMap[ep.id] = {
          personId: ep.id,
          name: ep.name,
          role: ep.role,
          capacity: ep.capacity,
        };
      }
    });

    const people = Object.values(peopleMap);

    // Build employment date map — use earliest start and latest end across ALL records for the same name
    const personEmployment: Record<string, { start: Date | null; end: Date | null }> = {};
    people.forEach(p => {
      const nameLower = p.name.toLowerCase().trim();
      // Gather all employment dates from completenessData and extraPeople for this name
      const allStarts: Date[] = [];
      const allEnds: Date[] = [];
      
      completenessData?.forEach(cd => {
        if (cd.name.toLowerCase().trim() === nameLower) {
          if (cd.employmentStart) allStarts.push(new Date(cd.employmentStart));
          if (cd.employmentEnd) allEnds.push(new Date(cd.employmentEnd));
        }
      });
      extraPeople.forEach(ep => {
        if (ep.name.toLowerCase().trim() === nameLower) {
          if (ep.employmentStart) allStarts.push(new Date(ep.employmentStart));
          if (ep.employmentEnd) allEnds.push(new Date(ep.employmentEnd));
        }
      });

      personEmployment[p.personId] = {
        start: allStarts.length > 0 ? new Date(Math.min(...allStarts.map(d => d.getTime()))) : null,
        end: allEnds.length > 0 ? new Date(Math.max(...allEnds.map(d => d.getTime()))) : null,
      };
    });

    // Generate weeks
    const weeks = eachWeekOfInterval(
      { start: projStart, end: effectiveEnd },
      { weekStartsOn: 1 }
    );

    // Always use allPersonEntries (all-project hours within date range) — chips reflect overall timesheet completeness
    const entriesForHeatmap = allPersonEntries;

    // Build a map of personId -> all sibling IDs (same name)
    const siblingIdsMap: Record<string, Set<string>> = {};
    people.forEach(p => {
      const nameLower = p.name.toLowerCase().trim();
      const siblingIds = new Set<string>();
      siblingIds.add(p.personId);
      // Find all person IDs in entriesForHeatmap with same name
      entriesForHeatmap.forEach(te => {
        if (te.people?.name?.toLowerCase().trim() === nameLower) {
          siblingIds.add(te.person_id);
        }
      });
      // Also add IDs from extraPeople with same name
      extraPeople.forEach(ep => {
        if (ep.name.toLowerCase().trim() === nameLower) {
          siblingIds.add(ep.id);
        }
      });
      siblingIdsMap[p.personId] = siblingIds;
    });

    // Build per-person weekly hours map & last entry tracking (aggregating across sibling IDs)
    const personWeeklyHours: Record<string, Record<string, number>> = {};
    const personLastEntry: Record<string, Date | null> = {};

    people.forEach(p => {
      personWeeklyHours[p.personId] = {};
      personLastEntry[p.personId] = null;
      const siblingIds = siblingIdsMap[p.personId] || new Set([p.personId]);

      weeks.forEach(weekStart => {
        const key = format(weekStart, "yyyy-MM-dd");
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const hrs = entriesForHeatmap
          .filter(te => {
            const d = new Date(te.date);
            return siblingIds.has(te.person_id) && d >= weekStart && d <= wEnd;
          })
          .reduce((s, te) => s + te.hours, 0);
        personWeeklyHours[p.personId][key] = Math.round(hrs * 10) / 10;
      });

      // Find last entry date across all sibling IDs
      const personEntries = entriesForHeatmap.filter(te => siblingIds.has(te.person_id));
      if (personEntries.length > 0) {
        const dates = personEntries.map(te => new Date(te.date));
        personLastEntry[p.personId] = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    });

    // Completeness from passed-in data
    const completeness = completenessData
      ? people.map(p => {
          const match = completenessData.find(c => c.personId === p.personId || c.name.toLowerCase() === p.name.toLowerCase());
          return match || { personId: p.personId, name: p.name, role: p.role, loggedHours: 0, expectedHours: 0, pct: 0 };
        })
      : people.map(p => {
          const emp = personEmployment[p.personId];
          const empStart = emp?.start && emp.start > projStart ? emp.start : projStart;
          const empEnd = emp?.end && emp.end < effectiveEnd ? emp.end : effectiveEnd;
          const workingDays = empStart <= empEnd
            ? eachDayOfInterval({ start: empStart, end: empEnd }).filter(d => !isWeekend(d)).length
            : 0;
          const expectedHours = workingDays * p.capacity;
          const sibIds = siblingIdsMap[p.personId] || new Set([p.personId]);
          const loggedHours = allPersonEntries.filter(te => sibIds.has(te.person_id)).reduce((s, te) => s + te.hours, 0);
          return { personId: p.personId, name: p.name, role: p.role, loggedHours: Math.round(loggedHours * 10) / 10, expectedHours: Math.round(expectedHours), pct: expectedHours > 0 ? Math.round((loggedHours / expectedHours) * 100) : 0 };
        });

    return { weeks, people, completeness, personWeeklyHours, personLastEntry, personEmployment };
  }, [timeEntries, flaggedNames, projectStartDate, projectEndDate, allPersonEntries, completenessData, extraPeople]);

  const today = new Date();

  // Calculate expected hours per week (working days * capacity), respecting employment dates
  const getWeekExpected = (weekStart: Date, personId?: string) => {
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const effectiveEnd = today < new Date(projectEndDate) ? today : new Date(projectEndDate);
    let clampedStart = weekStart;
    let clampedEnd = wEnd > effectiveEnd ? effectiveEnd : wEnd;

    // Clamp to employment dates if provided
    if (personId && personEmployment[personId]) {
      const emp = personEmployment[personId];
      if (emp.start && emp.start > clampedStart) clampedStart = emp.start;
      if (emp.end && emp.end < clampedEnd) clampedEnd = emp.end;
    }

    if (clampedEnd < clampedStart) return 0;

    // Use person's actual capacity instead of hardcoded 7.5
    const personCapacity = personId
      ? (people.find(p => p.personId === personId)?.capacity || 7.5)
      : 7.5;

    return eachDayOfInterval({ start: clampedStart, end: clampedEnd }).filter(d => !isWeekend(d)).length * personCapacity;
  };

  // Check if person was employed during a week
  const isPersonEmployedInWeek = (personId: string, weekStart: Date) => {
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const emp = personEmployment[personId];
    if (!emp) return true;
    return isWeekEmployed(weekStart, wEnd, emp.start, emp.end);
  };

  // Build per-name parental-leave windows for grey-out in heatmap
  const leaveWindowsByName = useMemo(() => buildEmploymentWindows(allPeopleRowsForLeave), [allPeopleRowsForLeave]);

  const isWeekOnLeave = (personName: string, weekStart: Date) => {
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    // True if the midpoint of the week falls inside a parental-leave window
    const mid = new Date((weekStart.getTime() + wEnd.getTime()) / 2);
    return isInParentalLeaveWindow(personName, mid, leaveWindowsByName);
  };

  // Find missing weeks (0 hours with >0 expected AND employed AND not on parental leave)
  const getMissingWeeks = (personId: string, personName: string) => {
    return weeks
      .filter(w => {
        if (!isPersonEmployedInWeek(personId, w)) return false;
        if (isWeekOnLeave(personName, w)) return false;
        const key = format(w, "yyyy-MM-dd");
        const expected = getWeekExpected(w, personId);
        return expected > 0 && (personWeeklyHours[personId]?.[key] || 0) === 0;
      })
      .map(w => format(w, "dd MMM"));
  };

  // Calculate dynamic dialog width based on weeks count
  // Each week cell ~30px + gap, plus ~200px for person info padding
  const weekCount = weeks.length;
  const dynamicMaxWidth = Math.max(500, Math.min(weekCount * 32 + 250, 1600));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" style={{ maxWidth: `${dynamicMaxWidth}px` }}>
        <DialogHeader>
          <DialogTitle className="font-display">Timesheet Review</DialogTitle>
        </DialogHeader>

        {/* Per-person cards with recency + completeness */}
        <div className="space-y-4 mb-4">
          {people.map((p) => {
            const comp = completeness.find(c => c.personId === p.personId);
            const recency = getRecencyLabel(personLastEntry[p.personId], today);
            const missingWeeks = getMissingWeeks(p.personId, p.name);
            const emp = personEmployment[p.personId];
            const hasEmploymentBounds = !!(emp?.start || emp?.end);

            return (
              <div key={p.personId} className="rounded-lg border p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.role}</p>
                    {hasEmploymentBounds && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Employed: {emp?.start ? format(emp.start, "dd MMM yyyy") : "before project"} – {emp?.end ? format(emp.end, "dd MMM yyyy") : "present"}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${(comp?.pct || 0) < 50 ? "text-destructive" : (comp?.pct || 0) < 80 ? "text-amber-500" : "text-primary"}`}>
                      {comp?.pct || 0}%
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {comp?.loggedHours || 0}h / {comp?.expectedHours || 0}h
                    </p>
                  </div>
                </div>

                {/* Recency indicator */}
                <div className={`flex items-center gap-1.5 text-xs ${severityColors[recency.severity]}`}>
                  <Clock className="h-3 w-3" />
                  {recency.text}
                </div>

                {/* Weekly heatmap */}
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Weekly hours</p>
                  <div className="flex gap-0.5 pb-1">
                    {weeks.map(w => {
                      const key = format(w, "yyyy-MM-dd");
                      const hrs = personWeeklyHours[p.personId]?.[key] || 0;
                      const expected = getWeekExpected(w, p.personId);
                      const employed = isPersonEmployedInWeek(p.personId, w);
                      const onLeave = isWeekOnLeave(p.name, w);
                      return (
                        <div key={key} className="flex flex-col items-center flex-1 min-w-0">
                          <HeatmapCell hours={hrs} expected={expected} employed={employed} onLeave={onLeave} />
                          <span className="text-[8px] text-muted-foreground mt-0.5 truncate">
                            {format(w, "dd/MM")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Missing weeks */}
                {missingWeeks.length > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-destructive/80">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      <strong>{missingWeeks.length} missing week{missingWeeks.length > 1 ? "s" : ""}:</strong>{" "}
                      {missingWeeks.length <= 6
                        ? missingWeeks.join(", ")
                        : `${missingWeeks.slice(0, 5).join(", ")} + ${missingWeeks.length - 5} more`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
