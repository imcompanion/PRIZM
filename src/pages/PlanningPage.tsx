import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PlanningOverview } from "@/components/planning/PlanningOverview";
import { ProjectPlanningOverview } from "@/components/planning/ProjectPlanningOverview";

const PlanningPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const overviewMode = (searchParams.get("view") as "people" | "projects") || "projects";

  const setOverviewMode = useCallback((mode: "people" | "projects") => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", mode);
      return next;
    });
  }, [setSearchParams]);

  return (
    <div>
      <div className="sticky top-0 z-40 bg-background px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#1a1a1a]">Planning</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {overviewMode === "people"
                ? "All people grouped by team and office."
                : "All projects with scoped roles across a weekly timeline."}
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={overviewMode}
            onValueChange={(v) => { if (v) setOverviewMode(v as "people" | "projects"); }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="people" className="text-xs px-3">People</ToggleGroupItem>
            <ToggleGroupItem value="projects" className="text-xs px-3">Projects</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="px-8 pb-8">
        {overviewMode === "people" ? (
          <PlanningOverview />
        ) : (
          <ProjectPlanningOverview />
        )}
      </div>
    </div>
  );
};

export default PlanningPage;
