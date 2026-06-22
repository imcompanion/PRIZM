import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  TrendingDown,
  TrendingUp,
  Trash2,
  Merge,
  Plus,
  AlertTriangle,
  Undo2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Recommendation {
  type: "remove" | "reduce" | "increase" | "merge" | "add";
  roles: string[];
  currentHours: number | null;
  suggestedHours: number | null;
  reason: string;
  confidence: "high" | "medium" | "low";
}

interface ScopeRecommendationsProps {
  scopedRoles: { role: string; hours: number }[];
  client: string;
  office: "UK" | "US";
  durationMonths: number;
  agencyFee: number;
  onApply: (recommendation: Recommendation) => void;
  onUndo?: (recommendation: Recommendation) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof TrendingDown; label: string; color: string }> = {
  remove: { icon: Trash2, label: "Remove", color: "text-destructive bg-destructive/10" },
  reduce: { icon: TrendingDown, label: "Reduce", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30" },
  increase: { icon: TrendingUp, label: "Increase", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30" },
  merge: { icon: Merge, label: "Merge", color: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30" },
  add: { icon: Plus, label: "Add", color: "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/30" },
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "border-emerald-300 dark:border-emerald-700",
  medium: "border-amber-300 dark:border-amber-700",
  low: "border-muted",
};

export function ScopeRecommendations({ scopedRoles, client, office, durationMonths, agencyFee, onApply, onUndo }: ScopeRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ projectCount: number; totalHistoricalHours: number; totalHistoricalFee: number } | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [showApplied, setShowApplied] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  const fetchRecommendations = async () => {
    if (!client || scopedRoles.length === 0) {
      toast.error("Select a client and configure services first");
      return;
    }
    if (!agencyFee || agencyFee <= 0) {
      toast.error("Agency fee must be greater than zero to analyse scope");
      return;
    }
    setLoading(true);
    setError(null);
    setDismissed(new Set());
    setApplied(new Set());
    setShowApplied(false);
    setShowDismissed(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("scope-recommendations", {
        body: { scopedRoles, client, office, durationMonths, agencyFee },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setRecommendations(data.recommendations || []);
      setMeta({ projectCount: data.projectCount, totalHistoricalHours: data.totalHistoricalHours, totalHistoricalFee: data.totalHistoricalFee });
      setHasFetched(true);
      if (data.recommendations?.length === 0 && data.message) {
        toast.info(data.message);
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (idx: number) => {
    const rec = recommendations[idx];
    onApply(rec);
    setApplied(prev => new Set(prev).add(idx));
    toast.success(`Applied: ${rec.type} ${rec.roles.join(", ")}`);
  };

  const handleDismiss = (idx: number) => {
    setDismissed(prev => new Set(prev).add(idx));
  };

  const handleUndoApplied = (idx: number) => {
    const rec = recommendations[idx];
    onUndo?.(rec);
    setApplied(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
    toast.info(`Undone: ${rec.type} ${rec.roles.join(", ")}`);
  };

  const handleUndoDismissed = (idx: number) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const appliedCount = applied.size;
  const dismissedCount = dismissed.size;

  const renderRecCard = (rec: Recommendation, i: number, mode: "active" | "applied" | "dismissed") => {
    const config = TYPE_CONFIG[rec.type];
    const Icon = config.icon;
    const currentH = rec.currentHours ?? 0;
    const suggestedH = rec.suggestedHours ?? 0;
    const hoursDelta = Math.round(suggestedH - currentH);

    return (
      <div
        key={i}
        className={cn(
          "border rounded-lg p-3 flex items-start gap-3",
          mode === "applied" && "opacity-75 bg-muted/30",
          mode === "dismissed" && "opacity-50 bg-muted/20",
          mode === "active" && CONFIDENCE_STYLE[rec.confidence]
        )}
      >
        <div className={cn("rounded-md p-1.5 shrink-0 mt-0.5", config.color)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {config.label}
            </Badge>
            <span className="text-sm font-semibold truncate">
              {rec.roles.join(" + ")}
            </span>
            {hoursDelta !== 0 && (
              <span className={cn(
                "text-xs font-semibold font-mono px-1.5 py-0.5 rounded",
                hoursDelta > 0
                  ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40"
                  : "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40"
              )}>
                {hoursDelta > 0 ? "+" : ""}{hoursDelta}h
              </span>
            )}
            <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto shrink-0">
              {rec.confidence}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {rec.reason}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {mode === "active" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                onClick={() => handleApprove(i)}
                title="Approve"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDismiss(i)}
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {mode === "applied" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleUndoApplied(i)}
              title="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {mode === "dismissed" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => handleUndoDismissed(i)}
              title="Restore"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Scope Optimiser</CardTitle>
            {meta && (
              <span className="text-xs text-muted-foreground">
                Based on {meta.projectCount} project{meta.projectCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Button
            variant={hasFetched ? "ghost" : "default"}
            size="sm"
            onClick={fetchRecommendations}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {hasFetched ? "Refresh" : "Analyse Scope"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : !hasFetched ? (
          <p className="text-sm text-muted-foreground">
            Click <strong>Analyse Scope</strong> to compare your proposed scope against how this client has actually been serviced in the last 12 months.
          </p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ✅ Your scope aligns well with historical patterns. No significant optimisations found.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Status toggles */}
            {(appliedCount > 0 || dismissedCount > 0) && (
              <div className="flex gap-3 text-xs">
                {appliedCount > 0 && (
                  <button
                    onClick={() => setShowApplied(prev => !prev)}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <Check className="h-3 w-3" />
                    {appliedCount} applied
                    {showApplied ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
                {dismissedCount > 0 && (
                  <button
                    onClick={() => setShowDismissed(prev => !prev)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    {dismissedCount} dismissed
                    {showDismissed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>
            )}

            {/* Applied recommendations (expandable) */}
            {showApplied && appliedCount > 0 && (
              <div className="space-y-2 pl-2 border-l-2 border-emerald-200 dark:border-emerald-800">
                {recommendations.map((rec, i) =>
                  applied.has(i) ? renderRecCard(rec, i, "applied") : null
                )}
              </div>
            )}

            {/* Dismissed recommendations (expandable) */}
            {showDismissed && dismissedCount > 0 && (
              <div className="space-y-2 pl-2 border-l-2 border-muted">
                {recommendations.map((rec, i) =>
                  dismissed.has(i) ? renderRecCard(rec, i, "dismissed") : null
                )}
              </div>
            )}

            {/* Active recommendations */}
            {recommendations.map((rec, i) => {
              if (dismissed.has(i) || applied.has(i)) return null;
              return renderRecCard(rec, i, "active");
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}