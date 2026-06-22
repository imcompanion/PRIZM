import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseISO, eachDayOfInterval, isWeekend, format, startOfMonth, addMonths, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { calculateInternalCostPerHour, formatCurrency } from "@/lib/calculations";

interface ProjectPhasesTabProps {
  projectId: string;
  projectStartDate: string;
  projectEndDate: string;
  scopes: Array<{
    id: string;
    role_id: string;
    scoped_hours: number;
    roles?: { name: string; billable_capacity_hours: number };
    allocations?: Array<{ allocated_hours: number; people?: { name: string } }>;
  }>;
  rateCardRates?: Record<string, number>;
  currency?: string;
  budgetedCostByRole?: Record<string, number>;
}

interface GroupedRow {
  key: string;
  label: string;
  scopedHours: number;
  monthlyHours: Record<string, number>;
}

interface ActualRow {
  key: string;
  label: string;
  totalHours: number;
  monthlyHours: Record<string, number>;
}

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

function getMonthRange(start: Date, end: Date): string[] {
  const months: string[] = [];
  let current = startOfMonth(start);
  const last = startOfMonth(end);
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

function VarianceLabel({ actual, scoped, costPerHour, budgetedCostPerHour, currency }: { actual: number; scoped: number; costPerHour?: number; budgetedCostPerHour?: number; currency?: string }) {
  const diff = actual - scoped;
  if (Math.abs(diff) < 0.5) return null;
  const isOver = diff > 0;
  // Cost variance: actual_cost - budgeted_cost (captures both volume and rate effects)
  const actualCost = costPerHour ? actual * costPerHour : 0;
  const budgetedCost = (budgetedCostPerHour || costPerHour) ? scoped * (budgetedCostPerHour || costPerHour!) : 0;
  const costDiff = actualCost - budgetedCost;
  const isCostOver = costDiff > 0;
  const colorClass = isOver ? "text-destructive" : "text-success";
  return (
    <div className={cn("text-[10px] font-medium leading-tight", colorClass)}>
      <span>{isOver ? "+" : ""}{Math.round(diff)}h</span>
      {(costPerHour || budgetedCostPerHour) && Math.abs(costDiff) >= 1 ? (
        <span className={cn("ml-1", isCostOver ? "text-destructive" : "text-success")}>{isCostOver ? "+" : "−"}{formatCurrency(Math.abs(costDiff), currency)}</span>
      ) : null}
    </div>
  );
}

// ── Toggle Button ──

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

// ── Main Component ──

type ViewMode = "scoped" | "actual";
type GroupMode = "role" | "team";

export function ProjectPhasesTab({
  projectId,
  projectStartDate,
  projectEndDate,
  scopes,
  currency,
  budgetedCostByRole: budgetedCostByRoleProp,
}: ProjectPhasesTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("scoped");
  const [groupMode, setGroupMode] = useState<GroupMode>("role");

  const { data: scopeData = [], isLoading } = useQuery({
    queryKey: ["project_scopes_phases", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_scopes")
        .select("id, role_id, scoped_hours, phase_percentages")
        .eq("project_id", projectId);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["project_time_entries_phases", projectId],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("hours, date, person_id, people(role_id, team, annual_salary, roles(name, billable_capacity_hours))")
          .eq("project_id", projectId)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  // Fetch people for role→team mapping (used for scoped team view)
  const { data: peopleData = [] } = useQuery({
    queryKey: ["people_for_team_mapping"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, role_id, team")
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const projectStart = parseISO(projectStartDate);
  const projectEnd = parseISO(projectEndDate);
  const months = useMemo(() => getMonthRange(projectStart, projectEnd), [projectStartDate, projectEndDate]);

  // ── Role-level scoped data ──
  const roleMonthlyData = useMemo(() => {
    return scopeData
      .map((scope) => {
        const roleInfo = scopes.find((s) => s.id === scope.id);
        const phasePcts = (scope.phase_percentages as Record<string, number>) || {};
        const monthlyHours = computeMonthlyHours(projectStart, projectEnd, scope.scoped_hours, phasePcts);
        return {
          key: scope.id,
          label: roleInfo?.roles?.name || "Unknown",
          roleId: scope.role_id,
          scopedHours: scope.scoped_hours,
          monthlyHours,
        };
      })
      .sort((a, b) => b.scopedHours - a.scopedHours);
  }, [scopeData, scopes, projectStartDate, projectEndDate]);

  // ── Team-level scoped data (aggregate role scopes by team) ──
  const teamScopedData = useMemo(() => {
    // Build role_id → primary team mapping from people
    const roleTeamCount: Record<string, Record<string, number>> = {};
    for (const p of peopleData) {
      if (!p.role_id || !p.team) continue;
      if (!roleTeamCount[p.role_id]) roleTeamCount[p.role_id] = {};
      roleTeamCount[p.role_id][p.team] = (roleTeamCount[p.role_id][p.team] || 0) + 1;
    }
    // For each role, pick the most common team
    const roleToTeam: Record<string, string> = {};
    for (const [roleId, teams] of Object.entries(roleTeamCount)) {
      let bestTeam = "Unassigned";
      let bestCount = 0;
      for (const [team, count] of Object.entries(teams)) {
        if (count > bestCount) { bestTeam = team; bestCount = count; }
      }
      roleToTeam[roleId] = bestTeam;
    }

    const teamMap: Record<string, GroupedRow> = {};
    for (const role of roleMonthlyData) {
      const team = roleToTeam[role.roleId || ""] || "Unassigned";
      if (!teamMap[team]) {
        teamMap[team] = { key: team, label: team, scopedHours: 0, monthlyHours: {} };
      }
      teamMap[team].scopedHours += role.scopedHours;
      mergeMonthlyHours(teamMap[team].monthlyHours, role.monthlyHours);
    }
    return Object.values(teamMap).sort((a, b) => b.scopedHours - a.scopedHours);
  }, [roleMonthlyData, peopleData]);

  // ── Role-level actual data ──
  const { actualByRole, unscopedRoles } = useMemo(() => {
    const scopedRoleIds = new Set(scopeData.map(s => s.role_id));
    const roleMap: Record<string, { roleName: string; totalHours: number; monthlyHours: Record<string, number> }> = {};
    for (const te of timeEntries) {
      const roleId = te.people?.role_id || "unknown";
      const roleName = te.people?.roles?.name || "Unassigned";
      const monthKey = (te.date as string).substring(0, 7);
      if (!roleMap[roleId]) {
        roleMap[roleId] = { roleName, totalHours: 0, monthlyHours: {} };
      }
      roleMap[roleId].totalHours += te.hours;
      roleMap[roleId].monthlyHours[monthKey] = (roleMap[roleId].monthlyHours[monthKey] || 0) + te.hours;
    }
    const scoped: Record<string, { roleName: string; totalHours: number; monthlyHours: Record<string, number> }> = {};
    const unscoped: Array<{ roleId: string; roleName: string; totalHours: number; monthlyHours: Record<string, number> }> = [];
    for (const [roleId, data] of Object.entries(roleMap)) {
      if (scopedRoleIds.has(roleId)) {
        scoped[roleId] = data;
      } else {
        unscoped.push({ roleId, ...data });
      }
    }
    return { actualByRole: scoped, unscopedRoles: unscoped.sort((a, b) => b.totalHours - a.totalHours) };
  }, [timeEntries, scopeData]);

  // ── Team-level actual data ──
  const { actualByTeam, unscopedTeams } = useMemo(() => {
    // Determine which teams are "scoped" by checking people mapping
    const scopedTeams = new Set(teamScopedData.map(t => t.label));
    const teamMap: Record<string, ActualRow> = {};
    for (const te of timeEntries) {
      const team = te.people?.team || "Unassigned";
      const monthKey = (te.date as string).substring(0, 7);
      if (!teamMap[team]) {
        teamMap[team] = { key: team, label: team, totalHours: 0, monthlyHours: {} };
      }
      teamMap[team].totalHours += te.hours;
      teamMap[team].monthlyHours[monthKey] = (teamMap[team].monthlyHours[monthKey] || 0) + te.hours;
    }
    const scoped: Record<string, ActualRow> = {};
    const unscoped: ActualRow[] = [];
    for (const [team, data] of Object.entries(teamMap)) {
      if (scopedTeams.has(team)) {
        scoped[team] = data;
      } else {
        unscoped.push(data);
      }
    }
    return { actualByTeam: scoped, unscopedTeams: unscoped.sort((a, b) => b.totalHours - a.totalHours) };
  }, [timeEntries, teamScopedData]);

  // ── Internal cost per role ──
  const internalCostByRole = useMemo(() => {
    const roleCosts: Record<string, { totalCost: number; totalHours: number }> = {};
    for (const te of timeEntries) {
      const roleId = te.people?.role_id || "unknown";
      const salary = te.people?.annual_salary;
      const billableCap = te.people?.roles?.billable_capacity_hours || 7.5;
      if (!salary || salary <= 0) continue;
      const costPerHour = calculateInternalCostPerHour(salary, billableCap);
      if (!roleCosts[roleId]) roleCosts[roleId] = { totalCost: 0, totalHours: 0 };
      roleCosts[roleId].totalCost += costPerHour * te.hours;
      roleCosts[roleId].totalHours += te.hours;
    }
    const avgCost: Record<string, number> = {};
    for (const [roleId, data] of Object.entries(roleCosts)) {
      avgCost[roleId] = data.totalHours > 0 ? data.totalCost / data.totalHours : 0;
    }
    return avgCost;
  }, [timeEntries]);

  // ── Internal cost per team ──
  const internalCostByTeam = useMemo(() => {
    const teamCosts: Record<string, { totalCost: number; totalHours: number }> = {};
    for (const te of timeEntries) {
      const team = te.people?.team || "Unassigned";
      const salary = te.people?.annual_salary;
      const billableCap = te.people?.roles?.billable_capacity_hours || 7.5;
      if (!salary || salary <= 0) continue;
      const costPerHour = calculateInternalCostPerHour(salary, billableCap);
      if (!teamCosts[team]) teamCosts[team] = { totalCost: 0, totalHours: 0 };
      teamCosts[team].totalCost += costPerHour * te.hours;
      teamCosts[team].totalHours += te.hours;
    }
    const avgCost: Record<string, number> = {};
    for (const [team, data] of Object.entries(teamCosts)) {
      avgCost[team] = data.totalHours > 0 ? data.totalCost / data.totalHours : 0;
    }
    return avgCost;
  }, [timeEntries]);

  // ── Totals ──
  const scopedRows = groupMode === "role" ? roleMonthlyData : teamScopedData;
  const scopedMonthTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of scopedRows) {
      mergeMonthlyHours(totals, row.monthlyHours);
    }
    return totals;
  }, [scopedRows]);
  const grandTotalScoped = scopedRows.reduce((s, r) => s + r.scopedHours, 0);

  const actualMonthTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const actualMap = groupMode === "role" ? actualByRole : actualByTeam;
    const unscopedArr = groupMode === "role"
      ? unscopedRoles.map(r => r as { monthlyHours: Record<string, number> })
      : unscopedTeams;
    for (const data of Object.values(actualMap)) {
      mergeMonthlyHours(totals, data.monthlyHours ?? (data as any).monthlyHours);
    }
    for (const r of unscopedArr) {
      mergeMonthlyHours(totals, r.monthlyHours);
    }
    return totals;
  }, [groupMode, actualByRole, actualByTeam, unscopedRoles, unscopedTeams]);

  const actualGrandTotal = useMemo(() => {
    const actualMap = groupMode === "role" ? actualByRole : actualByTeam;
    const unscopedArr = groupMode === "role" ? unscopedRoles : unscopedTeams;
    return Object.values(actualMap).reduce((s, r) => s + ((r as any).totalHours ?? 0), 0)
      + unscopedArr.reduce((s, r) => s + ((r as any).totalHours ?? 0), 0);
  }, [groupMode, actualByRole, actualByTeam, unscopedRoles, unscopedTeams]);

  const avgCostPerHour = useMemo(() => {
    let totalCost = 0;
    let totalHours = 0;
    for (const te of timeEntries) {
      const salary = te.people?.annual_salary;
      const billableCap = te.people?.roles?.billable_capacity_hours || 7.5;
      if (!salary || salary <= 0) continue;
      totalCost += calculateInternalCostPerHour(salary, billableCap) * te.hours;
      totalHours += te.hours;
    }
    return totalHours > 0 ? totalCost / totalHours : 0;
  }, [timeEntries]);

  // Budgeted avg cost per hour (weighted by scoped hours)
  const avgBudgetedCostPerHour = useMemo(() => {
    if (!budgetedCostByRoleProp) return avgCostPerHour;
    let totalCost = 0;
    let totalHours = 0;
    for (const role of roleMonthlyData) {
      const roleId = role.roleId || "";
      const rate = budgetedCostByRoleProp[roleId];
      if (rate && role.scopedHours > 0) {
        totalCost += rate * role.scopedHours;
        totalHours += role.scopedHours;
      }
    }
    return totalHours > 0 ? totalCost / totalHours : avgCostPerHour;
  }, [budgetedCostByRoleProp, roleMonthlyData, avgCostPerHour]);

  // Build budgeted cost per team (aggregate from roles)
  const budgetedCostByTeam = useMemo(() => {
    if (!budgetedCostByRoleProp) return {};
    const result: Record<string, number> = {};
    for (const team of teamScopedData) {
      let totalBudgetedCost = 0;
      let totalHours = 0;
      for (const role of roleMonthlyData) {
        const roleId = role.roleId || "";
        const budgetedRate = budgetedCostByRoleProp[roleId];
        if (budgetedRate && role.scopedHours > 0) {
          const roleTeamMapping = peopleData.filter(p => p.role_id === roleId);
          const primaryTeam = roleTeamMapping.length > 0
            ? Object.entries(roleTeamMapping.reduce((acc, p) => {
                const t = p.team || "Unassigned";
                acc[t] = (acc[t] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "Unassigned"
            : "Unassigned";
          if (primaryTeam === team.label) {
            totalBudgetedCost += budgetedRate * role.scopedHours;
            totalHours += role.scopedHours;
          }
        }
      }
      if (totalHours > 0) {
        result[team.label] = totalBudgetedCost / totalHours;
      }
    }
    return result;
  }, [budgetedCostByRoleProp, roleMonthlyData, teamScopedData, peopleData]);

  if (isLoading) return <div className="text-muted-foreground p-4">Loading phases...</div>;

  if (scopeData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No scoped roles for this project. Import scopes via Settings → Data → Scopes.</p>
        </CardContent>
      </Card>
    );
  }

  const isScoped = viewMode === "scoped";
  const isRoleView = groupMode === "role";
  const groupLabel = isRoleView ? "Role" : "Team";

  // Build actual rows for display
  const actualScopedRows: Array<{ key: string; label: string; scoped: number; actual: number; scopedMonthly: Record<string, number>; actualMonthly: Record<string, number>; costPerHour: number; budgetedCostPerHour: number }> = [];

  if (isRoleView) {
    for (const role of roleMonthlyData) {
      const actual = actualByRole[role.roleId || ""];
      actualScopedRows.push({
        key: role.key,
        label: role.label,
        scoped: role.scopedHours,
        actual: actual?.totalHours || 0,
        scopedMonthly: role.monthlyHours,
        actualMonthly: actual?.monthlyHours || {},
        costPerHour: internalCostByRole[role.roleId || ""] || 0,
        budgetedCostPerHour: budgetedCostByRoleProp?.[role.roleId || ""] || internalCostByRole[role.roleId || ""] || 0,
      });
    }
  } else {
    for (const team of teamScopedData) {
      const actual = actualByTeam[team.label];
      actualScopedRows.push({
        key: team.key,
        label: team.label,
        scoped: team.scopedHours,
        actual: actual?.totalHours || 0,
        scopedMonthly: team.monthlyHours,
        actualMonthly: actual?.monthlyHours || {},
        costPerHour: internalCostByTeam[team.label] || 0,
        budgetedCostPerHour: budgetedCostByTeam[team.label] || internalCostByTeam[team.label] || 0,
      });
    }
  }

  // Sort actual rows by variance (actual - scoped), smallest first
  actualScopedRows.sort((a, b) => (a.actual - a.scoped) - (b.actual - b.scoped));

  const unscopedActualRows: Array<{ key: string; label: string; totalHours: number; monthlyHours: Record<string, number>; costPerHour: number }> = (isRoleView
    ? unscopedRoles.map(r => ({ key: r.roleId, label: r.roleName, totalHours: r.totalHours, monthlyHours: r.monthlyHours, costPerHour: internalCostByRole[r.roleId] || 0 }))
    : unscopedTeams.map(t => ({ key: t.key, label: t.label, totalHours: t.totalHours, monthlyHours: t.monthlyHours, costPerHour: internalCostByTeam[t.label] || 0 }))
  ).sort((a, b) => a.totalHours - b.totalHours);

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            {isScoped ? "Scoped" : "Actual"} Hours by {groupLabel} & Month
          </h3>
          <div className="flex items-center gap-2">
            <ToggleGroup
              value={groupMode}
              onChange={(v) => setGroupMode(v as GroupMode)}
              options={[
                { value: "role", label: "By Role" },
                { value: "team", label: "By Team" },
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
                <TableHead className="sticky left-0 bg-background z-10 min-w-[160px]">{groupLabel}</TableHead>
                <TableHead className="text-right min-w-[80px]">Total</TableHead>
                {months.map((m) => (
                  <TableHead key={m} className="text-center min-w-[80px] text-xs">
                    {format(parseISO(`${m}-01`), "MMM yyyy")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isScoped ? (
                <>
                  {scopedRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{row.label}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{Math.round(row.scopedHours)}h</TableCell>
                      {months.map((m) => {
                        const hours = row.monthlyHours[m] || 0;
                        return (
                          <TableCell key={m} className="text-center text-sm">
                            {hours > 0 ? `${Math.round(hours)}h` : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold bg-muted/60">
                    <TableCell className="sticky left-0 bg-muted/60 z-10 uppercase text-xs tracking-wider">Total</TableCell>
                    <TableCell className="text-right">{Math.round(grandTotalScoped)}h</TableCell>
                    {months.map((m) => (
                      <TableCell key={m} className="text-center">
                        {scopedMonthTotals[m] ? `${Math.round(scopedMonthTotals[m])}h` : "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                </>
              ) : (
                <>
                  {actualScopedRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{row.label}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        <div>{Math.round(row.actual)}h</div>
                        <VarianceLabel actual={row.actual} scoped={row.scoped} costPerHour={row.costPerHour} budgetedCostPerHour={row.budgetedCostPerHour} currency={currency} />
                      </TableCell>
                      {months.map((m) => {
                        const actualHours = row.actualMonthly[m] || 0;
                        const scopedHours = row.scopedMonthly[m] || 0;
                        return (
                          <TableCell key={m} className="text-center text-sm">
                            {actualHours > 0 ? (
                              <>
                                <div>{Math.round(actualHours)}h</div>
                                <VarianceLabel actual={actualHours} scoped={scopedHours} costPerHour={row.costPerHour} budgetedCostPerHour={row.budgetedCostPerHour} currency={currency} />
                              </>
                            ) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {unscopedActualRows.map((row) => (
                    <TableRow key={row.key} className="bg-muted/30">
                      <TableCell className="sticky left-0 bg-muted/30 z-10 font-medium text-sm italic">
                        {row.label}
                        <span className="text-[10px] text-muted-foreground ml-1">(unscoped)</span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        <div>{Math.round(row.totalHours)}h</div>
                        <VarianceLabel actual={row.totalHours} scoped={0} costPerHour={row.costPerHour} currency={currency} />
                      </TableCell>
                      {months.map((m) => {
                        const hours = row.monthlyHours[m] || 0;
                        return (
                          <TableCell key={m} className="text-center text-sm">
                            {hours > 0 ? (
                              <>
                                <div>{Math.round(hours)}h</div>
                                <VarianceLabel actual={hours} scoped={0} costPerHour={row.costPerHour} currency={currency} />
                              </>
                            ) : "—"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold bg-muted/60">
                    <TableCell className="sticky left-0 bg-muted/60 z-10 uppercase text-xs tracking-wider">Total</TableCell>
                    <TableCell className="text-right">
                      <div>{Math.round(actualGrandTotal)}h</div>
                      <VarianceLabel actual={actualGrandTotal} scoped={grandTotalScoped} costPerHour={avgCostPerHour} budgetedCostPerHour={avgBudgetedCostPerHour} currency={currency} />
                    </TableCell>
                    {months.map((m) => {
                      const actual = actualMonthTotals[m] || 0;
                      const scoped = scopedMonthTotals[m] || 0;
                      return (
                        <TableCell key={m} className="text-center">
                          {actual > 0 ? (
                            <>
                              <div>{Math.round(actual)}h</div>
                              <VarianceLabel actual={actual} scoped={scoped} costPerHour={avgCostPerHour} budgetedCostPerHour={avgBudgetedCostPerHour} currency={currency} />
                            </>
                          ) : "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
