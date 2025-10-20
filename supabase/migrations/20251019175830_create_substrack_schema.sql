/*
  # Create Substrack Database Schema - Fixed with Database Function

  ## Key Changes
  - Uses SECURITY DEFINER function to bypass RLS during signup
  - This is the standard Supabase pattern for signup flows
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

-- RLS Policies for merchants
CREATE POLICY "Merchants can view own profile"
  ON merchants FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Merchants can update own profile"
  ON merchants FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Merchants can delete own profile"
  ON merchants FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- NO INSERT POLICY - We'll use a function instead

-- Create a SECURITY DEFINER function to handle merchant creation
CREATE OR REPLACE FUNCTION create_merchant_profile(
  user_id uuid,
  user_email text,
  user_full_name text,
  user_business_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to create their own profile
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Insert the merchant record
  INSERT INTO merchants (id, email, full_name, business_name)
  VALUES (user_id, user_email, user_full_name, user_business_name);
END;
$$;

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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to automatically update updated_at for all tables
CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_subscription_plans_merchant ON subscription_plans(merchant_id);
CREATE INDEX idx_subscribers_merchant ON subscribers(merchant_id);
CREATE INDEX idx_subscribers_plan ON subscribers(plan_id);
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_payment_transactions_merchant ON payment_transactions(merchant_id);
CREATE INDEX idx_payment_transactions_subscriber ON payment_transactions(subscriber_id);