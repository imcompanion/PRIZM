
-- Drop partial unique index (doesn't work with PostgREST onConflict)
DROP INDEX IF EXISTS projects_opportunity_number_unique;

-- Add a proper unique constraint (PostgreSQL allows multiple NULLs by default)
ALTER TABLE public.projects ADD CONSTRAINT projects_opportunity_number_unique UNIQUE (opportunity_number);
