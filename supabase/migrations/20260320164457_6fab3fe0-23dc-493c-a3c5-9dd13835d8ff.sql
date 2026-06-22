
CREATE TABLE public.client_team_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  allocation_type text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_team_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.client_team_allocations FOR ALL TO public USING (true) WITH CHECK (true);
