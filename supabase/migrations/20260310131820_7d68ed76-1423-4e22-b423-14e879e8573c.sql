CREATE OR REPLACE FUNCTION public.get_utilisation_summary(_start_date date, _end_date date)
RETURNS TABLE(person_id uuid, project_id uuid, total_hours numeric, leave_hours numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH leave_projects AS (
    SELECT id FROM projects
    WHERE LOWER(title) SIMILAR TO '%(leave|holiday|sick|bank holiday|office closed|non-working day)%'
  )
  SELECT
    te.person_id,
    te.project_id,
    SUM(te.hours) AS total_hours,
    SUM(
      CASE WHEN (
        te.project_id IN (SELECT id FROM leave_projects)
        OR LOWER(COALESCE(te.notes, '')) SIMILAR TO '%(leave|holiday|sick|bank holiday|office closed|non-working day)%'
      ) THEN te.hours
      ELSE 0
      END
    ) AS leave_hours
  FROM time_entries te
  WHERE te.date >= _start_date
    AND te.date <= _end_date
  GROUP BY te.person_id, te.project_id;
$function$