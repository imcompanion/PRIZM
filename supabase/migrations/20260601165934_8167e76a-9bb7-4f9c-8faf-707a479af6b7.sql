CREATE OR REPLACE FUNCTION public.delete_time_entries_for_import(_from_date date DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '10min'
AS $function$
DECLARE
  deleted_total integer := 0;
  deleted_batch integer := 0;
BEGIN
  LOOP
    WITH target_rows AS (
      SELECT id
      FROM public.time_entries
      WHERE _from_date IS NULL OR date >= _from_date
      ORDER BY date, id
      LIMIT 5000
    )
    DELETE FROM public.time_entries te
    USING target_rows tr
    WHERE te.id = tr.id;

    GET DIAGNOSTICS deleted_batch = ROW_COUNT;
    deleted_total := deleted_total + deleted_batch;

    EXIT WHEN deleted_batch = 0;
  END LOOP;

  RETURN deleted_total;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_time_entries_for_import(date) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_time_entries_date_id
  ON public.time_entries (date, id);