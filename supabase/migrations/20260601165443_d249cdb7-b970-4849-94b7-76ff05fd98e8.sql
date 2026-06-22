ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS person_name text,
  ADD COLUMN IF NOT EXISTS project_code text;