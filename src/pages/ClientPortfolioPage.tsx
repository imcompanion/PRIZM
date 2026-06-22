import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Check, ChevronsUpDown, Info } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, parseISO, startOfMonth, addMonths, subMonths, endOfMonth, isAfter, eachDayOfInterval, isWeekend } from "date-fns";
import { calculateInternalCostPerHour, formatCurrency } from "@/lib/calculations";
import { ClientTeamBuilder } from "@/components/client-portfolio/ClientTeamBuilder";
import type { DateRange } from "react-day-picker";

// ── Helpers ──

function computeMonthlyHours(
  projectStart: Date,
  projectEnd: Date,
  scopedHours: number,
  phasePercentages: Record<string, number>
): Record<string, number> {
  if (scopedHours <= 0) return {};
  const totalDays = Math.max(1, Math.round((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysPerPhase = totalDays / 12;
  const monthlyHours: Record<string, number> = {};
  for (let phase = 1; phase <= 12; phase++) {
    const pct = phasePercentages[`Phase ${phase}`] ?? phasePercentages[`phase ${phase}`] ?? phasePercentages[`Phase${phase}`] ?? phasePercentages[String(phase)] ?? 0;
    if (pct <= 0) continue;
    const phaseHours = (pct / 100) * scopedHours;
    const phaseStartDay = Math.round((phase - 1) * daysPerPhase);
    const phaseEndDay = Math.round(phase * daysPerPhase) - 1;
    const phaseStart = new Date(projectStart.getTime() + phaseStartDay * 24 * 60 * 60 * 1000);
    const phaseEnd = new Date(projectStart.getTime() + phaseEndDay * 24 * 60 * 60 * 1000);
    const phaseDays = eachDayOfInterval({ start: phaseStart, end: phaseEnd });
    const workingDays = phaseDays.filter((d) => !isWeekend(d));
    if (workingDays.length === 0) continue;
    const hoursPerDay = phaseHours / workingDays.length;
    for (const day of workingDays) {
      const monthKey = format(day, "yyyy-MM");
      monthlyHours[monthKey] = (monthlyHours[monthKey] || 0) + hoursPerDay;
    }
  }
  return monthlyHours;
}

function getMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  let current = startOfMonth(parseISO(start));
  const last = startOfMonth(parseISO(end));
  while (!isAfter(current, last)) {
    months.push(format(current, "yyyy-MM"));
    current = addMonths(current, 1);
  }
  return months;
}

function mergeMonthlyHours(target: Record<string, number>, source: Record<string, number>) {
  for (const [month, hours] of Object.entries(source)) {
    target[month] = (target[month] || 0) + hours;
  }
}

function getWorkingDaysInMonth(monthKey: string): number {
  const start = startOfMonth(parseISO(`${monthKey}-01`));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  return days.filter(d => !isWeekend(d)).length;
}

// ── Toggle Group ──

function ToggleGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border-border p-0.5 bg-muted/50 bg-[#cfddf2] border-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors",
            value === opt.value ? "bg-background shadow-sm text-foreground bg-[#4b71d8]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Variance Label ──

function VarianceLabel({ actual, scoped, unitMode, capacity, scopedCapacity, showNA }: { actual: number; scoped: number; unitMode?: "hours" | "pct"; capacity?: number; scopedCapacity?: number; showNA?: boolean }) {
  const naLabel = showNA ? <div className="text-[10px] font-medium leading-tight text-muted-foreground/50">N/A</div> : null;
  if (unitMode === "pct" && capacity && capacity > 0) {
    const actualPct = (actual / capacity) * 100;
    const sCap = (scopedCapacity && scopedCapacity > 0) ? scopedCapacity : capacity;
    const scopedPct = (scoped / sCap) * 100;
    const diff = actualPct - scopedPct;
    if (Math.abs(diff) < 0.5) return naLabel;
    const isOver = diff > 0;
    return (
      <div className={cn("text-[10px] font-medium leading-tight", isOver ? "text-destructive" : "text-success")}>
        {isOver ? "+" : ""}{Math.round(diff)}%
      </div>
    );
  }
  const diff = actual - scoped;
  if (Math.abs(diff) < 0.5) return naLabel;
  const isOver = diff > 0;
  return (
    <div className={cn("text-[10px] font-medium leading-tight", isOver ? "text-destructive" : "text-success")}>
      {isOver ? "+" : ""}{Math.round(diff).toLocaleString()}h
    </div>
  );
}

// ── Main Component ──

type ViewMode = "scoped" | "actual";
type UnitMode = "pct" | "hours";

const ClientPortfolioPage = () => {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedOffice, setSelectedOffice] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("scoped");
  const [unitMode, setUnitMode] = useState<UnitMode>("pct");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>(undefined);

  const hoverPreviewDays = useMemo(() => {
    if (!customStart || customEnd || !hoveredDate) return [];
    if (hoveredDate <= customStart) return [];
    const days = eachDayOfInterval({ start: customStart, end: hoveredDate });
    return days.slice(1);
  }, [customStart, customEnd, hoveredDate]);

  // Fetch all projects with scopes (paginated to avoid 1000-row limit)
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["portfolio_projects"],
    queryFn: async () => {
      const allData: any[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, sf_account, parent_account, ultimate_parent, office, start_date, end_date, project_scopes(id, role_id, scoped_hours, phase_percentages)")
          .not("project_scopes", "is", null)
          .order("id")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData.filter((p: any) => p.project_scopes && p.project_scopes.length > 0);
    },
  });

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name, billable_capacity_hours").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch people to map role -> team
  const { data: people = [] } = useQuery({
    queryKey: ["people_role_teams"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("people").select("role_id, team").range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  // Build role -> team mapping (most common team for each role)
  const roleTeamMap = useMemo(() => {
    const teamCounts: Record<string, Record<string, number>> = {};
    for (const p of people) {
      if (!p.role_id || !p.team) continue;
      if (!teamCounts[p.role_id]) teamCounts[p.role_id] = {};
      teamCounts[p.role_id][p.team] = (teamCounts[p.role_id][p.team] || 0) + 1;
    }
    const map: Record<string, string> = {};
    for (const [roleId, counts] of Object.entries(teamCounts)) {
      let bestTeam = "Other";
      let bestCount = 0;
      for (const [team, count] of Object.entries(counts)) {
        if (count > bestCount) { bestTeam = team; bestCount = count; }
      }
      map[roleId] = bestTeam;
    }
    return map;
  }, [people]);

  // Build role headcount map
  const roleHeadcount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of people) {
      if (!p.role_id) continue;
      counts[p.role_id] = (counts[p.role_id] || 0) + 1;
    }
    return counts;
  }, [people]);

  // Build role billable capacity (hours/day) map
  const roleBillableCapacity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of roles) map[r.id] = Number(r.billable_capacity_hours) || 7.5;
    return map;
  }, [roles]);

  // Build client list from ultimate_parent
  const clients = useMemo(() => {
    const clientSet = new Set<string>();
    for (const p of projects) {
      if (p.ultimate_parent) clientSet.add(p.ultimate_parent);
    }
    return Array.from(clientSet).sort();
  }, [projects]);

  // Build account list (parent_account) filtered by selected ultimate parent
  const accounts = useMemo(() => {
    if (!selectedClient) return [];
    const accountSet = new Set<string>();
    for (const p of projects) {
      if (p.ultimate_parent === selectedClient && p.parent_account) {
        accountSet.add(p.parent_account);
      }
    }
    return Array.from(accountSet).sort();
  }, [projects, selectedClient]);

  // Build office list
  const offices = useMemo(() => {
    const officeSet = new Set<string>();
    for (const p of projects) {
      if (p.office) officeSet.add(p.office);
    }
    return Array.from(officeSet).sort();
  }, [projects]);

  // Filtered projects for selected client + office
  const filteredProjects = useMemo(() => {
    if (!selectedClient) return [];
    return projects.filter((p: any) => {
      if (p.ultimate_parent !== selectedClient) return false;
      if (selectedAccount !== "all" && p.parent_account !== selectedAccount) return false;
      if (selectedOffice !== "all" && p.office !== selectedOffice) return false;
      return true;
    });
  }, [projects, selectedClient, selectedAccount, selectedOffice]);

  // Determine month range across all filtered projects, respecting timeframe
  const { months, minDate, maxDate } = useMemo(() => {
    if (filteredProjects.length === 0) return { months: [], minDate: "", maxDate: "" };
    const allStarts = filteredProjects.map((p: any) => p.start_date);
    const allEnds = filteredProjects.map((p: any) => p.end_date);
    let minD = [...allStarts].sort()[0];
    let maxD = [...allEnds].sort().reverse()[0];

    const now = new Date();

    if (timeframe === "past") {
      maxD = format(now, "yyyy-MM-dd");
    } else if (timeframe === "future") {
      minD = format(now, "yyyy-MM-dd");
    } else if (timeframe === "last12") {
      minD = format(addMonths(now, -11), "yyyy-MM-01");
      maxD = format(now, "yyyy-MM-dd");
    } else if (timeframe === "next12") {
      minD = format(now, "yyyy-MM-01");
      maxD = format(addMonths(now, 12), "yyyy-MM-dd");
    } else if (timeframe === "next6") {
      minD = format(now, "yyyy-MM-01");
      maxD = format(addMonths(now, 5), "yyyy-MM-dd");
    } else if (timeframe === "last6next6") {
      minD = format(addMonths(now, -5), "yyyy-MM-01");
      maxD = format(addMonths(now, 5), "yyyy-MM-dd");
    } else if (timeframe === "custom" && customStart) {
      minD = format(customStart, "yyyy-MM-dd");
      maxD = customEnd ? format(customEnd, "yyyy-MM-dd") : format(now, "yyyy-MM-dd");
    }

    return { months: getMonthRange(minD, maxD), minDate: minD, maxDate: maxD };
  }, [filteredProjects, timeframe, customStart, customEnd]);

  // Role map for lookups
  const roleMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles) map[r.id] = r.name;
    return map;
  }, [roles]);

  // Compute role capacity per month for ONE person: roleId -> monthKey -> capacity_hours
  const roleMonthCapacity = useMemo(() => {
    const cap: Record<string, Record<string, number>> = {};
    for (const m of months) {
      const workingDays = getWorkingDaysInMonth(m);
      for (const roleId of Object.keys(roleBillableCapacity)) {
        const hoursPerDay = roleBillableCapacity[roleId] || 0;
        if (!cap[roleId]) cap[roleId] = {};
        cap[roleId][m] = hoursPerDay * workingDays;
      }
    }
    return cap;
  }, [months, roleBillableCapacity, roleHeadcount]);

  // Helper: get capacity for a role across a set of months
  function getRoleCapacity(roleId: string, filter: "past" | "future" | "all") {
    let total = 0;
    for (const m of months) {
      const isPast = m < currentMonth;
      if (filter === "past" && !isPast) continue;
      if (filter === "future" && isPast) continue;
      total += roleMonthCapacity[roleId]?.[m] || 0;
    }
    return total;
  }

  function getRoleMonthCap(roleId: string, m: string) {
    return roleMonthCapacity[roleId]?.[m] || 0;
  }

  // Compute scoped data: aggregate by role across all projects
  const scopedByRole = useMemo(() => {
    const roleData: Record<string, { totalHours: number; monthlyHours: Record<string, number> }> = {};
    for (const project of filteredProjects) {
      const pStart = parseISO(project.start_date);
      const pEnd = parseISO(project.end_date);
      for (const scope of (project as any).project_scopes || []) {
        const roleId = scope.role_id || "unknown";
        const phasePcts = (scope.phase_percentages as Record<string, number>) || {};
        const monthly = computeMonthlyHours(pStart, pEnd, scope.scoped_hours, phasePcts);
        if (!roleData[roleId]) roleData[roleId] = { totalHours: 0, monthlyHours: {} };
        roleData[roleId].totalHours += scope.scoped_hours;
        mergeMonthlyHours(roleData[roleId].monthlyHours, monthly);
      }
    }
    return roleData;
  }, [filteredProjects]);

  // Fetch actual time entries for filtered projects
  const projectIds = useMemo(() => filteredProjects.map((p: any) => p.id), [filteredProjects]);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["portfolio_time_entries", projectIds],
    enabled: projectIds.length > 0 && viewMode === "actual",
    queryFn: async () => {
      const allData: any[] = [];
      const batchSize = 50;
      for (let i = 0; i < projectIds.length; i += batchSize) {
        const batch = projectIds.slice(i, i + batchSize);
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("time_entries")
            .select("hours, date, person_id, project_id, people(role_id)")
            .in("project_id", batch)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          allData.push(...(data || []));
          if (!data || data.length < pageSize) break;
          from += pageSize;
        }
      }
      return allData;
    },
  });

  // Actual data by role
  const actualByRole = useMemo(() => {
    const roleData: Record<string, { totalHours: number; monthlyHours: Record<string, number> }> = {};
    for (const te of timeEntries) {
      const roleId = te.people?.role_id || "unknown";
      const monthKey = (te.date as string).substring(0, 7);
      if (!roleData[roleId]) roleData[roleId] = { totalHours: 0, monthlyHours: {} };
      roleData[roleId].totalHours += te.hours;
      roleData[roleId].monthlyHours[monthKey] = (roleData[roleId].monthlyHours[monthKey] || 0) + te.hours;
    }
    return roleData;
  }, [timeEntries]);

  // Current month for determining past vs future
  const currentMonth = format(new Date(), "yyyy-MM");

  // Build display rows
  const displayRows = useMemo(() => {
    const allRoleIds = new Set([...Object.keys(scopedByRole)]);
    if (viewMode === "actual") {
      for (const id of Object.keys(actualByRole)) allRoleIds.add(id);
    }

    const rows: Array<{
      roleId: string;
      roleName: string;
      team: string;
      totalScoped: number;
      totalActual: number;
      monthlyScoped: Record<string, number>;
      monthlyActual: Record<string, number>;
    }> = [];

    for (const roleId of allRoleIds) {
      const scoped = scopedByRole[roleId] || { totalHours: 0, monthlyHours: {} };
      const actual = actualByRole[roleId] || { totalHours: 0, monthlyHours: {} };
      rows.push({
        roleId,
        roleName: roleMap[roleId] || "Unknown",
        team: roleTeamMap[roleId] || "Other",
        totalScoped: scoped.totalHours,
        totalActual: actual.totalHours,
        monthlyScoped: scoped.monthlyHours,
        monthlyActual: actual.monthlyHours,
      });
    }

    return rows;
  }, [scopedByRole, actualByRole, roleMap, roleTeamMap, viewMode]);

  // Group rows by team, sorted by total hours (most to least)
  const groupedRows = useMemo(() => {
    const teamGroups: Record<string, typeof displayRows> = {};
    for (const row of displayRows) {
      if (!teamGroups[row.team]) teamGroups[row.team] = [];
      teamGroups[row.team].push(row);
    }

    const getRowTotal = (row: typeof displayRows[0]) => {
      if (viewMode === "actual") {
        let total = 0;
        for (const m of months) {
          total += m < currentMonth ? (row.monthlyActual[m] || 0) : (row.monthlyScoped[m] || 0);
        }
        return total;
      }
      return row.totalScoped;
    };

    // Determine month totals for percentage threshold check
    const mTotalsScoped: Record<string, number> = {};
    const mTotalsActual: Record<string, number> = {};
    for (const row of displayRows) {
      for (const m of months) {
        mTotalsScoped[m] = (mTotalsScoped[m] || 0) + (row.monthlyScoped[m] || 0);
        mTotalsActual[m] = (mTotalsActual[m] || 0) + (row.monthlyActual[m] || 0);
      }
    }

    // Check if a role ever exceeds 5% of total hours in any visible month
    const isMinorRole = (row: typeof displayRows[0]) => {
      for (const m of months) {
        const isPast = m < currentMonth;
        const value = (viewMode === "actual" && isPast)
          ? (row.monthlyActual[m] || 0)
          : (row.monthlyScoped[m] || 0);
        const total = (viewMode === "actual" && isPast)
          ? (mTotalsActual[m] || 0)
          : (mTotalsScoped[m] || 0);
        if (total > 0 && (value / total) * 100 > 5) return false;
      }
      return true;
    };

    // Sort roles within each team and split into major/minor
    const result: Array<{
      team: string;
      rows: typeof displayRows;
      otherRow: typeof displayRows[0] | null;
      otherRoleNames: string[];
      otherRoleIds: string[];
      total: number;
    }> = [];

    for (const [team, teamRows] of Object.entries(teamGroups)) {
      teamRows.sort((a, b) => getRowTotal(b) - getRowTotal(a));

      const majorRows: typeof displayRows = [];
      const minorRows: typeof displayRows = [];
      for (const row of teamRows) {
        if (isMinorRole(row)) {
          minorRows.push(row);
        } else {
          majorRows.push(row);
        }
      }

      let otherRow: typeof displayRows[0] | null = null;
      let otherRoleNames: string[] = [];
      let otherRoleIds: string[] = [];
      if (minorRows.length > 0) {
        otherRoleNames = minorRows.map(r => r.roleName).sort();
        otherRoleIds = minorRows.map(r => r.roleId);
        const aggregated: typeof displayRows[0] = {
          roleId: `other-${team}`,
          roleName: "Other",
          team,
          totalScoped: 0,
          totalActual: 0,
          monthlyScoped: {},
          monthlyActual: {},
        };
        for (const r of minorRows) {
          aggregated.totalScoped += r.totalScoped;
          aggregated.totalActual += r.totalActual;
          for (const m of months) {
            aggregated.monthlyScoped[m] = (aggregated.monthlyScoped[m] || 0) + (r.monthlyScoped[m] || 0);
            aggregated.monthlyActual[m] = (aggregated.monthlyActual[m] || 0) + (r.monthlyActual[m] || 0);
          }
        }
        otherRow = aggregated;
      }

      result.push({
        team,
        rows: majorRows,
        otherRow,
        otherRoleNames,
        otherRoleIds,
        total: teamRows.reduce((s, r) => s + getRowTotal(r), 0),
      });
    }

    result.sort((a, b) => b.total - a.total);
    return result;
  }, [displayRows, viewMode, months, currentMonth, roleMonthCapacity]);

  const grandTotalScoped = displayRows.reduce((s, r) => s + r.totalScoped, 0);
  const grandTotalActual = displayRows.reduce((s, r) => s + r.totalActual, 0);

  // Month totals
  const monthTotals = useMemo(() => {
    const scopedTotals: Record<string, number> = {};
    const actualTotals: Record<string, number> = {};
    for (const row of displayRows) {
      for (const m of months) {
        scopedTotals[m] = (scopedTotals[m] || 0) + (row.monthlyScoped[m] || 0);
        actualTotals[m] = (actualTotals[m] || 0) + (row.monthlyActual[m] || 0);
      }
    }
    return { scopedTotals, actualTotals };
  }, [displayRows, months]);

  // Compute aggregate capacity for multiple role IDs across months
  function getMultiRoleCapacity(roleIds: string[], filter: "past" | "future" | "all") {
    let total = 0;
    for (const roleId of roleIds) {
      total += getRoleCapacity(roleId, filter);
    }
    return total;
  }

  function getMultiRoleMonthCap(roleIds: string[], m: string) {
    let total = 0;
    for (const roleId of roleIds) {
      total += getRoleMonthCap(roleId, m);
    }
    return total;
  }

  // All role IDs in display for total row capacity
  const allDisplayRoleIds = useMemo(() => displayRows.map(r => r.roleId), [displayRows]);

  function formatValue(hours: number, capacity: number) {
    if (unitMode === "hours") return hours > 0 ? `${Math.round(hours).toLocaleString()}h` : "—";
    if (capacity <= 0) return hours > 0 ? ">0%" : "—";
    const pct = (hours / capacity) * 100;
    return pct > 0 ? `${Math.round(pct)}%` : "—";
  }

  function getCellValue(row: typeof displayRows[0], m: string) {
    const isPast = m < currentMonth;
    const isActualView = viewMode === "actual";

    if (isActualView && isPast) {
      const actual = row.monthlyActual[m] || 0;
      const scoped = row.monthlyScoped[m] || 0;
      return { value: actual, scoped, showVariance: true, isPast: true };
    }
    const scoped = row.monthlyScoped[m] || 0;
    return { value: scoped, scoped: 0, showVariance: false, isPast: false };
  }

  function getSubTotal(row: typeof displayRows[0], filter: "past" | "future" | "all") {
    let total = 0;
    for (const m of months) {
      const isPast = m < currentMonth;
      if (filter === "past" && !isPast) continue;
      if (filter === "future" && isPast) continue;
      if (viewMode === "actual" && isPast) {
        total += row.monthlyActual[m] || 0;
      } else {
        total += row.monthlyScoped[m] || 0;
      }
    }
    return total;
  }

  function getSubTotalScoped(row: typeof displayRows[0], filter: "past" | "future" | "all") {
    let total = 0;
    for (const m of months) {
      const isPast = m < currentMonth;
      if (filter === "past" && !isPast) continue;
      if (filter === "future" && isPast) continue;
      total += row.monthlyScoped[m] || 0;
    }
    return total;
  }

  function getTotalValue(row: typeof displayRows[0]) {
    return getSubTotal(row, "all");
  }

  // Recompute visible total for actual view
  const visibleTotal = useMemo(() => {
    let total = 0;
    for (const row of displayRows) {
      total += getTotalValue(row);
    }
    return total;
  }, [displayRows, months, viewMode, currentMonth]);

  // Past and future grand totals
  const pastTotal = useMemo(() => displayRows.reduce((s, r) => s + getSubTotal(r, "past"), 0), [displayRows, months, viewMode, currentMonth]);
  const futureTotal = useMemo(() => displayRows.reduce((s, r) => s + getSubTotal(r, "future"), 0), [displayRows, months, viewMode, currentMonth]);
  const pastTotalScoped = useMemo(() => displayRows.reduce((s, r) => s + getSubTotalScoped(r, "past"), 0), [displayRows, months, currentMonth]);
  const futureTotalScoped = useMemo(() => displayRows.reduce((s, r) => s + getSubTotalScoped(r, "future"), 0), [displayRows, months, currentMonth]);

  const isScoped = viewMode === "scoped";

  // Compute role demands for team builder — monthly % of single-person capacity
  const roleDemands = useMemo(() => {
    const futureMonths = months.filter(m => m >= currentMonth);
    return displayRows
      .filter(r => r.roleId !== "unknown" && !r.roleId.startsWith("other-"))
      .map(row => {
        const monthlyPct: Record<string, number> = {};
        let hasAny = false;
        for (const m of futureMonths) {
          const hours = row.monthlyScoped[m] || 0;
          const cap = getRoleMonthCap(row.roleId, m);
          const pct = cap > 0 ? (hours / cap) * 100 : 0;
          if (pct > 0) hasAny = true;
          monthlyPct[m] = Math.round(pct);
        }
        return {
          roleId: row.roleId,
          roleName: row.roleName,
          team: row.team,
          monthlyPct,
        };
      })
      .filter(d => {
        return Object.values(d.monthlyPct).some(v => v > 0);
      });
  }, [displayRows, months, currentMonth]);

  // Capacity totals for the grand total row
  const totalPastCap = getMultiRoleCapacity(allDisplayRoleIds, "past");
  const totalFutureCap = getMultiRoleCapacity(allDisplayRoleIds, "future");
  const totalAllCap = getMultiRoleCapacity(allDisplayRoleIds, "all");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Client Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View scoped and actual hours by role across all projects for a client
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px]">
              <Label className="text-xs font-medium mb-1.5 block">Client</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">{selectedClient || "Select a client…"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients…" />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem key={c} value={c} onSelect={() => { setSelectedClient(c); setSelectedAccount("all"); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedClient === c ? "opacity-100" : "opacity-0")} />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="min-w-[200px]">
              <Label className="text-xs font-medium mb-1.5 block">Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount} disabled={!selectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Label className="text-xs font-medium mb-1.5 block">Office</Label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Timeframe</Label>
              <div className="flex items-center gap-2">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="future">Future</SelectItem>
                    <SelectItem value="last12">Last 12 Months</SelectItem>
                    <SelectItem value="next6">Next 6 Months</SelectItem>
                    <SelectItem value="next12">Next 12 Months</SelectItem>
                    <SelectItem value="last6next6">Last 6 + Next 6</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {timeframe === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStart && customEnd
                          ? `${format(customStart, "dd MMM yyyy")} – ${format(customEnd, "dd MMM yyyy")}`
                          : customStart
                            ? `${format(customStart, "dd MMM yyyy")} – select end date`
                            : "Select date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        showOutsideDays={false}
                        selected={customStart ? { from: customStart, to: customEnd } : undefined}
                        onSelect={(range: DateRange | undefined) => {
                          setCustomStart(range?.from ?? undefined);
                          setCustomEnd(range?.to ?? undefined);
                          if (range?.to) setHoveredDate(undefined);
                        }}
                        onDayMouseEnter={(day) => setHoveredDate(day)}
                        onDayMouseLeave={() => setHoveredDate(undefined)}
                        numberOfMonths={2}
                        className="p-3 pointer-events-auto"
                        modifiers={{
                          hoverPreview: hoverPreviewDays,
                        }}
                        modifiersClassNames={{
                          hoverPreview: "!bg-yellow-100 !text-yellow-900 rounded-none",
                        }}
                        classNames={{
                          day_selected: "bg-yellow-500 text-white hover:bg-yellow-500 hover:text-white focus:bg-yellow-500 focus:text-white",
                          day_range_middle: "aria-selected:bg-yellow-400 aria-selected:text-yellow-950",
                          day_range_end: "day-range-end",
                          day_today: "",
                          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected])]:bg-yellow-400 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                          day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md inline-flex items-center justify-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClient && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Select a client to view their portfolio</p>
          </CardContent>
        </Card>
      )}

      {selectedClient && filteredProjects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No scoped projects found for this client</p>
          </CardContent>
        </Card>
      )}

      {selectedClient && filteredProjects.length > 0 && (
        <>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider">
                  Hours by Role & Month
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
                  {viewMode === "actual" && (
                    <span> · Past months show actuals, future months show scoped</span>
                  )}
                  {unitMode === "pct" && (
                    <span> · % of billable capacity</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ToggleGroup
                  value={unitMode}
                  onChange={(v) => setUnitMode(v as UnitMode)}
                  options={[
                    { value: "pct", label: "% Capacity" },
                    { value: "hours", label: "Hours" },
                  ]}
                />
                <ToggleGroup
                  value={viewMode}
                  onChange={(v) => setViewMode(v as ViewMode)}
                  options={[
                    { value: "scoped", label: "Scoped" },
                    { value: "actual", label: "Actual" },
                  ]}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">Role</TableHead>
                    <TableHead className="text-right min-w-[70px] text-xs border-l">Past</TableHead>
                    <TableHead className="text-right min-w-[70px] text-xs">Future</TableHead>
                    <TableHead className="text-right min-w-[80px] text-xs border-r">Total</TableHead>
                    {months.map((m) => (
                      <TableHead
                        key={m}
                        className={cn(
                          "text-center min-w-[70px] text-xs",
                          m < currentMonth && "bg-muted/30"
                        )}
                      >
                        {format(parseISO(`${m}-01`), "MMM yy")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.map(({ team, rows, otherRow, otherRoleNames, otherRoleIds, total: teamTotal }) => {
                    const allTeamRows = otherRow && getTotalValue(otherRow) > 0 ? [...rows, otherRow] : rows;
                    const teamPast = allTeamRows.reduce((s, r) => s + getSubTotal(r, "past"), 0);
                    const teamFuture = allTeamRows.reduce((s, r) => s + getSubTotal(r, "future"), 0);
                    const teamTotalVal = teamPast + teamFuture;
                    const teamRoleIds = [...rows.map(r => r.roleId), ...otherRoleIds];
                    const teamPastCap = getMultiRoleCapacity(teamRoleIds, "past");
                    const teamFutureCap = getMultiRoleCapacity(teamRoleIds, "future");
                    const teamTotalCap = getMultiRoleCapacity(teamRoleIds, "all");
                    const toPct = (hours: number, cap: number) => (cap > 0 ? (hours / cap) * 100 : 0);
                    const fmtPct = (pct: number) => (pct > 0 ? `${Math.round(pct)}%` : "—");
                    const teamPastPct =
                      rows.reduce((s, r) => s + toPct(getSubTotal(r, "past"), getRoleCapacity(r.roleId, "past")), 0) +
                      (otherRow ? toPct(getSubTotal(otherRow, "past"), getMultiRoleCapacity(otherRoleIds, "past")) : 0);
                    const teamFuturePct =
                      rows.reduce((s, r) => s + toPct(getSubTotal(r, "future"), getRoleCapacity(r.roleId, "future")), 0) +
                      (otherRow ? toPct(getSubTotal(otherRow, "future"), getMultiRoleCapacity(otherRoleIds, "future")) : 0);
                    const teamTotalPct = teamPastPct + teamFuturePct;
                    return (
                    <>
                      <TableRow key={`team-${team}`} className="bg-muted/40 border-t">
                        <TableCell className="sticky left-0 bg-muted/40 z-10 font-bold text-xs uppercase tracking-wider text-muted-foreground">{team}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-muted-foreground border-l bg-muted/40">
                          {unitMode === "pct" ? fmtPct(teamPastPct) : formatValue(teamPast, teamPastCap)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-muted-foreground bg-muted/40">
                          {unitMode === "pct" ? fmtPct(teamFuturePct) : formatValue(teamFuture, teamFutureCap)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-muted-foreground border-r bg-muted/40">
                          {unitMode === "pct" ? fmtPct(teamTotalPct) : formatValue(teamTotalVal, teamTotalCap)}
                        </TableCell>
                        {months.map((m) => {
                          const mVal = allTeamRows.reduce((s, r) => {
                            const isPast = m < currentMonth;
                            return s + ((viewMode === "actual" && isPast) ? (r.monthlyActual[m] || 0) : (r.monthlyScoped[m] || 0));
                          }, 0);
                          const mCap = getMultiRoleMonthCap(teamRoleIds, m);
                          const teamMonthPct =
                            rows.reduce((s, r) => {
                              const isPast = m < currentMonth;
                              const h = (viewMode === "actual" && isPast) ? (r.monthlyActual[m] || 0) : (r.monthlyScoped[m] || 0);
                              return s + toPct(h, getRoleMonthCap(r.roleId, m));
                            }, 0) +
                            (otherRow
                              ? (() => {
                                  const isPast = m < currentMonth;
                                  const h = (viewMode === "actual" && isPast) ? (otherRow.monthlyActual[m] || 0) : (otherRow.monthlyScoped[m] || 0);
                                  return toPct(h, getMultiRoleMonthCap(otherRoleIds, m));
                                })()
                              : 0);
                          return (
                            <TableCell key={m} className={cn("text-center text-xs font-bold text-muted-foreground bg-muted/40", m < currentMonth && "bg-muted/50")}>
                              {mVal > 0 ? (unitMode === "pct" ? fmtPct(teamMonthPct) : formatValue(mVal, mCap)) : "—"}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                      {rows.map((row) => {
                        const rowPast = getSubTotal(row, "past");
                        const rowFuture = getSubTotal(row, "future");
                        const rowTotal = rowPast + rowFuture;
                        const rowPastScoped = getSubTotalScoped(row, "past");
                        const rowFutureScoped = getSubTotalScoped(row, "future");
                        const rowVisibleScoped = rowPastScoped + rowFutureScoped;
                        const rowPastCap = getRoleCapacity(row.roleId, "past");
                        const rowFutureCap = getRoleCapacity(row.roleId, "future");
                        const rowTotalCap = getRoleCapacity(row.roleId, "all");
                        return (
                          <TableRow key={row.roleId}>
                            <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm pl-6">{row.roleName}</TableCell>
                            <TableCell className="text-right text-sm font-medium border-l">
                              <div>{formatValue(rowPast, rowPastCap)}</div>
                              {viewMode === "actual" && <VarianceLabel actual={rowPast} scoped={rowPastScoped} unitMode={unitMode} capacity={rowPastCap} scopedCapacity={rowPastCap} showNA />}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              <div>{formatValue(rowFuture, rowFutureCap)}</div>
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium border-r">
                              <div>{formatValue(rowTotal, rowTotalCap)}</div>
                              {viewMode === "actual" && <VarianceLabel actual={rowTotal} scoped={rowVisibleScoped} unitMode={unitMode} capacity={rowTotalCap} scopedCapacity={rowTotalCap} showNA />}
                            </TableCell>
                            {months.map((m) => {
                              const cell = getCellValue(row, m);
                              const mCap = getRoleMonthCap(row.roleId, m);
                              return (
                                <TableCell key={m} className={cn("text-center text-sm", m < currentMonth && "bg-muted/30")}>
                                  {cell.value > 0 ? (
                                    <>
                                      <div>{formatValue(cell.value, mCap)}</div>
                                      {cell.showVariance && <VarianceLabel actual={cell.value} scoped={cell.scoped} unitMode={unitMode} capacity={mCap} scopedCapacity={mCap} />}
                                    </>
                                  ) : "—"}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                      {otherRow && getTotalValue(otherRow) > 0 && (
                        <TableRow key={otherRow.roleId} className="text-muted-foreground">
                          <TableCell className="sticky left-0 bg-background z-10 text-sm pl-6">
                            <span className="flex items-center gap-1.5">
                              <span className="italic">Other</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[240px]">
                                    <p className="text-xs">Roles that never exceed 5% of monthly hours: {otherRoleNames.join(", ")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm border-l">
                            <div>{formatValue(getSubTotal(otherRow, "past"), getMultiRoleCapacity(otherRoleIds, "past"))}</div>
                            {viewMode === "actual" && <VarianceLabel actual={getSubTotal(otherRow, "past")} scoped={getSubTotalScoped(otherRow, "past")} unitMode={unitMode} capacity={getMultiRoleCapacity(otherRoleIds, "past")} scopedCapacity={getMultiRoleCapacity(otherRoleIds, "past")} showNA />}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            <div>{formatValue(getSubTotal(otherRow, "future"), getMultiRoleCapacity(otherRoleIds, "future"))}</div>
                          </TableCell>
                          <TableCell className="text-right text-sm border-r">
                            <div>{formatValue(getTotalValue(otherRow), getMultiRoleCapacity(otherRoleIds, "all"))}</div>
                            {viewMode === "actual" && <VarianceLabel actual={getTotalValue(otherRow)} scoped={getSubTotalScoped(otherRow, "all")} unitMode={unitMode} capacity={getMultiRoleCapacity(otherRoleIds, "all")} scopedCapacity={getMultiRoleCapacity(otherRoleIds, "all")} showNA />}
                          </TableCell>
                          {months.map((m) => {
                            const cell = getCellValue(otherRow, m);
                            const mCap = getMultiRoleMonthCap(otherRoleIds, m);
                            return (
                              <TableCell key={m} className={cn("text-center text-sm", m < currentMonth && "bg-muted/30")}>
                                {cell.value > 0 ? (
                                  <>
                                    <div>{formatValue(cell.value, mCap)}</div>
                                    {cell.showVariance && <VarianceLabel actual={cell.value} scoped={cell.scoped} unitMode={unitMode} capacity={mCap} scopedCapacity={mCap} />}
                                  </>
                                ) : "—"}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      )}
                    </>
                    );
                  })}
                  <TableRow className="border-t-2 font-bold bg-muted/60">
                    <TableCell className="sticky left-0 bg-muted/60 z-10 uppercase text-xs tracking-wider">Total</TableCell>
                    <TableCell className="text-right border-l">
                      <div>{formatValue(pastTotal, totalPastCap)}</div>
                      {viewMode === "actual" && <VarianceLabel actual={pastTotal} scoped={pastTotalScoped} unitMode={unitMode} capacity={totalPastCap} scopedCapacity={totalPastCap} showNA />}
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatValue(futureTotal, totalFutureCap)}</div>
                    </TableCell>
                    <TableCell className="text-right border-r">
                      <div>{formatValue(visibleTotal, totalAllCap)}</div>
                      {viewMode === "actual" && <VarianceLabel actual={visibleTotal} scoped={pastTotalScoped + futureTotalScoped} unitMode={unitMode} capacity={totalAllCap} scopedCapacity={totalAllCap} showNA />}
                    </TableCell>
                    {months.map((m) => {
                      const isPast = m < currentMonth;
                      const value = isPast && viewMode === "actual"
                        ? (monthTotals.actualTotals[m] || 0)
                        : (monthTotals.scopedTotals[m] || 0);
                      const scoped = monthTotals.scopedTotals[m] || 0;
                      const mCap = getMultiRoleMonthCap(allDisplayRoleIds, m);
                      return (
                        <TableCell key={m} className={cn("text-center", m < currentMonth && "bg-muted/30")}>
                          {value > 0 ? (
                            <>
                              <div>{formatValue(value, mCap)}</div>
                              {viewMode === "actual" && isPast && <VarianceLabel actual={value} scoped={scoped} unitMode={unitMode} capacity={mCap} scopedCapacity={mCap} />}
                            </>
                          ) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <ClientTeamBuilder clientName={selectedClient} roleDemands={roleDemands} months={months.filter(m => m >= currentMonth)} clientOffice={selectedOffice} />
        </>
      )}
    </div>
  );
};

export default ClientPortfolioPage;
