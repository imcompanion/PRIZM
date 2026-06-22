
-- Drop all foreign key constraints to make data tabs independent
ALTER TABLE public.people DROP CONSTRAINT IF EXISTS people_role_id_fkey;
ALTER TABLE public.project_scopes DROP CONSTRAINT IF EXISTS project_scopes_role_id_fkey;
ALTER TABLE public.project_scopes DROP CONSTRAINT IF EXISTS project_scopes_project_id_fkey;
ALTER TABLE public.allocations DROP CONSTRAINT IF EXISTS allocations_project_scope_id_fkey;
ALTER TABLE public.allocations DROP CONSTRAINT IF EXISTS allocations_person_id_fkey;
ALTER TABLE public.phase_allocations DROP CONSTRAINT IF EXISTS phase_allocations_allocation_id_fkey;
ALTER TABLE public.phase_allocations DROP CONSTRAINT IF EXISTS phase_allocations_phase_id_fkey;
ALTER TABLE public.phase_allocations DROP CONSTRAINT IF EXISTS phase_allocations_project_scope_id_fkey;
ALTER TABLE public.daily_allocations DROP CONSTRAINT IF EXISTS daily_allocations_allocation_id_fkey;
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_person_id_fkey;
ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;
ALTER TABLE public.project_phases DROP CONSTRAINT IF EXISTS project_phases_project_id_fkey;
ALTER TABLE public.project_monthly_revenue DROP CONSTRAINT IF EXISTS project_monthly_revenue_project_id_fkey;
ALTER TABLE public.rate_cards DROP CONSTRAINT IF EXISTS rate_cards_role_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_rate_card_id_fkey;
