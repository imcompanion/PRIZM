CREATE INDEX IF NOT EXISTS idx_client_team_allocations_person_id
ON public.client_team_allocations (person_id);

CREATE OR REPLACE FUNCTION public.relink_and_delete_people(
  mapping jsonb,
  delete_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '10min'
AS $$
DECLARE
  relinked_te integer := 0;
  relinked_al integer := 0;
  relinked_cta integer := 0;
  deleted_count integer := 0;
  remap_count integer := 0;
BEGIN
  -- mapping is jsonb: { "<canonical_id>": ["orphan_id_1","orphan_id_2",...], ... }
  -- Build a flat mapping table once and use it for all three bulk updates.
  CREATE TEMP TABLE _person_remap (orphan_id uuid PRIMARY KEY, canonical_id uuid NOT NULL) ON COMMIT DROP;

  INSERT INTO _person_remap (orphan_id, canonical_id)
  SELECT (orphan)::uuid, (canonical_key)::uuid
  FROM jsonb_each(COALESCE(mapping, '{}'::jsonb)) AS m(canonical_key, orphan_arr),
       jsonb_array_elements_text(orphan_arr) AS orphan
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO remap_count FROM _person_remap;

  IF remap_count > 0 THEN
    UPDATE time_entries t
    SET person_id = r.canonical_id
    FROM _person_remap r
    WHERE t.person_id = r.orphan_id;
    GET DIAGNOSTICS relinked_te = ROW_COUNT;

    UPDATE allocations a
    SET person_id = r.canonical_id
    FROM _person_remap r
    WHERE a.person_id = r.orphan_id;
    GET DIAGNOSTICS relinked_al = ROW_COUNT;

    UPDATE client_team_allocations c
    SET person_id = r.canonical_id
    FROM _person_remap r
    WHERE c.person_id = r.orphan_id;
    GET DIAGNOSTICS relinked_cta = ROW_COUNT;
  END IF;

  IF delete_ids IS NOT NULL AND array_length(delete_ids, 1) > 0 THEN
    DELETE FROM people WHERE id = ANY(delete_ids);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'relinkedTimeEntries', relinked_te,
    'relinkedAllocations', relinked_al,
    'relinkedClientAlloc', relinked_cta,
    'deletedCount', deleted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.relink_and_delete_people(jsonb, uuid[]) TO anon, authenticated, service_role;