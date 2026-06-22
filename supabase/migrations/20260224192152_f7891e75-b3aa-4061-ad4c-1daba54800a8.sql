ALTER TABLE public.people
  ADD COLUMN office text NOT NULL DEFAULT 'UK',
  ADD COLUMN employment_start_date date,
  ADD COLUMN employment_end_date date;