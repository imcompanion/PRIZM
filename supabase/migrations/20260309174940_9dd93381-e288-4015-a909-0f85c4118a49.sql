-- Drop all FKs first (ignore if missing)
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

-- Re-add all with ON DELETE SET NULL
ALTER TABLE public.people ADD CONSTRAINT people_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.project_scopes ADD CONSTRAINT project_scopes_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.project_scopes ADD CONSTRAINT project_scopes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.allocations ADD CONSTRAINT allocations_project_scope_id_fkey FOREIGN KEY (project_scope_id) REFERENCES public.project_scopes(id) ON DELETE SET NULL;
ALTER TABLE public.allocations ADD CONSTRAINT allocations_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;
ALTER TABLE public.phase_allocations ADD CONSTRAINT phase_allocations_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.allocations(id) ON DELETE SET NULL;
ALTER TABLE public.phase_allocations ADD CONSTRAINT phase_allocations_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.project_phases(id) ON DELETE SET NULL;
ALTER TABLE public.phase_allocations ADD CONSTRAINT phase_allocations_project_scope_id_fkey FOREIGN KEY (project_scope_id) REFERENCES public.project_scopes(id) ON DELETE SET NULL;
ALTER TABLE public.daily_allocations ADD CONSTRAINT daily_allocations_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.allocations(id) ON DELETE SET NULL;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE SET NULL;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.project_phases ADD CONSTRAINT project_phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.project_monthly_revenue ADD CONSTRAINT project_monthly_revenue_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.rate_cards ADD CONSTRAINT rate_cards_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD CONSTRAINT projects_rate_card_id_fkey FOREIGN KEY (rate_card_id) REFERENCES public.rate_cards(id) ON DELETE SET NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';