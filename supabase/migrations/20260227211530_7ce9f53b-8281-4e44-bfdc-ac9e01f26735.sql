ALTER TABLE public.projects ADD COLUMN revenue numeric DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN opportunity_record_type text DEFAULT null;