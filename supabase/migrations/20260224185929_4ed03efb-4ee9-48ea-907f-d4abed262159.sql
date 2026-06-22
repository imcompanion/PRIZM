
-- Roles table (e.g. Designer, Developer, Strategist)
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  billable_capacity_hours NUMERIC(4,2) NOT NULL DEFAULT 7.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- People table
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  annual_salary NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rate cards (role -> hourly rate, can have multiple for different clients)
CREATE TABLE public.rate_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  hourly_rate NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rate_card_id UUID REFERENCES public.rate_cards(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project scopes (role + hours per project)
CREATE TABLE public.project_scopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  scoped_hours NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allocations (assign scoped hours to a person)
CREATE TABLE public.allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_scope_id UUID NOT NULL REFERENCES public.project_scopes(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  allocated_hours NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily allocations (spread allocated hours across days)
CREATE TABLE public.daily_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(4,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Time entries (actual time tracked)
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(4,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables (permissive for now - internal tool)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Permissive policies (all access for now, auth can be added later)
CREATE POLICY "Allow all access" ON public.roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.rate_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.project_scopes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.daily_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_people_role ON public.people(role_id);
CREATE INDEX idx_project_scopes_project ON public.project_scopes(project_id);
CREATE INDEX idx_project_scopes_role ON public.project_scopes(role_id);
CREATE INDEX idx_allocations_scope ON public.allocations(project_scope_id);
CREATE INDEX idx_allocations_person ON public.allocations(person_id);
CREATE INDEX idx_daily_allocations_allocation ON public.daily_allocations(allocation_id);
CREATE INDEX idx_daily_allocations_date ON public.daily_allocations(date);
CREATE INDEX idx_time_entries_person ON public.time_entries(person_id);
CREATE INDEX idx_time_entries_project ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_date ON public.time_entries(date);
