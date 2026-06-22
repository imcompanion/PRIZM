import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, pageContext, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a sharp financial analyst embedded in a project management tool called "BDB Time Machine". Users will ask you analytical questions about their profitability, utilisation, and project data.

You have access to the current page's data context which will be provided as JSON. The context name tells you which page/tab the user is on. Use it to answer questions accurately, citing specific projects, clients, teams, and numbers.

PROFITABILITY CONTEXT (page: "Profitability"):
- "monthlyTrend" shows aggregate month-by-month revenue, cost, profit, and margin for the current filters.
- "projectMonthlyBreakdown" shows EACH project's revenue and cost broken down by month, plus startDate/endDate. USE THIS to identify exactly which projects drove changes in any given month.
- "clients" contains per-project totals with "office" (UK/US) and "status" (Live/Ended/Not Started).
- To answer "why did profit/margin change in month X": compare each project's revenue and cost in month X vs adjacent months using projectMonthlyBreakdown. Identify projects winding down (less revenue) or with disproportionate costs. NEVER list all-time worst-margin projects — only analyse the SPECIFIC month asked about.

TIME & UTILISATION – SUMMARY CONTEXT (page: "Time & Utilisation – Summary"):
- "overallMetrics" has headcount, expectedHours, actualHours, billableHours, leaveHours, completeness%, utilisation%, benchmarkUtilisation%.
- "teamBreakdown" shows per-team metrics (headcount, hours, completeness, utilisation, benchmark).
- "people" lists individuals sorted by completeness (worst first) with name, team, role, completeness%, utilisation%, actualHours, expectedHours.
- Use this to answer questions about who is underperforming, which teams have low completeness/utilisation, and how teams compare.

TIME & UTILISATION – ANALYSIS CONTEXT (page: "Time & Utilisation – Analysis"):
- "overallMetrics" has totalLoggedHours, totalNonBillableHours, nonBillablePct.
- "nonBillableByTeam" shows per-team non-billable breakdowns with top categories (project names or rule labels like "RFP / RFI", "Lost Client Work").
- "overallNonBillableBreakdown" lists the biggest non-billable categories across all teams.
- Use this to answer questions about where non-billable time is going, which teams have the most non-billable work, and what's driving it.

PROJECT DETAIL CONTEXT (page: "Project Detail"):
- "project" has title, client, dates, office, agencyFee, currency.
- "budget" has scopedHours, budgetedInternalCost, budgetedFee (rate card × hours), budgetedProfit, budgetedMargin.
- "soFar" has expectedHours, expectedCost, proportionedFee, expectedProfit, expectedMargin — what the budget predicts for the elapsed timeline.
- "actuals" has totalHours, totalCost, profit, margin — real performance to date.
- "scopeByRole" breaks down each role's scoped hours, actual hours, scoped cost, actual cost, and the people assigned with their individual hourly rates and hours logged.
- Use scopeByRole to explain WHY actual cost differs from budget: compare the average internal cost per hour per role vs what was budgeted. If actual cost is high despite under-burning hours, it means more expensive/senior people worked on it than planned. Name the specific roles and people driving the variance.
- "completeness" has percentage and details per person showing their total hours logged across all projects in the project date range vs expected.

RESPONSE FORMAT — STRICT RULES:
- Be EXTREMELY concise. Aim for 3-6 short paragraphs MAX. Never write walls of text.
- Lead with the headline answer in 1-2 sentences, then support with key evidence.
- When listing projects or items, show only the TOP 3-5 most impactful. Do NOT exhaustively list every project.
- Use markdown tables for comparisons (keep to 5 rows max). Do NOT use bullet-point lists of project details — tables are always better.
- Round numbers sensibly ($224k not $224,235). Use k/m suffixes.
- Currency values should include the currency symbol.
- Never repeat or echo the raw data back. Synthesise and interpret.
- If the data doesn't contain enough info, say so in one sentence and suggest which page/tab might help.
- Think like an executive briefing: what changed, why, what matters most.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if present
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add the current question with context
    const userContent = pageContext 
      ? `Here is the current page data context:\n\`\`\`json\n${JSON.stringify(pageContext, null, 2)}\n\`\`\`\n\nQuestion: ${question}`
      : question;

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-analytics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
