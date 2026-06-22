CREATE OR REPLACE FUNCTION public.get_person_hours_in_range(
  _person_ids uuid[],
  _start_date date,
  _end_date date
)
RETURNS TABLE(person_id uuid, total_hours numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT te.person_id, COALESCE(SUM(te.hours), 0) as total_hours
  FROM time_entries te
  WHERE te.person_id = ANY(_person_ids)
    AND te.date >= _start_date
    AND te.date <= _end_date
  GROUP BY te.person_id;
$$;