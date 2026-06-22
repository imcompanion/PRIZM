ALTER TABLE public.projects
  ADD COLUMN opportunity_number text,
  ADD COLUMN sf_account text,
  ADD COLUMN parent_account text,
  ADD COLUMN ultimate_parent text,
  ADD COLUMN stage text,
  ADD COLUMN office text;