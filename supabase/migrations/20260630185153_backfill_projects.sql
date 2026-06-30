UPDATE public.time_entries te
SET project_id = p.id
FROM public.projects p
WHERE te.project_id IS NULL 
  AND te.project_name IS NOT NULL
  AND LOWER(TRIM(te.project_name)) = LOWER(TRIM(p.title));
