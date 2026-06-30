import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, eachMonthOfInterval, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { buildParentalLeaveMap, getWorkingDaysExcludingLeave } from "@/lib/parental-leave";
import {
  type TimeEntryForClassification,
  classifyEntry,
  fetchRulesWithConditions,
  fetchProjectIdSet,
  fetchProjectsForBillability,
  BILLABILITY_PROJECTS_QUERY_KEY,
  BILLABILITY_PROJECT_IDS_QUERY_KEY,
} from "@/lib/billability";

const HOURS_PER_DAY = 7.5;

function getWorkingDays(start: Date, end: Date): number {
  if (start > end) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}

interface TrendChartsProps {
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

const TrendCharts = ({ startDate, endDate, officeFilter, showFormer }: TrendChartsProps) => {
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

  const { data: monthlyData = [], isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["utilisation_summary_monthly", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    placeholderData: keepPreviousData,
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
      return allData as Array<{
        person_id: string;
        project_id: string | null;
        month_date: string;
        total_hours: number;
        leave_hours: number;
      }>;
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

  const { data: rules = [] } = useQuery({
    queryKey: ["billability_rules_full"],
    queryFn: fetchRulesWithConditions,
  });

  const { data: projectIdsRaw = [] } = useQuery({
    queryKey: BILLABILITY_PROJECT_IDS_QUERY_KEY,
    queryFn: fetchProjectIdSet,
  });
  const projectIds = useMemo(() => new Set(Array.isArray(projectIdsRaw) ? projectIdsRaw : []), [projectIdsRaw]);

  const parentalLeaveMap = useMemo(() => buildParentalLeaveMap(people), [people]);

  const allowedTeams = useMemo(() => new Set(["account management", "strategy", "strategy and innovation", "creative team", "paid media", "project management", "business affairs", "data"]), []);

  // Filter people by office + team + showFormer
  const filteredPeople = useMemo(() => {
    return people.filter((p: any) => {
      if (!matchesOffice(p.office, officeFilter)) return false;
      const team = (p.team || "").toLowerCase().trim();
      if (!allowedTeams.has(team)) return false;
      if (!showFormer) {
        const overallEnd = p.overall_end_date ? new Date(p.overall_end_date) : null;
        if (overallEnd && overallEnd < new Date()) return false;
      }
      return true;
    });
  }, [people, officeFilter, showFormer, allowedTeams]);

  // Build name -> IDs map for sibling dedup
  const nameToIds = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of filteredPeople) {
      const n = p.name.trim().toLowerCase();
      if (!map.has(n)) map.set(n, []);
      map.get(n)!.push(p.id);
    }
    return map;
  }, [filteredPeople]);

  const filteredPersonIds = useMemo(() => new Set(filteredPeople.map((p: any) => p.id)), [filteredPeople]);

  const chartData = useMemo(() => {
    if (monthlyData.length === 0 || filteredPeople.length === 0) return [];

    const months = eachMonthOfInterval({ start: startOfMonth(startDate), end: startOfMonth(endDate) });

    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const clampedStart = monthStart < startDate ? startDate : monthStart;
      const clampedEnd = monthEnd > endDate ? endDate : monthEnd;
      const monthKey = format(monthStart, "yyyy-MM-01");

      // Per-person expected hours for this month (deduped by name)
      const seenNames = new Set<string>();
      let totalExpected = 0;
      let totalExpectedBillable = 0;

      // Track per-person expected hours for capped completeness
      const personExpected = new Map<string, number>();

      for (const person of filteredPeople) {
        const normName = person.name.trim().toLowerCase();
        if (seenNames.has(normName)) continue;

        const empStart = person.employment_start_date ? new Date(person.employment_start_date)
          : person.overall_start_date ? new Date(person.overall_start_date) : null;
        const empEnd = person.employment_end_date ? new Date(person.employment_end_date)
          : person.overall_end_date ? new Date(person.overall_end_date) : null;

        // Check overlap with this month
        if (empStart && empStart > clampedEnd) continue;
        if (empEnd && empEnd < clampedStart) continue;

        const effectiveStart = empStart && empStart > clampedStart ? empStart : clampedStart;
        const effectiveEnd = empEnd && empEnd < clampedEnd ? empEnd : clampedEnd;
        if (effectiveStart > effectiveEnd) continue;

        seenNames.add(normName);
        const leaveIntervals = parentalLeaveMap.get(normName);
        const workingDays = getWorkingDaysExcludingLeave(effectiveStart, effectiveEnd, leaveIntervals);
        const role = (person as any).roles;
        const billableCapacity = role?.billable_capacity_hours != null 
          ? role.billable_capacity_hours / 5 
          : HOURS_PER_DAY;
        const expected = workingDays * HOURS_PER_DAY;
        totalExpected += expected;
        totalExpectedBillable += workingDays * billableCapacity;

        // Sum expected across sibling IDs for this name
        const siblingIds = nameToIds.get(normName) || [person.id];
        for (const sid of siblingIds) {
          personExpected.set(sid, expected / siblingIds.length);
        }
      }

      // Actual hours for this month from monthly data (only filtered people)
      const monthRows = monthlyData.filter(
        (r) => r.month_date === monthKey && filteredPersonIds.has(r.person_id)
      );

      // Aggregate actual hours per person (by name) for capped completeness
      const personActual = new Map<string, number>();
      let totalBillable = 0;
      let totalLeave = 0;
      let totalWorking = 0;

      for (const row of monthRows) {
        const hrs = Number(row.total_hours);
        const leaveHrs = Number(row.leave_hours);
        const nonLeaveHrs = hrs - leaveHrs;
        totalLeave += leaveHrs;

        // Accumulate per-person actual hours (by name)
        const person = filteredPeople.find((p: any) => p.id === row.person_id);
        if (person) {
          const normName = person.name.trim().toLowerCase();
          personActual.set(normName, (personActual.get(normName) || 0) + hrs);
        }

        if (nonLeaveHrs > 0) {
          totalWorking += nonLeaveHrs;
          const proj = projectsMap.get(row.project_id);
          const entry: TimeEntryForClassification = {
            id: "", date: "", hours: nonLeaveHrs, notes: null,
            project_id: row.project_id, person_id: row.person_id,
            people: null, projects: proj || null,
          };
          const { result } = classifyEntry(rules, entry, projectIds.has(row.project_id));
          if (result === "billable") totalBillable += nonLeaveHrs;
        }
      }

      // Calculate completeness as average of per-person capped scores
      let completenessSum = 0;
      let completenessCount = 0;
      const seenForCompleteness = new Set<string>();
      for (const [normName, expected] of Array.from(seenNames).map(n => [n, 0] as [string, number])) {
        // Find expected for this person
        const person = filteredPeople.find((p: any) => p.name.trim().toLowerCase() === normName);
        if (!person) continue;
        const siblingIds = nameToIds.get(normName) || [person.id];
        let exp = 0;
        for (const sid of siblingIds) {
          exp += personExpected.get(sid) || 0;
        }
        if (exp <= 0) continue;
        const actual = personActual.get(normName) || 0;
        completenessSum += Math.min(actual / exp, 1);
        completenessCount++;
      }

      const completeness = completenessCount > 0 ? (completenessSum / completenessCount) * 100 : 0;
      const utilisation = totalWorking > 0 ? (totalBillable / totalWorking) * 100 : 0;
      const benchmark = totalExpected > 0 ? (totalExpectedBillable / totalExpected) * 100 : 0;

      return {
        month: format(monthStart, "MMM yy"),
        completeness: Math.round(completeness),
        utilisation: Math.round(utilisation),
        benchmark: Math.round(benchmark),
      };
    });
  }, [monthlyData, filteredPeople, filteredPersonIds, startDate, endDate, projectsMap, rules, projectIds, parentalLeaveMap]);

  if (chartData.length <= 1 && !isLoadingMonthly) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Completeness Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-12">Select a longer time period to see trends</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Utilisation Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-12">Select a longer time period to see trends</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Completeness Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <YAxis domain={[75, 100]} ticks={[75, 80, 85, 90, 95, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} width={45} />
                <Tooltip formatter={(v: number, name: string) => [`${v}%`, name === "completeness" ? "Completeness" : ""]} />
                
                <Line
                  type="monotone"
                  dataKey="completeness"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Utilisation Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} interval={0} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} width={45} />
                <Tooltip formatter={(v: number, name: string) => [
                  `${v}%`,
                  name === "utilisation" ? "Actual" : "Benchmark"
                ]} />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="hsl(var(--border))"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={{ r: 3, fill: "hsl(var(--border))" }}
                />
                <Line
                  type="monotone"
                  dataKey="utilisation"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-primary rounded" />
              <span className="text-[10px] text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5 bg-border rounded" style={{ borderTop: "2px dashed" }} />
              <span className="text-[10px] text-muted-foreground">Benchmark</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendCharts;
