import React, { useMemo, useState } from "react";
import { calculateInternalCostPerHour, WORKING_HOURS_PER_YEAR } from "@/lib/calculations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Undo2, Trash2, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ScopeRecommendations, type Recommendation } from "./ScopeRecommendations";
import { calculateServiceHours, computeAgencyFee, type ServiceHoursResult, type EngineInput } from "./serviceHoursEngine";
import { calculateCreatorCosts } from "./creatorCostEngine";
import { type TalentBudgetState } from "./TalentBudgetTab";
import { buildOverrideMap, buildLineHoursMap, type OverrideMap } from "./scopeOverrides";

function fmt(n: number, symbol: string): string {
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

interface FeeCalcSections {
  projectManagement: { enabled: boolean; involvement: string; [k: string]: any };
  creative: { enabled: boolean; [k: string]: any };
  strategy: { enabled: boolean; [k: string]: any };
  talentContent: { enabled: boolean; [k: string]: any };
  paidMedia: { enabled: boolean; paidMediaSpend: number; [k: string]: any };
  productionCosts: { enabled: boolean; [k: string]: any };
  productProcurement: { enabled: boolean; influencerTotal: number; shipmentsPerInfluencer: number; [k: string]: any };
  reporting: { enabled: boolean; [k: string]: any };
  otherServices: { enabled: boolean; [k: string]: any };
}

interface ScopeOptimiserTabProps {
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
  appliedRecs: Recommendation[];
  onAppliedRecsChange: (recs: Recommendation[]) => void;
}

function CollapsibleSection({
  section,
  sectionData,
  blendedRate,
  sym,
  sectionLines,
  rateLookup,
  overrides,
  lineHoursMap,
}: {
  section: string;
  sectionData: { hours: number; fee: number };
  blendedRate: number;
  sym: string;
  sectionLines: { task: string; role: string; hours: number }[];
  rateLookup: Map<string, number>;
  overrides: OverrideMap;
  lineHoursMap: Map<string, number>;
}) {
  const [open, setOpen] = useState(false);

  // Compute optimised section totals
  let optHours = 0;
  let optFee = 0;
  for (const line of sectionLines) {
    const rate = rateLookup.get(line.role.toLowerCase()) || 0;
    const ov = overrides.get(line.role.toLowerCase());
    if (ov?.removed) continue;
    const lineKey = `${section}|${line.task}|${line.role}`;
    const h = lineHoursMap.get(lineKey) ?? line.hours;
    optHours += h;
    optFee += h * rate;
  }
  const optBlended = optHours > 0 ? optFee / optHours : 0;
  const hasChanges = Math.abs(optFee - sectionData.fee) > 0.5;

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
        <TableCell className="text-right font-mono text-xs font-medium">{fmt(sectionData.fee, sym)}</TableCell>
        <TableCell className={cn("text-right font-mono text-xs font-medium", hasChanges && "text-primary")}>
          {hasChanges ? fmt(optFee, sym) : "—"}
        </TableCell>
      </TableRow>
      {open && sectionLines.map((line, i) => {
        const rate = rateLookup.get(line.role.toLowerCase()) || 0;
        const originalFee = line.hours * rate;
        const ov = overrides.get(line.role.toLowerCase());
        const isRemoved = ov?.removed;
        const lineKey = `${section}|${line.task}|${line.role}`;
        const adjustedHours = lineHoursMap.get(lineKey);
        const isChanged = adjustedHours != null && Math.abs(adjustedHours - line.hours) > 0.1;
        const newHours = adjustedHours ?? line.hours;
        const newFee = newHours * rate;

        return (
          <TableRow key={`${section}-${i}`} className={cn(isRemoved && "opacity-50")}>
            <TableCell className="pl-6 text-sm text-muted-foreground">{line.task}</TableCell>
            <TableCell className="text-sm">
              {isRemoved ? (
                <span className="line-through text-muted-foreground">{line.role}</span>
              ) : line.role}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {isRemoved ? (
                <span className="line-through text-muted-foreground">{line.hours.toFixed(1)}</span>
              ) : isChanged ? (
                <span className="flex items-center justify-end gap-1.5">
                  <span className="line-through text-muted-foreground text-xs">{line.hours.toFixed(1)}</span>
                  <span className="text-primary font-semibold">{newHours.toFixed(1)}</span>
                </span>
              ) : (
                line.hours.toFixed(1)
              )}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {rate > 0 ? fmt(rate, sym) : <span className="text-destructive text-xs">No rate</span>}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {isRemoved ? (
                <span className="line-through text-muted-foreground">{fmt(originalFee, sym)}</span>
              ) : fmt(originalFee, sym)}
            </TableCell>
            <TableCell className={cn("text-right font-mono text-sm", (isRemoved || isChanged) && "font-semibold text-primary")}>
              {isRemoved ? (
                <span className="text-destructive font-semibold">{fmt(0, sym)}</span>
              ) : isChanged ? (
                fmt(newFee, sym)
              ) : "—"}
            </TableCell>
          </TableRow>
        );
      })}
    </React.Fragment>
  );
}

function CollapsibleCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
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

export function ScopeOptimiserTab({ state, currencySymbol: sym, appliedRecs, onAppliedRecsChange }: ScopeOptimiserTabProps) {
  const s = state.sections;
  // Fetch rate card roles
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

  const rateLookup = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rateCardRoles) m.set(r.roleName.toLowerCase(), r.hourlyRate);
    return m;
  }, [rateCardRoles]);

  // Fetch people to compute average internal cost per role
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

  // Platform stats
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
      if (p.includes("instagram")) { instagramInfluencers += infls; instagramImages += images; instagramStories += stories; instagramVideos += videos; }
      else if (p.includes("tiktok")) { tiktokInfluencers += infls; tiktokVideos += videos; }
      else if (p.includes("youtube")) { youtubeInfluencers += infls; youtubeVideos += videos; }
      else if (p.includes("content house")) { contentHouseAssets += (g.singleImage + g.multiImage + g.shortVideo) * infls; }
    }
    return { instagramInfluencers, instagramImages, instagramStories, instagramVideos, tiktokInfluencers, tiktokVideos, youtubeInfluencers, youtubeVideos, contentHouseAssets };
  }, [state.talentBudget.groups]);

  // Build engine input
  const engineInput: EngineInput = useMemo(() => {
    const totalInfluencers = state.talentBudget.groups.reduce((sum, g) => sum + (g.influencers || 0), 0);
    const giftingInfluencers = state.talentBudget.giftingTiers.reduce((sum, t) => sum + (t.influencers || 0), 0);
    const creative = s.creative;
    const concepts = creative.creativeConceptsCount || 0;
    const ideas = creative.executionalIdeasCount || 0;
    const totalRounds = (concepts + ideas > 0) ? 1 + (creative.roundsOfFeedback || 0) : 0;
    let creativeDaysTotal = 0;
    if (creative.enabled && totalRounds > 0) {
      for (let rtbIdx = 1; rtbIdx <= 7; rtbIdx++) {
        if (totalRounds < rtbIdx) break;
        const rtbConcepts = rtbIdx <= 2 ? concepts : Math.min(concepts, 1);
        creativeDaysTotal += (rtbConcepts * 5) + (ideas * 2.5) + (ideas * (rtbConcepts - 1));
      }
    }
    const creativeJobs = Math.max(creativeDaysTotal / 4, 0);
    const paidChannels = [s.paidMedia.paid1, s.paidMedia.paid2, s.paidMedia.paid3, s.paidMedia.paid4].filter((c: any) => c.type !== "None" && c.platform);
    return {
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
      totalPaidStaticAssets: paidChannels.reduce((sum: number, c: any) => sum + (c.staticAssets || 0), 0),
      totalPaidDynamicAssets: paidChannels.reduce((sum: number, c: any) => sum + (c.dynamicAssets || 0), 0),
      consultancyInvolvement: s.paidMedia.consultancyInvolvement || "Light",
      reportingEnabled: s.reporting.enabled,
      reportingInvolvement: s.reporting.involvement || "Reporting only",
      dashboards: s.reporting.dashboards || 0,
      snapshotReports: s.reporting.snapshotReports || 0,
      standardReports: s.reporting.standardReports || 0,
      advancedReports: s.reporting.advancedReports || 0,
    };
  }, [s, state.durationMonths, state.talentBudget, platformStats]);

  // Service hours result (original)
  const serviceHours: ServiceHoursResult = useMemo(() => {
    const lines = calculateServiceHours(engineInput);
    return computeAgencyFee(lines, rateCardRoles);
  }, [engineInput, rateCardRoles]);

  // Build override map from applied recommendations
  const overrides = useMemo(() => buildOverrideMap(appliedRecs), [appliedRecs]);

  // Build per-line hours distribution map
  const lineHoursMap = useMemo(
    () => buildLineHoursMap(serviceHours.lines, overrides),
    [serviceHours.lines, overrides]
  );

  // Collect added roles (not in original lines)
  const addedRoleLines = useMemo(() => {
    const existingRoles = new Set(serviceHours.lines.map(l => l.role.toLowerCase()));
    const added: { role: string; hours: number; rate: number }[] = [];
    for (const [roleKey, ov] of overrides) {
      if (!existingRoles.has(roleKey) && !ov.removed && ov.hours != null && ov.hours > 0) {
        const rate = rateLookup.get(roleKey) || 0;
        const originalRec = appliedRecs.find(r => r.type === "add" && r.roles.some(role => role.toLowerCase() === roleKey));
        const displayRole = originalRec?.roles.find(role => role.toLowerCase() === roleKey) || roleKey;
        added.push({ role: displayRole, hours: ov.hours, rate });
      }
    }
    return added;
  }, [overrides, serviceHours.lines, rateLookup, appliedRecs]);

  // Compute optimised totals (including added roles)
  // Only include roles with known internal costs in margin calculation
  const optimisedTotals = useMemo(() => {
    let hours = 0;
    let fee = 0;
    let internalCost = 0;
    let marginFee = 0; // fee only from roles with known costs
    let missingCostRoles = new Set<string>();
    for (const line of serviceHours.lines) {
      const rate = rateLookup.get(line.role.toLowerCase()) || 0;
      const costRate = internalCostLookup.get(line.role.toLowerCase());
      const ov = overrides.get(line.role.toLowerCase());
      if (ov?.removed) continue;
      const lineKey = `${line.section}|${line.task}|${line.role}`;
      const h = lineHoursMap.get(lineKey) ?? line.hours;
      hours += h;
      fee += h * rate;
      if (costRate != null) {
        internalCost += h * costRate;
        marginFee += h * rate;
      } else {
        missingCostRoles.add(line.role);
      }
    }
    for (const added of addedRoleLines) {
      hours += added.hours;
      fee += added.hours * added.rate;
      const costRate = internalCostLookup.get(added.role.toLowerCase());
      if (costRate != null) {
        internalCost += added.hours * costRate;
        marginFee += added.hours * added.rate;
      } else {
        missingCostRoles.add(added.role);
      }
    }
    return { hours, fee, internalCost, marginFee, missingCostRoles: Array.from(missingCostRoles) };
  }, [serviceHours, overrides, rateLookup, addedRoleLines, lineHoursMap, internalCostLookup]);

  // Compute original margin components (only roles with known costs)
  const originalMargin = useMemo(() => {
    let fee = 0;
    let cost = 0;
    let missingCostRoles = new Set<string>();
    for (const line of serviceHours.lines) {
      const rate = rateLookup.get(line.role.toLowerCase()) || 0;
      const costRate = internalCostLookup.get(line.role.toLowerCase());
      if (costRate != null) {
        fee += line.hours * rate;
        cost += line.hours * costRate;
      } else {
        missingCostRoles.add(line.role);
      }
    }
    return { fee, cost, missingCostRoles: Array.from(missingCostRoles) };
  }, [serviceHours.lines, internalCostLookup, rateLookup]);

  // Section ordering (same as Summary)
  const sectionOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const l of serviceHours.lines) {
      if (!seen.has(l.section)) { seen.add(l.section); order.push(l.section); }
    }
    return order;
  }, [serviceHours.lines]);

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
      if (phaseMap.has(p)) { groups.push({ phase: p, sections: phaseMap.get(p)! }); phaseMap.delete(p); }
    }
    for (const [phase, sections] of phaseMap) groups.push({ phase, sections });
    return groups;
  }, [sectionOrder, serviceHours.lines]);

  // Scoped roles for recommendations
  const scopedRoles = useMemo(() => {
    const roleMap = new Map<string, number>();
    for (const line of serviceHours.lines) {
      roleMap.set(line.role, (roleMap.get(line.role) || 0) + line.hours);
    }
    return Array.from(roleMap.entries()).map(([role, hours]) => ({ role, hours }));
  }, [serviceHours]);

  const handleApply = (rec: Recommendation) => {
    onAppliedRecsChange([...appliedRecs, rec]);
  };

  const handleUndo = (rec: Recommendation) => {
    const idx = appliedRecs.findIndex(r => r.type === rec.type && r.roles.join(",") === rec.roles.join(","));
    if (idx === -1) return;
    onAppliedRecsChange([...appliedRecs.slice(0, idx), ...appliedRecs.slice(idx + 1)]);
  };

  const hoursDelta = optimisedTotals.hours - serviceHours.totalHours;
  const feeDelta = optimisedTotals.fee - serviceHours.totalFee;

  // Compute grand total for Agency Fee % calculation
  const grandTotal = useMemo(() => {
    const talentCalc = calculateCreatorCosts(state.talentBudget, state.office);
    const pc = s.productionCosts;
    const productionTotal = pc.enabled ? ((pc.productionCompany || 0) + (pc.contractedAgencyProducer || 0) + (pc.insurance || 0) + (pc.licensing || 0) + (pc.staffTravel || 0) + (pc.contingency || 0)) : 0;
    const pp = s.productProcurement;
    const procurementTotal = pp.enabled ? ((pp.influencerTotal || 0) * (pp.shipmentsPerInfluencer || 0) * ((pp.shippingMaterialsCost || 0) + (pp.contingencyCost || 0))) : 0;
    const os = s.otherServices;
    const otherTotal = os.enabled ? ((os.audioLicenceCosts || 0) + ((os.blsReportCount || 0) * (os.blsCostPerReport || 0)) + (os.eventCosts || 0) + ((os.giftingBoxes || 0) * ((os.productsCostPerBox || 0) + (os.postageCostPerBox || 0) + (os.productionCostPerBox || 0)))) : 0;
    const paidMediaSpend = s.paidMedia.enabled ? (s.paidMedia.paidMediaSpend || 0) : 0;
    const thirdParty = paidMediaSpend + productionTotal + procurementTotal + otherTotal;
    return talentCalc.externalBudget + thirdParty;
  }, [state.talentBudget, state.office, s]);
  const originalGrandTotal = grandTotal + serviceHours.totalFee;
  const optimisedGrandTotal = grandTotal + optimisedTotals.fee;

  if (serviceHours.totalHours === 0 || !state.client) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Complete the Services and Summary stages first to use the Scope Optimiser.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">

      {/* Applied optimisations banner */}
      {appliedRecs.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  {appliedRecs.length} optimisation{appliedRecs.length !== 1 ? "s" : ""} applied
                </span>
                <span className="text-xs text-muted-foreground">
                  ({hoursDelta > 0 ? "+" : ""}{Math.round(hoursDelta)}h · {feeDelta > 0 ? "+" : ""}{fmt(Math.round(feeDelta), sym)})
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-destructive hover:text-destructive gap-1"
                onClick={() => onAppliedRecsChange([])}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {appliedRecs.map((rec, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] gap-1 pr-1 cursor-default"
                >
                  <span className="capitalize">{rec.type}</span> {rec.roles.join(" + ")}
                  {rec.suggestedHours != null && <span className="font-mono">→ {rec.suggestedHours}h</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-0.5 hover:bg-destructive/10"
                    onClick={() => handleUndo(rec)}
                    title="Undo this optimisation"
                  >
                    <Undo2 className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agency Fee table — mirroring Summary layout with Optimised Fee column */}
      <CollapsibleCard
        title="Agency Fee — Scope Optimiser"
        subtitle={`${serviceHours.totalHours.toFixed(1)}h · ${fmt(serviceHours.totalFee, sym)}${appliedRecs.length > 0 ? ` → ${fmt(optimisedTotals.fee, sym)}` : ""}`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Rate ({sym}/h)</TableHead>
              <TableHead className="text-right">Original Fee</TableHead>
              <TableHead className="text-right">Optimised Fee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {phaseGroups.map(({ phase, sections }) => {
              const phaseHours = sections.reduce((sum, sec) => sum + (serviceHours.bySection[sec]?.hours || 0), 0);
              const phaseFee = sections.reduce((sum, sec) => sum + (serviceHours.bySection[sec]?.fee || 0), 0);
              if (phaseHours === 0) return null;

              // Compute optimised phase totals
              let optPhaseFee = 0;
              for (const sec of sections) {
                const lines = serviceHours.lines.filter(l => l.section === sec);
                for (const line of lines) {
                  const rate = rateLookup.get(line.role.toLowerCase()) || 0;
                  const ov = overrides.get(line.role.toLowerCase());
                  if (ov?.removed) continue;
                  const lineKey = `${sec}|${line.task}|${line.role}`;
                  const h = lineHoursMap.get(lineKey) ?? line.hours;
                  optPhaseFee += h * rate;
                }
              }
              const phaseHasChanges = Math.abs(optPhaseFee - phaseFee) > 0.5;

              return (
                <React.Fragment key={phase ?? "n/a"}>
                  <TableRow className="bg-primary/10 border-t-2 border-primary/20">
                    <TableCell colSpan={3} className="font-bold text-xs uppercase tracking-wider text-primary">
                      {phase ?? "Ongoing Support"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-primary">{phaseHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-primary">{fmt(phaseFee, sym)}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs font-bold", phaseHasChanges ? "text-primary" : "text-muted-foreground")}>
                      {phaseHasChanges ? fmt(optPhaseFee, sym) : "—"}
                    </TableCell>
                  </TableRow>
                  {sections.map(section => {
                    const sectionData = serviceHours.bySection[section];
                    if (!sectionData || sectionData.hours === 0) return null;
                    const sectionLines = serviceHours.lines.filter(l => l.section === section);
                    const blendedRate = sectionData.hours > 0 ? sectionData.fee / sectionData.hours : 0;
                    return (
                      <CollapsibleSection
                        key={section}
                        section={section}
                        sectionData={sectionData}
                        blendedRate={blendedRate}
                        sym={sym}
                        sectionLines={sectionLines}
                        rateLookup={rateLookup}
                        overrides={overrides}
                        lineHoursMap={lineHoursMap}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
            {/* Added roles (from "add" recommendations) */}
            {addedRoleLines.length > 0 && (
              <>
                <TableRow className="bg-violet-500/10 border-t-2 border-violet-500/20">
                  <TableCell colSpan={6} className="font-bold text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Added by Optimiser
                  </TableCell>
                </TableRow>
                {addedRoleLines.map(added => {
                  const addedFee = added.hours * added.rate;
                  return (
                    <TableRow key={added.role} className="bg-violet-50/50 dark:bg-violet-950/10">
                      <TableCell className="text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="text-xs font-medium">{added.role}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">+{added.hours.toFixed(0)}h</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(added.rate, sym)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">—</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-violet-600 dark:text-violet-400">
                        {fmt(addedFee, sym)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">Total Agency Fee</TableCell>
              <TableCell className="text-right font-mono font-semibold">{serviceHours.totalHours.toFixed(1)}h</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono font-semibold">{fmt(serviceHours.totalFee, sym)}</TableCell>
              <TableCell className={cn("text-right font-mono font-semibold", appliedRecs.length > 0 && "text-primary")}>
                {appliedRecs.length > 0 ? fmt(optimisedTotals.fee, sym) : "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-sm">Agency Fee %</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {originalGrandTotal > 0 ? `${((serviceHours.totalFee / originalGrandTotal) * 100).toFixed(1)}%` : "—"}
              </TableCell>
              <TableCell className={cn("text-right font-mono text-sm", appliedRecs.length > 0 && "text-primary")}>
                {appliedRecs.length > 0 && optimisedGrandTotal > 0
                  ? `${((optimisedTotals.fee / optimisedGrandTotal) * 100).toFixed(1)}%`
                  : "—"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-sm">
                Agency Fee Profit Margin
                {originalMargin.missingCostRoles.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground/60">
                    (excl. {originalMargin.missingCostRoles.length} role{originalMargin.missingCostRoles.length > 1 ? "s" : ""} without cost data)
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {originalMargin.fee > 0
                  ? `${(((originalMargin.fee - originalMargin.cost) / originalMargin.fee) * 100).toFixed(1)}%`
                  : "—"}
              </TableCell>
              <TableCell className={cn("text-right font-mono text-sm", appliedRecs.length > 0 && "font-semibold text-primary")}>
                {appliedRecs.length > 0 && optimisedTotals.marginFee > 0
                  ? `${(((optimisedTotals.marginFee - optimisedTotals.internalCost) / optimisedTotals.marginFee) * 100).toFixed(1)}%`
                  : "—"}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CollapsibleCard>

      {/* Recommendations */}
      <ScopeRecommendations
        scopedRoles={scopedRoles}
        client={state.client}
        office={state.office}
        durationMonths={state.durationMonths}
        agencyFee={serviceHours.totalFee}
        onApply={handleApply}
        onUndo={handleUndo}
      />
    </div>
  );
}
