import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { scopedRoles, client, office, durationMonths, agencyFee } = await req.json();

    if (!agencyFee || agencyFee <= 0) {
      return new Response(JSON.stringify({ recommendations: [], message: "Agency fee is required to generate recommendations." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find projects for this client in last 12 months
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const officeValues = office === "UK" ? ["uk", "united kingdom"] : ["us", "united states"];

    const { data: projects, error: projErr } = await supabase
      .from("projects")
      .select("id, title, ultimate_parent, parent_account, sf_account, office, start_date, end_date, stage, duration_weeks, price, media_cost, gross_budget")
      .or(`ultimate_parent.ilike.%${client}%,parent_account.ilike.%${client}%,sf_account.ilike.%${client}%`)
      .gte("end_date", cutoffStr);

    if (projErr) throw projErr;

    // Filter by office, exclude closed lost, and require calculable agency fee
    const matchedProjects = (projects || []).filter(p => {
      const stage = (p.stage || "").toLowerCase();
      if (stage === "closed lost") return false;
      const po = (p.office || "").toLowerCase();
      if (!officeValues.some(ov => po.includes(ov))) return false;
      // Agency Fee = Price - Media Cost - Gross Budget (blanks treated as 0)
      const fee = (p.price || 0) - (p.media_cost || 0) - (p.gross_budget || 0);
      return fee > 0; // only include projects with a positive agency fee
    });

    if (matchedProjects.length === 0) {
      return new Response(JSON.stringify({ recommendations: [], message: "No historical projects with agency fee data found for this client in the last 12 months." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectIds = matchedProjects.map(p => p.id);

    // Calculate agency fee per project
    const projectFees: Record<string, number> = {};
    let totalHistoricalFee = 0;
    for (const p of matchedProjects) {
      const fee = (p.price || 0) - (p.media_cost || 0) - (p.gross_budget || 0);
      projectFees[p.id] = fee;
      totalHistoricalFee += fee;
    }

    // Get aggregated hours by role using RPC (avoids 1000-row client limit)
    const { data: roleHoursData, error: timeErr } = await supabase
      .rpc("get_role_hours_for_projects", {
        _project_ids: projectIds,
        _cutoff_date: cutoffStr,
      });

    if (timeErr) throw timeErr;

    const historicalByRole: Record<string, number> = {};
    let totalHistoricalHours = 0;
    for (const row of (roleHoursData || [])) {
      historicalByRole[row.role_name] = Number(row.total_hours);
      totalHistoricalHours += Number(row.total_hours);
    }

    // Calculate hours per £1k of agency fee for each role
    const feeIn1k = totalHistoricalFee / 1000;
    const historicalSummary = Object.entries(historicalByRole)
      .sort((a, b) => b[1] - a[1])
      .map(([role, hours]) => ({
        role,
        totalHours: Math.round(hours),
        hoursPer1kFee: Math.round((hours / feeIn1k) * 10) / 10,
        pctOfTotal: Math.round((hours / totalHistoricalHours) * 100),
      }));

    // Scale to proposed agency fee
    const proposedFeeIn1k = agencyFee / 1000;
    const expectedByRole = historicalSummary.map(r => ({
      ...r,
      expectedHours: Math.round(r.hoursPer1kFee * proposedFeeIn1k * 10) / 10,
    }));

    const scopedSummary = (scopedRoles as { role: string; hours: number }[])
      .filter(r => r.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    const totalScopedHours = scopedSummary.reduce((s, r) => s + r.hours, 0);

    const feeLabel = office === "US" ? "$" : "£";

    // Pre-compute comparison data so the AI doesn't need to figure out direction
    const scopedByRole: Record<string, number> = {};
    for (const r of scopedSummary) scopedByRole[r.role] = r.hours;

    const comparisonLines: string[] = [];
    const MIN_EXPECTED_HOURS = 8; // Filter noise roles with tiny historical signal

    for (const r of expectedByRole) {
      const scoped = scopedByRole[r.role];
      const expected = Math.round(r.expectedHours);
      if (scoped !== undefined) {
        const scopedR = Math.round(scoped);
        const diff = scopedR - expected;
        const pctDiff = expected > 0 ? Math.round(Math.abs(diff) / expected * 100) : 100;
        let preClassification = "";
        if (pctDiff <= 20) {
          preClassification = "ALIGNED (no action needed)";
        } else if (scopedR > expected) {
          preClassification = "OVER-SCOPED → type must be \"reduce\", suggestedHours ~" + expected;
        } else {
          preClassification = "UNDER-SCOPED → type must be \"increase\", suggestedHours ~" + expected;
        }
        comparisonLines.push(`- ${r.role}: expected ~${expected}h, scoped ${scopedR}h, diff ${diff > 0 ? "+" : ""}${diff}h (${pctDiff}%) → ${preClassification}`);
      } else if (expected >= MIN_EXPECTED_HOURS) {
        // Only suggest adding roles with meaningful historical usage
        comparisonLines.push(`- ${r.role}: expected ~${expected}h, NOT in scope → type must be "add", suggestedHours ~${expected}`);
      }
    }

    // Roles scoped but not in historical data
    for (const r of scopedSummary) {
      if (!expectedByRole.find(e => e.role === r.role)) {
        comparisonLines.push(`- ${r.role}: scoped ${Math.round(r.hours)}h, NO historical usage → consider "remove"`);
      }
    }

    const prompt = `You are an agency resource planning expert. Below is a pre-computed comparison of proposed scope vs historical expected hours for the same client, normalised by agency fee.

## Pre-Computed Comparison (${matchedProjects.length} projects, historical fee ${feeLabel}${totalHistoricalFee.toLocaleString()}, proposed fee ${feeLabel}${agencyFee.toLocaleString()}):
${comparisonLines.join("\n")}

## Your Task
Generate exactly ONE recommendation per role listed above (unless marked ALIGNED). Do NOT invent roles or duplicate any role. Each role should appear at most once across all recommendations.

Return a JSON array. Each recommendation:
{
  "type": "remove" | "reduce" | "increase" | "merge" | "add",
  "roles": ["Role Name"],
  "currentHours": number | null (the scoped hours),
  "suggestedHours": number | null (the expected hours),
  "reason": "Brief, plain-English explanation",
  "confidence": "high" | "medium" | "low"
}

Rules:
- ONLY recommend roles that appear in the comparison list above. Do NOT add roles that are not listed.
- Each role must appear in AT MOST ONE recommendation. No duplicates.
- USE THE EXACT TYPE from the comparison above. If it says "OVER-SCOPED → type must be reduce", use "reduce". If it says "UNDER-SCOPED → type must be increase", use "increase". If it says "type must be add", use "add".
- Prioritise reduce/increase recommendations over add recommendations
- For merge: combine multiple small-allocation roles if sensible (counts as one entry per role)
- Keep "reason" concise. Do NOT mention "per £1k", rates, or methodology — just plain language (e.g. "Historical projects of this size typically need ~80h of this role, but 40h are scoped")
- Round ALL hours to whole numbers. No decimals.
- Maximum 8 recommendations, highest impact first`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a resource planning analyst. Return ONLY valid JSON array, no markdown." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "scope_recommendations",
            description: "Return scope optimization recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["remove", "reduce", "increase", "merge", "add"] },
                      roles: { type: "array", items: { type: "string" } },
                      currentHours: { type: "number" },
                      suggestedHours: { type: "number" },
                      reason: { type: "string" },
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                    },
                    required: ["type", "roles", "reason", "confidence"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "scope_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let recommendations = [];
    if (toolCall) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        recommendations = parsed.recommendations || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify({
      recommendations,
      historicalSummary: expectedByRole,
      projectCount: matchedProjects.length,
      totalHistoricalHours: Math.round(totalHistoricalHours),
      totalHistoricalFee: Math.round(totalHistoricalFee),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scope-recommendations error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
