-- Add Stripe-related fields to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Add Stripe customer ID to subscribers table
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Create index for faster Stripe lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_product 
ON subscription_plans(stripe_product_id);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_stripe_price 
ON subscription_plans(stripe_price_id);

CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_customer 
ON subscribers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_subscription 
ON subscribers(stripe_subscription_id);