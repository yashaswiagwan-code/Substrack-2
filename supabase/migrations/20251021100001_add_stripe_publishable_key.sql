-- Add Stripe publishable key field to merchants table
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS stripe_publishable_key text;