import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  format, parseISO, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval,
  eachDayOfInterval, isWeekend, isBefore, isAfter, addDays, addWeeks, addMonths, endOfMonth,
  differenceInCalendarDays, max as dateMax, min as dateMin
} from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, X, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

const getInitials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]).join("").toUpperCase();

const PHASE_COLORS = [
  "bg-blue-500/20 border-blue-500 text-blue-700",
  "bg-emerald-500/20 border-emerald-500 text-emerald-700",
  "bg-amber-500/20 border-amber-500 text-amber-700",
  "bg-violet-500/20 border-violet-500 text-violet-700",
  "bg-rose-500/20 border-rose-500 text-rose-700",
  "bg-cyan-500/20 border-cyan-500 text-cyan-700",
];

export function ProjectPlanningOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOffice, setFilterOffice] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [timeGranularity, setTimeGranularity] = useState<"weeks" | "months">("months");
  const periodsToShow = timeGranularity === "weeks" ? 16 : 9;
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [assigningTarget, setAssigningTarget] = useState<{
    scopeId: string;
    phaseId: string;
    phaseName: string;
    roleName: string;
    roleId: string;
    projectTitle: string;
  } | null>(null);

  const timelineStart = useMemo(() => {
    if (timeGranularity === "months") {
      return addMonths(startOfMonth(new Date()), monthOffset);
    }
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(base, weekOffset);
  }, [weekOffset, monthOffset, timeGranularity]);

  const timelineEnd = useMemo(() => {
    if (timeGranularity === "months") {
      return endOfMonth(addMonths(timelineStart, periodsToShow - 1));
    }
    return addWeeks(timelineStart, periodsToShow);
  }, [timelineStart, periodsToShow, timeGranularity]);

  type TimeColumn = { key: string; label: string; start: Date; end: Date };

  const columns: TimeColumn[] = useMemo(() => {
    if (timeGranularity === "months") {
      const monthStarts = eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
      return monthStarts.slice(0, periodsToShow).map((ms) => ({
        key: format(ms, "yyyy-MM"),
        label: format(ms, "MMM yyyy"),
        start: ms,
        end: endOfMonth(ms),
      }));
    }
    const end = addWeeks(timelineStart, periodsToShow - 1);
    const weekStarts = eachWeekOfInterval(
      { start: timelineStart, end: addDays(end, 4) },
      { weekStartsOn: 1 }
    );
    return weekStarts.slice(0, periodsToShow).map((ws) => ({
      key: format(ws, "yyyy-MM-dd"),
      label: format(ws, "dd MMM"),
      start: ws,
      end: addDays(ws, 4),
    }));
  }, [timelineStart, timelineEnd, periodsToShow, timeGranularity]);

  // Total timeline width in calendar days for positioning
  const totalTimelineDays = useMemo(() => differenceInCalendarDays(timelineEnd, timelineStart), [timelineStart, timelineEnd]);

  // Fetch projects and phases first to identify plannable projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["planning_projects_overview"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, start_date, end_date, office, stage, opportunity_number")
          .order("title")
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["planning_phases_overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_phases")
        .select("id, project_id, start_date, end_date, phase_name, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Identify projects with confirmed phases
  const projectsWithConfirmedPhases = useMemo(() => {
    const ids = new Set<string>();
    phases.forEach((ph: any) => {
      if (ph.start_date && ph.end_date) ids.add(ph.project_id);
    });
    return Array.from(ids);
  }, [phases]);

  // Only fetch scopes for projects that have confirmed phases (avoids 1000-row limit)
  const { data: scopes = [] } = useQuery({
    queryKey: ["planning_project_scopes_overview", projectsWithConfirmedPhases],
    enabled: projectsWithConfirmedPhases.length > 0,
    queryFn: async () => {
      // Fetch in batches if needed
      const allScopes: any[] = [];
      for (let i = 0; i < projectsWithConfirmedPhases.length; i += 20) {
        const batch = projectsWithConfirmedPhases.slice(i, i + 20);
        const { data, error } = await supabase
          .from("project_scopes")
          .select("id, project_id, scoped_hours, role_id, roles(name)")
          .in("project_id", batch);
        if (error) throw error;
        if (data) allScopes.push(...data);
      }
      return allScopes;
    },
  });

  const { data: phaseAllocations = [] } = useQuery({
    queryKey: ["planning_phase_allocs_overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phase_allocations")
        .select("id, phase_id, project_scope_id, hours, allocation_id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["planning_allocations_overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("id, person_id, allocated_hours, project_scope_id, people(id, name)");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["planning_all_people"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, name, role_id, office, roles(name)")
          .order("name")
          .range(from, from + 999);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return allData;
    },
  });

  // Assign person mutation: create allocation + link to one or more phases
  const assignPerson = useMutation({
    mutationFn: async ({ personId, scopeId, phaseIds }: { personId: string; scopeId: string; phaseIds: string[] }) => {
      // Get or create allocation for this person + scope
      let allocId: string;
      const existing = allocations.find((a: any) => a.person_id === personId && a.project_scope_id === scopeId);
      if (existing) {
        allocId = existing.id;
      } else {
        const scope = scopes.find((s: any) => s.id === scopeId);
        const { data, error } = await supabase
          .from("allocations")
          .insert({ person_id: personId, project_scope_id: scopeId, allocated_hours: scope?.scoped_hours || 0 })
          .select("id")
          .single();
        if (error) throw error;
        allocId = data.id;
      }
      // Link to each phase and auto-distribute daily hours
      for (const phaseId of phaseIds) {
        const unlinkedPa = phaseAllocations.find(
          (pa: any) => pa.phase_id === phaseId && pa.project_scope_id === scopeId && !pa.allocation_id
        );
        if (unlinkedPa) {
          const { error } = await supabase
            .from("phase_allocations")
            .update({ allocation_id: allocId })
            .eq("id", unlinkedPa.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("phase_allocations")
            .insert({ phase_id: phaseId, project_scope_id: scopeId, allocation_id: allocId, hours: 0 });
          if (error) throw error;
        }

        // Auto-distribute hours across working days of this phase
        const phase = phases.find((ph: any) => ph.id === phaseId);
        if (phase?.start_date && phase?.end_date) {
          // Get the phase_allocation hours for this scope+phase
          const pa = phaseAllocations.find(
            (p: any) => p.phase_id === phaseId && p.project_scope_id === scopeId
          );
          const phaseHours = pa?.hours || 0;

          if (phaseHours > 0) {
            // Count how many people will be assigned to this phase+scope (including this new one)
            const assignedCount = phaseAllocations.filter(
              (p: any) => p.phase_id === phaseId && p.project_scope_id === scopeId && p.allocation_id
            ).length + (unlinkedPa ? 0 : 1); // +1 if we just inserted a new one
            const personShare = phaseHours / Math.max(assignedCount, 1);

            // Get working days in phase
            const phaseStart = parseISO(phase.start_date);
            const phaseEnd = parseISO(phase.end_date);
            const workingDays = eachDayOfInterval({ start: phaseStart, end: phaseEnd })
              .filter((d) => !isWeekend(d));

            if (workingDays.length > 0) {
              const hoursPerDay = Math.round((personShare / workingDays.length) * 100) / 100;
              if (hoursPerDay > 0) {
                const dailyRows = workingDays.map((d) => ({
                  allocation_id: allocId,
                  date: format(d, "yyyy-MM-dd"),
                  hours: hoursPerDay,
                }));
                const { error: dailyErr } = await supabase
                  .from("daily_allocations")
                  .insert(dailyRows);
                if (dailyErr) throw dailyErr;
              }
            }
          }
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_allocations_overview"] });
      queryClient.invalidateQueries({ queryKey: ["planning_phase_allocs_overview"] });
      queryClient.invalidateQueries({ queryKey: ["planning_all_daily_allocs"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Unassign person mutation: unlink allocation from phase_allocation
  const unassignPerson = useMutation({
    mutationFn: async ({ paId, allocId }: { paId: string; allocId: string }) => {
      // Remove daily_allocations for this allocation
      const { error: dailyErr } = await supabase
        .from("daily_allocations")
        .delete()
        .eq("allocation_id", allocId);
      if (dailyErr) throw dailyErr;
      const { error } = await supabase
        .from("phase_allocations")
        .update({ allocation_id: null })
        .eq("id", paId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_allocations_overview"] });
      queryClient.invalidateQueries({ queryKey: ["planning_phase_allocs_overview"] });
      queryClient.invalidateQueries({ queryKey: ["planning_all_daily_allocs"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Delete allocation entirely (for scope-level unassign when no phase_allocation exists)
  const deleteAllocation = useMutation({
    mutationFn: async ({ allocId }: { allocId: string }) => {
      // Remove daily_allocations first
      const { error: dailyErr } = await supabase
        .from("daily_allocations")
        .delete()
        .eq("allocation_id", allocId);
      if (dailyErr) throw dailyErr;
      // Unlink phase_allocations
      const { error: unlinkError } = await supabase
        .from("phase_allocations")
        .update({ allocation_id: null })
        .eq("allocation_id", allocId);
      if (unlinkError) throw unlinkError;
      // Delete the allocation
      const { error } = await supabase
        .from("allocations")
        .delete()
        .eq("id", allocId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["planning_allocations_overview"] });
      queryClient.invalidateQueries({ queryKey: ["planning_phase_allocs_overview"] });
      queryClient.invalidateQueries({ queryKey: ["planning_all_daily_allocs"] });
    },
    onError: (e) => toast.error(e.message),
  });

  // Determine which projects are "plannable" (have scoped hours + at least one phase with dates)
  const plannableProjectIds = useMemo(() => {
    const ids = new Set<string>();
    projects.forEach((p: any) => {
      const hasScope = scopes.some((s: any) => s.project_id === p.id && s.scoped_hours > 0);
      const hasConfirmedPhase = phases.some((ph: any) => ph.project_id === p.id && ph.start_date && ph.end_date);
      if (hasScope && hasConfirmedPhase) ids.add(p.id);
    });
    return ids;
  }, [projects, scopes, phases]);

  // Build rows: project → scope (role) → phase bars
  const scopeRows = useMemo(() => {
    return scopes.map((scope: any) => {
      const project = projects.find((p: any) => p.id === scope.project_id);
      if (!project) return null;
      if (!plannableProjectIds.has(project.id)) return null;

      const projectPhases = phases.filter((ph: any) => ph.project_id === scope.project_id);
      const scopePhaseAllocs = phaseAllocations.filter((pa: any) => pa.project_scope_id === scope.id);
      const scopeAllocs = allocations.filter((a: any) => a.project_scope_id === scope.id);
      const assignedPeople = scopeAllocs.map((a: any) => (a as any).people?.name).filter(Boolean) as string[];

      // Build phase bars for this scope
      const bars = projectPhases
        .filter((ph: any) => ph.start_date && ph.end_date)
        .map((ph: any) => {
          // Sum all phase_allocation hours for this phase+scope
          const phaseAllocs = scopePhaseAllocs.filter((spa: any) => spa.phase_id === ph.id);
          const hours = phaseAllocs.reduce((sum: number, pa: any) => sum + Number(pa.hours), 0);
          if (hours <= 0) return null;

          const phaseStart = parseISO(ph.start_date);
          const phaseEnd = parseISO(ph.end_date);

          // Clamp to visible timeline
          const visStart = dateMax([phaseStart, timelineStart]);
          const visEnd = dateMin([phaseEnd, addDays(timelineEnd, -1)]);
          if (isBefore(visEnd, visStart)) return null;

          const leftDays = differenceInCalendarDays(visStart, timelineStart);
          const widthDays = differenceInCalendarDays(visEnd, visStart) + 1;
          const leftPct = (leftDays / totalTimelineDays) * 100;
          const widthPct = (widthDays / totalTimelineDays) * 100;

          // Get all assigned people for this phase via phase_allocations linked to allocations
          const phasePeopleDetails: { personId: string; name: string; allocId: string; paId: string }[] = [];
          for (const pha of phaseAllocs) {
            if (pha.allocation_id) {
              const alloc = allocations.find((a: any) => a.id === pha.allocation_id);
              if (alloc && (alloc as any).people?.name) {
                phasePeopleDetails.push({
                  personId: (alloc as any).people.id,
                  name: (alloc as any).people.name,
                  allocId: pha.allocation_id,
                  paId: pha.id,
                });
              }
            }
          }
          const phasePeople = phasePeopleDetails.map((d) => d.name);
                          // Each block only shows its own direct assignments — no fallback
                          const effectivePeople = phasePeople;
                          const effectiveDetails = phasePeopleDetails;

          // Split hours across assigned people
          const peopleCount = effectivePeople.length || 1;
          const hoursPerPerson = Math.round((hours / peopleCount) * 100) / 100;

          return {
            phaseId: ph.id,
            phaseName: ph.phase_name,
            hours,
            hoursPerPerson,
            leftPct,
            widthPct,
            sortOrder: ph.sort_order,
            paId: phaseAllocs[0]?.id,
            assignedPeople: effectivePeople,
            assignedDetails: effectiveDetails,
          };
        })
        .filter(Boolean) as any[];

      return {
        scopeId: scope.id,
        roleId: scope.role_id,
        projectId: project.id,
        projectTitle: project.title,
        opportunityNumber: project.opportunity_number,
        office: project.office,
        roleName: (scope as any).roles?.name || "Unknown",
        scopedHours: scope.scoped_hours,
        assignedPeople,
        bars,
      };
    }).filter(Boolean) as any[];
  }, [projects, scopes, phases, phaseAllocations, allocations, timelineStart, timelineEnd, totalTimelineDays, plannableProjectIds]);

  // Consolidate: merge scope rows with the same role within the same project
  const consolidatedRows = useMemo(() => {
    const map: Record<string, any> = {};
    scopeRows.forEach((r: any) => {
      const key = `${r.projectId}__${r.roleId}`;
      if (!map[key]) {
        map[key] = { ...r, scopeIds: [r.scopeId], scopedHours: r.scopedHours, assignedPeople: [...r.assignedPeople], bars: [...r.bars] };
      } else {
        map[key].scopeIds.push(r.scopeId);
        map[key].scopedHours += r.scopedHours;
        // Merge bars: combine bars for the same phase, add unique ones
        r.bars.forEach((bar: any) => {
          const existing = map[key].bars.find((b: any) => b.phaseId === bar.phaseId);
          if (existing) {
            existing.hours += bar.hours;
            existing.hoursPerPerson = existing.hours / (existing.assignedPeople.length || 1);
            // Merge assigned people/details
            bar.assignedDetails?.forEach((d: any) => {
              if (!existing.assignedDetails.some((ed: any) => ed.personId === d.personId && ed.paId === d.paId)) {
                existing.assignedDetails.push(d);
                existing.assignedPeople.push(d.name);
              }
            });
          } else {
            map[key].bars.push({ ...bar });
          }
        });
        // Merge assigned people (deduplicate)
        r.assignedPeople.forEach((name: string) => {
          if (!map[key].assignedPeople.includes(name)) {
            map[key].assignedPeople.push(name);
          }
        });
      }
    });
    return Object.values(map).filter((r: any) => r.bars.length > 0);
  }, [scopeRows]);

  // Filter
  const filterOptions = useMemo(() => {
    const offices = new Set<string>();
    const roles = new Set<string>();
    consolidatedRows.forEach((r: any) => {
      if (r.office) offices.add(r.office);
      if (r.roleName) roles.add(r.roleName);
    });
    return {
      offices: Array.from(offices).sort(),
      roles: Array.from(roles).sort(),
    };
  }, [consolidatedRows]);

  const filteredRows = useMemo(() => {
    return consolidatedRows.filter((r: any) => {
      if (filterOffice !== "all" && r.office !== filterOffice) return false;
      if (filterRole !== "all" && r.roleName !== filterRole) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.projectTitle.toLowerCase().includes(q) && !r.roleName.toLowerCase().includes(q) && !(r.assignedPeople || []).some((n: string) => n.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [consolidatedRows, filterOffice, filterRole, searchQuery]);

  // Group by project
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredRows.forEach((r: any) => {
      if (!map[r.projectId]) map[r.projectId] = [];
      map[r.projectId].push(r);
    });
    return Object.entries(map).map(([projectId, rows]) => ({
      projectId,
      projectTitle: rows[0].projectTitle,
      opportunityNumber: rows[0].opportunityNumber,
      rows,
    })).sort((a, b) => a.projectTitle.localeCompare(b.projectTitle));
  }, [filteredRows]);

  // getPeopleForRole removed — filtering now done inside AssignPersonPopover

  const hasActiveFilters = filterOffice !== "all" || filterRole !== "all" || searchQuery !== "";

  if (isLoading) {
    return <div className="text-muted-foreground p-8">Loading projects...</div>;
  }

  return (
    <div className="space-y-0">
      <div className="sticky top-[92px] z-30 bg-background pb-3 space-y-3">
      {/* Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search projects, roles, people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 pr-8"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <Select value={filterOffice} onValueChange={setFilterOffice}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Office" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Offices</SelectItem>
                {filterOptions.offices.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Roles</SelectItem>
                {filterOptions.roles.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setFilterOffice("all"); setFilterRole("all"); }} className="h-8 text-xs px-2">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => {
          if (timeGranularity === "months") setMonthOffset((o) => o - 1);
          else setWeekOffset((o) => o - 4);
        }} className="h-7 text-xs">
          <ChevronLeft className="h-3 w-3 mr-1" /> {timeGranularity === "months" ? "1 month" : "4 weeks"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          setWeekOffset(0);
          setMonthOffset(0);
        }} className="h-7 text-xs">
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (timeGranularity === "months") setMonthOffset((o) => o + 1);
          else setWeekOffset((o) => o + 4);
        }} className="h-7 text-xs">
          {timeGranularity === "months" ? "1 month" : "4 weeks"} <ChevronRight className="h-3 w-3 ml-1" />
        </Button>

        <div className="ml-auto">
          <ToggleGroup
            type="single"
            value={timeGranularity}
            onValueChange={(v) => { if (v) setTimeGranularity(v as "weeks" | "months"); }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="weeks" className="text-xs px-3">Weeks</ToggleGroupItem>
            <ToggleGroupItem value="months" className="text-xs px-3">Months</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      </div>

      <div className="mt-3">

      {/* Table with Gantt bars */}
      {filteredRows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">No projects match the current filters.</div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="text-xs border-separate border-spacing-0 w-full" style={{ minWidth: `${150 + columns.length * (timeGranularity === "months" ? 80 : 56)}px` }}>
              <tbody>
                {grouped.map(({ projectId, projectTitle, opportunityNumber, rows }) => (
                  <>
                    <tr key={`project-${projectId}`}>
                      <td
                        className="p-1.5 bg-muted/60 sticky left-0 z-20 cursor-pointer hover:bg-muted/80 border-r border-border" style={{ width: 150, maxWidth: 150 }}
                        onClick={() => navigate(`/projects/${projectId}`)}
                      >
                        <div className="font-semibold text-xs leading-tight break-words whitespace-normal">{projectTitle}</div>
                        {opportunityNumber && (
                          <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">{opportunityNumber}</div>
                        )}
                      </td>
                      {columns.map((w) => (
                        <td key={w.key} className="bg-muted/60 text-center p-1 text-[10px] font-medium text-muted-foreground border-l border-border/30">
                          {w.label}
                        </td>
                      ))}
                    </tr>
                    {rows.map((row: any, rowIdx: number) => {
                      const colorClass = PHASE_COLORS[rowIdx % PHASE_COLORS.length];
                      return (
                        <tr key={row.scopeId} className="border-t border-border/30 hover:bg-muted/10">
                          <td className="py-0.5 px-1 pl-3 sticky left-0 bg-background z-20 border-r border-border align-top" style={{ width: 150, maxWidth: 150 }}>
                            <div className="font-medium text-[10px] leading-tight mt-0.5">{row.roleName}</div>
                            <div className="text-muted-foreground text-[9px] leading-tight">
                              {(() => {
                                // Only show people actually assigned to phase bars, not scope-level allocations
                                const barAssignedNames = new Set<string>();
                                row.bars.forEach((b: any) => {
                                  b.assignedDetails.forEach((d: any) => { barAssignedNames.add(d.name); });
                                });
                                const names = Array.from(barAssignedNames);
                                return names.length > 0
                                  ? names.map((name: string, i: number) => (
                                      <div key={i}>{name}</div>
                                    ))
                                  : "Unassigned";
                              })()}
                              <div>{Math.round(row.scopedHours)}h</div>
                            </div>
                          </td>
                          {/* Phase bars stacked vertically */}
                          <td colSpan={columns.length} className="p-0 relative" style={{ height: Math.max(row.bars.length * 14 + 4, 18) }}>
                            <div className="absolute inset-0">
                              {/* Gridlines */}
                              <div className="flex h-full">
                                {columns.map((w: any) => (
                                  <div key={w.key} className="flex-1 border-l border-border/10" />
                                ))}
                              </div>
                              {/* Phase bars */}
                              {row.bars.map((bar: any, barIdx: number) => (
                                <Popover
                                  key={bar.phaseId}
                                  open={assigningTarget?.phaseId === bar.phaseId && assigningTarget?.scopeId === row.scopeId}
                                  onOpenChange={(open) => {
                                    if (!open) setAssigningTarget(null);
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      className={cn(
                                        "absolute rounded border text-[9px] leading-none font-medium flex items-center px-1 truncate cursor-pointer hover:opacity-80 transition-opacity",
                                        PHASE_COLORS[bar.sortOrder % PHASE_COLORS.length]
                                      )}
                                      style={{
                                        left: `${bar.leftPct}%`,
                                        width: `${Math.max(bar.widthPct, 2)}%`,
                                        top: barIdx * 14 + 2,
                                        height: 12,
                                      }}
                                      title={`${row.roleName} · ${bar.phaseName} · ${Math.round(bar.hours)}h${bar.assignedPeople.length > 0 ? ` · ${bar.assignedPeople.join(", ")}` : ''}`}
                                      onClick={() => {
                                        setAssigningTarget({
                                          scopeId: row.scopeId,
                                          phaseId: bar.phaseId,
                                          phaseName: bar.phaseName,
                                          roleName: row.roleName,
                                          roleId: row.roleId,
                                          projectTitle,
                                        });
                                      }}
                                    >
                                      <span className="truncate">
                                        {bar.assignedPeople.length > 0 ? bar.assignedPeople.map(getInitials).join(", ") : bar.phaseName} · {Math.round(bar.hoursPerPerson)}h{bar.assignedPeople.length > 1 ? '/pp' : ''}
                                      </span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-3" align="start">
                                    <AssignPersonPopover
                                      roleName={assigningTarget?.roleName || ""}
                                      roleId={row.roleId}
                                      phaseName={assigningTarget?.phaseName || ""}
                                      projectOffice={row.office || "UK"}
                                      people={people}
                                      assignedDetails={bar.assignedDetails}
                                         onToggle={(personId, isAssigned) => {
                                         if (isAssigned) {
                                          // Check if this person is the ONLY person assigned across ALL bars for this scope
                                          const allAssignedPersonIds = new Set<string>();
                                          row.bars.forEach((b: any) => {
                                            b.assignedDetails.forEach((d: any) => { allAssignedPersonIds.add(d.personId); });
                                          });
                                          const isOnlyPerson = allAssignedPersonIds.size === 1 && allAssignedPersonIds.has(personId);

                                          if (isOnlyPerson) {
                                            // Only one person across all bars — remove from ALL bars
                                            row.bars.forEach((b: any) => {
                                              b.assignedDetails.forEach((d: any) => {
                                                if (d.personId === personId && d.paId) {
                                                  unassignPerson.mutate({ paId: d.paId, allocId: d.allocId });
                                                }
                                              });
                                            });
                                          } else {
                                            // Multiple people — only remove from this specific bar
                                            const detail = bar.assignedDetails.find((d: any) => d.personId === personId);
                                            if (detail && detail.paId) {
                                              unassignPerson.mutate({ paId: detail.paId, allocId: detail.allocId });
                                            } else if (detail && detail.allocId) {
                                              deleteAllocation.mutate({ allocId: detail.allocId });
                                            }
                                          }
                                        } else {
                                          // Check if anyone is already explicitly assigned to any phase for this scope
                                          const hasAnyPhaseAssignment = phaseAllocations.some(
                                            (pa: any) => pa.project_scope_id === row.scopeId && pa.allocation_id
                                          );
                                          if (!hasAnyPhaseAssignment) {
                                            // First person: assign to ALL phases for this role
                                            const allPhaseIds = row.bars.map((b: any) => b.phaseId);
                                            assignPerson.mutate({ personId, scopeId: row.scopeId, phaseIds: allPhaseIds });
                                          } else {
                                            // Subsequent person: assign only to this specific phase
                                            assignPerson.mutate({ personId, scopeId: row.scopeId, phaseIds: [bar.phaseId] });
                                          }
                                        }
                                      }}
                                      onClose={() => setAssigningTarget(null)}
                                    />
                                  </PopoverContent>
                                </Popover>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

// Popover content for assigning a person
function AssignPersonPopover({
  roleName,
  roleId,
  phaseName,
  projectOffice,
  people,
  assignedDetails,
  onToggle,
  onClose,
}: {
  roleName: string;
  roleId: string;
  phaseName: string;
  projectOffice: string;
  people: any[];
  assignedDetails: { personId: string; name: string; allocId: string; paId: string }[];
  onToggle: (personId: string, isCurrentlyAssigned: boolean) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [showOtherOffice, setShowOtherOffice] = useState(false);
  const [showOtherRoles, setShowOtherRoles] = useState(false);
  // Optimistic local toggle tracking
  const [pendingAssigns, setPendingAssigns] = useState<Set<string>>(new Set());
  const [pendingUnassigns, setPendingUnassigns] = useState<Set<string>>(new Set());

  const baseAssignedIds = new Set(assignedDetails.map((d) => d.personId));
  // Merge optimistic state: add pending assigns, remove pending unassigns
  const assignedIds = new Set([...baseAssignedIds, ...pendingAssigns].filter(id => !pendingUnassigns.has(id)));
  // Normalize office: projects use "United Kingdom"/"United States", people use "UK"/"US"
  const normalizeOffice = (o: string) => {
    if (!o) return "";
    const lower = o.toLowerCase();
    if (lower === "uk" || lower === "united kingdom") return "UK";
    if (lower === "us" || lower === "united states") return "US";
    return o;
  };
  const normProjectOffice = normalizeOffice(projectOffice);
  const otherOffice = normProjectOffice === "UK" ? "US" : "UK";

  // Primary list: matching role + matching office
  const primaryPeople = people.filter((p: any) => p.role_id === roleId && normalizeOffice(p.office) === normProjectOffice);
  // Same role, other office
  const otherOfficePeople = people.filter((p: any) => p.role_id === roleId && normalizeOffice(p.office) !== normProjectOffice);
  // Other roles, same office
  const otherRolePeople = people.filter((p: any) => p.role_id !== roleId && normalizeOffice(p.office) === normProjectOffice);

  const filterBySearch = (list: any[]) =>
    search ? list.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase())) : list;

  const sortByAssigned = (list: any[]) =>
    [...list].sort((a: any, b: any) => {
      const aA = assignedIds.has(a.id) ? 0 : 1;
      const bA = assignedIds.has(b.id) ? 0 : 1;
      return aA - bA || a.name.localeCompare(b.name);
    });

  const handleToggle = (personId: string) => {
    const isCurrentlyAssigned = assignedIds.has(personId);
    if (isCurrentlyAssigned) {
      setPendingUnassigns(prev => new Set([...prev, personId]));
      setPendingAssigns(prev => { const n = new Set(prev); n.delete(personId); return n; });
    } else {
      setPendingAssigns(prev => new Set([...prev, personId]));
      setPendingUnassigns(prev => { const n = new Set(prev); n.delete(personId); return n; });
    }
    onToggle(personId, isCurrentlyAssigned);
  };

  const renderPerson = (p: any) => {
    const isAssigned = assignedIds.has(p.id);
    return (
      <button
        key={p.id}
        className={cn(
          "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted/60 flex items-center gap-2",
          isAssigned && "bg-muted/40"
        )}
        onClick={() => handleToggle(p.id)}
      >
        <div className={cn(
          "h-3.5 w-3.5 rounded-sm border flex items-center justify-center flex-shrink-0",
          isAssigned ? "bg-primary border-primary" : "border-muted-foreground/40"
        )}>
          {isAssigned && (
            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="flex-1 truncate">{p.name}</span>
        <span className="text-muted-foreground text-[10px] flex-shrink-0">{(p as any).roles?.name}</span>
      </button>
    );
  };

  const primaryFiltered = sortByAssigned(filterBySearch(primaryPeople));
  const otherOfficeFiltered = sortByAssigned(filterBySearch(otherOfficePeople));
  const otherRoleFiltered = sortByAssigned(filterBySearch(otherRolePeople));

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold">{roleName} · {phaseName}</div>
      <div className="text-[10px] text-muted-foreground">{normProjectOffice} office</div>
      <Input
        placeholder="Search people..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs"
        autoFocus
      />
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {primaryFiltered.length === 0 ? (
          <div className="text-xs text-muted-foreground py-2 text-center">
            No {roleName}s in {normProjectOffice}
          </div>
        ) : (
          primaryFiltered.map(renderPerson)
        )}

        {showOtherOffice && otherOfficeFiltered.length > 0 && (
          <>
            <div className="text-[10px] font-medium text-muted-foreground pt-2 pb-0.5 px-1 border-t border-border/40 mt-1">
              {roleName} · {otherOffice}
            </div>
            {otherOfficeFiltered.map(renderPerson)}
          </>
        )}

        {showOtherRoles && otherRoleFiltered.length > 0 && (
          <>
            <div className="text-[10px] font-medium text-muted-foreground pt-2 pb-0.5 px-1 border-t border-border/40 mt-1">
              Other roles · {normProjectOffice}
            </div>
            {otherRoleFiltered.map(renderPerson)}
          </>
        )}
      </div>
      <div className="flex flex-col gap-1 pt-1 border-t border-border/40">
        {otherOfficePeople.length > 0 && (
          <Button variant={showOtherOffice ? "secondary" : "ghost"} size="sm" className="w-full text-xs h-7 justify-start" onClick={() => setShowOtherOffice(!showOtherOffice)}>
            {showOtherOffice ? `Hide ${roleName} in ${otherOffice}` : `Show ${roleName} in ${otherOffice}`}
          </Button>
        )}
        <Button variant={showOtherRoles ? "secondary" : "ghost"} size="sm" className="w-full text-xs h-7 justify-start" onClick={() => setShowOtherRoles(!showOtherRoles)}>
          {showOtherRoles ? `Hide other roles in ${normProjectOffice}` : `Show other roles in ${normProjectOffice}`}
        </Button>
      </div>
    </div>
  );
}
