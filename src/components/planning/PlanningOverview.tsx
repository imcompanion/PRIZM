import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  format, parseISO, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval,
  eachDayOfInterval, isWeekend, isBefore, isAfter, addDays, addWeeks, addMonths, endOfMonth
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, X, Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function PlanningOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOffice, setFilterOffice] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [timeGranularity, setTimeGranularity] = useState<"weeks" | "months">("weeks");
  const periodsToShow = timeGranularity === "weeks" ? 12 : 9;
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Timeline: 12 weeks from current week
  const timelineStart = useMemo(() => {
    if (timeGranularity === "months") {
      return addMonths(startOfMonth(new Date()), monthOffset);
    }
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(base, weekOffset);
  }, [weekOffset, monthOffset, timeGranularity]);

  type TimeColumn = { key: string; label: string; start: Date; end: Date };

  const weeks: TimeColumn[] = useMemo(() => {
    if (timeGranularity === "months") {
      const end = addMonths(timelineStart, periodsToShow - 1);
      const monthStarts = eachMonthOfInterval({ start: timelineStart, end });
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
  }, [timelineStart, periodsToShow, timeGranularity]);

  // Fetch all people with roles
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["planning_people"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, name, team, office, role_id, roles(name)")
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

  // Fetch all allocations with project info
  const { data: allocations = [] } = useQuery({
    queryKey: ["planning_all_allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("id, person_id, allocated_hours, project_scope_id, project_scopes(id, project_id, scoped_hours, projects(id, title, start_date, end_date))");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all daily allocations
  const { data: dailyAllocations = [] } = useQuery({
    queryKey: ["planning_all_daily_allocs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_allocations")
        .select("id, allocation_id, date, hours");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch phase allocations + phases for spreading hours
  const { data: allPhases = [] } = useQuery({
    queryKey: ["planning_all_phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_phases")
        .select("id, project_id, start_date, end_date, phase_name")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allPhaseAllocations = [] } = useQuery({
    queryKey: ["planning_all_phase_allocs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("phase_allocations")
        .select("phase_id, project_scope_id, hours");
      if (error) throw error;
      return data || [];
    },
  });

  // Build allocation-to-person map
  const allocByPerson = useMemo(() => {
    const map: Record<string, typeof allocations> = {};
    allocations.forEach((a: any) => {
      if (!a.person_id) return;
      if (!map[a.person_id]) map[a.person_id] = [];
      map[a.person_id].push(a);
    });
    return map;
  }, [allocations]);

  // Build daily alloc by allocation_id
  const dailyByAlloc = useMemo(() => {
    const map: Record<string, typeof dailyAllocations> = {};
    dailyAllocations.forEach((da: any) => {
      if (!map[da.allocation_id]) map[da.allocation_id] = [];
      map[da.allocation_id].push(da);
    });
    return map;
  }, [dailyAllocations]);

  // Filter options
  const filterOptions = useMemo(() => {
    const offices = new Set<string>();
    const roles = new Set<string>();
    const teams = new Set<string>();
    people.forEach((p: any) => {
      if (p.office) offices.add(p.office);
      if (p.roles?.name) roles.add(p.roles.name);
      if (p.team) teams.add(p.team);
    });
    return {
      offices: Array.from(offices).sort(),
      roles: Array.from(roles).sort(),
      teams: Array.from(teams).sort(),
    };
  }, [people]);

  // Filter people
  const filteredPeople = useMemo(() => {
    return people.filter((p: any) => {
      if (filterOffice !== "all" && p.office !== filterOffice) return false;
      if (filterRole !== "all" && p.roles?.name !== filterRole) return false;
      if (filterTeam !== "all" && p.team !== filterTeam) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !(p.roles?.name || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [people, filterOffice, filterRole, filterTeam, searchQuery]);

  // Group filtered people by Office → Team
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, typeof filteredPeople>> = {};
    filteredPeople.forEach((p: any) => {
      const office = p.office || "Unknown";
      const team = p.team || "Unassigned";
      if (!map[office]) map[office] = {};
      if (!map[office][team]) map[office][team] = [];
      map[office][team].push(p);
    });
    // Sort
    const sorted: { office: string; teams: { team: string; people: any[] }[] }[] = [];
    Object.keys(map).sort().forEach((office) => {
      const teams = Object.keys(map[office]).sort().map((team) => ({
        team,
        people: map[office][team].sort((a: any, b: any) => a.name.localeCompare(b.name)),
      }));
      sorted.push({ office, teams });
    });
    return sorted;
  }, [filteredPeople]);

  // Memoize all person weekly hours and projects at once
  const { allPersonWeeklyHours, allPersonProjects } = useMemo(() => {
    const allHours: Record<string, Record<string, number>> = {};
    const allProjects: Record<string, string[]> = {};

    Object.entries(allocByPerson).forEach(([personId, personAllocs]) => {
      const weeklyHours: Record<string, number> = {};
      const projectSet = new Set<string>();

      personAllocs.forEach((alloc: any) => {
        const title = (alloc as any).project_scopes?.projects?.title;
        if (title) projectSet.add(title);

        const dailies = dailyByAlloc[alloc.id] || [];

        if (dailies.length > 0) {
          dailies.forEach((da: any) => {
            const d = parseISO(da.date);
            weeks.forEach((w) => {
              if (!isBefore(d, w.start) && !isAfter(d, w.end)) {
                weeklyHours[w.key] = (weeklyHours[w.key] || 0) + Number(da.hours);
              }
            });
          });
        } else {
          const project = (alloc as any).project_scopes?.projects;
          if (!project) return;
          const projStart = parseISO(project.start_date);
          const projEnd = parseISO(project.end_date);
          const scopeId = alloc.project_scope_id;

          const scopePhaseAllocs = allPhaseAllocations.filter(
            (pa: any) => pa.project_scope_id === scopeId
          );

          if (scopePhaseAllocs.length > 0) {
            scopePhaseAllocs.forEach((pa: any) => {
              const phase = allPhases.find((ph: any) => ph.id === pa.phase_id);
              if (!phase || !phase.start_date || !phase.end_date) return;
              const phaseStart = parseISO(phase.start_date);
              const phaseEnd = parseISO(phase.end_date);
              const phaseDays = eachDayOfInterval({ start: phaseStart, end: phaseEnd }).filter((d) => !isWeekend(d));
              if (phaseDays.length === 0) return;
              const hoursPerDay = Number(pa.hours) / phaseDays.length;
              weeks.forEach((w) => {
                const daysInWeek = phaseDays.filter((d) => !isBefore(d, w.start) && !isAfter(d, w.end)).length;
                if (daysInWeek > 0) weeklyHours[w.key] = (weeklyHours[w.key] || 0) + hoursPerDay * daysInWeek;
              });
            });
          } else if (alloc.allocated_hours > 0) {
            try {
              const totalWorkDays = eachDayOfInterval({ start: projStart, end: projEnd }).filter((d) => !isWeekend(d)).length;
              if (totalWorkDays > 0) {
                const hoursPerDay = Number(alloc.allocated_hours) / totalWorkDays;
                weeks.forEach((w) => {
                  const daysInWeek = eachDayOfInterval({ start: w.start, end: w.end })
                    .filter((d) => !isWeekend(d) && !isBefore(d, projStart) && !isAfter(d, projEnd)).length;
                  if (daysInWeek > 0) weeklyHours[w.key] = (weeklyHours[w.key] || 0) + hoursPerDay * daysInWeek;
                });
              }
            } catch { /* date range error */ }
          }
        }
      });

      allHours[personId] = weeklyHours;
      allProjects[personId] = Array.from(projectSet);
    });

    return { allPersonWeeklyHours: allHours, allPersonProjects: allProjects };
  }, [allocByPerson, dailyByAlloc, weeks, allPhaseAllocations, allPhases]);

  const hasActiveFilters = filterOffice !== "all" || filterRole !== "all" || filterTeam !== "all" || searchQuery !== "";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterOffice("all");
    setFilterRole("all");
    setFilterTeam("all");
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-8">Loading people...</div>;
  }

  return (
    <div className="space-y-0">
      <div className="sticky top-[92px] z-20 bg-background pb-3 space-y-3">
      {/* Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search people or roles..."
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

            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Teams</SelectItem>
                {filterOptions.teams.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
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
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs px-2">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mt-2 text-xs text-muted-foreground">
              Showing {filteredPeople.length} of {people.length} people
            </div>
          )}
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
        <Button variant="outline" size="sm" onClick={() => { setWeekOffset(0); setMonthOffset(0); }} className="h-7 text-xs">
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

      {/* People table */}
      {filteredPeople.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          {people.length === 0 ? "No people added yet." : "No people match the current filters."}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="text-xs border-separate border-spacing-0 w-full" style={{ minWidth: `${220 + weeks.length * 64}px` }}>
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium sticky left-0 bg-background z-10 border-r border-border" style={{ minWidth: 220 }}>
                    Person / Role
                  </th>
                  <th className="text-center p-2 font-medium" style={{ minWidth: 60 }}>Projects</th>
                  {weeks.map((w) => (
                    <th key={w.key} className="text-center p-2 font-medium text-muted-foreground" style={{ minWidth: 56 }}>
                      {w.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ office, teams }) => (
                  <>
                    {/* Office header */}
                    <tr key={`office-${office}`}>
                      <td
                        colSpan={2 + weeks.length}
                        className="p-2 bg-muted/60 font-semibold text-sm sticky left-0 z-10"
                      >
                        {office}
                      </td>
                    </tr>
                    {teams.map(({ team, people: teamPeople }) => (
                      <>
                        {/* Team header */}
                        <tr key={`team-${office}-${team}`}>
                          <td
                            colSpan={2 + weeks.length}
                            className="p-2 pl-6 bg-muted/30 font-medium text-xs text-muted-foreground sticky left-0 z-10"
                          >
                            {team}
                          </td>
                        </tr>
                        {teamPeople.map((person: any) => {
                          const weeklyHours = allPersonWeeklyHours[person.id] || {};
                          const projects = allPersonProjects[person.id] || [];
                          return (
                            <tr key={person.id} className="border-t border-border/50 hover:bg-muted/20">
                              <td className="p-2 sticky left-0 bg-background z-10 border-r border-border">
                                <div className="font-medium">{person.name}</div>
                                <div className="text-muted-foreground">{person.roles?.name || "—"}</div>
                              </td>
                              <td className="text-center p-2 text-muted-foreground">
                                {projects.length > 0 ? (
                                  <span title={projects.join("\n")} className="cursor-help">{projects.length}</span>
                                ) : "—"}
                              </td>
                              {weeks.map((w) => {
                                const hrs = weeklyHours[w.key] || 0;
                                return (
                                  <td key={w.key} className="text-center p-1">
                                    {hrs > 0.1 ? (
                                      <div className="bg-primary/10 text-primary rounded px-1 py-0.5">
                                        {Math.round(hrs)}h
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground/30">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
