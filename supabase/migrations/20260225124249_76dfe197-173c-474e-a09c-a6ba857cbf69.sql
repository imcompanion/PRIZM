
ALTER TABLE public.phase_allocations ADD COLUMN project_scope_id uuid REFERENCES public.project_scopes(id);
