import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjectFxRate } from "@/lib/fx";

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAnalyticsContext } from "@/contexts/AnalyticsContext";
import { toast } from "sonner";
import { format, differenceInDays, eachDayOfInterval, isWeekend } from "date-fns";
import { cn } from "@/lib/utils";
import { ProjectPhasesTab } from "@/components/project/ProjectPhasesTab";
import { ProjectAISummary } from "@/components/project/ProjectAISummary";
import { formatCurrency, formatHours, calculateInternalCostPerHour } from "@/lib/calculations";

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const tabsHeaderRef = useRef<HTMLDivElement | null>(null);
  const { setPageData } = useAnalyticsContext();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_scopes(*, roles(name, billable_capacity_hours), allocations(*, people(name, annual_salary))), rate_cards(name, hourly_rate, currency)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: rateCards = [] } = useQuery({
    queryKey: ["rate_cards"],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("rate_cards")
          .select("*, roles(name)")
          .order("name")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  const { data: people = [] } = useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const all: any[] = [];
      let offset = 0;
      const BATCH = 1000;
      while (true) {
        const { data, error } = await supabase.from("people").select("*, roles(name, billable_capacity_hours)").order("name").range(offset, offset + BATCH - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH) break;
        offset += BATCH;
      }
      return all;
    },
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["time_entries", id],
    queryFn: async () => {
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("time_entries")
          .select("*, people(name, annual_salary, role_id, roles(name, billable_capacity_hours))")
          .eq("project_id", id!)
          .order("date", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        allData.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
  });

  // Fetch ALL time entries for people on this project (across all projects) for accurate completeness
  // Include sibling person IDs (same name, different employment periods)
  const personIdsOnProject = (() => {
    const directIds = new Set([
      ...timeEntries.map((te: any) => te.person_id),
      ...(project?.project_scopes || []).flatMap((s: any) =>
        (s.allocations || []).map((a: any) => a.person_id)
      ),
    ]);
    // Find all sibling IDs by name
    const namesOnProject = new Set<string>();
    directIds.forEach(pid => {
      const person = people.find((p: any) => p.id === pid);
      if (person?.name) namesOnProject.add(person.name.toLowerCase().trim());
    });
    const allIds = new Set(directIds);
    people.forEach((p: any) => {
      if (p.name && namesOnProject.has(p.name.toLowerCase().trim())) {
        allIds.add(p.id);
      }
    });
    return [...allIds];
  })();

  const { data: personHourTotals = [], isFetched: allPersonEntriesFetched } = useQuery({
    queryKey: ["person_hours_in_range", id, personIdsOnProject.sort().join(",")],
    queryFn: async () => {
      if (personIdsOnProject.length === 0) return [];
      const { data, error } = await supabase.rpc("get_person_hours_in_range", {
        _person_ids: personIdsOnProject,
        _start_date: project!.start_date,
        _end_date: project!.end_date,
      });
      if (error) throw error;
      return (data || []) as { person_id: string; total_hours: number }[];
    },
    enabled: !!project && personIdsOnProject.length > 0,
  });

  const { data: projectPhases = [] } = useQuery({
    queryKey: ["project_phases_overview", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_phases")
        .select("id, phase_name, start_date, end_date, sort_order")
        .eq("project_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: phaseAllocations = [] } = useQuery({
    queryKey: ["phase_allocations_overview", id],
    queryFn: async () => {
      const scopeIds = (project?.project_scopes || []).map((s: any) => s.id);
      if (scopeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("phase_allocations")
        .select("phase_id, project_scope_id, hours")
        .in("project_scope_id", scopeIds);
      if (error) throw error;
      return data;
    },
    enabled: !!project,
  });


  const totalScopedHours = project ? (project.project_scopes || []).reduce((s: number, sc: any) => s + sc.scoped_hours, 0) : 0;
  const discountPct = project?.rate_card_discount || 0;
  const rcName = project?.rate_cards?.name;

  // Project currency: from fee calc import, or rate card currency, or GBP default
  const projectCurrency = project?.fee_calc_currency || project?.rate_cards?.currency || "GBP";
  // Fetch real historical FX rate for projects missing stored rates
  const needsFxFallback = !!(project && !project.fx_rate_gbp && !project.fx_rate_usd);
  const { data: historicalFxRate } = useQuery({
    queryKey: ["fx_rate", project?.start_date, project?.end_date],
    queryFn: () => getProjectFxRate(project!.start_date, project!.end_date),
    enabled: needsFxFallback && !!project,
    staleTime: Infinity,
  });

  // When project has stored FX rates, use them directly.
  // When missing, derive proper rates from historical GBP→USD data based on project currency.
  const storedGbp = (project as any)?.fx_rate_gbp;
  const storedUsd = (project as any)?.fx_rate_usd;
  const histRate = historicalFxRate ?? 1.35;
  let fxRateGbp: number;
  let fxRateUsd: number;
  if (storedGbp || storedUsd) {
    fxRateGbp = storedGbp || 1;
    fxRateUsd = storedUsd || (fxRateGbp * histRate);
  } else if (projectCurrency === "USD") {
    // 1 GBP = X USD, 1 USD = 1 USD
    fxRateGbp = histRate;
    fxRateUsd = 1;
  } else if (projectCurrency === "GBP") {
    fxRateGbp = 1;
    fxRateUsd = 1 / histRate;
  } else {
    fxRateGbp = 1;
    fxRateUsd = histRate;
  }

  // Helper to convert internal cost (based on person's office) to project currency
  const convertCostToProjectCurrency = (costInLocalCurrency: number, office?: string): number => {
    if (projectCurrency === "GBP" && (!office || office === "UK")) return costInLocalCurrency;
    if (projectCurrency === "USD" && office === "US") return costInLocalCurrency;
    // Convert: if person is UK (GBP), multiply by fx_rate_gbp to get project currency
    // If person is US (USD), multiply by fx_rate_usd to get project currency
    if (!office || office === "UK") return costInLocalCurrency * fxRateGbp;
    if (office === "US") return costInLocalCurrency * fxRateUsd;
    return costInLocalCurrency * fxRateGbp; // fallback
  };

  // Build per-role effective rates from the rate card group
  // Rate card rates are in the rate card's standard currency; convert to project currency
  const rateCardBaseCurrency = project?.rate_cards?.currency || "GBP";
  const roleRates: Record<string, number> = {};
  if (rcName) {
    const targetName = rcName.trim().toLowerCase();
    rateCards
      .filter((rc) => (rc.name || "").trim().toLowerCase() === targetName)
      .forEach((rc) => {
        let rate = Number(rc.hourly_rate || 0) * (1 - discountPct / 100);
        // Convert rate card rate to project currency if different
        if (rateCardBaseCurrency !== projectCurrency) {
          if (rateCardBaseCurrency === "GBP") rate *= fxRateGbp;
          else if (rateCardBaseCurrency === "USD") rate *= fxRateUsd;
        }
        roleRates[rc.role_id] = rate;
      });
  }

  const hasRoleRates = Object.keys(roleRates).length > 0;

  // Agency fee = Price - Media Cost - Gross Budget (matching Projects page calculation)
  const getExtraNum = (proj: any, ...keys: string[]): number | null => {
    if (!proj) return null;
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

  const agencyFeePrice = project?.price ?? getExtraNum(project, "total price", "price gbp/usd", "price");
  const agencyFeeMediaCost = project?.media_cost ?? getExtraNum(project, "media cost", "cost - paid media budget") ?? 0;
  const agencyFeeGrossBudget = project?.gross_budget ?? getExtraNum(project, "gross budget full value (gbp / usd)", "gross budget full value", "gross budget", "cost - net budget") ?? 0;
  const agencyFee = agencyFeePrice !== null ? agencyFeePrice - agencyFeeMediaCost - agencyFeeGrossBudget : null;

  // Budgeted fee from rate card (kept for internal budgeting)
  const budgetedFee = hasRoleRates
    ? (project?.project_scopes || []).reduce((sum: number, sc: any) => {
        const rate = roleRates[sc.role_id] || 0;
        return sum + sc.scoped_hours * rate;
      }, 0)
    : null;
  const totalActualHours = timeEntries.reduce((s, te) => s + te.hours, 0);

  const totalActualCost = timeEntries.reduce((sum, te) => {
    const salary = (te as any).people?.annual_salary;
    const cap = (te as any).people?.roles?.billable_capacity_hours;
    if (!salary) return sum;
    const costPerHour = calculateInternalCostPerHour(salary, cap);
    // Find person's office for FX conversion
    const person = people.find(p => p.id === te.person_id);
    const office = person?.office || "UK";
    return sum + te.hours * convertCostToProjectCurrency(costPerHour, office);
  }, 0);

  // Budgeted internal cost per role (avg cost/hr for each role, converted to project currency)
  const budgetedCostByRole: Record<string, number> = {};
  const budgetedInternalCost = (project?.project_scopes || []).reduce((sum: number, scope: any) => {
    const roleId = scope.role_id;
    const rolePeople = people.filter((p) => p.role_id === roleId && p.annual_salary);
    if (rolePeople.length === 0) return sum;
    const avgCostPerHour = rolePeople.reduce((s, p) => {
      const cap = p.roles?.billable_capacity_hours;
      const cost = calculateInternalCostPerHour(p.annual_salary!, cap);
      return s + convertCostToProjectCurrency(cost, p.office);
    }, 0) / rolePeople.length;
    budgetedCostByRole[roleId] = avgCostPerHour;
    return sum + scope.scoped_hours * avgCostPerHour;
  }, 0);

  const budgetedProfit = (agencyFee ?? 0) - budgetedInternalCost;
  // Actual profit will be recalculated after agencyFeeSoFar is computed

  // "So Far" calculations based on completed phases or flat distribution fallback
  const today = new Date();
  const hasPhaseAllocations = phaseAllocations.length > 0;
  const completedPhaseIds = projectPhases
    .filter((p) => p.end_date && new Date(p.end_date) <= today)
    .map((p) => p.id);

  // Sum phase_allocations hours per scope for completed phases
  const soFarHoursPerScope: Record<string, number> = {};

  if (hasPhaseAllocations && completedPhaseIds.length > 0) {
    phaseAllocations
      .filter((pa) => completedPhaseIds.includes(pa.phase_id))
      .forEach((pa) => {
        if (pa.project_scope_id) {
          soFarHoursPerScope[pa.project_scope_id] = (soFarHoursPerScope[pa.project_scope_id] || 0) + pa.hours;
        }
      });
  } else {
    // Fallback: flat distribution based on working days elapsed
    const projStart = new Date(project?.start_date || "");
    const projEnd = new Date(project?.end_date || "");
    const clampedToday = today < projStart ? projStart : today > projEnd ? projEnd : today;

    const countWorkingDays = (from: Date, to: Date) => {
      if (from > to) return 0;
      return eachDayOfInterval({ start: from, end: to }).filter((d) => !isWeekend(d)).length;
    };

    const totalWorkingDays = countWorkingDays(projStart, projEnd);
    const elapsedWorkingDays = countWorkingDays(projStart, clampedToday);
    const elapsedPct = totalWorkingDays > 0 ? elapsedWorkingDays / totalWorkingDays : 0;

    (project?.project_scopes || []).forEach((sc: any) => {
      soFarHoursPerScope[sc.id] = sc.scoped_hours * elapsedPct;
    });
  }

  const soFarBudgetHours = Object.values(soFarHoursPerScope).reduce((s, h) => s + h, 0);

  const soFarBudgetFee = hasRoleRates
    ? (project?.project_scopes || []).reduce((sum: number, sc: any) => {
        const hours = soFarHoursPerScope[sc.id] || 0;
        const rate = roleRates[sc.role_id] || 0;
        return sum + hours * rate;
      }, 0)
    : null;

  const soFarBudgetCost = (project?.project_scopes || []).reduce((sum: number, scope: any) => {
    const hours = soFarHoursPerScope[scope.id] || 0;
    const roleId = scope.role_id;
    const rolePeople = people.filter((p) => p.role_id === roleId && p.annual_salary);
    if (rolePeople.length === 0) return sum;
    const avgCostPerHour = rolePeople.reduce((s, p) => {
      const cap = p.roles?.billable_capacity_hours;
      const cost = calculateInternalCostPerHour(p.annual_salary!, cap);
      return s + convertCostToProjectCurrency(cost, p.office);
    }, 0) / rolePeople.length;
    return sum + hours * avgCostPerHour;
  }, 0);

  // Proportioned agency fee "so far" — use rate card fee ratio if available, otherwise hours ratio
  const agencyFeeSoFar = agencyFee !== null
    ? budgetedFee && budgetedFee > 0
      ? agencyFee * ((soFarBudgetFee ?? 0) / budgetedFee)
      : totalScopedHours > 0
        ? agencyFee * (soFarBudgetHours / totalScopedHours)
        : 0
    : null;
  const soFarBudgetProfit = (agencyFeeSoFar ?? 0) - soFarBudgetCost;
  const profit = (agencyFeeSoFar ?? 0) - totalActualCost;

  // ── Push data to analytics context ──
  useEffect(() => {
    if (!project || !allPersonEntriesFetched) return;

    const currencySymbol = projectCurrency === "USD" ? "$" : projectCurrency === "EUR" ? "€" : "£";
    const fmt = (v: number) => `${currencySymbol}${Math.round(v).toLocaleString()}`;

    // Build per-role breakdown with individual people costs
    const scopeByRole = (project.project_scopes || []).map((scope: any) => {
      const roleName = scope.roles?.name || "Unknown";
      const scopedHours = scope.scoped_hours;

      // Actual hours & cost for this role from time entries
      const roleTimeEntries = timeEntries.filter((te: any) => {
        const personRoleId = (te as any).people?.role_id;
        return personRoleId === scope.role_id;
      });

      const actualHoursForRole = roleTimeEntries.reduce((s: number, te: any) => s + te.hours, 0);

      // Per-person breakdown
      const personMap: Record<string, { name: string; hours: number; costPerHour: number; totalCost: number }> = {};
      roleTimeEntries.forEach((te: any) => {
        const pid = te.person_id;
        if (!pid) return;
        const personName = (te as any).people?.name || "Unknown";
        const salary = (te as any).people?.annual_salary;
        const cap = (te as any).people?.roles?.billable_capacity_hours;
        const costPerHour = salary ? calculateInternalCostPerHour(salary, cap) : 0;
        const person = people.find((p: any) => p.id === pid);
        const office = person?.office || "UK";
        const convertedCost = convertCostToProjectCurrency(costPerHour, office);

        if (!personMap[pid]) {
          personMap[pid] = { name: personName, hours: 0, costPerHour: convertedCost, totalCost: 0 };
        }
        personMap[pid].hours += te.hours;
        personMap[pid].totalCost += te.hours * convertedCost;
      });

      // Budgeted avg cost per hour for this role
      const rolePeople = people.filter((p: any) => p.role_id === scope.role_id && p.annual_salary);
      const avgBudgetCostPerHour = rolePeople.length > 0
        ? rolePeople.reduce((s: number, p: any) => {
            const cap = p.roles?.billable_capacity_hours;
            const cost = calculateInternalCostPerHour(p.annual_salary, cap);
            return s + convertCostToProjectCurrency(cost, p.office);
          }, 0) / rolePeople.length
        : 0;

      const scopedCost = scopedHours * avgBudgetCostPerHour;
      const actualCostForRole = Object.values(personMap).reduce((s, p) => s + p.totalCost, 0);

      return {
        role: roleName,
        scopedHours,
        actualHours: Math.round(actualHoursForRole),
        budgetedAvgCostPerHour: fmt(avgBudgetCostPerHour),
        scopedCost: fmt(scopedCost),
        actualCost: fmt(actualCostForRole),
        people: Object.values(personMap)
          .sort((a, b) => b.totalCost - a.totalCost)
          .slice(0, 10)
          .map(p => ({
            name: p.name,
            hours: Math.round(p.hours),
            costPerHour: fmt(p.costPerHour),
            totalCost: fmt(p.totalCost),
          })),
      };
    });

    const budgetMargin = (agencyFee ?? 0) > 0 ? Math.round((budgetedProfit / (agencyFee ?? 1)) * 100) : null;
    const actualMargin = (agencyFeeSoFar ?? 0) > 0 ? Math.round((profit / (agencyFeeSoFar ?? 1)) * 100) : null;
    const soFarMargin = (agencyFeeSoFar ?? 0) > 0 ? Math.round((soFarBudgetProfit / (agencyFeeSoFar ?? 1)) * 100) : null;

    setPageData("Project Detail", {
      project: {
        title: project.title,
        client: project.ultimate_parent || project.parent_account || project.sf_account,
        startDate: project.start_date,
        endDate: project.end_date,
        office: project.office,
        agencyFee: agencyFee !== null ? fmt(agencyFee) : "N/A",
        currency: projectCurrency,
      },
      budget: {
        scopedHours: totalScopedHours,
        budgetedInternalCost: fmt(budgetedInternalCost),
        budgetedFee: budgetedFee !== null ? fmt(budgetedFee) : "N/A",
        budgetedProfit: fmt(budgetedProfit),
        budgetedMargin: budgetMargin !== null ? `${budgetMargin}%` : "N/A",
      },
      soFar: {
        expectedHours: Math.round(soFarBudgetHours),
        expectedCost: fmt(soFarBudgetCost),
        proportionedFee: agencyFeeSoFar !== null ? fmt(agencyFeeSoFar) : "N/A",
        expectedProfit: fmt(soFarBudgetProfit),
        expectedMargin: soFarMargin !== null ? `${soFarMargin}%` : "N/A",
      },
      actuals: {
        totalHours: Math.round(totalActualHours),
        totalCost: fmt(totalActualCost),
        profit: fmt(profit),
        margin: actualMargin !== null ? `${actualMargin}%` : "N/A",
      },
      scopeByRole,
    });
  }, [project, timeEntries, people, allPersonEntriesFetched, totalScopedHours, budgetedInternalCost, budgetedFee, budgetedProfit, agencyFee, agencyFeeSoFar, soFarBudgetHours, soFarBudgetCost, soFarBudgetProfit, profit, totalActualHours, totalActualCost, projectCurrency]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!project) return <div className="p-8">Project not found</div>;

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => {
          if (location.key !== "default") navigate(-1);
          else navigate("/projects");
        }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />Back
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">{project.title}</h1>
          {project.opportunity_number && (
            <p className="text-muted-foreground text-xs mt-0.5">Project Number: {project.opportunity_number}</p>
          )}
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(project.start_date), "dd MMM yyyy")} – {format(new Date(project.end_date), "dd MMM yyyy")}
          </p>
          {project.rate_cards && (
            <p className="text-muted-foreground text-sm mt-0.5">
              Rate Card: {project.rate_cards.name}
              {discountPct > 0 && ` (${discountPct}% discount)`}
              {projectCurrency !== rateCardBaseCurrency && ` · ${projectCurrency} (converted from ${rateCardBaseCurrency})`}
              {projectCurrency === rateCardBaseCurrency && projectCurrency !== "GBP" && ` · ${projectCurrency}`}
            </p>
          )}
          {(project as any).fx_lock_date && projectCurrency !== "GBP" && (
            <p className="text-muted-foreground text-xs mt-0.5">
              FX Lock: {format(new Date((project as any).fx_lock_date), "dd MMM yyyy")}
              {fxRateGbp !== 1 && ` · 1 GBP = ${fxRateGbp.toFixed(4)} ${projectCurrency}`}
              {fxRateUsd !== 1 && ` · 1 USD = ${fxRateUsd.toFixed(4)} ${projectCurrency}`}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Agency Fee</p>
          <p className="text-2xl font-display font-bold mt-1">{agencyFee !== null ? formatCurrency(agencyFee, projectCurrency) : "—"}</p>
          {agencyFee !== null && agencyFee > 0 && totalActualCost > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {Math.round((totalActualCost / agencyFee) * 100)}% cost burn
            </p>
          )}
        </div>
      </div>

      {/* Timeline moved below tabs header */}

      {/* AI Summary */}
      <ProjectAISummary
        projectId={id!}
        timeEntries={timeEntries}
        projectStartDate={project.start_date}
        projectEndDate={project.end_date}
        metrics={{
          title: project.title,
          timelineElapsedPct: (() => {
            const start = new Date(project.start_date);
            const end = new Date(project.end_date);
            const totalDays = differenceInDays(end, start);
            const elapsed = Math.max(0, differenceInDays(today < start ? start : today > end ? end : today, start));
            return totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
          })(),
          daysRemaining: Math.max(0, differenceInDays(new Date(project.end_date), today)),
          budgetHoursSoFar: Math.round(soFarBudgetHours),
          actualHours: Math.round(totalActualHours),
          budgetProfitSoFar: formatCurrency(soFarBudgetProfit, projectCurrency),
          actualProfit: formatCurrency(profit, projectCurrency),
          budgetMarginSoFar: soFarBudgetFee && soFarBudgetFee > 0 ? Math.round((soFarBudgetProfit / soFarBudgetFee) * 100) : 0,
          actualMargin: agencyFee && agencyFee > 0 ? Math.round((profit / agencyFee) * 100) : (totalActualCost > 0 ? -100 : 0),
          totalScopedHours: totalScopedHours,
          agencyFee: agencyFee !== null ? formatCurrency(agencyFee, projectCurrency) : formatCurrency(0, projectCurrency),
        }}
        teamContext={{
          people: (() => {
            if (!allPersonEntriesFetched) return []; // Wait for all-project entries before computing completeness
            if (people.length === 0) return []; // Wait for people records so employment dates can clip expected hours
            // Build per-person context from allocations and time entries
            const personMap: Record<string, { name: string; role: string; loggedHours: number; allocatedHours: number; lastEntry: string | null; employmentStart: string | null; employmentEnd: string | null; capacityPerDay: number }> = {};
            // From allocations
            (project.project_scopes || []).forEach((scope: any) => {
              (scope.allocations || []).forEach((alloc: any) => {
                const pid = alloc.person_id;
                const person = people.find(p => p.id === pid);
                if (!personMap[pid]) {
                  personMap[pid] = {
                    name: alloc.people?.name || "Unknown",
                    role: scope.roles?.name || "Unknown",
                    loggedHours: 0,
                    allocatedHours: 0,
                    lastEntry: null,
                    employmentStart: person?.overall_start_date || person?.employment_start_date || null,
                    employmentEnd: person?.overall_end_date || person?.employment_end_date || null,
                    capacityPerDay: scope.roles?.billable_capacity_hours || 7.5,
                  };
                }
                personMap[pid].allocatedHours += alloc.allocated_hours || 0;
              });
            });
            // From time entries
            timeEntries.forEach((te: any) => {
              const pid = te.person_id;
              const person = people.find(p => p.id === pid);
              if (!personMap[pid]) {
                personMap[pid] = {
                  name: te.people?.name || "Unknown",
                  role: (te.people?.roles?.name) || "Unknown",
                  loggedHours: 0,
                  allocatedHours: 0,
                  lastEntry: null,
                  employmentStart: person?.overall_start_date || person?.employment_start_date || null,
                  employmentEnd: person?.overall_end_date || person?.employment_end_date || null,
                  capacityPerDay: te.people?.roles?.billable_capacity_hours || 7.5,
                };
              }
              personMap[pid].loggedHours += te.hours;
              if (!personMap[pid].lastEntry || te.date > personMap[pid].lastEntry!) {
                personMap[pid].lastEntry = te.date;
              }
            });
            // Calculate expected hours and completeness using ALL time entries (across all projects)
            const projStart = new Date(project.start_date);
            const effectiveEnd = today < new Date(project.end_date) ? today : new Date(project.end_date);
            const workingDaysElapsed = projStart <= effectiveEnd
              ? eachDayOfInterval({ start: projStart, end: effectiveEnd }).filter(d => !isWeekend(d)).length
              : 0;
            // Build total hours and last entry date per person from DB function results
            const totalHoursByPerson: Record<string, number> = {};
            const globalLastEntryByPerson: Record<string, string | null> = {};
            personHourTotals.forEach((row: any) => {
              totalHoursByPerson[row.person_id] = Number(row.total_hours) || 0;
              globalLastEntryByPerson[row.person_id] = row.last_entry_date || null;
            });

            // Build a map of name -> overall employment bounds (earliest overall_start, latest overall_end)
            // This handles people with multiple records across employment periods / role changes
            const overallBoundsByName: Record<string, { employmentStart: string | null; employmentEnd: string | null }> = {};
            const allIdsByName: Record<string, string[]> = {};
            people.forEach((person: any) => {
              const normName = person.name?.toLowerCase()?.trim();
              if (!normName) return;
              if (!allIdsByName[normName]) allIdsByName[normName] = [];
              allIdsByName[normName].push(person.id);
              const existing = overallBoundsByName[normName];
              const pStart = person.overall_start_date || person.employment_start_date;
              const pEnd = person.overall_end_date || person.employment_end_date;
              if (!existing) {
                overallBoundsByName[normName] = { employmentStart: pStart || null, employmentEnd: pEnd || null };
              } else {
                // Use earliest start
                if (pStart && (!existing.employmentStart || pStart < existing.employmentStart)) {
                  existing.employmentStart = pStart;
                }
                // Use latest end
                if (pEnd && (!existing.employmentEnd || pEnd > existing.employmentEnd)) {
                  existing.employmentEnd = pEnd;
                }
              }
            });

            // Filter out people who started after today (new joiners not yet active)
            return Object.entries(personMap).filter(([_, p]) => {
              const normName = p.name?.toLowerCase()?.trim();
              const bounds = normName ? overallBoundsByName[normName] : null;
              const empStartStr = bounds?.employmentStart || p.employmentStart;
              if (!empStartStr) return true;
              const empStart = new Date(empStartStr);
              const twoWeeksAgo = new Date();
              twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
              return empStart <= twoWeeksAgo;
            }).map(([pid, p]) => {
              const normName = p.name?.toLowerCase()?.trim();
              const bounds = normName ? overallBoundsByName[normName] : null;
              const empStartStr = bounds?.employmentStart || p.employmentStart;
              const empEndStr = bounds?.employmentEnd || p.employmentEnd;
              const empStart = empStartStr ? new Date(empStartStr) : projStart;
              const empEnd = empEndStr ? new Date(empEndStr) : null;
              const effectiveStart = empStart > projStart ? empStart : projStart;
              const effectiveEndDate = empEnd && empEnd < effectiveEnd ? empEnd : effectiveEnd;
              // Exclude parental-leave days from expected hours (sum across all of this
              // person's parental-leave windows that overlap the project span).
              const leaveIntervals = (people as any[])
                .filter(pp => (pp.team || "").toLowerCase().trim() === "parental leave"
                  && (pp.name || "").trim().toLowerCase() === normName
                  && pp.employment_start_date && pp.employment_end_date)
                .map(pp => ({ start: new Date(pp.employment_start_date), end: new Date(pp.employment_end_date) }));
              const personWorkingDays = effectiveStart <= effectiveEndDate
                ? eachDayOfInterval({ start: effectiveStart, end: effectiveEndDate }).filter(d => {
                    if (isWeekend(d)) return false;
                    const t = d.getTime();
                    return !leaveIntervals.some(iv => t >= iv.start.getTime() && t <= iv.end.getTime());
                  }).length
                : 0;
              const expectedHours = Math.round(personWorkingDays * 7.5);
              // Aggregate hours across ALL person IDs with the same name
              const siblingIds = normName ? (allIdsByName[normName] || [pid]) : [pid];
              let totalLogged = 0;
              let latestEntry: string | null = null;
              for (const sibId of siblingIds) {
                totalLogged += totalHoursByPerson[sibId] || 0;
                const entry = globalLastEntryByPerson[sibId];
                if (entry && (!latestEntry || entry > latestEntry)) latestEntry = entry;
              }
              const completeness = expectedHours > 0 ? Math.round((totalLogged / expectedHours) * 100) : 0;
              return { personId: pid, ...p, employmentStart: empStartStr, employmentEnd: empEndStr, lastEntry: latestEntry || p.lastEntry, expectedHours, completeness, totalLoggedHours: Math.round(totalLogged * 10) / 10 };
            });
          })(),
          phases: (() => {
            const phaseIdsWithHours = new Set(
              phaseAllocations
                .filter((pa: any) => Number(pa.hours) > 0)
                .map((pa: any) => pa.phase_id)
            );

            return projectPhases
              .filter((p) => phaseIdsWithHours.has(p.id))
              .map((p) => ({
                name: p.phase_name,
                startDate: p.start_date,
                endDate: p.end_date,
                status: p.end_date && new Date(p.end_date) <= today
                  ? "complete"
                  : p.start_date && new Date(p.start_date) <= today
                  ? "in progress"
                  : "upcoming",
              }));
          })(),
        }}
        onGoToPhases={() => {
          tabsHeaderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          setActiveTab("phases");
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div ref={tabsHeaderRef} className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="phases">Phases</TabsTrigger>
          </TabsList>
          <div className="flex flex-col items-end gap-1">
            {(project as any).last_fee_calc_url && (
              <span className="text-xs text-muted-foreground">
                Last Import:{" "}
                <a
                  href={(project as any).last_fee_calc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  Google Sheet
                </a>
              </span>
            )}
          </div>
        </div>

        {/* Timeline progress bar */}
        {(() => {
          const start = new Date(project.start_date);
          const end = new Date(project.end_date);
          const now = new Date();
          const totalDays = differenceInDays(end, start);
          const elapsed = Math.max(0, differenceInDays(now < start ? start : now > end ? end : now, start));
          const pct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
          const remaining = Math.max(0, differenceInDays(end, now));
          const isComplete = now > end;

          return (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{format(start, "dd MMM yyyy")}</span>
                <span className="font-medium text-foreground">
                  {isComplete ? "Complete" : `${pct}% elapsed · ${remaining} days remaining`}
                </span>
                <span>{format(end, "dd MMM yyyy")}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", isComplete ? "bg-muted-foreground" : "bg-primary")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}

        <TabsContent value="overview">
          {/* Project Financials */}
          <Card className="mb-8">
            <CardContent className="pt-5 pb-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-5 text-primary">Project Financials</h2>
              <div className="grid grid-cols-3 gap-0">
                {/* Total Budget Column */}
                <div className="pr-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b pb-2">Total Budget</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="text-lg font-display font-bold">{Math.round(totalScopedHours).toLocaleString()}h</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Agency Fee</p>
                      <p className="text-lg font-display font-bold">{agencyFee !== null ? formatCurrency(agencyFee, projectCurrency) : "—"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="text-lg font-display font-bold">{formatCurrency(budgetedInternalCost, projectCurrency)}</p>
                    </div>
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 -mx-2">
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className={cn("text-lg font-display font-bold", budgetedProfit < 0 ? "text-destructive" : "")}>
                        {formatCurrency(budgetedProfit, projectCurrency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 -mx-2">
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p className={cn("text-lg font-display font-bold", budgetedProfit < 0 ? "text-destructive" : "")}>
                        {agencyFee && agencyFee > 0
                          ? `${Math.round((budgetedProfit / agencyFee) * 100)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Budget So Far Column */}
                <div className="px-6 border-l border-r">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b pb-2">Budget So Far</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="text-lg font-display font-bold">{Math.round(soFarBudgetHours).toLocaleString()}h</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Agency Fee</p>
                      <p className="text-lg font-display font-bold">{agencyFeeSoFar !== null ? formatCurrency(agencyFeeSoFar, projectCurrency) : "—"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="text-lg font-display font-bold">{formatCurrency(soFarBudgetCost, projectCurrency)}</p>
                    </div>
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 -mx-2">
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className={cn("text-lg font-display font-bold", soFarBudgetProfit < 0 ? "text-destructive" : "")}>
                        {formatCurrency(soFarBudgetProfit, projectCurrency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 -mx-2">
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p className={cn("text-lg font-display font-bold", soFarBudgetProfit < 0 ? "text-destructive" : "")}>
                        {agencyFeeSoFar && agencyFeeSoFar > 0
                          ? `${Math.round((soFarBudgetProfit / agencyFeeSoFar) * 100)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Actuals Column */}
                <div className="pl-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b pb-2">Actuals</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Hours</p>
                      <p className="text-lg font-display font-bold">{Math.round(totalActualHours).toLocaleString()}h</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Agency Fee</p>
                      <p className="text-lg font-display font-bold">{agencyFeeSoFar !== null ? formatCurrency(agencyFeeSoFar, projectCurrency) : "—"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="text-lg font-display font-bold">{formatCurrency(totalActualCost, projectCurrency)}</p>
                    </div>
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 -mx-2">
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className={cn("text-lg font-display font-bold", profit < 0 ? "text-destructive" : "text-primary")}>
                        {formatCurrency(profit, projectCurrency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1 -mx-2">
                      <p className="text-sm text-muted-foreground">Margin</p>
                      <p className={cn("text-lg font-display font-bold", profit < 0 ? "text-destructive" : "text-primary")}>
                        {agencyFeeSoFar && agencyFeeSoFar > 0
                          ? `${Math.round((profit / agencyFeeSoFar) * 100)}%`
                          : totalActualCost > 0 ? "−100%" : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Time Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Task</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No time tracked yet.</TableCell></TableRow>
                  ) : (
                    timeEntries.map((te) => (
                      <TableRow key={te.id}>
                        <TableCell>{format(new Date(te.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>{(te as any).people?.name}</TableCell>
                        <TableCell className="text-muted-foreground">{(te as any).people?.roles?.name || "—"}</TableCell>
                        <TableCell>{te.hours}h</TableCell>
                        <TableCell className="text-muted-foreground">{te.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases">
          <ProjectPhasesTab
            projectId={id!}
            projectStartDate={project.start_date}
            projectEndDate={project.end_date}
            scopes={(project.project_scopes || []).map((s: any) => ({
              id: s.id,
              role_id: s.role_id,
              scoped_hours: s.scoped_hours,
              roles: s.roles,
              allocations: s.allocations,
            }))}
            rateCardRates={roleRates}
            currency={projectCurrency}
            budgetedCostByRole={budgetedCostByRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetailPage;
