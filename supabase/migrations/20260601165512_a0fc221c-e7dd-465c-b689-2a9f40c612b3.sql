CREATE INDEX IF NOT EXISTS idx_time_entries_person_name_norm
  ON public.time_entries ((lower(trim(person_name))))
  WHERE person_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_project_code_norm
  ON public.time_entries ((lower(trim(project_code))))
  WHERE project_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_people_name_norm
  ON public.people ((lower(trim(name))));

CREATE INDEX IF NOT EXISTS idx_projects_opp_norm
  ON public.projects ((lower(trim(opportunity_number))))
  WHERE opportunity_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.relink_time_entries_from_fallbacks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '10min'
AS $function$
DECLARE
  relinked_people integer := 0;
  relinked_projects integer := 0;
BEGIN
  WITH canonical_people AS (
    SELECT DISTINCT ON (lower(trim(name)))
      id,
      lower(trim(name)) AS norm_name
    FROM public.people
    WHERE name IS NOT NULL AND trim(name) <> ''
    ORDER BY lower(trim(name)), overall_start_date DESC NULLS LAST, employment_start_date DESC NULLS LAST, created_at DESC, id
  )
  UPDATE public.time_entries te
  SET person_id = cp.id
  FROM canonical_people cp
  WHERE te.person_name IS NOT NULL
    AND lower(trim(te.person_name)) = cp.norm_name
    AND te.person_id IS DISTINCT FROM cp.id;
  GET DIAGNOSTICS relinked_people = ROW_COUNT;

  WITH canonical_projects AS (
    SELECT DISTINCT ON (lower(trim(opportunity_number)))
      id,
      lower(trim(opportunity_number)) AS norm_code
    FROM public.projects
    WHERE opportunity_number IS NOT NULL AND trim(opportunity_number) <> ''
    ORDER BY lower(trim(opportunity_number)), updated_at DESC, created_at DESC, id
  )
  UPDATE public.time_entries te
  SET project_id = cp.id
  FROM canonical_projects cp
  WHERE te.project_code IS NOT NULL
    AND lower(trim(te.project_code)) = cp.norm_code
    AND te.project_id IS DISTINCT FROM cp.id;
  GET DIAGNOSTICS relinked_projects = ROW_COUNT;

  RETURN jsonb_build_object(
    'relinkedPeople', relinked_people,
    'relinkedProjects', relinked_projects
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.relink_time_entries_from_fallbacks() TO anon, authenticated, service_role;