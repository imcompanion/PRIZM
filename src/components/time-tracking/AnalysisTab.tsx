import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMemo, useState, useEffect } from "react";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";
import { format, eachDayOfInterval, isWeekend, eachMonthOfInterval, startOfMonth, endOfMonth, max as dateMax, min as dateMin } from "date-fns";
import { cn } from "@/lib/utils";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { buildParentalLeaveMap, isOnParentalLeave } from "@/lib/parental-leave";
import BurnVsScope from "./BurnVsScope";
import {
  type TimeEntryForClassification,
  classifyEntry,
  fetchRulesWithConditions,
  fetchProjectIdSet,
  fetchProjectsForBillability,
  BILLABILITY_PROJECTS_QUERY_KEY,
  BILLABILITY_PROJECT_IDS_QUERY_KEY,
} from "@/lib/billability";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Legend,
} from "recharts";

interface AnalysisTabProps {
  startDate: Date;
  endDate: Date;
  officeFilter: "Global" | "UK" | "US";
  showFormer: boolean;
}
const isLeaveOrClosedEntry = (notes: string | null, projectTitle?: string | null) => {
  const check = (text: string | null) => {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return lower === "leave" || lower === "sick day" || lower === "non-working day"
      || lower.includes("annual leave") || lower.includes("sick leave") || lower.includes("sick day") || lower.includes("non-working day")
      || lower.includes("parental leave") || lower.includes("maternity leave")
      || lower.includes("paternity leave") || lower.includes("compassionate leave")
      || lower.includes("bereavement leave") || lower.includes("holiday")
      || lower.startsWith("leave -") || lower.startsWith("leave:")
      || lower.startsWith("leave ") || lower === "leave"
      || lower.endsWith("leave")
      || lower.includes("bank holiday") || lower.includes("office closed");
  };
  return check(notes) || check(projectTitle);
};

const fmt = (n: number) => Math.round(n).toLocaleString();

function batchSmallSegments<T extends Record<string, any>>(
  items: T[],
  hoursKey: string,
  nameKey: string,
  pctKey: string,
): T[] {
  const significant = items.filter(i => Math.round(i[pctKey]) > 0);
  const small = items.filter(i => Math.round(i[pctKey]) === 0);
  if (small.length === 0) return items;
  const otherHours = small.reduce((s, i) => s + i[hoursKey], 0);
  const otherPct = small.reduce((s, i) => s + i[pctKey], 0);
  return [...significant, { ...({} as any), [nameKey]: "Other", [hoursKey]: otherHours, [pctKey]: otherPct } as T];
}

const renderPieLabel = (nameField: string, showPct = false) => (props: any) => {
  const { cx, cy, midAngle, outerRadius, innerRadius, pct, hours, index } = props;
  const name = props[nameField];
  const RADIAN = Math.PI / 180;
  const oRadius = outerRadius + 20;
  const ox = cx + oRadius * Math.cos(-midAngle * RADIAN);
  const oy = cy + oRadius * Math.sin(-midAngle * RADIAN);
  const midRadius = (innerRadius + outerRadius) / 2;
  const ix = cx + midRadius * Math.cos(-midAngle * RADIAN);
  const iy = cy + midRadius * Math.sin(-midAngle * RADIAN);
  const showInner = index < 5;
  return (
    <g>
      <text x={ox} y={oy} textAnchor={ox > cx ? "start" : "end"} dominantBaseline="central" fontSize={10} fill="hsl(var(--muted-foreground))">
        {name}{showPct ? ` (${Math.round(pct)}%)` : ""}
      </text>
      {showInner && (
        <text x={ix} y={iy} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={600} fill="white">
          {Math.round(hours).toLocaleString()}h
        </text>
      )}
    </g>
  );
};

const PIE_COLORS = [
  "hsl(215, 60%, 55%)", "hsl(150, 50%, 45%)", "hsl(35, 80%, 55%)", "hsl(350, 60%, 55%)",
  "hsl(270, 50%, 55%)", "hsl(180, 50%, 45%)", "hsl(45, 70%, 50%)", "hsl(320, 50%, 55%)",
  "hsl(195, 60%, 50%)", "hsl(100, 45%, 45%)", "hsl(10, 65%, 55%)", "hsl(240, 45%, 55%)",
  "hsl(60, 55%, 48%)", "hsl(290, 40%, 50%)", "hsl(165, 55%, 42%)", "hsl(25, 70%, 52%)",
];
const PIE_COLORS_2 = [
  "hsl(200, 55%, 50%)", "hsl(140, 50%, 42%)", "hsl(30, 75%, 52%)", "hsl(340, 55%, 52%)",
  "hsl(260, 45%, 52%)", "hsl(170, 50%, 42%)", "hsl(50, 65%, 48%)", "hsl(310, 45%, 52%)",
];
const PIE_COLORS_3 = [
  "hsl(220, 50%, 58%)", "hsl(155, 45%, 48%)", "hsl(40, 70%, 55%)", "hsl(355, 55%, 58%)",
  "hsl(275, 42%, 55%)", "hsl(185, 48%, 48%)", "hsl(55, 60%, 50%)", "hsl(325, 42%, 55%)",
  "hsl(205, 52%, 52%)", "hsl(110, 42%, 48%)", "hsl(15, 60%, 55%)", "hsl(245, 40%, 55%)",
];

const AnalysisTab = ({ startDate, endDate, officeFilter, showFormer }: AnalysisTabProps) => {
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

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["time_entries_utilisation", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("id, person_id, hours, date, notes, project_id, project_name, projects(title, opportunity_record_type, revenue, stage, office, opportunity_number)")
          .gte("date", startStr)
          .lte("date", endStr)
          .order("id")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = allData.concat(data);
        hasMore = data.length === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      return allData as Array<{
        id: string;
        person_id: string;
        hours: number;
        date: string;
        notes: string | null;
        project_id: string | null;
        project_name: string | null;
        projects: { title: string; opportunity_record_type: string | null; revenue: number | null; stage: string | null; office: string | null; opportunity_number: string | null } | null;
      }>;
    },
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["billability_rules_full"],
    queryFn: fetchRulesWithConditions,
  });

  const { data: projectIdsRaw = [] } = useQuery({
    queryKey: BILLABILITY_PROJECT_IDS_QUERY_KEY,
    queryFn: fetchProjectIdSet,
  });
  const projectIds = useMemo(() => new Set(Array.isArray(projectIdsRaw) ? projectIdsRaw : []), [projectIdsRaw]);

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
      return allData as Array<{ person_id: string; project_id: string | null; total_hours: number; leave_hours: number }>;
    },
  });

  const { data: projectsRaw = [] } = useQuery({
    queryKey: BILLABILITY_PROJECTS_QUERY_KEY,
    queryFn: fetchProjectsForBillability,
    staleTime: 5 * 60 * 1000,
  });

  const projectsMap = useMemo(() => {
    const map = new Map<string, any>();
    const projectList = Array.isArray(projectsRaw) ? projectsRaw : [];

    for (const p of projectList) {
      if (p?.id) map.set(p.id, p);
    }
    return map;
  }, [projectsRaw]);

  // Build person lookup — only include records whose employment period overlaps the selected range.
  // Also build a per-name timeline of employment windows so each time entry can be resolved to the
  // effective record (role / team / office) that was active on the entry date, and parental-leave
  // windows can be skipped without dropping work the person did before/after leave.
  const { personMap, nameIsFormer, nameWindows, personIdToName } = useMemo(() => {
    const allowedTeams = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);
    const map = new Map<string, { name: string; team: string; office: string; role: string }>();
    // Track per-name whether ALL records have ended (i.e. person is "former")
    const nameEndedAll = new Map<string, boolean>(); // true = all ended so far

    // name -> sorted array of employment windows (covers ALL teams incl. parental leave)
    const windows = new Map<string, Array<{ start: Date; end: Date; team: string; role: string; office: string }>>();
    // id -> name (covers ALL people records so we can look up entries linked to parental-leave rows)
    const idToName = new Map<string, string>();

    for (const p of people) {
      if (p?.id && p?.name) idToName.set(p.id, p.name);

      const normName = p.name?.trim().toLowerCase();
      const winStart = p.employment_start_date ? new Date(p.employment_start_date) : null;
      const winEnd = p.employment_end_date ? new Date(p.employment_end_date) : null;
      if (normName && winStart && winEnd) {
        if (!windows.has(normName)) windows.set(normName, []);
        windows.get(normName)!.push({
          start: winStart,
          end: winEnd,
          team: (p as any).team || "Unassigned",
          role: (p as any).roles?.name || "Unknown",
          office: p.office,
        });
      }

      const team = ((p as any).team || "").toLowerCase().trim();
      if (!allowedTeams.has(team)) continue;

      const empStart = p.overall_start_date ? new Date(p.overall_start_date)
        : p.employment_start_date ? new Date(p.employment_start_date) : null;
      const empEnd = p.overall_end_date ? new Date(p.overall_end_date)
        : p.employment_end_date ? new Date(p.employment_end_date) : null;
      if (empStart && empStart > endDate) continue;
      if (empEnd && empEnd < startDate) continue;

      if (normName) {
        const thisEnded = empEnd ? empEnd < new Date() : false;
        const prev = nameEndedAll.get(normName);
        nameEndedAll.set(normName, prev === undefined ? thisEnded : (prev && thisEnded));
      }

      map.set(p.id, {
        name: p.name,
        team: (p as any).team || "Unassigned",
        office: p.office,
        role: (p as any).roles?.name || "Unknown",
      });
    }

    // sort windows ascending
    for (const arr of windows.values()) arr.sort((a, b) => a.start.getTime() - b.start.getTime());

    return { personMap: map, nameIsFormer: nameEndedAll, nameWindows: windows, personIdToName: idToName };
  }, [people, startDate, endDate]);

  const benchmarkPersonHours = useMemo(() => {
    const map = new Map<string, { total: number; billable: number; leave: number }>();

    for (const row of utilisationSummary) {
      if (!map.has(row.person_id)) map.set(row.person_id, { total: 0, billable: 0, leave: 0 });
      const rec = map.get(row.person_id)!;

      const hrs = Number(row.total_hours);
      const leaveHrs = Number(row.leave_hours);
      const nonLeaveHrs = hrs - leaveHrs;

      rec.total += hrs;
      rec.leave += leaveHrs;

      if (nonLeaveHrs > 0) {
        const proj = row.project_id ? projectsMap.get(row.project_id) : null;
        const entryForClassification: TimeEntryForClassification = {
          id: "",
          date: "",
          hours: nonLeaveHrs,
          notes: null,
          project_id: row.project_id,
          person_id: row.person_id,
          people: null,
          projects: proj || null,
        };
        const projectExists = row.project_id ? projectIds.has(row.project_id) : false;
        const { result } = classifyEntry(rules, entryForClassification, projectExists);
        if (result === "billable") {
          rec.billable += nonLeaveHrs;
        }
      }
    }

    return map;
  }, [utilisationSummary, projectsMap, rules, projectIds]);

  // Classify entries and group by team → project/rule, also track person-level
  const { teamProjectData, personIndex, roleIndex, personTotalLogged, roleTotalLogged, ruleNames, ruleProjectBreakdown, personRoleMap, roleNonBillable, benchmarkPersonIndex, benchmarkRuleProjectIndex, projectNumberMap, teamRoleProjectIndex, teamRoleLogged, personNonBillableIndex, personRuleProjectIndex, personRawTotalLogged, personLeaveLogged, personLabelMonthlyIndex } = useMemo(() => {
    const teamNonBillable = new Map<string, Map<string, number>>();
    const teamTotalLogged = new Map<string, number>();
    const personIdx = new Map<string, Map<string, number>>();
    const roleIdx = new Map<string, Map<string, number>>();
    const personTotal = new Map<string, number>();
    const roleTotal = new Map<string, number>();
    const ruleNameSet = new Set<string>();
    const ruleProjectBd = new Map<string, Map<string, number>>();
    const pRoleMap = new Map<string, string>();
    const roleNonBill = new Map<string, Map<string, number>>();
    const bmPersonIdx = new Map<string, Map<string, number>>();
    const bmRuleProjectIdx = new Map<string, Map<string, number>>();
    // Per-person non-billable label -> hours (for row drill-down)
    const personNonBillableIdx = new Map<string, Map<string, number>>();
    // Per-person rule label -> project title -> hours (for second drill-down)
    const personRuleProjectIdx = new Map<string, Map<string, Map<string, number>>>();
    // Per-person label -> yyyy-MM -> hours (for monthly distribution drill-down)
    const personLabelMonthlyIdx = new Map<string, Map<string, Map<string, number>>>();
    // Map project title → opportunity_number
    const projNumMap = new Map<string, string>();
    // team -> role -> label -> hours, and team -> role -> total logged
    const teamRoleProjectIdx = new Map<string, Map<string, Map<string, number>>>();
    const teamRoleLogged = new Map<string, Map<string, number>>();

    const allowedTeamsLower = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);

    const resolveEffective = (normName: string, date: Date) => {
      const arr = nameWindows.get(normName);
      if (!arr) return null;
      const t = date.getTime();
      for (const w of arr) {
        if (t >= w.start.getTime() && t <= w.end.getTime()) return w;
      }
      return null;
    };

    // Per-person raw totals (including leave) and leave-only totals — used purely for
    // the drill-down caption that explains the gap vs. the Summary tab.
    const personRawTotal = new Map<string, number>();
    const personLeaveTotal = new Map<string, number>();

    for (const entry of timeEntries) {
      // Resolve name (even when the entry is linked to a parental-leave row excluded from personMap)
      const linked = personMap.get(entry.person_id);
      const name = linked?.name || personIdToName.get(entry.person_id);
      if (!name) continue;
      const normName = name.trim().toLowerCase();
      if (!showFormer && nameIsFormer.get(normName)) continue;
      const hrsAll = Number(entry.hours) || 0;
      personRawTotal.set(name, (personRawTotal.get(name) || 0) + hrsAll);
      if (isLeaveOrClosedEntry(entry.notes, entry.projects?.title) || isLeaveOrClosedEntry(entry.notes, entry.project_name)) {
        personLeaveTotal.set(name, (personLeaveTotal.get(name) || 0) + hrsAll);
        continue;
      }

      // Resolve the effective employment window for this entry's date so team/role reflect
      // what the person was actually doing on that date (not just their latest record).
      const effective = resolveEffective(normName, new Date(entry.date));
      if (!effective) continue;
      const effTeamLower = effective.team.toLowerCase().trim();
      if (effTeamLower === "parental leave") continue; // skip work logged inside a parental-leave window
      if (!allowedTeamsLower.has(effTeamLower)) continue;
      if (officeFilter !== "Global" && effective.office !== officeFilter) continue;

      const person = { name, team: effective.team, role: effective.role, office: effective.office };

      const hrs = Number(entry.hours);
      const team = person.team;

      teamTotalLogged.set(team, (teamTotalLogged.get(team) || 0) + hrs);
      if (!teamRoleLogged.has(team)) teamRoleLogged.set(team, new Map());
      teamRoleLogged.get(team)!.set(person.role, (teamRoleLogged.get(team)!.get(person.role) || 0) + hrs);
      personTotal.set(person.name, (personTotal.get(person.name) || 0) + hrs);
      roleTotal.set(person.role, (roleTotal.get(person.role) || 0) + hrs);
      pRoleMap.set(person.name, person.role);

      const entryForClassification: TimeEntryForClassification = {
        id: entry.id,
        date: entry.date,
        hours: hrs,
        notes: entry.notes,
        project_id: entry.project_id,
        person_id: entry.person_id,
        people: null,
        projects: entry.projects,
      };
      const projectExists = entry.project_id ? projectIds.has(entry.project_id) : false;
      const { result, matchedRule } = classifyEntry(rules, entryForClassification, projectExists);

      if (result === "billable") continue;

      const hasOppType = !!entry.projects?.opportunity_record_type;
      let label: string;
      let isRuleLabel = false;
      if (!hasOppType) {
        label = entry.projects?.title?.trim() || entry.project_name?.trim() || "(No project)";
      } else if (matchedRule) {
        label = matchedRule.name;
        isRuleLabel = true;
        ruleNameSet.add(label);
      } else {
        label = "Unmatched";
      }

      if (!teamNonBillable.has(team)) teamNonBillable.set(team, new Map());
      teamNonBillable.get(team)!.set(label, (teamNonBillable.get(team)!.get(label) || 0) + hrs);
      if (!teamRoleProjectIdx.has(team)) teamRoleProjectIdx.set(team, new Map());
      const trMap = teamRoleProjectIdx.get(team)!;
      if (!trMap.has(person.role)) trMap.set(person.role, new Map());
      const trlMap = trMap.get(person.role)!;
      trlMap.set(label, (trlMap.get(label) || 0) + hrs);

      // Track non-billable by role
      if (!roleNonBill.has(person.role)) roleNonBill.set(person.role, new Map());
      roleNonBill.get(person.role)!.set(label, (roleNonBill.get(person.role)!.get(label) || 0) + hrs);

      const pKey = `${team}|||${label}`;
      if (!personIdx.has(pKey)) personIdx.set(pKey, new Map());
      personIdx.get(pKey)!.set(person.name, (personIdx.get(pKey)!.get(person.name) || 0) + hrs);

      if (!personNonBillableIdx.has(person.name)) personNonBillableIdx.set(person.name, new Map());
      personNonBillableIdx.get(person.name)!.set(label, (personNonBillableIdx.get(person.name)!.get(label) || 0) + hrs);

      // Per-person monthly distribution per label (for drill-down chart)
      const monthKey = (entry.date || "").slice(0, 7); // yyyy-MM
      if (monthKey) {
        if (!personLabelMonthlyIdx.has(person.name)) personLabelMonthlyIdx.set(person.name, new Map());
        const lmMap = personLabelMonthlyIdx.get(person.name)!;
        if (!lmMap.has(label)) lmMap.set(label, new Map());
        const mMap = lmMap.get(label)!;
        mMap.set(monthKey, (mMap.get(monthKey) || 0) + hrs);
      }

      if (isRuleLabel) {
        const projTitle = entry.projects?.title?.trim() || entry.project_name?.trim() || "(No project)";
        if (!personRuleProjectIdx.has(person.name)) personRuleProjectIdx.set(person.name, new Map());
        const prMap = personRuleProjectIdx.get(person.name)!;
        if (!prMap.has(label)) prMap.set(label, new Map());
        const ppMap = prMap.get(label)!;
        ppMap.set(projTitle, (ppMap.get(projTitle) || 0) + hrs);
      }

      if (!roleIdx.has(pKey)) roleIdx.set(pKey, new Map());
      roleIdx.get(pKey)!.set(person.role, (roleIdx.get(pKey)!.get(person.role) || 0) + hrs);

      // Track project breakdown for rule-aggregated labels + project numbers
      if (isRuleLabel) {
        const projTitle = entry.projects?.title?.trim() || "(No project)";
        if (!ruleProjectBd.has(label)) ruleProjectBd.set(label, new Map());
        const rpMap = ruleProjectBd.get(label)!;
        rpMap.set(projTitle, (rpMap.get(projTitle) || 0) + hrs);
        if (entry.projects?.opportunity_number) {
          projNumMap.set(projTitle, entry.projects.opportunity_number);
        }
      }

      // Benchmark drilldown level 2 indices
      // By team
      const teamBmKey = `team:${team}|||${label}`;
      if (isRuleLabel) {
        const projTitle = entry.projects?.title?.trim() || "(No project)";
        if (!bmRuleProjectIdx.has(teamBmKey)) bmRuleProjectIdx.set(teamBmKey, new Map());
        bmRuleProjectIdx.get(teamBmKey)!.set(projTitle, (bmRuleProjectIdx.get(teamBmKey)!.get(projTitle) || 0) + hrs);
      } else {
        if (!bmPersonIdx.has(teamBmKey)) bmPersonIdx.set(teamBmKey, new Map());
        bmPersonIdx.get(teamBmKey)!.set(person.name, (bmPersonIdx.get(teamBmKey)!.get(person.name) || 0) + hrs);
      }
      // By role
      const roleBmKey = `role:${person.role}|||${label}`;
      if (isRuleLabel) {
        const projTitle = entry.projects?.title?.trim() || "(No project)";
        if (!bmRuleProjectIdx.has(roleBmKey)) bmRuleProjectIdx.set(roleBmKey, new Map());
        bmRuleProjectIdx.get(roleBmKey)!.set(projTitle, (bmRuleProjectIdx.get(roleBmKey)!.get(projTitle) || 0) + hrs);
      } else {
        if (!bmPersonIdx.has(roleBmKey)) bmPersonIdx.set(roleBmKey, new Map());
        bmPersonIdx.get(roleBmKey)!.set(person.name, (bmPersonIdx.get(roleBmKey)!.get(person.name) || 0) + hrs);
      }
    }

    const result: Array<{
      team: string;
      totalHours: number;
      teamLoggedHours: number;
      projects: Array<{ project: string; hours: number; pct: number }>;
    }> = [];

    for (const [team, projectMap] of teamNonBillable) {
      const teamLogged = teamTotalLogged.get(team) || 0;
      const projects = Array.from(projectMap.entries())
        .map(([project, hours]) => ({ project, hours, pct: teamLogged > 0 ? (hours / teamLogged) * 100 : 0 }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 15);

      const totalHours = projects.reduce((s, p) => s + p.hours, 0);
      result.push({ team, totalHours, teamLoggedHours: teamLogged, projects });
    }

    return {
      teamProjectData: result.sort((a, b) => b.totalHours - a.totalHours),
      personIndex: personIdx,
      roleIndex: roleIdx,
      personTotalLogged: personTotal,
      roleTotalLogged: roleTotal,
      ruleNames: ruleNameSet,
      ruleProjectBreakdown: ruleProjectBd,
      personRoleMap: pRoleMap,
      roleNonBillable: roleNonBill,
      benchmarkPersonIndex: bmPersonIdx,
      benchmarkRuleProjectIndex: bmRuleProjectIdx,
      projectNumberMap: projNumMap,
      teamRoleProjectIndex: teamRoleProjectIdx,
      teamRoleLogged,
      personNonBillableIndex: personNonBillableIdx,
      personRuleProjectIndex: personRuleProjectIdx,
      personRawTotalLogged: personRawTotal,
      personLeaveLogged: personLeaveTotal,
      personLabelMonthlyIndex: personLabelMonthlyIdx,
    };
  }, [timeEntries, personMap, personIdToName, nameWindows, nameIsFormer, showFormer, officeFilter, rules, projectIds]);

  const totalNonBillable = teamProjectData.reduce((s, t) => s + t.totalHours, 0);
  const totalLoggedHours = teamProjectData.reduce((s, t) => s + t.teamLoggedHours, 0);

  // Aggregate across all teams for total-level chart
  const totalProjectData = useMemo(() => {
    const agg = new Map<string, number>();
    for (const { projects } of teamProjectData) {
      for (const { project, hours } of projects) {
        agg.set(project, (agg.get(project) || 0) + hours);
      }
    }
    const all = Array.from(agg.entries())
      .map(([project, hours]) => ({ project, hours, pct: totalLoggedHours > 0 ? (hours / totalLoggedHours) * 100 : 0 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 20);
    return batchSmallSegments(all, "hours", "project", "pct");
  }, [teamProjectData, totalLoggedHours]);

  // Push data to analytics context
  const { setPageData } = useAnalyticsContext();
  useEffect(() => {
    if (teamProjectData.length === 0) return;
    const nonBillableByTeam = teamProjectData.map(t => ({
      team: t.team,
      totalLoggedHours: Math.round(t.teamLoggedHours),
      nonBillableHours: Math.round(t.totalHours),
      nonBillablePct: t.teamLoggedHours > 0 ? Math.round((t.totalHours / t.teamLoggedHours) * 100) : 0,
      topCategories: t.projects.slice(0, 8).map(p => ({
        category: p.project,
        hours: Math.round(p.hours),
        pctOfTeamTotal: Math.round(p.pct),
      })),
    }));
    const overallNonBillable = totalProjectData.slice(0, 15).map(p => ({
      category: p.project,
      hours: Math.round(p.hours),
      pctOfTotal: Math.round(p.pct),
    }));
    setPageData("Time & Utilisation – Analysis", {
      filters: { office: officeFilter, showFormer, period: `${format(startDate, "yyyy-MM-dd")} – ${format(endDate, "yyyy-MM-dd")}` },
      overallMetrics: {
        totalLoggedHours: Math.round(totalLoggedHours),
        totalNonBillableHours: Math.round(totalNonBillable),
        nonBillablePct: totalLoggedHours > 0 ? Math.round((totalNonBillable / totalLoggedHours) * 100) : 0,
      },
      nonBillableByTeam,
      overallNonBillableBreakdown: overallNonBillable,
    });
  }, [teamProjectData, totalProjectData, totalLoggedHours, totalNonBillable, officeFilter, showFormer, startDate, endDate]);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedDetailTeam, setSelectedDetailTeam] = useState<string | null>(null);
  const [selectedDetailProject, setSelectedDetailProject] = useState<string | null>(null);
  const [selectedDetailRoles, setSelectedDetailRoles] = useState<string[]>([]);
  const [drilldownGroupBy, setDrilldownGroupBy] = useState<"person" | "role">("person");
  const [detailGroupBy, setDetailGroupBy] = useState<"person" | "role" | "project">("person");

  // Whether the selected team-detail bar is a rule-aggregated label (e.g. "Unpaid Client Work")
  const isDetailRuleBar = selectedDetailProject ? ruleNames.has(selectedDetailProject) : false;

  // If user switches bars and the new one isn't a rule, fall back from "project" to "person"
  useEffect(() => {
    if (detailGroupBy === "project" && !isDetailRuleBar) {
      setDetailGroupBy("person");
    }
  }, [detailGroupBy, isDetailRuleBar]);

  // Roles available for the currently selected detail team
  const availableDetailRoles = useMemo(() => {
    if (!selectedDetailTeam) return [] as string[];
    const roles = new Set<string>();
    const rmap = teamRoleProjectIndex.get(selectedDetailTeam);
    const loggedMap = teamRoleLogged.get(selectedDetailTeam);
    rmap?.forEach((_, role) => roles.add(role));
    loggedMap?.forEach((_, role) => roles.add(role));
    return Array.from(roles).sort();
  }, [selectedDetailTeam, teamRoleProjectIndex, teamRoleLogged]);

  // Detail data for a selected team, optionally filtered by selected roles (aggregated)
  const detailTeamData = useMemo(() => {
    if (!selectedDetailTeam) return null;
    const base = teamProjectData.find(t => t.team === selectedDetailTeam) || null;
    if (!base) return null;
    if (selectedDetailRoles.length === 0) return base;
    const rmap = teamRoleProjectIndex.get(selectedDetailTeam);
    const rlMap = teamRoleLogged.get(selectedDetailTeam);
    if (!rmap || !rlMap) return base;
    const aggLabels = new Map<string, number>();
    let aggLogged = 0;
    for (const role of selectedDetailRoles) {
      aggLogged += rlMap.get(role) || 0;
      const lblMap = rmap.get(role);
      if (!lblMap) continue;
      for (const [label, hrs] of lblMap) {
        aggLabels.set(label, (aggLabels.get(label) || 0) + hrs);
      }
    }
    const projects = Array.from(aggLabels.entries())
      .map(([project, hours]) => ({ project, hours, pct: aggLogged > 0 ? (hours / aggLogged) * 100 : 0 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 15);
    const totalHours = projects.reduce((s, p) => s + p.hours, 0);
    return { team: selectedDetailTeam, totalHours, teamLoggedHours: aggLogged, projects };
  }, [selectedDetailTeam, selectedDetailRoles, teamProjectData, teamRoleProjectIndex, teamRoleLogged]);

  // Person/Role/Project breakdown for team detail chart
  const detailPersonBreakdown = useMemo(() => {
    if (!selectedDetailTeam || !selectedDetailProject) return [];
    if (detailGroupBy === "project") {
      // Only meaningful for rule-aggregated bars; show projects driving the rule for this team
      const bmKey = `team:${selectedDetailTeam}|||${selectedDetailProject}`;
      const pMap = benchmarkRuleProjectIndex.get(bmKey);
      if (!pMap) return [];
      const teamLogged = detailTeamData?.teamLoggedHours || 0;
      return Array.from(pMap.entries())
        .map(([name, hours]) => ({ name, hours, pct: teamLogged > 0 ? (hours / teamLogged) * 100 : 0, role: "" }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 20);
    }
    const pKey = `${selectedDetailTeam}|||${selectedDetailProject}`;
    const idx = detailGroupBy === "role" ? roleIndex : personIndex;
    const totals = detailGroupBy === "role" ? roleTotalLogged : personTotalLogged;
    const pMap = idx.get(pKey);
    if (!pMap) return [];
    const roleFilter = selectedDetailRoles.length > 0 ? new Set(selectedDetailRoles) : null;
    return Array.from(pMap.entries())
      .filter(([name]) => {
        if (!roleFilter) return true;
        if (detailGroupBy === "role") return roleFilter.has(name);
        return roleFilter.has(personRoleMap.get(name) || "");
      })
      .map(([name, hours]) => {
        const pTotal = totals.get(name) || 0;
        const role = detailGroupBy === "person" ? (personRoleMap.get(name) || "") : "";
        return { name, hours, pct: pTotal > 0 ? (hours / pTotal) * 100 : 0, role };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 20);
  }, [selectedDetailTeam, selectedDetailProject, selectedDetailRoles, personIndex, roleIndex, personTotalLogged, roleTotalLogged, detailGroupBy, benchmarkRuleProjectIndex, personRoleMap, detailTeamData]);

  const isRuleBar = selectedProject ? ruleNames.has(selectedProject) : false;

  // Team breakdown for selected project (non-rule bars)
  const teamBreakdown = useMemo(() => {
    if (!selectedProject || isRuleBar) return [];
    const teams: Array<{ team: string; hours: number; pct: number }> = [];
    for (const { team, teamLoggedHours, projects } of teamProjectData) {
      const match = projects.find(p => p.project === selectedProject);
      if (match) {
        teams.push({
          team,
          hours: match.hours,
          pct: teamLoggedHours > 0 ? (match.hours / teamLoggedHours) * 100 : 0,
        });
      }
    }
    return batchSmallSegments(teams.sort((a, b) => b.pct - a.pct), "hours", "team", "pct");
  }, [selectedProject, teamProjectData, isRuleBar]);

  // Project breakdown for selected rule bar
  const ruleProjectData = useMemo(() => {
    if (!selectedProject || !isRuleBar) return [];
    const pMap = ruleProjectBreakdown.get(selectedProject);
    if (!pMap) return [];
    const all = Array.from(pMap.entries())
      .map(([project, hours]) => ({ project, hours, pct: totalLoggedHours > 0 ? (hours / totalLoggedHours) * 100 : 0 }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 20);
    return batchSmallSegments(all, "hours", "project", "pct");
  }, [selectedProject, isRuleBar, ruleProjectBreakdown, totalLoggedHours]);

  // Person/Role breakdown — pct = hours on this project / person's or role's total logged hours (excl. leave)
  const personBreakdown = useMemo(() => {
    if (!selectedProject || !selectedTeam) return [];
    const pKey = `${selectedTeam}|||${selectedProject}`;
    const idx = drilldownGroupBy === "role" ? roleIndex : personIndex;
    const totals = drilldownGroupBy === "role" ? roleTotalLogged : personTotalLogged;
    const pMap = idx.get(pKey);
    if (!pMap) return [];
    const all = Array.from(pMap.entries())
      .map(([name, hours]) => {
        const total = totals.get(name) || 0;
        const role = drilldownGroupBy === "person" ? (personRoleMap.get(name) || "") : "";
        return { name, hours, pct: total > 0 ? (hours / total) * 100 : 0, role };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 20);
    return batchSmallSegments(all, "hours", "name", "pct");
  }, [selectedProject, selectedTeam, personIndex, roleIndex, personTotalLogged, roleTotalLogged, drilldownGroupBy]);

  // Role gap summaries – top 5 roles furthest below their utilisation benchmark
  const allRoleStats = useMemo(() => {
    const HOURS_PER_DAY = 7.5;

    const roleMap = new Map<string, {
      role: string; totalWorking: number; totalBillable: number;
      totalExpected: number; totalExpectedBillable: number; count: number;
    }>();

    const allowedTeams = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);
    const filtered = people.filter((p: any) => {
      if (officeFilter !== "Global" && p.office !== officeFilter) return false;
      const team = (p.team || "").toLowerCase().trim();
      return allowedTeams.has(team);
    });

    // Build name -> all IDs mapping for sibling aggregation
    const nameToIds = new Map<string, string[]>();
    for (const p of filtered) {
      const normName = p.name.trim().toLowerCase();
      if (!nameToIds.has(normName)) nameToIds.set(normName, []);
      nameToIds.get(normName)!.push(p.id);
    }

    const personHours = benchmarkPersonHours;

    // Deduplicate by name+role
    const deduped = new Map<string, {
      roleName: string; billableCapacity: number;
      countedDays: Set<string>;
      totalActual: number; billableActual: number; leaveActual: number;
      hasEnded: boolean;
    }>();

    for (const person of filtered) {
      const role = (person as any).roles;
      const roleName = role?.name || "Unknown";
      const billableCapacity = role?.billable_capacity_hours ?? HOURS_PER_DAY;
      const empStart = person.employment_start_date ? new Date(person.employment_start_date)
        : person.overall_start_date ? new Date(person.overall_start_date) : null;
      const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
        : person.overall_end_date ? new Date(person.overall_end_date) : null;
      if (empStart && empStart > endDate) continue;
      if (empEnd && empEnd < startDate) continue;

      const effectiveStart = empStart && empStart > startDate ? empStart : startDate;
      const effectiveEnd = empEnd && empEnd < endDate ? empEnd : endDate;
      if (effectiveStart > effectiveEnd) continue;

      const normName = person.name.trim().toLowerCase();
      const overallEnd = person.overall_end_date ? new Date(person.overall_end_date) : null;
      const thisEnded = overallEnd ? overallEnd < new Date() : false;
      const dedupKey = `${normName}::${roleName}`;
      const existing = deduped.get(dedupKey);

      if (existing) {
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        for (const d of days) {
          if (!isWeekend(d)) existing.countedDays.add(d.toISOString().slice(0, 10));
        }
        if (!thisEnded) existing.hasEnded = false;
      } else {
        const siblingIds = nameToIds.get(normName) || [person.id];
        let total = 0, billable = 0, leave = 0;
        for (const sid of siblingIds) {
          const h = personHours.get(sid);
          if (h) { total += h.total; billable += h.billable; leave += h.leave; }
        }
        const countedDays = new Set<string>();
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        for (const d of days) {
          if (!isWeekend(d)) countedDays.add(d.toISOString().slice(0, 10));
        }
        deduped.set(dedupKey, {
          roleName, billableCapacity, countedDays,
          totalActual: total, billableActual: billable, leaveActual: leave,
          hasEnded: thisEnded,
        });
      }
    }

    for (const entry of deduped.values()) {
      if (!showFormer && entry.hasEnded) continue;
      const workingDays = entry.countedDays.size;
      const working = entry.totalActual - entry.leaveActual;

      let r = roleMap.get(entry.roleName);
      if (!r) {
        r = { role: entry.roleName, totalWorking: 0, totalBillable: 0, totalExpected: 0, totalExpectedBillable: 0, count: 0 };
        roleMap.set(entry.roleName, r);
      }
      r.count++;
      r.totalWorking += working;
      r.totalBillable += entry.billableActual;
      r.totalExpected += workingDays * HOURS_PER_DAY;
      r.totalExpectedBillable += workingDays * entry.billableCapacity;
    }

    return Array.from(roleMap.values())
      .map(r => {
        const utilisation = r.totalWorking > 0 ? (r.totalBillable / r.totalWorking) * 100 : 0;
        const benchmark = r.totalExpected > 0 ? (r.totalExpectedBillable / r.totalExpected) * 100 : 0;
        const expectedNonBillable = 100 - benchmark;
        const actualNonBillable = 100 - utilisation;
        const gap = actualNonBillable - expectedNonBillable;
        return { ...r, utilisation, benchmark, expectedNonBillable, actualNonBillable, gap };
      })
      .filter(r => r.totalWorking > 0);
  }, [people, officeFilter, startDate, endDate, benchmarkPersonHours, showFormer]);

  const [roleChartView, setRoleChartView] = useState<"gap" | "volume" | "team">("team");

  // Team-level benchmark vs actual stats
  const teamBenchmarkData = useMemo(() => {
    const HOURS_PER_DAY = 7.5;

    const teamMap = new Map<string, {
      team: string; totalWorking: number; totalBillable: number;
      totalExpected: number; totalExpectedBillable: number; count: number;
    }>();

    const allowedTeams2 = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);
    const filtered = people.filter((p: any) => {
      if (officeFilter !== "Global" && p.office !== officeFilter) return false;
      const team = (p.team || "").toLowerCase().trim();
      return allowedTeams2.has(team);
    });

    // Build name -> all IDs mapping for sibling aggregation
    const nameToIds = new Map<string, string[]>();
    for (const p of filtered) {
      const normName = p.name.trim().toLowerCase();
      if (!nameToIds.has(normName)) nameToIds.set(normName, []);
      nameToIds.get(normName)!.push(p.id);
    }

    const personHours = benchmarkPersonHours;

    // Deduplicate by name+team with per-day expected-hour accumulation (same as Utilisation tab)
    const deduped = new Map<string, {
      team: string;
      countedDays: Set<string>;
      expectedTotalHours: number;
      expectedBillableHours: number;
      totalActual: number;
      billableActual: number;
      leaveActual: number;
      hasEnded: boolean;
    }>();

    for (const person of filtered) {
      const role = (person as any).roles;
      const billableCapacity = role?.billable_capacity_hours ?? HOURS_PER_DAY;
      const team = (person as any).team || "Unassigned";
      const empStart = person.employment_start_date ? new Date(person.employment_start_date)
        : person.overall_start_date ? new Date(person.overall_start_date) : null;
      const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
        : person.overall_end_date ? new Date(person.overall_end_date) : null;
      if (empStart && empStart > endDate) continue;
      if (empEnd && empEnd < startDate) continue;

      const effectiveStart = empStart && empStart > startDate ? empStart : startDate;
      const effectiveEnd = empEnd && empEnd < endDate ? empEnd : endDate;
      if (effectiveStart > effectiveEnd) continue;

      const normName = person.name.trim().toLowerCase();
      const dedupKey = `${normName}::${team}`;
      const existing = deduped.get(dedupKey);
      const overallEnd = person.overall_end_date ? new Date(person.overall_end_date) : null;
      const thisEnded = overallEnd ? overallEnd < new Date() : false;

      if (existing) {
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        for (const d of days) {
          if (isWeekend(d)) continue;
          const dk = d.toISOString().slice(0, 10);
          if (!existing.countedDays.has(dk)) {
            existing.countedDays.add(dk);
            existing.expectedTotalHours += HOURS_PER_DAY;
            existing.expectedBillableHours += billableCapacity;
          }
        }
        if (!thisEnded) existing.hasEnded = false;
      } else {
        const siblingIds = nameToIds.get(normName) || [person.id];
        let total = 0, billable = 0, leave = 0;
        for (const sid of siblingIds) {
          const h = personHours.get(sid);
          if (h) { total += h.total; billable += h.billable; leave += h.leave; }
        }

        const countedDays = new Set<string>();
        let expectedTotalHours = 0;
        let expectedBillableHours = 0;
        const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
        for (const d of days) {
          if (isWeekend(d)) continue;
          const dk = d.toISOString().slice(0, 10);
          if (!countedDays.has(dk)) {
            countedDays.add(dk);
            expectedTotalHours += HOURS_PER_DAY;
            expectedBillableHours += billableCapacity;
          }
        }

        deduped.set(dedupKey, {
          team,
          countedDays,
          expectedTotalHours,
          expectedBillableHours,
          totalActual: total,
          billableActual: billable,
          leaveActual: leave,
          hasEnded: thisEnded,
        });
      }
    }

    for (const entry of deduped.values()) {
      if (!showFormer && entry.hasEnded) continue;
      const working = entry.totalActual - entry.leaveActual;

      let t = teamMap.get(entry.team);
      if (!t) {
        t = { team: entry.team, totalWorking: 0, totalBillable: 0, totalExpected: 0, totalExpectedBillable: 0, count: 0 };
        teamMap.set(entry.team, t);
      }
      t.count++;
      t.totalWorking += working;
      t.totalBillable += entry.billableActual;
      t.totalExpected += entry.expectedTotalHours;
      t.totalExpectedBillable += entry.expectedBillableHours;
    }

    return Array.from(teamMap.values())
      .map(t => {
        const utilisation = t.totalWorking > 0 ? (t.totalBillable / t.totalWorking) * 100 : 0;
        const benchmark = t.totalExpected > 0 ? (t.totalExpectedBillable / t.totalExpected) * 100 : 0;
        return { ...t, utilisation, benchmark, gap: utilisation - benchmark, label: `${t.team} (${t.count})` };
      })
      .filter(t => t.totalWorking > 0);
  }, [people, officeFilter, startDate, endDate, benchmarkPersonHours, showFormer]);

  const benchmarkChartData = useMemo(() => {
    if (roleChartView === "gap") {
      const data = allRoleStats
        .filter(r => r.utilisation < r.benchmark)
        .sort((a, b) => (a.utilisation - a.benchmark) - (b.utilisation - b.benchmark))
        .slice(0, 10);
      return data.map(r => ({ ...r, label: `${r.role} (${r.count})` }));
    } else if (roleChartView === "volume") {
      const top10 = [...allRoleStats]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      const data = top10.sort((a, b) => (a.utilisation - a.benchmark) - (b.utilisation - b.benchmark));
      return data.map(r => ({ ...r, label: `${r.role} (${r.count})` }));
    } else {
      return [...teamBenchmarkData]
        .sort((a, b) => (a.utilisation - a.benchmark) - (b.utilisation - b.benchmark))
        .slice(0, 15);
    }
  }, [allRoleStats, teamBenchmarkData, roleChartView]);

  const [selectedBenchmarkBar, setSelectedBenchmarkBar] = useState<string | null>(null);
  const [selectedBenchmarkDrillItem, setSelectedBenchmarkDrillItem] = useState<string | null>(null);

  // Reset selection when switching tabs
  const handleBenchmarkTabChange = (view: "gap" | "volume" | "team") => {
    setRoleChartView(view);
    setSelectedBenchmarkBar(null);
    setSelectedBenchmarkDrillItem(null);
  };

  // Top 5 non-billable categories for the selected benchmark bar
  const benchmarkDrilldown = useMemo(() => {
    if (!selectedBenchmarkBar) return [];
    if (roleChartView === "team") {
      const teamData = teamProjectData.find(t => t.team === selectedBenchmarkBar);
      if (!teamData) return [];
      return teamData.projects
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5)
        .map(p => ({ label: p.project, hours: p.hours, isRule: ruleNames.has(p.project) }));
    } else {
      const roleMap = roleNonBillable.get(selectedBenchmarkBar);
      if (!roleMap) return [];
      return Array.from(roleMap.entries())
        .map(([label, hours]) => ({ label, hours, isRule: ruleNames.has(label) }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);
    }
  }, [selectedBenchmarkBar, roleChartView, teamProjectData, roleNonBillable, ruleNames]);

  // Level 2: people or projects depending on whether selected item is a rule
  const benchmarkDrilldownLevel2 = useMemo(() => {
    if (!selectedBenchmarkBar || !selectedBenchmarkDrillItem) return { data: [], isRule: false };
    const isRule = ruleNames.has(selectedBenchmarkDrillItem);
    const groupType = roleChartView === "team" ? "team" : "role";
    const bmKey = `${groupType}:${selectedBenchmarkBar}|||${selectedBenchmarkDrillItem}`;

    if (isRule) {
      const pMap = benchmarkRuleProjectIndex.get(bmKey);
      if (!pMap) return { data: [], isRule: true };
      return {
        isRule: true,
        data: Array.from(pMap.entries())
          .map(([name, hours]) => ({ name, hours, projectNumber: projectNumberMap.get(name) || "" }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10),
      };
    } else {
      const pMap = benchmarkPersonIndex.get(bmKey);
      if (!pMap) return { data: [], isRule: false };
      return {
        isRule: false,
        data: Array.from(pMap.entries())
          .map(([name, hours]) => ({ name, hours, role: personRoleMap.get(name) || "" }))
          .sort((a, b) => b.hours - a.hours)
          .slice(0, 10),
      };
    }
  }, [selectedBenchmarkBar, selectedBenchmarkDrillItem, roleChartView, ruleNames, benchmarkPersonIndex, benchmarkRuleProjectIndex, personRoleMap, projectNumberMap]);

  // ============ Monthly team billable capacity vs benchmark ============
  const { data: utilisationSummaryMonthly = [] } = useQuery({
    queryKey: ["utilisation_summary_monthly_analysis", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.rpc("get_utilisation_summary_monthly", {
          _start_date: format(startDate, "yyyy-MM-dd"),
          _end_date: format(endDate, "yyyy-MM-dd"),
        }).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allData as Array<{ person_id: string; project_id: string | null; month_date: string; total_hours: number; leave_hours: number }>;
    },
  });

  // Per-person, per-month classified hours (mirrors UtilisationTab.hoursByPerson but bucketed by month)
  const hoursByPersonMonth = useMemo(() => {
    // key = `${person_id}::${yyyy-MM}` -> { total, billable, leave }
    const map = new Map<string, { total: number; billable: number; leave: number }>();
    for (const row of utilisationSummaryMonthly) {
      if (!row.person_id) continue;
      const mk = format(new Date(row.month_date), "yyyy-MM");
      const key = `${row.person_id}::${mk}`;
      if (!map.has(key)) map.set(key, { total: 0, billable: 0, leave: 0 });
      const rec = map.get(key)!;
      const hrs = Number(row.total_hours);
      const leaveHrs = Number(row.leave_hours);
      const nonLeaveHrs = hrs - leaveHrs;
      rec.total += hrs;
      rec.leave += leaveHrs;
      if (nonLeaveHrs > 0) {
        const proj = row.project_id ? projectsMap.get(row.project_id) : null;
        const entryForClassification: TimeEntryForClassification = {
          id: "", date: "", hours: nonLeaveHrs, notes: null,
          project_id: row.project_id, person_id: row.person_id, people: null, projects: proj || null,
        };
        const projectExists = row.project_id ? projectIds.has(row.project_id) : false;
        const { result } = classifyEntry(rules, entryForClassification, projectExists);
        if (result === "billable") rec.billable += nonLeaveHrs;
      }
    }
    return map;
  }, [utilisationSummaryMonthly, projectsMap, projectIds, rules]);

  const parentalLeaveMap = useMemo(() => buildParentalLeaveMap(people), [people]);

  const monthlyTeamData = useMemo(() => {
    const HOURS_PER_DAY = 7.5;
    const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
    const allowedTeams = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);

    // Build name -> sibling IDs (for actual hours aggregation, mirroring UtilisationTab)
    const nameToIds = new Map<string, string[]>();
    for (const p of people as any[]) {
      const normName = p.name.trim().toLowerCase();
      if (!nameToIds.has(normName)) nameToIds.set(normName, []);
      nameToIds.get(normName)!.push(p.id);
    }

    // For each month, build dedup-by-(name+team) bucket exactly like UtilisationTab does for the whole period
    type MonthAcc = {
      expectedTotalHours: number; expectedBillableHours: number;
      actualHours: number; billableHours: number; leaveHours: number;
      countedDays: Set<string>; hasEnded: boolean;
      siblingIdsCounted: boolean;
    };
    type TeamMonthAcc = { expectedTotal: number; expectedBillable: number; actualTotal: number; actualLeave: number; actualBillable: number };

    const teamMonthMap = new Map<string, Map<string, TeamMonthAcc>>();
    // team -> role -> month -> acc
    const teamRoleMonthMap = new Map<string, Map<string, Map<string, TeamMonthAcc>>>();
    const teamRolesSet = new Map<string, Set<string>>();
    // team -> role -> person displayName -> month -> per-person acc
    type PersonMonthAcc = { expectedTotal: number; expectedBillable: number; actualTotal: number; actualLeave: number; actualBillable: number };
    const teamRolePersonMonthMap = new Map<string, Map<string, Map<string, Map<string, PersonMonthAcc>>>>();
    // team -> role -> Set<displayName>
    const teamRolePeopleSet = new Map<string, Map<string, Set<string>>>();

    for (const m of months) {
      const monthStart = startOfMonth(m);
      const monthEnd = endOfMonth(m);
      const mk = format(m, "yyyy-MM");
      // window clamped to selected period
      const windowStart = monthStart > startDate ? monthStart : startDate;
      const windowEnd = monthEnd < endDate ? monthEnd : endDate;

      const deduped = new Map<string, MonthAcc & { roleName: string }>();

      for (const person of people as any[]) {
        if (officeFilter !== "Global" && person.office !== officeFilter) continue;
        const team = (person.team || "").toLowerCase().trim();
        if (!allowedTeams.has(team)) continue;

        // Mirror UtilisationTab: employment_start/end first, then overall fallback
        const empStart = person.employment_start_date ? new Date(person.employment_start_date)
          : person.overall_start_date ? new Date(person.overall_start_date) : null;
        const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
          : person.overall_end_date ? new Date(person.overall_end_date) : null;
        if (empStart && empStart > windowEnd) continue;
        if (empEnd && empEnd < windowStart) continue;

        const effectiveStart = empStart && empStart > windowStart ? empStart : windowStart;
        const effectiveEnd = empEnd && empEnd < windowEnd ? empEnd : windowEnd;
        if (effectiveStart > effectiveEnd) continue;

        const role = (person as any).roles;
        const billableCapacityHrs = role?.billable_capacity_hours ?? HOURS_PER_DAY;
        const roleName = role?.name || "Unknown";
        const normName = person.name.trim().toLowerCase();
        const dedupKey = `${normName}::${person.team || "Unassigned"}`;
        const leaveIntervals = parentalLeaveMap.get(normName);
        const overallEnd = person.overall_end_date ? new Date(person.overall_end_date) : null;
        const thisEnded = overallEnd ? overallEnd < new Date() : false;

        const existing = deduped.get(dedupKey);
        if (existing) {
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
          if (!thisEnded) existing.hasEnded = false;
        } else {
          // Aggregate actual hours across sibling IDs (only once per unique name+team)
          const siblingIds = nameToIds.get(normName) || [person.id];
          let total = 0, billable = 0, leave = 0;
          for (const sid of siblingIds) {
            const h = hoursByPersonMonth.get(`${sid}::${mk}`);
            if (h) { total += h.total; billable += h.billable; leave += h.leave; }
          }

          const countedDays = new Set<string>();
          const days = eachDayOfInterval({ start: effectiveStart, end: effectiveEnd });
          let personWorkingDays = 0;
          for (const d of days) {
            if (isWeekend(d)) continue;
            if (isOnParentalLeave(d, leaveIntervals)) continue;
            countedDays.add(d.toISOString().slice(0, 10));
            personWorkingDays++;
          }

          deduped.set(dedupKey, {
            expectedTotalHours: personWorkingDays * HOURS_PER_DAY,
            expectedBillableHours: personWorkingDays * billableCapacityHrs,
            actualHours: total,
            billableHours: billable,
            leaveHours: leave,
            countedDays,
            hasEnded: thisEnded,
            siblingIdsCounted: true,
            roleName,
            displayName: person.name,
          } as any);
        }
      }

      // Roll up per team (and per team+role) for this month
      for (const [dedupKey, entry] of deduped.entries()) {
        if (!showFormer && entry.hasEnded) continue;
        const teamName = dedupKey.split("::")[1] || "Unassigned";
        if (!teamMonthMap.has(teamName)) teamMonthMap.set(teamName, new Map());
        const tm = teamMonthMap.get(teamName)!;
        if (!tm.has(mk)) tm.set(mk, { expectedTotal: 0, expectedBillable: 0, actualTotal: 0, actualLeave: 0, actualBillable: 0 });
        const acc = tm.get(mk)!;
        acc.expectedTotal += entry.expectedTotalHours;
        acc.expectedBillable += entry.expectedBillableHours;
        acc.actualTotal += entry.actualHours;
        acc.actualLeave += entry.leaveHours;
        acc.actualBillable += entry.billableHours;

        if (!teamRolesSet.has(teamName)) teamRolesSet.set(teamName, new Set());
        teamRolesSet.get(teamName)!.add(entry.roleName);
        if (!teamRoleMonthMap.has(teamName)) teamRoleMonthMap.set(teamName, new Map());
        const rm = teamRoleMonthMap.get(teamName)!;
        if (!rm.has(entry.roleName)) rm.set(entry.roleName, new Map());
        const rmm = rm.get(entry.roleName)!;
        if (!rmm.has(mk)) rmm.set(mk, { expectedTotal: 0, expectedBillable: 0, actualTotal: 0, actualLeave: 0, actualBillable: 0 });
        const racc = rmm.get(mk)!;
        racc.expectedTotal += entry.expectedTotalHours;
        racc.expectedBillable += entry.expectedBillableHours;
        racc.actualTotal += entry.actualHours;
        racc.actualLeave += entry.leaveHours;
        racc.actualBillable += entry.billableHours;

        // Per-person per-month accumulator
        const displayName = (entry as any).displayName || dedupKey.split("::")[0];
        if (!teamRolePeopleSet.has(teamName)) teamRolePeopleSet.set(teamName, new Map());
        const rps = teamRolePeopleSet.get(teamName)!;
        if (!rps.has(entry.roleName)) rps.set(entry.roleName, new Set());
        rps.get(entry.roleName)!.add(displayName);

        if (!teamRolePersonMonthMap.has(teamName)) teamRolePersonMonthMap.set(teamName, new Map());
        const trpm = teamRolePersonMonthMap.get(teamName)!;
        if (!trpm.has(entry.roleName)) trpm.set(entry.roleName, new Map());
        const rpm = trpm.get(entry.roleName)!;
        if (!rpm.has(displayName)) rpm.set(displayName, new Map());
        const pmm = rpm.get(displayName)!;
        if (!pmm.has(mk)) pmm.set(mk, { expectedTotal: 0, expectedBillable: 0, actualTotal: 0, actualLeave: 0, actualBillable: 0 });
        const pacc = pmm.get(mk)!;
        pacc.expectedTotal += entry.expectedTotalHours;
        pacc.expectedBillable += entry.expectedBillableHours;
        pacc.actualTotal += entry.actualHours;
        pacc.actualLeave += entry.leaveHours;
        pacc.actualBillable += entry.billableHours;
      }
    }

    const buildSeries = (monthMap: Map<string, TeamMonthAcc>) => months.map(m => {
      const mk = format(m, "yyyy-MM");
      const acc = monthMap.get(mk) || { expectedTotal: 0, expectedBillable: 0, actualTotal: 0, actualLeave: 0, actualBillable: 0 };
      const working = acc.actualTotal - acc.actualLeave;
      const actual = working > 0 ? (acc.actualBillable / working) * 100 : 0;
      const benchmark = acc.expectedTotal > 0 ? (acc.expectedBillable / acc.expectedTotal) * 100 : 0;
      return {
        month: mk,
        monthLabel: format(m, "MMM yyyy"),
        actual,
        benchmark,
        actualHours: acc.actualBillable,
        benchmarkHours: acc.expectedBillable,
        workingHours: working,
        expectedTotal: acc.expectedTotal,
      };
    });

    const teams = Array.from(teamMonthMap.keys()).sort();
    const series: Record<string, ReturnType<typeof buildSeries>> = {};
    for (const team of teams) {
      series[team] = buildSeries(teamMonthMap.get(team)!);
    }

    const rolesByTeam: Record<string, string[]> = {};
    const seriesByRole: Record<string, Record<string, ReturnType<typeof buildSeries>>> = {};
    for (const team of teams) {
      const roleSet = teamRolesSet.get(team) || new Set<string>();
      rolesByTeam[team] = Array.from(roleSet).sort();
      seriesByRole[team] = {};
      const rm = teamRoleMonthMap.get(team);
      if (rm) {
        for (const r of rolesByTeam[team]) {
          seriesByRole[team][r] = buildSeries(rm.get(r) || new Map());
        }
      }
    }

    // Per-role people count and per-person per-month breakdown
    const peopleByTeamRole: Record<string, Record<string, string[]>> = {};
    const personMonthByTeamRole: Record<string, Record<string, Record<string, { month: string; monthLabel: string; actual: number; benchmark: number }[]>>> = {};
    for (const team of teams) {
      peopleByTeamRole[team] = {};
      personMonthByTeamRole[team] = {};
      const rps = teamRolePeopleSet.get(team);
      const trpm = teamRolePersonMonthMap.get(team);
      for (const r of rolesByTeam[team]) {
        const names = Array.from((rps?.get(r) || new Set<string>())).sort();
        peopleByTeamRole[team][r] = names;
        personMonthByTeamRole[team][r] = {};
        const rpm = trpm?.get(r);
        for (const n of names) {
          const pmm = rpm?.get(n) || new Map<string, PersonMonthAcc>();
          personMonthByTeamRole[team][r][n] = months.map(m => {
            const mk = format(m, "yyyy-MM");
            const acc = pmm.get(mk) || { expectedTotal: 0, expectedBillable: 0, actualTotal: 0, actualLeave: 0, actualBillable: 0 };
            const working = acc.actualTotal - acc.actualLeave;
            return {
              month: mk,
              monthLabel: format(m, "MMM yyyy"),
              actual: working > 0 ? (acc.actualBillable / working) * 100 : 0,
              benchmark: acc.expectedTotal > 0 ? (acc.expectedBillable / acc.expectedTotal) * 100 : 0,
            };
          });
        }
      }
    }

    const monthLabels = months.map(m => ({ month: format(m, "yyyy-MM"), monthLabel: format(m, "MMM yyyy") }));

    return { teams, series, rolesByTeam, seriesByRole, peopleByTeamRole, personMonthByTeamRole, monthLabels };
  }, [people, officeFilter, showFormer, startDate, endDate, hoursByPersonMonth, parentalLeaveMap]);


  const [selectedMonthlyTeam, setSelectedMonthlyTeam] = useState<string>("");
  const [selectedMonthlyRole, setSelectedMonthlyRole] = useState<string>("All roles - aggregated");
  useEffect(() => {
    if (monthlyTeamData.teams.length > 0 && !monthlyTeamData.teams.includes(selectedMonthlyTeam)) {
      setSelectedMonthlyTeam(monthlyTeamData.teams[0]);
    }
  }, [monthlyTeamData.teams, selectedMonthlyTeam]);

  useEffect(() => {
    if (!selectedMonthlyTeam) return;
    const roles = monthlyTeamData.rolesByTeam[selectedMonthlyTeam] || [];
    const special = selectedMonthlyRole === "All roles - aggregated" || selectedMonthlyRole === "All roles - individual";
    if (!special && !roles.includes(selectedMonthlyRole)) {
      setSelectedMonthlyRole("All roles - aggregated");
    }
  }, [selectedMonthlyTeam, monthlyTeamData.rolesByTeam, selectedMonthlyRole]);

  const [monthlyViewMode, setMonthlyViewMode] = useState<"month" | "total">("month");

  const isIndividualRoles = selectedMonthlyRole === "All roles - individual";

  const monthlyChartData = useMemo(() => {
    if (!selectedMonthlyTeam) return [];
    if (
      selectedMonthlyRole &&
      selectedMonthlyRole !== "All roles - aggregated" &&
      selectedMonthlyRole !== "All roles - individual"
    ) {
      return monthlyTeamData.seriesByRole[selectedMonthlyTeam]?.[selectedMonthlyRole] || [];
    }
    return monthlyTeamData.series[selectedMonthlyTeam] || [];
  }, [selectedMonthlyTeam, selectedMonthlyRole, monthlyTeamData]);

  const monthlyTotalChartData = useMemo(() => {
    if (monthlyChartData.length === 0) return [];
    let actualBillable = 0, working = 0, expectedBillable = 0, expectedTotal = 0;
    for (const r of monthlyChartData as any[]) {
      actualBillable += r.actualHours || 0;
      working += r.workingHours || 0;
      expectedBillable += r.benchmarkHours || 0;
      expectedTotal += r.expectedTotal || 0;
    }
    return [{
      monthLabel: "Total",
      actual: working > 0 ? (actualBillable / working) * 100 : 0,
      benchmark: expectedTotal > 0 ? (expectedBillable / expectedTotal) * 100 : 0,
    }];
  }, [monthlyChartData]);

  // All roles - individual: one bar pair per role (aggregated across selected period)
  const monthlyByRoleChartData = useMemo(() => {
    if (!selectedMonthlyTeam) return [];
    const roles = monthlyTeamData.rolesByTeam[selectedMonthlyTeam] || [];
    const byRole = monthlyTeamData.seriesByRole[selectedMonthlyTeam] || {};
    const people = monthlyTeamData.peopleByTeamRole[selectedMonthlyTeam] || {};
    return roles.map(r => {
      const series = byRole[r] || [];
      let actualBillable = 0, working = 0, expectedBillable = 0, expectedTotal = 0;
      for (const row of series as any[]) {
        actualBillable += row.actualHours || 0;
        working += row.workingHours || 0;
        expectedBillable += row.benchmarkHours || 0;
        expectedTotal += row.expectedTotal || 0;
      }
      const count = (people[r] || []).length;
      return {
        role: r,
        count,
        monthLabel: `${r} (${count})`,
        actual: working > 0 ? (actualBillable / working) * 100 : 0,
        benchmark: expectedTotal > 0 ? (expectedBillable / expectedTotal) * 100 : 0,
      };
    }).sort((a, b) => (a.benchmark - a.actual) - (b.benchmark - b.actual));
  }, [selectedMonthlyTeam, monthlyTeamData]);

  // Role selected via bar click (individual mode) — drives the drill-down table
  const [clickedRoleBar, setClickedRoleBar] = useState<string | null>(null);
  const [aggregateExpanded, setAggregateExpanded] = useState<boolean>(false);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedRuleLabel, setExpandedRuleLabel] = useState<string | null>(null);
  const [expandedMonthlyLabel, setExpandedMonthlyLabel] = useState<string | null>(null);
  useEffect(() => { setClickedRoleBar(null); setAggregateExpanded(false); setExpandedPerson(null); setExpandedRuleLabel(null); setExpandedMonthlyLabel(null); }, [selectedMonthlyTeam, selectedMonthlyRole]);
  useEffect(() => { setExpandedPerson(null); setExpandedRuleLabel(null); setExpandedMonthlyLabel(null); }, [clickedRoleBar]);
  useEffect(() => { setExpandedRuleLabel(null); setExpandedMonthlyLabel(null); }, [expandedPerson]);

  // Effective role for the breakdown table
  const tableRole = clickedRoleBar
    || (selectedMonthlyRole !== "All roles - aggregated" && selectedMonthlyRole !== "All roles - individual" ? selectedMonthlyRole : null);


  // ============ Per-person Billable Capacity vs Benchmark (selected team, full period) ============
  const [selectedPersonTeam, setSelectedPersonTeam] = useState<string>("");
  useEffect(() => {
    if (monthlyTeamData.teams.length > 0 && !monthlyTeamData.teams.includes(selectedPersonTeam)) {
      setSelectedPersonTeam(monthlyTeamData.teams[0]);
    }
  }, [monthlyTeamData.teams, selectedPersonTeam]);

  const personCapacityData = useMemo(() => {
    if (!selectedPersonTeam) return [];
    const HOURS_PER_DAY = 7.5;
    const allowedTeams = new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]);

    // sibling IDs by name
    const nameToIds = new Map<string, string[]>();
    for (const p of people as any[]) {
      const normName = p.name.trim().toLowerCase();
      if (!nameToIds.has(normName)) nameToIds.set(normName, []);
      nameToIds.get(normName)!.push(p.id);
    }

    type Acc = {
      name: string;
      role: string;
      expectedTotal: number;
      expectedBillable: number;
      actualTotal: number;
      actualLeave: number;
      actualBillable: number;
      countedDays: Set<string>;
      hasEnded: boolean;
      siblingsCounted: boolean;
    };
    const deduped = new Map<string, Acc>();

    for (const person of people as any[]) {
      if (officeFilter !== "Global" && person.office !== officeFilter) continue;
      const team = (person.team || "").toLowerCase().trim();
      if (!allowedTeams.has(team)) continue;
      const teamName = (person as any).team || "Unassigned";
      if (teamName !== selectedPersonTeam) continue;

      const empStart = person.employment_start_date ? new Date(person.employment_start_date)
        : person.overall_start_date ? new Date(person.overall_start_date) : null;
      const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
        : person.overall_end_date ? new Date(person.overall_end_date) : null;
      if (empStart && empStart > endDate) continue;
      if (empEnd && empEnd < startDate) continue;

      const effStart = empStart && empStart > startDate ? empStart : startDate;
      const effEnd = empEnd && empEnd < endDate ? empEnd : endDate;
      if (effStart > effEnd) continue;

      const role = (person as any).roles;
      const billableCapacityHrs = role?.billable_capacity_hours ?? HOURS_PER_DAY;
      const normName = person.name.trim().toLowerCase();
      const leaveIntervals = parentalLeaveMap.get(normName);
      const overallEnd = person.overall_end_date ? new Date(person.overall_end_date) : null;
      const thisEnded = overallEnd ? overallEnd < new Date() : false;

      const existing = deduped.get(normName);
      if (existing) {
        const days = eachDayOfInterval({ start: effStart, end: effEnd });
        let newDays = 0;
        for (const d of days) {
          if (isWeekend(d)) continue;
          if (isOnParentalLeave(d, leaveIntervals)) continue;
          const dk = d.toISOString().slice(0, 10);
          if (!existing.countedDays.has(dk)) {
            existing.countedDays.add(dk);
            newDays++;
          }
        }
        existing.expectedTotal += newDays * HOURS_PER_DAY;
        existing.expectedBillable += newDays * billableCapacityHrs;
        if (!thisEnded) existing.hasEnded = false;
      } else {
        const siblingIds = nameToIds.get(normName) || [person.id];
        let total = 0, billable = 0, leave = 0;
        for (const sid of siblingIds) {
          const h = benchmarkPersonHours.get(sid);
          if (h) { total += h.total; billable += h.billable; leave += h.leave; }
        }
        const countedDays = new Set<string>();
        const days = eachDayOfInterval({ start: effStart, end: effEnd });
        let workDays = 0;
        for (const d of days) {
          if (isWeekend(d)) continue;
          if (isOnParentalLeave(d, leaveIntervals)) continue;
          countedDays.add(d.toISOString().slice(0, 10));
          workDays++;
        }
        deduped.set(normName, {
          name: person.name,
          role: role?.name || "Unknown",
          expectedTotal: workDays * HOURS_PER_DAY,
          expectedBillable: workDays * billableCapacityHrs,
          actualTotal: total,
          actualLeave: leave,
          actualBillable: billable,
          countedDays,
          hasEnded: thisEnded,
          siblingsCounted: true,
        });
      }
    }

    const rows: Array<{ name: string; role: string; actual: number; benchmark: number; gap: number }> = [];
    for (const acc of deduped.values()) {
      if (!showFormer && acc.hasEnded) continue;
      const working = acc.actualTotal - acc.actualLeave;
      const actual = working > 0 ? (acc.actualBillable / working) * 100 : 0;
      const benchmark = acc.expectedTotal > 0 ? (acc.expectedBillable / acc.expectedTotal) * 100 : 0;
      if (acc.expectedTotal <= 0) continue;
      rows.push({ name: acc.name, role: acc.role, actual, benchmark, gap: actual - benchmark });
    }
    rows.sort((a, b) => a.actual - b.actual);
    return rows;
  }, [people, officeFilter, showFormer, startDate, endDate, selectedPersonTeam, benchmarkPersonHours, parentalLeaveMap]);

  return (
    <div className="space-y-6">

      {/* Billable Capacity: Benchmark vs Actual */}
      {benchmarkChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-lg">Billable Capacity: Benchmark vs Actual</CardTitle>
              <div className="flex items-center rounded-md border text-xs">
                <button
                  className={cn("px-3 py-1 rounded-l-md transition-colors", roleChartView === "team" ? "bg-muted font-medium" : "hover:bg-muted/50")}
                  onClick={() => handleBenchmarkTabChange("team")}
                >
                  Gap by Team
                </button>
                <button
                  className={cn("px-3 py-1 transition-colors", roleChartView === "gap" ? "bg-muted font-medium" : "hover:bg-muted/50")}
                  onClick={() => handleBenchmarkTabChange("gap")}
                >
                  Largest Gap by Role
                </button>
                <button
                  className={cn("px-3 py-1 rounded-r-md transition-colors", roleChartView === "volume" ? "bg-muted font-medium" : "hover:bg-muted/50")}
                  onClick={() => handleBenchmarkTabChange("volume")}
                >
                  Most Common Roles
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {roleChartView === "gap"
                ? "Top 10 roles with the largest gap between billable capacity benchmark and actual utilisation (excl. leave)"
                : roleChartView === "volume"
                  ? "Top 10 roles by headcount — benchmark vs actual utilisation (excl. leave)"
                  : "Top 10 teams with the largest gap between billable capacity benchmark and actual utilisation (excl. leave)"}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(350, 60%, 55%)" }} />
                <span className="text-xs text-muted-foreground">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(var(--border))" }} />
                <span className="text-xs text-muted-foreground">Benchmark</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={benchmarkChartData}
                margin={{ top: 20, right: 40, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="category" dataKey="label" fontSize={10} tick={{ fill: "hsl(var(--foreground))" }} angle={-40} textAnchor="end" interval={0} height={100} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                  labelFormatter={(label) => label}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="utilisation" name="Actual" fill="hsl(350, 60%, 55%)" radius={[4, 4, 0, 0]} barSize={24}
                  cursor="pointer"
                  onClick={(data: any) => {
                    const key = roleChartView === "team" ? data.team : data.role;
                    setSelectedBenchmarkBar(prev => prev === key ? null : key);
                    setSelectedBenchmarkDrillItem(null);
                  }}
                >
                  <LabelList dataKey="utilisation" position="top" formatter={(v: number) => `${Math.round(v)}%`} fontSize={10} fill="hsl(var(--foreground))" fontWeight={600} />
                </Bar>
                <Bar dataKey="benchmark" name="Benchmark" fill="hsl(var(--border))" radius={[4, 4, 0, 0]} barSize={24}
                  cursor="pointer"
                  onClick={(data: any) => {
                    const key = roleChartView === "team" ? data.team : data.role;
                    setSelectedBenchmarkBar(prev => prev === key ? null : key);
                    setSelectedBenchmarkDrillItem(null);
                  }}
                >
                  <LabelList dataKey="benchmark" position="top" formatter={(v: number) => `${Math.round(v)}%`} fontSize={10} fill="hsl(var(--muted-foreground))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {selectedBenchmarkBar && benchmarkDrilldown.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Top non-billable for {selectedBenchmarkBar}
                  </p>
                  <button onClick={() => { setSelectedBenchmarkBar(null); setSelectedBenchmarkDrillItem(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">% = share of {roleChartView === "team" ? "team's" : "role's"} total logged hours (excl. leave)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={benchmarkDrilldown}
                    layout="vertical"
                    margin={{ top: 5, right: 40, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tick={{ fill: "hsl(var(--foreground))" }} tickFormatter={(v) => `${Math.round(v)}h`} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={180}
                      fontSize={10}
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${Math.round(value)}h`, "Non-Billable"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="hsl(350, 60%, 55%)"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                      cursor="pointer"
                      onClick={(data: any) => {
                        setSelectedBenchmarkDrillItem(prev => prev === data.label ? null : data.label);
                      }}
                      label={({ x, y, width, height, value, index }: any) => {
                        const item = benchmarkDrilldown[index];
                        const totalHrs = roleChartView === "team"
                          ? (teamProjectData.find(t => t.team === selectedBenchmarkBar)?.teamLoggedHours || 0)
                          : (roleTotalLogged.get(selectedBenchmarkBar || "") || 0);
                        const pct = totalHrs > 0 ? Math.round((value / totalHrs) * 100) : 0;
                        return (
                          <g>
                            <text x={x + width - 6} y={y + height / 2} dominantBaseline="central" textAnchor="end" fontSize={9} fill="white" fontWeight={600}>
                              {Math.round(value)}h
                            </text>
                            <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fontSize={9} fill="hsl(var(--muted-foreground))">
                              {pct}%
                            </text>
                          </g>
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* Level 2: People or Projects */}
                {selectedBenchmarkDrillItem && benchmarkDrilldownLevel2.data.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {benchmarkDrilldownLevel2.isRule
                          ? `Projects driving "${selectedBenchmarkDrillItem}"`
                          : `People on "${selectedBenchmarkDrillItem}"`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {benchmarkDrilldownLevel2.isRule
                          ? "% = share of total logged hours"
                          : "% = share of each person's total logged hours"}
                      </p>
                      <button onClick={() => setSelectedBenchmarkDrillItem(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <ResponsiveContainer width="100%" height={Math.min(benchmarkDrilldownLevel2.data.length * (benchmarkDrilldownLevel2.isRule ? 40 : 32) + 20, 450)}>
                      <BarChart
                        data={benchmarkDrilldownLevel2.data}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" fontSize={10} tick={{ fill: "hsl(var(--foreground))" }} tickFormatter={(v) => `${Math.round(v)}h`} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={200}
                          fontSize={10}
                          tick={benchmarkDrilldownLevel2.isRule ? ({ x, y, payload }: any) => {
                            const item = benchmarkDrilldownLevel2.data.find((d: any) => d.name === payload.value);
                            const projNum = (item as any)?.projectNumber || "";
                            return (
                              <g>
                                <text x={x} y={y - (projNum ? 4 : 0)} textAnchor="end" fontSize={10} fill="hsl(var(--foreground))">{payload.value}</text>
                                {projNum && <text x={x} y={y + 10} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{projNum}</text>}
                              </g>
                            );
                          } : { fill: "hsl(var(--foreground))" }}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${Math.round(value)}h`, "Hours"]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Bar dataKey="hours" fill="hsl(270, 50%, 55%)" radius={[0, 4, 4, 0]} barSize={16}
                          label={({ x, y, width, height, value, index }: any) => {
                            const item = benchmarkDrilldownLevel2.data[index];
                            let pct = 0;
                            if (benchmarkDrilldownLevel2.isRule) {
                              // Rule bars: % of team/role total so sub-bars sum to parent bar %
                              const totalHrs = roleChartView === "team"
                                ? (teamProjectData.find(t => t.team === selectedBenchmarkBar)?.teamLoggedHours || 0)
                                : (roleTotalLogged.get(selectedBenchmarkBar || "") || 0);
                              pct = totalHrs > 0 ? Math.round((value / totalHrs) * 100) : 0;
                            } else {
                              // Person bars: % of that person's total logged hours
                              const personTotal = personTotalLogged.get(item?.name || "") || 0;
                              pct = personTotal > 0 ? Math.round((value / personTotal) * 100) : 0;
                            }
                            return (
                              <g>
                                <text x={x + width - 4} y={y + height / 2} dominantBaseline="central" textAnchor="end" fontSize={9} fill="white" fontWeight={600}>
                                  {Math.round(value)}h
                                </text>
                                <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fontSize={9} fill="hsl(var(--muted-foreground))">
                                  {pct}%
                                </text>
                              </g>
                            );
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Billable Capacity by Team */}
      {monthlyTeamData.teams.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <CardTitle className="font-display text-lg">Team Billable Capacity</CardTitle>
                <select
                  value={selectedMonthlyTeam}
                  onChange={(e) => setSelectedMonthlyTeam(e.target.value)}
                  className="text-sm font-normal border rounded px-2 py-1 bg-background"
                >
                  {monthlyTeamData.teams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={selectedMonthlyRole}
                  onChange={(e) => setSelectedMonthlyRole(e.target.value)}
                  className="text-sm font-normal border rounded px-2 py-1 bg-background"
                >
                  <option value="All roles - aggregated">All roles - aggregated</option>
                  <option value="All roles - individual">All roles - individual</option>
                  {(monthlyTeamData.rolesByTeam[selectedMonthlyTeam] || []).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select
                  value={monthlyViewMode}
                  onChange={(e) => setMonthlyViewMode(e.target.value as "month" | "total")}
                  className="text-sm font-normal border rounded px-2 py-1 bg-background"
                >
                  <option value="month">By Month</option>
                  <option value="total">Total</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(350, 60%, 55%)" }} />
                  <span className="text-xs text-muted-foreground">Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "hsl(var(--border))" }} />
                  <span className="text-xs text-muted-foreground">Benchmark</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Billable capacity (% of working hours billable, excl. leave) vs role-based benchmark
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                data={isIndividualRoles ? monthlyByRoleChartData : (monthlyViewMode === "total" ? monthlyTotalChartData : monthlyChartData)}
                margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  fontSize={10}
                  tick={{ fill: "hsl(var(--foreground))" }}
                  angle={!isIndividualRoles && monthlyViewMode === "total" ? 0 : -30}
                  textAnchor={!isIndividualRoles && monthlyViewMode === "total" ? "middle" : "end"}
                  interval={0}
                  height={60}
                />
                <YAxis fontSize={10} tick={{ fill: "hsl(var(--foreground))" }} tickFormatter={(v) => `${Math.round(v)}%`} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${Math.round(value)}%`, name]}
                  labelFormatter={(label) => label}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="hsl(350, 60%, 55%)"
                  radius={[4, 4, 0, 0]}
                  barSize={!isIndividualRoles && monthlyViewMode === "total" ? 80 : 20}
                  cursor={isIndividualRoles || selectedMonthlyRole === "All roles - aggregated" ? "pointer" : undefined}
                  onClick={isIndividualRoles
                    ? (data: any) => {
                        const r = data?.role;
                        if (!r) return;
                        setClickedRoleBar(prev => prev === r ? null : r);
                      }
                    : (selectedMonthlyRole === "All roles - aggregated"
                        ? () => setAggregateExpanded(prev => !prev)
                        : undefined)}
                >
                  <LabelList dataKey="actual" position="top" formatter={(v: number) => `${Math.round(v)}%`} fontSize={9} fill="hsl(var(--foreground))" fontWeight={600} />
                </Bar>
                <Bar dataKey="benchmark" name="Benchmark" fill="hsl(var(--border))" radius={[4, 4, 0, 0]} barSize={!isIndividualRoles && monthlyViewMode === "total" ? 80 : 20}>
                  <LabelList dataKey="benchmark" position="top" formatter={(v: number) => `${Math.round(v)}%`} fontSize={9} fill="hsl(var(--muted-foreground))" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {aggregateExpanded && selectedMonthlyRole === "All roles - aggregated" && !isIndividualRoles && (() => {
              const rolesMap = monthlyTeamData.peopleByTeamRole[selectedMonthlyTeam] || {};
              const perRolePerson = monthlyTeamData.personMonthByTeamRole[selectedMonthlyTeam] || {};
              const monthLabels = monthlyTeamData.monthLabels || [];
              const showMonths = monthlyViewMode === "month" && monthLabels.length > 0;
              const flat: Array<{ name: string; role: string; rows: { month: string; monthLabel: string; actual: number; benchmark: number }[] }> = [];
              for (const role of Object.keys(rolesMap)) {
                for (const name of rolesMap[role] || []) {
                  flat.push({ name, role, rows: perRolePerson[role]?.[name] || [] });
                }
              }
              const personTotal = (rows: { actual: number; benchmark: number }[]) => {
                const valid = rows.filter(r => r.actual > 0 || r.benchmark > 0);
                if (valid.length === 0) return { actual: 0, benchmark: 0 };
                return {
                  actual: valid.reduce((s, r) => s + r.actual, 0) / valid.length,
                  benchmark: valid.reduce((s, r) => s + r.benchmark, 0) / valid.length,
                };
              };
              const sorted = [...flat].sort((a, b) => personTotal(a.rows).actual - personTotal(b.rows).actual);
              return (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">
                      {selectedMonthlyTeam} — all people <span className="text-muted-foreground font-normal">({sorted.length} {sorted.length === 1 ? "person" : "people"})</span>
                    </div>
                    <button onClick={() => setAggregateExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      <X className="h-3 w-3" /> Close
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 pr-3 font-medium bg-muted/40">Name</th>
                          <th className="text-left py-1.5 px-2 font-medium bg-muted/40">Role</th>
                          <th className="text-right py-1.5 px-2 font-medium bg-muted/40 whitespace-nowrap">Benchmark</th>
                          {showMonths
                            ? monthLabels.map(m => (
                                <th key={m.month} className="text-right py-1.5 px-2 font-medium whitespace-nowrap">{m.monthLabel}</th>
                              ))
                            : <th className="text-right py-1.5 px-2 font-medium">Actual</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.length === 0 && (
                          <tr><td colSpan={showMonths ? monthLabels.length + 3 : 4} className="py-3 text-center text-muted-foreground">No people in this team.</td></tr>
                        )}
                        {sorted.map(({ name, role, rows }) => {
                          const tot = personTotal(rows);
                          return (
                            <tr key={`${name}-${role}`} className="border-b last:border-b-0 hover:bg-muted/30">
                              <td className="py-1.5 pr-3 bg-muted/40">{name}</td>
                              <td className="py-1.5 px-2 text-muted-foreground bg-muted/40">{role}</td>
                              <td className="text-right py-1.5 px-2 tabular-nums bg-muted/40 text-muted-foreground">{Math.round(tot.benchmark)}%</td>
                              {showMonths
                                ? monthLabels.map(m => {
                                    const r = rows.find(x => x.month === m.month);
                                    return (
                                      <td key={m.month} className="text-right py-1.5 px-2 tabular-nums">
                                        {r && (r.actual > 0 || r.benchmark > 0) ? `${Math.round(r.actual)}%` : "—"}
                                      </td>
                                    );
                                  })
                                : <td className="text-right py-1.5 px-2 tabular-nums">{Math.round(tot.actual)}%</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {tableRole && (() => {
              const peopleList = monthlyTeamData.peopleByTeamRole[selectedMonthlyTeam]?.[tableRole] || [];
              const perPerson = monthlyTeamData.personMonthByTeamRole[selectedMonthlyTeam]?.[tableRole] || {};
              const monthLabels = monthlyTeamData.monthLabels || [];
              const showMonths = monthlyViewMode === "month" && monthLabels.length > 0;
              const personTotal = (name: string) => {
                const rows = perPerson[name] || [];
                const valid = rows.filter(r => r.actual > 0 || r.benchmark > 0);
                if (valid.length === 0) return { actual: 0, benchmark: 0 };
                const actual = valid.reduce((s, r) => s + r.actual, 0) / valid.length;
                const benchmark = valid.reduce((s, r) => s + r.benchmark, 0) / valid.length;
                return { actual, benchmark };
              };
              return (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">
                      {tableRole} <span className="text-muted-foreground font-normal">({peopleList.length} {peopleList.length === 1 ? "person" : "people"})</span>
                    </div>
                    {clickedRoleBar && (
                      <button onClick={() => setClickedRoleBar(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        <X className="h-3 w-3" /> Close
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 pr-3 font-medium bg-muted/40">Name</th>
                          <th className="text-right py-1.5 px-2 font-medium bg-muted/40 whitespace-nowrap">Benchmark</th>
                          {showMonths
                            ? monthLabels.map(m => (
                                <th key={m.month} className="text-right py-1.5 px-2 font-medium whitespace-nowrap">{m.monthLabel}</th>
                              ))
                            : (
                              <th className="text-right py-1.5 px-2 font-medium">Actual</th>
                            )}
                        </tr>
                      </thead>
                      <tbody>
                        {peopleList.length === 0 && (
                          <tr><td colSpan={showMonths ? monthLabels.length + 2 : 3} className="py-3 text-center text-muted-foreground">No people in this role.</td></tr>
                        )}
                        {[...peopleList].sort((a, b) => personTotal(a).actual - personTotal(b).actual).map(name => {
                          const rows = perPerson[name] || [];
                          const tot = personTotal(name);
                          const isOpen = expandedPerson === name;
                          return (
                            <tr
                              key={name}
                              className={cn("border-b last:border-b-0 cursor-pointer hover:bg-muted/30", isOpen && "bg-muted/30")}
                              onClick={() => setExpandedPerson(prev => prev === name ? null : name)}
                            >
                              <td className="py-1.5 pr-3 bg-muted/40">{name}</td>
                              <td className="text-right py-1.5 px-2 tabular-nums bg-muted/40 text-muted-foreground">{Math.round(tot.benchmark)}%</td>
                              {showMonths
                                ? rows.map(r => (
                                    <td key={r.month} className="text-right py-1.5 px-2 tabular-nums">
                                      {r.actual > 0 || r.benchmark > 0 ? `${Math.round(r.actual)}%` : "—"}
                                    </td>
                                  ))
                                : (
                                  <td className="text-right py-1.5 px-2 tabular-nums">{Math.round(tot.actual)}%</td>
                                )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {expandedPerson && (() => {
                    const nbMap = personNonBillableIndex.get(expandedPerson);
                    const personLogged = personTotalLogged.get(expandedPerson) || 0;
                    const nbList = nbMap
                      ? Array.from(nbMap.entries())
                          .filter(([, h]) => h > 0)
                          .map(([label, hours]) => ({
                            label,
                            hours,
                            pct: personLogged > 0 ? (hours / personLogged) * 100 : 0,
                          }))
                          .sort((a, b) => b.hours - a.hours)
                      : [];
                    const nbTotal = nbList.reduce((s, r) => s + r.hours, 0);
                    return (
                      <div className="mt-4 border-t pt-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-medium">
                            Non-billable projects for {expandedPerson}
                            <span className="text-muted-foreground font-normal"> · {Math.round(nbTotal).toLocaleString()}h total</span>
                          </div>
                          <button onClick={() => setExpandedPerson(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                            <X className="h-3 w-3" /> Close
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-2">
                          % = share of {expandedPerson}'s total logged hours (excl. leave)
                          {(() => {
                            const raw = personRawTotalLogged.get(expandedPerson) || 0;
                            const leave = personLeaveLogged.get(expandedPerson) || 0;
                            const working = Math.max(0, raw - leave);
                            if (raw <= 0) return null;
                            return (
                              <span className="ml-1">
                                · Total logged: {Math.round(raw).toLocaleString()}h · Leave: {Math.round(leave).toLocaleString()}h · Working logged: {Math.round(working).toLocaleString()}h
                              </span>
                            );
                          })()}
                        </p>
                        {nbList.length === 0 ? (
                          <div className="text-xs text-muted-foreground italic py-4">No non-billable hours in this period.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height={Math.max(140, nbList.length * 28 + 40)}>
                            <BarChart
                              data={nbList}
                              layout="vertical"
                              margin={{ top: 8, right: 64, left: 8, bottom: 8 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tickFormatter={(v: number) => `${Math.round(v)}h`} fontSize={10} />
                              <YAxis
                                type="category"
                                dataKey="label"
                                width={200}
                                fontSize={10}
                                tick={{ fill: "hsl(var(--foreground))" }}
                              />
                              <Tooltip
                                formatter={(v: number, _n, p: any) => [
                                  `${Math.round(v).toLocaleString()}h (${Math.round(p?.payload?.pct || 0)}%)`,
                                  "Hours",
                                ]}
                                contentStyle={{ fontSize: 12 }}
                              />
                              <Bar
                                dataKey="hours"
                                fill="hsl(var(--primary))"
                                radius={[0, 4, 4, 0]}
                                barSize={18}
                                cursor="pointer"
                                onClick={(data: any) => {
                                  const lbl = data?.label;
                                  if (!lbl) return;
                                  if (ruleNames.has(lbl)) {
                                    setExpandedMonthlyLabel(null);
                                    setExpandedRuleLabel(prev => prev === lbl ? null : lbl);
                                  } else {
                                    setExpandedRuleLabel(null);
                                    setExpandedMonthlyLabel(prev => prev === lbl ? null : lbl);
                                  }
                                }}
                              >
                                <LabelList
                                  dataKey="hours"
                                  position="insideRight"
                                  formatter={(v: number) => `${Math.round(v).toLocaleString()}h`}
                                  fontSize={10}
                                  fill="hsl(var(--primary-foreground))"
                                />
                                <LabelList
                                  dataKey="pct"
                                  position="right"
                                  formatter={(v: number) => `${Math.round(v)}%`}
                                  fontSize={10}
                                  fill="hsl(var(--muted-foreground))"
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                        {expandedRuleLabel && (() => {
                          const projMap = personRuleProjectIndex.get(expandedPerson)?.get(expandedRuleLabel);
                          const projList = projMap
                            ? Array.from(projMap.entries())
                                .filter(([, h]) => h > 0)
                                .map(([label, hours]) => ({
                                  label,
                                  hours,
                                  pct: personLogged > 0 ? (hours / personLogged) * 100 : 0,
                                }))
                                .sort((a, b) => b.hours - a.hours)
                            : [];
                          const projTotal = projList.reduce((s, r) => s + r.hours, 0);
                          return (
                            <div className="mt-4 border-t pt-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium">
                                  {expandedRuleLabel} projects for {expandedPerson}
                                  <span className="text-muted-foreground font-normal"> · {Math.round(projTotal).toLocaleString()}h total</span>
                                </div>
                                <button onClick={() => setExpandedRuleLabel(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                                  <X className="h-3 w-3" /> Close
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground mb-2">
                                % = share of {expandedPerson}'s total logged hours (excl. leave)
                              </p>
                              {projList.length === 0 ? (
                                <div className="text-xs text-muted-foreground italic py-4">No project breakdown available.</div>
                              ) : (
                                <ResponsiveContainer width="100%" height={Math.max(140, projList.length * 28 + 40)}>
                                  <BarChart data={projList} layout="vertical" margin={{ top: 8, right: 64, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(v: number) => `${Math.round(v)}h`} fontSize={10} />
                                    <YAxis type="category" dataKey="label" width={240} fontSize={10} tick={{ fill: "hsl(var(--foreground))" }} />
                                    <Tooltip
                                      formatter={(v: number, _n, p: any) => [
                                        `${Math.round(v).toLocaleString()}h (${Math.round(p?.payload?.pct || 0)}%)`,
                                        "Hours",
                                      ]}
                                      contentStyle={{ fontSize: 12 }}
                                    />
                                    <Bar dataKey="hours" fill="#ff7daa" radius={[0, 4, 4, 0]} barSize={18}>
                                      <LabelList dataKey="hours" position="insideRight" formatter={(v: number) => `${Math.round(v).toLocaleString()}h`} fontSize={10} fill="#ffffff" />
                                      <LabelList dataKey="pct" position="right" formatter={(v: number) => `${Math.round(v)}%`} fontSize={10} fill="hsl(var(--muted-foreground))" />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          );
                        })()}
                        {expandedMonthlyLabel && (() => {
                          const monthMap = personLabelMonthlyIndex.get(expandedPerson)?.get(expandedMonthlyLabel);
                          // Build month list spanning the selected period for continuity
                          const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: startOfMonth(endDate) });
                          const monthList = months.map(m => {
                            const key = format(m, "yyyy-MM");
                            const hours = monthMap?.get(key) || 0;
                            return { label: format(m, "MMM yy"), hours };
                          });
                          const monthTotal = monthList.reduce((s, r) => s + r.hours, 0);
                          return (
                            <div className="mt-4 border-t pt-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium">
                                  {expandedMonthlyLabel} – monthly distribution for {expandedPerson}
                                  <span className="text-muted-foreground font-normal"> · {Math.round(monthTotal).toLocaleString()}h total</span>
                                </div>
                                <button onClick={() => setExpandedMonthlyLabel(null)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                                  <X className="h-3 w-3" /> Close
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground mb-2">
                                Hours logged per month on {expandedMonthlyLabel}
                              </p>
                              {monthTotal === 0 ? (
                                <div className="text-xs text-muted-foreground italic py-4">No hours in this period.</div>
                              ) : (
                                <ResponsiveContainer width="100%" height={220}>
                                  <BarChart data={monthList} margin={{ top: 16, right: 16, left: 8, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" fontSize={10} angle={-30} textAnchor="end" interval={0} height={40} />
                                    <YAxis tickFormatter={(v: number) => `${Math.round(v)}h`} fontSize={10} />
                                    <Tooltip formatter={(v: number) => [`${Math.round(v).toLocaleString()}h`, "Hours"]} contentStyle={{ fontSize: 12 }} />
                                    <Bar dataKey="hours" fill="#ff7daa" radius={[4, 4, 0, 0]}>
                                      <LabelList dataKey="hours" position="top" formatter={(v: number) => v > 0 ? `${Math.round(v)}h` : ""} fontSize={10} fill="hsl(var(--foreground))" />
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Burn vs Scope - follows Team Billable Capacity dropdowns */}
      {selectedMonthlyTeam && (
        <BurnVsScope
          team={selectedMonthlyTeam}
          roleNames={
            selectedMonthlyRole === "All roles - aggregated" ||
            selectedMonthlyRole === "All roles - individual"
              ? []
              : [selectedMonthlyRole]
          }
          startDate={startDate}
          endDate={endDate}
          officeFilter={officeFilter}
          showFormer={showFormer}
        />
      )}

      {/* Progressive Bar Chart Drill-Down */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center justify-between">
            <span>All Teams</span>
            <span className="text-sm font-normal text-muted-foreground">
              {fmt(totalNonBillable)}h non-billable of {fmt(totalLoggedHours)}h logged (excl. leave)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Level 1: By Project / Rule */}
          <p className="text-xs font-medium text-muted-foreground mb-1">By Project / Rule</p>
          <p className="text-[10px] text-muted-foreground mb-2">% = share of total logged hours across all teams (excl. leave)</p>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={totalProjectData}
              margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                type="category"
                dataKey="project"
                interval={0}
                height={80}
                tick={({ x, y, payload }: any) => {
                  const maxWidth = 70;
                  const words = (payload.value as string).split(/[\s/]+/);
                  const lines: string[] = [];
                  let current = words[0] || "";
                  for (let i = 1; i < words.length; i++) {
                    const test = current + " " + words[i];
                    if (test.length > 12) {
                      lines.push(current);
                      current = words[i];
                    } else {
                      current = test;
                    }
                  }
                  lines.push(current);
                  return (
                    <g transform={`translate(${x},${y + 8})`}>
                      {lines.map((line, i) => (
                        <text key={i} x={0} y={i * 12} textAnchor="middle" fontSize={9} fill="hsl(var(--foreground))">
                          {line}
                        </text>
                      ))}
                    </g>
                  );
                }}
              />
              <Tooltip
                formatter={(value: number) => [`${Math.round(value)}h`, "Non-Billable"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="hours"
                name="Non-Billable"
                cursor="pointer"
                radius={[4, 4, 0, 0]}
                onClick={(data: any) => {
                  setSelectedProject(prev => prev === data.project ? null : data.project);
                  setSelectedTeam(null);
                }}
              >
                {totalProjectData.map((entry, i) => (
                  <Cell
                    key={entry.project}
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    opacity={selectedProject && selectedProject !== entry.project ? 0.3 : 1}
                    stroke={selectedProject === entry.project ? "hsl(var(--foreground))" : "none"}
                    strokeWidth={selectedProject === entry.project ? 2 : 0}
                  />
                ))}
                <LabelList dataKey="hours" position="top" fontSize={9}
                  content={({ x, y, width, value, index }: any) => {
                    const proj = totalProjectData[index];
                    const pct = proj ? Math.round(proj.pct) : 0;
                    return (
                      <g>
                        <text x={x + width / 2} y={y + 14} textAnchor="middle" fontSize={8} fill="white" fontWeight={600}>
                          {Math.round(value)}h
                        </text>
                        <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                          {pct}%
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {selectedProject && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-medium">{selectedProject}</span>
              <button onClick={() => { setSelectedProject(null); setSelectedTeam(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
            </div>
          )}

          {/* Level 2: By Team (or by Project for rule bars) */}
          {selectedProject && (isRuleBar ? ruleProjectData.length > 0 : teamBreakdown.length > 0) && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {selectedProject} — {isRuleBar ? "Projects" : "Teams"}
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">% = share of total logged hours (excl. leave)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={isRuleBar ? ruleProjectData : teamBreakdown}
                  margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="category" dataKey={isRuleBar ? "project" : "team"} fontSize={10} tick={{ fill: "hsl(var(--foreground))" }} angle={-40} textAnchor="end" interval={0} height={80} />
                  <Tooltip
                    formatter={(value: number, _: any, props: any) => [`${Math.round(value)}% (${Math.round(props.payload.hours)}h)`, "Non-Billable"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="pct"
                    name="Non-Billable"
                    cursor={isRuleBar ? undefined : "pointer"}
                    radius={[4, 4, 0, 0]}
                    onClick={isRuleBar ? undefined : (data: any) => {
                      setSelectedTeam(prev => prev === data.team ? null : data.team);
                    }}
                  >
                    {(isRuleBar ? ruleProjectData : teamBreakdown).map((entry: any, i: number) => (
                      <Cell
                        key={isRuleBar ? entry.project : entry.team}
                        fill={PIE_COLORS_2[i % PIE_COLORS_2.length]}
                        opacity={!isRuleBar && selectedTeam && selectedTeam !== entry.team ? 0.3 : 1}
                        stroke={!isRuleBar && selectedTeam === entry.team ? "hsl(var(--foreground))" : "none"}
                        strokeWidth={!isRuleBar && selectedTeam === entry.team ? 2 : 0}
                      />
                    ))}
                    <LabelList dataKey="pct" position="top" fontSize={9}
                      content={({ x, y, width, value, index }: any) => {
                        const item = (isRuleBar ? ruleProjectData : teamBreakdown)[index];
                        const hrs = item ? Math.round(item.hours) : 0;
                        return (
                          <g>
                            <text x={x + width / 2} y={y + 14} textAnchor="middle" fontSize={8} fill="white" fontWeight={600}>
                              {hrs}h
                            </text>
                            <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                              {Math.round(value)}%
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {!isRuleBar && selectedTeam && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-medium">{selectedTeam}</span>
                  <button onClick={() => setSelectedTeam(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
              )}
            </div>
          )}

          {/* Level 3: By Person/Role */}
          {selectedTeam && personBreakdown.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted-foreground">{selectedTeam}</p>
                <div className="flex items-center rounded-md border text-xs">
                  <button onClick={() => setDrilldownGroupBy("person")} className={cn("px-2 py-0.5 rounded-l-md", drilldownGroupBy === "person" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Person</button>
                  <button onClick={() => setDrilldownGroupBy("role")} className={cn("px-2 py-0.5 rounded-r-md", drilldownGroupBy === "role" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Role</button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">% = share of each {drilldownGroupBy}'s logged hours (excl. leave)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={personBreakdown}
                  margin={{ top: 10, right: 20, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    type="category"
                    dataKey="name"
                    fontSize={10}
                    tick={{ fill: "hsl(var(--foreground))" }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    height={80}
                  />
                  <Tooltip
                    formatter={(value: number, _: any, props: any) => [`${Math.round(value)}% (${Math.round(props.payload.hours)}h)`, "Hours"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="pct" name="Hours" radius={[4, 4, 0, 0]}>
                    {personBreakdown.map((entry: any, i: number) => (
                      <Cell key={entry.name} fill={PIE_COLORS_3[i % PIE_COLORS_3.length]} />
                    ))}
                    <LabelList dataKey="pct" position="top" fontSize={9}
                      content={({ x, y, width, value, index }: any) => {
                        const item = personBreakdown[index];
                        const hrs = item ? Math.round(item.hours) : 0;
                        return (
                          <g>
                            <text x={x + width / 2} y={y + 14} textAnchor="middle" fontSize={8} fill="white" fontWeight={600}>
                              {hrs}h
                            </text>
                            <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
                              {Math.round(value)}%
                            </text>
                          </g>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team detail view */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Non-billable work - Detail</span>
              <select
                value={selectedDetailTeam || ""}
                onChange={(e) => { setSelectedDetailTeam(e.target.value || null); setSelectedDetailProject(null); setSelectedDetailRoles([]); }}
                className="text-sm font-normal border rounded px-2 py-1 bg-background"
              >
                <option value="">Select a team…</option>
                {teamProjectData.map(t => (
                  <option key={t.team} value={t.team}>{t.team}</option>
                ))}
              </select>
              {selectedDetailTeam && availableDetailRoles.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs font-normal h-8">
                      {selectedDetailRoles.length === 0
                        ? "All roles"
                        : selectedDetailRoles.length === 1
                          ? selectedDetailRoles[0]
                          : `${selectedDetailRoles.length} roles`}
                      <ChevronDown className="h-3 w-3 ml-1.5 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="flex items-center justify-between px-2 py-1 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Filter by role</span>
                      {selectedDetailRoles.length > 0 && (
                        <button
                          onClick={() => setSelectedDetailRoles([])}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {availableDetailRoles.map(role => {
                        const checked = selectedDetailRoles.includes(role);
                        return (
                          <label key={role} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setSelectedDetailRoles(prev =>
                                  v ? [...prev, role] : prev.filter(r => r !== role)
                                );
                                setSelectedDetailProject(null);
                              }}
                            />
                            <span className="flex-1">{role}</span>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {detailTeamData && (
              <span className="text-sm font-normal text-muted-foreground">
                {fmt(detailTeamData.totalHours)}h non-billable of {fmt(detailTeamData.teamLoggedHours)}h logged (excl. leave)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detailTeamData ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">% = share of team's logged hours (excl. leave)</p>
              <ResponsiveContainer width="100%" height={Math.max(detailTeamData.projects.length * 36, 200)}>
                <BarChart
                  data={detailTeamData.projects}
                  layout="vertical"
                  margin={{ top: 0, right: 100, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `${Math.round(v)}h`} />
                  <YAxis
                    type="category"
                    dataKey="project"
                    width={220}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${Math.round(value)}h`, "Non-Billable"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="hours" name="Non-Billable" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      setSelectedDetailProject(prev => prev === data.project ? null : data.project);
                    }}
                    label={({ x, y, width, height, value, index }: any) => {
                      const proj = detailTeamData.projects[index];
                      const pct = proj ? Math.round(proj.pct) : 0;
                      return (
                        <g>
                          <text x={x + width - 6} y={y + height / 2} dominantBaseline="central" textAnchor="end" fontSize={12} fill="white">
                            {Math.round(value).toLocaleString()}h
                          </text>
                          <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fontSize={12} fill="hsl(var(--foreground))">
                            {pct}%
                          </text>
                        </g>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>

              {selectedDetailProject && detailPersonBreakdown.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium">
                        {selectedDetailProject}
                      </p>
                      <div className="flex items-center rounded-md border text-xs">
                        <button onClick={() => setDetailGroupBy("person")} className={cn("px-2 py-0.5 rounded-l-md", detailGroupBy === "person" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Person</button>
                        <button onClick={() => setDetailGroupBy("role")} className={cn("px-2 py-0.5", isDetailRuleBar ? "" : "rounded-r-md", detailGroupBy === "role" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Role</button>
                        {isDetailRuleBar && (
                          <button onClick={() => setDetailGroupBy("project")} className={cn("px-2 py-0.5 rounded-r-md border-l", detailGroupBy === "project" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Project</button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDetailProject(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {detailGroupBy === "project"
                      ? `% = share of ${selectedDetailTeam ?? "team"} team's logged hours (excl. leave)`
                      : `% = share of each ${detailGroupBy}'s logged hours (excl. leave)`}
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(detailPersonBreakdown.length * (detailGroupBy === "person" ? 40 : 32), 120)}>
                    <BarChart
                      data={detailPersonBreakdown}
                      layout="vertical"
                      margin={{ top: 0, right: 100, left: 8, bottom: 0 }}
                      barSize={detailGroupBy === "person" ? 20 : undefined}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `${Math.round(v)}h`} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={280}
                        tick={(props: any) => {
                          const item = detailPersonBreakdown.find((d: any) => d.name === props.payload.value);
                          const label: string = props.payload.value ?? "";
                          const maxChars = 38;
                          const display = label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
                          return (
                            <g transform={`translate(${props.x},${props.y})`}>
                              <title>{label}</title>
                              <text x={-4} y={0} dy={item?.role ? -4 : 4} textAnchor="end" fontSize={12} fill="currentColor">{display}</text>
                              {item?.role && <text x={-4} y={0} dy={10} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">{item.role}</text>}
                            </g>
                          );
                        }}
                        tickLine={false}
                        interval={0}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${Math.round(value)}h`, "Hours"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="hours" name="Hours" fill="hsl(var(--accent-foreground))" radius={[0, 4, 4, 0]}
                        label={({ x, y, width, height, value, index }: any) => {
                          const item = detailPersonBreakdown[index];
                          const pct = item ? Math.round(item.pct) : 0;
                          return (
                            <g>
                              <text x={x + width - 6} y={y + height / 2} dominantBaseline="central" textAnchor="end" fontSize={12} fill="white">
                                {Math.round(value).toLocaleString()}h
                              </text>
                              <text x={x + width + 6} y={y + height / 2} dominantBaseline="central" fontSize={12} fill="hsl(var(--foreground))">
                                {pct}%
                              </text>
                            </g>
                          );
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Select a team above or click a team bar in the drill-down to view its breakdown
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisTab;
