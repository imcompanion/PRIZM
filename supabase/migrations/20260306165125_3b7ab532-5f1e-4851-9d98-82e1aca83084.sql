
-- Add new columns to projects table for Data Summary fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS new_repeat text,
  ADD COLUMN IF NOT EXISTS created_date date,
  ADD COLUMN IF NOT EXISTS close_date date,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS budget_cost numeric,
  ADD COLUMN IF NOT EXISTS contracted_infl_cost numeric,
  ADD COLUMN IF NOT EXISTS actual_cost numeric,
  ADD COLUMN IF NOT EXISTS media_cost numeric,
  ADD COLUMN IF NOT EXISTS gp_full_value numeric,
  ADD COLUMN IF NOT EXISTS gp_check text,
  ADD COLUMN IF NOT EXISTS gp_full_value_per_day numeric,
  ADD COLUMN IF NOT EXISTS probability numeric,
  ADD COLUMN IF NOT EXISTS start_week text,
  ADD COLUMN IF NOT EXISTS end_week text,
  ADD COLUMN IF NOT EXISTS duration_weeks numeric,
  ADD COLUMN IF NOT EXISTS duration_weeks_rounded numeric,
  ADD COLUMN IF NOT EXISTS phase1_start date,
  ADD COLUMN IF NOT EXISTS phase2_start date,
  ADD COLUMN IF NOT EXISTS phase3_start date,
  ADD COLUMN IF NOT EXISTS phase4_start date,
  ADD COLUMN IF NOT EXISTS phase1_end date,
  ADD COLUMN IF NOT EXISTS phase2_end date,
  ADD COLUMN IF NOT EXISTS phase3_end date,
  ADD COLUMN IF NOT EXISTS phase4_end date,
  ADD COLUMN IF NOT EXISTS phase1_name text,
  ADD COLUMN IF NOT EXISTS phase2_name text,
  ADD COLUMN IF NOT EXISTS phase3_name text,
  ADD COLUMN IF NOT EXISTS phase4_name text,
  ADD COLUMN IF NOT EXISTS value_per_week_phase1 numeric,
  ADD COLUMN IF NOT EXISTS value_per_week_phase2 numeric,
  ADD COLUMN IF NOT EXISTS value_per_week_phase3 numeric,
  ADD COLUMN IF NOT EXISTS value_per_week_phase4 numeric,
  ADD COLUMN IF NOT EXISTS opportunity_owner text,
  ADD COLUMN IF NOT EXISTS deal_value_derisked numeric,
  ADD COLUMN IF NOT EXISTS lead_source text,
  ADD COLUMN IF NOT EXISTS gp_margin_pct numeric,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS hub text,
  ADD COLUMN IF NOT EXISTS total_fees numeric,
  ADD COLUMN IF NOT EXISTS infl_production_costs numeric,
  ADD COLUMN IF NOT EXISTS paid_media_fees numeric,
  ADD COLUMN IF NOT EXISTS gross_budget numeric,
  ADD COLUMN IF NOT EXISTS hard_costs numeric,
  ADD COLUMN IF NOT EXISTS bdb_hours numeric,
  ADD COLUMN IF NOT EXISTS original_lead_source text,
  ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;

-- Monthly revenue by project
CREATE TABLE IF NOT EXISTS public.project_monthly_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  month_date date NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, month_date)
);

ALTER TABLE public.project_monthly_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.project_monthly_revenue FOR ALL USING (true) WITH CHECK (true);
