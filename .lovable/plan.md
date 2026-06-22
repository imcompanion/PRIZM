## Goal

Apply the same period-aware employment resolution used in `AnalysisTab` everywhere a person's team / role / office is resolved or where time entries are bucketed by team. A person on parental leave for part of a period must be excluded only for those dates; their pre/post-leave windows must flow into the correct team & role.

## Shared helper (new)

Create `src/lib/employment-windows.ts` exporting:

- `buildEmploymentWindows(people)` → `Map<normName, Array<{ start, end, team, role, office, roleId, capacityPerDay, annualSalary }>>` sorted ascending, covering **every** people row (including `Parental leave`).
- `buildPersonIdToName(people)` → `Map<personId, normName>`.
- `resolveEffectiveWindow(normName, date, windows, opts?)` → window covering `date`, or `null`. Options: `excludeTeams` (default `["parental leave"]`), `allowedTeams` (optional whitelist).
- `isInParentalLeaveWindow(normName, date, windows)` convenience.

This replaces both the ad-hoc resolver inside `AnalysisTab` and the simpler `buildParentalLeaveMap` / `isOnParentalLeave` pair where the leave map is the only need (we keep `parental-leave.ts` as a thin re-export for backward compat).

## Files to update

### 1. `src/components/time-tracking/AnalysisTab.tsx`
Replace local resolver with the shared helper. Apply same pattern to the other three blocks that still use a "current person record" pattern (lines ~729, ~845, ~1064–1481) so Summary / Completeness / heatmap also respect windows, not just Non-billable Detail.

### 2. `src/components/time-tracking/UtilisationTab.tsx`
Currently uses `isOnParentalLeave` for day exclusion **but** still keys per-person aggregation off the single person row's `team` / `role`. Switch the per-day aggregation to call `resolveEffectiveWindow(name, day)` so role/team shown for a person matches the day being counted (e.g. Kendall counts as Client Partner / Account Management on 1 Dec 2025+ and is skipped during Mar–Nov 2025).

### 3. `src/components/time-tracking/TrendCharts.tsx`
Per-month trend already excludes leave days, but team / role labelling uses single record. Switch to `resolveEffectiveWindow` per month so month-by-month team totals are correct for movers.

### 4. `src/pages/ProfitabilityPage.tsx`
Cost calc per person already correct (costs come from the single annual_salary row). Only the **team grouping** and **role grouping** in the Insights / RAG tables need window-aware resolution to keep Kendall's post-Dec 2025 hours in Account Management.

### 5. `src/components/project/TimesheetReviewDialog.tsx`
Aggregates sibling person IDs by name already. Add: when the heatmap renders weeks, mark weeks whose midpoint falls inside a parental-leave window as "on leave" (grey) with expected = 0, regardless of team filter. Pull the windows from the same helper.

### 6. `src/pages/ProjectDetailPage.tsx`
Person completeness rows derive `employmentStart` / `employmentEnd` from one record. Switch to window-aware: a person's expected hours over the project span sum the working-days of every non-leave window that overlaps the project date range.

### 7. `src/pages/ClientPortfolioPage.tsx`
Capacity / month-by-role logic. Use `resolveEffectiveWindow` per month per person before counting them into a role × month cell so movers and returners go into the right role for each month.

### 8. `src/components/time-tracking/PersonTimesheetDialog.tsx`
Already uses `isOnParentalLeave` for day skipping; switch the role/team header rendered in the dialog (and the per-week "expected hours" capacity) to the effective window for each shown week, so a person who moved roles mid-window shows the right role per week.

## Out of scope (no behaviour change needed)

- `BillableWorkPage`, `PlanningPage`, `LogTimeTab`, `Fee Calculator`, `Rate Cards`, `Scoping Tool`, `DataPage` — none of these resolve "current team" of a person inside time-windowed aggregations. (I'll spot-check while doing the rollout and flag any I find.)

## Validation

After each file: verify Kendall Morrow, Ori Krispin, Claudia Ledran behave correctly on their respective pages:

- Kendall: counted in Account Management / Client Partner before 8 Mar 2025 and from 1 Dec 2025 onward; excluded 8 Mar – 30 Nov 2025.
- Ori: excluded 18 Jun – 25 Nov 2025; included before/after under his other role.
- Claudia: excluded 22 Apr – 12 Aug 2024; included before/after.

## Risks / call-outs

- This will change numbers on Utilisation, Trends, Profitability and Client Portfolio. Movers (anyone with >1 employment row) will reallocate hours/capacity to the correct role per month. **This is the intended fix**, but margins / utilisation % may shift visibly for a handful of people.
- `parental-leave.ts` stays as a thin wrapper to avoid breaking imports; eventually we can deprecate it.

## Estimated edits

~7 files touched, ~1 new file. Roughly 300–400 lines changed total. No DB changes.

---

**Please confirm:**
1. Proceed with all 7 areas, or do you want a subset first (e.g. start with Utilisation + Profitability)?
2. Should the rollout treat *any* `team = "Parental leave"` window as exclude, or do you want a broader exclude list (e.g. sabbatical, long-term sick)?