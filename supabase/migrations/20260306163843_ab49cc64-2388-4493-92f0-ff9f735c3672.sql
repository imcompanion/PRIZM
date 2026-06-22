
CREATE TABLE public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset text NOT NULL UNIQUE,
  last_imported_at timestamp with time zone NOT NULL DEFAULT now(),
  row_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.data_imports FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.data_imports (dataset) VALUES ('people'), ('projects'), ('lost_projects'), ('timesheets'), ('scopes');
