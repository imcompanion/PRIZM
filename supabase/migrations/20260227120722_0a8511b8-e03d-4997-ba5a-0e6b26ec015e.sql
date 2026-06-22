CREATE OR REPLACE FUNCTION public.get_project_hours()
RETURNS TABLE(project_id uuid, total_hours numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT te.project_id, SUM(te.hours) as total_hours
  FROM time_entries te
  GROUP BY te.project_id;
$$;