
-- Project phases: 6 fixed phases per project with start/end dates
CREATE TABLE public.project_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phase allocations: hours per person per phase
CREATE TABLE public.phase_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phase_id, allocation_id)
);

-- RLS policies
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.project_phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON public.phase_allocations FOR ALL USING (true) WITH CHECK (true);
