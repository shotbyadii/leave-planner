-- ============================================================
-- Leave Vault: COMPLETE Supabase Migration Script
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Create leave_plans table
CREATE TABLE IF NOT EXISTS leave_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Untitled Plan',
  start_date date NOT NULL,
  end_date date NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 2. Create leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  leave_type text NOT NULL DEFAULT 'pl',
  status text DEFAULT 'planned',
  note text,
  duration numeric DEFAULT 1,
  plan_id uuid REFERENCES leave_plans(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 3. Create company_holidays table (with user_id for multi-user isolation)
CREATE TABLE IF NOT EXISTS company_holidays (
  id text PRIMARY KEY,
  date date NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'public',
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 4. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  quota_pl int4 DEFAULT 15,
  quota_el int4 DEFAULT 10,
  quota_rh int4 DEFAULT 1,
  quota_wfh int4 DEFAULT 10,
  leave_names jsonb DEFAULT '{"pl": "Planned Leave", "el": "Emergency Leave", "rh": "Extra Leave", "wfh": "Work From Home"}'::jsonb,
  leave_colors jsonb DEFAULT '{"pl": "blue", "el": "orange", "rh": "green", "wfh": "cyan"}'::jsonb,
  avatar_url text,
  company_name text,
  company_logo_url text,
  wfh_prompt_hour text DEFAULT '09:00',
  updated_at timestamptz DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Allow all for anon/public access)
DROP POLICY IF EXISTS "Allow all on leaves" ON leaves;
CREATE POLICY "Allow all on leaves" ON leaves FOR ALL TO anon USING (true);

DROP POLICY IF EXISTS "Allow all on leave_plans" ON leave_plans;
CREATE POLICY "Allow all on leave_plans" ON leave_plans FOR ALL TO anon USING (true);

DROP POLICY IF EXISTS "Allow all on company_holidays" ON company_holidays;
CREATE POLICY "Allow all on company_holidays" ON company_holidays FOR ALL TO anon USING (true);

DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL TO anon USING (true);
