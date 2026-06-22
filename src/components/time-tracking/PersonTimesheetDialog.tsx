import { useMemo, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { eachWeekOfInterval, endOfWeek, format, eachDayOfInterval, isWeekend, differenceInDays, differenceInWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  type TimeEntryForClassification,
  classifyEntry,
  fetchRulesWithConditions,
  fetchProjectIdSet,
} from "@/lib/billability";
import { buildParentalLeaveMap, type LeaveInterval, isOnParentalLeave } from "@/lib/parental-leave";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip as RechartsTooltip, LabelList } from "recharts";

interface PersonTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personIds?: string[];
  personName: string;
  personRole: string;
  startDate: Date;
  endDate: Date;
  employmentStart?: string | null;
  employmentEnd?: string | null;
  actualHours: number;
  expectedHours: number;
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

function isWeekEmployed(weekStart: Date, weekEnd: Date, empStart: Date | null, empEnd: Date | null, leaveIntervals?: LeaveInterval[]): boolean | "parental_leave" {
  if (empStart && weekEnd < empStart) return false;
  if (empEnd && weekStart > empEnd) return false;
  // Check if the entire week falls within a parental leave period
  if (leaveIntervals && leaveIntervals.length > 0) {
    const days = eachDayOfInterval({ start: weekStart > (empStart || weekStart) ? weekStart : (empStart || weekStart), end: weekEnd < (empEnd || weekEnd) ? weekEnd : (empEnd || weekEnd) });
    const workingDays = days.filter(d => !isWeekend(d));
    if (workingDays.length > 0 && workingDays.every(d => isOnParentalLeave(d, leaveIntervals))) {
      return "parental_leave";
    }
  }
  return true;
}

function HeatmapCell({ hours, expected, employed }: { hours: number; expected: number; employed: boolean | "parental_leave" }) {
  if (employed === false) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full h-7 rounded-sm bg-muted/40 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground/40">–</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Not employed during this week</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (employed === "parental_leave") {
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
        <TooltipContent side="top" className="text-xs">{hours}h / {expected}h expected</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const CHART_COLORS = ["#ef4444", "#f97316", "#eab308", "#6366f1", "#8b5cf6"];

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium mb-0.5">{d.fullName}</p>
      <p className="text-muted-foreground">{d.hours.toFixed(1)}h</p>
    </div>
  );
}

export function PersonTimesheetDialog({
  open, onOpenChange, personId, personIds, personName, personRole,
  startDate, endDate, employmentStart, employmentEnd,
  actualHours, expectedHours,
}: PersonTimesheetDialogProps) {
  const allIds = personIds && personIds.length > 0 ? personIds : [personId];
  const [entries, setEntries] = useState<Array<{ date: string; hours: number }>>([]);
  const [loading, setLoading] = useState(false);

  // Fetch detailed time entries with project info for non-billable analysis
  const [detailedEntries, setDetailedEntries] = useState<Array<{
    hours: number; notes: string | null; project_id: string | null; project_name: string | null;
    projects: { title: string; opportunity_record_type: string | null; revenue: number | null; stage: string | null; office: string | null } | null;
  }>>([]);

  useEffect(() => {
    if (!open) return;
    const fetchEntries = async () => {
      setLoading(true);
      const allData: any[] = [];
      const allDetailed: any[] = [];
      let from = 0;
      const pageSize = 1000;
      // Fetch basic entries for heatmap
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("date, hours")
          .in("person_id", allIds)
          .gte("date", format(startDate, "yyyy-MM-dd"))
          .lte("date", format(endDate, "yyyy-MM-dd"))
          .range(from, from + pageSize - 1);
        if (error) break;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      
      setEntries(allData);

      // Fetch detailed entries with project info for billability classification
      from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("hours, notes, project_id, project_name, projects(title, opportunity_record_type, revenue, stage, office)")
          .in("person_id", allIds)
          .gte("date", format(startDate, "yyyy-MM-dd"))
          .lte("date", format(endDate, "yyyy-MM-dd"))
          .range(from, from + pageSize - 1);
        if (error) break;
        allDetailed.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      setDetailedEntries(allDetailed);
      setLoading(false);
    };
    fetchEntries();
  }, [open, allIds.join(","), startDate, endDate]);

  // Billability rules (cached globally)
  const { data: rules = [] } = useQuery({
    queryKey: ["billability_rules_full"],
    queryFn: fetchRulesWithConditions,
  });
  const { data: projectIdsRaw = [] } = useQuery({
    queryKey: ["project_ids_set"],
    queryFn: fetchProjectIdSet,
  });
  const projectIds = useMemo(() => new Set(projectIdsRaw), [projectIdsRaw]);

  // Fetch parental leave intervals for this person
  const { data: allPeople = [] } = useQuery({
    queryKey: ["people_with_roles"],
    queryFn: async () => {
      const allPeople: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("*, roles(name, billable_capacity_hours)")
          .order("name")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allPeople.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allPeople;
    },
  });

  const leaveIntervals = useMemo(() => {
    const leaveMap = buildParentalLeaveMap(allPeople);
    const normName = personName.trim().toLowerCase();
    return leaveMap.get(normName) || [];
  }, [allPeople, personName]);

  const today = new Date();
  const empStart = employmentStart ? new Date(employmentStart) : null;
  const empEnd = employmentEnd ? new Date(employmentEnd) : null;

  const { weeks, weeklyHours, lastEntry, missingWeeks } = useMemo(() => {
    const effectiveEnd = today < endDate ? today : endDate;
    const weeks = eachWeekOfInterval({ start: startDate, end: effectiveEnd }, { weekStartsOn: 1 });

    const weeklyHours: Record<string, number> = {};
    let lastEntry: Date | null = null;

    for (const w of weeks) {
      weeklyHours[format(w, "yyyy-MM-dd")] = 0;
    }

    for (const e of entries) {
      const d = new Date(e.date);
      if (!lastEntry || d > lastEntry) lastEntry = d;
      for (const w of weeks) {
        const wEnd = endOfWeek(w, { weekStartsOn: 1 });
        if (d >= w && d <= wEnd) {
          const key = format(w, "yyyy-MM-dd");
          weeklyHours[key] = Math.round(((weeklyHours[key] || 0) + e.hours) * 10) / 10;
          break;
        }
      }
    }

    const missingWeeks = weeks.filter(w => {
      const wEnd = endOfWeek(w, { weekStartsOn: 1 });
      const empStatus = isWeekEmployed(w, wEnd, empStart, empEnd, leaveIntervals);
      if (empStatus !== true) return false;
      const expected = getWeekExpected(w, effectiveEnd);
      const key = format(w, "yyyy-MM-dd");
      return expected > 0 && (weeklyHours[key] || 0) === 0;
    }).map(w => format(w, "dd MMM"));

    return { weeks, weeklyHours, lastEntry, missingWeeks };
  }, [entries, startDate, endDate, empStart, empEnd, leaveIntervals]);

  // Compute top 5 non-billable tasks
  const nonBillableTop5 = useMemo(() => {
    if (!rules.length || !detailedEntries.length) return [];

    const taskHours = new Map<string, number>();

    for (const entry of detailedEntries) {
      // Skip leave entries
      const notesLower = (entry.notes || "").trim().toLowerCase();
      const titleLower = (entry.projects?.title || "").trim().toLowerCase();
      const leavePattern = /(^leave$|annual leave|sick leave|sick day|bank holiday|office closed|non-working day|parental leave|maternity leave|paternity leave|compassionate leave|bereavement leave|^leave -|^leave:|^leave |leave$|holiday)/;
      if (leavePattern.test(notesLower) || leavePattern.test(titleLower)) continue;

      const entryForClassification: TimeEntryForClassification = {
        id: "", date: "", hours: entry.hours, notes: entry.notes,
        project_id: entry.project_id, person_id: personId,
        people: null,
        projects: entry.projects || null,
      };
      const projectExists = entry.project_id ? projectIds.has(entry.project_id) : false;
      const { result, matchedRule } = classifyEntry(rules, entryForClassification, projectExists);

      if (result === "non-billable" || result === "unmatched") {
        // Group by rule name for specific non-billable rules (RFP/RFI, Lost Client Work, Unpaid Client Work)
        const groupByRuleNames = new Set(["RFP / RFI", "Lost Client Work", "Unpaid Client Work"]);
        const label = (matchedRule && !matchedRule.is_billable && groupByRuleNames.has(matchedRule.name))
          ? matchedRule.name
          : entry.projects?.title || entry.project_name || entry.notes || "Unknown task";
        taskHours.set(label, (taskHours.get(label) || 0) + entry.hours);
      }
    }

    const totalPersonHours = actualHours || 0;
    return Array.from(taskHours.entries())
      .map(([name, hours]) => ({ name, hours, pct: totalPersonHours > 0 ? (hours / totalPersonHours) * 100 : 0 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map((d) => ({
        ...d,
        fullName: d.name,
        name: d.name.length > 30 ? d.name.slice(0, 28) + "…" : d.name,
        insideLabel: `${Math.round(d.hours)}h`,
        outsideLabel: `${Math.round(d.pct)}%`,
      }));
  }, [detailedEntries, rules, projectIds, personId, actualHours]);

  const leaveHours = useMemo(() => {
    const leavePattern = /(^leave$|annual leave|sick leave|sick day|bank holiday|office closed|non-working day|parental leave|maternity leave|paternity leave|compassionate leave|bereavement leave|^leave -|^leave:|^leave |leave$|holiday)/;
    let total = 0;
    for (const e of detailedEntries) {
      const notesLower = (e.notes || "").trim().toLowerCase();
      const titleLower = (e.projects?.title || "").trim().toLowerCase();
      if (leavePattern.test(notesLower) || leavePattern.test(titleLower)) total += e.hours;
    }
    return total;
  }, [detailedEntries]);

  function getWeekExpected(weekStart: Date, effectiveEnd: Date) {
    const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    let clampedStart: Date = weekStart;
    let clampedEnd = wEnd > effectiveEnd ? effectiveEnd : wEnd;
    if (empStart && empStart > clampedStart) clampedStart = empStart;
    if (empEnd && empEnd < clampedEnd) clampedEnd = empEnd;
    if (clampedEnd < clampedStart) return 0;
    return eachDayOfInterval({ start: clampedStart, end: clampedEnd })
      .filter(d => !isWeekend(d) && !isOnParentalLeave(d, leaveIntervals)).length * 7.5;
  }

  const effectiveEnd = today < endDate ? today : endDate;
  const pct = expectedHours > 0 ? Math.round((actualHours / expectedHours) * 100) : 0;
  const recency = getRecencyLabel(lastEntry, today);
  const weekCount = weeks.length;
  const dynamicMaxWidth = Math.max(500, Math.min(weekCount * 32 + 250, 1600));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" style={{ maxWidth: `${dynamicMaxWidth}px` }}>
        <DialogHeader>
          <DialogTitle className="font-display">Timesheet Review</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : (
          <div className="space-y-4">
            {/* Timesheet Completeness */}
            <div className="rounded-lg border p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{personName}</p>
                  <p className="text-xs text-muted-foreground">{personRole}</p>
                  {(empStart || empEnd) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Employed: {empStart ? format(empStart, "dd MMM yyyy") : "before period"} – {empEnd ? format(empEnd, "dd MMM yyyy") : "present"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${pct < 50 ? "text-destructive" : pct < 80 ? "text-amber-500" : "text-primary"}`}>
                    {pct}%
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(actualHours)}h / {Math.round(expectedHours)}h
                  </p>
                </div>
              </div>

              {/* Recency */}
              <div className={`flex items-center gap-1.5 text-xs ${severityColors[recency.severity]}`}>
                <Clock className="h-3 w-3" />
                {recency.text}
              </div>

              {/* Heatmap */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Weekly hours</p>
                <div className="flex gap-0.5 pb-1">
                  {weeks.map(w => {
                    const key = format(w, "yyyy-MM-dd");
                    const hrs = weeklyHours[key] || 0;
                    const expected = getWeekExpected(w, effectiveEnd);
                    const wEnd = endOfWeek(w, { weekStartsOn: 1 });
                    const employed = isWeekEmployed(w, wEnd, empStart, empEnd, leaveIntervals);
                    return (
                      <div key={key} className="flex flex-col items-center flex-1 min-w-0">
                        <HeatmapCell hours={hrs} expected={expected} employed={employed} />
                        <span className="text-[8px] text-muted-foreground mt-0.5 truncate">{format(w, "dd/MM")}</span>
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

            {/* Non-Billable Tasks Chart */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Top non-billable tasks</p>
              {nonBillableTop5.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No non-billable hours recorded</p>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nonBillableTop5} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}h`} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 10 }}
                      />
                      <RechartsTooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={20}>
                        {nonBillableTop5.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                        <LabelList dataKey="insideLabel" position="insideRight" fill="white" fontSize={9} fontWeight={600} />
                        <LabelList dataKey="outsideLabel" position="right" fill="hsl(var(--muted-foreground))" fontSize={9} fontWeight={500} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Leave taken in this period: <span className="font-medium text-foreground">{Math.round(leaveHours)}h</span>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
