
CREATE OR REPLACE FUNCTION public.get_role_hours_for_projects(_project_ids uuid[], _cutoff_date date)
RETURNS TABLE(role_name text, total_hours numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT r.name AS role_name, SUM(te.hours) AS total_hours
  FROM time_entries te
  JOIN people p ON p.id = te.person_id
  JOIN roles r ON r.id = p.role_id
  WHERE te.project_id = ANY(_project_ids)
    AND te.date >= _cutoff_date
  GROUP BY r.name;
$$;
