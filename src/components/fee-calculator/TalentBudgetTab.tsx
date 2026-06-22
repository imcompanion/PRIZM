import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ─── types ─── */
const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Content House"] as const;
const TIERS = ["Nano", "Micro (30k+)", "Mid (100k+)", "Macro (500k+)", "Mega (1m+)"] as const;
const UK_TERRITORIES = ["United Kingdom", "United States", "France", "Netherlands", "Italy", "Spain", "Germany", "Nordics", "India", "Brazil"] as const;
const US_TERRITORIES = ["United States", "United Kingdom", "France", "Netherlands", "Italy", "Spain", "Germany", "Nordics", "India", "Brazil"] as const;

const TIER_AVG_FOLLOWERS: Record<string, number> = {
  "Nano": 17000,
  "Micro (30k+)": 60000,
  "Mid (100k+)": 250000,
  "Macro (500k+)": 700000,
  "Mega (1m+)": 1400000,
};

export interface InfluencerGroup {
  id: string;
  name: string;
  platform: string;
  influencers: number;
  tier: string;
  avgFollowers: number;
  avgFollowersOverride: number;
  reposting: boolean;
  territory: string;
  singleImage: number;
  multiImage: number;
  shortVideo: number;
  storyFrames: number;
}

export interface CrossPlatformLink {
  id: string;
  group1: string;
  group2: string;
}

export interface GiftingTier {
  id: string;
  platform: string;
  influencers: number;
  tier: string;
  avgFollowers: number;
  avgFollowersOverride: number;
  estimatedPosts: number;
  estimatedImpressions: number;
}

export interface TalentBudgetState {
  organicUsageWeeks: number;
  paidUsageWeeks: number;
  exclusivityWeeks: number;
  timePressure: boolean;
  seasonal: boolean;
  restrictedGoods: boolean;
  talentContingencyPct: number;
  fxExposure: boolean;
  fxPremiumPct: number;
  groups: InfluencerGroup[];
  crossPlatformLinks: CrossPlatformLink[];
  giftingTiers: GiftingTier[];
}

const makeGroup = (index: number): InfluencerGroup => ({
  id: crypto.randomUUID(),
  name: `Group ${index}`,
  platform: "",
  influencers: 0,
  tier: "",
  avgFollowers: 0,
  avgFollowersOverride: 0,
  reposting: false,
  territory: "",
  singleImage: 0,
  multiImage: 0,
  shortVideo: 0,
  storyFrames: 0,
});

const makeGiftingTier = (): GiftingTier => ({
  id: crypto.randomUUID(),
  platform: "",
  influencers: 0,
  tier: "",
  avgFollowers: 0,
  avgFollowersOverride: 0,
  estimatedPosts: 0,
  estimatedImpressions: 0,
});

export const defaultTalentBudget: TalentBudgetState = {
  organicUsageWeeks: 0,
  paidUsageWeeks: 0,
  exclusivityWeeks: 0,
  timePressure: false,
  seasonal: false,
  restrictedGoods: false,
  talentContingencyPct: 10,
  fxExposure: false,
  fxPremiumPct: 0,
  groups: [makeGroup(1)],
  crossPlatformLinks: [],
  giftingTiers: [],
};

/* ─── small helpers ─── */
function NumInput({ value, onChange, min = 0, placeholder, formatted }: { value: number; onChange: (v: number) => void; min?: number; placeholder?: string; formatted?: boolean }) {
  const [editing, setEditing] = useState(false);
  const display = !editing && formatted && value ? value.toLocaleString() : (value || "");
  return (
    <Input
      type={editing || !formatted ? "number" : "text"}
      min={min}
      className="h-8 w-24 text-sm"
      value={display}
      placeholder={placeholder || "0"}
      onFocus={() => formatted && setEditing(true)}
      onBlur={() => formatted && setEditing(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        onChange(Math.max(min, Number(raw) || 0));
      }}
    />
  );
}

function FieldRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className || ""}`}>
      <Label className="text-sm text-muted-foreground shrink-0">{label}</Label>
      {children}
    </div>
  );
}

/* ─── main component ─── */
interface TalentBudgetTabProps {
  state: TalentBudgetState;
  onChange: (s: TalentBudgetState) => void;
  office: "UK" | "US";
  currencySymbol: string;
}

export function TalentBudgetTab({ state, onChange, office, currencySymbol }: TalentBudgetTabProps) {
  const territories = office === "US" ? US_TERRITORIES : UK_TERRITORIES;

  const update = (patch: Partial<TalentBudgetState>) => onChange({ ...state, ...patch });

  const updateGroup = (id: string, patch: Partial<InfluencerGroup>) => {
    update({ groups: state.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  };
  const addGroup = () => {
    if (state.groups.length >= 40) return;
    update({ groups: [...state.groups, makeGroup(state.groups.length + 1)] });
  };
  const removeGroup = (id: string) => {
    update({ groups: state.groups.filter((g) => g.id !== id) });
  };

  const addGiftingTier = () => {
    if (state.giftingTiers.length >= 5) return;
    update({ giftingTiers: [...state.giftingTiers, makeGiftingTier()] });
  };
  const updateGiftingTier = (id: string, patch: Partial<GiftingTier>) => {
    update({ giftingTiers: state.giftingTiers.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  };
  const removeGiftingTier = (id: string) => {
    update({ giftingTiers: state.giftingTiers.filter((t) => t.id !== id) });
  };

  const addCrossPlatform = () => {
    if (state.crossPlatformLinks.length >= 5) return;
    update({ crossPlatformLinks: [...state.crossPlatformLinks, { id: crypto.randomUUID(), group1: "", group2: "" }] });
  };
  const updateCrossPlatform = (id: string, patch: Partial<CrossPlatformLink>) => {
    update({ crossPlatformLinks: state.crossPlatformLinks.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  };
  const removeCrossPlatform = (id: string) => {
    update({ crossPlatformLinks: state.crossPlatformLinks.filter((c) => c.id !== id) });
  };

  const totalInfluencers = state.groups.reduce((s, g) => s + g.influencers, 0);
  const totalDeliverables = state.groups.reduce((s, g) => s + g.influencers * (g.singleImage + g.multiImage + g.shortVideo + g.storyFrames), 0);

  return (
    <div className="space-y-6">
      {/* Budget Modifiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Talent Budget Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Boosters */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usage Boosters</p>
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-x-8 gap-y-4">
            <FieldRow label="Organic Usage (weeks)" className="flex-1 min-w-[200px]">
              <NumInput value={state.organicUsageWeeks} onChange={(v) => update({ organicUsageWeeks: v })} />
            </FieldRow>
            <FieldRow label="Paid Usage (weeks)" className="flex-1 min-w-[200px]">
              <NumInput value={state.paidUsageWeeks} onChange={(v) => update({ paidUsageWeeks: v })} />
            </FieldRow>
            <FieldRow label="Exclusivity (weeks)" className="flex-1 min-w-[200px]">
              <NumInput value={state.exclusivityWeeks} onChange={(v) => update({ exclusivityWeeks: v })} />
            </FieldRow>
          </div>

          <Separator />

          {/* Campaign Multipliers */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campaign Multipliers</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={state.timePressure} onCheckedChange={(v) => update({ timePressure: v })} />
              <Label className="text-sm">Time Pressure</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={state.seasonal} onCheckedChange={(v) => update({ seasonal: v })} />
              <Label className="text-sm">Seasonal</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={state.restrictedGoods} onCheckedChange={(v) => update({ restrictedGoods: v })} />
              <Label className="text-sm">Restricted Goods</Label>
            </div>
          </div>

          <Separator />

          {/* Contingency & FX */}
          <div className="grid grid-cols-2 gap-6">
            <FieldRow label="Talent Contingency (%)">
              <NumInput value={state.talentContingencyPct} onChange={(v) => update({ talentContingencyPct: v })} />
            </FieldRow>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={state.fxExposure} onCheckedChange={(v) => update({ fxExposure: v })} />
                <Label className="text-sm">FX Exposure</Label>
              </div>
              {state.fxExposure && (
                <FieldRow label="FX Premium (%)">
                  <NumInput value={state.fxPremiumPct} onChange={(v) => update({ fxPremiumPct: v })} />
                </FieldRow>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Overview */}
      <div className="flex gap-3">
        <Badge variant="secondary" className="text-xs">
          Total Talent: {totalInfluencers}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Total Deliverables: {totalDeliverables.toLocaleString()}
        </Badge>
      </div>

      {/* Contracted Influencer Groups */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contracted Influencers</CardTitle>
            <Button variant="outline" size="sm" onClick={addGroup} disabled={state.groups.length >= 40}>
              <Plus className="h-3 w-3 mr-1" /> Add Group
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.groups.map((g, i) => (
            <div key={g.id} className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Group {i + 1}</span>
                {state.groups.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => removeGroup(g.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Platform</Label>
                  <Select value={g.platform} onValueChange={(v) => updateGroup(g.id, { platform: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground"># Influencers</Label>
                  <NumInput value={g.influencers} onChange={(v) => updateGroup(g.id, { influencers: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Tier</Label>
                  <Select value={g.tier} onValueChange={(v) => updateGroup(g.id, { tier: v, avgFollowers: TIER_AVG_FOLLOWERS[v] || 0 })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Territory</Label>
                  <Select value={g.territory} onValueChange={(v) => updateGroup(g.id, { territory: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {territories.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Avg Followers</Label>
                  <NumInput value={g.avgFollowers} onChange={(v) => updateGroup(g.id, { avgFollowers: v })} formatted />
                </div>
                <div className="flex items-end gap-2 pb-0.5">
                  <Switch checked={g.reposting} onCheckedChange={(v) => updateGroup(g.id, { reposting: v })} />
                  <Label className="text-xs">Reposting</Label>
                </div>
              </div>
              <Separator />
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Deliverables per Influencer</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Single Image</Label>
                  <NumInput value={g.singleImage} onChange={(v) => updateGroup(g.id, { singleImage: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Multi Image</Label>
                  <NumInput value={g.multiImage} onChange={(v) => updateGroup(g.id, { multiImage: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Short Video</Label>
                  <NumInput value={g.shortVideo} onChange={(v) => updateGroup(g.id, { shortVideo: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Story Frames</Label>
                  <NumInput value={g.storyFrames} onChange={(v) => updateGroup(g.id, { storyFrames: v })} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cross-Platform Influencers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Cross-Platform Influencers</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Removes double counting for influencer search, engage & negotiate. No impact on talent fee.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addCrossPlatform} disabled={state.crossPlatformLinks.length >= 5 || state.groups.length < 2}>
              <Plus className="h-3 w-3 mr-1" /> Add Link
            </Button>
          </div>
        </CardHeader>
        {state.crossPlatformLinks.length > 0 && (
          <CardContent className="space-y-3">
            {state.crossPlatformLinks.map((link, i) => (
              <div key={link.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">Cross Platform {i + 1}</span>
                <Select value={link.group1} onValueChange={(v) => updateCrossPlatform(link.id, { group1: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Group 1" /></SelectTrigger>
                  <SelectContent>
                    {state.groups.map((g, gi) => <SelectItem key={g.id} value={g.id}>Group {gi + 1}{g.platform ? ` (${g.platform})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">&</span>
                <Select value={link.group2} onValueChange={(v) => updateCrossPlatform(link.id, { group2: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Group 2" /></SelectTrigger>
                  <SelectContent>
                    {state.groups.map((g, gi) => <SelectItem key={g.id} value={g.id}>Group {gi + 1}{g.platform ? ` (${g.platform})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => removeCrossPlatform(link.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Gifting (Non-Contracted) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Gifting (Non-Contracted)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">If contracted, complete the contracted influencers section instead.</p>
            </div>
            <Button variant="outline" size="sm" onClick={addGiftingTier} disabled={state.giftingTiers.length >= 5}>
              <Plus className="h-3 w-3 mr-1" /> Add Tier
            </Button>
          </div>
        </CardHeader>
        {state.giftingTiers.length > 0 && (
          <CardContent className="space-y-3">
            {state.giftingTiers.map((t, i) => (
              <div key={t.id} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tier {i + 1}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => removeGiftingTier(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Platform</Label>
                    <Select value={t.platform} onValueChange={(v) => updateGiftingTier(t.id, { platform: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground"># Influencers</Label>
                    <NumInput value={t.influencers} onChange={(v) => updateGiftingTier(t.id, { influencers: v })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tier</Label>
                    <Select value={t.tier} onValueChange={(v) => updateGiftingTier(t.id, { tier: v, avgFollowers: TIER_AVG_FOLLOWERS[v] || 0 })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {TIERS.map((tr) => <SelectItem key={tr} value={tr}>{tr}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Avg Followers</Label>
                    <NumInput value={t.avgFollowers} onChange={(v) => updateGiftingTier(t.id, { avgFollowers: v })} formatted />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Estimated Posts</Label>
                    <NumInput value={t.estimatedPosts} onChange={(v) => updateGiftingTier(t.id, { estimatedPosts: v })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Estimated Impressions / Views</Label>
                    <NumInput value={t.estimatedImpressions} onChange={(v) => updateGiftingTier(t.id, { estimatedImpressions: v })} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
