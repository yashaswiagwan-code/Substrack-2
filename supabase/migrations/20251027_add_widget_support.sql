-- supabase/migrations/20251027_add_widget_support.sql

-- Add widget_id to merchants table (we'll use merchant UUID as widget_id)
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS widget_id uuid DEFAULT gen_random_uuid();

-- Set existing merchants' widget_id to their own id
UPDATE merchants SET widget_id = id WHERE widget_id IS NULL;

-- Make widget_id unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_widget_id ON merchants(widget_id);

-- Add phone column if not exists
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS phone text;

-- Update access_tokens table to link with stripe sessions
ALTER TABLE access_tokens 
DROP COLUMN IF EXISTS stripe_session_id;

ALTER TABLE access_tokens
ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_stripe_session 
ON access_tokens(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Update RLS policy for access_tokens to allow public access for token exchange
DROP POLICY IF EXISTS "Public can verify tokens" ON access_tokens;

CREATE POLICY "Public can exchange tokens"
  ON access_tokens FOR SELECT
  TO anon, authenticated
  USING (
    (used = false AND expires_at > now()) 
    OR 
    merchant_id = auth.uid()
  );

-- Allow service role to insert tokens (for webhook)
DROP POLICY IF EXISTS "Service can create tokens" ON access_tokens;

CREATE POLICY "Service can create tokens"
  ON access_tokens FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to update tokens (mark as used)
DROP POLICY IF EXISTS "Service can update tokens" ON access_tokens;

CREATE POLICY "Service can update tokens"
  ON access_tokens FOR UPDATE
  TO service_role
  USING (true);

COMMENT ON COLUMN merchants.widget_id IS 'Unique ID for merchant widget integration';
COMMENT ON COLUMN access_tokens.stripe_session_id IS 'Stripe checkout session ID for token exchange';