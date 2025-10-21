-- supabase/migrations/20251021130000_add_webhook_secret.sql

-- Add Stripe webhook secret field to merchants table
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS stripe_webhook_secret text;