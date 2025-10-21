-- supabase/migrations/20251021_add_public_plan_access.sql

-- Allow public (unauthenticated) users to read subscription plans
DROP POLICY IF EXISTS "Public can view active plans" ON subscription_plans;

CREATE POLICY "Public can view active plans"
  ON subscription_plans FOR SELECT
  TO anon
  USING (is_active = true);

-- Allow public read access to merchant business info
DROP POLICY IF EXISTS "Public can view merchant business info" ON merchants;

CREATE POLICY "Public can view merchant business info"
  ON merchants FOR SELECT
  TO anon
  USING (true);