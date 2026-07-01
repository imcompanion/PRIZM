/**
 * Creator-cost calculation engine.
 *
 * Faithfully replicates the Excel Talent-tab formulas for both
 * UK and US fee calculators (V6-2).
 *
 * Key formulas translated:
 *   Impressions/Views per post  = followers × viewRate
 *   Per-post fee                = (impr/1000) × max(a + b × ln(impr), c) × territoryMult
 *   Content fee / influencer    = SUMPRODUCT(per-post fees × deliverable counts)
 *   Reposting uplift            = contentFee × 40 %  (if enabled)
 *   Organic booster             = min(if weeks≤52 → 0.5%×w, else ramp), 1.2%×w)
 *   Paid booster                = min(if weeks≤12 → 3.5%×w, else ramp), 6%×w)
 *   Exclusivity booster         = min(if weeks≤8  → 5%×w,   else ramp), 10%×w)
 *   Campaign multiplier adj     = 20%×(timePressure+seasonal+restricted) + 40%×popular + 30%×niche
 *                                  / (1 + (count−1) × 20 %)
 *   Fee per influencer          = contentFee + reposting + booster + multiplier
 *   Total group fee             = feePerInfl × influencerCount
 *   Companion creator costs %   = 3 %
 *   Contingency                 = contingencyPct × totalFee
 *   FX premium                  = fxPct × totalFee  (if enabled)
 */

import type { TalentBudgetState, InfluencerGroup } from "./TalentBudgetTab";

/* ═══════════════ BENCHMARK TABLES ═══════════════ */

interface Benchmark {
  a: number;
  b: number;
  c: number;
  viewRate: number;
}

// GBP pricing table (from UK Excel CB/CC/CD/CE/CF columns)
const BENCHMARKS_GBP: Record<string, Benchmark> = {
  "Instagram - Single Image":  { a: 115,  b: -8.39, c: 12, viewRate: 0.25 },
  "Instagram - Multi Image":   { a: 171,  b: -12.5, c: 12, viewRate: 0.25 },
  "Instagram - Short Video":   { a: 175,  b: -12.5, c: 12, viewRate: 0.34 },
  "Instagram - Story Frames":  { a: 151,  b: -12.5, c: 12, viewRate: 0.05 },
  "TikTok - Short Video":      { a: 259,  b: -18.7, c: 12, viewRate: 0.15 },
  "TikTok - Image":            { a: 0,    b: 0,     c: 0,  viewRate: 0.15 },
  "TikTok - Carousel":         { a: 0,    b: 0,     c: 0,  viewRate: 0.15 },
  "YouTube - Short Video":     { a: 277,  b: -20.7, c: 12, viewRate: 0.15 },
  "YouTube - Long Video":      { a: 277,  b: -20.7, c: 12, viewRate: 0.15 },
  "Content House - Image":     { a: 200,  b: 0,     c: 200, viewRate: 0 },
  "Content House - Short Video":{ a: 1500, b: 0,    c: 1500, viewRate: 0 },
  "Content House - Long Video": { a: 2500, b: 0,    c: 2500, viewRate: 0 },
};

// US = GBP × 1.35 conversion rate (from US Excel CD7)
const US_CONVERSION = 1.35;

function getBenchmarks(office: "UK" | "US"): Record<string, Benchmark> {
  if (office === "UK") return BENCHMARKS_GBP;
  const usd: Record<string, Benchmark> = {};
  for (const [k, v] of Object.entries(BENCHMARKS_GBP)) {
    usd[k] = {
      a: v.a * US_CONVERSION,
      b: v.b * US_CONVERSION,
      c: v.c * US_CONVERSION,
      viewRate: v.viewRate,
    };
  }
  return usd;
}

/* ═══════════════ TERRITORY MULTIPLIERS ═══════════════ */

const TERRITORY_MULTIPLIERS: Record<string, number> = {
  "United Kingdom": 1.0,
  "United States":  1.4,
  "France":         1.0,
  "Netherlands":    1.2,
  "Italy":          0.7,
  "Spain":          0.7,
  "Germany":        1.2,
  "Nordics":        2.0,
  "India":          0.5,
  "Brazil":         0.55,
};

/* ═══════════════ BOOSTER FORMULAS ═══════════════ */

/**
 * Organic usage booster:
 *   if weeks ≤ 52 → 0.5% × weeks
 *   else → ramp from 0.5% to 1% over next 52 weeks
 *   capped at 1.2% × weeks
 */
function organicBooster(weeks: number): number {
  if (!weeks) return 0;
  return Math.min(
    weeks <= 52
      ? 0.005 * weeks
      : (0.005 + ((0.01 - 0.005) * (weeks - 52) / 52)) * weeks,
    0.012 * weeks
  );
}

/**
 * Paid usage booster:
 *   if weeks ≤ 12 → 3.5% × weeks
 *   else → ramp from 3.5% to 5% over next 40 weeks
 *   capped at 6% × weeks
 */
function paidBooster(weeks: number): number {
  if (!weeks) return 0;
  return Math.min(
    weeks <= 12
      ? 0.035 * weeks
      : (0.035 + ((0.05 - 0.035) * (weeks - 12) / 40)) * weeks,
    0.06 * weeks
  );
}

/**
 * Exclusivity booster:
 *   if weeks ≤ 8 → 5% × weeks
 *   else → ramp from 5% to 8% over next 44 weeks
 *   capped at 10% × weeks
 */
function exclusivityBooster(weeks: number): number {
  if (!weeks) return 0;
  return Math.min(
    weeks <= 8
      ? 0.05 * weeks
      : (0.05 + ((0.08 - 0.05) * (weeks - 8) / 44)) * weeks,
    0.1 * weeks
  );
}

/* ═══════════════ MULTIPLIER FORMULA ═══════════════ */

/**
 * Campaign multiplier adjusted (AP25):
 *   raw = 0.2 × (timePressure + seasonal + restricted) + 0.4 × popular + 0.3 × niche
 *   count = popular + niche + timePressure + seasonal + restricted
 *   adjusted = count == 0 ? 0 : raw / (1 + (count-1) × 0.2)
 */
function campaignMultiplierAdj(
  timePressure: boolean,
  seasonal: boolean,
  restricted: boolean,
): number {
  const tp = timePressure ? 1 : 0;
  const se = seasonal ? 1 : 0;
  const rg = restricted ? 1 : 0;
  const raw = 0.2 * (tp + se + rg);
  const count = tp + se + rg;
  if (count === 0) return 0;
  return raw / (1 + (count - 1) * 0.2);
}

/* ═══════════════ PER-POST FEE (AW25 formula) ═══════════════ */

/**
 * Per-post fee:
 *   if impressions > 0:
 *     (impressions / 1000) × max(a + b × ln(impressions), c) × territoryMult
 *   else:
 *     a × territoryMult  (flat fee for Content House etc)
 */
function perPostFee(bench: Benchmark, followers: number, territoryMult: number): number {
  if (!bench || (!bench.a && !bench.c)) return 0;
  const impressions = followers * bench.viewRate;
  if (impressions > 0) {
    const cpm = Math.max(
      bench.a + bench.b * Math.log(Math.max(impressions, 1)),
      bench.c
    );
    return (impressions / 1000) * cpm * territoryMult;
  }
  // Flat fee (Content House formats with viewRate = 0)
  return bench.a * territoryMult;
}

/* ═══════════════ GROUP RESULT ═══════════════ */

export interface GroupResult {
  groupId: string;
  platform: string;
  influencers: number;
  followers: number;
  // Per-influencer breakdown
  contentFeePerInfl: number;      // BD25: SUMPRODUCT(per-post fees × deliverables)
  repostingPerInfl: number;       // BE25: contentFee × 0.4 if reposting
  boosterFeePerInfl: number;      // BF25: contentFee × totalBoosterPct
  multiplierFeePerInfl: number;   // BG25: contentFee × multiplierAdj
  totalFeePerInfl: number;        // BH25: sum(BD:BG)
  // Per-post impressions
  impressionsPerInfl: number;     // BI25
  // Group totals
  totalImpressions: number;       // BJ25: impressionsPerInfl × influencers
  totalContentFee: number;        // BK25: (contentFee + reposting) × influencers
  totalFee: number;               // BL25: totalFeePerInfl × influencers
  // Paid media fee (paid booster component only)
  paidMediaFee: number;           // BC25: (contentFee × paidBoosterPct) × influencers
  // Post-group adjustments
  companionCreatorPct: number;    // BM25: 3%
  companionCreatorCost: number;   // BM25: totalFee × 3%
}

export interface TalentCalcResult {
  groups: GroupResult[];
  // Platform summary
  platformBreakdown: Record<string, {
    creators: number;
    deliverables: number;
    impressions: number;
    creatorCost: number;
  }>;
  // Totals
  totalInfluencers: number;
  totalDeliverables: number;
  totalImpressions: number;
  totalFee: number;               // Sum of all BL columns
  companionCreatorCosts: number;  // 3% of totalFee
  talentContingency: number;      // contingencyPct × totalFee
  fxPremium: number;              // fxPct × totalFee (if enabled)
  // Final budgets
  internalBudget: number;         // [INT] = totalFee (available to pay creators)
  externalBudget: number;         // [EXT] = totalFee + companion + contingency + fx
}

/* ═══════════════ MAIN CALCULATION ═══════════════ */

export function calculateCreatorCosts(
  tb: TalentBudgetState,
  office: "UK" | "US",
): TalentCalcResult {
  const benchmarks = getBenchmarks(office);
  const multiplierAdj = campaignMultiplierAdj(tb.timePressure, tb.seasonal, tb.restrictedGoods);

  // Global boosters (baseline)
  const globalOrganic = organicBooster(tb.organicUsageWeeks);
  const globalPaid = paidBooster(tb.paidUsageWeeks);
  const globalExcl = exclusivityBooster(tb.exclusivityWeeks);

  const DELIVERABLE_KEYS: { key: keyof InfluencerGroup; benchSuffix: string }[] = [
    { key: "singleImage",  benchSuffix: "Single Image" },
    { key: "multiImage",   benchSuffix: "Multi Image" },
    { key: "shortVideo",   benchSuffix: "Short Video" },
    { key: "storyFrames",  benchSuffix: "Story Frames" },
  ];

  const groups: GroupResult[] = [];
  const platformBreakdown: Record<string, { creators: number; deliverables: number; impressions: number; creatorCost: number }> = {};

  for (const g of tb.groups) {
    if (!g.platform || !g.influencers) {
      continue;
    }

    const followers = g.avgFollowers || 0;
    const territory = g.territory || (office === "UK" ? "United Kingdom" : "United States");
    const territoryMult = TERRITORY_MULTIPLIERS[territory] || 1.0;

    // Calculate per-post fees and impressions for each format
    let contentFeePerInfl = 0;  // BD25
    let impressionsPerInfl = 0; // BI25

    for (const d of DELIVERABLE_KEYS) {
      const count = (g[d.key] as number) || 0;
      if (!count) continue;

      const benchKey = `${g.platform} - ${d.benchSuffix}`;
      const bench = benchmarks[benchKey];
      if (!bench) continue;

      // Per-post impressions (AR-AV columns)
      const postImpressions = followers * bench.viewRate;
      impressionsPerInfl += postImpressions * count;

      // Per-post fee (AW-BA columns) × deliverable count
      const fee = perPostFee(bench, followers, territoryMult);
      contentFeePerInfl += fee * count;
    }

    // Group specific boosters
    const org = g.useUsageOverride ? (g.organicUsageWeeksOverride ?? tb.organicUsageWeeks) : tb.organicUsageWeeks;
    const pd = g.useUsageOverride ? (g.paidUsageWeeksOverride ?? tb.paidUsageWeeks) : tb.paidUsageWeeks;
    const excl = g.useUsageOverride ? (g.exclusivityWeeksOverride ?? tb.exclusivityWeeks) : tb.exclusivityWeeks;
    
    const organicBoost = organicBooster(org);
    const paidBoost = paidBooster(pd);
    const exclBoost = exclusivityBooster(excl);
    const totalBoosterPct = organicBoost + paidBoost + exclBoost;

    // Reposting: 40% uplift on content fee (BE25)
    const repostingPerInfl = g.reposting ? contentFeePerInfl * 0.4 : 0;

    // Booster: content fee × total booster % (BF25)
    const boosterFeePerInfl = contentFeePerInfl * totalBoosterPct;

    // Multiplier: content fee × adjusted multiplier (BG25) + group specific multipliers
    let groupMultiplierAdj = multiplierAdj;
    if (g.multiplierPopular) groupMultiplierAdj += 0.40;
    if (g.multiplierNiche) groupMultiplierAdj += 0.30;
    const multiplierFeePerInfl = contentFeePerInfl * groupMultiplierAdj;

    // Total fee per influencer (BH25)
    const totalFeePerInfl = contentFeePerInfl + repostingPerInfl + boosterFeePerInfl + multiplierFeePerInfl;

    // Group totals
    const totalImpressions = impressionsPerInfl * g.influencers;           // BJ25
    const totalContentFee = (contentFeePerInfl + repostingPerInfl) * g.influencers; // BK25
    const totalFee = totalFeePerInfl * g.influencers;                      // BL25
    const paidMediaFee = (contentFeePerInfl * paidBoost) * g.influencers; // BC25
    const companionCreatorCost = totalFee * 0.03;                          // BM25

    const totalDeliverables = g.influencers * DELIVERABLE_KEYS.reduce((s, d) => s + ((g[d.key] as number) || 0), 0);

    groups.push({
      groupId: g.id,
      platform: g.platform,
      influencers: g.influencers,
      followers,
      contentFeePerInfl,
      repostingPerInfl,
      boosterFeePerInfl,
      multiplierFeePerInfl,
      totalFeePerInfl,
      impressionsPerInfl,
      totalImpressions,
      totalContentFee,
      totalFee,
      paidMediaFee,
      companionCreatorPct: 0.03,
      companionCreatorCost,
    });

    // Platform summary
    if (!platformBreakdown[g.platform]) {
      platformBreakdown[g.platform] = { creators: 0, deliverables: 0, impressions: 0, creatorCost: 0 };
    }
    platformBreakdown[g.platform].creators += g.influencers;
    platformBreakdown[g.platform].deliverables += totalDeliverables;
    platformBreakdown[g.platform].impressions += totalImpressions;
    platformBreakdown[g.platform].creatorCost += totalFee;
  }

  // Grand totals
  const totalFee = groups.reduce((s, g) => s + g.totalFee, 0);
  const totalInfluencers = groups.reduce((s, g) => s + g.influencers, 0);
  const totalDeliverables = Object.values(platformBreakdown).reduce((s, p) => s + p.deliverables, 0);
  const totalImpressions = groups.reduce((s, g) => s + g.totalImpressions, 0);

  // Companion creator costs: 3% of total fee (BM)
  const companionCreatorCosts = totalFee * 0.03;

  // Talent contingency (D16 UK = 10%, D17 US = 25%)
  const contingencyPct = tb.talentContingencyPct / 100;
  const talentContingency = totalFee * contingencyPct;

  // FX premium
  const fxPremium = tb.fxExposure ? totalFee * (tb.fxPremiumPct / 100) : 0;

  // Internal budget = total fee (available to pay creators)
  const internalBudget = totalFee;
  // External budget = total + companion + contingency + fx
  const externalBudget = totalFee + companionCreatorCosts + talentContingency + fxPremium;

  return {
    groups,
    platformBreakdown,
    totalInfluencers,
    totalDeliverables,
    totalImpressions,
    totalFee,
    companionCreatorCosts,
    talentContingency,
    fxPremium,
    internalBudget,
    externalBudget,
  };
}
