-- Drop old single-field columns from billability_rules, repurpose as container
ALTER TABLE public.billability_rules DROP COLUMN IF EXISTS field;
ALTER TABLE public.billability_rules DROP COLUMN IF EXISTS operator;
ALTER TABLE public.billability_rules DROP COLUMN IF EXISTS value;

-- Add a label/name for the rule
ALTER TABLE public.billability_rules ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Untitled Rule';

-- Create conditions table
CREATE TABLE public.billability_rule_conditions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id uuid NOT NULL REFERENCES public.billability_rules(id) ON DELETE CASCADE,
  field text NOT NULL,
  operator text NOT NULL DEFAULT 'equals',
  value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.billability_rule_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.billability_rule_conditions FOR ALL USING (true) WITH CHECK (true);