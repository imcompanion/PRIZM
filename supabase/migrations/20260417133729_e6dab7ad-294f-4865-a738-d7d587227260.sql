CREATE OR REPLACE FUNCTION public.relink_time_entries_to_people()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_te integer := 0;
  updated_al integer := 0;
  deleted_count integer := 0;
BEGIN
  -- Build mapping of duplicate person_id -> canonical (newest) person_id
  -- Aggregate first to guarantee one row per old_id (avoids ON CONFLICT double-hit)
  CREATE TEMP TABLE _person_map ON COMMIT DROP AS
  WITH canonical AS (
    SELECT DISTINCT ON (lower(trim(name)))
      id, lower(trim(name)) AS norm_name
    FROM people
    ORDER BY lower(trim(name)), created_at DESC, id
  ),
  mapping AS (
    SELECT p.id AS old_id, c.id AS new_id
    FROM people p
    JOIN canonical c ON lower(trim(p.name)) = c.norm_name
    WHERE p.id <> c.id
  )
  SELECT old_id, MIN(new_id::text)::uuid AS new_id
  FROM mapping
  GROUP BY old_id;

  CREATE INDEX ON _person_map (old_id);

  -- Update time_entries in one pass
  UPDATE time_entries te
  SET person_id = m.new_id
  FROM _person_map m
  WHERE te.person_id = m.old_id;
  GET DIAGNOSTICS updated_te = ROW_COUNT;

  -- Update allocations
  UPDATE allocations a
  SET person_id = m.new_id
  FROM _person_map m
  WHERE a.person_id = m.old_id;
  GET DIAGNOSTICS updated_al = ROW_COUNT;

  -- Delete now-orphan duplicate people
  DELETE FROM people p
  USING _person_map m
  WHERE p.id = m.old_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN updated_te + updated_al + deleted_count;
END;
$function$;