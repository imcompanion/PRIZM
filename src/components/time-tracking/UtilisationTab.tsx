import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
import { buildParentalLeaveMap, isOnParentalLeave } from "@/lib/parental-leave";
import { cn } from "@/lib/utils";
import {
  type TimeEntryForClassification,
  classifyEntry,
  fetchRulesWithConditions,
  fetchProjectIdSet,
  fetchProjectsForBillability,
  BILLABILITY_PROJECTS_QUERY_KEY,
  BILLABILITY_PROJECT_IDS_QUERY_KEY,
} from "@/lib/billability";
import { PersonTimesheetDialog } from "./PersonTimesheetDialog";
import { SendRemindersDialog } from "./SendRemindersDialog";
import TrendCharts from "./TrendCharts";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";

const HOURS_PER_DAY = 7.5;

function getWorkingDays(start: Date, end: Date): number {
  if (start > end) return 0;
  const days = eachDayOfInterval({ start, end });
  return days.filter((d) => !isWeekend(d)).length;
}

const fmt = (n: number) => Math.round(n).toLocaleString();

interface UtilisationTabProps {
  startDate: Date;
  endDate: Date;
  officeFilter: "Global" | "UK" | "US";
  showFormer: boolean;
}

const matchesOffice = (office: string | null, filter: "Global" | "UK" | "US") => {
  if (filter === "Global") return true;
  if (!office) return false;
  const o = office.toUpperCase();
  if (filter === "UK") return o === "UK" || o === "UNITED KINGDOM" || o === "COMPANION";
  if (filter === "US") return o === "US" || o === "UNITED STATES";
  return false;
};

const UtilisationTab = ({ startDate, endDate, officeFilter, showFormer }: UtilisationTabProps) => {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [selectedPerson, setSelectedPerson] = useState<{
    id: string; personIds: string[]; name: string; role: string;
    actualHours: number; expectedHours: number;
    empStart?: string | null; empEnd?: string | null;
  } | null>(null);

  const workingDaysInPeriod = useMemo(() => getWorkingDays(startDate, endDate), [startDate, endDate]);

  const { data: people = [] } = useQuery({
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

  // Fetch aggregated utilisation data server-side (grouped by person+project)
  const { data: utilisationSummary = [] } = useQuery({
    queryKey: ["utilisation_summary", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.rpc("get_utilisation_summary", {
          _start_date: format(startDate, "yyyy-MM-dd"),
          _end_date: format(endDate, "yyyy-MM-dd"),
        }).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allData as Array<{
        person_id: string;
        project_id: string | null;
        total_hours: number;
        leave_hours: number;
      }>;
    },
  });

  // Fetch project details for billability classification (cached, small dataset)
  const { data: projectsRaw = [] } = useQuery({
    queryKey: BILLABILITY_PROJECTS_QUERY_KEY,
    queryFn: fetchProjectsForBillability,
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });

  const projectsMap = useMemo(() => {
    const map = new Map<string, any>();
    const projectList = Array.isArray(projectsRaw) ? projectsRaw : [];

    for (const p of projectList) {
      if (p?.id) map.set(p.id, p);
    }
    return map;
  }, [projectsRaw]);

  // Fetch billability rules and project IDs
  const { data: rules = [] } = useQuery({
    queryKey: ["billability_rules_full"],
    queryFn: fetchRulesWithConditions,
  });

  const { data: projectIdsRaw = [] } = useQuery({
    queryKey: BILLABILITY_PROJECT_IDS_QUERY_KEY,
    queryFn: fetchProjectIdSet,
  });

  const projectIds = useMemo(
    () => new Set<string>(Array.isArray(projectIdsRaw) ? projectIdsRaw : []),
    [projectIdsRaw]
  );

  // Aggregate per-person totals from the server-side summary
  const hoursByPerson = useMemo(() => {
    const map = new Map<string, { total: number; billable: number; leave: number }>();
    for (const row of utilisationSummary) {
      if (!row.person_id) continue;
      if (!map.has(row.person_id)) map.set(row.person_id, { total: 0, billable: 0, leave: 0 });
      const rec = map.get(row.person_id)!;
      const hrs = Number(row.total_hours);
      const leaveHrs = Number(row.leave_hours);
      const nonLeaveHrs = hrs - leaveHrs;

      rec.total += hrs;
      rec.leave += leaveHrs;

      // Classify non-leave hours using billability rules
      if (nonLeaveHrs > 0) {
        const proj = projectsMap.get(row.project_id);
        const entryForClassification: TimeEntryForClassification = {
          id: "",
          date: "",
          hours: nonLeaveHrs,
          notes: null, // notes already handled by leave detection in DB
          project_id: row.project_id,
          person_id: row.person_id,
          people: null,
          projects: proj || null,
        };
        const projectExists = projectIds.has(row.project_id);
        const { result } = classifyEntry(rules, entryForClassification, projectExists);
        if (result === "billable") {
          rec.billable += nonLeaveHrs;
        }
      }
    }
    return map;
  }, [utilisationSummary, rules, projectIds, projectsMap]);

  // Build lightweight per-person summary, deduplicated by name+team
  // People may have multiple records (employment periods) — aggregate expected hours across records,
  // but use sibling-aggregated actual hours only once per unique person.
  // Build parental leave map from all people records
  const parentalLeaveMap = useMemo(() => buildParentalLeaveMap(people), [people]);

  const personSummaries = useMemo(() => {
    const allowedTeams = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);

    // Build name+team -> sibling IDs for the same team (handles people who moved
    // between teams — each team row only picks up its own contract's hours).
    // Also build name -> all teams seen, so we can route "orphan" sibling IDs
    // (records whose team has no active row in the current period, e.g. an old
    // Data record for someone who's now on Strategy) to the active team row.
    const nameTeamToIds = new Map<string, string[]>();
    const nameToAllIds = new Map<string, Array<{ id: string; team: string }>>();
    // Track which teams are "active" (have an employment record overlapping the
    // filter period) for each person name. Sibling IDs from teams NOT in this
    // set are "orphans" (e.g. an older role on a different team) — their hours
    // should be attributed to the active team row to avoid losing logged time.
    const activeTeamsByName = new Map<string, Set<string>>();
    for (const person of people) {
      const normName = person.name.trim().toLowerCase();
      const teamKey = person.team || "Unassigned";
      const key = `${normName}::${teamKey}`;
      if (!nameTeamToIds.has(key)) nameTeamToIds.set(key, []);
      nameTeamToIds.get(key)!.push(person.id);
      if (!nameToAllIds.has(normName)) nameToAllIds.set(normName, []);
      nameToAllIds.get(normName)!.push({ id: person.id, team: teamKey });

      const empStart = person.employment_start_date ? new Date(person.employment_start_date)
        : person.overall_start_date ? new Date(person.overall_start_date) : null;
      const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
        : person.overall_end_date ? new Date(person.overall_end_date) : null;
      const overlaps = !((empStart && empStart > endDate) || (empEnd && empEnd < startDate));
      if (overlaps) {
        if (!activeTeamsByName.has(normName)) activeTeamsByName.set(normName, new Set());
        activeTeamsByName.get(normName)!.add(teamKey);
      }
    }

    // Deduplicate by name+team: combine expected hours across employment records,
    // aggregate actual hours across sibling IDs only once
    const deduped = new Map<string, {
      id: string; personIds: string[]; name: string; team: string; role: string;
      roleHistory: Array<{ name: string; start: Date | null }>;
      expectedTotalHours: number; expectedBillableHours: number;
      actualHours: number; billableHours: number; leaveHours: number;
      hoursSet: boolean; countedDays: Set<string>; hasEnded: boolean;
    }>();

    for (const person of people) {
      if (!matchesOffice(person.office, officeFilter)) continue;
      const team = (person.team || "").toLowerCase().trim();
      if (!allowedTeams.has(team)) continue;

      // Use employment dates (specific contract period) for expected hours,
      // falling back to overall dates only if employment dates are missing
      const empStart = person.employment_start_date ? new Date(person.employment_start_date)
        : person.overall_start_date ? new Date(person.overall_start_date) : null;
      const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
        : person.overall_end_date ? new Date(person.overall_end_date) : null;
      if (empStart && empStart > endDate) continue;
      if (empEnd && empEnd < startDate) continue;

      const effectiveStart = empStart && empStart > startDate ? empStart : startDate;
      const effectiveEnd = empEnd && empEnd < endDate ? empEnd : endDate;
      if (effectiveStart > effectiveEnd) continue;

      const role = (person as any).roles;
      // billable_capacity_hours in the DB is a weekly figure (e.g. 30 hours = 75% of a 40h week).
      // We must divide by 5 to get the daily expected billable hours.
      const billableCapacityHrs = role?.billable_capacity_hours != null 
        ? role.billable_capacity_hours / 5 
        : HOURS_PER_DAY;

      const normName = person.name.trim().toLowerCase();
      const dedupKey = `${normName}::${person.team || "Unassigned"}`;
      const leaveIntervals = parentalLeaveMap.get(normName);

      const existing = deduped.get(dedupKey);
      if (existing) {
        // Add working days from this employment period that haven't been counted yet
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        let newWorkingDays = 0;
        for (const d of days) {
          if (isWeekend(d)) continue;
          if (isOnParentalLeave(d, leaveIntervals)) continue;
          const dk = d.toISOString().slice(0, 10);
          if (!existing.countedDays.has(dk)) {
            existing.countedDays.add(dk);
            newWorkingDays++;
          }
        }
        existing.expectedTotalHours += newWorkingDays * HOURS_PER_DAY;
        existing.expectedBillableHours += newWorkingDays * billableCapacityHrs;
        existing.personIds.push(person.id);
        if (role?.name) {
          existing.roleHistory.push({ name: role.name, start: person.employment_start_date ? new Date(person.employment_start_date) : null });
        }
        // Use overall_end_date to determine "former" status
        const overallEnd = person.overall_end_date ? new Date(person.overall_end_date) : null;
        const thisEnded = overallEnd ? overallEnd < new Date() : false;
        if (!thisEnded) existing.hasEnded = false;
      } else {
        // Aggregate actual hours across sibling IDs in the same team.
        // Also fold in "orphan" sibling IDs from teams that don't overlap the
        // current period (e.g. an old contract on a different team) — without
        // this, hours logged under a stale person_id after a team change get lost.
        const siblingIds = new Set(nameTeamToIds.get(dedupKey) || [person.id]);
        const activeTeams = activeTeamsByName.get(normName) || new Set<string>();
        const allForName = nameToAllIds.get(normName) || [];
        const orphanIds = allForName.filter(x => !activeTeams.has(x.team)).map(x => x.id);
        // Only the first (alphabetical) active team row absorbs orphan hours,
        // to avoid double-counting across multiple active team rows.
        const sortedActive = [...activeTeams].sort();
        if (sortedActive[0] === (person.team || "Unassigned")) {
          for (const oid of orphanIds) siblingIds.add(oid);
        }
        let total = 0, billable = 0, leave = 0;
        for (const sid of siblingIds) {
          const h = hoursByPerson.get(sid);
          if (h) { total += h.total; billable += h.billable; leave += h.leave; }
        }

        // Track which calendar days have been counted (excluding parental leave)
        const countedDays = new Set<string>();
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        let personWorkingDays = 0;
        for (const d of days) {
          if (isWeekend(d)) continue;
          if (isOnParentalLeave(d, leaveIntervals)) continue;
          countedDays.add(d.toISOString().slice(0, 10));
          personWorkingDays++;
        }

        const overallEnd2 = person.overall_end_date ? new Date(person.overall_end_date) : null;
        const hasEnded = overallEnd2 ? overallEnd2 < new Date() : false;

        deduped.set(dedupKey, {
          id: person.id,
          personIds: [person.id],
          name: person.name,
          team: person.team || "Unassigned",
          role: role?.name || "Unknown",
          roleHistory: role?.name ? [{ name: role.name, start: person.employment_start_date ? new Date(person.employment_start_date) : null }] : [],
          expectedTotalHours: personWorkingDays * HOURS_PER_DAY,
          expectedBillableHours: personWorkingDays * billableCapacityHrs,
          actualHours: total,
          billableHours: billable,
          leaveHours: leave,
          hoursSet: true,
          countedDays,
          hasEnded,
        });
      }
    }

    // Convert to the expected Map<string, ...> format keyed by first person ID
    const map = new Map<string, {
      id: string; name: string; team: string; role: string;
      expectedTotalHours: number; expectedBillableHours: number;
      actualHours: number; billableHours: number; leaveHours: number;
      hasEnded: boolean;
    }>();
    for (const entry of deduped.values()) {
      // Build role display from roleHistory: sort by employment_start_date,
      // dedupe consecutive duplicates, join with " → "
      const sortedHistory = [...entry.roleHistory].sort((a, b) => {
        const ta = a.start ? a.start.getTime() : 0;
        const tb = b.start ? b.start.getTime() : 0;
        return ta - tb;
      });
      const uniqueRoles: string[] = [];
      for (const r of sortedHistory) {
        if (uniqueRoles[uniqueRoles.length - 1] !== r.name) uniqueRoles.push(r.name);
      }
      const displayRole = uniqueRoles.length > 0 ? uniqueRoles.join(" → ") : entry.role;

      map.set(entry.id, {
        id: entry.id,
        name: entry.name,
        team: entry.team,
        role: displayRole,
        expectedTotalHours: entry.expectedTotalHours,
        expectedBillableHours: entry.expectedBillableHours,
        actualHours: entry.actualHours,
        billableHours: entry.billableHours,
        leaveHours: entry.leaveHours,
        hasEnded: entry.hasEnded,
      });
    }
    return map;
  }, [people, hoursByPerson, startDate, endDate, officeFilter, parentalLeaveMap]);

  // Team summaries computed directly from lightweight summaries
  const teamSummaries = useMemo(() => {
    const teamMap = new Map<string, {
      team: string; count: number;
      totalExpected: number; totalExpectedBillable: number;
      totalActual: number; totalBillable: number; totalLeave: number;
      sumCappedCompleteness: number;
    }>();

    for (const p of personSummaries.values()) {
      if (!showFormer && p.hasEnded) continue;
      let t = teamMap.get(p.team);
      if (!t) {
        t = { team: p.team, count: 0, totalExpected: 0, totalExpectedBillable: 0, totalActual: 0, totalBillable: 0, totalLeave: 0, sumCappedCompleteness: 0 };
        teamMap.set(p.team, t);
      }
      t.count++;
      t.totalExpected += p.expectedTotalHours;
      t.totalExpectedBillable += p.expectedBillableHours;
      t.totalActual += p.actualHours;
      t.totalBillable += p.billableHours;
      t.totalLeave += p.leaveHours;
      // Cap each individual's completeness at 100% before summing for team average
      const individualCompleteness = p.expectedTotalHours > 0 ? Math.min((p.actualHours / p.expectedTotalHours) * 100, 100) : 0;
      t.sumCappedCompleteness += individualCompleteness;
    }

    return Array.from(teamMap.values())
      .sort((a, b) => a.team.localeCompare(b.team))
      .map(t => {
        const totalWorking = t.totalActual - t.totalLeave;
        return {
          ...t,
          completeness: t.count > 0 ? t.sumCappedCompleteness / t.count : 0,
          utilisation: totalWorking > 0 ? (t.totalBillable / totalWorking) * 100 : 0,
          expectedUtilisation: t.totalExpected > 0 ? (t.totalExpectedBillable / t.totalExpected) * 100 : 0,
        };
      });
  }, [personSummaries, showFormer]);

  // Only compute person rows for expanded teams (deferred)
  const getTeamMembers = (team: string) => {
    const members: any[] = [];
    for (const p of personSummaries.values()) {
      if (p.team !== team) continue;
      if (!showFormer && p.hasEnded) continue;
      const workingHours = p.actualHours - p.leaveHours;
      members.push({
        ...p,
        completeness: p.expectedTotalHours > 0 ? Math.min((p.actualHours / p.expectedTotalHours) * 100, 100) : 0,
        utilisation: workingHours > 0 ? (p.billableHours / workingHours) * 100 : 0,
        expectedUtilisation: p.expectedTotalHours > 0 ? (p.expectedBillableHours / p.expectedTotalHours) * 100 : 0,
      });
    }
    return members.sort((a, b) => a.completeness - b.completeness);
  };

  const completenessChartData = useMemo(() =>
    [...teamSummaries].sort((a, b) => a.completeness - b.completeness),
    [teamSummaries]
  );

  const utilisationChartData = useMemo(() =>
    [...teamSummaries].sort((a, b) => a.utilisation - b.utilisation),
    [teamSummaries]
  );

  const getCompletenessColor = (val: number) =>
    val >= 95 ? "hsl(142, 71%, 45%)" : val >= 90 ? "hsl(0, 72%, 70%)" : "hsl(0, 72%, 55%)";

  const getUtilisationColor = (val: number, expected: number) =>
    val >= expected - 5 ? "hsl(142, 71%, 45%)" : val >= expected - 10 ? "hsl(0, 72%, 70%)" : "hsl(0, 72%, 55%)";

  const toggleTeam = (team: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  };

  const totalPeople = teamSummaries.reduce((s, t) => s + t.count, 0);
  const overallExpected = teamSummaries.reduce((s, t) => s + t.totalExpected, 0);
  const overallExpectedBillable = teamSummaries.reduce((s, t) => s + t.totalExpectedBillable, 0);
  const overallActual = teamSummaries.reduce((s, t) => s + t.totalActual, 0);
  const overallBillable = teamSummaries.reduce((s, t) => s + t.totalBillable, 0);
  const overallLeave = teamSummaries.reduce((s, t) => s + t.totalLeave, 0);
  const overallWorking = overallActual - overallLeave;
  const overallSumCappedCompleteness = teamSummaries.reduce((s, t) => s + t.sumCappedCompleteness, 0);
  const overallCompleteness = totalPeople > 0 ? overallSumCappedCompleteness / totalPeople : 0;
  const overallUtilisation = overallWorking > 0 ? (overallBillable / overallWorking) * 100 : 0;
  const overallExpectedUtilisation = overallExpected > 0 ? (overallExpectedBillable / overallExpected) * 100 : 0;

  // Push data to analytics context
  const { setPageData } = useAnalyticsContext();
  useEffect(() => {
    if (teamSummaries.length === 0) return;
    const teamData = teamSummaries.map(t => ({
      team: t.team,
      headcount: t.count,
      expectedHours: Math.round(t.totalExpected),
      actualHours: Math.round(t.totalActual),
      billableHours: Math.round(t.totalBillable),
      leaveHours: Math.round(t.totalLeave),
      completeness: Math.round(t.completeness),
      utilisation: Math.round(t.utilisation),
      benchmarkUtilisation: Math.round(t.expectedUtilisation),
    }));

    // Build per-person summary for bottom performers
    const personData: Array<{ name: string; team: string; role: string; completeness: number; utilisation: number; actualHours: number; expectedHours: number }> = [];
    for (const p of personSummaries.values()) {
      if (!showFormer && p.hasEnded) continue;
      const workingHours = p.actualHours - p.leaveHours;
      personData.push({
        name: p.name,
        team: p.team,
        role: p.role,
        completeness: Math.round(p.expectedTotalHours > 0 ? Math.min((p.actualHours / p.expectedTotalHours) * 100, 100) : 0),
        utilisation: Math.round(workingHours > 0 ? (p.billableHours / workingHours) * 100 : 0),
        actualHours: Math.round(p.actualHours),
        expectedHours: Math.round(p.expectedTotalHours),
      });
    }
    // Sort by completeness ascending (worst first), limit to 30
    personData.sort((a, b) => a.completeness - b.completeness);

    setPageData("Time & Utilisation – Summary", {
      filters: { office: officeFilter, showFormer, period: `${format(startDate, "dd MMM yyyy")} – ${format(endDate, "dd MMM yyyy")}`, workingDays: workingDaysInPeriod },
      overallMetrics: {
        headcount: totalPeople,
        expectedHours: Math.round(overallExpected),
        actualHours: Math.round(overallActual),
        billableHours: Math.round(overallBillable),
        leaveHours: Math.round(overallLeave),
        completeness: Math.round(overallCompleteness),
        utilisation: Math.round(overallUtilisation),
        benchmarkUtilisation: Math.round(overallExpectedUtilisation),
      },
      teamBreakdown: teamData,
      people: personData.slice(0, 30),
    });
  }, [teamSummaries, personSummaries, officeFilter, showFormer, startDate, endDate, workingDaysInPeriod, totalPeople, overallExpected, overallActual, overallBillable, overallLeave, overallCompleteness, overallUtilisation, overallExpectedUtilisation]);

  // Build flat person list for reminders (current view filters: office + showFormer applied via personSummaries)
  const reminderPeople = useMemo(() => {
    const out: Array<{ name: string; completeness: number; actualHours: number; expectedHours: number }> = [];
    for (const p of personSummaries.values()) {
      if (!showFormer && p.hasEnded) continue;
      const completeness = p.expectedTotalHours > 0 ? Math.min((p.actualHours / p.expectedTotalHours) * 100, 100) : 0;
      out.push({ name: p.name, completeness, actualHours: p.actualHours, expectedHours: p.expectedTotalHours });
    }
    return out;
  }, [personSummaries, showFormer]);

  return (
    <div className="space-y-6">


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">People</p>
            <p className="text-2xl font-display font-bold">{totalPeople}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Hours Logged</p>
            <p className="text-2xl font-display font-bold">{fmt(overallActual)}h</p>
            <p className="text-xs text-muted-foreground">of {fmt(overallExpected)}h expected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completeness</p>
            <p className="text-2xl font-display font-bold">
              <span className={cn("px-2 py-0.5 rounded", overallCompleteness >= 95 ? "bg-green-100 text-green-900" : overallCompleteness >= 90 ? "bg-red-100 text-red-800" : "bg-red-200 text-red-900")}>
                {fmt(overallCompleteness)}%
              </span>
            </p>
            <Progress value={overallCompleteness} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Utilisation</p>
            <p className="text-2xl font-display font-bold">
              <span className={cn("px-2 py-0.5 rounded", overallUtilisation >= overallExpectedUtilisation - 5 ? "bg-green-100 text-green-900" : overallUtilisation >= overallExpectedUtilisation - 10 ? "bg-red-100 text-red-800" : "bg-red-200 text-red-900")}>
                {fmt(overallUtilisation)}%
              </span>
              {" "}
              <span className="text-base font-normal text-muted-foreground">/ {fmt(overallExpectedUtilisation)}%</span>
            </p>
            <p className="text-xs text-muted-foreground">{fmt(overallBillable)}h billable of {fmt(overallWorking)}h worked</p>
          </CardContent>
        </Card>
      </div>

      {/* Completeness & Utilisation Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Completeness by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completenessChartData} margin={{ top: 24, right: 30, bottom: 60, left: 10 }}>
                  <XAxis type="category" dataKey="team" tickLine={false} interval={0} height={70} tick={({ x, y, payload }: any) => {
                    const words = (payload.value as string).split(/\s+/);
                    const mid = Math.ceil(words.length / 2);
                    const lines = words.length <= 1 ? [words.join(' ')] : [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
                    return (
                      <g transform={`translate(${x},${y + 6})`}>
                        <text transform="rotate(-30)" textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">
                          {lines.map((line: string, i: number) => (
                            <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>{line}</tspan>
                          ))}
                        </text>
                      </g>
                    );
                  }} />
                  <YAxis type="number" domain={[0, 100]} hide />
                  <Tooltip formatter={(v: number) => [`${fmt(v)}%`, "Completeness"]} />
                  
                  <Bar dataKey="completeness" radius={[4, 4, 0, 0]} barSize={32}>
                    {completenessChartData.map((entry, i) => (
                      <Cell key={i} fill={getCompletenessColor(entry.completeness)} />
                    ))}
                    <LabelList dataKey="completeness" position="top" formatter={(v: number) => `${fmt(v)}%`} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Utilisation by Team</CardTitle>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-border" />
                <span className="text-xs text-muted-foreground">Benchmark</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilisationChartData} margin={{ top: 24, right: 30, bottom: 60, left: 10 }}>
                  <XAxis type="category" dataKey="team" tickLine={false} interval={0} height={70} tick={({ x, y, payload }: any) => {
                    const words = (payload.value as string).split(/\s+/);
                    // Split into max 2 lines
                    const mid = Math.ceil(words.length / 2);
                    const lines = words.length <= 1 ? [words.join(' ')] : [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
                    return (
                      <g transform={`translate(${x},${y + 6})`}>
                        <text transform="rotate(-30)" textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">
                          {lines.map((line: string, i: number) => (
                            <tspan key={i} x={0} dy={i === 0 ? 0 : 12}>{line}</tspan>
                          ))}
                        </text>
                      </g>
                    );
                  }} />
                  <YAxis type="number" domain={[0, 100]} hide />
                  <Tooltip formatter={(v: number, name: string) => [`${fmt(v)}%`, name === "expectedUtilisation" ? "Benchmark" : "Actual"]} />
                  <Bar dataKey="utilisation" radius={[4, 4, 0, 0]} barSize={16} name="Actual">
                    {utilisationChartData.map((entry, i) => (
                      <Cell key={i} fill={getUtilisationColor(entry.utilisation, entry.expectedUtilisation)} />
                    ))}
                    <LabelList dataKey="utilisation" position="top" formatter={(v: number) => `${fmt(v)}%`} style={{ fontSize: 9, fontWeight: 600, fill: "hsl(var(--foreground))" }} />
                  </Bar>
                  <Bar dataKey="expectedUtilisation" radius={[4, 4, 0, 0]} barSize={16} fill="hsl(var(--border))" name="Benchmark">
                    <LabelList dataKey="expectedUtilisation" position="top" formatter={(v: number) => `${fmt(v)}%`} style={{ fontSize: 9, fontWeight: 500, fill: "hsl(var(--muted-foreground))" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Charts */}
      <TrendCharts startDate={startDate} endDate={endDate} officeFilter={officeFilter} showFormer={showFormer} />

      {/* Team & Person Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">By Team & Person</CardTitle>
          <div className="flex items-center gap-2">
            <SendRemindersDialog people={reminderPeople} startDate={startDate} endDate={endDate} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows: string[] = ["Name,Role,Team,Actual Utilisation %,Benchmark Utilisation %"];
                const csvEscape = (v: string) => {
                  const s = String(v ?? "");
                  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                };
                for (const t of teamSummaries) {
                  for (const m of getTeamMembers(t.team)) {
                    rows.push([
                      csvEscape(m.name),
                      csvEscape(m.role),
                      csvEscape(m.team),
                      Math.round(m.utilisation),
                      Math.round(m.expectedUtilisation),
                    ].join(","));
                  }
                }
                const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `utilisation_${officeFilter}_${showFormer ? "all" : "current"}_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Expected (h)</TableHead>
                <TableHead className="text-right">Actual (h)</TableHead>
                <TableHead className="text-right">Billable (h)</TableHead>
                <TableHead className="w-[140px] pl-6">Completeness</TableHead>
                <TableHead className="w-[120px]">Utilisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamSummaries.map(({ team, totalExpected, totalActual, totalBillable, completeness, utilisation, expectedUtilisation, count }) => {
                const isExpanded = expandedTeams.has(team);
                return (
                  <>
                    <TableRow
                      key={`team-${team}`}
                      className="bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleTeam(team)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {team}
                          <span className="text-xs text-muted-foreground">({count})</span>
                        </div>
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-medium">{fmt(totalExpected)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(totalActual)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(totalBillable)}</TableCell>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <Progress value={completeness} className="h-2 w-16 shrink-0" />
                          <span className={cn("text-sm font-medium px-1.5 py-0.5 rounded", completeness >= 95 ? "bg-green-100 text-green-900" : completeness >= 90 ? "bg-red-100 text-red-800" : "bg-red-200 text-red-900")}>
                            {fmt(completeness)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm font-medium px-1.5 py-0.5 rounded", utilisation >= expectedUtilisation - 5 ? "bg-green-100 text-green-900" : utilisation >= expectedUtilisation - 10 ? "bg-red-100 text-red-800" : "bg-red-200 text-red-900")}>
                          {fmt(utilisation)}%
                        </span>
                        <span className="text-sm text-muted-foreground"> / {fmt(expectedUtilisation)}%</span>
                      </TableCell>
                    </TableRow>
                    {isExpanded &&
                      getTeamMembers(team).map((m: any) => (
                        <TableRow key={m.id} className="cursor-pointer hover:bg-muted/30" onClick={(e) => {
                          e.stopPropagation();
                          // Use overall bounds across all records for this person name
                          const allRecords = people.filter((p: any) => p.name === m.name);
                          const allIds = allRecords.map((p: any) => p.id);
                          let earliestStart: string | null = null;
                          let latestEnd: string | null = null;
                          for (const rec of allRecords) {
                            const s = rec.overall_start_date || rec.employment_start_date;
                            const e2 = rec.overall_end_date || rec.employment_end_date;
                            if (s && (!earliestStart || s < earliestStart)) earliestStart = s;
                            if (e2 && (!latestEnd || e2 > latestEnd)) latestEnd = e2;
                          }
                          setSelectedPerson({
                            id: m.id, personIds: allIds, name: m.name, role: m.role,
                            actualHours: m.actualHours, expectedHours: m.expectedTotalHours,
                            empStart: earliestStart,
                            empEnd: latestEnd,
                          });
                        }}>
                          <TableCell className="pl-10">
                            {m.name}
                            {m.hasEnded && <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">Former</Badge>}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{m.role}</TableCell>
                          <TableCell className="text-right">{fmt(m.expectedTotalHours)}</TableCell>
                          <TableCell className="text-right">{fmt(m.actualHours)}</TableCell>
                          <TableCell className="text-right">{fmt(m.billableHours)}</TableCell>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-2">
                              <Progress value={m.completeness} className="h-2 w-16 shrink-0" />
                              <span className={cn("text-sm px-1.5 py-0.5 rounded", m.completeness >= 95 ? "bg-green-100 text-green-900" : m.completeness >= 90 ? "bg-red-100 text-red-800" : "bg-red-200 text-red-900")}>
                                {fmt(m.completeness)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("text-sm px-1.5 py-0.5 rounded", m.utilisation >= m.expectedUtilisation - 5 ? "bg-green-100 text-green-900" : m.utilisation >= m.expectedUtilisation - 10 ? "bg-red-100 text-red-800" : "bg-red-200 text-red-900")}>
                              {fmt(m.utilisation)}%
                            </span>
                            <span className="text-sm text-muted-foreground"> / {fmt(m.expectedUtilisation)}%</span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                );
              })}
              {totalPeople === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No people found for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {selectedPerson && (
        <PersonTimesheetDialog
          open={!!selectedPerson}
          onOpenChange={(open) => { if (!open) setSelectedPerson(null); }}
          personId={selectedPerson.id}
          personIds={selectedPerson.personIds}
          personName={selectedPerson.name}
          personRole={selectedPerson.role}
          startDate={startDate}
          endDate={endDate}
          employmentStart={selectedPerson.empStart}
          employmentEnd={selectedPerson.empEnd}
          actualHours={selectedPerson.actualHours}
          expectedHours={selectedPerson.expectedHours}
        />
      )}
    </div>
  );
};

export default UtilisationTab;
