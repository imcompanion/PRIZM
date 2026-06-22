import React, { useMemo, useState, useEffect } from "react";
import { calculateInternalCostPerHour } from "@/lib/calculations";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type TalentBudgetState } from "./TalentBudgetTab";
import { calculateCreatorCosts, type TalentCalcResult } from "./creatorCostEngine";
import { calculateServiceHours, computeAgencyFee, type ServiceHoursResult, type EngineInput } from "./serviceHoursEngine";
import { type Recommendation } from "./ScopeRecommendations";
import { applyOverridesToLines } from "./scopeOverrides";

function fmt(n: number, symbol: string): string {
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

interface FeeCalcSections {
  projectManagement: { enabled: boolean; involvement: string; [k: string]: any };
  creative: { enabled: boolean; [k: string]: any };
  strategy: { enabled: boolean; [k: string]: any };
  talentContent: { enabled: boolean; [k: string]: any };
  paidMedia: { enabled: boolean; paidMediaSpend: number; [k: string]: any };
  productionCosts: { enabled: boolean; productionCompany: number; contractedAgencyProducer: number; insurance: number; licensing: number; staffTravel: number; contingency: number; [k: string]: any };
  productProcurement: { enabled: boolean; influencerTotal: number; shipmentsPerInfluencer: number; shippingMaterialsCost: number; contingencyCost: number; [k: string]: any };
  reporting: { enabled: boolean; [k: string]: any };
  otherServices: { enabled: boolean; audioLicenceCosts: number; blsReportCount: number; blsCostPerReport: number; eventCosts: number; giftingBoxes: number; productsCostPerBox: number; postageCostPerBox: number; productionCostPerBox: number; [k: string]: any };
}

interface FeeCalcSummaryProps {
  state: {
    office: "UK" | "US";
    client: string;
    projectName: string;
    oppNumber: string;
    rateCard: string;
    currency: string;
    durationMonths: number;
    sections: FeeCalcSections;
    talentBudget: TalentBudgetState;
  };
  currencySymbol: string;
  appliedRecs?: Recommendation[];
}

const SERVICE_LABELS: Record<string, string> = {
  projectManagement: "Project Management",
  creative: "Creative",
  strategy: "Strategy",
  talentContent: "Talent & Content",
  paidMedia: "Paid Media",
  productionCosts: "Production",
  productProcurement: "Procurement",
  reporting: "Reporting",
  otherServices: "Other Services",
};

function CollapsibleSection({ section, sectionData, blendedRate, sym, sectionLines, rateLookup, hasOptimisation, originalSectionFee }: {
  section: string;
  sectionData: { hours: number; fee: number };
  blendedRate: number;
  sym: string;
  sectionLines: { task: string; role: string; hours: number }[];
  rateLookup: Map<string, number>;
  hasOptimisation?: boolean;
  originalSectionFee?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <React.Fragment>
      <TableRow className="bg-muted/30 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <TableCell className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
            {section}
          </span>
        </TableCell>
        <TableCell />
        <TableCell className="text-right font-mono text-xs text-muted-foreground">{sectionData.hours.toFixed(1)}h</TableCell>
        <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(Math.round(blendedRate), sym)}</TableCell>
        {hasOptimisation && (
          <TableCell className="text-right font-mono text-xs text-muted-foreground">{fmt(Math.round(originalSectionFee ?? 0), sym)}</TableCell>
        )}
        <TableCell className="text-right font-mono text-xs font-medium">{fmt(sectionData.fee, sym)}</TableCell>
      </TableRow>
      {open && sectionLines.map((line, i) => {
        const rate = rateLookup.get(line.role.toLowerCase()) || 0;
        return (
          <TableRow key={`${section}-${i}`}>
            <TableCell className="pl-6 text-sm text-muted-foreground">{line.task}</TableCell>
            <TableCell className="text-sm">{line.role}</TableCell>
            <TableCell className="text-right font-mono text-sm">{line.hours.toFixed(1)}</TableCell>
            <TableCell className="text-right font-mono text-sm">
              {rate > 0 ? fmt(rate, sym) : <span className="text-destructive text-xs">No rate</span>}
            </TableCell>
            {hasOptimisation && <TableCell />}
            <TableCell className="text-right font-mono text-sm">{fmt(line.hours * rate, sym)}</TableCell>
          </TableRow>
        );
      })}
    </React.Fragment>
  );
}

function CollapsibleCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronDown className={`h-4 w-4 transition-transform text-muted-foreground ${open ? "" : "-rotate-90"}`} />
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              {subtitle && !open && (
                <span className="text-sm font-mono text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function FeeCalcSummary({ state, currencySymbol: sym, appliedRecs = [], onMarginChange }: FeeCalcSummaryProps) {
  const s = state.sections;

  // ═══ Fetch rate card roles from DB ═══
  const { data: rateCardRoles = [] } = useQuery({
    queryKey: ["fee-calc-rate-card-roles", state.rateCard],
    enabled: !!state.rateCard,
    queryFn: async () => {
      const all: { roleName: string; hourlyRate: number }[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("rate_cards")
          .select("role_id, hourly_rate, roles!inner(name)")
          .eq("name", state.rateCard)
          .range(from, from + 999);
        if (error) throw error;
        for (const rc of data || []) {
          const roleName = (rc.roles as any)?.name || "";
          all.push({ roleName, hourlyRate: Number(rc.hourly_rate) || 0 });
        }
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return all;
    },
  });

  // ═══ Fetch people for internal cost calculation ═══
  const { data: peopleData = [] } = useQuery({
    queryKey: ["fee-calc-people-costs", state.office],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("annual_salary, role_id, roles!inner(name, billable_capacity_hours)")
        .not("annual_salary", "is", null)
        .eq("office", state.office);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        roleName: p.roles?.name || "",
        salary: Number(p.annual_salary) || 0,
        billableCapacity: Number(p.roles?.billable_capacity_hours) || 7.5,
      }));
    },
  });

  const internalCostLookup = useMemo(() => {
    const roleAgg = new Map<string, { totalCost: number; count: number }>();
    for (const p of peopleData) {
      if (!p.roleName || p.salary <= 0) continue;
      const key = p.roleName.toLowerCase();
      const costPerHour = calculateInternalCostPerHour(p.salary, p.billableCapacity);
      const existing = roleAgg.get(key) || { totalCost: 0, count: 0 };
      roleAgg.set(key, { totalCost: existing.totalCost + costPerHour, count: existing.count + 1 });
    }
    const m = new Map<string, number>();
    for (const [key, agg] of roleAgg) m.set(key, agg.totalCost / agg.count);
    return m;
  }, [peopleData]);

  // ═══ Creator costs engine ═══
  const talentCalc: TalentCalcResult = useMemo(
    () => calculateCreatorCosts(state.talentBudget, state.office),
    [state.talentBudget, state.office]
  );

  // ═══ Derive platform deliverables from talent groups ═══
  const platformStats = useMemo(() => {
    const groups = state.talentBudget.groups.filter(g => g.platform && g.influencers > 0);
    let instagramInfluencers = 0, instagramImages = 0, instagramStories = 0, instagramVideos = 0;
    let tiktokInfluencers = 0, tiktokVideos = 0;
    let youtubeInfluencers = 0, youtubeVideos = 0;
    let contentHouseAssets = 0;

    for (const g of groups) {
      const p = g.platform.toLowerCase();
      const infls = g.influencers;
      const images = (g.singleImage + g.multiImage) * infls;
      const stories = g.storyFrames * infls;
      const videos = g.shortVideo * infls;

      if (p.includes("instagram")) {
        instagramInfluencers += infls;
        instagramImages += images;
        instagramStories += stories;
        instagramVideos += videos;
      } else if (p.includes("tiktok")) {
        tiktokInfluencers += infls;
        tiktokVideos += videos;
      } else if (p.includes("youtube")) {
        youtubeInfluencers += infls;
        youtubeVideos += videos;
      } else if (p.includes("content house")) {
        contentHouseAssets += (g.singleImage + g.multiImage + g.shortVideo) * infls;
      }
    }

    return {
      instagramInfluencers, instagramImages, instagramStories, instagramVideos,
      tiktokInfluencers, tiktokVideos,
      youtubeInfluencers, youtubeVideos,
      contentHouseAssets,
    };
  }, [state.talentBudget.groups]);

  // ═══ Service hours engine ═══
  const serviceHoursResult = useMemo(() => {
    const totalInfluencers = state.talentBudget.groups.reduce((sum, g) => sum + (g.influencers || 0), 0);
    const giftingInfluencers = state.talentBudget.giftingTiers.reduce((sum, t) => sum + (t.influencers || 0), 0);

    // Creative — replicate Excel RTB logic
    // R32 = Total Rounds = IF(concepts+ideas>0, 1+roundsOfFeedback, 0)
    // Each RTB row: concepts per RTB (full for RTB1, min(,1) for RTB3+), ideas per RTB
    // Days per RTB = (concepts*5) + (ideas*2.5) + (ideas*(concepts-1))
    // creativeJobs = total days across all RTBs (N37 = SUM(N30:N36))
    const creative = s.creative;
    const concepts = creative.creativeConceptsCount || 0;
    const ideas = creative.executionalIdeasCount || 0;
    const totalRounds = (concepts + ideas > 0) ? 1 + (creative.roundsOfFeedback || 0) : 0;
    let creativeDaysTotal = 0;
    if (creative.enabled && totalRounds > 0) {
      for (let rtbIdx = 1; rtbIdx <= 7; rtbIdx++) {
        if (totalRounds < rtbIdx) break;
        // RTB1 gets full concepts; RTB2 gets full concepts; RTB3+ gets min(concepts, 1)
        const rtbConcepts = rtbIdx <= 2 ? concepts : Math.min(concepts, 1);
        const rtbIdeas = ideas;
        creativeDaysTotal += (rtbConcepts * 5) + (rtbIdeas * 2.5) + (rtbIdeas * (rtbConcepts - 1));
      }
    }
    const creativeJobs = Math.max(creativeDaysTotal / 4, 0); // R33 = N37/4

    // Paid media stats
    const paidChannels = [s.paidMedia.paid1, s.paidMedia.paid2, s.paidMedia.paid3, s.paidMedia.paid4]
      .filter((c: any) => c.type !== "None" && c.platform);
    const totalPaidStaticAssets = paidChannels.reduce((sum: number, c: any) => sum + (c.staticAssets || 0), 0);
    const totalPaidDynamicAssets = paidChannels.reduce((sum: number, c: any) => sum + (c.dynamicAssets || 0), 0);

    const engineInput: EngineInput = {
      durationMonths: state.durationMonths,
      pmEnabled: s.projectManagement.enabled,
      pmInvolvement: s.projectManagement.involvement,
      creativeEnabled: s.creative.enabled,
      creativeJobs,
      proposalRevisions: creative.proposalRevisions || 0,
      roundsOfFeedback: creative.roundsOfFeedback || 0,
      talentEnabled: s.talentContent.enabled,
      totalInfluencers,
      crossPlatformInfluencers: 0,
      influencerBriefRevisions: s.talentContent.influencerBriefRevisions || 0,
      longListRevisions: s.talentContent.longListRevisions || 0,
      contentIdeation: s.talentContent.contentIdeation || false,
      ideationRevisions: s.talentContent.ideationRevisions || 0,
      creativeTeamInvolved: s.talentContent.creativeTeamInvolved || false,
      contentProduction: s.talentContent.contentProduction || false,
      contentRevisions: s.talentContent.contentRevisions || 0,
      contentReviews: s.talentContent.contentReviews || false,
      ...platformStats,
      giftingInfluencers,
      procurementEnabled: s.productProcurement.enabled,
      totalShipments: (s.productProcurement.influencerTotal || 0) * (s.productProcurement.shipmentsPerInfluencer || 0),
      productionEnabled: s.productionCosts.enabled,
      contentHouseAssets: platformStats.contentHouseAssets,
      arFilters: s.otherServices.arFilters || 0,
      gifs: s.otherServices.gifs || 0,
      eventCount: s.otherServices.eventCount || 0,
      giftingBoxes: s.otherServices.giftingBoxes || 0,
      giftingDesigns: s.otherServices.giftingDesigns || 0,
      researchReports: s.otherServices.blsReportCount || 0,
      paidMediaEnabled: s.paidMedia.enabled,
      paidMediaPlatforms: paidChannels.length,
      paidMediaLiveMonths: s.paidMedia.paidMediaLiveMonths || state.durationMonths,
      paidMediaComplexity: s.paidMedia.complexity || "",
      paidMediaSpend: s.paidMedia.paidMediaSpend || 0,
      totalPaidStaticAssets,
      totalPaidDynamicAssets,
      consultancyInvolvement: s.paidMedia.consultancyInvolvement || "Light",
      reportingEnabled: s.reporting.enabled,
      reportingInvolvement: s.reporting.involvement || "Reporting only",
      dashboards: s.reporting.dashboards || 0,
      snapshotReports: s.reporting.snapshotReports || 0,
      standardReports: s.reporting.standardReports || 0,
      advancedReports: s.reporting.advancedReports || 0,
    };

    const lines = calculateServiceHours(engineInput);
    // Apply scope optimiser overrides if any
    const adjustedLines = appliedRecs.length > 0 ? applyOverridesToLines(lines, appliedRecs) : lines;
    const optimised = computeAgencyFee(adjustedLines, rateCardRoles);
    const original = appliedRecs.length > 0 ? computeAgencyFee(lines, rateCardRoles) : optimised;
    return { current: optimised, original };
  }, [s, state.durationMonths, state.talentBudget, rateCardRoles, platformStats, appliedRecs]);

  const serviceHours = serviceHoursResult.current;
  const originalServiceHours = serviceHoursResult.original;
  const hasOptimisation = appliedRecs.length > 0 && originalServiceHours.totalFee !== serviceHours.totalFee;

  // ═══ Third-party costs ═══
  const productionTotal = useMemo(() => {
    if (!s.productionCosts.enabled) return 0;
    const pc = s.productionCosts;
    return (pc.productionCompany || 0) + (pc.contractedAgencyProducer || 0) +
      (pc.insurance || 0) + (pc.licensing || 0) + (pc.staffTravel || 0) + (pc.contingency || 0);
  }, [s.productionCosts]);

  const procurementTotal = useMemo(() => {
    if (!s.productProcurement.enabled) return 0;
    const pp = s.productProcurement;
    return (pp.influencerTotal || 0) * (pp.shipmentsPerInfluencer || 0) *
      ((pp.shippingMaterialsCost || 0) + (pp.contingencyCost || 0));
  }, [s.productProcurement]);

  const otherCosts = useMemo(() => {
    if (!s.otherServices.enabled) return { audioLicences: 0, blsReports: 0, events: 0, gifting: 0, total: 0 };
    const os = s.otherServices;
    const audioLicences = os.audioLicenceCosts || 0;
    const blsReports = (os.blsReportCount || 0) * (os.blsCostPerReport || 0);
    const events = os.eventCosts || 0;
    const giftingPerBox = (os.productsCostPerBox || 0) + (os.postageCostPerBox || 0) + (os.productionCostPerBox || 0);
    const gifting = (os.giftingBoxes || 0) * giftingPerBox;
    return { audioLicences, blsReports, events, gifting, total: audioLicences + blsReports + events + gifting };
  }, [s.otherServices]);

  const paidMediaSpend = s.paidMedia.enabled ? (s.paidMedia.paidMediaSpend || 0) : 0;
  const totalThirdParty = paidMediaSpend + productionTotal + procurementTotal + otherCosts.total;
  const grandTotal = serviceHours.totalFee + talentCalc.externalBudget + totalThirdParty;
  const originalGrandTotal = originalServiceHours.totalFee + talentCalc.externalBudget + totalThirdParty;
  const activeServices = Object.entries(s).filter(([, v]) => v.enabled).map(([k]) => SERVICE_LABELS[k] || k);

  // Compute internal costs for profit margin (exclude roles without cost data)
  const originalMarginCalc = useMemo(() => {
    let fee = 0, cost = 0;
    const missing = new Set<string>();
    const rl = new Map<string, number>();
    for (const rc of rateCardRoles) rl.set(rc.roleName.toLowerCase(), rc.hourlyRate);
    for (const line of originalServiceHours.lines) {
      const costRate = internalCostLookup.get(line.role.toLowerCase());
      const rate = rl.get(line.role.toLowerCase()) || 0;
      if (costRate != null) {
        fee += line.hours * rate;
        cost += line.hours * costRate;
      } else {
        missing.add(line.role);
      }
    }
    return { fee, cost, missingRoles: Array.from(missing) };
  }, [originalServiceHours.lines, internalCostLookup, rateCardRoles]);

  const optimisedMarginCalc = useMemo(() => {
    let fee = 0, cost = 0;
    const rl = new Map<string, number>();
    for (const rc of rateCardRoles) rl.set(rc.roleName.toLowerCase(), rc.hourlyRate);
    for (const line of serviceHours.lines) {
      const costRate = internalCostLookup.get(line.role.toLowerCase());
      const rate = rl.get(line.role.toLowerCase()) || 0;
      if (costRate != null) {
        fee += line.hours * rate;
        cost += line.hours * costRate;
      }
    }
    return { fee, cost };
  }, [serviceHours.lines, internalCostLookup, rateCardRoles]);

  useEffect(() => {
    if (onMarginChange) {
      const margin = optimisedMarginCalc.fee > 0 
        ? ((optimisedMarginCalc.fee - optimisedMarginCalc.cost) / optimisedMarginCalc.fee) * 100 
        : 0;
      onMarginChange(margin);
    }
  }, [optimisedMarginCalc, onMarginChange]);

  // Build rate lookup for display
  const rateLookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const rc of rateCardRoles) m.set(rc.roleName.toLowerCase(), rc.hourlyRate);
    return m;
  }, [rateCardRoles]);

  // Get ordered unique sections
  const sectionOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const l of serviceHours.lines) {
      if (!seen.has(l.section)) { seen.add(l.section); order.push(l.section); }
    }
    return order;
  }, [serviceHours.lines]);

  // Group sections by phase for display
  const phaseGroups = useMemo(() => {
    const PHASE_ORDER = ["RTB", "Creators & Contracting", "Content Creation & Go Live", "Reporting & Wrap Up", null];
    const phaseMap = new Map<string | null, string[]>();

    for (const section of sectionOrder) {
      const line = serviceHours.lines.find(l => l.section === section);
      const phase = line?.phase ?? null;
      if (!phaseMap.has(phase)) phaseMap.set(phase, []);
      phaseMap.get(phase)!.push(section);
    }

    const groups: { phase: string | null; sections: string[] }[] = [];
    for (const p of PHASE_ORDER) {
      if (phaseMap.has(p)) {
        groups.push({ phase: p, sections: phaseMap.get(p)! });
        phaseMap.delete(p);
      }
    }
    for (const [phase, sections] of phaseMap) {
      groups.push({ phase, sections });
    }
    return groups;
  }, [sectionOrder, serviceHours.lines]);

  const handleExportJSON = () => {
    const exportData = {
      "1_RawInputs": {
        project: {
          client: state.client,
          projectName: state.projectName,
          office: state.office,
          durationMonths: state.durationMonths,
        },
        talentBrief: {
          groups: state.talentBudget.groups,
          gifting: state.talentBudget.giftingTiers,
          multipliers: {
            organicUsageWeeks: state.talentBudget.organicUsageWeeks,
            paidUsageWeeks: state.talentBudget.paidUsageWeeks,
            exclusivityWeeks: state.talentBudget.exclusivityWeeks,
            timePressure: state.talentBudget.timePressure,
            restrictedGoods: state.talentBudget.restrictedGoods,
          }
        },
        scopingRules: state.sections
      },
      "2_IntermediateTalentCalculations": {
        groups: talentCalc.groups.map(g => ({
          groupName: g.groupName,
          baseFee: g.baseFee,
          impressionEstimate: g.impressions,
          appliedMultipliers: {
            usage: g.appliedUsageMultiplier,
            territory: g.appliedTerritoryMultiplier,
            followerTier: g.followerTierMultiplier
          },
          finalGroupFee: g.finalFee
        })),
        totalCreatorCost: talentCalc.totalFee
      },
      "3_IntermediateStaffingCalculations": {
        sections: serviceHours.lines.reduce((acc, line) => {
          if (!acc[line.section]) {
            acc[line.section] = { totalHours: 0, roles: [] };
          }
          acc[line.section].totalHours += line.hours;
          const rate = rateLookup.get(line.role.toLowerCase()) || 0;
          acc[line.section].roles.push({
            role: line.role,
            hours: line.hours,
            hourlyRate: rate,
            cost: line.hours * rate
          });
          return acc;
        }, {} as Record<string, any>)
      },
      "4_FinalAggregatedOutputs": {
        totalServiceFee: serviceHours.totalFee,
        totalCreatorCosts: talentCalc.externalBudget,
        totalThirdPartyCosts: totalThirdParty,
        agencyMargin: optimisedMarginCalc.fee - optimisedMarginCalc.cost,
        fxExposureFee: talentCalc.fxPremium,
        contingency: talentCalc.talentContingency,
        grandTotal: grandTotal
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pryzm-export-${(state.projectName || 'calc').replace(/\\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Project Overview</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Output Export (JSON)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Client</span><p className="font-medium">{state.client === "__new__" ? state.projectName : state.client || "—"}</p></div>
            <div><span className="text-muted-foreground">Project</span><p className="font-medium">{state.projectName || "—"}</p></div>
            <div><span className="text-muted-foreground">Opp Number</span><p className="font-medium">{state.oppNumber || "—"}</p></div>
            <div><span className="text-muted-foreground">Rate Card</span><p className="font-medium">{state.rateCard || "—"}</p></div>
            <div><span className="text-muted-foreground">Currency</span><p className="font-medium">{state.currency}</p></div>
            <div><span className="text-muted-foreground">Duration</span><p className="font-medium">{state.durationMonths ? `${state.durationMonths} months` : "—"}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {activeServices.map((svc) => <Badge key={svc} variant="secondary" className="text-xs">{svc}</Badge>)}
          </div>
        </CardContent>
      </Card>

      {/* BDB Internal Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">BDB Internal Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Value ({sym})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Service Fees (Agency)</TableCell>
                <TableCell className="text-right font-mono">{fmt(serviceHours.totalFee, sym)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Talent Budget (Creator Payments)</TableCell>
                <TableCell className="text-right font-mono">{fmt(talentCalc.totalFee, sym)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Companion Creator Costs (3%)</TableCell>
                <TableCell className="text-right font-mono">{fmt(talentCalc.companionCreatorCosts, sym)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Contingency — Talent ({state.talentBudget.talentContingencyPct}%)</TableCell>
                <TableCell className="text-right font-mono">{fmt(talentCalc.talentContingency, sym)}</TableCell>
              </TableRow>
              {talentCalc.fxPremium > 0 && (
                <TableRow>
                  <TableCell>FX Premium ({state.talentBudget.fxPremiumPct}%)</TableCell>
                  <TableCell className="text-right font-mono">{fmt(talentCalc.fxPremium, sym)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>Other Third Party Costs</TableCell>
                <TableCell className="text-right font-mono">{fmt(totalThirdParty, sym)}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Grand Total</TableCell>
                <TableCell className="text-right font-mono font-semibold">{fmt(grandTotal, sym)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* ═══ Talent Summary (collapsible) ═══ */}
      {talentCalc.totalInfluencers > 0 && (
        <CollapsibleCard title="Talent Summary" subtitle={fmt(talentCalc.externalBudget, sym)}>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="rounded-md border p-3 text-center">
                <p className="text-muted-foreground text-xs">Internal Budget</p>
                <p className="text-lg font-bold font-mono">{fmt(talentCalc.internalBudget, sym)}</p>
                <p className="text-[10px] text-muted-foreground">Available to pay Creators</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-muted-foreground text-xs">External Budget</p>
                <p className="text-lg font-bold font-mono">{fmt(talentCalc.externalBudget, sym)}</p>
                <p className="text-[10px] text-muted-foreground">Total incl. fees & contingency</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Creators</TableHead>
                  <TableHead className="text-right">Deliverables</TableHead>
                  <TableHead className="text-right">Est. Impressions</TableHead>
                  <TableHead className="text-right">Creator Cost ({sym})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(talentCalc.platformBreakdown).map(([platform, data]) => (
                  <TableRow key={platform}>
                    <TableCell>{platform}</TableCell>
                    <TableCell className="text-right font-mono">{data.creators.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{data.deliverables.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{Math.round(data.impressions).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(data.creatorCost, sym)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{talentCalc.totalInfluencers.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{talentCalc.totalDeliverables.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{Math.round(talentCalc.totalImpressions).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(talentCalc.totalFee, sym)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            {talentCalc.groups.length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Per-Group Detail</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Content Fee/Infl</TableHead>
                      <TableHead className="text-right">Reposting/Infl</TableHead>
                      <TableHead className="text-right">Boosters/Infl</TableHead>
                      <TableHead className="text-right">Multipliers/Infl</TableHead>
                      <TableHead className="text-right">Total Fee/Infl</TableHead>
                      <TableHead className="text-right">Group Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {talentCalc.groups.map((g, i) => (
                      <TableRow key={g.groupId}>
                        <TableCell className="text-xs">
                          Group {i + 1}
                          <span className="text-muted-foreground ml-1">({g.platform})</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(g.contentFeePerInfl, sym)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(g.repostingPerInfl, sym)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(g.boosterFeePerInfl, sym)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(g.multiplierFeePerInfl, sym)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(g.totalFeePerInfl, sym)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium">{fmt(g.totalFee, sym)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
        </CollapsibleCard>
      )}

      {/* ═══ Agency Fee — Hours × Rate Card (collapsible) ═══ */}
      <CollapsibleCard title="Agency Fee (Time Management × Rate Card)" subtitle={`${serviceHours.totalHours.toFixed(1)}h · ${fmt(serviceHours.totalFee, sym)}`}>
          {!state.rateCard ? (
            <p className="text-sm text-muted-foreground italic">Select a rate card in Project Setup to calculate agency fees.</p>
          ) : serviceHours.totalHours === 0 ? (
            <p className="text-sm text-muted-foreground italic">Enable services and configure parameters to generate hours.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate ({sym}/h)</TableHead>
                  {hasOptimisation && <TableHead className="text-right">Original Fee ({sym})</TableHead>}
                  <TableHead className="text-right">{hasOptimisation ? `Optimised Fee (${sym})` : `Fee (${sym})`}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseGroups.map(({ phase, sections }) => {
                  const phaseHours = sections.reduce((sum, sec) => sum + (serviceHours.bySection[sec]?.hours || 0), 0);
                  const phaseFee = sections.reduce((sum, sec) => sum + (serviceHours.bySection[sec]?.fee || 0), 0);
                  const originalPhaseFee = hasOptimisation
                    ? sections.reduce((sum, sec) => sum + (originalServiceHours.bySection[sec]?.fee || 0), 0)
                    : phaseFee;
                  if (phaseHours === 0 && originalPhaseFee === 0) return null;
                  return (
                    <React.Fragment key={phase ?? "n/a"}>
                      <TableRow className="bg-primary/10 border-t-2 border-primary/20">
                        <TableCell colSpan={3} className="font-bold text-xs uppercase tracking-wider text-primary">
                          {phase ?? "N/A (Overhead)"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-primary">{phaseHours.toFixed(1)}h</TableCell>
                        {hasOptimisation && (
                          <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(originalPhaseFee, sym)}</TableCell>
                        )}
                        <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(phaseFee, sym)}</TableCell>
                      </TableRow>
                      {sections.map(section => {
                        const sectionData = serviceHours.bySection[section];
                        if (!sectionData || sectionData.hours === 0) return null;
                        const sectionLines = serviceHours.lines.filter(l => l.section === section);
                        const blendedRate = sectionData.hours > 0 ? sectionData.fee / sectionData.hours : 0;
                        return (
                          <CollapsibleSection key={section} section={section} sectionData={sectionData} blendedRate={blendedRate} sym={sym} sectionLines={sectionLines} rateLookup={rateLookup} hasOptimisation={hasOptimisation} originalSectionFee={hasOptimisation ? (originalServiceHours.bySection[section]?.fee || 0) : undefined} />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">Total Agency Fee</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{serviceHours.totalHours.toFixed(1)}h</TableCell>
                  {hasOptimisation && (
                    <TableCell className="text-right font-mono font-semibold">{fmt(originalServiceHours.totalFee, sym)}</TableCell>
                  )}
                  <TableCell className="text-right font-mono font-semibold">{fmt(serviceHours.totalFee, sym)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-sm">Agency Fee %</TableCell>
                  {hasOptimisation && (
                    <TableCell className="text-right font-mono text-sm">
                      {originalGrandTotal > 0 ? `${((originalServiceHours.totalFee / originalGrandTotal) * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-sm">
                    {grandTotal > 0 ? `${((serviceHours.totalFee / grandTotal) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-sm">
                    Agency Fee Profit Margin
                    {originalMarginCalc.missingRoles.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground/60">
                        (excl. {originalMarginCalc.missingRoles.length} role{originalMarginCalc.missingRoles.length > 1 ? "s" : ""} without cost data)
                      </span>
                    )}
                  </TableCell>
                  {hasOptimisation && (
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {originalMarginCalc.fee > 0
                        ? `${(((originalMarginCalc.fee - originalMarginCalc.cost) / originalMarginCalc.fee) * 100).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-sm">
                    {optimisedMarginCalc.fee > 0
                      ? `${(((optimisedMarginCalc.fee - optimisedMarginCalc.cost) / optimisedMarginCalc.fee) * 100).toFixed(1)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
      </CollapsibleCard>


      {/* Third Party Costs */}
      {totalThirdParty > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Third Party Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Cost ({sym})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidMediaSpend > 0 && <TableRow><TableCell>Paid Media Spend</TableCell><TableCell className="text-right font-mono">{fmt(paidMediaSpend, sym)}</TableCell></TableRow>}
                {productionTotal > 0 && <TableRow><TableCell>Production Budget</TableCell><TableCell className="text-right font-mono">{fmt(productionTotal, sym)}</TableCell></TableRow>}
                {procurementTotal > 0 && <TableRow><TableCell>Product Procurement</TableCell><TableCell className="text-right font-mono">{fmt(procurementTotal, sym)}</TableCell></TableRow>}
                {otherCosts.gifting > 0 && <TableRow><TableCell>Gifting Materials</TableCell><TableCell className="text-right font-mono">{fmt(otherCosts.gifting, sym)}</TableCell></TableRow>}
                {otherCosts.audioLicences > 0 && <TableRow><TableCell>Audio Licences</TableCell><TableCell className="text-right font-mono">{fmt(otherCosts.audioLicences, sym)}</TableCell></TableRow>}
                {otherCosts.events > 0 && <TableRow><TableCell>Events</TableCell><TableCell className="text-right font-mono">{fmt(otherCosts.events, sym)}</TableCell></TableRow>}
                {otherCosts.blsReports > 0 && <TableRow><TableCell>BLS / Research Reports</TableCell><TableCell className="text-right font-mono">{fmt(otherCosts.blsReports, sym)}</TableCell></TableRow>}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total Third Party</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(totalThirdParty, sym)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
