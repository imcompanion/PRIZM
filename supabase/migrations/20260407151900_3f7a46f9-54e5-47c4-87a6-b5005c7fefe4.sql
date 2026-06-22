
-- Function to re-link time entries to people by name and clean up duplicate people records
CREATE OR REPLACE FUNCTION public.relink_time_entries_to_people()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
  deleted_count integer;
BEGIN
  -- Step 1: For each person name, pick the newest record (latest created_at) as the canonical one
  -- Update time_entries to point to the canonical person record based on name match
  WITH canonical AS (
    SELECT DISTINCT ON (lower(trim(name))) 
      id, lower(trim(name)) as norm_name
    FROM people
    ORDER BY lower(trim(name)), created_at DESC
  ),
  old_to_new AS (
    SELECT p.id as old_id, c.id as new_id
    FROM people p
    JOIN canonical c ON lower(trim(p.name)) = c.norm_name
    WHERE p.id != c.id
  )
  UPDATE time_entries te
  SET person_id = otn.new_id
  FROM old_to_new otn
  WHERE te.person_id = otn.old_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Step 2: Link unmatched time entries (person_id IS NULL) by matching
  -- the concatenation of first+last name fields stored in project_name... 
  -- Actually, time_entries don't store the person name directly.
  -- But we can match via the notes or other fields... No, the person name
  -- isn't stored on time_entries. The matching happens at import time.
  -- So we just need to ensure duplicates are cleaned up.

  -- Step 3: Update allocations to point to canonical people
  WITH canonical AS (
    SELECT DISTINCT ON (lower(trim(name))) 
      id, lower(trim(name)) as norm_name
    FROM people
    ORDER BY lower(trim(name)), created_at DESC
  ),
  old_to_new AS (
    SELECT p.id as old_id, c.id as new_id
    FROM people p
    JOIN canonical c ON lower(trim(p.name)) = c.norm_name
    WHERE p.id != c.id
  )
  UPDATE allocations a
  SET person_id = otn.new_id
  FROM old_to_new otn
  WHERE a.person_id = otn.old_id;

  -- Step 4: Delete duplicate (non-canonical) people records
  WITH canonical AS (
    SELECT DISTINCT ON (lower(trim(name))) 
      id, lower(trim(name)) as norm_name
    FROM people
    ORDER BY lower(trim(name)), created_at DESC
  )
  DELETE FROM people
  WHERE id NOT IN (SELECT id FROM canonical);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN updated_count + deleted_count;
END;
$$;
