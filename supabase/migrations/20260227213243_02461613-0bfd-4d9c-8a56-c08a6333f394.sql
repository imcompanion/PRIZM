CREATE TABLE public.billability_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field text NOT NULL,
  operator text NOT NULL DEFAULT 'equals',
  value text NOT NULL,
  is_billable boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.billability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON public.billability_rules FOR ALL USING (true) WITH CHECK (true);