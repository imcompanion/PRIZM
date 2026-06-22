import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fetch live FX rate from frankfurter.app
async function getLiveFxRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  try {
    const resp = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    if (!resp.ok) throw new Error(`FX API ${resp.status}`);
    const data = await resp.json();
    return data.rates?.[to] || 1;
  } catch (e) {
    console.warn("Failed to fetch FX rate, using fallback:", e);
    // Fallback rates
    const fallbacks: Record<string, number> = {
      "GBP_EUR": 1.17, "GBP_USD": 1.27,
      "EUR_GBP": 0.85, "EUR_USD": 1.09,
      "USD_GBP": 0.79, "USD_EUR": 0.92,
    };
    return fallbacks[`${from}_${to}`] || 1;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { office, client, durationWeeks, budget, startDate, rateCardName, currency: targetCurrency } = await req.json();
    const outputCurrency = (targetCurrency || "GBP").toUpperCase();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Calculate months
    const start = new Date(startDate || new Date().toISOString().split("T")[0]);
    const weeks = durationWeeks || 12;
    const endDate = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
    
    const months: string[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= endDate) {
      months.push(cursor.toLocaleDateString("en-GB", { month: "short", year: "numeric" }));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Fetch core data with pagination to avoid default 1000-row truncation
    const fetchAllRows = async (
      table: string,
      selectColumns: string,
      applyFilters?: (query: any) => any,
    ): Promise<any[]> => {
      const rows: any[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        let query = sb.from(table).select(selectColumns).range(from, from + pageSize - 1);
        if (applyFilters) query = applyFilters(query);

        const { data, error } = await query;
        if (error) {
          console.error(`Failed to fetch ${table}:`, error.message, { from });
          break;
        }
        if (!data || data.length === 0) break;

        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      return rows;
    };

    const [projects, scopes, roles, people, rateCards] = await Promise.all([
      fetchAllRows("projects", "id, title, office, sf_account, parent_account, ultimate_parent, start_date, end_date, duration_weeks, price, media_cost, gross_budget, fee_calc_currency, stage, rate_card_id, gp_margin_pct"),
      fetchAllRows("project_scopes", "project_id, role_id, scoped_hours"),
      fetchAllRows("roles", "id, name, billable_capacity_hours"),
      fetchAllRows("people", "id, role_id, annual_salary, office", (query) => query.gt("annual_salary", 0)),
      fetchAllRows("rate_cards", "id, name, role_id, hourly_rate, currency"),
    ]);

    const roleMap: Record<string, string> = {};
    const roleCapacity: Record<string, number> = {};
    for (const r of roles) {
      roleMap[r.id] = r.name;
      roleCapacity[r.name] = r.billable_capacity_hours || 7.5;
    }

    // Build rate card lookup using specified rate card name, or client match
    const rateCardByRole: Record<string, { rate: number; sourceCurrency: string }> = {};
    
    if (rateCardName) {
      // Use specified rate card
      for (const rc of rateCards) {
        if (rc.name !== rateCardName) continue;
        const roleName = rc.role_id ? roleMap[rc.role_id] : null;
        if (!roleName) continue;
        rateCardByRole[roleName] = { rate: rc.hourly_rate, sourceCurrency: rc.currency };
      }
    }
    
    // Fallback: try client name match using token-based fuzzy matching
    if (Object.keys(rateCardByRole).length === 0 && client) {
      // Extract significant tokens from client name (e.g., "Sainsbury's F&D UK" → ["sainsbury"])
      const clientTokens = client
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t: string) => t.length >= 4);

      // Score each rate card by how many client tokens appear in it
      const scored: { name: string; score: number }[] = [];
      const uniqueRcNames = [...new Set(rateCards.map((rc: any) => rc.name))];
      for (const rcName of uniqueRcNames) {
        const rcLower = rcName.toLowerCase();
        let score = 0;
        for (const token of clientTokens) {
          if (rcLower.includes(token)) score += 1;
        }
        if (score > 0) scored.push({ name: rcName, score });
      }

      // Use best-matching rate card; when tied on token score, prefer names suggesting recency
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Prefer names with "onwards", recent years, or without "pre"/"old"
        const recencyScore = (name: string): number => {
          const lower = name.toLowerCase();
          if (lower.includes("pre ") || lower.includes("old")) return -1;
          if (lower.includes("onwards") || lower.includes("current")) return 2;
          // Extract year and prefer higher
          const yearMatch = lower.match(/20(\d{2})/);
          return yearMatch ? parseInt(yearMatch[1]) : 0;
        };
        return recencyScore(b.name) - recencyScore(a.name);
      });
      const bestRcName = scored[0]?.name;
      if (bestRcName) {
        console.log("Rate card auto-matched:", bestRcName, "from client:", client);
        for (const rc of rateCards) {
          if (rc.name !== bestRcName) continue;
          const roleName = rc.role_id ? roleMap[rc.role_id] : null;
          if (!roleName || rateCardByRole[roleName]) continue;
          rateCardByRole[roleName] = { rate: rc.hourly_rate, sourceCurrency: rc.currency };
        }
      }
    }

    // Determine source currencies and fetch FX rates
    const sourceCurrencies = new Set<string>();
    for (const v of Object.values(rateCardByRole)) sourceCurrencies.add(v.sourceCurrency);
    // Internal costs are always in GBP (UK staff) or USD (US staff) — we'll assume GBP for now
    sourceCurrencies.add("GBP");

    // Fetch all needed FX rates in parallel
    const fxRates: Record<string, number> = {};
    const fxPromises: Promise<void>[] = [];
    for (const src of sourceCurrencies) {
      if (src === outputCurrency) {
        fxRates[`${src}_${outputCurrency}`] = 1;
      } else {
        fxPromises.push(
          getLiveFxRate(src, outputCurrency).then((rate) => {
            fxRates[`${src}_${outputCurrency}`] = rate;
          })
        );
      }
    }
    await Promise.all(fxPromises);

    console.log("FX rates:", fxRates);

    // Convert rate card rates to output currency
    const rateCardConverted: Record<string, number> = {};
    for (const [roleName, { rate, sourceCurrency }] of Object.entries(rateCardByRole)) {
      const fx = fxRates[`${sourceCurrency}_${outputCurrency}`] || 1;
      rateCardConverted[roleName] = Math.round(rate * fx * 100) / 100;
    }

    // Office normalization helper for consistent filtering across tables
    const matchesSelectedOffice = (value: string | null | undefined): boolean => {
      if (!office || office === "all") return true;
      const normalized = (value || "").toLowerCase().trim();
      const compact = normalized.replace(/[^a-z]/g, "");

      if (office === "UK") {
        return compact === "uk" || compact === "unitedkingdom" || compact === "greatbritain" || compact === "gb";
      }
      if (office === "US") {
        return compact === "us" || compact === "usa" || compact === "unitedstates" || compact === "unitedstatesofamerica";
      }

      return normalized.includes(office.toLowerCase());
    };

    // Compute average internal cost per hour per role, filtered by office
    // Use trimmed mean to reduce outlier distortion when no client-specific staffing data is available.
    const trimmedMean = (values: number[], trimRatio = 0.15): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const trimCount = Math.min(Math.floor(sorted.length * trimRatio), Math.floor((sorted.length - 1) / 2));
      const kept = sorted.slice(trimCount, sorted.length - trimCount);
      const total = kept.reduce((sum, value) => sum + value, 0);
      return total / Math.max(kept.length, 1);
    };

    const roleCostSamples: Record<string, number[]> = {};
    const personCostPerHour: Record<string, number> = {};
    for (const p of people) {
      if (!p.role_id || !p.annual_salary) continue;
      if (!matchesSelectedOffice(p.office)) continue;

      const roleName = roleMap[p.role_id];
      if (!roleName) continue;
      const cap = roleCapacity[roleName] || 7.5;
      const costPerHour = (p.annual_salary * 1.15) / (1665.0 * (cap / 7.5));
      personCostPerHour[p.id] = costPerHour;
      if (!roleCostSamples[roleName]) roleCostSamples[roleName] = [];
      roleCostSamples[roleName].push(costPerHour);
    }

    const avgCostPerHour: Record<string, number> = {};
    const gbpToOutput = fxRates[`GBP_${outputCurrency}`] || 1;
    const usdToOutput = fxRates[`USD_${outputCurrency}`] || 1;
    for (const [name, samples] of Object.entries(roleCostSamples)) {
      const fx = office === "US" ? usdToOutput : gbpToOutput;
      avgCostPerHour[name] = Math.round(trimmedMean(samples) * fx * 100) / 100;
    }

    // Filter projects for context
    const DATA_START_DATE = "2025-01-01";
    const isComparableProject = (project: any): boolean => !!project.start_date && project.start_date >= DATA_START_DATE;

    let relevantProjects = projects;
    if (office && office !== "all") {
      relevantProjects = relevantProjects.filter((p: any) => matchesSelectedOffice(p.office));
    }

    // Align with profitability logic: exclude projects that started before timesheet coverage
    relevantProjects = relevantProjects.filter(isComparableProject);

    if (client) {
      const cl = client.toLowerCase();
      relevantProjects = relevantProjects.filter((p: any) =>
        (p.sf_account || "").toLowerCase().includes(cl) ||
        (p.parent_account || "").toLowerCase().includes(cl) ||
        (p.ultimate_parent || "").toLowerCase().includes(cl) ||
        (p.title || "").toLowerCase().includes(cl)
      );
    }

    let fallbackUsed = false;
    if (relevantProjects.length === 0 && client) {
      fallbackUsed = true;
      relevantProjects = projects;
      if (office && office !== "all") {
        relevantProjects = relevantProjects.filter((p: any) => matchesSelectedOffice(p.office));
      }
      relevantProjects = relevantProjects.filter(isComparableProject);
    }

    let relevantIds = relevantProjects.map((p: any) => p.id);

    const fetchHistoricalEntries = async (projectIds: string[]): Promise<any[]> => {
      const entriesAccumulator: any[] = [];
      if (projectIds.length === 0) return entriesAccumulator;

      const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
      const batchSize = 20;
      const pageSize = 1000;

      for (let i = 0; i < uniqueProjectIds.length; i += batchSize) {
        const batch = uniqueProjectIds.slice(i, i + batchSize);
        let from = 0;

        while (true) {
          const { data: entries, error } = await sb
            .from("time_entries")
            .select("project_id, person_id, date, hours")
            .in("project_id", batch)
            .range(from, from + pageSize - 1);

          if (error) {
            console.error("Failed to fetch historical time entries batch:", error.message, { batchSize: batch.length, from });
            break;
          }

          if (!entries || entries.length === 0) break;
          entriesAccumulator.push(...entries);

          if (entries.length < pageSize) break;
          from += pageSize;
        }
      }

      // Fallback path: per-project pull (more robust if batched IN queries return nothing unexpectedly)
      if (entriesAccumulator.length === 0) {
        console.warn("Historical batch query returned 0 entries; retrying per-project fallback");
        for (const projectId of uniqueProjectIds) {
          let from = 0;
          while (true) {
            const { data: entries, error } = await sb
              .from("time_entries")
              .select("project_id, person_id, date, hours")
              .eq("project_id", projectId)
              .range(from, from + pageSize - 1);

            if (error) {
              console.error("Failed per-project historical fetch:", error.message, { projectId, from });
              break;
            }

            if (!entries || entries.length === 0) break;
            entriesAccumulator.push(...entries);

            if (entries.length < pageSize) break;
            from += pageSize;
          }
        }
      }

      return entriesAccumulator;
    };

    console.log("Historical context counts:", JSON.stringify({
      relevantProjects: relevantProjects.length,
      relevantIds: relevantIds.length,
      office: office || "all",
      client: client || "all",
      fallbackUsed,
    }));

    // Fetch ACTUAL time entries for phasing patterns
    let allEntries: any[] = await fetchHistoricalEntries(relevantIds);

    // If strict client matching finds projects but no logs, broaden to client family token (e.g. "Sainsbury")
    if (allEntries.length === 0 && client) {
      const tokens = client
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 3 && !["uk", "us", "usa", "fd", "f", "d"].includes(token));
      const anchorToken = tokens[0];

      if (anchorToken) {
        let expandedProjects = projects.filter((project: any) =>
          (project.sf_account || "").toLowerCase().includes(anchorToken) ||
          (project.parent_account || "").toLowerCase().includes(anchorToken) ||
          (project.ultimate_parent || "").toLowerCase().includes(anchorToken) ||
          (project.title || "").toLowerCase().includes(anchorToken)
        );

        if (office && office !== "all") {
          expandedProjects = expandedProjects.filter((project: any) => matchesSelectedOffice(project.office));
        }
        expandedProjects = expandedProjects.filter(isComparableProject);

        if (expandedProjects.length > 0) {
          fallbackUsed = true;
          relevantProjects = expandedProjects;
          relevantIds = expandedProjects.map((project: any) => project.id);
          console.warn("No strict-client historical entries; expanded context using anchor token", {
            anchorToken,
            expandedProjects: expandedProjects.length,
          });
          allEntries = await fetchHistoricalEntries(relevantIds);
        }
      }
    }

    // Final fallback to office-level history if still no client-family logs
    if (allEntries.length === 0 && client) {
      fallbackUsed = true;
      relevantProjects = projects.filter((project: any) => matchesSelectedOffice(project.office)).filter(isComparableProject);
      relevantIds = relevantProjects.map((project: any) => project.id);
      console.warn("No client historical entries found; using office-level fallback", { office: office || "all", projects: relevantProjects.length });
      allEntries = await fetchHistoricalEntries(relevantIds);
    }

    console.log("Historical time entries fetched:", allEntries.length);

    // Map person -> role
    const personRoleMap: Record<string, string> = {};
    const personIds = [...new Set(allEntries.map((e: any) => e.person_id).filter(Boolean))];
    if (personIds.length > 0) {
      for (let i = 0; i < personIds.length; i += 100) {
        const batch = personIds.slice(i, i + 100);
        const { data: ppl } = await sb.from("people").select("id, role_id").in("id", batch);
        if (ppl) for (const p of ppl) personRoleMap[p.id] = p.role_id ? roleMap[p.role_id] || "Unknown" : "Unknown";
      }
    }
    console.log("Historical person-role map count:", Object.keys(personRoleMap).length);

    // Derive client-specific internal cost per role from actual staffed history (weighted by logged hours)
    const clientRoleCost: Record<string, { cost: number; hours: number }> = {};
    for (const entry of allEntries) {
      if (!entry.person_id || !entry.hours) continue;
      const roleName = personRoleMap[entry.person_id];
      const personCost = personCostPerHour[entry.person_id];
      if (!roleName || !personCost) continue;

      if (!clientRoleCost[roleName]) clientRoleCost[roleName] = { cost: 0, hours: 0 };
      clientRoleCost[roleName].cost += personCost * entry.hours;
      clientRoleCost[roleName].hours += entry.hours;
    }

    let clientSpecificCostRoles = 0;
    const minEvidenceHours = 8;
    for (const [roleName, data] of Object.entries(clientRoleCost)) {
      if (data.hours < minEvidenceHours) continue;
      const fx = office === "US" ? usdToOutput : gbpToOutput;
      avgCostPerHour[roleName] = Math.round((data.cost / data.hours) * fx * 100) / 100;
      clientSpecificCostRoles += 1;
    }
    console.log("Client-specific cost overrides:", clientSpecificCostRoles);

    // Build actual monthly phasing patterns per role
    const relevantProjectById: Record<string, any> = Object.fromEntries(
      relevantProjects.map((project: any) => [project.id, project])
    );

    const rolePhasing: Record<string, Record<number, number>> = {};
    const roleTotalActual: Record<string, number> = {};
    const globalPhasing: Record<number, number> = {};
    let globalTotalActual = 0;

    for (const entry of allEntries) {
      if (!entry.person_id || !entry.project_id) continue;

      const project = relevantProjectById[entry.project_id];
      if (!project) continue;

      const hours = Number(entry.hours) || 0;
      if (hours <= 0) continue;

      const roleName = personRoleMap[entry.person_id] || "Unknown";
      const projectStart = new Date(project.start_date);
      const entryDate = new Date(entry.date);
      if (isNaN(projectStart.getTime()) || isNaN(entryDate.getTime())) continue;

      // Normalize each historical project's timeline to the target project's month count.
      // This avoids dropping useful history from long-running/old projects.
      const fallbackEnd = new Date(
        projectStart.getTime() + ((project.duration_weeks || 12) * 7 * 24 * 60 * 60 * 1000)
      );
      const projectEnd = project.end_date ? new Date(project.end_date) : fallbackEnd;
      const endMs = isNaN(projectEnd.getTime()) ? fallbackEnd.getTime() : projectEnd.getTime();
      const totalMs = Math.max(1, endMs - projectStart.getTime());

      const rawProgress = (entryDate.getTime() - projectStart.getTime()) / totalMs;
      const progress = Math.min(0.999, Math.max(0, rawProgress));
      const monthOffset = Math.min(months.length - 1, Math.floor(progress * months.length));

      if (!rolePhasing[roleName]) rolePhasing[roleName] = {};
      rolePhasing[roleName][monthOffset] = (rolePhasing[roleName][monthOffset] || 0) + hours;
      roleTotalActual[roleName] = (roleTotalActual[roleName] || 0) + hours;

      globalPhasing[monthOffset] = (globalPhasing[monthOffset] || 0) + hours;
      globalTotalActual += hours;
    }

    // Convert to percentage distributions, normalized to the target project's month count
    const rolePhasingPct: Record<string, Record<number, number>> = {};
    for (const [roleName, offsets] of Object.entries(rolePhasing)) {
      // Only use offsets that fit within the new project's duration
      let relevantTotal = 0;
      for (const [offset, hrs] of Object.entries(offsets)) {
        if (Number(offset) < months.length) {
          relevantTotal += hrs as number;
        }
      }

      // If less than 30% of hours fall within the window, use ALL offsets but compress them
      const totalHrs = roleTotalActual[roleName] || 1;
      const useCompression = relevantTotal < totalHrs * 0.3;

      rolePhasingPct[roleName] = {};
      if (useCompression) {
        // Compress all historical offsets into the project's month range proportionally
        const maxOffset = Math.max(...Object.keys(offsets).map(Number));
        for (const [offset, hrs] of Object.entries(offsets)) {
          const mappedOffset = Math.min(
            Math.floor(Number(offset) / (maxOffset + 1) * months.length),
            months.length - 1
          );
          rolePhasingPct[roleName][mappedOffset] = (rolePhasingPct[roleName][mappedOffset] || 0) + (hrs as number);
        }

        // Normalize to percentages
        const compressedTotal = Object.values(rolePhasingPct[roleName]).reduce((sum, value) => sum + value, 0) || 1;
        for (const key of Object.keys(rolePhasingPct[roleName])) {
          rolePhasingPct[roleName][Number(key)] = Math.round((rolePhasingPct[roleName][Number(key)] / compressedTotal) * 1000) / 10;
        }
      } else {
        // Use relevant offsets and normalize so they sum to 100%
        for (const [offset, hrs] of Object.entries(offsets)) {
          if (Number(offset) < months.length) {
            rolePhasingPct[roleName][Number(offset)] = Math.round(((hrs as number) / relevantTotal) * 1000) / 10;
          }
        }
      }
    }

    const globalPhasingPct: Record<number, number> = {};
    if (globalTotalActual > 0) {
      for (const [offset, hrs] of Object.entries(globalPhasing)) {
        globalPhasingPct[Number(offset)] = Math.round(((hrs as number) / globalTotalActual) * 1000) / 10;
      }
    }

    console.log("Phasing patterns (normalized to project months):", JSON.stringify(rolePhasingPct));
    console.log("Global phasing fallback pattern:", JSON.stringify(globalPhasingPct));

    // Build project summaries for AI context
    const projectSummaries = relevantProjects.slice(0, 20).map((p: any) => {
      const ps = scopes.filter((s: any) => s.project_id === p.id);
      const totalHours = ps.reduce((s: number, sc: any) => s + (sc.scoped_hours || 0), 0);
      const fee = (p.price || 0) - (p.media_cost || 0) - (p.gross_budget || 0);
      return {
        title: p.title, client: p.sf_account, durationWeeks: p.duration_weeks,
        agencyFee: fee > 0 ? fee : 0, totalScopedHours: totalHours,
        margin: p.gp_margin_pct,
        roles: ps.map((s: any) => ({ role: s.role_id ? roleMap[s.role_id] : "Unknown", hours: s.scoped_hours })),
      };
    });

    // Compute historical average margin for this client
    const marginsWithData = relevantProjects
      .map((p: any) => p.gp_margin_pct)
      .filter((m: any) => m != null && m > 0 && m < 100);
    const historicalAvgMargin = marginsWithData.length > 0
      ? Math.round(marginsWithData.reduce((s: number, m: number) => s + m, 0) / marginsWithData.length)
      : null;
    console.log("Historical avg margin for client:", historicalAvgMargin, "from", marginsWithData.length, "projects");

    const allRoleNames = roles.map((r: any) => r.name);
    const monthOffsetMapping = months.map((m, i) => `${i}="${m}"`).join(", ");
    const currencySymbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
    const sym = currencySymbols[outputCurrency] || "£";

    // Historical margin is logged for reference but NOT used as a target
    console.log("Historical avg margin (reference only):", historicalAvgMargin, "% from", marginsWithData.length, "projects");

    const systemPrompt = `You are a project scoping expert for marketing agency BDB. Create a scope with hours distributed across SPECIFIC CALENDAR MONTHS.
All monetary values should be in ${outputCurrency} (${sym}).

PROJECT MONTHS (use these EXACT strings as keys in monthlyHours): ${JSON.stringify(months)}
Month offset mapping: ${monthOffsetMapping}
Project: ${start.toISOString().split("T")[0]} for ${weeks} weeks (${months.length} months)

AVAILABLE ROLES: ${JSON.stringify(allRoleNames)}

RATE CARD (${sym}/hr per role - already converted to ${outputCurrency}): ${JSON.stringify(rateCardConverted)}
AVERAGE INTERNAL COST PER HOUR (${sym}, by role - already converted to ${outputCurrency}): ${JSON.stringify(avgCostPerHour)}

ACTUAL PHASING PATTERNS BY ROLE (% of hours by month offset from project start, from ${fallbackUsed ? 'all office projects' : 'client/office projects'}):
${JSON.stringify(rolePhasingPct, null, 2)}

HISTORICAL PROJECTS:
${JSON.stringify(projectSummaries, null, 2)}

CRITICAL RULES:
1. Only use roles from AVAILABLE ROLES that appear in the RATE CARD data
2. monthlyHours keys MUST be EXACTLY these strings: ${JSON.stringify(months)} — copy them character-for-character
3. Use the ACTUAL PHASING PATTERNS to distribute hours across months. Map offset 0 to "${months[0]}", offset 1 to "${months[1] || ""}", etc.
4. Every role MUST have a monthlyHours entry for EVERY month in the list, even if 0
5. totalHours for each role MUST equal the sum of all monthlyHours values for that role
6. suggestedRatePerHour MUST come from the RATE CARD data provided. Use exact values from the rate card.
7. If budget specified, size the scope so total agency fee (sum of role hours × rate) fits within budget
8. Distribute hours realistically — NOT evenly. Use the phasing patterns.
9. ONLY use roles that have a rate in the RATE CARD. Do NOT include roles that are missing from the rate card.
10. Do NOT assign near-identical total hours across multiple roles in the same discipline; vary by seniority and historical mix.

EXAMPLE for a 4-month project:
{
  "roleName": "Designer",
  "totalHours": 100,
  "suggestedRatePerHour": 150,
  "monthlyHours": {"${months[0]}": 35, "${months[1] || ""}": 30, "${months[2] || ""}": 25, "${months[3] || ""}": 10}
}`;

    const userPrompt = `Create scope:
- Office: ${office || "UK"}
- Client: ${client || "General"}
- Rate Card: ${rateCardName || "Best match"}
- Currency: ${outputCurrency}
- Start: ${start.toISOString().split("T")[0]}
- Duration: ${weeks} weeks (months: ${months.join(", ")})
- Budget: ${budget ? sym + Number(budget).toLocaleString() : "Not specified"}
${fallbackUsed ? "\nNote: No projects found for this specific client, using general office patterns." : ""}

Remember: monthlyHours keys must be exactly: ${months.join(", ")}
And suggestedRatePerHour must use these rates: ${JSON.stringify(rateCardConverted)}`;

    console.log("Sending to AI with months:", months);
    console.log("Rate card converted:", rateCardConverted);
    console.log("Avg cost per hour:", avgCostPerHour);
    console.log("Output currency:", outputCurrency);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_scope",
            description: "Generate project scope with monthly hours distribution and rates per role",
            parameters: {
              type: "object",
              properties: {
                rationale: { type: "string", description: "Brief explanation of scope sizing and phasing decisions" },
                roles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      roleName: { type: "string", description: "Must match one of AVAILABLE ROLES exactly" },
                      totalHours: { type: "number", description: "Sum of all monthlyHours values" },
                      suggestedRatePerHour: { type: "number", description: `Agency fee rate from RATE CARD data in ${outputCurrency}` },
                      monthlyHours: {
                        type: "object",
                        description: `Object with keys exactly matching: ${JSON.stringify(months)}. Values are hours (numbers).`,
                        additionalProperties: { type: "number" },
                      },
                    },
                    required: ["roleName", "totalHours", "suggestedRatePerHour", "monthlyHours"],
                  },
                },
                totalHours: { type: "number", description: "Sum of all roles' totalHours" },
              },
              required: ["rationale", "roles", "totalHours"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_scope" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error: " + response.status);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured scope data");

    const scopeData = JSON.parse(toolCall.function.arguments);
    
    console.log("Raw AI output roles:", JSON.stringify(scopeData.roles?.map((r: any) => ({
      name: r.roleName, rate: r.suggestedRatePerHour, total: r.totalHours,
      monthKeys: Object.keys(r.monthlyHours || {}),
    }))));

    // ========== POST-PROCESSING: Normalize AI output ==========
    
    const normalizeMonthKey = (key: string): string | null => {
      if (months.includes(key)) return key;
      const lower = key.toLowerCase().trim();
      for (const m of months) {
        if (m.toLowerCase() === lower) return m;
      }
      for (const m of months) {
        const mParts = m.toLowerCase().split(" ");
        const kParts = lower.split(" ");
        if (mParts.length === 2 && kParts.length === 2 && 
            mParts[0].startsWith(kParts[0].slice(0, 3)) && mParts[1] === kParts[1]) {
          return m;
        }
      }
      const indexMatch = key.match(/(\d+)/);
      if (indexMatch) {
        const idx = parseInt(indexMatch[1]);
        if (idx >= 0 && idx < months.length) return months[idx];
        if (idx >= 1 && idx <= months.length) return months[idx - 1];
      }
      return null;
    };

    for (const role of scopeData.roles || []) {
      const rawMH = role.monthlyHours || {};
      const normalized: Record<string, number> = {};
      
      for (const [key, val] of Object.entries(rawMH)) {
        const normKey = normalizeMonthKey(key);
        if (normKey) {
          normalized[normKey] = (normalized[normKey] || 0) + (val as number);
        }
      }
      
      for (const m of months) {
        if (normalized[m] === undefined) normalized[m] = 0;
      }
      
      role.monthlyHours = normalized;
      
      const sum = Object.values(normalized).reduce((s, h) => s + (h as number), 0);
      if (sum > 0) {
        role.totalHours = Math.round(sum * 10) / 10;
      }
      
      // If monthlyHours are all zero but totalHours > 0, distribute using phasing patterns
      if (sum === 0 && role.totalHours > 0) {
        const pattern = rolePhasingPct[role.roleName] || globalPhasingPct;
        if (pattern && Object.keys(pattern).length > 0) {
          let distributed = 0;
          const entries = Object.entries(pattern).sort((a, b) => Number(a[0]) - Number(b[0]));
          for (const [offset, pct] of entries) {
            const idx = Number(offset);
            if (idx >= 0 && idx < months.length) {
              const hrs = Math.round(role.totalHours * (pct as number) / 100 * 10) / 10;
              role.monthlyHours[months[idx]] = hrs;
              distributed += hrs;
            }
          }
          if (distributed < role.totalHours) {
            role.monthlyHours[months[0]] += Math.round((role.totalHours - distributed) * 10) / 10;
          }
        } else {
          const perMonth = Math.round(role.totalHours / months.length * 10) / 10;
          for (const m of months) role.monthlyHours[m] = perMonth;
          const total = perMonth * months.length;
          if (total !== role.totalHours) {
            role.monthlyHours[months[0]] += Math.round((role.totalHours - total) * 10) / 10;
          }
        }
      }
      
      // Ensure rate is set from rate card if AI returned 0
      if (!role.suggestedRatePerHour || role.suggestedRatePerHour === 0) {
        role.suggestedRatePerHour = rateCardConverted[role.roleName] || 0;
      }
    }

    // ========== BUDGET REBALANCING: Use historical role proportions ==========
    const getMonthSharesForRole = (role: any): Record<string, number> => {
      const shares: Record<string, number> = {};
      const raw = role.monthlyHours || {};
      const total = months.reduce((sum, month) => sum + (Number(raw[month]) || 0), 0);

      if (total > 0) {
        for (const month of months) shares[month] = (Number(raw[month]) || 0) / total;
      } else {
        const pattern = rolePhasingPct[role.roleName] || globalPhasingPct;
        if (pattern && Object.keys(pattern).length > 0) {
          for (const month of months) shares[month] = 0;
          for (const [offset, pct] of Object.entries(pattern)) {
            const idx = Number(offset);
            if (idx >= 0 && idx < months.length) shares[months[idx]] += (pct as number) / 100;
          }
        } else {
          const equalShare = 1 / Math.max(months.length, 1);
          for (const month of months) shares[month] = equalShare;
        }
      }

      const norm = Object.values(shares).reduce((sum, value) => sum + value, 0) || 1;
      for (const month of months) shares[month] = (shares[month] || 0) / norm;
      return shares;
    };

    scopeData.roles = (scopeData.roles || [])
      .filter((role: any) => role?.roleName)
      .map((role: any) => {
        role.suggestedRatePerHour = rateCardConverted[role.roleName] || role.suggestedRatePerHour || 0;
        role.totalHours = Number(role.totalHours) || 0;
        return role;
      })
      .filter((role: any) => role.suggestedRatePerHour > 0);

    // Guardrail: if AI returned too few roles, seed from historical data
    const minRoleCount = 6;
    if ((scopeData.roles || []).length < minRoleCount) {
      const existingRoleNames = new Set((scopeData.roles || []).map((role: any) => role.roleName));
      
      // Pick roles that historically appeared on this client, sorted by hours
      const historicalRoleCandidates = Object.entries(roleTotalActual)
        .filter(([roleName]) => !!rateCardConverted[roleName] && !existingRoleNames.has(roleName))
        .sort((a, b) => (b[1] as number) - (a[1] as number));

      for (const [roleName] of historicalRoleCandidates) {
        if ((scopeData.roles || []).length >= minRoleCount) break;
        scopeData.roles.push({
          roleName,
          suggestedRatePerHour: rateCardConverted[roleName],
          totalHours: 10,
          monthlyHours: {},
        });
      }

      console.warn("AI returned too few roles; seeded from historical data", {
        originalCount: existingRoleNames.size,
        seededCount: (scopeData.roles || []).length,
      });
    }

    const monthSharesByRole: Record<string, Record<string, number>> = {};
    for (const role of scopeData.roles || []) {
      monthSharesByRole[role.roleName] = getMonthSharesForRole(role);
    }

    if (budget && budget > 0 && (scopeData.roles || []).length > 0) {
      // ========== COST-BASED BUDGET ALLOCATION ==========
      // 1) Target margin from realised client profitability (comparable projects)
      // 2) Cost budget = scoped agency fee * (1 - target margin)
      // 3) Fill cost budget using historical role proportions
      // 4) Rate-card fee is derived from those hours and shown as comparison

      const relevantIdSet = new Set(relevantProjects.map((project: any) => project.id));
      const projectActualCost: Record<string, number> = {};
      const projectActualHours: Record<string, number> = {};
      const projectScopedHours: Record<string, number> = {};
      const officeCostFx = office === "US" ? usdToOutput : gbpToOutput;

      for (const scope of scopes) {
        if (!scope?.project_id || !relevantIdSet.has(scope.project_id)) continue;
        projectScopedHours[scope.project_id] = (projectScopedHours[scope.project_id] || 0) + (Number(scope.scoped_hours) || 0);
      }

      for (const entry of allEntries) {
        if (!entry.project_id || !entry.person_id || !entry.hours) continue;
        if (!relevantIdSet.has(entry.project_id)) continue;

        const hours = Number(entry.hours) || 0;
        if (hours <= 0) continue;

        const directPersonCost = personCostPerHour[entry.person_id];
        const roleName = personRoleMap[entry.person_id];
        const fallbackRoleCost = roleName ? Number(avgCostPerHour[roleName]) || 0 : 0;

        // Prefer person-specific cost; fallback to blended role cost so margin denominator isn't undercounted
        const entryCost = directPersonCost
          ? hours * directPersonCost * officeCostFx
          : hours * fallbackRoleCost;

        if (entryCost <= 0) continue;
        projectActualHours[entry.project_id] = (projectActualHours[entry.project_id] || 0) + hours;
        projectActualCost[entry.project_id] = (projectActualCost[entry.project_id] || 0) + entryCost;
      }

      // Calculate target margin from realised project financials (revenue vs grossed-up internal cost)
      let histTotalRevenue = 0;
      let histTotalCost = 0;
      let comparableProjectCount = 0;

      for (const project of relevantProjects) {
        const price = Number(project.price) || 0;
        const mediaCost = Number(project.media_cost) || 0;
        const grossBudget = Number(project.gross_budget) || 0;
        const agencyFee = price - mediaCost - grossBudget;
        if (agencyFee <= 0) continue;

        const projectCost = Number(projectActualCost[project.id]) || 0;
        const actualHours = Number(projectActualHours[project.id]) || 0;
        const scopedHours = Number(projectScopedHours[project.id]) || 0;
        if (projectCost <= 0) continue;

        // Gross-up missing time to mirror profitability "Gross Up Missing Time" behavior
        // (no upper cap): adjustedCost = actualCost / completeness
        let adjustedProjectCost = projectCost;
        if (scopedHours > 0 && actualHours > 0) {
          const completeness = actualHours / scopedHours;
          if (completeness > 0) adjustedProjectCost = projectCost / completeness;
        }

        const projectCurrency = (project.fee_calc_currency || "GBP").toUpperCase();
        const projectFx = fxRates[`${projectCurrency}_${outputCurrency}`]
          || (projectCurrency === "GBP" ? gbpToOutput : projectCurrency === "USD" ? usdToOutput : 1);

        histTotalRevenue += agencyFee * projectFx;
        histTotalCost += adjustedProjectCost;
        comparableProjectCount += 1;
      }

      let targetMarginPct = 40;
      if (histTotalRevenue > 0 && histTotalCost > 0) {
        targetMarginPct = ((histTotalRevenue - histTotalCost) / histTotalRevenue) * 100;
      }

      // Keep margin in a practical band to avoid pathological outliers
      targetMarginPct = Math.max(10, Math.min(70, targetMarginPct));
      const targetMarginFraction = targetMarginPct / 100;

      // Derive internal cost budget from scoped agency fee
      const scopedAgencyFee = Number(budget);
      const costBudget = scopedAgencyFee * (1 - targetMarginFraction);

      console.log("Target margin calculation (realised/comparable):", JSON.stringify({
        comparableProjectCount,
        histTotalRevenue: Math.round(histTotalRevenue),
        histTotalCost: Math.round(histTotalCost),
        realisedMarginPct: Math.round(targetMarginPct * 10) / 10,
        scopedAgencyFee: Math.round(scopedAgencyFee),
        costBudget: Math.round(costBudget),
      }));

      // Keep only historically observed, relevant roles (avoid noise roles)
      const minHistHoursForRole = 8;
      const historicalRoles = (scopeData.roles || []).filter((role: any) => {
        const roleName = role.roleName;
        const histHours = Number(roleTotalActual[roleName]) || 0;
        return !!rateCardConverted[roleName] && histHours >= minHistHoursForRole;
      });

      const fallbackHistoricalRoles = (scopeData.roles || []).filter((role: any) => {
        const roleName = role.roleName;
        const histHours = Number(roleTotalActual[roleName]) || 0;
        return !!rateCardConverted[roleName] && histHours > 0;
      });

      scopeData.roles = historicalRoles.length > 0 ? historicalRoles : fallbackHistoricalRoles;

      // Calculate historical proportion for each role on card
      const histRolesOnCard = (scopeData.roles || [])
        .map((role: any) => [role.roleName, Number(roleTotalActual[role.roleName]) || 0] as const)
        .filter(([, histHours]) => histHours > 0);
      const histTotalOnCard = histRolesOnCard.reduce((sum, [, histHours]) => sum + histHours, 0) || 0;

      const weights: Record<string, number> = {};
      for (const role of scopeData.roles || []) {
        const roleName = role.roleName;
        const histHours = Number(roleTotalActual[roleName]) || 0;
        weights[roleName] = histTotalOnCard > 0
          ? histHours / histTotalOnCard
          : 1 / Math.max((scopeData.roles || []).length, 1);
      }

      // Distribute COST BUDGET across roles by historical weights, then convert to hours via internal cost/hr
      const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0) || 1;

      for (const role of scopeData.roles || []) {
        const roleName = role.roleName;
        const costPerHour = Number(avgCostPerHour[roleName]) || (Number(role.suggestedRatePerHour) * 0.55);
        const share = (weights[roleName] || 0) / totalWeight;
        const targetCostForRole = costBudget * share;
        const targetHours = costPerHour > 0 ? Math.max(0, targetCostForRole / costPerHour) : 0;
        const shares = monthSharesByRole[roleName] || {};

        let assigned = 0;
        role.monthlyHours = {};
        for (let i = 0; i < months.length; i += 1) {
          const month = months[i];
          if (i === months.length - 1) {
            role.monthlyHours[month] = Math.max(0, Math.round((targetHours - assigned) * 10) / 10);
          } else {
            const remaining = Math.max(0, targetHours - assigned);
            const rawHours = Math.round(targetHours * (shares[month] || 0) * 10) / 10;
            const hours = Math.max(0, Math.min(remaining, rawHours));
            role.monthlyHours[month] = hours;
            assigned += hours;
          }
        }

        role.totalHours = Math.round(
          Object.values(role.monthlyHours).reduce((sum: number, value: any) => sum + (Number(value) || 0), 0) * 10
        ) / 10;
      }

      // Remove zero/negligible roles after allocation
      scopeData.roles = (scopeData.roles || []).filter((role: any) => (Number(role.totalHours) || 0) >= 0.5);

      // Calculate comparative rate-card fee from generated hours
      let rateCardFeeTotal = 0;
      let costTotal = 0;
      for (const role of scopeData.roles || []) {
        const rate = Number(role.suggestedRatePerHour) || 0;
        const hours = Number(role.totalHours) || 0;
        const cost = Number(avgCostPerHour[role.roleName]) || (rate * 0.55);
        rateCardFeeTotal += hours * rate;
        costTotal += hours * cost;
      }

      const rateCardBoosterPct = rateCardFeeTotal > 0
        ? Math.round(((scopedAgencyFee / rateCardFeeTotal) - 1) * 1000) / 10
        : 0;
      const resultingMargin = scopedAgencyFee > 0
        ? Math.round(((scopedAgencyFee - costTotal) / scopedAgencyFee) * 1000) / 10
        : 0;

      // Attach metadata for UI
      scopeData.scopedAgencyFee = Math.round(scopedAgencyFee);
      scopeData.targetMarginPct = Math.round(targetMarginPct * 10) / 10;
      scopeData.rateCardFee = Math.round(rateCardFeeTotal);
      scopeData.rateCardBoosterPct = rateCardBoosterPct;

      console.log("Cost-based budget allocation:", JSON.stringify({
        targetMarginPct: Math.round(targetMarginPct * 10) / 10,
        resultingMarginPct: resultingMargin,
        scopedAgencyFee: Math.round(scopedAgencyFee),
        rateCardFee: Math.round(rateCardFeeTotal),
        rateCardBoosterPct,
        costBudget: Math.round(costBudget),
        actualCost: Math.round(costTotal),
        rolesCount: (scopeData.roles || []).length,
        topRoles: (scopeData.roles || [])
          .sort((a: any, b: any) => b.totalHours - a.totalHours)
          .slice(0, 5)
          .map((r: any) => ({ name: r.roleName, hours: r.totalHours, histPct: Math.round((weights[r.roleName] || 0) * 100) })),
      }));
    }

    // ========== SENIORITY-BASED ROLE CONSOLIDATION ==========
    // Merge roles below 15% monthly capacity into adjacent seniority roles
    // to avoid spreading people too thin across projects.

    // Seniority prefixes ordered from junior to senior
    const seniorityPrefixes: [RegExp, number][] = [
      [/^junior\b/i, 1],
      [/^intern\b/i, 1],
      [/^associate\b/i, 2],
      [/\bexecutive$/i, 3],       // "Account Executive", "Paid Media Executive"
      [/\bexecutive\b/i, 3],
      [/^midweight\b/i, 4],
      [/\bmanager$/i, 5],         // "Account Manager", "Paid Media Manager"
      [/\bmanager\b/i, 5],
      [/^senior\b/i, 6],
      [/\bdirector$/i, 7],        // "Account Director", "Creative Director"
      [/\bdirector\b/i, 7],
      [/^group\b/i, 8],
      [/^global\b/i, 8],
      [/^head of\b/i, 9],
      [/^svp\b/i, 9],
      [/^vp\b/i, 8],
      [/^client partner\b/i, 8],
      [/^business director\b/i, 7],
    ];

    // Extract the discipline (e.g. "Account", "Creative", "Paid Media") and seniority level
    const parseRole = (roleName: string): { discipline: string; level: number } => {
      let level = 4; // default mid-level
      let cleanName = roleName;

      for (const [pattern, lvl] of seniorityPrefixes) {
        if (pattern.test(roleName)) {
          level = lvl;
          // For compound patterns like "Senior Account Manager", take the highest-matching prefix
          // but also check if "Senior" + "Manager" → use the "Senior" level (6)
          break;
        }
      }

      // Refine: "Senior Account Manager" → Senior (6), "Senior Account Director" → higher
      const lowerName = roleName.toLowerCase();
      if (lowerName.startsWith("senior") && lowerName.includes("director")) level = 7.5;
      if (lowerName.startsWith("group")) level = 8;
      if (lowerName.startsWith("global") && lowerName.includes("director")) level = 8.5;
      if (lowerName.startsWith("head of")) level = 9;

      // Extract discipline by removing seniority words
      cleanName = roleName
        .replace(/^(junior|intern|associate|senior|group|global|head of|svp|vp)\s+/i, "")
        .replace(/\s+(executive|manager|director|lead|partner)$/i, "")
        .replace(/^(junior|senior|associate|midweight|global|group)\s+/i, "")
        .trim();

      // Normalize common discipline names
      const disciplineMap: Record<string, string> = {
        "account": "Account",
        "account management": "Account",
        "creative": "Creative",
        "design": "Creative",
        "designer": "Creative",
        "graphic designer": "Creative",
        "copywriter": "Creative",
        "strategist": "Strategy",
        "strategy": "Strategy",
        "content strategist": "Strategy",
        "content strategy": "Strategy",
        "social strategist": "Strategy",
        "paid media": "Paid Media",
        "analytics": "Data",
        "analytics & insights": "Data",
        "insights": "Data",
        "data analyst": "Data",
        "data": "Data",
        "project": "Project Management",
        "project manager": "Project Management",
        "producer": "Production",
        "production": "Production",
        "business affairs": "Business Affairs",
        "business and commercial affairs": "Business Affairs",
        "talent engagement": "Business Affairs",
      };

      const lowerClean = cleanName.toLowerCase();
      for (const [key, value] of Object.entries(disciplineMap)) {
        if (lowerClean.includes(key) || lowerClean === key) {
          return { discipline: value, level };
        }
      }

      return { discipline: cleanName, level };
    };

    // Group scope roles by discipline
    const capacityThreshold = 0.15; // 15% of monthly capacity
    const avgWorkingDaysPerMonth = 22;

    const rolesByDiscipline: Record<string, { roleName: string; level: number; roleIndex: number }[]> = {};
    for (let i = 0; i < (scopeData.roles || []).length; i++) {
      const role = scopeData.roles[i];
      const parsed = parseRole(role.roleName);
      if (!rolesByDiscipline[parsed.discipline]) rolesByDiscipline[parsed.discipline] = [];
      rolesByDiscipline[parsed.discipline].push({
        roleName: role.roleName,
        level: parsed.level,
        roleIndex: i,
      });
    }

    // Sort each discipline by seniority level
    for (const members of Object.values(rolesByDiscipline)) {
      members.sort((a, b) => a.level - b.level);
    }

    // For each discipline, check each role's monthly capacity utilisation
    const rolesToRemove = new Set<number>();
    
    for (const [discipline, members] of Object.entries(rolesByDiscipline)) {
      if (members.length < 2) continue; // need at least 2 roles to merge

      for (let mi = 0; mi < members.length; mi++) {
        const member = members[mi];
        if (rolesToRemove.has(member.roleIndex)) continue;

        const role = scopeData.roles[member.roleIndex];
        const cap = roleCapacity[role.roleName] || 7.5;
        const monthlyCapacity = avgWorkingDaysPerMonth * cap;
        const threshold = monthlyCapacity * capacityThreshold;

        // Check if ALL months are below threshold
        const allMonthsBelowThreshold = months.every((m) => {
          const hrs = Number(role.monthlyHours?.[m]) || 0;
          return hrs < threshold;
        });

        if (!allMonthsBelowThreshold) continue;

        // Find the best adjacent role to merge into (prefer the one with more total hours)
        let bestTarget: number | null = null;
        let bestTargetHours = -1;

        // Check immediate neighbours in seniority order
        const neighbours = [mi - 1, mi + 1].filter((n) => n >= 0 && n < members.length);
        for (const ni of neighbours) {
          if (rolesToRemove.has(members[ni].roleIndex)) continue;
          const targetRole = scopeData.roles[members[ni].roleIndex];
          if (targetRole.totalHours > bestTargetHours) {
            bestTargetHours = targetRole.totalHours;
            bestTarget = members[ni].roleIndex;
          }
        }

        if (bestTarget === null) continue;

        // Merge: add this role's hours to the target role
        const targetRole = scopeData.roles[bestTarget];
        for (const m of months) {
          const hrs = Number(role.monthlyHours?.[m]) || 0;
          targetRole.monthlyHours[m] = Math.round(((Number(targetRole.monthlyHours?.[m]) || 0) + hrs) * 10) / 10;
        }
        targetRole.totalHours = Math.round(
          Object.values(targetRole.monthlyHours).reduce((sum: number, h: any) => sum + (Number(h) || 0), 0) * 10
        ) / 10;

        rolesToRemove.add(member.roleIndex);
        console.log(`Consolidated "${role.roleName}" (${Math.round(role.totalHours)}hrs) into "${targetRole.roleName}" in ${discipline}`);
      }
    }

    // Remove consolidated roles
    if (rolesToRemove.size > 0) {
      scopeData.roles = (scopeData.roles || []).filter((_: any, i: number) => !rolesToRemove.has(i));
      console.log(`Role consolidation: removed ${rolesToRemove.size} thin roles, ${scopeData.roles.length} roles remain`);
    }

    // Recalculate totalHours
    scopeData.totalHours = (scopeData.roles || []).reduce((s: number, r: any) => s + (r.totalHours || 0), 0);

    // Recalculate comparative fee metadata from FINAL (post-consolidation) role mix
    const finalRateCardFee = (scopeData.roles || []).reduce((sum: number, role: any) => {
      return sum + ((Number(role.totalHours) || 0) * (Number(role.suggestedRatePerHour) || 0));
    }, 0);

    if (budget && Number(budget) > 0) {
      const scopedAgencyFee = Math.round(Number(budget));
      scopeData.scopedAgencyFee = scopedAgencyFee;
      scopeData.rateCardFee = Math.round(finalRateCardFee);
      scopeData.rateCardBoosterPct = finalRateCardFee > 0
        ? Math.round(((scopedAgencyFee / finalRateCardFee) - 1) * 1000) / 10
        : 0;
    }

    // Attach metadata
    scopeData.months = months;
    scopeData.startDate = start.toISOString().split("T")[0];
    scopeData.durationWeeks = weeks;
    scopeData.internalCostPerHour = avgCostPerHour;
    scopeData.billableCapacity = roleCapacity;
    scopeData.rateCardByRole = rateCardConverted;
    scopeData.currency = outputCurrency;
    scopeData.fxRate = gbpToOutput;

    console.log("Final scope:", JSON.stringify({
      currency: outputCurrency, fxRate: gbpToOutput,
      roles: scopeData.roles?.map((r: any) => ({
        name: r.roleName, rate: r.suggestedRatePerHour, total: r.totalHours,
      })),
    }));

    return new Response(JSON.stringify({ success: true, scope: scopeData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-scope error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
