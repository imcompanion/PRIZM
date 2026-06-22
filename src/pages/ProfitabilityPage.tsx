import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, calculateInternalCostPerHour } from "@/lib/calculations";
import { getBatchProjectFxRates } from "@/lib/fx";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { subMonths, format, eachDayOfInterval, isWeekend } from "date-fns";
import { buildParentalLeaveMap, getWorkingDaysExcludingLeave } from "@/lib/parental-leave";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Info } from "lucide-react";
import * as RechartsPrimitive from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import ProfitabilityTrendChart from "@/components/profitability/ProfitabilityTrendChart";

// ── Types ──

type OfficeFilter = "Global" | "UK" | "US";
type TimePeriod = "3" | "6" | "12" | "custom";
type StatusFilter = "all" | "ended";
type DetailView = "project" | "account";

interface ProjectProfit {
  id: string;
  title: string;
  office: string | null;
  sfAccount: string | null;
  scopedHours: number;
  actualHours: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  budgetMargin: number;
  budgetRevenue: number;
  budgetCost: number;
  status: "Live" | "Ended" | "Not Started";
}

interface ClientGroup {
  client: string;
  projects: ProjectProfit[];
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  scopedHours: number;
  actualHours: number;
  budgetMargin: number;
}

// ── Helpers ──

const matchesOffice = (office: string | null, filter: OfficeFilter) => {
  if (filter === "Global") return true;
  if (filter === "UK") return office === "UK" || office === "United Kingdom";
  if (filter === "US") return office === "US" || office === "United States";
  return false;
};

function ToggleGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border-border p-0.5 bg-muted/50 items-stretch bg-[#cfddf2] border-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center",
            value === opt.value ? "bg-background shadow-sm text-foreground bg-[#4b71d8]" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, isNegative, subtitle }: { label: string; value: string; isNegative?: boolean; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 border-0 border-transparent">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className={cn("text-xl font-display font-bold mt-0.5", isNegative === true ? "text-destructive" : isNegative === false ? "text-success" : "")}>
          {value}
        </p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const getMarginColor = (margin: number) => {
  if (margin < 40) return "bg-[#b91c1c] text-white"; // dark red
  if (margin <= 47.5) return "bg-[#fe4f2a]/70 text-white"; // light red
  if (margin <= 52.5) return "bg-[#ffc300] text-foreground"; // amber
  if (margin <= 57) return "bg-[#86efac] text-foreground"; // light green
  return "bg-[#166534] text-white"; // dark green
};

const getCompletenessColor = (pct: number) => {
  if (pct >= 95) return "bg-[#166534] text-white";
  if (pct >= 80) return "bg-[#ffc300] text-foreground";
  return "bg-[#b91c1c] text-white";
};

function getWorkingDaysInRange(start: Date, end: Date): number {
  if (start > end) return 0;
  return eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length;
}

// ── Main Component ──

const ProfitabilityPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const setParam = useCallback((key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const officeFilter = (searchParams.get("office") as OfficeFilter) || "Global";
  const setOfficeFilter = useCallback((v: OfficeFilter) => setParam("office", v), [setParam]);
  const timePeriod = (searchParams.get("period") as TimePeriod) || "6";
  const setTimePeriod = useCallback((v: TimePeriod) => setParam("period", v), [setParam]);
  const detailView = (searchParams.get("view") as DetailView) || "project";
  const setDetailView = useCallback((v: DetailView) => setParam("view", v), [setParam]);
  const statusFilter = (searchParams.get("status") as StatusFilter) || "all";
  const setStatusFilter = useCallback((v: StatusFilter) => setParam("status", v), [setParam]);
  const grossUp = searchParams.get("grossUp") === "true";
  const setGrossUp = useCallback((v: boolean) => setParam("grossUp", v ? "true" : null), [setParam]);

  const [trendData, setTrendData] = useState<Array<{ month: string; revenue: number; cost: number; profit: number; margin: number }>>([]);
  const [projectMonthlyData, setProjectMonthlyData] = useState<Array<{ title: string; client: string; startDate: string; endDate: string; month: string; revenue: number; cost: number }>>([]);
  const handleTrendData = useCallback((data: { overall: typeof trendData; byProject: typeof projectMonthlyData }) => {
    setTrendData(data.overall);
    setProjectMonthlyData(data.byProject);
  }, []);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const customStartDate = searchParams.get("cs") || format(subMonths(new Date(), 6), "yyyy-MM-dd");
  const customEndDate = searchParams.get("ce") || format(new Date(), "yyyy-MM-dd");
  const setCustomStartDate = useCallback((v: string) => setParam("cs", v), [setParam]);
  const setCustomEndDate = useCallback((v: string) => setParam("ce", v), [setParam]);

  // Debounced custom dates — only propagate to queries after 800ms of inactivity
  const [appliedStartDate, setAppliedStartDate] = useState(customStartDate);
  const [appliedEndDate, setAppliedEndDate] = useState(customEndDate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timePeriod !== "custom") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedStartDate(customStartDate);
      setAppliedEndDate(customEndDate);
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [customStartDate, customEndDate, timePeriod]);

  const displayCurrency = officeFilter === "US" ? "USD" : "GBP";

  const cutoffDate = useMemo(() => {
    if (timePeriod === "custom") return appliedStartDate;
    return format(subMonths(new Date(), parseInt(timePeriod)), "yyyy-MM-dd");
  }, [timePeriod, appliedStartDate]);

  const endDateStr = useMemo(() => {
    if (timePeriod === "custom") return appliedEndDate;
    return format(new Date(), "yyyy-MM-dd");
  }, [timePeriod, appliedEndDate]);

  const todayStr = useMemo(() => timePeriod === "custom" ? appliedEndDate : format(new Date(), "yyyy-MM-dd"), [timePeriod, appliedEndDate]);

  // ── Data Fetching ──

  const { data: projects = [] } = useQuery({
    queryKey: ["profitability_projects"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, ultimate_parent, sf_account, parent_account, office, start_date, end_date, rate_card_id, rate_card_discount, fee_calc_currency, fx_rate_gbp, fx_rate_usd, price, media_cost, gross_budget, extra_data, opportunity_record_type, project_scopes(id, scoped_hours, role_id), rate_cards(name, hourly_rate, currency)")
          .order("title")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: allRateCards = [] } = useQuery({
    queryKey: ["profitability_rate_cards"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("rate_cards")
          .select("id, name, role_id, hourly_rate, currency")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: projectCosts = [] } = useQuery({
    queryKey: ["profitability_project_costs"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.rpc("get_project_costs").range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });


  const { data: projectPhases = [] } = useQuery({
    queryKey: ["profitability_project_phases"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("project_phases")
          .select("id, project_id, start_date, end_date")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: phaseAllocations = [] } = useQuery({
    queryKey: ["profitability_phase_allocations"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("phase_allocations")
          .select("phase_id, project_scope_id, hours")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: monthlyCosts = [] } = useQuery({
    queryKey: ["profitability_monthly_costs", cutoffDate, endDateStr],
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.rpc("get_project_costs_monthly", { _start_date: cutoffDate, _end_date: endDateStr }).range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });


  const { data: roles = [] } = useQuery({
    queryKey: ["profitability_roles"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: hoursByRole = [] } = useQuery({
    queryKey: ["profitability_hours_by_role"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.rpc("get_project_hours_by_role").range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: costsByRole = [] } = useQuery({
    queryKey: ["profitability_costs_by_role"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.rpc("get_project_costs_by_role" as any).range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["profitability_people"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("people")
          .select("id, role_id, team, annual_salary, office, employment_start_date, employment_end_date, overall_start_date, overall_end_date, roles(billable_capacity_hours)")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: projectPersonHours = [] } = useQuery({
    queryKey: ["profitability_project_person_hours"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.rpc("get_project_person_hours" as any).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allData as { project_id: string; person_id: string; total_hours: number }[];
    },
  });

  const { data: projectPersonProjectHours = [] } = useQuery({
    queryKey: ["profitability_project_person_project_hours"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const allData: { project_id: string | null; person_id: string | null; hours: number | null }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("project_id, person_id, hours")
          .not("project_id", "is", null)
          .not("person_id", "is", null)
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const aggregated = new Map<string, { project_id: string; person_id: string; total_hours: number }>();
      for (const row of allData) {
        if (!row.project_id || !row.person_id) continue;
        const key = `${row.project_id}::${row.person_id}`;
        const curr = aggregated.get(key);
        const h = Number(row.hours) || 0;
        if (!curr) aggregated.set(key, { project_id: row.project_id, person_id: row.person_id, total_hours: h });
        else curr.total_hours += h;
      }
      return Array.from(aggregated.values());
    },
  });

  const peopleByIdForBudget = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  const companyRoleCostStats = useMemo(() => {
    const map: Record<string, { gbpSum: number; usdSum: number; count: number }> = {};
    for (const person of people) {
      if (!person.role_id || !person.annual_salary || person.annual_salary <= 0) continue;
      const cap = person.roles?.billable_capacity_hours;
      const costPerHour = calculateInternalCostPerHour(Number(person.annual_salary), cap);
      if (!map[person.role_id]) map[person.role_id] = { gbpSum: 0, usdSum: 0, count: 0 };
      const stats = map[person.role_id];
      if (person.office === "US" || person.office === "United States") stats.usdSum += costPerHour;
      else stats.gbpSum += costPerHour;
      stats.count += 1;
    }
    return map;
  }, [people]);

  const projectRoleCostStats = useMemo(() => {
    const map: Record<string, Record<string, { gbpWeightedCostSum: number; usdWeightedCostSum: number; gbpHours: number; usdHours: number }>> = {};

    for (const row of projectPersonProjectHours) {
      if (!row.project_id || !row.person_id) continue;
      const hours = Number(row.total_hours) || 0;
      if (hours <= 0) continue;

      const person = peopleByIdForBudget.get(row.person_id);
      if (!person?.role_id || !person.annual_salary || person.annual_salary <= 0) continue;

      const cap = person.roles?.billable_capacity_hours;
      const costPerHour = calculateInternalCostPerHour(Number(person.annual_salary), cap);

      if (!map[row.project_id]) map[row.project_id] = {};
      if (!map[row.project_id][person.role_id]) {
        map[row.project_id][person.role_id] = { gbpWeightedCostSum: 0, usdWeightedCostSum: 0, gbpHours: 0, usdHours: 0 };
      }

      const stats = map[row.project_id][person.role_id];
      if (person.office === "US" || person.office === "United States") {
        stats.usdWeightedCostSum += costPerHour * hours;
        stats.usdHours += hours;
      } else {
        stats.gbpWeightedCostSum += costPerHour * hours;
        stats.gbpHours += hours;
      }
    }

    return map;
  }, [projectPersonProjectHours, peopleByIdForBudget]);

  // Build a lookup map for project costs
  // Window-clipped per-project costs: aggregate monthlyCosts rows (already filtered to cutoffDate..endDateStr)
  // so cost matches the same window as the prorated revenue. Falls back to all-time get_project_costs only
  // if the monthly RPC has no rows for the project (shouldn't normally happen for projects in-window).
  const costMap = useMemo(() => {
    const map: Record<string, { totalHours: number; costGbp: number; costUsd: number }> = {};
    for (const row of monthlyCosts as any[]) {
      const existing = map[row.project_id] || { totalHours: 0, costGbp: 0, costUsd: 0 };
      existing.totalHours += Number(row.total_hours) || 0;
      existing.costGbp += Number(row.cost_gbp_staff) || 0;
      existing.costUsd += Number(row.cost_usd_staff) || 0;
      map[row.project_id] = existing;
    }
    return map;
  }, [monthlyCosts]);

  // All-time costs (used by drill-downs that need full project cost regardless of window)
  const allTimeCostMap = useMemo(() => {
    const map: Record<string, { totalHours: number; costGbp: number; costUsd: number }> = {};
    for (const row of projectCosts) {
      map[row.project_id] = {
        totalHours: Number(row.total_hours) || 0,
        costGbp: Number(row.cost_gbp_staff) || 0,
        costUsd: Number(row.cost_usd_staff) || 0,
      };
    }
    return map;
  }, [projectCosts]);

  // Identify projects missing FX rates and fetch real historical rates
  const projectsMissingFx = useMemo(() => {
    return (projects as any[])
      .filter((p) => !p.fx_rate_gbp && !p.fx_rate_usd)
      .map((p) => ({ id: p.id, startDate: p.start_date, endDate: p.end_date }));
  }, [projects]);

  const { data: historicalFxRates = {} } = useQuery({
    queryKey: ["batch_fx_rates", projectsMissingFx.map(p => p.id).sort().join(",")],
    queryFn: () => getBatchProjectFxRates(projectsMissingFx),
    enabled: projectsMissingFx.length > 0,
    staleTime: Infinity,
  });

  // Compute a fallback GBP/USD rate from projects that have real FX rates (used only until historicalFxRates loads)
  const fallbackGbpUsdRate = useMemo(() => {
    const ratios: number[] = [];
    for (const p of projects as any[]) {
      if (p.fx_rate_gbp && p.fx_rate_usd && p.fx_rate_gbp > 0) {
        ratios.push(p.fx_rate_usd / p.fx_rate_gbp);
      }
    }
    if (ratios.length === 0) return 1.27;
    ratios.sort((a, b) => a - b);
    return ratios[Math.floor(ratios.length / 2)];
  }, [projects]);

  // Build role → team mapping (most common team for each role)
  const roleTeamMap = useMemo(() => {
    const teamCounts: Record<string, Record<string, number>> = {};
    for (const p of people) {
      if (!p.role_id || !p.team) continue;
      if (!teamCounts[p.role_id]) teamCounts[p.role_id] = {};
      teamCounts[p.role_id][p.team] = (teamCounts[p.role_id][p.team] || 0) + 1;
    }
    const map: Record<string, string> = {};
    for (const [roleId, teams] of Object.entries(teamCounts)) {
      map[roleId] = Object.entries(teams).sort((a, b) => b[1] - a[1])[0][0];
    }
    return map;
  }, [people]);

  // Build role name lookup
  const roleNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roles) map[r.id] = r.name;
    return map;
  }, [roles]);

  // Build lookup: projectId -> { roleId -> actualHours }
  const hoursByProjectRole = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const row of hoursByRole) {
      if (!row.project_id) continue;
      // Skip entries with no role (person_id was null on import → unmatched people)
      if (!row.role_id) continue;
      if (!map[row.project_id]) map[row.project_id] = {};
      map[row.project_id][row.role_id] = (map[row.project_id][row.role_id] || 0) + Number(row.total_hours);
    }
    return map;
  }, [hoursByRole]);

  // Build lookup: projectId -> { roleId -> { costGbp, costUsd, hours } } from RPC (real per-person costs)
  const costsByProjectRole = useMemo(() => {
    const map: Record<string, Record<string, { costGbp: number; costUsd: number; hours: number }>> = {};
    for (const row of costsByRole) {
      if (!row.project_id) continue;
      const roleKey = row.role_id || "null";
      if (!map[row.project_id]) map[row.project_id] = {};
      const existing = map[row.project_id][roleKey] || { costGbp: 0, costUsd: 0, hours: 0 };
      existing.costGbp += Number(row.cost_gbp_staff) || 0;
      existing.costUsd += Number(row.cost_usd_staff) || 0;
      existing.hours += Number(row.total_hours) || 0;
      map[row.project_id][roleKey] = existing;
    }
    return map;
  }, [costsByRole]);

  // ── Compute Client Profitability ──

  const clientGroups = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const EXCLUDED_RECORD_TYPES = ["agency - talent savings", "agency - passthrough costs", "agency - rfp / rfi"];

    const TIMESHEET_DATA_START = "2024-01-01";

    const filtered = projects.filter((p: any) => {
      if (!matchesOffice(p.office, officeFilter)) return false;
      // Exclude projects that started before timesheet data exists (1 Jan 2025) to avoid inflated margins
      if (p.start_date < TIMESHEET_DATA_START) return false;
      // Include projects that were "live" during the period: started before today AND ended after cutoff
      if (p.end_date < cutoffDate || p.start_date > todayStr) return false;
      const client = (p.ultimate_parent || p.title || "").toLowerCase();
      if (client.includes("billion dollar boy")) return false;
      // Exclude passthrough / talent savings record types
      const recordType = (p.opportunity_record_type || "").trim().toLowerCase();
      if (EXCLUDED_RECORD_TYPES.includes(recordType)) return false;
      const totalScoped = (p.project_scopes || []).reduce((s: number, sc: any) => s + (sc.scoped_hours || 0), 0);
      return totalScoped > 0;
    });

    // Helper: count working days between two dates
    const countWorkingDays = (from: Date, to: Date) => {
      if (from > to) return 0;
      return eachDayOfInterval({ start: from, end: to }).filter(d => !isWeekend(d)).length;
    };

    const clientMap: Record<string, ProjectProfit[]> = {};

    for (const project of filtered) {
      const p = project as any;
      const projectCurrency = p.fee_calc_currency || p.rate_cards?.currency || "GBP";
      const projectHistoricalRate = historicalFxRates[p.id] ?? fallbackGbpUsdRate;
      let fxRateGbp: number;
      let fxRateUsd: number;
      if (p.fx_rate_gbp || p.fx_rate_usd) {
        fxRateGbp = p.fx_rate_gbp || 1;
        fxRateUsd = p.fx_rate_usd || (fxRateGbp * projectHistoricalRate);
      } else if (projectCurrency === "USD") {
        fxRateGbp = projectHistoricalRate;
        fxRateUsd = 1;
      } else if (projectCurrency === "GBP") {
        fxRateGbp = 1;
        fxRateUsd = 1 / projectHistoricalRate;
      } else {
        fxRateGbp = 1;
        fxRateUsd = projectHistoricalRate;
      }
      const rateCardBaseCurrency = p.rate_cards?.currency || "GBP";
      const discountPct = p.rate_card_discount || 0;
      const rcName = p.rate_cards?.name;

      // Build role-level rates (fallback for revenue if no agency fee)
      const roleRates: Record<string, number> = {};
      if (rcName) {
        const targetName = rcName.trim().toLowerCase();
        allRateCards
          .filter((rc: any) => (rc.name || "").trim().toLowerCase() === targetName)
          .forEach((rc: any) => {
            let rate = Number(rc.hourly_rate || 0) * (1 - discountPct / 100);
            if (rateCardBaseCurrency !== projectCurrency) {
              if (rateCardBaseCurrency === "GBP") rate *= fxRateGbp;
              else if (rateCardBaseCurrency === "USD") rate *= fxRateUsd;
            }
            roleRates[rc.role_id] = rate;
          });
      }

      // Agency Fee = Price - Media Cost - Gross Budget
      const getExtraNum = (proj: any, ...keys: string[]): number | null => {
        const extra = proj.extra_data || {};
        const normalised = Object.fromEntries(Object.entries(extra).map(([k, v]) => [k.toLowerCase().trim(), v]));
        for (const k of keys) {
          const val = normalised[k.toLowerCase().trim()];
          if (val != null) {
            const n = parseFloat(String(val).replace(/[£$,%]/g, "").replace(/,/g, ""));
            if (!isNaN(n)) return n;
          }
        }
        return null;
      };

      const afPrice = p.price ?? getExtraNum(p, "total price", "price gbp/usd", "price");
      const afMediaCost = p.media_cost ?? getExtraNum(p, "media cost", "cost - paid media budget") ?? 0;
      const afGrossBudget = p.gross_budget ?? getExtraNum(p, "gross budget full value (gbp / usd)", "gross budget full value", "gross budget", "cost - net budget") ?? 0;
      const fullAgencyFee = afPrice !== null ? afPrice - afMediaCost - afGrossBudget : null;

      const rateCardRevenue = (p.project_scopes || []).reduce((sum: number, sc: any) => {
        return sum + sc.scoped_hours * (roleRates[sc.role_id] || 0);
      }, 0);
      const fullRevenue = fullAgencyFee !== null && fullAgencyFee > 0 ? fullAgencyFee : rateCardRevenue;

      // Proportion agency fee / scope to the portion of the project that overlaps the selected window
      // using each scope's phase_percentages (12 equal day-slices of the project timeline) rather than
      // a flat working-day pro-rata. Cost is window-clipped via get_project_costs_monthly RPC.
      const projStart = new Date(p.start_date);
      const projEnd = new Date(p.end_date);
      const isComplete = projEnd <= today;

      const totalScopedFull = (p.project_scopes || []).reduce((s: number, sc: any) => s + (sc.scoped_hours || 0), 0);

      // Window bounds (cap "elapsed" end at today so we never count future work)
      const windowStart = new Date(cutoffDate);
      const windowEndRaw = new Date(endDateStr);
      const windowEnd = windowEndRaw > today ? today : windowEndRaw;

      // Helper: for a single scope, compute how many of its scoped_hours fall within [windowStart, windowEnd]
      // by walking its 12 phases (each 1/12th of project duration) and intersecting with the window.
      const totalProjectDays = Math.max(1, Math.round((projEnd.getTime() - projStart.getTime()) / 86400000) + 1);
      const daysPerPhase = totalProjectDays / 12;

      const phaseHoursInWindow = (sc: any): number => {
        const scoped = Number(sc.scoped_hours) || 0;
        if (scoped <= 0) return 0;
        const pcts = (sc.phase_percentages || {}) as Record<string, number>;
        const hasAnyPct = Object.values(pcts).some((v) => Number(v) > 0);
        // No phasing → assume default 4-phase split: 30% / 30% / 20% / 20% across equal quarters of the project
        const effectivePcts: Record<string, number> = hasAnyPct
          ? pcts
          : { "Phase 1": 30, "Phase 2": 30, "Phase 3": 20, "Phase 4": 20 };
        const phaseCount = hasAnyPct ? 12 : 4;
        const daysPerPhaseLocal = totalProjectDays / phaseCount;
        let hoursInWin = 0;
        for (let phase = 1; phase <= phaseCount; phase++) {
          const pct =
            effectivePcts[`Phase ${phase}`] ?? effectivePcts[`phase ${phase}`] ?? effectivePcts[`Phase${phase}`] ?? effectivePcts[String(phase)] ?? 0;
          if (!pct || pct <= 0) continue;
          const phaseHours = (Number(pct) / 100) * scoped;
          const phaseStartDay = Math.round((phase - 1) * daysPerPhaseLocal);
          const phaseEndDay = Math.round(phase * daysPerPhaseLocal) - 1;
          const phaseStart = new Date(projStart.getTime() + phaseStartDay * 86400000);
          const phaseEnd = new Date(projStart.getTime() + phaseEndDay * 86400000);
          const totalPhaseWD = countWorkingDays(phaseStart, phaseEnd);
          if (totalPhaseWD === 0) continue;
          const effStart = phaseStart > windowStart ? phaseStart : windowStart;
          const effEnd = phaseEnd < windowEnd ? phaseEnd : windowEnd;
          const winPhaseWD = countWorkingDays(effStart, effEnd);
          if (winPhaseWD === 0) continue;
          hoursInWin += phaseHours * (winPhaseWD / totalPhaseWD);
        }
        return hoursInWin;
      };

      const soFarHoursPerScope: Record<string, number> = {};
      (p.project_scopes || []).forEach((sc: any) => {
        soFarHoursPerScope[sc.id] = phaseHoursInWindow(sc);
      });

      const windowPct = totalScopedFull > 0
        ? Math.min(1, Object.values(soFarHoursPerScope).reduce((s, h) => s + h, 0) / totalScopedFull)
        : 0;

      const hasRoleRates = Object.keys(roleRates).length > 0;
      const soFarBudgetFee = hasRoleRates
        ? (p.project_scopes || []).reduce((sum: number, sc: any) => {
            const hours = soFarHoursPerScope[sc.id] || 0;
            const rate = roleRates[sc.role_id] || 0;
            return sum + hours * rate;
          }, 0)
        : null;
      const soFarBudgetHours = Object.values(soFarHoursPerScope).reduce((s, h) => s + h, 0);

      let revenue = fullRevenue * windowPct;
      if (fullAgencyFee !== null && fullAgencyFee > 0) {
        if (soFarBudgetFee !== null && rateCardRevenue > 0) {
          // Match the budget-fee shape (role-rate weighted) within the window
          revenue = fullAgencyFee * (soFarBudgetFee / rateCardRevenue);
        } else if (totalScopedFull > 0) {
          revenue = fullAgencyFee * (soFarBudgetHours / totalScopedFull);
        } else {
          revenue = 0;
        }
      } else if (soFarBudgetFee !== null) {
        revenue = soFarBudgetFee;
      } else if (totalScopedFull > 0) {
        revenue = rateCardRevenue * (soFarBudgetHours / totalScopedFull);
      }

      const totalScoped = soFarBudgetHours;
      const effectiveScopedHoursByScopeId = soFarHoursPerScope;
      const projCost = costMap[p.id] || { totalHours: 0, costGbp: 0, costUsd: 0 };
      // Use totalHours from get_project_costs RPC so displayed hours are consistent
      // with the cost calculation (which includes all people with salaries, even those without a role_id).
      const actualHours = projCost.totalHours;

      // Convert staff costs to project currency using direct rates
      // fxRateGbp = "1 GBP = X project_currency", fxRateUsd = "1 USD = Y project_currency"
      let cost = projCost.costGbp * fxRateGbp + projCost.costUsd * fxRateUsd;

      const profit = revenue - cost;

      // Convert to display currency
      let revenueDisplay = revenue;
      let costDisplay = cost;
      let profitDisplay = profit;

      if (projectCurrency !== displayCurrency) {
        // gbpToUsd = fxRateGbp / fxRateUsd (works with both stored and derived rates)
        const gbpToUsd = fxRateUsd > 0 ? fxRateGbp / fxRateUsd : 1;
        const toGBP = (v: number) => {
          if (projectCurrency === "GBP") return v;
          if (projectCurrency === "USD") return v / gbpToUsd;
          return v / (fxRateGbp || 1);
        };
        const fromGBP = (v: number) => {
          if (displayCurrency === "GBP") return v;
          if (displayCurrency === "USD") return v * gbpToUsd;
          return v;
        };
        revenueDisplay = fromGBP(toGBP(revenue));
        costDisplay = fromGBP(toGBP(cost));
        profitDisplay = fromGBP(toGBP(profit));
      }

      const client = p.ultimate_parent || p.title;
      if (!clientMap[client]) clientMap[client] = [];

      // Budget margin: align with the same visible scope/revenue window as the main row
      const getWeightedAvgConvertedCostPerHour = (
        stats?: { gbpWeightedCostSum: number; usdWeightedCostSum: number; gbpHours: number; usdHours: number }
      ) => {
        if (!stats) return null;
        const totalHours = stats.gbpHours + stats.usdHours;
        if (totalHours <= 0) return null;
        const convertedTotal = stats.gbpWeightedCostSum * fxRateGbp + stats.usdWeightedCostSum * fxRateUsd;
        return convertedTotal / totalHours;
      };

      const getCompanyAvgConvertedCostPerHour = (stats?: { gbpSum: number; usdSum: number; count: number }) => {
        if (!stats || stats.count === 0) return null;
        const convertedTotal = stats.gbpSum * fxRateGbp + stats.usdSum * fxRateUsd;
        return convertedTotal / stats.count;
      };

      const budgetCostEst = (p.project_scopes || []).reduce((sum: number, sc: any) => {
        const roleId = sc.role_id;
        if (!roleId) return sum;

        const projectRoleStats = projectRoleCostStats[p.id]?.[roleId];
        const companyRoleStats = companyRoleCostStats[roleId];
        const avgCostPerHour =
          getWeightedAvgConvertedCostPerHour(projectRoleStats) ??
          getCompanyAvgConvertedCostPerHour(companyRoleStats) ??
          0;

        const scopedHoursForBudget = Number(effectiveScopedHoursByScopeId[sc.id] ?? sc.scoped_hours ?? 0);
        return sum + scopedHoursForBudget * avgCostPerHour;
      }, 0);

      const budgetRevenueForMargin = revenue;
      const budgetProfitEst = budgetRevenueForMargin - budgetCostEst;
      const budgetMarginEst = budgetRevenueForMargin > 0 ? (budgetProfitEst / budgetRevenueForMargin) * 100 : budgetProfitEst < 0 ? -100 : 0;

      const status: "Live" | "Ended" | "Not Started" = isComplete ? "Ended" : projStart > today ? "Not Started" : "Live";

      clientMap[client].push({
        id: p.id,
        title: p.title,
        office: p.office,
        sfAccount: p.parent_account || p.sf_account || null,
        scopedHours: totalScoped,
        actualHours,
        revenue: revenueDisplay,
        cost: costDisplay,
        profit: profitDisplay,
        margin: revenueDisplay > 0 ? (profitDisplay / revenueDisplay) * 100 : profitDisplay < 0 ? -100 : 0,
        budgetMargin: budgetMarginEst,
        budgetRevenue: budgetRevenueForMargin,
        budgetCost: budgetCostEst,
        status,
      });
    }

    const groups: ClientGroup[] = Object.entries(clientMap)
      .map(([client, allProjects]) => {
        const projects = statusFilter === "ended" ? allProjects.filter(p => p.status === "Ended") : allProjects;
        if (projects.length === 0) return null;
        const revenue = projects.reduce((s, p) => s + p.revenue, 0);
        const cost = projects.reduce((s, p) => s + p.cost, 0);
        const profit = projects.reduce((s, p) => s + p.profit, 0);
        const scopedHours = projects.reduce((s, p) => s + p.scopedHours, 0);
        const actualHours = projects.reduce((s, p) => s + p.actualHours, 0);
        const budgetRevenue = projects.reduce((s, p) => s + p.budgetRevenue, 0);
        const budgetCost = projects.reduce((s, p) => s + p.budgetCost, 0);
        const budgetProfit = budgetRevenue - budgetCost;
        const budgetMargin = budgetRevenue > 0
          ? (budgetProfit / budgetRevenue) * 100
          : budgetProfit < 0 ? -100 : 0;
        return {
          client,
          projects: projects.sort((a, b) => b.profit - a.profit),
          revenue,
          cost,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : profit < 0 ? -100 : 0,
          scopedHours,
          actualHours,
          budgetMargin,
        };
      })
      .filter((g): g is ClientGroup => g !== null);

    return groups.sort((a, b) => b.profit - a.profit);
  }, [projects, costMap, allRateCards, officeFilter, cutoffDate, displayCurrency, projectPhases, phaseAllocations, statusFilter, fallbackGbpUsdRate, historicalFxRates, companyRoleCostStats, projectRoleCostStats]);

  // ── Role-level burn by client ──
  const roleBurnByClient = useMemo(() => {
    const today = new Date();
    const countWD = (from: Date, to: Date) => {
      if (from > to) return 0;
      return eachDayOfInterval({ start: from, end: to }).filter(d => !isWeekend(d)).length;
    };

    const getProjectFxRates = (p: any) => {
      const projectCurrency = p.fee_calc_currency || p.rate_cards?.currency || "GBP";
      const projectHistoricalRate = historicalFxRates[p.id] ?? fallbackGbpUsdRate;
      let fxRateGbp: number;
      let fxRateUsd: number;

      if (p.fx_rate_gbp || p.fx_rate_usd) {
        fxRateGbp = p.fx_rate_gbp || 1;
        fxRateUsd = p.fx_rate_usd || (fxRateGbp * projectHistoricalRate);
      } else if (projectCurrency === "USD") {
        fxRateGbp = projectHistoricalRate;
        fxRateUsd = 1;
      } else if (projectCurrency === "GBP") {
        fxRateGbp = 1;
        fxRateUsd = 1 / projectHistoricalRate;
      } else {
        fxRateGbp = 1;
        fxRateUsd = projectHistoricalRate;
      }

      return { projectCurrency, fxRateGbp, fxRateUsd };
    };

    const convertProjectToDisplay = (
      valueInProjectCurrency: number,
      projectCurrency: string,
      fxRateGbp: number,
      fxRateUsd: number
    ) => {
      if (projectCurrency === displayCurrency) return valueInProjectCurrency;
      const gbpToUsd = fxRateUsd > 0 ? fxRateGbp / fxRateUsd : 1;
      const toGBP = (v: number) => {
        if (projectCurrency === "GBP") return v;
        if (projectCurrency === "USD") return v / gbpToUsd;
        return v / (fxRateGbp || 1);
      };
      const fromGBP = (v: number) => {
        if (displayCurrency === "GBP") return v;
        if (displayCurrency === "USD") return v * gbpToUsd;
        return v;
      };
      return fromGBP(toGBP(valueInProjectCurrency));
    };

    const getWeightedAvgConvertedCostPerHour = (
      fxRateGbp: number,
      fxRateUsd: number,
      stats?: { gbpWeightedCostSum: number; usdWeightedCostSum: number; gbpHours: number; usdHours: number }
    ) => {
      if (!stats) return null;
      const totalHours = stats.gbpHours + stats.usdHours;
      if (totalHours <= 0) return null;
      const convertedTotal = stats.gbpWeightedCostSum * fxRateGbp + stats.usdWeightedCostSum * fxRateUsd;
      return convertedTotal / totalHours;
    };

    const getCompanyAvgConvertedCostPerHour = (
      fxRateGbp: number,
      fxRateUsd: number,
      stats?: { gbpSum: number; usdSum: number; count: number }
    ) => {
      if (!stats || stats.count === 0) return null;
      const convertedTotal = stats.gbpSum * fxRateGbp + stats.usdSum * fxRateUsd;
      return convertedTotal / stats.count;
    };

    const result: Record<string, { team: string; roles: { role: string; scoped: number; actual: number; diff: number; pct: number; actualCost: number; budgetCost: number; costDelta: number; avgCostPerHour: number }[] }[]> = {};

    for (const group of clientGroups) {
      const roleMap: Record<string, { scoped: number; actual: number; roleId: string | null; actualCost: number; budgetCost: number }> = {};

      for (const proj of group.projects) {
        const projData = projects.find((p: any) => p.id === proj.id);
        if (!projData) continue;
        const p = projData as any;
        const scopes = p.project_scopes || [];
        const projStart = new Date(p.start_date);
        const projEnd = new Date(p.end_date);
        const isComplete = projEnd <= today;
        const { projectCurrency, fxRateGbp, fxRateUsd } = getProjectFxRates(p);

        const soFarHoursPerScope: Record<string, number> = {};

        if (isComplete) {
          for (const sc of scopes) {
            soFarHoursPerScope[sc.id] = sc.scoped_hours || 0;
          }
        } else {
          const projPhases = projectPhases.filter((ph: any) => ph.project_id === p.id);
          const projPhaseIds = projPhases.map((ph: any) => ph.id);
          const projPhaseAllocs = phaseAllocations.filter((pa: any) => projPhaseIds.includes(pa.phase_id));
          const hasPhaseAllocs = projPhaseAllocs.length > 0;

          const completedPhaseIds = projPhases
            .filter((ph: any) => ph.end_date && new Date(ph.end_date) <= today)
            .map((ph: any) => ph.id);

          if (hasPhaseAllocs && completedPhaseIds.length > 0) {
            projPhaseAllocs
              .filter((pa: any) => completedPhaseIds.includes(pa.phase_id))
              .forEach((pa: any) => {
                if (pa.project_scope_id) {
                  soFarHoursPerScope[pa.project_scope_id] = (soFarHoursPerScope[pa.project_scope_id] || 0) + Number(pa.hours);
                }
              });
          } else {
            const clampedToday = today < projStart ? projStart : today;
            const totalWorkingDays = countWD(projStart, projEnd);
            const elapsedWorkingDays = countWD(projStart, clampedToday);
            const elapsedPct = totalWorkingDays > 0 ? elapsedWorkingDays / totalWorkingDays : 0;
            for (const sc of scopes) {
              soFarHoursPerScope[sc.id] = (sc.scoped_hours || 0) * elapsedPct;
            }
          }
        }

        // Scale the popover's scoped distribution to match the main table's proportioned total
        const popoverScopedTotal = Object.values(soFarHoursPerScope).reduce((s, h) => s + h, 0);
        const scaleFactor = popoverScopedTotal > 0 ? proj.scopedHours / popoverScopedTotal : 0;

        const projectRoleBudgetRaw: Record<string, number> = {};
        for (const sc of scopes) {
          const roleName = sc.role_id ? (roleNameMap[sc.role_id] || "Unknown Role") : "Unassigned";
          if (!roleMap[roleName]) roleMap[roleName] = { scoped: 0, actual: 0, roleId: sc.role_id || null, actualCost: 0, budgetCost: 0 };

          const scopedHoursForBudget = (soFarHoursPerScope[sc.id] || 0) * scaleFactor;
          roleMap[roleName].scoped += scopedHoursForBudget;

          if (sc.role_id) {
            const projectRoleStats = projectRoleCostStats[p.id]?.[sc.role_id];
            const companyRoleStats = companyRoleCostStats[sc.role_id];
            const avgCostPerHourInProjectCurrency =
              getWeightedAvgConvertedCostPerHour(fxRateGbp, fxRateUsd, projectRoleStats) ??
              getCompanyAvgConvertedCostPerHour(fxRateGbp, fxRateUsd, companyRoleStats) ??
              0;

            const budgetCostInProjectCurrency = scopedHoursForBudget * avgCostPerHourInProjectCurrency;
            projectRoleBudgetRaw[roleName] = (projectRoleBudgetRaw[roleName] || 0) + convertProjectToDisplay(
              budgetCostInProjectCurrency,
              projectCurrency,
              fxRateGbp,
              fxRateUsd
            );
          }
        }

        const projRoleHours = hoursByProjectRole[proj.id] || {};
        let roleAssignedHours = 0;
        for (const [roleId, hours] of Object.entries(projRoleHours)) {
          const normalizedRoleId = roleId === "null" ? null : roleId;
          const roleName = normalizedRoleId ? (roleNameMap[normalizedRoleId] || "Unknown Role") : "Unassigned (no role)";
          if (!roleMap[roleName]) roleMap[roleName] = { scoped: 0, actual: 0, roleId: normalizedRoleId, actualCost: 0, budgetCost: 0 };
          roleMap[roleName].actual += hours;
          roleAssignedHours += hours;
        }

        // Accumulate real per-person costs from RPC for each role on this project, converted with the same project FX as main table
        const projectRoleActualRaw: Record<string, number> = {};
        const projCostsByRole = costsByProjectRole[proj.id] || {};
        for (const [roleKey, costs] of Object.entries(projCostsByRole)) {
          const normalizedRoleId = roleKey === "null" ? null : roleKey;
          const roleName = normalizedRoleId ? (roleNameMap[normalizedRoleId] || "Unknown Role") : "Unassigned (no role)";
          if (!roleMap[roleName]) roleMap[roleName] = { scoped: 0, actual: 0, roleId: normalizedRoleId, actualCost: 0, budgetCost: 0 };

          const actualCostInProjectCurrency = costs.costGbp * fxRateGbp + costs.costUsd * fxRateUsd;
          projectRoleActualRaw[roleName] = (projectRoleActualRaw[roleName] || 0) + convertProjectToDisplay(
            actualCostInProjectCurrency,
            projectCurrency,
            fxRateGbp,
            fxRateUsd
          );
        }

        // Force exact reconciliation to main table at project level
        const rawBudgetTotal = Object.values(projectRoleBudgetRaw).reduce((s, v) => s + v, 0);
        if (rawBudgetTotal > 0) {
          const budgetScale = proj.budgetCost / rawBudgetTotal;
          for (const [roleName, rawBudget] of Object.entries(projectRoleBudgetRaw)) {
            if (!roleMap[roleName]) roleMap[roleName] = { scoped: 0, actual: 0, roleId: null, actualCost: 0, budgetCost: 0 };
            roleMap[roleName].budgetCost += rawBudget * budgetScale;
          }
        } else if (Math.abs(proj.budgetCost) > 0.01) {
          if (!roleMap["Unassigned (no role)"]) roleMap["Unassigned (no role)"] = { scoped: 0, actual: 0, roleId: null, actualCost: 0, budgetCost: 0 };
          roleMap["Unassigned (no role)"].budgetCost += proj.budgetCost;
        }

        const rawActualTotal = Object.values(projectRoleActualRaw).reduce((s, v) => s + v, 0);
        if (rawActualTotal > 0) {
          const actualScale = proj.cost / rawActualTotal;
          for (const [roleName, rawActual] of Object.entries(projectRoleActualRaw)) {
            if (!roleMap[roleName]) roleMap[roleName] = { scoped: 0, actual: 0, roleId: null, actualCost: 0, budgetCost: 0 };
            roleMap[roleName].actualCost += rawActual * actualScale;
          }
        } else if (Math.abs(proj.cost) > 0.01) {
          if (!roleMap["Unassigned (no role)"]) roleMap["Unassigned (no role)"] = { scoped: 0, actual: 0, roleId: null, actualCost: 0, budgetCost: 0 };
          roleMap["Unassigned (no role)"].actualCost += proj.cost;
        }

        // Add unassigned hours (people without roles) from cost-based totals
        const costTotal = costMap[proj.id]?.totalHours || 0;
        const unassignedHours = costTotal - roleAssignedHours;
        if (unassignedHours > 0.5) {
          if (!roleMap["Unassigned (no role)"]) roleMap["Unassigned (no role)"] = { scoped: 0, actual: 0, roleId: null, actualCost: 0, budgetCost: 0 };
          roleMap["Unassigned (no role)"].actual += unassignedHours;
        }
      }

      // Build flat role entries with team info
      const roleEntries = Object.entries(roleMap)
        .map(([role, { scoped, actual, roleId, actualCost, budgetCost }]) => {
          const avgCostPerHour = actual > 0 ? actualCost / actual : scoped > 0 ? budgetCost / scoped : 0;
          return {
            role,
            team: roleId ? (roleTeamMap[roleId] || "Other") : "Other",
            scoped: Math.round(scoped),
            actual: Math.round(actual),
            diff: Math.round(actual - scoped),
            pct: scoped > 0 ? ((actual - scoped) / scoped) * 100 : actual > 0 ? 100 : 0,
            actualCost,
            budgetCost,
            costDelta: actualCost - budgetCost,
            avgCostPerHour,
          };
        })
        .filter(r => r.scoped > 0 || r.actual > 0);

      // Group by team
      const teamMap: Record<string, typeof roleEntries> = {};
      for (const entry of roleEntries) {
        if (!teamMap[entry.team]) teamMap[entry.team] = [];
        teamMap[entry.team].push(entry);
      }

      // Sort roles within each team: biggest underburn (most negative diff) to largest overburn (most positive diff)
      result[group.client] = Object.entries(teamMap)
        .map(([team, roles]) => ({
          team,
          roles: roles.sort((a, b) => a.diff - b.diff),
        }))
        .sort((a, b) => a.team.localeCompare(b.team));
    }

    return result;
  }, [clientGroups, projects, hoursByProjectRole, roleNameMap, roleTeamMap, projectPhases, phaseAllocations, costMap, costsByProjectRole, projectRoleCostStats, companyRoleCostStats, displayCurrency, fallbackGbpUsdRate, historicalFxRates]);

  // ── Totals ──

  const totals = useMemo(() => {
    const revenue = clientGroups.reduce((s, c) => s + c.revenue, 0);
    const cost = clientGroups.reduce((s, c) => s + c.cost, 0);
    const profit = clientGroups.reduce((s, c) => s + c.profit, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const projectCount = clientGroups.reduce((s, c) => s + c.projects.length, 0);
    const profitableClients = clientGroups.filter(c => c.revenue > 0 && (c.profit / c.revenue) * 100 >= 50).length;
    return { revenue, cost, profit, margin, projectCount, clientCount: clientGroups.length, profitableClients };
  }, [clientGroups]);


  // ── RFP / RFI Cost Card ──

  interface RfpProject {
    id: string;
    title: string;
    hours: number;
    cost: number;
  }

  const rfpData = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const rfpProjects: RfpProject[] = [];

    for (const project of projects) {
      const p = project as any;
      const recordType = (p.opportunity_record_type || "").trim().toLowerCase();
      if (recordType !== "agency - rfp / rfi") continue;
      if (!matchesOffice(p.office, officeFilter)) continue;
      if (p.start_date < "2024-01-01") continue;
      if (p.end_date < cutoffDate || p.start_date > todayStr) continue;
      // Respect ended/live toggle
      const projEnd = new Date(p.end_date + "T00:00:00");
      const isComplete = projEnd < today;
      if (statusFilter === "ended" && !isComplete) continue;

      const projectCurrency = p.fee_calc_currency || p.rate_cards?.currency || "GBP";
      const roleHistRate = historicalFxRates[p.id] ?? fallbackGbpUsdRate;
      let fxRateGbp: number;
      let fxRateUsd: number;
      if (p.fx_rate_gbp || p.fx_rate_usd) {
        fxRateGbp = p.fx_rate_gbp || 1;
        fxRateUsd = p.fx_rate_usd || (fxRateGbp * roleHistRate);
      } else if (projectCurrency === "USD") {
        fxRateGbp = roleHistRate;
        fxRateUsd = 1;
      } else if (projectCurrency === "GBP") {
        fxRateGbp = 1;
        fxRateUsd = 1 / roleHistRate;
      } else {
        fxRateGbp = 1;
        fxRateUsd = roleHistRate;
      }

      const projCost = costMap[p.id] || { totalHours: 0, costGbp: 0, costUsd: 0 };

      // Convert staff costs to project currency using direct rates
      let costInProject = projCost.costGbp * fxRateGbp + projCost.costUsd * fxRateUsd;

      // Then convert from project currency to display currency
      let costDisplay = costInProject;
      if (projectCurrency !== displayCurrency) {
        const gbpToUsd = fxRateUsd > 0 ? fxRateGbp / fxRateUsd : 1;
        const toGBP = (v: number) => {
          if (projectCurrency === "GBP") return v;
          if (projectCurrency === "USD") return v / gbpToUsd;
          return v / (fxRateGbp || 1);
        };
        const fromGBP = (v: number) => {
          if (displayCurrency === "GBP") return v;
          if (displayCurrency === "USD") return v * gbpToUsd;
          return v;
        };
        costDisplay = fromGBP(toGBP(costInProject));
      }

      rfpProjects.push({
        id: p.id,
        title: p.title,
        hours: projCost.totalHours,
        cost: costDisplay,
      });
    }

    // Exclude RFP/RFI projects with cost under £3,000
    const filtered = rfpProjects.filter(p => p.cost >= 3000);
    filtered.sort((a, b) => b.cost - a.cost);
    const totalHours = filtered.reduce((s, p) => s + p.hours, 0);
    const totalCost = filtered.reduce((s, p) => s + p.cost, 0);

    return { projects: filtered, totalHours, totalCost };
  }, [projects, costMap, officeFilter, cutoffDate, displayCurrency, statusFilter, fallbackGbpUsdRate, historicalFxRates]);



  // Build a people lookup by id
  const peopleById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  const parentalLeaveMap = useMemo(() => buildParentalLeaveMap(people), [people]);

  // Build a projects lookup by id
  const projectsById = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of projects) map.set(p.id, p);
    return map;
  }, [projects]);

  // ── Timesheet Completeness (scoped to each project's dates) ──

  const completenessData = useMemo(() => {
    const HOURS_PER_DAY = 7.5;
    const today = new Date();

    // Group by project
    const projectPeopleMap = new Map<string, Set<string>>();
    const projectPersonHoursMap = new Map<string, Map<string, number>>();
    for (const row of projectPersonHours) {
      if (!projectPeopleMap.has(row.project_id)) projectPeopleMap.set(row.project_id, new Set());
      projectPeopleMap.get(row.project_id)!.add(row.person_id);
      if (!projectPersonHoursMap.has(row.project_id)) projectPersonHoursMap.set(row.project_id, new Map());
      projectPersonHoursMap.get(row.project_id)!.set(row.person_id, Number(row.total_hours));
    }

    // Per-project completeness: for each person on a project, calculate their
    // completeness during that project's active dates (capped at today, intersected with employment dates)
    const projectComp = new Map<string, number>();
    for (const [projId, personIds] of projectPeopleMap) {
      const proj = projectsById.get(projId);
      if (!proj) continue;
      const projStart = new Date(proj.start_date);
      const projEnd = new Date(proj.end_date) < today ? new Date(proj.end_date) : today;
      if (projStart > projEnd) continue;

      const hoursMap = projectPersonHoursMap.get(projId);
      const completenessValues: number[] = [];

      for (const pid of personIds) {
        const person = peopleById.get(pid);
        if (!person) continue;
        const empStart = person.overall_start_date || person.employment_start_date;
        const empEnd = person.overall_end_date || person.employment_end_date;
        const effectiveStart = empStart && new Date(empStart) > projStart ? new Date(empStart) : projStart;
        const effectiveEnd = empEnd && new Date(empEnd) < projEnd ? new Date(empEnd) : projEnd;
        if (effectiveStart > effectiveEnd) continue;

        const normName = (person.name || "").trim().toLowerCase();
        const leaveIntervals = parentalLeaveMap.get(normName);
        const workingDays = getWorkingDaysExcludingLeave(effectiveStart, effectiveEnd, leaveIntervals);
        const expected = workingDays * HOURS_PER_DAY;
        if (expected === 0) continue;

        const actual = hoursMap?.get(pid) || 0;
        completenessValues.push(Math.min((actual / expected) * 100, 100));
      }

      if (completenessValues.length > 0) {
        projectComp.set(projId, completenessValues.reduce((s, v) => s + v, 0) / completenessValues.length);
      }
    }

    // Client-level: average of project completeness values (weighted equally per project)
    const clientComp = new Map<string, number>();
    for (const group of clientGroups) {
      const vals: number[] = [];
      for (const proj of group.projects) {
        const v = projectComp.get(proj.id);
        if (v !== undefined) vals.push(v);
      }
      if (vals.length > 0) clientComp.set(group.client, vals.reduce((s, v) => s + v, 0) / vals.length);
    }

    return { projectComp, clientComp, projectPeopleMap };
  }, [projectPersonHours, projectsById, peopleById, clientGroups, parentalLeaveMap]);

  // ── Gross-up adjusted data ──

  const displayClientGroups = useMemo(() => {
    if (!grossUp) return clientGroups;

    return clientGroups.map((group) => {
      const adjustedProjects = group.projects.map((proj) => {
        const comp = completenessData.projectComp.get(proj.id);
        // Only gross up if completeness is known and less than 100%
        if (comp === undefined || comp >= 99.5 || comp <= 0) return proj;
        const grossUpFactor = 100 / comp; // no cap — scale fully to 100% completeness
        const adjustedCost = proj.cost * grossUpFactor;
        const adjustedHours = proj.actualHours * grossUpFactor;
        const adjustedProfit = proj.revenue - adjustedCost;
        const adjustedMargin = proj.revenue > 0 ? (adjustedProfit / proj.revenue) * 100 : adjustedProfit < 0 ? -100 : 0;
        // Budget margin stays the same — it's based on role-level budgeted costs, not actuals
        return {
          ...proj,
          actualHours: adjustedHours,
          cost: adjustedCost,
          profit: adjustedProfit,
          margin: adjustedMargin,
          budgetMargin: proj.budgetMargin,
        };
      });

      const revenue = adjustedProjects.reduce((s, p) => s + p.revenue, 0);
      const cost = adjustedProjects.reduce((s, p) => s + p.cost, 0);
      const profit = adjustedProjects.reduce((s, p) => s + p.profit, 0);
      const scopedHours = adjustedProjects.reduce((s, p) => s + p.scopedHours, 0);
      const actualHours = adjustedProjects.reduce((s, p) => s + p.actualHours, 0);
      const budgetRevenue = adjustedProjects.reduce((s, p) => s + p.budgetRevenue, 0);
      const budgetCost = adjustedProjects.reduce((s, p) => s + p.budgetCost, 0);
      const budgetProfit = budgetRevenue - budgetCost;
      const budgetMargin = budgetRevenue > 0
        ? (budgetProfit / budgetRevenue) * 100
        : budgetProfit < 0 ? -100 : 0;

      return {
        ...group,
        projects: adjustedProjects.sort((a, b) => b.profit - a.profit),
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : profit < 0 ? -100 : 0,
        scopedHours,
        actualHours,
        budgetMargin,
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [clientGroups, grossUp, completenessData]);

  const displayTotals = useMemo(() => {
    const revenue = displayClientGroups.reduce((s, c) => s + c.revenue, 0);
    const cost = displayClientGroups.reduce((s, c) => s + c.cost, 0);
    const profit = displayClientGroups.reduce((s, c) => s + c.profit, 0);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const projectCount = displayClientGroups.reduce((s, c) => s + c.projects.length, 0);
    const profitableClients = displayClientGroups.filter(c => c.revenue > 0 && (c.profit / c.revenue) * 100 >= 50).length;
    return { revenue, cost, profit, margin, projectCount, clientCount: displayClientGroups.length, profitableClients };
  }, [displayClientGroups]);

  // ── Push data to analytics context ──
  const { setPageData } = useAnalyticsContext();
  useEffect(() => {
    if (displayClientGroups.length > 0) {
      // Build a compact summary with per-project metadata so the AI can reason across offices/statuses
      const clientSummaries = displayClientGroups.map(g => ({
        client: g.client,
        revenue: Math.round(g.revenue),
        cost: Math.round(g.cost),
        profit: Math.round(g.profit),
        margin: Math.round(g.margin),
        scopedHours: Math.round(g.scopedHours),
        actualHours: Math.round(g.actualHours),
        projectCount: g.projects.length,
        projects: g.projects
          .slice(0, 15)
          .map(p => ({
            title: p.title,
            office: p.office,
            status: p.status,
            revenue: Math.round(p.revenue),
            cost: Math.round(p.cost),
            profit: Math.round(p.profit),
            margin: Math.round(p.margin),
            scopedHours: Math.round(p.scopedHours),
            actualHours: Math.round(p.actualHours),
          })),
      }));
      // Build per-project monthly breakdown for the AI — group by project to reduce payload
      const projectMonthlyMap: Record<string, { title: string; client: string; startDate: string; endDate: string; months: Record<string, { rev: number; cost: number }> }> = {};
      for (const entry of projectMonthlyData) {
        const key = entry.title;
        if (!projectMonthlyMap[key]) {
          projectMonthlyMap[key] = { title: entry.title, client: entry.client, startDate: entry.startDate, endDate: entry.endDate, months: {} };
        }
        projectMonthlyMap[key].months[entry.month] = { rev: entry.revenue, cost: entry.cost };
      }
      const projectMonthly = Object.values(projectMonthlyMap).slice(0, 80);

      setPageData("Profitability", {
        filters: { office: officeFilter, status: statusFilter, period: timePeriod, grossUp, currency: displayCurrency },
        totals: displayTotals,
        clients: clientSummaries,
        monthlyTrend: trendData,
        projectMonthlyBreakdown: projectMonthly,
        explanation: "monthlyTrend shows aggregate monthly revenue/cost/profit/margin for the current filter. projectMonthlyBreakdown shows per-project monthly revenue and cost so you can identify exactly which projects drove changes in any given month. Each project has startDate/endDate so you know when it was active. To answer 'why did profit drop in month X', compare revenue and cost contributions of individual projects between month X and adjacent months.",
      });
    }
  }, [displayClientGroups, displayTotals, officeFilter, statusFilter, timePeriod, grossUp, displayCurrency, trendData, projectMonthlyData]);

  // ── Gross-up adjusted role burn ──
  const displayRoleBurnByClient = useMemo(() => {
    if (!grossUp) return roleBurnByClient;

    const result: typeof roleBurnByClient = {};
    for (const [client, teamGroups] of Object.entries(roleBurnByClient)) {
      // Find the client group to get project-level gross-up factors
      const group = clientGroups.find(g => g.client === client);
      if (!group) { result[client] = teamGroups; continue; }

      // Compute a weighted gross-up factor across projects for this client
      // by accumulating per-role gross-up adjustments
      const roleGrossed: Record<string, number> = {};
      for (const proj of group.projects) {
        const comp = completenessData.projectComp.get(proj.id);
        const factor = (comp !== undefined && comp > 0 && comp < 99.5) ? 100 / comp : 1;
        const projRoleHours = hoursByProjectRole[proj.id] || {};
        for (const [roleId, hours] of Object.entries(projRoleHours)) {
          const roleName = roleNameMap[roleId] || "Unknown Role";
          roleGrossed[roleName] = (roleGrossed[roleName] || 0) + hours * (factor - 1);
        }
      }

      result[client] = teamGroups.map(tg => ({
        team: tg.team,
        roles: tg.roles.map(r => {
          const grossedExtra = Math.round(roleGrossed[r.role] || 0);
          const grossedActual = r.actual + grossedExtra;
          const diff = grossedActual - r.scoped;
          // Scale actual cost proportionally with grossed-up hours
          const costScale = r.actual > 0 ? grossedActual / r.actual : 1;
          const grossedActualCost = r.actualCost * costScale;
          return {
            ...r,
            actual: grossedActual,
            diff,
            pct: r.scoped > 0 ? (diff / r.scoped) * 100 : grossedActual > 0 ? 100 : 0,
            actualCost: grossedActualCost,
            costDelta: grossedActualCost - r.budgetCost,
            avgCostPerHour: grossedActual > 0 ? grossedActualCost / grossedActual : r.avgCostPerHour,
          };
        }).sort((a, b) => a.diff - b.diff),
      }));
    }
    return result;
  }, [grossUp, roleBurnByClient, clientGroups, completenessData, hoursByProjectRole, roleNameMap]);

  // ── Per-project gross-up factors (always computed for Y-axis domain) ──
  const allGrossUpFactors = useMemo(() => {
    const map = new Map<string, number>();
    for (const [projId, comp] of completenessData.projectComp) {
      if (comp > 0 && comp < 99.5) {
        map.set(projId, 100 / comp);
      }
    }
    return map;
  }, [completenessData]);

  // Active gross-up factors (only applied when toggle is on)
  const EMPTY_MAP = useMemo(() => new Map<string, number>(), []);
  const grossUpFactors = useMemo(() => {
    if (!grossUp) return EMPTY_MAP;
    return allGrossUpFactors;
  }, [grossUp, allGrossUpFactors, EMPTY_MAP]);

  // Gross-up adjusted RFP data
  const displayRfpData = useMemo(() => {
    if (!grossUp) return rfpData;
    const adjusted = rfpData.projects.map(p => {
      const comp = completenessData.projectComp.get(p.id);
      const factor = (comp !== undefined && comp > 0 && comp < 99.5) ? Math.min(100 / comp, 3) : 1;
      return { ...p, hours: p.hours * factor, cost: p.cost * factor };
    });
    return {
      projects: adjusted,
      totalHours: adjusted.reduce((s, p) => s + p.hours, 0),
      totalCost: adjusted.reduce((s, p) => s + p.cost, 0),
    };
  }, [rfpData, grossUp, completenessData]);

  // Fixed Y-axis max for RFP chart (always based on grossed-up values)
  const rfpYAxisMax = useMemo(() => {
    const THRESHOLD = 1000;
    const grossedCosts = rfpData.projects
      .filter(p => p.cost >= THRESHOLD || (() => {
        const comp = completenessData.projectComp.get(p.id);
        const factor = (comp !== undefined && comp < 99.5) ? Math.min(100 / comp, 3) : 1;
        return p.cost * factor >= THRESHOLD;
      })())
      .map(p => {
        const comp = completenessData.projectComp.get(p.id);
        const factor = (comp !== undefined && comp < 99.5) ? Math.min(100 / comp, 3) : 1;
        return p.cost * factor;
      });
    const rawCosts = rfpData.projects.filter(p => p.cost >= THRESHOLD).map(p => p.cost);
    const maxVal = Math.max(...grossedCosts, ...rawCosts, 0);
    return Math.ceil(maxVal / 5000) * 5000; // round up to nearest 5000
  }, [rfpData, completenessData]);

  // ── Monthly RFP / RFI Cost Trend ──
  const rfpMonthlyTrend = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const rfpProjectIds = new Set<string>();
    const rfpProjectCurrencyMap: Record<string, { projectCurrency: string; fxRateGbp: number; fxRateUsd: number }> = {};

    for (const project of projects) {
      const p = project as any;
      const recordType = (p.opportunity_record_type || "").trim().toLowerCase();
      if (recordType !== "agency - rfp / rfi") continue;
      if (!matchesOffice(p.office, officeFilter)) continue;
      if (p.start_date < "2024-01-01") continue;
      if (p.end_date < cutoffDate || p.start_date > todayStr) continue;
      const projEnd = new Date(p.end_date + "T00:00:00");
      const isComplete = projEnd < today;
      if (statusFilter === "ended" && !isComplete) continue;

      const projectCurrency = p.fee_calc_currency || p.rate_cards?.currency || "GBP";
      const roleHistRate = historicalFxRates[p.id] ?? fallbackGbpUsdRate;
      let fxRateGbp: number;
      let fxRateUsd: number;
      if (p.fx_rate_gbp || p.fx_rate_usd) {
        fxRateGbp = p.fx_rate_gbp || 1;
        fxRateUsd = p.fx_rate_usd || (fxRateGbp * roleHistRate);
      } else if (projectCurrency === "USD") {
        fxRateGbp = roleHistRate;
        fxRateUsd = 1;
      } else if (projectCurrency === "GBP") {
        fxRateGbp = 1;
        fxRateUsd = 1 / roleHistRate;
      } else {
        fxRateGbp = 1;
        fxRateUsd = roleHistRate;
      }

      rfpProjectIds.add(p.id);
      rfpProjectCurrencyMap[p.id] = { projectCurrency, fxRateGbp, fxRateUsd };
    }

    const monthMap = new Map<string, number>();

    for (const row of monthlyCosts) {
      if (!rfpProjectIds.has(row.project_id)) continue;
      const fx = rfpProjectCurrencyMap[row.project_id];
      if (!fx) continue;

      let costInProject = (Number(row.cost_gbp_staff) || 0) * fx.fxRateGbp + (Number(row.cost_usd_staff) || 0) * fx.fxRateUsd;

      if (fx.projectCurrency !== displayCurrency) {
        const gbpToUsd = fx.fxRateUsd > 0 ? fx.fxRateGbp / fx.fxRateUsd : 1;
        const toGBP = (v: number) => {
          if (fx.projectCurrency === "GBP") return v;
          if (fx.projectCurrency === "USD") return v / gbpToUsd;
          return v / (fx.fxRateGbp || 1);
        };
        const fromGBP = (v: number) => {
          if (displayCurrency === "GBP") return v;
          if (displayCurrency === "USD") return v * gbpToUsd;
          return v;
        };
        costInProject = fromGBP(toGBP(costInProject));
      }

      if (grossUp) {
        const comp = completenessData.projectComp.get(row.project_id);
        const factor = (comp !== undefined && comp > 0 && comp < 99.5) ? Math.min(100 / comp, 3) : 1;
        costInProject *= factor;
      }

      const monthKey = row.month_date.slice(0, 7);
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + costInProject);
    }

    // Build continuous month range so zero-data months still appear on x-axis
    const startMonth = cutoffDate.slice(0, 7);
    const endMonth = (timePeriod === "custom" ? appliedEndDate : format(today, "yyyy-MM-dd")).slice(0, 7);
    const allMonths: string[] = [];
    {
      let cur = new Date(startMonth + "-01T00:00:00");
      const end = new Date(endMonth + "-01T00:00:00");
      while (cur <= end) {
        allMonths.push(format(cur, "yyyy-MM"));
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
    }

    return allMonths.map((monthKey) => {
      const d = new Date(monthKey + "-15");
      return {
        month: isNaN(d.getTime()) ? monthKey : format(d, "MMM yy"),
        cost: Math.round(monthMap.get(monthKey) || 0),
      };
    });
  }, [projects, monthlyCosts, officeFilter, cutoffDate, statusFilter, displayCurrency, historicalFxRates, fallbackGbpUsdRate, grossUp, completenessData]);

  const toggleClient = (client: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(client)) next.delete(client);
      else next.add(client);
      return next;
    });
  };

  const periodLabel = timePeriod === "3" ? "3 Months" : timePeriod === "6" ? "6 Months" : timePeriod === "12" ? "12 Months" : (() => {
    const s = new Date(customStartDate + "T00:00:00");
    const e = new Date(customEndDate + "T00:00:00");
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return "Custom";
    return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
  })();

  return (
    <div className="p-6 pt-6 max-w-[1600px] mx-auto border-[#eeeae7] bg-[#faf8f5]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Profitability</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Client profitability for the last {periodLabel.toLowerCase()} · {displayCurrency}
          </p>
          <p className="text-muted-foreground text-[11px] mt-1 max-w-2xl">
            Includes all projects that were live during the selected period. For projects still in progress, agency fee is proportioned by working days elapsed.
          </p>
        </div>
        <div className="flex items-stretch gap-3">
          
          <ToggleGroup
            value={officeFilter}
            onChange={(v) => setOfficeFilter(v as OfficeFilter)}
            options={[
              { value: "Global", label: "Global" },
              { value: "UK", label: "UK" },
              { value: "US", label: "US" },
            ]}
          />
          <ToggleGroup
            value={timePeriod}
            onChange={(v) => setTimePeriod(v as TimePeriod)}
            options={[
              { value: "3", label: "3M" },
              { value: "6", label: "6M" },
              { value: "12", label: "12M" },
              { value: "custom", label: "Custom" },
            ]}
          />
          {timePeriod === "custom" && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border p-0.5 bg-muted/50 bg-[#cfddf2]">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-7 px-2 text-xs rounded-md bg-background border-0 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-7 px-2 text-xs rounded-md bg-background border-0 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          <ToggleGroup
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "Ended + Live" },
              { value: "ended", label: "Ended Only" },
            ]}
          />
          <div className="inline-flex rounded-lg border-border p-0.5 bg-[#cfddf2] border-0">
            <button
              onClick={() => setGrossUp(!grossUp)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                grossUp
                  ? "bg-[#4b71d8] text-white shadow-sm"
                  : "bg-[#cfddf2] text-muted-foreground hover:text-foreground"
              )}
              title="Gross up costs pro-rata based on timesheet completeness"
            >
              Gross Up Missing Time
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard label="Agency Fee" value={formatCurrency(displayTotals.revenue, displayCurrency)} subtitle={`${displayTotals.projectCount} projects`} />
        <KpiCard label="Internal Cost" value={formatCurrency(displayTotals.cost, displayCurrency)} />
        <KpiCard
          label="Profit"
          value={formatCurrency(displayTotals.profit, displayCurrency)}
          isNegative={displayTotals.profit < 0 ? true : false}
        />
        <KpiCard
          label="Margin"
          value={`${Math.round(displayTotals.margin)}%`}
          isNegative={displayTotals.margin < 0 ? true : false}
        />
        <KpiCard
          label="Clients with 50%+ Margin"
          value={`${displayTotals.profitableClients} / ${displayTotals.clientCount}`}
          subtitle={displayTotals.clientCount > 0 ? `${Math.round((displayTotals.profitableClients / displayTotals.clientCount) * 100)}%` : ""}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ProfitabilityTrendChart officeFilter={officeFilter} cutoffDate={cutoffDate} displayCurrency={displayCurrency} statusFilter={statusFilter} grossUpFactors={grossUpFactors} allGrossUpFactors={allGrossUpFactors} onTrendData={handleTrendData} />

        {/* RFP / RFI Cost Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RFP / RFI Cost</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Internal cost of pitches during the selected period</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Projects</p>
                  <p className="text-sm font-display font-bold">{displayRfpData.projects.length}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Hours</p>
                  <p className="text-sm font-display font-bold">{Math.round(displayRfpData.totalHours).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Total Cost</p>
                  <p className="text-sm font-display font-bold text-destructive">{formatCurrency(displayRfpData.totalCost, displayCurrency)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Avg Cost</p>
                  <p className="text-sm font-display font-bold text-destructive">{displayRfpData.projects.length > 0 ? formatCurrency(displayRfpData.totalCost / displayRfpData.projects.length, displayCurrency) : "–"}</p>
                </div>
              </div>
            </div>
            {displayRfpData.projects.length > 0 && (() => {
              const THRESHOLD = 1000;
              const major = displayRfpData.projects.filter((p) => p.cost >= THRESHOLD);
              const minor = displayRfpData.projects.filter((p) => p.cost < THRESHOLD);
              const otherBar = minor.length > 0 ? [{
                name: "Other",
                fullTitle: `Other (${minor.length} pitches under ${formatCurrency(THRESHOLD, displayCurrency)})`,
                id: null as string | null,
                cost: Math.round(minor.reduce((s, p) => s + p.cost, 0)),
                hours: Math.round(minor.reduce((s, p) => s + p.hours, 0)),
              }] : [];
              const chartData = [
                ...major
                  .sort((a, b) => b.cost - a.cost)
                  .map((proj) => ({
                    name: proj.title.length > 20 ? proj.title.slice(0, 17) + "…" : proj.title,
                    fullTitle: proj.title,
                    id: proj.id as string | null,
                    cost: Math.round(proj.cost),
                    hours: Math.round(proj.hours),
                  })),
                ...otherBar,
              ];
              return (
                <ChartContainer config={{}} className="h-[340px] w-full">
                  <RechartsPrimitive.BarChart
                    data={chartData}
                    margin={{ left: 10, right: 10, top: 5, bottom: 60 }}
                  >
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <RechartsPrimitive.XAxis
                      dataKey="name"
                      tick={{ fontSize: 9 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={70}
                    />
                    <RechartsPrimitive.YAxis tickFormatter={(v: number) => formatCurrency(v, displayCurrency)} tick={{ fontSize: 10 }} domain={[0, rfpYAxisMax]} />
                    <RechartsPrimitive.Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                            <p className="font-medium mb-1">{d.fullTitle}</p>
                            <p className="text-muted-foreground">Hours: <span className="font-medium text-foreground">{d.hours.toLocaleString()}</span></p>
                            <p className="text-muted-foreground">Cost: <span className="font-medium text-destructive">{formatCurrency(d.cost, displayCurrency)}</span></p>
                          </div>
                        );
                      }}
                    />
                    <RechartsPrimitive.Bar
                      dataKey="cost"
                      fill="hsl(var(--destructive))"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data: any) => { if (data?.id) navigate(`/projects/${data.id}`); }}
                    />
                  </RechartsPrimitive.BarChart>
                </ChartContainer>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* RFP / RFI Monthly Cost Trend */}
      {rfpMonthlyTrend.length > 0 && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">RFP / RFI Monthly Cost Trend</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Internal cost of pitches by month</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                <p className="text-sm font-display font-bold text-destructive">
                  {formatCurrency(rfpMonthlyTrend.reduce((s, d) => s + d.cost, 0), displayCurrency)}
                </p>
              </div>
            </div>
            <ChartContainer config={{}} className="h-[280px] w-full">
              <RechartsPrimitive.BarChart
                data={rfpMonthlyTrend}
                margin={{ left: 10, right: 10, top: 5, bottom: 30 }}
              >
                <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsPrimitive.XAxis
                  dataKey="month"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={40}
                />
                <RechartsPrimitive.YAxis tickFormatter={(v: number) => formatCurrency(v, displayCurrency)} tick={{ fontSize: 10 }} />
                <RechartsPrimitive.Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                        <p className="font-medium mb-1">{d.month}</p>
                        <p className="text-muted-foreground">Cost: <span className="font-medium text-destructive">{formatCurrency(d.cost, displayCurrency)}</span></p>
                      </div>
                    );
                  }}
                />
                <RechartsPrimitive.Bar
                  dataKey="cost"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                />
              </RechartsPrimitive.BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      <div>
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="min-w-[200px] bg-card">
                    <div className="flex items-center gap-2">
                      <span>Client</span>
                      <ToggleGroup
                        value={detailView}
                        onChange={(v) => setDetailView(v as DetailView)}
                        options={[
                          { value: "project", label: "By Project" },
                          { value: "account", label: "By Account" },
                        ]}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-right bg-card">
                    <div className="inline-flex items-center justify-end gap-1">
                      Agency Fee
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="inline-flex items-center justify-center cursor-help">
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                              Agency Fee = Price − Media Cost − Gross Budget (Full Value).
                              Blank values treated as zero. For in-progress projects, fee is
                              proportioned by working days elapsed.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead className="text-right bg-card">Internal Cost</TableHead>
                  <TableHead className="text-right bg-card">Profit</TableHead>
                  <TableHead className="text-right bg-card">Margin</TableHead>
                  <TableHead className="min-w-[200px] bg-card">Insight</TableHead>
                  <TableHead className="text-right w-[100px] bg-card">
                    <div className="inline-flex items-center justify-end gap-1">
                      <span>Timesheets</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] text-xs">
                            <p className="font-semibold mb-1">Timesheet Completeness</p>
                            <p>For each person on a project, we compare their logged hours against expected hours (7.5h × working days) during the overlap of the project's dates and their employment, capped at today.</p>
                            <p className="mt-1">Each person's score is capped at 100%, then averaged across everyone on the project. Client % is the average across its projects.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayClientGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No projects match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayClientGroups.map((group) => {
                    const isExpanded = expandedClients.has(group.client);
                    return (
                      <>
                        <TableRow
                          key={group.client}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleClient(group.client)}
                        >
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-1.5">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span>{group.client}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({group.projects.length})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(group.revenue, displayCurrency)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(group.cost, displayCurrency)}</TableCell>
                          <TableCell className={cn("text-right text-sm font-semibold", group.profit < 0 ? "text-destructive" : "text-success")}>
                            <div className="flex items-center justify-end gap-1">
                              {group.profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {formatCurrency(group.profit, displayCurrency)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getMarginColor(group.margin))}>
                              {Math.round(group.margin)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {(() => {
                              const marginDiff = group.margin - group.budgetMargin;
                              const hoursDiff = group.actualHours - group.scopedHours;
                              const hoursPct = group.scopedHours > 0 ? (hoursDiff / group.scopedHours) * 100 : 0;
                              const isOverBurn = hoursDiff > 0;
                              return (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-[11px]">
                                    <span className="text-muted-foreground">Budget margin:</span>
                                    <span className={cn("font-semibold", getMarginColor(group.budgetMargin), "px-1.5 py-0 rounded text-[10px]")}>
                                      {Math.round(group.budgetMargin)}%
                                    </span>
                                    {Math.abs(marginDiff) >= 0.5 && (
                                      <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", marginDiff > 0 ? "text-success" : "text-destructive")}>
                                        {marginDiff > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                        {Math.round(Math.abs(marginDiff))}pp
                                      </span>
                                    )}
                                  </div>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                        Hours: {Math.round(group.actualHours).toLocaleString()} / {Math.round(group.scopedHours).toLocaleString()}
                                        {group.scopedHours > 0 && (
                                          <span className={cn("ml-1 font-medium", isOverBurn ? "text-destructive" : "text-success")}>
                                            ({isOverBurn ? "+" : ""}{hoursPct.toFixed(0)}%)
                                          </span>
                                        )}
                                        <Info className="h-2.5 w-2.5 ml-0.5 text-muted-foreground" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[540px] p-3" align="start" onClick={(e) => e.stopPropagation()}>
                                      <p className="text-xs font-semibold mb-1">Hours Burn by Team & Role{grossUp && <span className="text-[9px] font-normal text-primary ml-1">(Grossed Up)</span>}</p>
                                      <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-1 px-0">
                                        <span>Role</span>
                                        <div className="flex items-center gap-2">
                                          <span className="min-w-[70px] text-right">Actual / Scoped</span>
                                          <span className="min-w-[32px] text-right">Δ hrs</span>
                                          <span className="min-w-[40px] text-right">Δ %</span>
                                          <span className="min-w-[48px] text-right">Cost/hr</span>
                                          <span className="min-w-[56px] text-right">Cost Δ</span>
                                        </div>
                                      </div>
                                      <div className="space-y-2.5 max-h-64 overflow-y-auto">
                                        {(displayRoleBurnByClient[group.client] || []).map((teamGroup) => (
                                          <div key={teamGroup.team}>
                                            <div className="flex items-center justify-between mb-1 pb-1 border-b border-border/60">
                                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{teamGroup.team}</p>
                                              {(() => {
                                                const totalActual = teamGroup.roles.reduce((s: number, r: any) => s + r.actual, 0);
                                                const totalScoped = teamGroup.roles.reduce((s: number, r: any) => s + r.scoped, 0);
                                                const teamDiff = totalActual - totalScoped;
                                                const teamPct = totalScoped > 0 ? ((totalActual - totalScoped) / totalScoped) * 100 : 0;
                                                const teamCostDelta = teamGroup.roles.reduce((s: number, r: any) => s + (r.costDelta || 0), 0);
                                                return (
                                                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                                                    <span>{Math.round(totalActual).toLocaleString()} / {Math.round(totalScoped).toLocaleString()}</span>
                                                    <span className={cn("min-w-[32px] text-right", teamDiff > 0 ? "text-destructive" : teamDiff < 0 ? "text-success" : "text-muted-foreground")}>
                                                      {teamDiff > 0 ? "+" : ""}{Math.round(teamDiff).toLocaleString()}
                                                    </span>
                                                    <span className={cn("min-w-[40px] text-right", teamPct > 0 ? "text-destructive" : teamPct < 0 ? "text-success" : "text-muted-foreground")}>
                                                      {teamPct > 0 ? "+" : ""}{teamPct.toFixed(0)}%
                                                    </span>
                                                    <span className="min-w-[48px]"></span>
                                                    <span className={cn("min-w-[56px] text-right", teamCostDelta > 0 ? "text-destructive" : teamCostDelta < 0 ? "text-success" : "text-muted-foreground")}>
                                                      {teamCostDelta !== 0 ? `${teamCostDelta > 0 ? "+" : ""}${formatCurrency(Math.round(teamCostDelta), displayCurrency)}` : "–"}
                                                    </span>
                                                  </div>
                                                );
                                              })()}
                                            </div>
                                            <div className="space-y-0.5">
                                              {teamGroup.roles.map((r) => {
                                                return (
                                                <div key={r.role} className="flex items-center justify-between text-[11px]">
                                                  <span className="truncate mr-2 text-muted-foreground">{r.role}</span>
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <span>{Math.round(r.actual).toLocaleString()} / {Math.round(r.scoped).toLocaleString()}</span>
                                                    <span className={cn("font-medium min-w-[32px] text-right", (r.actual - r.scoped) > 0 ? "text-destructive" : (r.actual - r.scoped) < 0 ? "text-success" : "text-muted-foreground")}>
                                                      {(r.actual - r.scoped) > 0 ? "+" : ""}{Math.round(r.actual - r.scoped).toLocaleString()}
                                                    </span>
                                                    <span className={cn("font-medium min-w-[40px] text-right", r.pct > 0 ? "text-destructive" : r.pct < 0 ? "text-success" : "text-muted-foreground")}>
                                                      {r.pct > 0 ? "+" : ""}{r.pct.toFixed(0)}%
                                                    </span>
                                                    <span className="text-muted-foreground min-w-[48px] text-right">
                                                      {r.avgCostPerHour > 0 ? formatCurrency(r.avgCostPerHour, displayCurrency) : "–"}
                                                    </span>
                                                    <span className={cn("font-medium min-w-[56px] text-right", r.costDelta > 0 ? "text-destructive" : r.costDelta < 0 ? "text-success" : "text-muted-foreground")}>
                                                      {r.costDelta !== 0 ? `${r.costDelta > 0 ? "+" : ""}${formatCurrency(Math.round(r.costDelta), displayCurrency)}` : "–"}
                                                    </span>
                                                  </div>
                                                </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                        {/* Grand total */}
                                        {(displayRoleBurnByClient[group.client] || []).length > 0 && (() => {
                                          const allRoles = (displayRoleBurnByClient[group.client] || []).flatMap(t => t.roles);
                                          const grandActual = allRoles.reduce((s, r) => s + r.actual, 0);
                                          const grandScoped = allRoles.reduce((s, r) => s + r.scoped, 0);
                                          const grandDiff = grandActual - grandScoped;
                                          const grandPct = grandScoped > 0 ? ((grandActual - grandScoped) / grandScoped) * 100 : 0;
                                          const grandCostDelta = allRoles.reduce((s, r) => s + (r.costDelta || 0), 0);
                                          return (
                                            <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border">
                                              <p className="text-[10px] font-bold uppercase tracking-wider">Total</p>
                                              <div className="flex items-center gap-2 text-[10px] font-bold">
                                                <span>{Math.round(grandActual).toLocaleString()} / {Math.round(grandScoped).toLocaleString()}</span>
                                                <span className={cn("min-w-[32px] text-right", grandDiff > 0 ? "text-destructive" : grandDiff < 0 ? "text-success" : "text-muted-foreground")}>
                                                  {grandDiff > 0 ? "+" : ""}{Math.round(grandDiff).toLocaleString()}
                                                </span>
                                                <span className={cn("min-w-[40px] text-right", grandPct > 0 ? "text-destructive" : grandPct < 0 ? "text-success" : "text-muted-foreground")}>
                                                  {grandPct > 0 ? "+" : ""}{grandPct.toFixed(0)}%
                                                </span>
                                                <span className="min-w-[48px]"></span>
                                                <span className={cn("min-w-[56px] text-right", grandCostDelta > 0 ? "text-destructive" : grandCostDelta < 0 ? "text-success" : "text-muted-foreground")}>
                                                  {grandCostDelta !== 0 ? `${grandCostDelta > 0 ? "+" : ""}${formatCurrency(Math.round(grandCostDelta), displayCurrency)}` : "–"}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                        {(!displayRoleBurnByClient[group.client] || displayRoleBurnByClient[group.client].length === 0) && (
                                          <p className="text-[10px] text-muted-foreground">No role data available</p>
                                        )}
                                        <p className="text-[9px] text-muted-foreground/60 mt-2 pt-1.5 border-t border-border/40 italic leading-snug">
                                          Cost/hr is the actual blended rate. Budget uses the same people &amp; weighting, so rate variance is near-zero — cost Δ is driven by hours variance. Small residuals may arise from FX reconciliation scaling.
                                        </p>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {(() => {
                              const comp = completenessData.clientComp.get(group.client);
                              if (comp === undefined) return <span className="text-[10px] text-muted-foreground">—</span>;
                              return (
                                <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getCompletenessColor(comp))}>
                                  {Math.round(comp)}%
                                </span>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                        {isExpanded && detailView === "project" && group.projects.map((proj) => (
                          <TableRow key={proj.id} className="bg-muted/20">
                            <TableCell className="text-sm pl-10">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-primary hover:underline transition-colors text-left"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/projects/${proj.id}`); }}
                                >
                                  {proj.title}
                                </button>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 leading-4 font-medium shrink-0",
                                  proj.status === "Live" ? "border-success text-success" :
                                  proj.status === "Ended" ? "border-muted-foreground text-muted-foreground" :
                                  "border-amber-500 text-amber-500"
                                )}>
                                  {proj.status === "Live" ? "Live — Agency Fees are Pro Rata" : proj.status}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(proj.revenue, displayCurrency)}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(proj.cost, displayCurrency)}</TableCell>
                            <TableCell className={cn("text-right text-sm", proj.profit < 0 ? "text-destructive" : "text-success")}>
                              {formatCurrency(proj.profit, displayCurrency)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getMarginColor(proj.margin))}>
                                {Math.round(proj.margin)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {(() => {
                                const marginDiff = proj.margin - proj.budgetMargin;
                                const hoursDiff = proj.actualHours - proj.scopedHours;
                                const hoursPct = proj.scopedHours > 0 ? (hoursDiff / proj.scopedHours) * 100 : 0;
                                const isOverBurn = hoursDiff > 0;
                                return (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <span className="text-muted-foreground">Budget margin:</span>
                                      <span className={cn("font-semibold px-1.5 py-0 rounded text-[10px]", getMarginColor(proj.budgetMargin))}>
                                        {Math.round(proj.budgetMargin)}%
                                      </span>
                                      {Math.abs(marginDiff) >= 0.5 && (
                                        <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", marginDiff > 0 ? "text-success" : "text-destructive")}>
                                          {marginDiff > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                          {Math.round(Math.abs(marginDiff))}pp
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Hours: {Math.round(proj.actualHours).toLocaleString()} / {Math.round(proj.scopedHours).toLocaleString()}
                                      {proj.scopedHours > 0 && (
                                        <span className={cn("ml-1 font-medium", isOverBurn ? "text-destructive" : "text-success")}>
                                          ({isOverBurn ? "+" : ""}{hoursPct.toFixed(0)}%)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {(() => {
                                const comp = completenessData.projectComp.get(proj.id);
                                if (comp === undefined) return <span className="text-[10px] text-muted-foreground">—</span>;
                                return (
                                  <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getCompletenessColor(comp))}>
                                    {Math.round(comp)}%
                                  </span>
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))}
                        {isExpanded && detailView === "account" && (() => {
                          // Group projects by Parent Account
                          const accountMap: Record<string, ProjectProfit[]> = {};
                          for (const proj of group.projects) {
                            const acct = proj.sfAccount || "(No Account)";
                            if (!accountMap[acct]) accountMap[acct] = [];
                            accountMap[acct].push(proj);
                          }
                          return Object.entries(accountMap)
                            .map(([acct, projs]) => {
                              const rev = projs.reduce((s, p) => s + p.revenue, 0);
                              const cst = projs.reduce((s, p) => s + p.cost, 0);
                              const pft = projs.reduce((s, p) => s + p.profit, 0);
                              const mgn = rev > 0 ? (pft / rev) * 100 : pft < 0 ? -100 : 0;
                              return { acct, projs, rev, cst, pft, mgn };
                            })
                            .sort((a, b) => b.pft - a.pft)
                            .map(({ acct, projs, rev, cst, pft, mgn }) => (
                              <TableRow key={acct} className="bg-muted/20">
                                <TableCell className="text-sm pl-10">
                                  <span className="text-muted-foreground">{acct}</span>
                                  <span className="text-[10px] text-muted-foreground ml-1">({projs.length})</span>
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(rev, displayCurrency)}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(cst, displayCurrency)}</TableCell>
                                <TableCell className={cn("text-right text-sm", pft < 0 ? "text-destructive" : "text-success")}>
                                  {formatCurrency(pft, displayCurrency)}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getMarginColor(mgn))}>
                                    {Math.round(mgn)}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {(() => {
                                    const bRev = projs.reduce((s, p) => s + p.budgetRevenue, 0);
                                    const bCst = projs.reduce((s, p) => s + p.budgetCost, 0);
                                    const bMgn = bRev > 0 ? ((bRev - bCst) / bRev) * 100 : bCst > 0 ? -100 : 0;
                                    const mgnDiff = mgn - bMgn;
                                    return (
                                      <div className="flex items-center gap-1 text-[11px]">
                                        <span className="text-muted-foreground">Budget margin:</span>
                                        <span className={cn("font-semibold px-1.5 py-0 rounded text-[10px]", getMarginColor(bMgn))}>
                                          {Math.round(bMgn)}%
                                        </span>
                                        {Math.abs(mgnDiff) >= 0.5 && (
                                          <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", mgnDiff > 0 ? "text-success" : "text-destructive")}>
                                            {mgnDiff > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                                            {Math.round(Math.abs(mgnDiff))}pp
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {(() => {
                                    const vals: number[] = [];
                                    for (const proj of projs) {
                                      const v = completenessData.projectComp.get(proj.id);
                                      if (v !== undefined) vals.push(v);
                                    }
                                    if (vals.length === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
                                    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                                    return (
                                      <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getCompletenessColor(avg))}>
                                        {Math.round(avg)}%
                                      </span>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            ));
                        })()}
                      </>
                    );
                  })
                )}
                {/* Total row */}
                {displayClientGroups.length > 0 && (
                  <TableRow className="border-t-2 font-bold bg-muted/60">
                    <TableCell className="uppercase text-xs tracking-wider">Total ({displayTotals.clientCount} clients){grossUp && <span className="ml-1 text-[9px] font-normal text-primary">(Grossed Up)</span>}</TableCell>
                    <TableCell className="text-right">{formatCurrency(displayTotals.revenue, displayCurrency)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(displayTotals.cost, displayCurrency)}</TableCell>
                    <TableCell className={cn("text-right", displayTotals.profit < 0 ? "text-destructive" : "text-success")}>
                      {formatCurrency(displayTotals.profit, displayCurrency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getMarginColor(displayTotals.margin))}>
                        {Math.round(displayTotals.margin)}%
                      </span>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-sm">
                      {(() => {
                        const vals: number[] = [];
                        for (const group of displayClientGroups) {
                          for (const proj of group.projects) {
                            const v = completenessData.projectComp.get(proj.id);
                            if (v !== undefined) vals.push(v);
                          }
                        }
                        if (vals.length === 0) return null;
                        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                        return (
                          <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", getCompletenessColor(avg))}>
                            {Math.round(avg)}%
                          </span>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default ProfitabilityPage;
