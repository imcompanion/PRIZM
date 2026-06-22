import { useState, useMemo, useCallback } from "react";
import { addWeeks, format, startOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateServiceHours, type TaskLine, type EngineInput } from "./serviceHoursEngine";
import { type TalentBudgetState } from "./TalentBudgetTab";
import { type Recommendation } from "./ScopeRecommendations";
import { applyOverridesToLines } from "./scopeOverrides";
import { PhaseGanttRow, type TimelineColumn } from "./PhaseGanttRow";

/* ─── Phase config ─── */
const PHASE_ORDER = ["RTB", "Creators & Contracting", "Content Creation & Go Live", "Reporting & Wrap Up", "Ongoing Support"];

const PHASE_COLORS: Record<string, string> = {
  "RTB": "bg-blue-500",
  "Creators & Contracting": "bg-amber-500",
  "Content Creation & Go Live": "bg-emerald-500",
  "Reporting & Wrap Up": "bg-violet-500",
  "Ongoing Support": "bg-gray-400",
};

const PHASE_TEXT_COLORS: Record<string, string> = {
  "RTB": "text-blue-700 dark:text-blue-300",
  "Creators & Contracting": "text-amber-700 dark:text-amber-300",
  "Content Creation & Go Live": "text-emerald-700 dark:text-emerald-300",
  "Reporting & Wrap Up": "text-violet-700 dark:text-violet-300",
  "Ongoing Support": "text-gray-700 dark:text-gray-300",
};

const PHASE_BG_LIGHT: Record<string, string> = {
  "RTB": "bg-blue-50 dark:bg-blue-950/30",
  "Creators & Contracting": "bg-amber-50 dark:bg-amber-950/30",
  "Content Creation & Go Live": "bg-emerald-50 dark:bg-emerald-950/30",
  "Reporting & Wrap Up": "bg-violet-50 dark:bg-violet-950/30",
  "Ongoing Support": "bg-gray-50 dark:bg-gray-950/30",
};

interface PhaseDuration {
  phase: string;
  startWeek: number;
  weeks: number;
}

interface PhasingTabProps {
  state: {
    office: "UK" | "US";
    client: string;
    projectName: string;
    oppNumber: string;
    rateCard: string;
    currency: string;
    durationMonths: number;
    projectStartDate: string;
    projectEndDate: string;
    sections: any;
    talentBudget: TalentBudgetState;
  };
  currencySymbol: string;
  appliedRecs?: Recommendation[];
}

export function PhasingTab({ state, currencySymbol, appliedRecs = [] }: PhasingTabProps) {
  const s = state.sections;
  const totalWeeks = Math.max(1, Math.round(state.durationMonths * 4.33));

  const weekCommencingDates = useMemo(() => {
    if (!state.projectStartDate) return null;
    const start = startOfWeek(new Date(state.projectStartDate), { weekStartsOn: 1 });
    return Array.from({ length: totalWeeks }, (_, i) => addWeeks(start, i));
  }, [state.projectStartDate, totalWeeks]);

  // Dynamic columns: weeks for short projects, months for longer ones
  const useMonthColumns = totalWeeks > 12;

  const timelineColumns = useMemo((): TimelineColumn[] => {
    if (!useMonthColumns) {
      // Weekly columns
      return Array.from({ length: totalWeeks }, (_, i) => ({
        label: weekCommencingDates ? format(weekCommencingDates[i], "d MMM") : `W${i + 1}`,
        tooltip: weekCommencingDates ? format(weekCommencingDates[i], "EEE d MMM yyyy") : `Week ${i + 1}`,
        startWeek: i,
        endWeek: i + 1,
      }));
    }

    // Monthly columns — derive week dates if not available
    const baseStart = weekCommencingDates
      ? weekCommencingDates[0]
      : startOfWeek(state.projectStartDate ? new Date(state.projectStartDate) : new Date(), { weekStartsOn: 1 });
    const allWeekDates = weekCommencingDates || Array.from({ length: totalWeeks }, (_, i) => addWeeks(baseStart, i));

    const cols: TimelineColumn[] = [];
    let currentMonth = -1;
    for (let i = 0; i < totalWeeks; i++) {
      const d = allWeekDates[i];
      const key = d.getFullYear() * 12 + d.getMonth();
      if (key !== currentMonth) {
        cols.push({
          label: format(d, "MMM yy"),
          tooltip: format(d, "MMMM yyyy"),
          startWeek: i,
          endWeek: i + 1,
        });
        currentMonth = key;
      } else {
        cols[cols.length - 1].endWeek = i + 1;
      }
    }
    return cols;
  }, [useMonthColumns, totalWeeks, weekCommencingDates, state.durationMonths, state.projectStartDate]);

  const [phaseDurations, setPhaseDurations] = useState<PhaseDuration[]>(() => {
    const corePhases = PHASE_ORDER.filter(p => p !== "Ongoing Support");
    const perPhase = Math.floor(totalWeeks / corePhases.length);
    const remainder = totalWeeks - perPhase * corePhases.length;
    let cursor = 0;
    const durations: PhaseDuration[] = corePhases.map((phase, i) => {
      const weeks = perPhase + (i < remainder ? 1 : 0);
      const pd = { phase, startWeek: cursor, weeks };
      cursor += weeks;
      return pd;
    });
    // Ongoing Support spans the entire project
    durations.push({ phase: "Ongoing Support", startWeek: 0, weeks: totalWeeks });
    return durations;
  });

  const updatePhaseGantt = useCallback((index: number, startWeek: number, weeks: number) => {
    setPhaseDurations((prev) => prev.map((p, i) => (i === index ? { ...p, startWeek, weeks } : p)));
  }, []);

  const [viewMode, setViewMode] = useState<"hours" | "percent">("hours");
  const [groupMode, setGroupMode] = useState<"phases" | "months">("phases");

  const updatePhaseWeeks = (index: number, weeks: number) => {
    setPhaseDurations((prev) => prev.map((p, i) => (i === index ? { ...p, weeks: Math.max(0, weeks) } : p)));
  };

  // Compute platform stats
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
        instagramInfluencers += infls; instagramImages += images; instagramStories += stories; instagramVideos += videos;
      } else if (p.includes("tiktok")) {
        tiktokInfluencers += infls; tiktokVideos += videos;
      } else if (p.includes("youtube")) {
        youtubeInfluencers += infls; youtubeVideos += videos;
      } else if (p.includes("content house")) {
        contentHouseAssets += (g.singleImage + g.multiImage + g.shortVideo) * infls;
      }
    }

    return {
      instagramInfluencers, instagramImages, instagramStories, instagramVideos,
      tiktokInfluencers, tiktokVideos, youtubeInfluencers, youtubeVideos, contentHouseAssets,
    };
  }, [state.talentBudget.groups]);

  // Compute task lines
  const taskLines = useMemo(() => {
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
        const rtbIdeas = ideas;
        creativeDaysTotal += (rtbConcepts * 5) + (rtbIdeas * 2.5) + (rtbIdeas * (rtbConcepts - 1));
      }
    }
    const creativeJobs = Math.max(creativeDaysTotal / 4, 0);

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
    return appliedRecs.length > 0 ? applyOverridesToLines(lines, appliedRecs) : lines;
  }, [s, state.durationMonths, state.talentBudget, platformStats, appliedRecs]);

  // Aggregate hours by role and phase
  const rolePhaseData = useMemo(() => {
    const map = new Map<string, Map<string, number>>();

    for (const line of taskLines) {
      if (line.hours <= 0) continue;
      let phase = line.phase ?? "Ongoing Support";
      if (phase === "Overhead" || phase === "N/A" || !PHASE_ORDER.includes(phase)) {
        phase = "Ongoing Support";
      }
      if (!map.has(line.role)) map.set(line.role, new Map());
      const roleMap = map.get(line.role)!;
      roleMap.set(phase, (roleMap.get(phase) || 0) + line.hours);
    }

    const roles = Array.from(map.keys()).sort();
    const data = roles.map((role) => {
      const phaseMap = map.get(role)!;
      const phaseHours: Record<string, number> = {};
      let total = 0;
      for (const phase of PHASE_ORDER) {
        const h = phaseMap.get(phase) || 0;
        phaseHours[phase] = h;
        total += h;
      }
      return { role, phaseHours, total };
    });

    return { data };
  }, [taskLines]);

  // Month-based view
  const monthData = useMemo(() => {
    const totalMonths = Math.max(1, Math.round(state.durationMonths));
    const baseStart = state.projectStartDate
      ? startOfWeek(new Date(state.projectStartDate), { weekStartsOn: 1 })
      : new Date();
    const months: string[] = [];
    for (let i = 0; i < totalMonths; i++) {
      const d = addWeeks(baseStart, Math.round(i * 4.33));
      months.push(format(d, "MMM yy"));
    }

    const phaseMonthWeights: Record<string, number[]> = {};
    for (const pd of phaseDurations) {
      const weights = new Array(totalMonths).fill(0);
      for (let w = 0; w < pd.weeks; w++) {
        const absoluteWeek = pd.startWeek + w;
        const monthIdx = Math.min(Math.floor(absoluteWeek / 4.33), totalMonths - 1);
        weights[monthIdx]++;
      }
      phaseMonthWeights[pd.phase] = weights;
    }

    const roleMonthData = rolePhaseData.data.map(({ role, phaseHours, total }) => {
      const monthHours = new Array(totalMonths).fill(0);
      for (const phase of PHASE_ORDER) {
        const hours = phaseHours[phase] || 0;
        if (hours <= 0) continue;
        const weights = phaseMonthWeights[phase] || [];
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        if (totalWeight <= 0) continue;
        for (let m = 0; m < totalMonths; m++) {
          monthHours[m] += (weights[m] / totalWeight) * hours;
        }
      }
      return { role, monthHours, total };
    });

    return { months, roleMonthData };
  }, [rolePhaseData, phaseDurations, state.durationMonths]);

  // Phase totals
  const phaseTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const phase of PHASE_ORDER) totals[phase] = 0;
    for (const row of rolePhaseData.data) {
      for (const phase of PHASE_ORDER) {
        totals[phase] += row.phaseHours[phase] || 0;
      }
    }
    return totals;
  }, [rolePhaseData]);

  const grandTotal = rolePhaseData.data.reduce((s, r) => s + r.total, 0);

  const monthTotals = useMemo(() => {
    if (monthData.roleMonthData.length === 0) return [];
    const totals = new Array(monthData.months.length).fill(0);
    for (const row of monthData.roleMonthData) {
      for (let i = 0; i < totals.length; i++) {
        totals[i] += row.monthHours[i] || 0;
      }
    }
    return totals;
  }, [monthData]);

  const HOURS_PER_DAY = 7.5;
  const DAYS_PER_WEEK = 5;

  // Fetch roles for billable capacity
  const { data: rolesData } = useQuery({
    queryKey: ["roles-capacity"],
    queryFn: async () => {
      const { data } = await supabase.from("roles").select("name, billable_capacity_hours");
      return data || [];
    },
  });

  const roleCapacityMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rolesData || []) {
      // billable_capacity_hours is stored as hours/day (e.g. 6.0 for 80%)
      m[r.name] = r.billable_capacity_hours;
    }
    return m;
  }, [rolesData]);

  // Map phase name -> duration in weeks for capacity calc
  const phaseWeeksMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const pd of phaseDurations) m[pd.phase] = pd.weeks;
    return m;
  }, [phaseDurations]);

  // Weeks per month for capacity calc
  const monthWeeks = useMemo(() => {
    const totalMonths = Math.max(1, Math.round(state.durationMonths));
    const seen = new Set<number>();
    const deduped = new Array(totalMonths).fill(0);
    for (const pd of phaseDurations) {
      for (let w = 0; w < pd.weeks; w++) {
        const absWeek = pd.startWeek + w;
        if (!seen.has(absWeek)) {
          seen.add(absWeek);
          const mIdx = Math.min(Math.floor(absWeek / 4.33), totalMonths - 1);
          deduped[mIdx]++;
        }
      }
    }
    return deduped;
  }, [phaseDurations, state.durationMonths]);

  // Capacity % = hours / (weeks × days_per_week × role_billable_hours_per_day) × 100
  const fmtCapacity = (hours: number, weeks: number, roleName?: string) => {
    if (hours <= 0 || weeks <= 0) return "—";
    const capPerDay = roleName ? (roleCapacityMap[roleName] || HOURS_PER_DAY) : HOURS_PER_DAY;
    const availableHours = weeks * DAYS_PER_WEEK * capPerDay;
    const pct = (hours / availableHours) * 100;
    return `${pct.toFixed(0)}%`;
  };

  const fmtCell = (hours: number, weeks: number, roleName?: string) => {
    if (viewMode === "percent") return fmtCapacity(hours, weeks, roleName);
    return hours > 0 ? hours.toFixed(0) : "—";
  };

  

  return (
    <div className="space-y-6">
      {/* Phase Timeline (Gantt) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Phase Timeline</CardTitle>
          <p className="text-xs text-muted-foreground">
            Total project: <strong>{totalWeeks} weeks</strong> ({state.durationMonths} months).
            Drag to move, drag edges to resize. Phases can overlap.
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 mb-1">
            <div className="w-[180px] shrink-0" />
            <div className="flex-1 flex">
              {timelineColumns.map((col, i) => {
                const widthPct = ((col.endWeek - col.startWeek) / totalWeeks) * 100;
                return (
                  <div
                    key={i}
                    className="text-[10px] text-muted-foreground text-center border-l border-border/30 first:border-l-0 px-0.5 leading-tight"
                    style={{ width: `${widthPct}%` }}
                    title={col.tooltip}
                  >
                    <div>{col.label.split(" ")[0]}</div>
                    <div className="text-[9px]">{col.label.split(" ")[1] || ""}</div>
                  </div>
                );
              })}
            </div>
            <div className="w-12 shrink-0" />
          </div>

          {phaseDurations.map((pd, i) => (
            <PhaseGanttRow
              key={pd.phase}
              phase={pd.phase}
              startWeek={pd.startWeek}
              durationWeeks={pd.weeks}
              totalWeeks={totalWeeks}
              columns={timelineColumns}
              color={PHASE_COLORS[pd.phase]}
              textColor={PHASE_TEXT_COLORS[pd.phase]}
              bgLight={PHASE_BG_LIGHT[pd.phase]}
              weekDates={weekCommencingDates}
              onUpdate={(start, dur) => updatePhaseGantt(i, start, dur)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Role Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{viewMode === "percent" ? "Capacity by Role" : "Hours by Role"}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <Button
                  size="sm"
                  variant={viewMode === "hours" ? "default" : "ghost"}
                  className="h-7 rounded-none text-xs px-3"
                  onClick={() => setViewMode("hours")}
                >
                  Hours
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "percent" ? "default" : "ghost"}
                  className="h-7 rounded-none text-xs px-3"
                  onClick={() => setViewMode("percent")}
                >
                  %
                </Button>
              </div>
              <div className="inline-flex rounded-md border border-border overflow-hidden">
                <Button
                  size="sm"
                  variant={groupMode === "phases" ? "default" : "ghost"}
                  className="h-7 rounded-none text-xs px-3"
                  onClick={() => setGroupMode("phases")}
                >
                  Phases
                </Button>
                <Button
                  size="sm"
                  variant={groupMode === "months" ? "default" : "ghost"}
                  className="h-7 rounded-none text-xs px-3"
                  onClick={() => setGroupMode("months")}
                >
                  Months
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groupMode === "phases" ? (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Role</TableHead>
                    {PHASE_ORDER.map((phase) => (
                      <TableHead key={phase} className="text-right min-w-[100px]">
                        <span className={cn("text-xs", PHASE_TEXT_COLORS[phase])}>{phase}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[80px] font-semibold">{viewMode === "percent" ? "Avg" : "Total"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolePhaseData.data.map((row) => (
                    <TableRow key={row.role}>
                      <TableCell className="text-sm font-medium">{row.role}</TableCell>
                      {PHASE_ORDER.map((phase) => (
                        <TableCell key={phase} className="text-right text-sm tabular-nums">
                          {fmtCell(row.phaseHours[phase] || 0, phaseWeeksMap[phase] || 0, row.role)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {viewMode === "percent"
                          ? fmtCapacity(row.total, totalWeeks, row.role)
                          : row.total.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/60 font-semibold">
                    <TableCell className="text-sm">TOTAL</TableCell>
                    {PHASE_ORDER.map((phase) => (
                      <TableCell key={phase} className="text-right text-sm tabular-nums">
                        {fmtCell(phaseTotals[phase], phaseWeeksMap[phase] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-sm tabular-nums">
                      {viewMode === "percent"
                        ? fmtCapacity(grandTotal, totalWeeks)
                        : grandTotal.toFixed(0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Role</TableHead>
                    {monthData.months.map((m) => (
                      <TableHead key={m} className="text-right min-w-[80px] text-xs">{m}</TableHead>
                    ))}
                    <TableHead className="text-right min-w-[80px] font-semibold">{viewMode === "percent" ? "Avg" : "Total"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthData.roleMonthData.map((row) => (
                    <TableRow key={row.role}>
                      <TableCell className="text-sm font-medium">{row.role}</TableCell>
                      {row.monthHours.map((h, i) => (
                        <TableCell key={i} className="text-right text-sm tabular-nums">
                          {fmtCell(h, monthWeeks[i] || 0, row.role)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {viewMode === "percent"
                          ? fmtCapacity(row.total, totalWeeks, row.role)
                          : row.total.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/60 font-semibold">
                    <TableCell className="text-sm">TOTAL</TableCell>
                    {monthTotals.map((t, i) => (
                      <TableCell key={i} className="text-right text-sm tabular-nums">
                        {fmtCell(t, monthWeeks[i] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-sm tabular-nums">
                      {viewMode === "percent"
                        ? fmtCapacity(grandTotal, totalWeeks)
                        : grandTotal.toFixed(0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase legend */}
      <div className="flex flex-wrap gap-3">
        {PHASE_ORDER.map((phase) => (
          <div key={phase} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded-sm", PHASE_COLORS[phase])} />
            <span className="text-xs text-muted-foreground">{phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
