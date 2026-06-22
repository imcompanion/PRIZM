
-- Add unique constraint on projects.opportunity_number for upsert support
CREATE UNIQUE INDEX IF NOT EXISTS projects_opportunity_number_unique ON public.projects (opportunity_number) WHERE opportunity_number IS NOT NULL;

-- Add unique constraint on roles.name for upsert support  
CREATE UNIQUE INDEX IF NOT EXISTS roles_name_unique ON public.roles (name);
