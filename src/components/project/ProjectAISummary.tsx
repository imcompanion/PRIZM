import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, RefreshCw, ClipboardList, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimesheetReviewDialog } from "./TimesheetReviewDialog";

interface ProjectMetrics {
  title: string;
  timelineElapsedPct: number;
  daysRemaining: number;
  budgetHoursSoFar: number;
  actualHours: number;
  budgetProfitSoFar: string;
  actualProfit: string;
  budgetMarginSoFar: number;
  actualMargin: number;
  totalScopedHours: number;
  agencyFee: string;
}

interface PersonContext {
  personId?: string;
  name: string;
  role: string;
  loggedHours: number;
  allocatedHours: number;
  lastEntry: string | null;
  expectedHours?: number;
  completeness?: number;
  totalLoggedHours?: number;
  employmentStart?: string | null;
  employmentEnd?: string | null;
}

interface PhaseContext {
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

interface Suggestion {
  text: string;
  linkType: "timesheet" | "phases";
  personNames?: string[];
}

interface Props {
  metrics: ProjectMetrics;
  teamContext: {
    people: PersonContext[];
    phases: PhaseContext[];
  };
  projectId: string;
  timeEntries: any[];
  projectStartDate: string;
  projectEndDate: string;
  onGoToPhases: () => void;
}

/** Parse RAG-tagged text into segments with color info */
function parseRagText(text: string): { text: string; color: "green" | "amber" | "red" | null }[] {
  const segments: { text: string; color: "green" | "amber" | "red" | null }[] = [];
  // Use a non-capturing inner group to avoid extra split elements
  const parts = text.split(/(\[\/?(?:GREEN|AMBER|RED)\])/gi);
  let currentColor: "green" | "amber" | "red" | null = null;
  const colorStack: ("green" | "amber" | "red")[] = [];

  for (const part of parts) {
    // Opening tag
    const openMatch = part.match(/^\[(GREEN|AMBER|RED)\]$/i);
    if (openMatch) {
      if (currentColor) colorStack.push(currentColor);
      currentColor = openMatch[1].toLowerCase() as "green" | "amber" | "red";
      continue;
    }
    // Closing tag
    const closeMatch = part.match(/^\[\/(GREEN|AMBER|RED)\]$/i);
    if (closeMatch) {
      currentColor = colorStack.pop() || null;
      continue;
    }
    // Content
    const trimmed = part.trim();
    if (trimmed) {
      segments.push({ text: trimmed, color: currentColor });
    }
  }

  return segments;
}

const ragStyles: Record<string, string> = {
  green: "bg-[hsl(var(--rag-green-bg))] text-[hsl(var(--rag-green))]",
  amber: "bg-[hsl(var(--rag-amber-bg))] text-[hsl(var(--rag-amber))]",
  red: "bg-[hsl(var(--rag-red-bg))] text-[hsl(var(--rag-red))]",
};

function RagText({ text }: { text: string }) {
  const segments = parseRagText(text);
  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) =>
        seg.color ? (
          <span key={i} className={`${ragStyles[seg.color]} rounded px-1.5 py-0.5`}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export function ProjectAISummary({ metrics, teamContext, projectId, timeEntries, projectStartDate, projectEndDate, onGoToPhases }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
  const [flaggedNames, setFlaggedNames] = useState<string[]>([]);

  const fetchSummary = async (metricsData: ProjectMetrics, team: typeof teamContext, retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("project-ai-summary", {
        body: { metrics: metricsData, teamContext: team, projectEndDate },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data.error.includes("Rate limit") && retryCount < 2) {
          await new Promise(r => setTimeout(r, (retryCount + 1) * 3000));
          return fetchSummary(metricsData, team, retryCount + 1);
        }
        throw new Error(data.error);
      }
      setSummary(data.summary);
      setWarnings(data.warnings || "");
      setSuggestions(data.suggestions || []);
    } catch (e: any) {
      setError(e.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  // Track whether we've auto-fetched for this data set
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (teamContext.people.length > 0 && !hasFetched) {
      setHasFetched(true);
      fetchSummary(metrics, teamContext);
    }
  }, [teamContext.people.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimesheetClick = (names: string[]) => {
    setFlaggedNames(names);
    setTimesheetDialogOpen(true);
  };

  const handlePhasesClick = () => {
    onGoToPhases();
  };

  if (!summary && !loading && !error) return null;

  return (
    <>
      <div className="rounded-lg border bg-muted/30 p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            AI Summary & Suggestions
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchSummary(metrics, teamContext)} disabled={loading} className="h-6 w-6 p-0">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2 mt-2" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed font-medium">
              <RagText text={summary || ""} />
            </p>
            {warnings && (
              <p className="text-sm leading-relaxed mt-3">
                <RagText text={warnings} />
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      if (s.linkType === "timesheet") {
                        handleTimesheetClick(s.personNames || []);
                      } else if (s.linkType === "phases") {
                        handlePhasesClick();
                      }
                    }}
                  >
                    {s.linkType === "timesheet" ? (
                      <ClipboardList className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {s.linkType === "timesheet" ? "Review Timesheets" : "Go to Phasing"}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <TimesheetReviewDialog
        open={timesheetDialogOpen}
        onOpenChange={setTimesheetDialogOpen}
        timeEntries={timeEntries}
        flaggedNames={flaggedNames}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        completenessData={teamContext.people
          .filter(p => flaggedNames.map(n => n.toLowerCase()).includes(p.name.toLowerCase()))
          .map(p => ({
            personId: p.personId || p.name,
            name: p.name,
            role: p.role,
            loggedHours: p.totalLoggedHours ?? p.loggedHours ?? 0,
            expectedHours: p.expectedHours || 0,
            pct: p.completeness || 0,
            employmentStart: p.employmentStart || null,
            employmentEnd: p.employmentEnd || null,
            capacityPerDay: (p as any).capacityPerDay || 7.5,
          }))}
      />
    </>
  );
}
