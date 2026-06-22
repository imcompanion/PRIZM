import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics, teamContext, projectEndDate } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a project financial analyst providing status updates to project managers.

IMPORTANT TONE GUIDANCE:
- Under-burning hours is POSITIVE — it means the team is being efficient and delivering under budget. Frame it positively.
- Strong margins are always good news.
- Only flag concern if the project is OVER-burning (actual > budget) or margins are thin/negative.

EMPLOYMENT DATE AWARENESS:
- Some team members may have employment start/end dates that don't cover the full project timeline.
- Their expected hours and completeness percentages are ALREADY adjusted to only count working days during their employment period.
- If someone joined partway through the project, their completeness is relative to when they started — do NOT treat them as delinquent for weeks before they joined.
- If someone left partway through the project, their completeness is relative to when they left — do NOT treat them as delinquent for weeks after they departed.
- Only flag someone for low timesheets if their completeness (already adjusted for employment dates) is genuinely low.

Your job:
1. Write a "summary" — exactly ONE sentence of max 15 words summarising overall project financial/hours status. Be positive about under-burning and strong margins.
   Wrap the summary in a RAG tag: [GREEN]...[/GREEN] for good news, [AMBER]...[/AMBER] for mixed, [RED]...[/RED] for bad news.

2. Write "warnings" — a follow-on sentence or two highlighting anything that might distort our view of project progress. This MUST:
   - Do NOT mention timesheet completeness or stale timesheets — those are handled separately by the system.
   - Only mention missing phase dates or other non-timesheet data quality issues.
   - If there are no non-timesheet warnings, return an empty string.
   - Wrap each warning sentence in the appropriate RAG tag: [RED]...[/RED] for severe issues, [AMBER]...[/AMBER] for moderate issues.

3. Return actions array:
   - If any team members were flagged for timesheets, return ONE action with linkType "timesheet" and ALL flagged person names in personNames.
   - If phase dates are missing, return ONE action with linkType "phases".
   - NEVER create separate actions per person.

Call the suggest_actions tool with your response.`;

    let teamInfo = "";
    if (teamContext?.people && teamContext.people.length > 0) {
      teamInfo = "\n\nTeam members on this project:\n";
      for (const p of teamContext.people) {
        const completePct = p.completeness !== undefined ? ` | Timesheet completeness: ${p.completeness}%` : "";
        const empInfo = [];
        if (p.employmentStart) empInfo.push(`started: ${p.employmentStart}`);
        if (p.employmentEnd) empInfo.push(`ended: ${p.employmentEnd}`);
        const empStr = empInfo.length > 0 ? ` | Employment: ${empInfo.join(", ")}` : "";
        teamInfo += `- ${p.name} (${p.role}): Logged ${p.loggedHours}h of ${p.expectedHours || "?"}h expected${completePct}, last entry: ${p.lastEntry || "never"}${empStr}\n`;
      }
    }
    // Note: Do NOT include timesheet completeness info in team listing for AI
    // since we handle timesheet warnings programmatically below to avoid duplication.

    if (teamContext?.phases && teamContext.phases.length > 0) {
      teamInfo += "\nPhases:\n";
      for (const ph of teamContext.phases) {
        teamInfo += `- ${ph.name}: ${ph.startDate || "no start date"} to ${ph.endDate || "no end date"} (${ph.status})\n`;
      }
    }

    // Only consider people who have actually logged hours on THIS project
    const peopleOnProject = (teamContext?.people || []).filter((p: any) => p.loggedHours > 0);

    const flaggedTimesheetPeople = peopleOnProject
      .filter((p: any) => typeof p.completeness === "number" && p.completeness < 80)
      .map((p: any) => p.name)
      .filter(Boolean);

    const severeTimesheetPeople = peopleOnProject
      .filter((p: any) => typeof p.completeness === "number" && p.completeness < 50)
      .map((p: any) => p.name)
      .filter(Boolean);

    const today = new Date();
    const projEnd = projectEndDate ? new Date(projectEndDate) : null;
    const projectHasEnded = projEnd && projEnd < today;

    // Staleness is only relevant for active projects — for completed projects, only completeness matters
    let staleTimesheetPeople: string[] = [];
    if (!projectHasEnded) {
      const dayOfWeek = today.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisWeekMonday = new Date(today);
      thisWeekMonday.setDate(today.getDate() - daysSinceMonday);
      const prevWeekMonday = new Date(thisWeekMonday);
      prevWeekMonday.setDate(thisWeekMonday.getDate() - 7);

      staleTimesheetPeople = peopleOnProject
        .filter((p: any) => {
          const empEnd = p.employmentEnd ? new Date(p.employmentEnd) : null;
          if (empEnd && empEnd < prevWeekMonday) return false;
          if (!p.lastEntry) return true;
          return new Date(p.lastEntry) < prevWeekMonday;
        })
        .map((p: any) => p.name)
        .filter(Boolean);
    }

    // Combine all flagged people (low completeness OR stale for active projects)
    const allFlaggedPeople = [...new Set([...flaggedTimesheetPeople, ...staleTimesheetPeople])];

    
    const userPrompt = `Project: ${metrics.title}
Timeline: ${metrics.timelineElapsedPct}% elapsed (${metrics.daysRemaining} days remaining)${projectHasEnded ? `\nNOTE: This project ended on ${projectEndDate}. All assessments should be relative to the project end date, not today.` : ""}
Budget Hours (so far): ${metrics.budgetHoursSoFar}h | Actual Hours: ${metrics.actualHours}h
Budget Profit (so far): ${metrics.budgetProfitSoFar} | Actual Profit: ${metrics.actualProfit}
Budget Margin (so far): ${metrics.budgetMarginSoFar}% | Actual Margin: ${metrics.actualMargin}%
Total Scoped Hours: ${metrics.totalScopedHours}h | Agency Fee: ${metrics.agencyFee}${teamInfo}

Please call the suggest_actions tool with your summary, warnings, and actions.`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "suggest_actions",
          description: "Return a headline summary, warnings about data quality issues, and action buttons.",
          parameters: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "One sentence, max 15 words. Headline on project financial/hours status.",
              },
              warnings: {
                type: "string",
                description: "1-2 sentences naming people with low timesheet completeness and missing phase dates, explaining impact. Empty string if none.",
              },
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      description: "Short suggestion text, e.g. 'Review timesheets for Anjali Naran and James Silverstone — hours look low'",
                    },
                    linkType: {
                      type: "string",
                      enum: ["timesheet", "phases"],
                      description: "'timesheet' for timesheet issues, 'phases' for phase date issues.",
                    },
                    personNames: {
                      type: "array",
                      items: { type: "string" },
                      description: "Names of people flagged (for timesheet suggestions only).",
                    },
                  },
                  required: ["text", "linkType"],
                },
              },
            },
            required: ["summary", "warnings", "suggestions"],
          },
        },
      },
    ];

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
        tools,
        tool_choice: "auto",
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      for (const tc of toolCalls) {
        if (tc.function?.name === "suggest_actions") {
          try {
            const parsed = JSON.parse(tc.function.arguments);

            let warnings = parsed.warnings || "";
            let suggestions = parsed.suggestions || [];

            // Build timesheet warnings programmatically (not from AI) to avoid duplication
            if (allFlaggedPeople.length > 0) {
              const parts: string[] = [];
              
              // Low completeness people
              if (flaggedTimesheetPeople.length > 0) {
                const details = flaggedTimesheetPeople.map((name: string) => {
                  const person = peopleOnProject.find((p: any) => p.name === name);
                  const pct = person?.completeness ?? "?";
                  return `${name} (${pct}%)`;
                });
                const severityTag = severeTimesheetPeople.length > 0 ? "RED" : "AMBER";
                parts.push(`[${severityTag}]Timesheet completeness is low for ${details.join(", ")}.[/${severityTag}]`);
              }
              
              // Stale-only people (not already flagged for low completeness)
              const staleOnly = staleTimesheetPeople.filter((n: string) => !flaggedTimesheetPeople.includes(n));
              if (staleOnly.length > 0) {
                parts.push(`[AMBER]${staleOnly.join(", ")} ha${staleOnly.length === 1 ? "s" : "ve"} stale timesheets (last entry >2 weeks ago).[/AMBER]`);
              }

              const timesheetWarning = parts.join(" ");
              warnings = warnings ? `${warnings} ${timesheetWarning}` : timesheetWarning;

              const hasTimesheetSuggestion = suggestions.some((s: any) => s.linkType === "timesheet");
              if (!hasTimesheetSuggestion) {
                suggestions.push({
                  text: `Review timesheets for ${allFlaggedPeople.join(", ")}.`,
                  linkType: "timesheet",
                  personNames: allFlaggedPeople,
                });
              } else {
                suggestions = suggestions.map((s: any) =>
                  s.linkType === "timesheet"
                    ? { ...s, personNames: allFlaggedPeople }
                    : s
                );
              }
            }

            return new Response(JSON.stringify({
              summary: parsed.summary,
              warnings,
              suggestions,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch (e) {
            console.error("Failed to parse tool call arguments:", e);
          }
        }
      }
    }

    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ 
      summary: content || "Unable to generate summary.",
      suggestions: [] 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("project-ai-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
