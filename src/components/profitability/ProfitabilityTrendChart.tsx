import { useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval, isWeekend,
} from "date-fns";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, ReferenceLine,
} from "recharts";

type OfficeFilter = "Global" | "UK" | "US";

export interface ProjectMonthlyEntry {
  title: string;
  client: string;
  startDate: string;
  endDate: string;
  month: string;
  revenue: number;
  cost: number;
}

interface Props {
  officeFilter: OfficeFilter;
  cutoffDate: string;
  displayCurrency: string;
  statusFilter: "all" | "ended";
  grossUpFactors?: Map<string, number>;
  allGrossUpFactors?: Map<string, number>;
  onTrendData?: (data: {
    overall: Array<{ month: string; revenue: number; cost: number; profit: number; margin: number }>;
    byProject: ProjectMonthlyEntry[];
  }) => void;
}

const EXCLUDED_RECORD_TYPES = [
  "agency - talent savings",
  "agency - passthrough costs",
  "agency - rfp / rfi",
];

const matchesOffice = (office: string | null, filter: OfficeFilter) => {
  if (filter === "Global") return true;
  if (!office) return false;
  const o = office.toUpperCase();
  if (filter === "UK") return o === "UK" || o === "UNITED KINGDOM" || o === "COMPANION";
  if (filter === "US") return o === "US" || o === "UNITED STATES";
  return false;
};

function getWorkingDays(start: Date, end: Date): number {
  if (start > end) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}

const ProfitabilityTrendChart = ({ officeFilter, cutoffDate, displayCurrency, statusFilter, grossUpFactors, allGrossUpFactors, onTrendData }: Props) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = format(today, "yyyy-MM-dd");

  // Reuse parent's cached queries (same keys)
  const { data: projects = [] } = useQuery({
    queryKey: ["profitability_projects"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, ultimate_parent, sf_account, office, start_date, end_date, rate_card_id, rate_card_discount, fee_calc_currency, fx_rate_gbp, fx_rate_usd, revenue, price, media_cost, gross_budget, extra_data, opportunity_record_type, project_scopes(id, scoped_hours, role_id), rate_cards(name, hourly_rate, currency)")
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

  const { data: projectPhases = [] } = useQuery({
    queryKey: ["profitability_project_phases"],
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

  // Monthly costs from new RPC
  const { data: monthlyCosts = [] } = useQuery({
    queryKey: ["profitability_monthly_costs", cutoffDate, todayStr],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await (supabase.rpc as any)("get_project_costs_monthly", {
          _start_date: cutoffDate,
          _end_date: todayStr,
        }).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = allData.concat(data || []);
        if (!data || data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return allData as Array<{
        project_id: string;
        month_date: string;
        total_hours: number;
        cost_gbp_staff: number;
        cost_usd_staff: number;
      }>;
    },
  });

  // Build monthly cost lookup
  const monthlyCostMap = useMemo(() => {
    const map = new Map<string, Map<string, { costGbp: number; costUsd: number }>>();
    for (const row of monthlyCosts) {
      if (!map.has(row.project_id)) map.set(row.project_id, new Map());
      map.get(row.project_id)!.set(row.month_date, {
        costGbp: Number(row.cost_gbp_staff) || 0,
        costUsd: Number(row.cost_usd_staff) || 0,
      });
    }
    return map;
  }, [monthlyCosts]);

  // Compute a fallback GBP/USD rate from projects that have real FX rates
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

  const _baseTrend = useMemo(() => {
    // Exclude current (incomplete) month — only show full months
    const lastFullMonth = startOfMonth(today);
    const allMonths = eachMonthOfInterval({
      start: startOfMonth(new Date(cutoffDate)),
      end: lastFullMonth,
    });
    const months = allMonths.filter((m) => m < lastFullMonth);

    // Filter qualifying projects (same criteria as parent)
    const filtered = projects.filter((p: any) => {
      if (!matchesOffice(p.office, officeFilter)) return false;
      if (p.start_date < "2025-01-01") return false;
      if (p.end_date < cutoffDate || p.start_date > todayStr) return false;
      const client = (p.ultimate_parent || p.title || "").toLowerCase();
      if (client.includes("billion dollar boy")) return false;
      const recordType = (p.opportunity_record_type || "").trim().toLowerCase();
      if (EXCLUDED_RECORD_TYPES.includes(recordType)) return false;
      const totalScoped = (p.project_scopes || []).reduce((s: number, sc: any) => s + (sc.scoped_hours || 0), 0);
      if (totalScoped <= 0) return false;
      // Status filter
      if (statusFilter === "ended") {
        const projEnd = new Date(p.end_date);
        if (projEnd > today) return false;
      }
      return true;
    });

    // Pre-compute per-project monthly revenue
    interface ProjectCalc {
      id: string;
      title: string;
      office: string | null;
      client: string;
      startDate: string;
      endDate: string;
      projectCurrency: string;
      fxRateGbp: number;
      fxRateUsd: number;
      monthlyRevenue: Record<string, number>;
    }

    const projectCalcs: ProjectCalc[] = [];

    for (const project of filtered) {
      const p = project as any;
      const projectCurrency = p.fee_calc_currency || p.rate_cards?.currency || "GBP";
      let fxRateGbp: number;
      let fxRateUsd: number;
      if (p.fx_rate_gbp || p.fx_rate_usd) {
        fxRateGbp = p.fx_rate_gbp || 1;
        fxRateUsd = p.fx_rate_usd || (fxRateGbp * fallbackGbpUsdRate);
      } else if (projectCurrency === "USD") {
        fxRateGbp = fallbackGbpUsdRate;
        fxRateUsd = 1;
      } else if (projectCurrency === "GBP") {
        fxRateGbp = 1;
        fxRateUsd = 1 / fallbackGbpUsdRate;
      } else {
        fxRateGbp = 1;
        fxRateUsd = fallbackGbpUsdRate;
      }
      const rateCardBaseCurrency = p.rate_cards?.currency || "GBP";
      const discountPct = p.rate_card_discount || 0;
      const rcName = p.rate_cards?.name;

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

      // Agency fee
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

      const afPrice = p.price ?? p.revenue ?? getExtraNum(p, "total price", "price gbp/usd", "price");
      const afMediaCost = p.media_cost ?? getExtraNum(p, "media cost", "cost - paid media budget") ?? 0;
      const afGrossBudget = p.gross_budget ?? getExtraNum(p, "gross budget full value (gbp / usd)", "gross budget full value", "gross budget", "cost - net budget") ?? 0;
      const fullAgencyFee = afPrice !== null ? afPrice - afMediaCost - afGrossBudget : null;

      const rateCardRevenue = (p.project_scopes || []).reduce((sum: number, sc: any) => {
        return sum + sc.scoped_hours * (roleRates[sc.role_id] || 0);
      }, 0);
      const agencyFee = fullAgencyFee !== null && fullAgencyFee > 0 ? fullAgencyFee : rateCardRevenue;
      if (agencyFee <= 0) continue;

      // Monthly revenue using phases or linear fallback
      const projStart = new Date(p.start_date);
      const projEnd = new Date(p.end_date);
      const monthlyRevenue: Record<string, number> = {};

      const projPhases = projectPhases.filter((ph: any) => ph.project_id === p.id);
      const projPhaseIds = new Set(projPhases.map((ph: any) => ph.id));
      const projPhaseAllocs = phaseAllocations.filter((pa: any) => projPhaseIds.has(pa.phase_id));
      const hasPhaseData = projPhases.length > 0 && projPhaseAllocs.length > 0;

      if (hasPhaseData) {
        for (const phase of projPhases) {
          if (!phase.start_date || !phase.end_date) continue;
          const phaseStart = new Date(phase.start_date);
          const phaseEnd = new Date(phase.end_date);

          const phaseValue = projPhaseAllocs
            .filter((pa: any) => pa.phase_id === phase.id)
            .reduce((sum: number, pa: any) => {
              const scope = (p.project_scopes || []).find((sc: any) => sc.id === pa.project_scope_id);
              const rate = scope ? (roleRates[scope.role_id] || 0) : 0;
              return sum + Number(pa.hours) * rate;
            }, 0);

          const phaseFee = rateCardRevenue > 0 ? agencyFee * (phaseValue / rateCardRevenue) : 0;
          if (phaseFee <= 0) continue;

          const totalPhaseDays = getWorkingDays(phaseStart, phaseEnd);
          if (totalPhaseDays === 0) continue;

          const phaseMonths = eachMonthOfInterval({ start: startOfMonth(phaseStart), end: startOfMonth(phaseEnd) });
          for (const m of phaseMonths) {
            const mEnd = endOfMonth(m);
            const overlapStart = m < phaseStart ? phaseStart : m;
            const overlapEnd = mEnd > phaseEnd ? phaseEnd : mEnd;
            const overlapDays = getWorkingDays(overlapStart, overlapEnd);
            const monthKey = format(m, "yyyy-MM-01");
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + phaseFee * (overlapDays / totalPhaseDays);
          }
        }
      } else {
        const totalDays = getWorkingDays(projStart, projEnd);
        if (totalDays > 0) {
          const projMonths = eachMonthOfInterval({ start: startOfMonth(projStart), end: startOfMonth(projEnd) });
          for (const m of projMonths) {
            const mEnd = endOfMonth(m);
            const overlapStart = m < projStart ? projStart : m;
            const overlapEnd = mEnd > projEnd ? projEnd : mEnd;
            const overlapDays = getWorkingDays(overlapStart, overlapEnd);
            const monthKey = format(m, "yyyy-MM-01");
            monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + agencyFee * (overlapDays / totalDays);
          }
        }
      }

      projectCalcs.push({ id: p.id, title: p.title, office: p.office, client: p.ultimate_parent || p.title, startDate: p.start_date, endDate: p.end_date, projectCurrency, fxRateGbp, fxRateUsd, monthlyRevenue });
    }

    // Currency conversion helper
    const toDisplay = (value: number, projectCurrency: string, fxGbp: number, fxUsd: number) => {
      if (projectCurrency === displayCurrency) return value;
      const gbpToUsd = fxUsd > 0 ? fxGbp / fxUsd : 1;
      let inGBP = value;
      if (projectCurrency === "USD") inGBP = value / gbpToUsd;
      else if (projectCurrency !== "GBP") inGBP = value / (fxGbp || 1);
      if (displayCurrency === "GBP") return inGBP;
      if (displayCurrency === "USD") return inGBP * gbpToUsd;
      return inGBP;
    };

    // Build per-project per-month entries WITHOUT gross-up applied.
    // Gross-up is applied in a downstream memo so toggling it doesn't
    // re-run this expensive computation.
    type PerProjectMonth = {
      id: string;
      title: string;
      client: string;
      startDate: string;
      endDate: string;
      monthKey: string;
      monthLabel: string;
      revDisplay: number;
      baseCostDisplay: number;
    };
    const perProjectMonths: PerProjectMonth[] = [];

    for (const pc of projectCalcs) {
      const projMonthlyCost = monthlyCostMap.get(pc.id);

      for (const month of months) {
        const monthKey = format(month, "yyyy-MM-01");
        const revInProjCurrency = pc.monthlyRevenue[monthKey] || 0;
        const revDisplay = toDisplay(revInProjCurrency, pc.projectCurrency, pc.fxRateGbp, pc.fxRateUsd);

        let baseCostDisplay = 0;
        const mc = projMonthlyCost?.get(monthKey);
        if (mc) {
          const costInProject = mc.costGbp * pc.fxRateGbp + mc.costUsd * pc.fxRateUsd;
          baseCostDisplay = toDisplay(costInProject, pc.projectCurrency, pc.fxRateGbp, pc.fxRateUsd);
        }

        if (revDisplay === 0 && baseCostDisplay === 0) continue;

        perProjectMonths.push({
          id: pc.id,
          title: pc.title,
          client: pc.client,
          startDate: pc.startDate,
          endDate: pc.endDate,
          monthKey,
          monthLabel: format(month, "MMM yy"),
          revDisplay,
          baseCostDisplay,
        });
      }
    }

    return { months, perProjectMonths };
  }, [projects, allRateCards, projectPhases, phaseAllocations, monthlyCostMap, officeFilter, cutoffDate, displayCurrency, today, todayStr, statusFilter, fallbackGbpUsdRate]);

  // Apply gross-up factors + aggregate. Cheap — re-runs instantly on toggle.
  const _computedTrend = useMemo(() => {
    const { months, perProjectMonths } = _baseTrend;
    type Bucket = { revenue: number; cost: number; profit: number };
    const overall: Record<string, Bucket> = {};
    const byProject: ProjectMonthlyEntry[] = [];

    for (const e of perProjectMonths) {
      let costDisplay = e.baseCostDisplay;
      if (costDisplay) {
        const factor = grossUpFactors?.get(e.id);
        if (factor && factor > 1) costDisplay *= factor;
      }
      const profit = e.revDisplay - costDisplay;

      if (!overall[e.monthKey]) overall[e.monthKey] = { revenue: 0, cost: 0, profit: 0 };
      overall[e.monthKey].revenue += e.revDisplay;
      overall[e.monthKey].cost += costDisplay;
      overall[e.monthKey].profit += profit;

      if (Math.round(e.revDisplay) !== 0 || Math.round(costDisplay) !== 0) {
        byProject.push({
          title: e.title,
          client: e.client,
          startDate: e.startDate,
          endDate: e.endDate,
          month: e.monthLabel,
          revenue: Math.round(e.revDisplay),
          cost: Math.round(costDisplay),
        });
      }
    }

    const overallArr = months.map((m) => {
      const k = format(m, "yyyy-MM-01");
      const d = overall[k] || { revenue: 0, cost: 0, profit: 0 };
      return {
        month: format(m, "MMM yy"),
        revenue: Math.round(d.revenue),
        cost: Math.round(d.cost),
        profit: Math.round(d.profit),
        margin: d.revenue > 0 ? Math.round((d.profit / d.revenue) * 100) : 0,
      };
    });

    return { overallArr, byProject };
  }, [_baseTrend, grossUpFactors]);

  const overallData = _computedTrend.overallArr;
  const projectMonthlyData = _computedTrend.byProject;

  // Emit trend data to parent (only when values actually change)
  const prevTrendRef = useRef<string>("");
  useEffect(() => {
    if (!onTrendData || overallData.length === 0) return;
    const key = JSON.stringify({ o: overallData, b: projectMonthlyData.length });
    if (key === prevTrendRef.current) return;
    prevTrendRef.current = key;
    onTrendData({ overall: overallData, byProject: projectMonthlyData });
  }, [overallData, projectMonthlyData, onTrendData]);

  // Compute the same data with allGrossUpFactors to determine fixed Y-axis domain
  const altOverallData = useMemo(() => {
    if (!allGrossUpFactors?.size) return overallData;
    // If current grossUpFactors equals allGrossUpFactors, compute without (empty factors)
    const isCurrentlyGrossedUp = grossUpFactors?.size === allGrossUpFactors.size;

    // Recompute monthly aggregation with alternative factors
    const lastFullMonth = startOfMonth(today);
    const allMonths = eachMonthOfInterval({
      start: startOfMonth(new Date(cutoffDate)),
      end: lastFullMonth,
    });
    const months = allMonths.filter((m) => m < lastFullMonth);

    const filtered = projects.filter((p: any) => {
      if (!matchesOffice(p.office, officeFilter)) return false;
      if (p.start_date < "2025-01-01") return false;
      if (p.end_date < cutoffDate || p.start_date > todayStr) return false;
      const client = (p.ultimate_parent || p.title || "").toLowerCase();
      if (client.includes("billion dollar boy")) return false;
      const recordType = (p.opportunity_record_type || "").trim().toLowerCase();
      if (EXCLUDED_RECORD_TYPES.includes(recordType)) return false;
      const totalScoped = (p.project_scopes || []).reduce((s: number, sc: any) => s + (sc.scoped_hours || 0), 0);
      if (totalScoped <= 0) return false;
      if (statusFilter === "ended") {
        const projEnd = new Date(p.end_date);
        if (projEnd > today) return false;
      }
      return true;
    });

    // Only need to compute monthly profits for each project with alt factors
    const altFactors = isCurrentlyGrossedUp ? new Map<string, number>() : allGrossUpFactors;
    type Bucket = { profit: number };
    const overall: Record<string, Bucket> = {};

    for (const p of filtered) {
      const proj = p as any;
      const projCurrency = proj.fee_calc_currency || proj.rate_cards?.currency || "GBP";
      let fxRateGbp: number;
      let fxRateUsd: number;
      if (proj.fx_rate_gbp || proj.fx_rate_usd) {
        fxRateGbp = proj.fx_rate_gbp || 1;
        fxRateUsd = proj.fx_rate_usd || (fxRateGbp * fallbackGbpUsdRate);
      } else if (projCurrency === "USD") {
        fxRateGbp = fallbackGbpUsdRate;
        fxRateUsd = 1;
      } else if (projCurrency === "GBP") {
        fxRateGbp = 1;
        fxRateUsd = 1 / fallbackGbpUsdRate;
      } else {
        fxRateGbp = 1;
        fxRateUsd = fallbackGbpUsdRate;
      }
      const projMonthlyCost = monthlyCostMap.get(proj.id);

      for (const month of months) {
        const monthKey = format(month, "yyyy-MM-01");
        const mc = projMonthlyCost?.get(monthKey);
        let costDisplay = 0;
        if (mc) {
          const costInProject = mc.costGbp * fxRateGbp + mc.costUsd * fxRateUsd;
          const gbpToUsd = fxRateUsd > 0 ? fxRateGbp / fxRateUsd : 1;
          if (displayCurrency === "GBP") {
            costDisplay = projCurrency === "GBP" ? costInProject : costInProject / gbpToUsd;
          } else {
            costDisplay = projCurrency === "USD" ? costInProject : costInProject * gbpToUsd;
          }
          const factor = altFactors.get(proj.id);
          if (factor && factor > 1) {
            costDisplay *= factor;
          }
        }
        // We only need cost diff for domain, revenue stays the same
        if (!overall[monthKey]) overall[monthKey] = { profit: 0 };
        // We'll approximate profit delta; use overallData's revenue
        overall[monthKey].profit -= costDisplay;
      }
    }

    // Add revenue back from overallData
    return months.map((m, i) => {
      const k = format(m, "yyyy-MM-01");
      const revenue = overallData[i]?.revenue || 0;
      const costOnlyProfit = overall[k]?.profit || 0;
      return { profit: Math.round(revenue + costOnlyProfit) };
    });
  }, [overallData, grossUpFactors, allGrossUpFactors, projects, monthlyCostMap, officeFilter, cutoffDate, displayCurrency, today, todayStr, statusFilter]);

  // Compute fixed Y-axis domain covering both grossed-up and non-grossed-up states
  const profitYDomain = useMemo(() => {
    if (!overallData.length) return undefined;
    const currentProfits = overallData.map(d => d.profit);
    const altProfits = altOverallData.map(d => d.profit);
    const allProfits = [...currentProfits, ...altProfits];
    
    const minProfit = Math.min(...allProfits);
    const maxProfit = Math.max(...allProfits);
    const padding = (maxProfit - minProfit) * 0.1;
    
    return [
      Math.floor((minProfit - padding) / 50000) * 50000,
      Math.ceil((maxProfit + padding) / 50000) * 50000,
    ] as [number, number];
  }, [overallData, altOverallData]);

  if (overallData.length <= 1) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profitability Over Time</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Monthly profit trend · Revenue proportioned by phase allocations · {displayCurrency}</p>
        </div>

        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={overallData} margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                yAxisId="profit"
                tickFormatter={(v) => formatCurrency(v, displayCurrency)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={80}
                domain={profitYDomain}
              />
              <YAxis
                yAxisId="margin"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={45}
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
                      <p className="font-medium mb-1">{d.month}</p>
                      <p className="text-muted-foreground">Revenue: <span className="font-medium text-foreground">{formatCurrency(d.revenue, displayCurrency)}</span></p>
                      <p className="text-muted-foreground">Cost: <span className="font-medium text-foreground">{formatCurrency(d.cost, displayCurrency)}</span></p>
                      <p className="text-muted-foreground">Profit: <span className={cn("font-medium", d.profit < 0 ? "text-destructive" : "text-success")}>{formatCurrency(d.profit, displayCurrency)}</span></p>
                      <p className="text-muted-foreground">Margin: <span className="font-medium text-foreground">{d.margin}%</span></p>
                    </div>
                  );
                }}
              />
              <ReferenceLine yAxisId="profit" y={0} stroke="hsl(var(--border))" />
              <Bar yAxisId="profit" dataKey="profit" radius={[4, 4, 0, 0]}>
                {overallData.map((entry, i) => (
                  <Cell key={i} fill={entry.profit >= 0 ? "hsl(142, 71%, 45%)" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
              <Line
                yAxisId="margin"
                type="monotone"
                dataKey="margin"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                strokeDasharray="4 4"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-success" />
            <span className="text-[10px] text-muted-foreground">Profit (bars)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-primary rounded" style={{ borderTop: "2px dashed" }} />
            <span className="text-[10px] text-muted-foreground">Margin % (line)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitabilityTrendChart;
