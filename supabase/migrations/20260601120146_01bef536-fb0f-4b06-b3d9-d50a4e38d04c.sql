CREATE OR REPLACE FUNCTION public.get_project_person_hours()
RETURNS TABLE(project_id uuid, person_id uuid, total_hours numeric)
LANGUAGE sql
STABLE
SET statement_timeout = '60s'
AS $$
  WITH person_day AS (
    SELECT te.person_id, te.date, SUM(te.hours) AS h
    FROM time_entries te
    WHERE te.person_id IS NOT NULL
    GROUP BY te.person_id, te.date
  ),
  project_person AS (
    SELECT DISTINCT te.project_id, te.person_id
    FROM time_entries te
    WHERE te.project_id IS NOT NULL AND te.person_id IS NOT NULL
  )
  SELECT pp.project_id, pp.person_id, COALESCE(SUM(pd.h), 0)::numeric AS total_hours
  FROM project_person pp
  JOIN projects p ON p.id = pp.project_id
  LEFT JOIN person_day pd
    ON pd.person_id = pp.person_id
   AND pd.date >= p.start_date
   AND pd.date <= LEAST(p.end_date, CURRENT_DATE)
  GROUP BY pp.project_id, pp.person_id;
$$;