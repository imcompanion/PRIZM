
CREATE OR REPLACE FUNCTION public.get_project_person_hours()
RETURNS TABLE(project_id uuid, person_id uuid, total_hours numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    pp.project_id,
    pp.person_id,
    COALESCE(SUM(te2.hours), 0) as total_hours
  FROM (
    SELECT DISTINCT te.project_id, te.person_id
    FROM time_entries te
    WHERE te.project_id IS NOT NULL AND te.person_id IS NOT NULL
  ) pp
  JOIN projects p ON p.id = pp.project_id
  LEFT JOIN time_entries te2 ON te2.person_id = pp.person_id
    AND te2.date >= p.start_date
    AND te2.date <= LEAST(p.end_date, CURRENT_DATE)
  GROUP BY pp.project_id, pp.person_id;
$$;
