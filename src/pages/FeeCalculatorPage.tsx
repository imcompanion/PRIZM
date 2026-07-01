import { useState, useEffect, useMemo, useCallback } from "react";
import { TalentBudgetTab, defaultTalentBudget, type TalentBudgetState } from "@/components/fee-calculator/TalentBudgetTab";
import { FeeCalcSummary } from "@/components/fee-calculator/FeeCalcSummary";
import { PhasingTab } from "@/components/fee-calculator/PhasingTab";
import { ScopeOptimiserTab } from "@/components/fee-calculator/ScopeOptimiserTab";
import { type Recommendation } from "@/components/fee-calculator/ScopeRecommendations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronRight,
  Settings2,
  Users,
  Palette,
  Lightbulb,
  Megaphone,
  Film,
  Package,
  BarChart3,
  Layers,
  Calculator,
  Plus,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/* ─── role → service category mapping ─── */
type ServiceCategory = "projectManagement" | "creative" | "strategy" | "talentContent" | "paidMedia" | "productionCosts" | "productProcurement" | "reporting" | "otherServices";

function roleToServiceCategory(roleName: string): ServiceCategory | null {
  const r = roleName.toLowerCase();
  // Project Management / Account
  if (/\b(account|project manager|project director|client partner|client success|resource manager|business director|head of clients)\b/.test(r)) return "projectManagement";
  // Creative
  if (/\b(creative|designer|design director|copywriter|artworker|illustrator|graphic|retoucher|motion graphic|art director)\b/.test(r)) return "creative";
  // Strategy
  if (/\b(strateg|channel strat|comms plan|insight|social listening)\b/.test(r)) return "strategy";
  // Talent & Content
  if (/\b(talent|content|influencer|community)\b/.test(r)) return "talentContent";
  // Paid Media
  if (/\b(paid media|performance|head of paid)\b/.test(r)) return "paidMedia";
  // Production
  if (/\b(producer|production|compositor|vfx|digital producer)\b/.test(r)) return "productionCosts";
  // Reporting / Analytics
  if (/\b(analytics|data analyst|effectiveness|reporting)\b/.test(r)) return "reporting";
  // Development / Tech / Other
  if (/\b(developer|architect|tech|ar developer)\b/.test(r)) return "otherServices";
  return null;
}

const serviceCategoryLabels: Record<ServiceCategory, string> = {
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

/* ─── types ─── */
interface SectionState {
  enabled: boolean;
  [key: string]: any;
}

interface FeeCalcState {
  office: "UK" | "US";
  client: string;
  projectName: string;
  oppNumber: string;
  rateCard: string;
  currency: string;
  fxLockDate: string;
  projectStartDate: string;
  projectEndDate: string;
  durationMonths: number;
  sections: {
    projectManagement: SectionState & {
      involvement: "Set up / Light" | "Set up / Execution Oversight" | "Full - End to End";
    };
    creative: SectionState & {
      creativeConceptsCount: number;
      executionalIdeasCount: number;
      proposalRevisions: number;
      roundsOfFeedback: number;
    };
    strategy: SectionState & {
      researchAndInsights: boolean;
      researchPlanning: boolean;
      commsPlanning: boolean;
      socialListening: boolean;
    };
    talentContent: SectionState & {
      influencerBriefRevisions: number;
      longListRevisions: number;
      contentIdeation: boolean;
      ideationRevisions: number;
      creativeTeamInvolved: boolean;
      contentProduction: boolean;
      contentRevisions: number;
      contentReviews: boolean;
    };
    paidMedia: SectionState & {
      consultancyInvolvement: "Light" | "Heavy";
      paid1: { platform: string; type: string; influencers: number; staticAssets: number; dynamicAssets: number };
      paid2: { platform: string; type: string; influencers: number; staticAssets: number; dynamicAssets: number };
      paid3: { platform: string; type: string; influencers: number; staticAssets: number; dynamicAssets: number };
      paid4: { platform: string; type: string; influencers: number; staticAssets: number; dynamicAssets: number };
      complexity: string;
      paidMediaSpend: number;
      paidMediaLiveMonths: number;
      impressions: number;
      clicks: number;
    };
    productionCosts: SectionState & {
      productionBudgetPhase: string;
      productionCompany: number;
      contractedAgencyProducer: number;
      insurance: number;
      licensing: number;
      staffTravel: number;
      contingency: number;
    };
    productProcurement: SectionState & {
      influencerTotal: number;
      shipmentsPerInfluencer: number;
      shippingMaterialsCost: number;
      contingencyCost: number;
    };
    reporting: SectionState & {
      involvement: "Reporting only" | "Light" | "Heavy";
      dashboards: number;
      snapshotReports: number;
      standardReports: number;
      advancedReports: number;
    };
    otherServices: SectionState & {
      arFilters: number;
      gifs: number;
      audioLicenceCosts: number;
      blsReportCount: number;
      blsCostPerReport: number;
      eventCount: number;
      eventCosts: number;
      giftingBoxes: number;
      giftingDesigns: number;
      productsCostPerBox: number;
      postageCostPerBox: number;
      productionCostPerBox: number;
    };
  };
  talentBudget: TalentBudgetState;
}

const defaultPaidItem = { platform: "", type: "None", influencers: 0, staticAssets: 0, dynamicAssets: 0 };

const defaultState: FeeCalcState = {
  office: "UK",
  client: "",
  projectName: "",
  oppNumber: "",
  rateCard: "",
  currency: "GBP",
  fxLockDate: "",
  projectStartDate: "",
  projectEndDate: "",
  durationMonths: 0,
  sections: {
    projectManagement: { enabled: true, involvement: "Full - End to End" },
    creative: { enabled: false, creativeConceptsCount: 0, executionalIdeasCount: 0, proposalRevisions: 0, roundsOfFeedback: 0 },
    strategy: { enabled: false, researchAndInsights: false, researchPlanning: false, commsPlanning: false, socialListening: false },
    talentContent: { enabled: false, influencerBriefRevisions: 0, longListRevisions: 0, contentIdeation: false, ideationRevisions: 0, creativeTeamInvolved: false, contentProduction: false, contentRevisions: 0, contentReviews: false },
    paidMedia: { enabled: false, consultancyInvolvement: "Light", paid1: { ...defaultPaidItem }, paid2: { ...defaultPaidItem }, paid3: { ...defaultPaidItem }, paid4: { ...defaultPaidItem }, complexity: "", paidMediaSpend: 0, paidMediaLiveMonths: 0, impressions: 0, clicks: 0 },
    productionCosts: { enabled: false, productionBudgetPhase: "", productionCompany: 0, contractedAgencyProducer: 0, insurance: 0, licensing: 0, staffTravel: 0, contingency: 0 },
    productProcurement: { enabled: false, influencerTotal: 0, shipmentsPerInfluencer: 0, shippingMaterialsCost: 0, contingencyCost: 0 },
    reporting: { enabled: false, involvement: "Reporting only", dashboards: 0, snapshotReports: 0, standardReports: 0, advancedReports: 0 },
    otherServices: { enabled: false, arFilters: 0, gifs: 0, audioLicenceCosts: 0, blsReportCount: 0, blsCostPerReport: 0, eventCount: 0, eventCosts: 0, giftingBoxes: 0, giftingDesigns: 0, productsCostPerBox: 0, postageCostPerBox: 0, productionCostPerBox: 0 },
  },
  talentBudget: { ...defaultTalentBudget },
};

/* ─── section wrapper ─── */
function Section({
  icon: Icon,
  title,
  enabled,
  onToggle,
  children,
  alwaysOn,
  insight,
  uncollapsible,
  expandSignal,
  collapseSignal,
}: {
  icon: React.ElementType;
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  alwaysOn?: boolean;
  insight?: { label: string; ratio: number; projectCount: number } | null;
  uncollapsible?: boolean;
  expandSignal?: number;
  collapseSignal?: number;
}) {
  const [open, setOpen] = useState(enabled);

  useEffect(() => {
    if (enabled) setOpen(true);
  }, [enabled]);

  useEffect(() => {
    if (expandSignal && expandSignal > 0) setOpen(true);
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal && collapseSignal > 0 && !uncollapsible) setOpen(false);
  }, [collapseSignal]);

  return (
    <Collapsible open={uncollapsible ? true : (open && enabled)} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-3">
            {!alwaysOn && (
              <Switch checked={enabled} onCheckedChange={onToggle} />
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{title}</span>
            {enabled && (
              <Badge variant="secondary" className="text-xs">Active</Badge>
            )}
            {insight && insight.projectCount > 0 && (
              <span className="text-[11px] text-muted-foreground ml-1 italic">
                {insight.label} ({insight.projectCount} project{insight.projectCount !== 1 ? "s" : ""})
              </span>
            )}
          </div>
          {!uncollapsible && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!enabled}>
                {open && enabled ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <CollapsibleContent>
          <div className="px-4 py-4 space-y-4">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function FieldRow({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-3 items-center">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">{label}</Label>
      <div className="max-w-xs">
        {children}
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, min = 0, step = 1, placeholder }: { value: number; onChange: (v: number) => void; min?: number; step?: number; placeholder?: string }) {
  return (
    <Input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      min={min}
      step={step}
      placeholder={placeholder}
      className="h-9"
    />
  );
}

function CurrencyInput({ value, onChange, currency }: { value: number; onChange: (v: number) => void; currency: string }) {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
      <Input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        min={0}
        step={0.01}
        className="h-9 pl-7"
      />
    </div>
  );
}

/* ─── paid media row ─── */
function PaidMediaRow({
  label,
  item,
  onChange,
}: {
  label: string;
  item: { platform: string; type: string; influencers: number; staticAssets: number; dynamicAssets: number };
  onChange: (v: typeof item) => void;
}) {
  const paidMediaTypes = ["None", "Dark Ads (Static)", "Dark Ads (Dynamic)", "Boosting"];
  return (
    <div className="grid grid-cols-[80px_1fr_1fr_80px_80px_80px] gap-2 items-center text-sm">
      <span className="text-muted-foreground font-medium">{label}</span>
      <Input
        value={item.platform}
        onChange={(e) => onChange({ ...item, platform: e.target.value })}
        placeholder="Platform"
        className="h-8 text-sm"
      />
      <Select value={item.type} onValueChange={(v) => onChange({ ...item, type: v })}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paidMediaTypes.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NumberInput value={item.influencers} onChange={(v) => onChange({ ...item, influencers: v })} />
      <NumberInput value={item.staticAssets} onChange={(v) => onChange({ ...item, staticAssets: v })} />
      <NumberInput value={item.dynamicAssets} onChange={(v) => onChange({ ...item, dynamicAssets: v })} />
    </div>
  );
}

/* ─── Error Boundary ─── */
import { Component, ErrorInfo, ReactNode } from "react";
class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white text-red-600 fixed inset-0 z-[9999] overflow-auto">
          <h1 className="text-2xl font-bold mb-4">React Crash</h1>
          <pre className="whitespace-pre-wrap text-sm font-mono bg-red-50 p-4 rounded-md border border-red-200">
            {this.state.error?.toString() + "\n\n" + this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── main ─── */
export default function FeeCalculatorPage() {
  return (
    <ErrorBoundary>
      <FeeCalculatorPageInner />
    </ErrorBoundary>
  );
}

function FeeCalculatorPageInner() {
  const [state, setState] = useState<FeeCalcState>(() => {
    try {
      const saved = sessionStorage.getItem("fee-calc-state");
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return defaultState;
  });

  const [appliedRecs, setAppliedRecs] = useState<Recommendation[]>([]);
  const [expandAllSignal, setExpandAllSignal] = useState(0);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);

  const updateSection = <K extends keyof FeeCalcState["sections"]>(
    key: K,
    updates: Partial<FeeCalcState["sections"][K]>
  ) => {
    setState((s) => ({
      ...s,
      sections: {
        ...s.sections,
        [key]: { ...s.sections[key], ...updates },
      },
    }));
  };

  // Fetch projects for client/project dropdowns
  const { data: allProjects = [] } = useQuery({
    queryKey: ["fee-calc-projects"],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("projects")
          .select("id, title, opportunity_number, sf_account, parent_account, ultimate_parent, office, rate_card_id, total_fees, duration_weeks, start_date, end_date, stage")
          .order("title")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  // Build unique client list from hierarchy
  const clients = useMemo(() => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const officeMap: Record<string, string[]> = { UK: ["uk", "united kingdom"], US: ["us", "united states"] };
    const officeValues = officeMap[state.office] || [];
    const set = new Set<string>();
    for (const p of allProjects) {
      const stage = (p.stage || "").toLowerCase().trim();
      if (stage === "closed lost") continue;
      if (p.ultimate_parent && p.end_date && p.end_date >= cutoffStr) {
        const projOffice = (p.office || "").toLowerCase().trim();
        if (officeValues.some((ov) => projOffice.includes(ov))) {
          set.add(p.ultimate_parent);
        }
      }
    }
    return Array.from(set).sort();
  }, [allProjects, state.office]);

  // Fetch project IDs that already have scopes
  const { data: scopedProjectIds = new Set<string>() } = useQuery({
    queryKey: ["scoped-project-ids"],
    queryFn: async () => {
      const ids = new Set<string>();
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("project_scopes")
          .select("project_id")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        (data || []).forEach((s) => { if (s.project_id) ids.add(s.project_id); });
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return ids;
    },
  });

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filter projects for selected client + office (no scope, end_date > today)
  const clientProjects = useMemo(() => {
    if (!state.client || state.client === "__new__") return [];
    const cl = state.client.toLowerCase().trim();
    const officeMap: Record<string, string[]> = { UK: ["uk", "united kingdom"], US: ["us", "united states"] };
    const officeValues = officeMap[state.office] || [];
    return allProjects.filter((p) => {
      const up = (p.ultimate_parent || "").toLowerCase().trim();
      if (up !== cl) return false;
      const projOffice = (p.office || "").toLowerCase().trim();
      if (!officeValues.some((ov) => projOffice.includes(ov))) return false;
      if (!p.end_date || p.end_date <= todayStr) return false;
      if (scopedProjectIds instanceof Set && scopedProjectIds.has(p.id)) return false;
      return true;
    });
  }, [state.client, state.office, allProjects, scopedProjectIds, todayStr]);

  // Fetch rate cards from DB (paginated to avoid 1000-row limit)
  const { data: rateCardNames = [] } = useQuery({
    queryKey: ["rate-card-names"],
    queryFn: async () => {
      const unique = new Map<string, string>();
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("rate_cards")
          .select("name, currency")
          .order("name")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        data?.forEach((rc) => unique.set(rc.name, rc.currency));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return Array.from(unique.entries()).map(([name, currency]) => ({ name, defaultCurrency: currency })).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  // Use allProjects for client hierarchy matching (already paginated)
  const clientHierarchy = allProjects;

  // Smart rate card matching (same logic as auto-scope)
  const rateCardMatches = useMemo(() => {
    const clientName = state.client === "__new__" ? "" : state.client;
    if (!clientName || rateCardNames.length === 0) return { best: null, others: [] as string[] };
    const cl = clientName.toLowerCase().trim();
    const noise = new Set(["the", "and", "ltd", "inc", "plc", "llc", "group", "company", "limited",
      "uk", "us", "usa", "global", "europe", "nordics", "germany", "france", "spain", "italy"]);
    const extractBrand = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/)
        .filter((w) => w.length >= 3 && !noise.has(w));
    const clientBrandWords = extractBrand(cl);
    const relatedBrands = new Set<string>();
    for (const p of clientHierarchy) {
      const sf = (p.sf_account || "").toLowerCase().trim();
      const pa = (p.parent_account || "").toLowerCase().trim();
      const up = (p.ultimate_parent || "").toLowerCase().trim();
      const sfBrand = extractBrand(sf);
      const paBrand = extractBrand(pa);
      const upBrand = extractBrand(up);
      const isRelated = sf === cl || pa === cl || up === cl ||
        (clientBrandWords.length > 0 && clientBrandWords.some(w => sfBrand.includes(w))) ||
        (clientBrandWords.length > 0 && clientBrandWords.some(w => paBrand.includes(w))) ||
        (clientBrandWords.length > 0 && clientBrandWords.some(w => upBrand.includes(w)));
      if (isRelated) {
        if (pa) relatedBrands.add(pa);
        if (up) relatedBrands.add(up);
      }
    }
    const allBrandWords = new Set(clientBrandWords);
    for (const name of relatedBrands) {
      for (const w of extractBrand(name)) allBrandWords.add(w);
    }
    const scored: { name: string; score: number }[] = [];
    for (const rc of rateCardNames) {
      const rcl = rc.name.toLowerCase().trim();
      const rcBrand = extractBrand(rc.name);
      let score = 0;
      if (rcl === cl) score = 100;
      else if (relatedBrands.has(rcl)) score = 95;
      else if (rcBrand.length > 0 && allBrandWords.size > 0) {
        const matches = rcBrand.filter((w) => allBrandWords.has(w));
        if (matches.length > 0) score = (matches.length / rcBrand.length) * 80;
      }
      if (score > 10) scored.push({ name: rc.name, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return { best: scored.length > 0 ? scored[0].name : null, others: scored.slice(1).map((s) => s.name) };
  }, [state.client, rateCardNames, clientHierarchy]);

  // Auto-select best rate card when client changes
  useEffect(() => {
    if (rateCardMatches.best) {
      setState((s) => ({ ...s, rateCard: rateCardMatches.best! }));
      const rc = rateCardNames.find((r) => r.name === rateCardMatches.best);
      if (rc) setState((s) => ({ ...s, currency: rc.defaultCurrency }));
    }
  }, [rateCardMatches.best, rateCardNames]);

  const handleRateCardChange = (name: string) => {
    setState((s) => ({ ...s, rateCard: name }));
    const rc = rateCardNames.find((r) => r.name === name);
    if (rc) setState((s) => ({ ...s, currency: rc.defaultCurrency }));
  };

  // ─── Historical service insights for selected client ───
  const clientProjectIds = useMemo(() => {
    if (!state.client || state.client === "__new__") return [];
    const cl = state.client.toLowerCase().trim();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return allProjects
      .filter((p) => {
        if ((p.ultimate_parent || "").toLowerCase().trim() !== cl) return false;
        if (!p.end_date) return false;
        // Only completed projects in the last 12 months (ended between cutoff and today)
        return p.end_date >= cutoffStr && p.end_date <= todayStr;
      })
      .map((p) => p.id);
  }, [state.client, allProjects, todayStr]);

  // Fetch roles for mapping
  const { data: allRoles = [] } = useQuery({
    queryKey: ["fee-calc-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch historical scoped hours by role for client projects
  const { data: historicalScoped = [] } = useQuery({
    queryKey: ["fee-calc-historical-scoped", clientProjectIds],
    enabled: clientProjectIds.length > 0,
    queryFn: async () => {
      const all: any[] = [];
      // Paginate since project_scopes can be >1000
      for (let i = 0; i < clientProjectIds.length; i += 50) {
        const batch = clientProjectIds.slice(i, i + 50);
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("project_scopes")
            .select("project_id, role_id, scoped_hours")
            .in("project_id", batch)
            .range(from, from + 999);
          if (error) throw error;
          all.push(...(data || []));
          if (!data || data.length < 1000) break;
          from += 1000;
        }
      }
      return all as { project_id: string; role_id: string; scoped_hours: number }[];
    },
  });

  // Fetch historical actual hours by role for client projects
  const { data: historicalActual = [] } = useQuery({
    queryKey: ["fee-calc-historical-actual", clientProjectIds],
    enabled: clientProjectIds.length > 0,
    queryFn: async () => {
      const pidSet = new Set(clientProjectIds);
      const all: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase.rpc("get_project_hours_by_role").range(from, from + pageSize - 1);
        if (error) throw error;
        const page = data || [];
        all.push(...page.filter((d: any) => pidSet.has(d.project_id)));
        if (page.length < pageSize) break;
        from += pageSize;
      }
      return all as { project_id: string; role_id: string; total_hours: number }[];
    },
  });

  // Aggregate historical data by service category
  const serviceInsights = useMemo(() => {
    const roleMap = new Map(allRoles.map((r) => [r.id, r.name]));
    const insights: Record<ServiceCategory, { scopedHours: number; actualHours: number; projectCount: Set<string> }> = {
      projectManagement: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      creative: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      strategy: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      talentContent: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      paidMedia: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      productionCosts: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      productProcurement: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      reporting: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
      otherServices: { scopedHours: 0, actualHours: 0, projectCount: new Set() },
    };

    for (const s of historicalScoped) {
      const roleName = roleMap.get(s.role_id);
      if (!roleName) continue;
      const cat = roleToServiceCategory(roleName);
      if (!cat) continue;
      insights[cat].scopedHours += Number(s.scoped_hours) || 0;
      insights[cat].projectCount.add(s.project_id);
    }

    for (const a of historicalActual) {
      const roleName = a.role_id ? roleMap.get(a.role_id) : null;
      const cat = roleName ? roleToServiceCategory(roleName) : null;
      const target = cat || "otherServices";
      insights[target].actualHours += Number(a.total_hours) || 0;
      insights[target].projectCount.add(a.project_id);
    }

    return insights;
  }, [historicalScoped, historicalActual, allRoles]);

  // Auto-enable services based on history (once per client change)
  const [lastAutoClient, setLastAutoClient] = useState("");
  useEffect(() => {
    if (!state.client || state.client === "__new__" || state.client === lastAutoClient) return;
    if (clientProjectIds.length === 0) return;
    // Only auto-enable once we have insight data
    const hasData = Object.values(serviceInsights).some((v) => v.scopedHours > 0 || v.actualHours > 0);
    if (!hasData) return;
    setLastAutoClient(state.client);

    const updates: Partial<FeeCalcState["sections"]> = {};
    const categories: ServiceCategory[] = ["creative", "strategy", "talentContent", "paidMedia", "productionCosts", "productProcurement", "reporting", "otherServices"];
    const totalProjects = clientProjectIds.length;
    for (const cat of categories) {
      const ins = serviceInsights[cat];
      const ratio = totalProjects > 0 ? ins.projectCount.size / totalProjects : 0;
      // Only auto-enable if "always", "usually" or "sometimes" (>=30%)
      if (ratio >= 0.3) {
        (updates as any)[cat] = { ...state.sections[cat], enabled: true };
      }
    }
    if (Object.keys(updates).length > 0) {
      setState((s) => ({ ...s, sections: { ...s.sections, ...updates } }));
    }
  }, [state.client, serviceInsights, clientProjectIds, lastAutoClient]);

  // Client combobox state
  const [clientOpen, setClientOpen] = useState(false);
  // Project combobox state  
  const [projectOpen, setProjectOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const s = state.sections;
  const currency = state.currency;
  const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";

  const totalShipments = s.productProcurement.influencerTotal * (s.productProcurement.shipmentsPerInfluencer || 0);
  const totalThirdPartyCosts =
    totalShipments * s.productProcurement.shippingMaterialsCost +
    totalShipments * s.productProcurement.contingencyCost;
  const totalProductionBudget =
    s.productionCosts.productionCompany +
    s.productionCosts.contractedAgencyProducer +
    s.productionCosts.insurance +
    s.productionCosts.licensing +
    s.productionCosts.staffTravel +
    s.productionCosts.contingency;
  const totalGiftingCosts =
    s.otherServices.giftingBoxes *
    (s.otherServices.productsCostPerBox + s.otherServices.postageCostPerBox + s.otherServices.productionCostPerBox);

  const totalClientProjects = clientProjectIds.length;
  const getInsight = (cat: ServiceCategory) => {
    const ins = serviceInsights[cat];
    if (!ins || ins.projectCount.size === 0) return null;
    const ratio = totalClientProjects > 0 ? ins.projectCount.size / totalClientProjects : 0;
    let label: string;
    if (ratio >= 0.9) label = "Always scoped on this client";
    else if (ratio >= 0.6) label = "Usually scoped";
    else if (ratio >= 0.3) label = "Sometimes scoped";
    else if (ratio > 0) label = "Rarely scoped";
    else label = "Never scoped";
    return { label, ratio, projectCount: ins.projectCount.size };
  };

  const steps = [
    { label: "Project Setup", icon: Settings2 },
    { label: "Services", icon: Layers },
    { label: "Talent Budget", icon: Users },
    { label: "Scope Optimiser", icon: Sparkles },
    { label: "Summary", icon: Calculator },
    { label: "Phasing", icon: BarChart3 },
  ];

  const [currentStep, setCurrentStep] = useState(() => {
    try { const s = sessionStorage.getItem("fee-calc-step"); return s ? parseInt(s, 10) : 0; } catch { return 0; }
  });

  const [currentMargin, setCurrentMargin] = useState<number>(0);
  const [justificationNotes, setJustificationNotes] = useState<string>("");
  const isException = currentMargin > 0 && currentMargin < 20;

  // Persist state and step to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem("fee-calc-state", JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  useEffect(() => {
    try { sessionStorage.setItem("fee-calc-step", String(currentStep)); } catch { /* ignore */ }
  }, [currentStep]);

  const canProceed = currentStep === 0
    ? !!(state.client && state.projectName)
    : true;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* Left Panel: Inputs (65%) */}
      <div className="flex-1 overflow-y-auto p-6 border-r border-border space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Fee Calculator</h1>
            <p className="text-sm text-muted-foreground">Configure project scope and calculate fees</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              if (window.confirm("Are you sure you want to start a new scope? This will clear all current inputs.")) {
                setState(defaultState);
                setCurrentStep(0);
                setAppliedRecs([]);
                sessionStorage.removeItem("fee-calc-state");
                sessionStorage.removeItem("fee-calc-step");
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Scope
          </Button>
        </div>

        {/* Step 1: Project Setup */}
          <Section icon={Settings2} title="Overview" enabled={true} onToggle={() => {}} alwaysOn uncollapsible>
            <FieldRow label="Office">
              <Select value={state.office} onValueChange={(v: "UK" | "US") => setState((s) => ({ ...s, office: v, currency: v === "US" ? "USD" : "GBP", talentBudget: { ...s.talentBudget, talentContingencyPct: v === "US" ? 25 : 10 } }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UK">🇬🇧 UK</SelectItem>
                  <SelectItem value="US">🇺🇸 US</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Client">
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="h-9 w-full justify-between font-normal">
                    {state.client || "Select client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                      <CommandEmpty>No clients found.</CommandEmpty>
                      <CommandGroup>

                        {clients.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => {
                              setState((s) => ({ ...s, client: c, projectName: "", oppNumber: "" }));
                              setSelectedProjectId("");
                              setClientOpen(false);
                            }}
                          >
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FieldRow>


            {state.client && (
              <FieldRow label="Project">
                <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={projectOpen} className="h-9 w-full justify-between font-normal overflow-hidden">
                      <span className="truncate">{state.projectName || "Select project..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search projects..." />
                      <CommandList>
                        <CommandEmpty>No projects found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__new_project__"
                            onSelect={() => {
                              setState((s) => ({ ...s, projectName: "", oppNumber: "" }));
                              setSelectedProjectId("");
                              setProjectOpen(false);
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            New Project
                          </CommandItem>
                          {clientProjects.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.title} ${p.opportunity_number || ""}`}
                              onSelect={() => {
                                const durationMonths = p.duration_weeks
                                  ? Math.round((p.duration_weeks / 52) * 12 * 10) / 10
                                  : p.start_date && p.end_date
                                    ? Math.round(((new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000) / 52) * 12 * 10) / 10
                                    : 0;
                                setState((s) => ({
                                  ...s,
                                  projectName: p.title,
                                  oppNumber: p.opportunity_number || "",
                                  projectStartDate: p.start_date || "",
                                  projectEndDate: p.end_date || "",
                                  durationMonths,
                                }));
                                setSelectedProjectId(p.id);
                                setProjectOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="truncate">{p.title}</span>
                                {p.opportunity_number && (
                                  <span className="text-xs text-muted-foreground">{p.opportunity_number}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FieldRow>
            )}

            {!selectedProjectId && state.client && (
              <FieldRow label="Project Name">
                <Input value={state.projectName} onChange={(e) => setState((s) => ({ ...s, projectName: e.target.value }))} className="h-9" placeholder="Enter project name" />
              </FieldRow>
            )}

            <FieldRow label="Opp Number">
              {selectedProjectId ? (
                <span className="text-sm h-9 flex items-center">{state.oppNumber || "—"}</span>
              ) : (
                <Input value={state.oppNumber} onChange={(e) => setState((s) => ({ ...s, oppNumber: e.target.value }))} className="h-9" placeholder="Opportunity number" />
              )}
            </FieldRow>
            <FieldRow label="Rate Card">
              <div className="space-y-1">
                <Select
                  value={state.rateCard}
                  onValueChange={(v) => {
                    const match = rateCardNames.find((r) => r.name === v);
                    setState((s) => ({
                      ...s,
                      rateCard: v,
                      currency: match?.defaultCurrency || s.currency,
                    }));
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select rate card" />
                  </SelectTrigger>
                  <SelectContent>
                    {rateCardNames.map((rc) => (
                      <SelectItem key={rc.name} value={rc.name}>
                        {rc.name} ({rc.defaultCurrency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rateCardMatches.best && rateCardMatches.others.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Also available:{" "}
                    {rateCardMatches.others.map((alt, i) => (
                      <span key={alt}>
                        <button
                          className="underline hover:text-foreground"
                          onClick={() => {
                            const match = rateCardNames.find((r) => r.name === alt);
                            if (match) setState((s) => ({ ...s, rateCard: match.name, currency: match.defaultCurrency || s.currency }));
                          }}
                        >
                          {alt}
                        </button>
                        {i < rateCardMatches.others.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </FieldRow>
            <FieldRow label="Currency">
              <Select value={state.currency} onValueChange={(v) => setState((s) => ({ ...s, currency: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            {!((state.office === "UK" && state.currency === "GBP") || (state.office === "US" && state.currency === "USD")) && (
              <FieldRow label="Locked FX Date">
                <span className="text-sm h-9 flex items-center">{new Date().toLocaleDateString("en-GB")}</span>
              </FieldRow>
            )}
            <FieldRow label="Duration">
              {selectedProjectId ? (
                <div className="text-sm h-9 flex items-center">
                  {(() => {
                    const proj = clientProjects.find((p) => p.id === selectedProjectId);
                    if (!proj) return "—";
                    if (proj.duration_weeks) {
                      const months = Math.round((proj.duration_weeks / 52) * 12 * 10) / 10;
                      return `${months} months (${Math.round(proj.duration_weeks)} weeks)`;
                    }
                    if (proj.start_date && proj.end_date) {
                      const start = new Date(proj.start_date);
                      const end = new Date(proj.end_date);
                      const weeks = Math.round((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
                      const months = Math.round((weeks / 52) * 12 * 10) / 10;
                      return `${months} months (${weeks} weeks)`;
                    }
                    return "—";
                  })()}
                </div>
              ) : (
                <NumberInput value={state.durationMonths} onChange={(v) => setState((s) => ({ ...s, durationMonths: v }))} />
              )}
            </FieldRow>
          </Section>

          <div className="flex justify-end my-2">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                if (isAllCollapsed) {
                  setExpandAllSignal(s => s + 1);
                  setIsAllCollapsed(false);
                } else {
                  setCollapseAllSignal(s => s + 1);
                  setIsAllCollapsed(true);
                }
              }}
            >
              {isAllCollapsed ? "Expand All" : "Collapse All"}
            </Button>
          </div>

        {/* Step 2: Services */}
            <Section
              icon={Users}
              title="Project Management"
              enabled={s.projectManagement.enabled}
              onToggle={(v) => updateSection("projectManagement", { enabled: v })}
              alwaysOn
              insight={getInsight("projectManagement")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <FieldRow label="Involvement">
                <Select
                  value={s.projectManagement.involvement}
                  onValueChange={(v: any) => updateSection("projectManagement", { involvement: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Set up / Light">Set up / Light (5h/mo)</SelectItem>
                    <SelectItem value="Set up / Execution Oversight">Set up / Execution Oversight (20h/mo)</SelectItem>
                    <SelectItem value="Full - End to End">Full - End to End (40h/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </Section>

            <Section
              icon={Palette}
              title="Creative"
              enabled={s.creative.enabled}
              onToggle={(v) => updateSection("creative", { enabled: v })}
              insight={getInsight("creative")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ideation</p>
              <FieldRow label="Creative Concepts">
                <NumberInput value={s.creative.creativeConceptsCount} onChange={(v) => updateSection("creative", { creativeConceptsCount: v })} />
              </FieldRow>
              <FieldRow label="Executional Ideas">
                <NumberInput value={s.creative.executionalIdeasCount} onChange={(v) => updateSection("creative", { executionalIdeasCount: v })} />
              </FieldRow>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Proposal Revisions</p>
              <FieldRow label="Rounds of Dev/Feedback">
                <NumberInput value={s.creative.roundsOfFeedback} onChange={(v) => updateSection("creative", { roundsOfFeedback: v })} />
              </FieldRow>
              {(() => {
                const c = s.creative.creativeConceptsCount || 0;
                const i = s.creative.executionalIdeasCount || 0;
                const rounds = (c + i > 0) ? 1 + (s.creative.roundsOfFeedback || 0) : 0;
                return rounds > 0 ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                    <p className="font-semibold text-muted-foreground uppercase tracking-wide">Derived Outputs</p>
                    <div className="flex gap-6">
                      <span>RTBs: <strong className="text-foreground">{rounds}</strong></span>
                      <span>Total Creative Days: <strong className="text-foreground">{(() => {
                        let days = 0;
                        for (let r = 1; r <= 7; r++) {
                          if (rounds < r) break;
                          const rc = r <= 2 ? c : Math.min(c, 1);
                          days += (rc * 5) + (i * 2.5) + (i * (rc - 1));
                        }
                        return days.toFixed(1);
                      })()}</strong></span>
                      <span>Total Jobs: <strong className="text-foreground">{(() => {
                        let days = 0;
                        for (let r = 1; r <= 7; r++) {
                          if (rounds < r) break;
                          const rc = r <= 2 ? c : Math.min(c, 1);
                          days += (rc * 5) + (i * 2.5) + (i * (rc - 1));
                        }
                        return (days / 4).toFixed(1);
                      })()}</strong></span>
                    </div>
                  </div>
                ) : null;
              })()}
            </Section>

            <Section
              icon={Lightbulb}
              title="Strategy (In Development)"
              enabled={s.strategy.enabled}
              onToggle={(v) => updateSection("strategy", { enabled: v })}
              insight={getInsight("strategy")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <div className="space-y-3">
                {[
                  { key: "researchAndInsights" as const, label: "Research and Insights" },
                  { key: "researchPlanning" as const, label: "Research Planning" },
                  { key: "commsPlanning" as const, label: "Comms Planning" },
                  { key: "socialListening" as const, label: "Social Listening" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <Switch
                      checked={s.strategy[key] as boolean}
                      onCheckedChange={(v) => updateSection("strategy", { [key]: v })}
                    />
                    <Label className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              icon={Users}
              title="Talent & Content Management"
              enabled={s.talentContent.enabled}
              onToggle={(v) => updateSection("talentContent", { enabled: v })}
              insight={getInsight("talentContent")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <FieldRow label="Influencer Brief Revisions">
                <NumberInput value={s.talentContent.influencerBriefRevisions} onChange={(v) => updateSection("talentContent", { influencerBriefRevisions: v })} />
              </FieldRow>
              <FieldRow label="Long List Revisions">
                <NumberInput value={s.talentContent.longListRevisions} onChange={(v) => updateSection("talentContent", { longListRevisions: v })} />
              </FieldRow>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Ideation</p>
              <FieldRow label="Ideation Revisions">
                <NumberInput value={s.talentContent.ideationRevisions} onChange={(v) => updateSection("talentContent", { ideationRevisions: v })} />
              </FieldRow>
              <div className="flex items-center gap-3">
                <Switch checked={s.talentContent.creativeTeamInvolved} onCheckedChange={(v) => updateSection("talentContent", { creativeTeamInvolved: v })} />
                <Label className="text-sm">Creative Team Involved</Label>
              </div>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Content Production</p>
              <FieldRow label="Content Revisions">
                <NumberInput value={s.talentContent.contentRevisions} onChange={(v) => updateSection("talentContent", { contentRevisions: v })} />
              </FieldRow>
              <div className="flex items-center gap-3">
                <Switch checked={s.talentContent.contentReviews} onCheckedChange={(v) => updateSection("talentContent", { contentReviews: v })} />
                <Label className="text-sm">Content Reviews</Label>
              </div>
            </Section>

            <Section
              icon={Megaphone}
              title="Paid Media"
              enabled={s.paidMedia.enabled}
              onToggle={(v) => updateSection("paidMedia", { enabled: v })}
              insight={getInsight("paidMedia")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <FieldRow label="Consultancy /month">
                <Select
                  value={s.paidMedia.consultancyInvolvement}
                  onValueChange={(v: any) => updateSection("paidMedia", { consultancyInvolvement: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Light">Light (4h/mo)</SelectItem>
                    <SelectItem value="Heavy">Heavy (16h/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paid Channels</p>
              <div className="grid grid-cols-[80px_1fr_1fr_80px_80px_80px] gap-2 text-xs font-medium text-muted-foreground">
                <span></span><span>Platform</span><span>Type</span><span>Infl.</span><span>Static</span><span>Dynamic</span>
              </div>
              <PaidMediaRow label="Paid 1" item={s.paidMedia.paid1} onChange={(v) => updateSection("paidMedia", { paid1: v })} />
              <PaidMediaRow label="Paid 2" item={s.paidMedia.paid2} onChange={(v) => updateSection("paidMedia", { paid2: v })} />
              <PaidMediaRow label="Paid 3" item={s.paidMedia.paid3} onChange={(v) => updateSection("paidMedia", { paid3: v })} />
              <PaidMediaRow label="Paid 4" item={s.paidMedia.paid4} onChange={(v) => updateSection("paidMedia", { paid4: v })} />

              <Separator />
              <FieldRow label="Complexity">
                <Select value={s.paidMedia.complexity} onValueChange={(v) => updateSection("paidMedia", { complexity: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label={`Paid Media Spend (${currencySymbol})`}>
                <CurrencyInput value={s.paidMedia.paidMediaSpend} onChange={(v) => updateSection("paidMedia", { paidMediaSpend: v })} currency={currency} />
              </FieldRow>
              <FieldRow label="Live Months">
                <NumberInput value={s.paidMedia.paidMediaLiveMonths} onChange={(v) => updateSection("paidMedia", { paidMediaLiveMonths: v })} />
              </FieldRow>
              <FieldRow label="Impressions">
                <NumberInput value={s.paidMedia.impressions} onChange={(v) => updateSection("paidMedia", { impressions: v })} />
              </FieldRow>
              <FieldRow label="Clicks">
                <NumberInput value={s.paidMedia.clicks} onChange={(v) => updateSection("paidMedia", { clicks: v })} />
              </FieldRow>
            </Section>

            <Section
              icon={Film}
              title="Production Costs"
              enabled={s.productionCosts.enabled}
              onToggle={(v) => updateSection("productionCosts", { enabled: v })}
              insight={getInsight("productionCosts")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <FieldRow label="Budget Phase">
                <Select value={s.productionCosts.productionBudgetPhase} onValueChange={(v) => updateSection("productionCosts", { productionBudgetPhase: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select phase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft: High-level costs">Draft: High-level costs</SelectItem>
                    <SelectItem value="Final: Detailed costs">Final: Detailed costs</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items</p>
              {[
                { key: "productionCompany" as const, label: "Production Company" },
                { key: "contractedAgencyProducer" as const, label: "Contracted Agency Producer" },
                { key: "insurance" as const, label: "Insurance" },
                { key: "licensing" as const, label: "Licensing" },
                { key: "staffTravel" as const, label: "Staff Travel & Accommodation" },
                { key: "contingency" as const, label: "Contingency" },
              ].map(({ key, label }) => (
                <FieldRow key={key} label={label}>
                  <CurrencyInput value={s.productionCosts[key] as number} onChange={(v) => updateSection("productionCosts", { [key]: v })} currency={currency} />
                </FieldRow>
              ))}
              <Separator />
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-semibold">Total Production Budget</span>
                <span className="text-sm font-bold">{currencySymbol}{totalProductionBudget.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
              </div>
            </Section>

            <Section
              icon={Package}
              title="Product Procurement"
              enabled={s.productProcurement.enabled}
              onToggle={(v) => updateSection("productProcurement", { enabled: v })}
              insight={getInsight("productProcurement")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipments</p>
              <FieldRow label="Influencer Total">
                <NumberInput value={s.productProcurement.influencerTotal} onChange={(v) => updateSection("productProcurement", { influencerTotal: v })} />
              </FieldRow>
              <FieldRow label="Shipments / Influencer">
                <NumberInput value={s.productProcurement.shipmentsPerInfluencer} onChange={(v) => updateSection("productProcurement", { shipmentsPerInfluencer: v })} />
              </FieldRow>
              <div className="text-sm text-muted-foreground px-1">Total Shipments: <strong>{totalShipments}</strong></div>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Third Party Costs</p>
              <FieldRow label={`Shipping & Materials (${currencySymbol}/shipment)`}>
                <CurrencyInput value={s.productProcurement.shippingMaterialsCost} onChange={(v) => updateSection("productProcurement", { shippingMaterialsCost: v })} currency={currency} />
              </FieldRow>
              <FieldRow label={`Contingency (${currencySymbol}/shipment)`}>
                <CurrencyInput value={s.productProcurement.contingencyCost} onChange={(v) => updateSection("productProcurement", { contingencyCost: v })} currency={currency} />
              </FieldRow>
              <Separator />
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-semibold">Total Third Party Costs</span>
                <span className="text-sm font-bold">{currencySymbol}{totalThirdPartyCosts.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
              </div>
            </Section>

            <Section
              icon={BarChart3}
              title="Reporting & Measurement"
              enabled={s.reporting.enabled}
              onToggle={(v) => updateSection("reporting", { enabled: v })}
              insight={getInsight("reporting")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <FieldRow label="Ongoing Involvement">
                <Select
                  value={s.reporting.involvement}
                  onValueChange={(v: any) => updateSection("reporting", { involvement: v })}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reporting only">Reporting only (0h/mo)</SelectItem>
                    <SelectItem value="Light">Light (4h/mo)</SelectItem>
                    <SelectItem value="Heavy">Heavy (8h/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <Separator />
              <FieldRow label="Dashboards">
                <NumberInput value={s.reporting.dashboards} onChange={(v) => updateSection("reporting", { dashboards: v })} />
              </FieldRow>
              <FieldRow label="Report/PCA — Snapshot">
                <NumberInput value={s.reporting.snapshotReports} onChange={(v) => updateSection("reporting", { snapshotReports: v })} />
              </FieldRow>
              <FieldRow label="Report/PCA — Standard">
                <NumberInput value={s.reporting.standardReports} onChange={(v) => updateSection("reporting", { standardReports: v })} />
              </FieldRow>
              <FieldRow label="Report/PCA — Advanced">
                <NumberInput value={s.reporting.advancedReports} onChange={(v) => updateSection("reporting", { advancedReports: v })} />
              </FieldRow>
            </Section>


            <Section
              icon={Layers}
              title="Other Services"
              enabled={s.otherServices.enabled}
              onToggle={(v) => updateSection("otherServices", { enabled: v })}
              insight={getInsight("otherServices")}
              expandSignal={expandAllSignal}
              collapseSignal={collapseAllSignal}
            >
              <FieldRow label="AR Filters #">
                <NumberInput value={s.otherServices.arFilters} onChange={(v) => updateSection("otherServices", { arFilters: v })} />
              </FieldRow>
              <FieldRow label="GIFs #">
                <NumberInput value={s.otherServices.gifs} onChange={(v) => updateSection("otherServices", { gifs: v })} />
              </FieldRow>
              <FieldRow label={`Audio Licence Costs (${currencySymbol})`}>
                <CurrencyInput value={s.otherServices.audioLicenceCosts} onChange={(v) => updateSection("otherServices", { audioLicenceCosts: v })} currency={currency} />
              </FieldRow>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">BLS / Research Report</p>
              <FieldRow label="Count">
                <NumberInput value={s.otherServices.blsReportCount} onChange={(v) => updateSection("otherServices", { blsReportCount: v })} />
              </FieldRow>
              <FieldRow label={`Cost per Report (${currencySymbol})`}>
                <CurrencyInput value={s.otherServices.blsCostPerReport} onChange={(v) => updateSection("otherServices", { blsCostPerReport: v })} currency={currency} />
              </FieldRow>
              <div className="text-sm text-muted-foreground px-1">
                Total Report Costs: <strong>{currencySymbol}{(s.otherServices.blsReportCount * s.otherServices.blsCostPerReport).toLocaleString()}</strong>
              </div>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Events</p>
              <FieldRow label="Event Count">
                <NumberInput value={s.otherServices.eventCount} onChange={(v) => updateSection("otherServices", { eventCount: v })} />
              </FieldRow>
              <FieldRow label={`Total Event Costs (${currencySymbol})`}>
                <CurrencyInput value={s.otherServices.eventCosts} onChange={(v) => updateSection("otherServices", { eventCosts: v })} currency={currency} />
              </FieldRow>
              <Separator />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gifting</p>
              <FieldRow label="Total Boxes Mailed">
                <NumberInput value={s.otherServices.giftingBoxes} onChange={(v) => updateSection("otherServices", { giftingBoxes: v })} />
              </FieldRow>
              <FieldRow label="Designs">
                <NumberInput value={s.otherServices.giftingDesigns} onChange={(v) => updateSection("otherServices", { giftingDesigns: v })} />
              </FieldRow>
              <FieldRow label={`Products cost p/box (${currencySymbol})`}>
                <CurrencyInput value={s.otherServices.productsCostPerBox} onChange={(v) => updateSection("otherServices", { productsCostPerBox: v })} currency={currency} />
              </FieldRow>
              <FieldRow label={`Postage cost p/box (${currencySymbol})`}>
                <CurrencyInput value={s.otherServices.postageCostPerBox} onChange={(v) => updateSection("otherServices", { postageCostPerBox: v })} currency={currency} />
              </FieldRow>
              <FieldRow label={`Production cost p/box (${currencySymbol})`}>
                <CurrencyInput value={s.otherServices.productionCostPerBox} onChange={(v) => updateSection("otherServices", { productionCostPerBox: v })} currency={currency} />
              </FieldRow>
              {s.otherServices.giftingBoxes > 0 && (
                <div className="text-sm text-muted-foreground px-1">
                  Total Gifting Costs: <strong>{currencySymbol}{totalGiftingCosts.toLocaleString("en", { minimumFractionDigits: 2 })}</strong>
                </div>
              )}
            </Section>
        {/* Step 3: Talent Budget */}
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-4">Talent Budget</h2>
          <TalentBudgetTab
            state={state.talentBudget}
            onChange={(tb) => setState((s) => ({ ...s, talentBudget: tb }))}
            office={state.office}
            currencySymbol={currencySymbol}
          />
        </div>

        {/* Step 4: Scope Optimiser */}
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-4">Scope Optimiser</h2>
          <ScopeOptimiserTab state={state} currencySymbol={currencySymbol} appliedRecs={appliedRecs} onAppliedRecsChange={setAppliedRecs} />
        </div>

        {/* Step 6: Phasing */}
        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-lg font-semibold mb-4">Phasing</h2>
          <PhasingTab state={state} currencySymbol={currencySymbol} appliedRecs={appliedRecs} />
        </div>
      </div>

      {/* Right Panel: Summary & Shield (35%) */}
      <div className="w-[450px] shrink-0 overflow-y-auto bg-muted/10 flex flex-col relative">
        <div className="p-6 flex-1">
          <FeeCalcSummary state={state} currencySymbol={currencySymbol} appliedRecs={appliedRecs} onMarginChange={setCurrentMargin} />
        </div>
        
        {/* Margin Shield UI */}
        <div className={cn(
          "p-6 border-t sticky bottom-0 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-colors",
          isException ? "bg-red-500/10 border-red-500/20" : "bg-background border-border"
        )}>
          {isException && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 text-red-500 font-semibold text-sm">
                <Settings2 className="h-4 w-4" />
                Exception State: Margin &lt; 20%
              </div>
              <textarea
                className="w-full text-sm min-h-[80px] p-2 rounded-md border border-red-500/30 bg-background/50 focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-red-500/50"
                placeholder="Commercial justification required..."
                value={justificationNotes}
                onChange={(e) => setJustificationNotes(e.target.value)}
              />
            </div>
          )}
          <Button 
            className="w-full" 
            size="lg"
            variant={isException ? "destructive" : "default"}
          >
            {isException ? "Submit for Admin Review" : "Save Scope"}
          </Button>
        </div>
      </div>
    </div>
  );
}
