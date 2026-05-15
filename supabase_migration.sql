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
  created_at timestamptz DEFAULT now()
);

-- 2. Create leaves table
-- IMPORTANT: 'date' is the PRIMARY KEY to allow for easy upserts (one leave per day)
CREATE TABLE IF NOT EXISTS leaves (
  date date PRIMARY KEY,
  leave_type text NOT NULL DEFAULT 'pl',
  status text DEFAULT 'planned',
  note text,
  duration numeric DEFAULT 1,
  plan_id uuid REFERENCES leave_plans(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 3. Ensure columns exist (in case tables were already partially created)
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS duration numeric DEFAULT 1;
ALTER TABLE leaves ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES leave_plans(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_plans ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for `leaves` table (Allow all for anon/public access)
DROP POLICY IF EXISTS "Allow all reads on leaves" ON leaves;
CREATE POLICY "Allow all reads on leaves" ON leaves FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow all inserts on leaves" ON leaves;
CREATE POLICY "Allow all inserts on leaves" ON leaves FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates on leaves" ON leaves;
CREATE POLICY "Allow all updates on leaves" ON leaves FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all deletes on leaves" ON leaves;
CREATE POLICY "Allow all deletes on leaves" ON leaves FOR DELETE TO anon USING (true);

-- 6. RLS Policies for `leave_plans` table
DROP POLICY IF EXISTS "Allow all reads on leave_plans" ON leave_plans;
CREATE POLICY "Allow all reads on leave_plans" ON leave_plans FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow all inserts on leave_plans" ON leave_plans;
CREATE POLICY "Allow all inserts on leave_plans" ON leave_plans FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all updates on leave_plans" ON leave_plans;
CREATE POLICY "Allow all updates on leave_plans" ON leave_plans FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all deletes on leave_plans" ON leave_plans;
CREATE POLICY "Allow all deletes on leave_plans" ON leave_plans FOR DELETE TO anon USING (true);
