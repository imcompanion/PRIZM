DROP FUNCTION IF EXISTS public.get_project_costs();

CREATE OR REPLACE FUNCTION public.get_project_costs()
RETURNS TABLE(project_id uuid, total_hours numeric, cost_gbp_staff numeric, cost_usd_staff numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    te.project_id,
    SUM(te.hours) AS total_hours,
    SUM(
      CASE
        WHEN p.annual_salary IS NOT NULL AND p.annual_salary > 0
             AND (p.office = 'UK' OR p.office = 'United Kingdom' OR p.office IS NULL) THEN
          te.hours * (
            (p.annual_salary * 1.15) /
            NULLIF(1665.0 * (COALESCE(NULLIF(r.billable_capacity_hours, 0), 7.5) / 7.5), 0)
          )
        ELSE 0
      END
    ) AS cost_gbp_staff,
    SUM(
      CASE
        WHEN p.annual_salary IS NOT NULL AND p.annual_salary > 0
             AND (p.office = 'US' OR p.office = 'United States') THEN
          te.hours * (
            (p.annual_salary * 1.15) /
            NULLIF(1665.0 * (COALESCE(NULLIF(r.billable_capacity_hours, 0), 7.5) / 7.5), 0)
          )
        ELSE 0
      END
    ) AS cost_usd_staff
  FROM time_entries te
  LEFT JOIN people p ON p.id = te.person_id
  LEFT JOIN roles r ON r.id = p.role_id
  WHERE te.project_id IS NOT NULL
  GROUP BY te.project_id;
$$;