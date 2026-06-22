import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { eachDayOfInterval, isWeekend, format } from "date-fns";
import { cn } from "@/lib/utils";

interface BurnVsScopeProps {
  team: string;
  roleNames: string[]; // empty => all roles in team
  startDate: Date;
  endDate: Date;
  officeFilter: "Global" | "UK" | "US" | string;
  showFormer: boolean;
}

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function computeScopeInWindow(
  projectStart: Date,
  projectEnd: Date,
  scopedHours: number,
  phasePcts: Record<string, number>,
  winStart: Date,
  winEnd: Date,
): number {
  if (scopedHours <= 0) return 0;
  if (projectEnd < winStart || projectStart > winEnd) return 0;

  const totalPct = Object.values(phasePcts || {}).reduce((s, v) => s + (Number(v) || 0), 0);

  // Fallback: distribute uniformly across project working days if no phase % data
  if (totalPct <= 0) {
    const allDays = eachDayOfInterval({ start: projectStart, end: projectEnd }).filter((d) => !isWeekend(d));
    if (allDays.length === 0) return 0;
    const perDay = scopedHours / allDays.length;
    const inWin = allDays.filter((d) => d >= winStart && d <= winEnd).length;
    return perDay * inWin;
  }

  const totalDays = Math.max(1, Math.round((projectEnd.getTime() - projectStart.getTime()) / 86400000) + 1);
  const daysPerPhase = totalDays / 12;
  let total = 0;
  for (let phase = 1; phase <= 12; phase++) {
    const pct =
      phasePcts[`Phase ${phase}`] ??
      phasePcts[`phase ${phase}`] ??
      phasePcts[`Phase${phase}`] ??
      phasePcts[String(phase)] ??
      0;
    if (!pct || pct <= 0) continue;
    const phaseHours = (Number(pct) / 100) * scopedHours;
    const phaseStart = new Date(projectStart.getTime() + Math.round((phase - 1) * daysPerPhase) * 86400000);
    const phaseEnd = new Date(projectStart.getTime() + (Math.round(phase * daysPerPhase) - 1) * 86400000);
    const allDays = eachDayOfInterval({ start: phaseStart, end: phaseEnd }).filter((d) => !isWeekend(d));
    if (allDays.length === 0) continue;
    const perDay = phaseHours / allDays.length;
    const inWin = allDays.filter((d) => d >= winStart && d <= winEnd).length;
    total += perDay * inWin;
  }
  return total;
}

const fmtH = (h: number) => `${Math.round(h).toLocaleString()}h`;

const ragBg = (burnPct: number | null) => {
  if (burnPct === null) return "";
  if (burnPct > 110) return "bg-destructive/20 text-destructive-foreground";
  if (burnPct > 100) return "bg-yellow-500/20";
  return "bg-emerald-500/15";
};

export default function BurnVsScope({ team, roleNames, startDate, endDate, officeFilter, showFormer }: BurnVsScopeProps) {
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  // 1. Roles (id ↔ name)
  const { data: roles = [] } = useQuery({
    queryKey: ["roles_all_for_burn"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name");
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  // 2. People (for team + role filtering)
  const { data: people = [] } = useQuery({
    queryKey: ["people_for_burn"],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, name, team, office, role_id, overall_start_date, overall_end_date")
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return all;
    },
  });

  // Map role name → id (case-insensitive)
  const roleNameToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of roles) m.set(norm(r.name), r.id);
    return m;
  }, [roles]);

  const selectedRoleIds = useMemo(() => {
    if (roleNames.length === 0) return null; // null => all
    const ids = new Set<string>();
    for (const n of roleNames) {
      const id = roleNameToId.get(norm(n));
      if (id) ids.add(id);
    }
    return ids;
  }, [roleNames, roleNameToId]);

  // People matching team + role filter + office + employment-window overlap.
  // If roles are selected, restrict to people in those roles; otherwise include the whole team.
  const personIds = useMemo(() => {
    const wanted = new Set<string>();
    const teamNorm = norm(team);
    for (const p of people) {
      if (norm(p.team) !== teamNorm) continue;
      if (selectedRoleIds && !selectedRoleIds.has(p.role_id)) continue;
      if (officeFilter !== "Global" && officeFilter !== "all") {
        const o = (p.office || "").toUpperCase();
        if (officeFilter === "UK" && !(o === "UK" || o === "UNITED KINGDOM")) continue;
        if (officeFilter === "US" && !(o === "US" || o === "UNITED STATES")) continue;
      }
      const empStart = p.overall_start_date ? new Date(p.overall_start_date) : null;
      const empEnd = p.overall_end_date ? new Date(p.overall_end_date) : null;
      if (empStart && empStart > endDate) continue;
      if (empEnd && empEnd < startDate) continue;
      // Burn vs Scope always includes current AND former employees, regardless of the page toggle.
      wanted.add(p.id);
    }
    return wanted;
  }, [people, team, selectedRoleIds, officeFilter, startDate, endDate]);

  // Role ids to use for scope filtering: selected roles if any, else all roles in the team.
  const scopeRoleIds = useMemo(() => {
    if (selectedRoleIds && selectedRoleIds.size > 0) return selectedRoleIds;
    const teamNorm = norm(team);
    const ids = new Set<string>();
    for (const p of people) {
      if (norm(p.team) !== teamNorm) continue;
      if (p.role_id) ids.add(p.role_id);
    }
    return ids;
  }, [people, team, selectedRoleIds]);

  // 3. Actual time entries in window, filtered to those people
  const { data: timeEntries = [], isLoading: teLoading } = useQuery({
    enabled: personIds.size > 0,
    queryKey: ["burn_time_entries", team, Array.from(personIds).sort().join(","), startStr, endStr],
    queryFn: async () => {
      const ids = Array.from(personIds);
      const out: any[] = [];
      const CHUNK = 200;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("time_entries")
            .select("project_id, person_id, hours, date")
            .in("person_id", slice)
            .gte("date", startStr)
            .lte("date", endStr)
            .not("project_id", "is", null)
            .range(from, from + 999);
          if (error) throw error;
          out.push(...(data || []));
          if (!data || data.length < 1000) break;
          from += 1000;
        }
      }
      return out as Array<{ project_id: string; person_id: string; hours: number; date: string }>;
    },
  });

  // Aggregate actuals by project
  const actualsByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const te of timeEntries) {
      m.set(te.project_id, (m.get(te.project_id) || 0) + Number(te.hours || 0));
    }
    return m;
  }, [timeEntries]);

  const projectIds = useMemo(() => Array.from(actualsByProject.keys()), [actualsByProject]);

  // 4. Project metadata + scopes for those projects (only selected role_ids)
  const { data: projectMeta = [] } = useQuery({
    enabled: projectIds.length > 0,
    queryKey: ["burn_projects_meta", projectIds.sort().join(",")],
    queryFn: async () => {
      const out: any[] = [];
      const CHUNK = 200;
      for (let i = 0; i < projectIds.length; i += CHUNK) {
        const slice = projectIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, opportunity_number, start_date, end_date, opportunity_record_type")
          .in("id", slice);
        if (error) throw error;
        out.push(...(data || []));
      }
      return out;
    },
  });

  const { data: scopes = [] } = useQuery({
    enabled: projectIds.length > 0 && scopeRoleIds.size > 0,
    queryKey: ["burn_scopes", projectIds.sort().join(","), Array.from(scopeRoleIds).sort().join(",")],
    queryFn: async () => {
      const out: any[] = [];
      const CHUNK = 200;
      const roleIdArr = Array.from(scopeRoleIds);
      for (let i = 0; i < projectIds.length; i += CHUNK) {
        const slice = projectIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("project_scopes")
          .select("project_id, role_id, scoped_hours, phase_percentages")
          .in("project_id", slice)
          .in("role_id", roleIdArr);
        if (error) throw error;
        out.push(...(data || []));
      }
      return out as Array<{ project_id: string; role_id: string; scoped_hours: number; phase_percentages: Record<string, number> }>;
    },
  });

  // 5. Build rows
  const rows = useMemo(() => {
    const projById = new Map(projectMeta.map((p) => [p.id, p]));
    // Group scoped hours in window by project
    const scopedInWindowByProject = new Map<string, number>();
    const lifetimeScopedByProject = new Map<string, number>();
    for (const s of scopes) {
      const proj = projById.get(s.project_id);
      if (!proj || !proj.start_date || !proj.end_date) continue;
      const pStart = new Date(proj.start_date);
      const pEnd = new Date(proj.end_date);
      const sliced = computeScopeInWindow(pStart, pEnd, Number(s.scoped_hours || 0), s.phase_percentages || {}, startDate, endDate);
      scopedInWindowByProject.set(s.project_id, (scopedInWindowByProject.get(s.project_id) || 0) + sliced);
      lifetimeScopedByProject.set(s.project_id, (lifetimeScopedByProject.get(s.project_id) || 0) + Number(s.scoped_hours || 0));
    }

    const out = projectIds.flatMap((pid) => {
      const proj = projById.get(pid);
      // Hide projects that ended before the period or start after it
      if (proj?.end_date && new Date(proj.end_date) < startDate) return [];
      if (proj?.start_date && new Date(proj.start_date) > endDate) return [];
      // Exclude non-billable record types (RFP / RFI pitches)
      const recType = (proj?.opportunity_record_type || "").toLowerCase();
      if (recType.includes("rfp") || recType.includes("rfi")) return [];
      const actual = actualsByProject.get(pid) || 0;
      const scoped = scopedInWindowByProject.get(pid) || 0;
      const lifetime = lifetimeScopedByProject.get(pid) || 0;
      const varianceH = actual - scoped;
      const burnPct = scoped > 0 ? (actual / scoped) * 100 : null;
      return [{
        projectId: pid,
        title: proj?.title || "Unknown project",
        opp: proj?.opportunity_number || "",
        scoped,
        actual,
        lifetime,
        varianceH,
        burnPct,
        hasScope: scoped > 0 || lifetime > 0,
      }];
    });

    out.sort((a, b) => {
      // overburns first (highest variance hours), then non-scoped, then under-burn
      const aScore = a.burnPct === null ? -Infinity : a.varianceH;
      const bScore = b.burnPct === null ? -Infinity : b.varianceH;
      return bScore - aScore;
    });
    return out;
  }, [projectIds, projectMeta, scopes, actualsByProject, startDate, endDate]);

  const scopedRows = useMemo(() => rows.filter((r) => r.hasScope), [rows]);
  const noScopeRows = useMemo(() => rows.filter((r) => !r.hasScope), [rows]);

  const totals = useMemo(() => {
    const scoped = scopedRows.reduce((s, r) => s + r.scoped, 0);
    const actual = scopedRows.reduce((s, r) => s + r.actual, 0);
    return {
      scoped,
      actual,
      varianceH: actual - scoped,
      burnPct: scoped > 0 ? (actual / scoped) * 100 : null,
    };
  }, [scopedRows]);

  const headerLabel =
    roleNames.length === 0
      ? `All roles in ${team}`
      : roleNames.length === 1
        ? `${roleNames[0]} — ${team}`
        : `${roleNames.length} roles — ${team}`;

  const timeframeLabel = `${format(startDate, "d MMM yyyy")} – ${format(endDate, "d MMM yyyy")}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center justify-between">
          <span>Burn vs Scope — {headerLabel}</span>
          {scopedRows.length > 0 && totals.burnPct !== null && (
            <span className={cn("text-sm font-normal px-2 py-0.5 rounded", ragBg(totals.burnPct))}>
              {(() => {
                const pct = Math.round(totals.burnPct);
                const diff = Math.abs(Math.round(totals.varianceH));
                const label = pct > 100 ? "OVER-BURN" : pct < 100 ? "UNDER-BURN" : "ON SCOPE";
                const delta = totals.scoped > 0 ? Math.round((Math.abs(totals.varianceH) / totals.scoped) * 100) : 0;
                return `${delta}% ${label} / ${diff.toLocaleString()}H`;
              })()}
            </span>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Actual hours burnt vs. scoped hours in {timeframeLabel} — excluding projects with no scope ({noScopeRows.length})
        </p>
        <p className="text-xs text-muted-foreground italic mt-1">
          Note: former employees are always included in this table, regardless of the page toggle.
        </p>
      </CardHeader>
      <CardContent>
        {teLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No hours logged by {roleNames.length === 0 ? "this team" : "the selected role(s)"} in the selected timeframe.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Scoped (in period)</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Burn %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scopedRows.map((r) => (
                <TableRow key={r.projectId}>
                  <TableCell>
                    <Link to={`/projects/${r.projectId}`} className="font-medium text-sm hover:underline hover:text-primary">
                      {r.title}
                    </Link>
                    {r.opp && <div className="text-xs text-muted-foreground">{r.opp}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtH(r.scoped)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtH(r.actual)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.varianceH >= 0 ? "+" : ""}{fmtH(r.varianceH)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.burnPct !== null ? (
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", ragBg(r.burnPct))}>
                        {Math.round(r.burnPct)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {scopedRows.length > 0 && (
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtH(totals.scoped)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtH(totals.actual)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.varianceH >= 0 ? "+" : ""}{fmtH(totals.varianceH)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {totals.burnPct !== null ? (
                      <span className={cn("px-2 py-0.5 rounded text-xs", ragBg(totals.burnPct))}>
                        {Math.round(totals.burnPct)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              )}

              {noScopeRows.length > 0 && (
                <>
                  <TableRow className="border-t-2 bg-muted/40">
                    <TableCell colSpan={5} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2">
                      Projects with no scope for this role ({noScopeRows.length}) — actuals only
                    </TableCell>
                  </TableRow>
                  {noScopeRows.map((r) => (
                    <TableRow key={r.projectId} className="text-muted-foreground">
                      <TableCell>
                        <Link to={`/projects/${r.projectId}`} className="font-medium text-sm hover:underline hover:text-primary">
                          {r.title}
                        </Link>
                        {r.opp && <div className="text-xs">{r.opp}</div>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">—</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtH(r.actual)}</TableCell>
                      <TableCell className="text-right tabular-nums">—</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-xs italic">No scope</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
