CREATE OR REPLACE FUNCTION public.get_project_hours_by_role()
 RETURNS TABLE(project_id uuid, role_id uuid, total_hours numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT
    te.project_id,
    p.role_id,
    SUM(te.hours) AS total_hours
  FROM time_entries te
  LEFT JOIN people p ON p.id = te.person_id
  WHERE te.project_id IS NOT NULL
  GROUP BY te.project_id, p.role_id;
$$;