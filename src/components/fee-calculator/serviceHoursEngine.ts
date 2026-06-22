/**
 * Service Hours Engine — replicates the "Time Management" tab
 * from the UK / US Fee Calculator Excel V6-3.
 *
 * Each section matches a section header in the Excel.
 * Hours per task line come from the exact formulas in the spreadsheet.
 * Total cost per line = Hours × Rate Card hourly rate for that role.
 */

/* ─── Types ─── */

export interface TaskLine {
  section: string;        // Excel section header (e.g. "Set Up & Planning")
  task: string;           // Task description (e.g. "Planning")
  role: string;           // Exact role name matching rate_cards.roles.name
  hours: number;
  phase: string | null;   // Phase mapping (null = N/A)
}

/* ─── Section → Phase mapping ─── */

const SECTION_PHASE_MAP: Record<string, string | null> = {
  "Management": null,
  "Set Up & Planning": "RTB",
  "Creative & Strategy Development": "RTB",
  "Talent Brief Development": "Creators & Contracting",
  "Influencer Search & Recommendations": "Creators & Contracting",
  "Influencer Engagement & Fee Negotiation": "Creators & Contracting",
  "Influencer Contract Set Up & Negotiation": "Creators & Contracting",
  "Campaign Management: Instagram": "Content Creation & Go Live",
  "Campaign Management: TikTok": "Content Creation & Go Live",
  "Campaign Management: YouTube": "Content Creation & Go Live",
  "Campaign Management: Gifting": "Content Creation & Go Live",
  "Campaign Management: Procurement": "Content Creation & Go Live",
  "Production: Content House": "Content Creation & Go Live",
  "Production: AR Filter": "Content Creation & Go Live",
  "Production: Gifting": "Content Creation & Go Live",
  "Production: Research": "Content Creation & Go Live",
  "Production: Events": "Content Creation & Go Live",
  "Paid Media: Strategy & Setup": "Content Creation & Go Live",
  "Paid Media: Campaign Management": "Content Creation & Go Live",
  "Agility - Campaign Setup": "Content Creation & Go Live",
  "Agility - Campaign Management": "Content Creation & Go Live",
  "Reporting: Dashboard & Setup": "Reporting & Wrap Up",
  "Reporting: Snapshot": "Reporting & Wrap Up",
  "Reporting: Standard": "Reporting & Wrap Up",
  "Reporting: Advanced": "Reporting & Wrap Up",
  "Status Meetings": null,
  "Admin": null,
  "Miscellaneous BDB Services": null,
};

export interface ServiceHoursResult {
  lines: TaskLine[];
  bySection: Record<string, { hours: number; fee: number }>;
  totalHours: number;
  totalFee: number;
}

/* ─── Inputs ─── */

export interface EngineInput {
  durationMonths: number;

  // Project Management
  pmEnabled: boolean;
  pmInvolvement: string; // "Set up / Light" | "Set up / Execution Oversight" | "Full - End to End"

  // Creative
  creativeEnabled: boolean;
  creativeJobs: number;      // derived: total creative days / 4 (from RTB formula)
  proposalRevisions: number;
  roundsOfFeedback: number;

  // Talent & Content Management
  talentEnabled: boolean;
  totalInfluencers: number;
  crossPlatformInfluencers: number;
  influencerBriefRevisions: number;
  longListRevisions: number;
  contentIdeation: boolean;
  ideationRevisions: number;
  creativeTeamInvolved: boolean;
  contentProduction: boolean;
  contentRevisions: number;
  contentReviews: boolean;

  // Platform deliverables (from talent groups)
  instagramInfluencers: number;
  instagramImages: number;    // single + multi images
  instagramStories: number;
  instagramVideos: number;    // short videos
  tiktokInfluencers: number;
  tiktokVideos: number;
  youtubeInfluencers: number;
  youtubeVideos: number;
  giftingInfluencers: number; // from gifting tiers

  // Procurement
  procurementEnabled: boolean;
  totalShipments: number;

  // Production
  productionEnabled: boolean;
  contentHouseAssets: number;

  // Other Services
  arFilters: number;
  gifs: number;
  eventCount: number;
  giftingBoxes: number;
  giftingDesigns: number;
  researchReports: number;

  // Paid Media
  paidMediaEnabled: boolean;
  paidMediaPlatforms: number;   // count of active paid channels
  paidMediaLiveMonths: number;
  paidMediaComplexity: string;  // "" | "Standard" | "Complex"
  paidMediaSpend: number;
  totalPaidStaticAssets: number;
  totalPaidDynamicAssets: number;
  consultancyInvolvement: string; // "Light" | "Heavy"

  // Reporting
  reportingEnabled: boolean;
  reportingInvolvement: string;  // "Reporting only" | "Light" | "Heavy"
  dashboards: number;
  snapshotReports: number;
  standardReports: number;
  advancedReports: number;
}

/* ─── Helpers ─── */

const r = (n: number) => Math.round(n * 10) / 10;

const PM_HOURS_PER_MONTH: Record<string, number> = {
  "Set up / Light": 5,
  "Set up / Execution Oversight": 20,
  "Full - End to End": 40,
};

function paidSpendBonus(spend: number): number {
  if (spend >= 500000) return 1.5;
  if (spend >= 100000) return 1.25;
  return 1;
}

function paidComplexityMult(c: string): number {
  return c === "Complex" ? 1.5 : 1;
}

/* ─── Main calculation ─── */

export function calculateServiceHours(input: EngineInput): TaskLine[] {
  const lines: TaskLine[] = [];
  const months = Math.max(input.durationMonths, 1);
  const totalInfluencers = input.totalInfluencers;
  const talentActive = input.talentEnabled && totalInfluencers > 0 ? 1 : 0;
  const creativeActive = input.creativeEnabled ? 1 : 0;
  const creativeJobs = Math.max(input.creativeJobs, 0);

  const push = (section: string, task: string, role: string, hours: number) => {
    const h = r(hours);
    if (h > 0) lines.push({ section, task, role, hours: h, phase: SECTION_PHASE_MAP[section] ?? null });
  };

  // ═══════════════════════════════════════════
  // SET UP & PLANNING
  // ═══════════════════════════════════════════
  // Hours use minimum values from Excel's max(mround(ProjectSize/X), min)
  // Since we don't have Project Size input, we use the minimums.
  push("Set Up & Planning", "Planning", "Account Director", 5);
  push("Set Up & Planning", "Planning", "Account Manager", 5);
  push("Set Up & Planning", "Planning", "Creative Director", 1.5 * creativeActive);
  push("Set Up & Planning", "Planning", "Content Strategy Director", 1.5);
  push("Set Up & Planning", "Budgeting", "Project Manager", 1.5);
  push("Set Up & Planning", "Review", "Senior Account Director", 1);
  push("Set Up & Planning", "Client Term Sheet", "Global Senior Business Affairs Manager", 1);
  push("Set Up & Planning", "Client Deal Review", "Global Director of Business Affairs", 5);

  // ═══════════════════════════════════════════
  // CREATIVE & STRATEGY DEVELOPMENT
  // ═══════════════════════════════════════════
  if (input.creativeEnabled && creativeJobs > 0) {
    const stratDevHrs = 15; // Senior Content Strategist: 15h per project
    push("Creative & Strategy Development", "Strategy development", "Senior Content Strategist", stratDevHrs);

    const creativeDevHrs = (8 + creativeJobs * 6.5) * creativeActive;
    push("Creative & Strategy Development", "Creative development", "Creative", creativeDevHrs);

    const designerDevHrs = (creativeJobs * 2) * creativeActive;
    push("Creative & Strategy Development", "Creative development", "Senior Designer", designerDevHrs);

    // Presentation development
    const presStratHrs = Math.min(stratDevHrs / 4, 4);
    push("Creative & Strategy Development", "Presentation Development", "Senior Content Strategist", presStratHrs);

    const presCreativeHrs = Math.min(creativeDevHrs / 4, 8) * creativeActive;
    push("Creative & Strategy Development", "Presentation Development", "Senior Creative", presCreativeHrs);

    // Senior Designer for presentation: 5% of creative+pres hours
    const presDesignerHrs = (creativeDevHrs + presStratHrs + presCreativeHrs) * 0.05;
    push("Creative & Strategy Development", "Presentation Development", "Senior Designer", presDesignerHrs);

    // Senior Producer: 22.5% of (designer dev + strat dev)
    const producerHrs = (designerDevHrs + stratDevHrs) * 0.225;
    push("Creative & Strategy Development", "Feasibility, Planning and Prod Costs", "Senior Producer", producerHrs);

    // Creative Director: 12.5% of creative execution hours
    const cdHrs = (creativeDevHrs + designerDevHrs + presCreativeHrs + presDesignerHrs) * 0.125;
    push("Creative & Strategy Development", "Direction", "Creative Director", cdHrs);

    // Content Strategy Director: 22.5% of strategy hours
    const csdHrs = (stratDevHrs + presStratHrs) * 0.225;
    push("Creative & Strategy Development", "Direction", "Content Strategy Director", csdHrs);
  }

  // ═══════════════════════════════════════════
  // TALENT BRIEF DEVELOPMENT
  // ═══════════════════════════════════════════
  if (talentActive) {
    push("Talent Brief Development", "Influencer Brief Draft", "Account Manager", 6 * talentActive);
    push("Talent Brief Development", "Influencer Brief Draft", "Senior Creative", 1.5 * talentActive);

    const briefRevs = input.influencerBriefRevisions || 0;
    push("Talent Brief Development", "Influencer Brief Revisions", "Account Manager", briefRevs * 3);
    push("Talent Brief Development", "Influencer Brief Revisions", "Senior Creative", briefRevs * 0.5);
  }

  // ═══════════════════════════════════════════
  // INFLUENCER SEARCH & RECOMMENDATIONS
  // ═══════════════════════════════════════════
  if (talentActive) {
    const searchInfluencers = totalInfluencers;
    const aeSearchHrs = searchInfluencers * 2;
    push("Influencer Search & Recommendations", "Search", "Account Executive", aeSearchHrs);

    const longListRevs = input.longListRevisions || 0;
    push("Influencer Search & Recommendations", "Longlist Revisions", "Account Executive", longListRevs * (aeSearchHrs / 4));

    const amSearchHrs = searchInfluencers * 1;
    push("Influencer Search & Recommendations", "Search", "Account Manager", amSearchHrs);
    push("Influencer Search & Recommendations", "Longlist Revisions", "Account Manager", longListRevs * (amSearchHrs / 4));
  }

  // ═══════════════════════════════════════════
  // INFLUENCER ENGAGEMENT & FEE NEGOTIATION
  // ═══════════════════════════════════════════
  if (talentActive) {
    push("Influencer Engagement & Fee Negotiation", "Engage", "Account Executive", totalInfluencers * 1.5);
    push("Influencer Engagement & Fee Negotiation", "Fee Negotiations", "Account Manager", totalInfluencers * 1.5);
  }

  // ═══════════════════════════════════════════
  // INFLUENCER CONTRACT SET UP & NEGOTIATION
  // ═══════════════════════════════════════════
  if (talentActive) {
    push("Influencer Contract Set Up & Negotiation", "Contract Negotiations", "Account Manager", totalInfluencers * 1);
    push("Influencer Contract Set Up & Negotiation", "Master Influencer Term Sheet", "Global Senior Business Affairs Manager", 8 * talentActive);
    push("Influencer Contract Set Up & Negotiation", "Master Influencer Term Sheet", "Global Director of Business Affairs", talentActive);
    push("Influencer Contract Set Up & Negotiation", "Contract Negotiations", "Global Business Affairs Executive", totalInfluencers * 1.5);
  }

  // ═══════════════════════════════════════════
  // CAMPAIGN MANAGEMENT: INSTAGRAM
  // ═══════════════════════════════════════════
  if (talentActive && input.instagramInfluencers > 0) {
    const igInfls = input.instagramInfluencers;
    const igImageStory = input.instagramImages + input.instagramStories;
    const igVideos = input.instagramVideos;

    // Content Ideation & Content Production multipliers (binary: 1 if enabled)
    const ideationMult = input.contentIdeation ? 1 : 0;
    const productionMult = input.contentProduction ? 1 : 0;
    const contentMult = ideationMult * productionMult;

    const imageStoryUnits = igImageStory * contentMult;
    const videoUnits = igVideos;
    const totalDeliverables = igImageStory + igVideos;

    push("Campaign Management: Instagram", "Influencer Briefing", "Account Executive", igInfls * 0.8);
    push("Campaign Management: Instagram", "Influencer Briefing", "Account Manager", igInfls * 0.5);
    push("Campaign Management: Instagram", "Image/Story production management", "Account Executive", imageStoryUnits * 0.6);
    push("Campaign Management: Instagram", "Image/Story production management", "Account Manager", imageStoryUnits * 0.8);
    push("Campaign Management: Instagram", "Video production management", "Account Executive", videoUnits * 0.6);
    push("Campaign Management: Instagram", "Video production management", "Account Manager", videoUnits * 0.8);
    push("Campaign Management: Instagram", "Creative Content Reviews", "Creative", totalDeliverables * 0.2);
  }

  // ═══════════════════════════════════════════
  // CAMPAIGN MANAGEMENT: TIKTOK
  // ═══════════════════════════════════════════
  if (talentActive && input.tiktokInfluencers > 0) {
    const ttInfls = input.tiktokInfluencers;
    const ttVideos = input.tiktokVideos;

    push("Campaign Management: TikTok", "Influencer Briefing", "Account Executive", ttInfls * 0.5);
    push("Campaign Management: TikTok", "Influencer Briefing", "Account Manager", ttInfls * 0.5);
    push("Campaign Management: TikTok", "Video production management", "Account Executive", ttVideos * 1);
    push("Campaign Management: TikTok", "Video production management", "Account Manager", ttVideos * 1);
    push("Campaign Management: TikTok", "Creative Content Reviews", "Creative", ttVideos * 0.2);
  }

  // ═══════════════════════════════════════════
  // CAMPAIGN MANAGEMENT: YOUTUBE
  // ═══════════════════════════════════════════
  if (talentActive && input.youtubeInfluencers > 0) {
    const ytInfls = input.youtubeInfluencers;
    const ytVideos = input.youtubeVideos;

    push("Campaign Management: YouTube", "Influencer Briefing", "Account Executive", ytInfls * 0.5);
    push("Campaign Management: YouTube", "Influencer Briefing", "Account Manager", ytInfls * 0.5);
    push("Campaign Management: YouTube", "Video production management", "Account Executive", ytVideos * 1);
    push("Campaign Management: YouTube", "Video production management", "Account Manager", ytVideos * 1);
    push("Campaign Management: YouTube", "Creative Content Reviews", "Creative", ytVideos * 0.2);
  }

  // ═══════════════════════════════════════════
  // CAMPAIGN MANAGEMENT: GIFTING
  // ═══════════════════════════════════════════
  if (talentActive && input.giftingInfluencers > 0) {
    const gi = input.giftingInfluencers;
    push("Campaign Management: Gifting", "Influencer Briefing", "Account Executive", gi * 0.25);
    push("Campaign Management: Gifting", "Influencer Briefing", "Account Manager", gi * 0.25);
    push("Campaign Management: Gifting", "Gifting Content Management", "Account Executive", gi * 0.125);
    push("Campaign Management: Gifting", "Gifting Content Management", "Account Manager", gi * 0.125);
    push("Campaign Management: Gifting", "Creative Content Reviews", "Creative", gi * 0.2);
  }

  // ═══════════════════════════════════════════
  // CAMPAIGN MANAGEMENT: PROCUREMENT
  // ═══════════════════════════════════════════
  if (input.procurementEnabled && input.totalShipments > 0) {
    push("Campaign Management: Procurement", "Product Procurement", "Account Executive", input.totalShipments * 0.2);
    push("Campaign Management: Procurement", "Product Procurement", "Account Manager", input.totalShipments * 0.2);
  }

  // ═══════════════════════════════════════════
  // PRODUCTION: CONTENT HOUSE
  // ═══════════════════════════════════════════
  if (input.contentHouseAssets > 0) {
    const assets = input.contentHouseAssets;
    push("Production: Content House", "Influencer Briefing", "Account Executive", assets * 1);
    push("Production: Content House", "Influencer Briefing", "Account Manager", assets * 1);
    push("Production: Content House", "Production Management", "Account Executive", assets * 1);
    push("Production: Content House", "Production Management", "Account Manager", assets * 1);
    push("Production: Content House", "Creative Asset Review", "Creative", assets * 0.5);
    push("Production: Content House", "Design", "Designer", assets * 1);
    push("Production: Content House", "Product Selection", "Account Executive", assets * 0.75);
  }

  // ═══════════════════════════════════════════
  // PRODUCTION: AR FILTER
  // ═══════════════════════════════════════════
  if (input.arFilters > 0) {
    const ar = input.arFilters;
    push("Production: AR Filter", "Creative development", "Senior Creative", ar * 10);
    push("Production: AR Filter", "Design", "Designer", ar * 56);
    push("Production: AR Filter", "Influencer Search", "Account Manager", ar * 3);
    push("Production: AR Filter", "Engage", "Account Manager", ar * 2);
    push("Production: AR Filter", "Negotiate & Contract", "Account Manager", ar * 4);
  }

  if (input.gifs > 0) {
    push("Production: AR Filter", "GIFs", "Designer", input.gifs * 8);
  }

  // ═══════════════════════════════════════════
  // PRODUCTION: GIFTING
  // ═══════════════════════════════════════════
  if (input.giftingDesigns > 0 || input.giftingBoxes > 0) {
    const designs = input.giftingDesigns;
    push("Production: Gifting", "Design Concepts", "Designer", designs * 16);
    push("Production: Gifting", "Design Concepts", "Senior Designer", designs * 16 * 0.2);
    push("Production: Gifting", "Route Development", "Designer", designs * 30);
    push("Production: Gifting", "Route Development", "Senior Designer", designs * 30 * 0.2);
    push("Production: Gifting", "Production", "Designer", designs * 24);
    push("Production: Gifting", "Production", "Senior Designer", designs * 24 * 0.2);
    push("Production: Gifting", "Supplier Management", "Producer", designs * 16);
    push("Production: Gifting", "Product Sourcing", "Producer", designs * 12);
    push("Production: Gifting", "Packing & Shipping", "Account Executive", input.giftingBoxes * 0.3);
    push("Production: Gifting", "Supervision/Review", "Account Manager", designs * 7);
  }

  // ═══════════════════════════════════════════
  // PRODUCTION: RESEARCH
  // ═══════════════════════════════════════════
  if (input.researchReports > 0) {
    push("Production: Research", "Research Sourcing & Review", "Senior Analytics & Insights Manager", input.researchReports * 4);
  }

  // ═══════════════════════════════════════════
  // PRODUCTION: EVENTS
  // ═══════════════════════════════════════════
  if (input.eventCount > 0) {
    const ev = input.eventCount;
    push("Production: Events", "Concept & Ideation", "Senior Creative", ev * 16);
    push("Production: Events", "Bookings, Execution and Sourcing", "Account Manager", ev * 12);
    push("Production: Events", "Management during event", "Account Manager", ev * 6);
  }

  // ═══════════════════════════════════════════
  // PAID MEDIA: STRATEGY & SETUP
  // ═══════════════════════════════════════════
  if (input.paidMediaEnabled) {
    const platforms = Math.max(input.paidMediaPlatforms, 1);
    const liveMonths = Math.max(input.paidMediaLiveMonths, 1);
    const spendBonus = paidSpendBonus(input.paidMediaSpend);
    const complexity = paidComplexityMult(input.paidMediaComplexity);
    const totalAssets = input.totalPaidStaticAssets + input.totalPaidDynamicAssets;

    // Strategy & Setup
    push("Paid Media: Strategy & Setup", "Creative Development & Review", "Paid Media Director", liveMonths * 1);
    push("Paid Media: Strategy & Setup", "Paid Media Strategy", "Paid Media Director", liveMonths * 6);
    push("Paid Media: Strategy & Setup", "Setup - Account Setup", "Paid Media Manager", liveMonths * 1);
    push("Paid Media: Strategy & Setup", "Setup - Connecting Influencers", "Senior Paid Media Executive", totalInfluencers * 0.5);
    push("Paid Media: Strategy & Setup", "Setup - Audience Creation", "Senior Paid Media Executive", liveMonths * 1.5);
    push("Paid Media: Strategy & Setup", "Setup - Initial Campaign Build", "Senior Paid Media Executive", liveMonths * 3);

    // Campaign Management
    push("Paid Media: Campaign Management", "Asset adapt - image/carousel", "Designer", input.totalPaidStaticAssets * 0.25);
    push("Paid Media: Campaign Management", "Asset adapt - video", "Designer", input.totalPaidDynamicAssets * 1);
    push("Paid Media: Campaign Management", "Copywriting", "Senior Paid Media Executive", totalAssets * 0.25);
    push("Paid Media: Campaign Management", "Ongoing Management & Optimisation", "Senior Paid Media Executive",
      liveMonths * (9 + 5 * platforms) * spendBonus);
    push("Paid Media: Campaign Management", "Ongoing Management & Optimisation", "Paid Media Manager",
      liveMonths * (3 + 2 * platforms) * spendBonus);
    push("Paid Media: Campaign Management", "Ongoing Management & Optimisation", "Paid Media Director",
      liveMonths * (1 + 1 * platforms) * spendBonus);
    push("Paid Media: Campaign Management", "Weekly Update Emails", "Senior Paid Media Executive",
      liveMonths * (4 + 1.5 * platforms));
    push("Paid Media: Campaign Management", "Weekly Update Emails", "Paid Media Director",
      liveMonths * (1.5 + 0.25 * platforms));
    push("Paid Media: Campaign Management", "Status Meetings", "Senior Paid Media Executive", liveMonths * 3);
    push("Paid Media: Campaign Management", "Status Meetings", "Paid Media Director", liveMonths * 1.5);
    push("Paid Media: Campaign Management", "Reporting", "Senior Paid Media Executive",
      liveMonths * (4 + 3 * platforms) * complexity);
    push("Paid Media: Campaign Management", "Reporting", "Paid Media Director",
      liveMonths * (2 + 1 * platforms) * complexity);
    push("Paid Media: Campaign Management", "Reporting", "Paid Media Manager",
      liveMonths * (1 + 0.5 * platforms) * complexity);

    // Consultancy (from involvement dropdown)
    const consultHrs = input.consultancyInvolvement === "Heavy" ? 16 : 4;
    push("Paid Media: Campaign Management", "Consultancy", "Paid Media Director", liveMonths * consultHrs);
  }

  // ═══════════════════════════════════════════
  // REPORTING: DASHBOARD & SETUP
  // ═══════════════════════════════════════════
  if (input.reportingEnabled) {
    const reportMonths = months;

    if (input.dashboards > 0) {
      push("Reporting: Dashboard & Setup", "Dashboard setup", "Analytics & Insights Manager", input.dashboards * 6);
      push("Reporting: Dashboard & Setup", "Dashboard maintenance", "Analytics & Insights Manager", input.dashboards * reportMonths * 1);
      push("Reporting: Dashboard & Setup", "Post analytics sheet & tagging setup", "Analytics & Insights Manager", input.dashboards * 4);
    }

    // Ongoing involvement
    const involvementHrs = input.reportingInvolvement === "Heavy" ? 8 :
      input.reportingInvolvement === "Light" ? 4 : 0;
    if (involvementHrs > 0) {
      push("Reporting: Dashboard & Setup", "Ongoing involvement", "Analytics & Insights Manager", reportMonths * involvementHrs);
    }
  }

  // ═══════════════════════════════════════════
  // REPORTING: SNAPSHOT
  // ═══════════════════════════════════════════
  if (input.reportingEnabled && input.snapshotReports > 0) {
    const n = input.snapshotReports;
    push("Reporting: Snapshot", "Data collection & processing", "Analytics & Insights Manager", n * 4);
    push("Reporting: Snapshot", "Data analysis and visualisation", "Analytics & Insights Manager", n * 14);
    push("Reporting: Snapshot", "Data & report input", "Account Executive", n * 7);
    push("Reporting: Snapshot", "Report structure/writing/review", "Account Manager", n * 3);
    push("Reporting: Snapshot", "Report structure/writing/review", "Account Director", n * 0.5);
    push("Reporting: Snapshot", "Review", "Senior Analytics & Insights Manager", n * 2);
    push("Reporting: Snapshot", "Presentation design", "Designer", n * 2);
  }

  // ═══════════════════════════════════════════
  // REPORTING: STANDARD
  // ═══════════════════════════════════════════
  if (input.reportingEnabled && input.standardReports > 0) {
    const n = input.standardReports;
    push("Reporting: Standard", "Data collection & processing", "Analytics & Insights Manager", n * 6);
    push("Reporting: Standard", "Content tagging", "Account Executive", n * 3);
    push("Reporting: Standard", "Data analysis and visualisation", "Analytics & Insights Manager", n * 21);
    push("Reporting: Standard", "Data & report input", "Account Executive", n * 8);
    push("Reporting: Standard", "Report structure/writing/review", "Account Manager", n * 8);
    push("Reporting: Standard", "Report structure/writing/review", "Account Director", n * 3);
    push("Reporting: Standard", "Story/insight/learning review", "Senior Analytics & Insights Manager", n * 3);
    push("Reporting: Standard", "Story/insight/learning input", "Senior Social Strategist", n * 3);
    push("Reporting: Standard", "Presentation design", "Designer", n * 4);
  }

  // ═══════════════════════════════════════════
  // REPORTING: ADVANCED
  // ═══════════════════════════════════════════
  if (input.reportingEnabled && input.advancedReports > 0) {
    const n = input.advancedReports;
    push("Reporting: Advanced", "Data collection & processing", "Senior Analytics & Insights Manager", n * 7);
    push("Reporting: Advanced", "Content tagging", "Account Executive", n * 5);
    push("Reporting: Advanced", "Data analysis and visualisation", "Senior Analytics & Insights Manager", n * 28);
    push("Reporting: Advanced", "Data & report input", "Account Executive", n * 12);
    push("Reporting: Advanced", "Report structure/writing/review", "Account Manager", n * 16);
    push("Reporting: Advanced", "Report structure/writing/review", "Account Director", n * 16);
    push("Reporting: Advanced", "Story/insight/learning review", "Senior Analytics & Insights Manager", n * 4);
    push("Reporting: Advanced", "Story/insight/learning input", "Senior Social Strategist", n * 4);
    push("Reporting: Advanced", "Quality Control", "Global Head of Insight & Analytics", n * 2);
    push("Reporting: Advanced", "Presentation design", "Designer", n * 6);
  }

  // ═══════════════════════════════════════════
  // STATUS MEETINGS
  // ═══════════════════════════════════════════
  push("Status Meetings", "Status Meetings", "Account Executive", months * 4);
  push("Status Meetings", "Status Meetings", "Account Manager", months * 2);

  // ═══════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════
  push("Admin", "Adhoc Requests", "Global Business Affairs Executive", months * 4);

  // ═══════════════════════════════════════════
  // MANAGEMENT (calculated LAST — % of all other hours)
  // ═══════════════════════════════════════════
  // From Excel: AD = 10% of all non-management hours
  //            SAD = 5% + 4% = 9%
  //            SPM = PM involvement hours × months
  const nonMgmtHours = lines.reduce((s, l) => s + l.hours, 0);

  if (input.pmEnabled) {
    const pmMonthlyHrs = PM_HOURS_PER_MONTH[input.pmInvolvement] || 20;

    push("Management", "Management", "Account Director", nonMgmtHours * 0.10);
    push("Management", "Management", "Senior Account Director", nonMgmtHours * 0.05);
    push("Management", "Management", "Senior Account Director", nonMgmtHours * 0.04);
    push("Management", "Management", "Senior Project Manager", pmMonthlyHrs * months);
  }

  return lines;
}

/* ─── Rate matching & fee computation ─── */

export function computeAgencyFee(
  lines: TaskLine[],
  rateCardRoles: { roleName: string; hourlyRate: number }[],
): ServiceHoursResult {
  const bySection: Record<string, { hours: number; fee: number }> = {};
  let totalHours = 0;
  let totalFee = 0;

  // Build a name→rate lookup (case-insensitive exact match)
  const rateLookup = new Map<string, number>();
  for (const rc of rateCardRoles) {
    rateLookup.set(rc.roleName.toLowerCase(), rc.hourlyRate);
  }

  for (const line of lines) {
    const rate = rateLookup.get(line.role.toLowerCase()) || 0;
    const fee = line.hours * rate;

    if (!bySection[line.section]) {
      bySection[line.section] = { hours: 0, fee: 0 };
    }
    bySection[line.section].hours += line.hours;
    bySection[line.section].fee += fee;
    totalHours += line.hours;
    totalFee += fee;
  }

  return { lines, bySection, totalHours, totalFee };
}
