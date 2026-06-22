CREATE OR REPLACE FUNCTION public.get_utilisation_summary(_start_date date, _end_date date)
 RETURNS TABLE(person_id uuid, project_id uuid, total_hours numeric, leave_hours numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    te.person_id,
    te.project_id,
    SUM(te.hours) AS total_hours,
    SUM(
      CASE WHEN (
        TRIM(LOWER(COALESCE(te.notes, ''))) ~ '(^leave$|annual leave|sick leave|sick day|bank holiday|office closed|non-working day|parental leave|maternity leave|paternity leave|compassionate leave|bereavement leave|^leave -|^leave:|^leave |leave$|holiday)'
        OR TRIM(LOWER(COALESCE(p.title, ''))) ~ '(^leave$|annual leave|sick leave|sick day|bank holiday|office closed|non-working day|parental leave|maternity leave|paternity leave|compassionate leave|bereavement leave|holiday)'
      ) THEN te.hours
      ELSE 0
      END
    ) AS leave_hours
  FROM time_entries te
  LEFT JOIN projects p ON p.id = te.project_id
  WHERE te.date >= _start_date
    AND te.date <= _end_date
  GROUP BY te.person_id, te.project_id;
$function$