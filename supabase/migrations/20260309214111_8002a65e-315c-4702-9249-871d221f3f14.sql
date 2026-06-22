CREATE OR REPLACE FUNCTION public.get_project_costs()
RETURNS TABLE(project_id uuid, total_hours numeric, total_cost numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    te.project_id,
    SUM(te.hours) AS total_hours,
    SUM(
      CASE
        WHEN p.annual_salary IS NOT NULL AND p.annual_salary > 0 THEN
          te.hours * (
            (p.annual_salary * 1.15) /
            (1665.0 * (COALESCE(r.billable_capacity_hours, 7.5) / 7.5))
          )
        ELSE 0
      END
    ) AS total_cost
  FROM time_entries te
  LEFT JOIN people p ON p.id = te.person_id
  LEFT JOIN roles r ON r.id = p.role_id
  WHERE te.project_id IS NOT NULL
  GROUP BY te.project_id;
$$;