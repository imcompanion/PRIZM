
-- Make FK columns nullable where needed for independent imports
ALTER TABLE public.people ALTER COLUMN role_id DROP NOT NULL;
ALTER TABLE public.project_scopes ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.project_scopes ALTER COLUMN role_id DROP NOT NULL;
ALTER TABLE public.rate_cards ALTER COLUMN role_id DROP NOT NULL;
ALTER TABLE public.time_entries ALTER COLUMN person_id DROP NOT NULL;

-- Re-add all foreign keys with ON DELETE SET NULL
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

-- Also make allocations columns nullable for SET NULL to work
ALTER TABLE public.allocations ALTER COLUMN project_scope_id DROP NOT NULL;
ALTER TABLE public.allocations ALTER COLUMN person_id DROP NOT NULL;
