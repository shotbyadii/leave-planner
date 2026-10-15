-- ============================================================
-- Leave Vault: Production Security & Performance Hardening Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- 1. Performance Indexes & Compound Unique Constraints
-- Prevents full-table scans and eliminates race conditions / double-tap duplicate leaves
CREATE UNIQUE INDEX IF NOT EXISTS leaves_user_date_idx ON leaves (user_id, date);
CREATE INDEX IF NOT EXISTS leaves_user_plan_idx ON leaves (user_id, plan_id);
CREATE INDEX IF NOT EXISTS leaves_user_type_idx ON leaves (user_id, leave_type);
CREATE INDEX IF NOT EXISTS leave_plans_user_start_idx ON leave_plans (user_id, start_date);
CREATE INDEX IF NOT EXISTS company_holidays_user_date_idx ON company_holidays (user_id, date);

-- 2. Enable Row-Level Security on all tables
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Hardened RLS Policies: Strict Per-User Isolation (auth.uid() = user_id)

-- Table: leaves
DROP POLICY IF EXISTS "Allow all on leaves" ON leaves;
DROP POLICY IF EXISTS "Users can only access own leaves" ON leaves;
CREATE POLICY "Users can only access own leaves" ON leaves
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: leave_plans
DROP POLICY IF EXISTS "Allow all on leave_plans" ON leave_plans;
DROP POLICY IF EXISTS "Users can only access own plans" ON leave_plans;
CREATE POLICY "Users can only access own plans" ON leave_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: profiles
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
DROP POLICY IF EXISTS "Users can only access own profile" ON profiles;
CREATE POLICY "Users can only access own profile" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Table: company_holidays
DROP POLICY IF EXISTS "Allow all on company_holidays" ON company_holidays;
DROP POLICY IF EXISTS "Users can only access own company_holidays" ON company_holidays;
CREATE POLICY "Users can only access own company_holidays" ON company_holidays
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Table: push_subscriptions
DROP POLICY IF EXISTS "Allow all on push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Allow authenticated on push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can only access own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users can only access own push_subscriptions" ON push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Automatic User Profile Creation via Postgres Trigger
-- Ensures every new user immediately gets default quotas and profile upon auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    quota_pl,
    quota_el,
    quota_rh,
    quota_wfh,
    leave_names,
    leave_colors,
    wfh_prompt_hour,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    15,
    10,
    1,
    10,
    '{"pl": "Planned Leave", "el": "Emergency Leave", "rh": "Extra Leave", "wfh": "Work From Home"}'::jsonb,
    '{"pl": "blue", "el": "orange", "rh": "green", "wfh": "cyan"}'::jsonb,
    '12',
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
