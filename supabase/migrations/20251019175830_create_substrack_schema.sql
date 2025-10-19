/*
  # Create Substrack Database Schema

  ## Overview
  Creates the complete database structure for Substrack subscription management SaaS platform.

  ## 1. New Tables
    
    ### `merchants`
    - `id` (uuid, primary key) - Unique identifier linked to auth.users
    - `email` (text) - Merchant email
    - `full_name` (text) - Merchant full name
    - `business_name` (text) - Business/company name
    - `gst_number` (text, nullable) - GST registration number
    - `bank_account` (text, nullable) - Bank account details
    - `bank_ifsc` (text, nullable) - Bank IFSC code
    - `logo_url` (text, nullable) - URL to uploaded logo
    - `stripe_api_key` (text, nullable) - Encrypted Stripe API key
    - `created_at` (timestamptz) - Account creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

    ### `subscription_plans`
    - `id` (uuid, primary key) - Unique plan identifier
    - `merchant_id` (uuid, foreign key) - Reference to merchant
    - `name` (text) - Plan name (e.g., "Basic Tier")
    - `description` (text, nullable) - Plan description
    - `price` (decimal) - Plan price
    - `currency` (text) - Currency code (default: 'INR')
    - `billing_cycle` (text) - Billing frequency (monthly, yearly, etc.)
    - `features` (jsonb) - Array of plan features
    - `is_active` (boolean) - Plan active/inactive status
    - `subscriber_count` (integer) - Current active subscribers
    - `created_at` (timestamptz) - Plan creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

    ### `subscribers`
    - `id` (uuid, primary key) - Unique subscriber identifier
    - `merchant_id` (uuid, foreign key) - Reference to merchant
    - `plan_id` (uuid, foreign key) - Reference to subscription plan
    - `customer_name` (text) - Subscriber name
    - `customer_email` (text) - Subscriber email
    - `status` (text) - Subscription status (active, cancelled, failed)
    - `start_date` (timestamptz) - Subscription start date
    - `next_renewal_date` (timestamptz, nullable) - Next billing date
    - `last_payment_date` (timestamptz, nullable) - Last successful payment
    - `last_payment_amount` (decimal, nullable) - Last payment amount
    - `stripe_subscription_id` (text, nullable) - Stripe subscription ID
    - `created_at` (timestamptz) - Subscriber creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

    ### `payment_transactions`
    - `id` (uuid, primary key) - Unique transaction identifier
    - `merchant_id` (uuid, foreign key) - Reference to merchant
    - `subscriber_id` (uuid, foreign key) - Reference to subscriber
    - `plan_id` (uuid, foreign key) - Reference to plan
    - `amount` (decimal) - Transaction amount
    - `status` (text) - Payment status (success, failed, pending)
    - `stripe_payment_id` (text, nullable) - Stripe payment ID
    - `payment_date` (timestamptz) - Transaction date
    - `created_at` (timestamptz) - Record creation timestamp

  ## 2. Security
    - Enable RLS on all tables
    - Merchants can only access their own data
    - Policies restrict data access to authenticated merchant owners

  ## 3. Important Notes
    - All monetary values stored as decimal for precision
    - Timestamps use timestamptz for timezone support
    - JSONB used for flexible feature lists
    - Foreign keys ensure referential integrity
*/

-- Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  business_name text NOT NULL,
  gst_number text,
  bank_account text,
  bank_ifsc text,
  logo_url text,
  stripe_api_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own profile"
  ON merchants FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Merchants can update own profile"
  ON merchants FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Merchants can insert own profile"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10, 2) NOT NULL,
  currency text DEFAULT 'INR',
  billing_cycle text NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  subscriber_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can create own plans"
  ON subscription_plans FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update own plans"
  ON subscription_plans FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can delete own plans"
  ON subscription_plans FOR DELETE
  TO authenticated
  USING (merchant_id = auth.uid());

-- Create subscribers table
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  status text DEFAULT 'active',
  start_date timestamptz DEFAULT now(),
  next_renewal_date timestamptz,
  last_payment_date timestamptz,
  last_payment_amount decimal(10, 2),
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own subscribers"
  ON subscribers FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can create own subscribers"
  ON subscribers FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can update own subscribers"
  ON subscribers FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Merchants can delete own subscribers"
  ON subscribers FOR DELETE
  TO authenticated
  USING (merchant_id = auth.uid());

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  status text NOT NULL,
  stripe_payment_id text,
  payment_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

CREATE POLICY "Merchants can create own transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_merchant ON subscription_plans(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_merchant ON subscribers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_plan ON subscribers(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_merchant ON payment_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscriber ON payment_transactions(subscriber_id);