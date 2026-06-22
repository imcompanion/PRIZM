
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS uk_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS us_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS imc_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_start_date date,
  ADD COLUMN IF NOT EXISTS overall_end_date date,
  ADD COLUMN IF NOT EXISTS monthly_salary numeric;
