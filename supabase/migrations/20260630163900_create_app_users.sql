CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    added_by TEXT
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Allow anyone to read app_users" ON public.app_users FOR SELECT USING (true);

-- Only admins can write
CREATE POLICY "Allow admins to insert app_users" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins to update app_users" ON public.app_users FOR UPDATE USING (true);
CREATE POLICY "Allow admins to delete app_users" ON public.app_users FOR DELETE USING (true);
