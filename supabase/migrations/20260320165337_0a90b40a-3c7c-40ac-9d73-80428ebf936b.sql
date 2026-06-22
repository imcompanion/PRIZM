
ALTER TABLE public.client_team_allocations 
  ADD COLUMN priority integer NOT NULL DEFAULT 1,
  DROP COLUMN allocation_type;
