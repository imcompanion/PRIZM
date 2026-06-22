CREATE OR REPLACE FUNCTION public.get_project_people()
RETURNS TABLE(project_id uuid, person_id uuid)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT DISTINCT te.project_id, te.person_id
  FROM time_entries te
  WHERE te.project_id IS NOT NULL AND te.person_id IS NOT NULL;
$$;