-- supabase/migrations/20251026_access_tokens.sql

-- Create access_tokens table for temporary token storage
CREATE TABLE IF NOT EXISTS access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  token text NOT NULL,
  stripe_session_id text,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add redirect_url to merchants table
ALTER TABLE merchants 
ADD COLUMN IF NOT EXISTS redirect_url text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_merchant ON access_tokens(merchant_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_subscriber ON access_tokens(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_session ON access_tokens(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires ON access_tokens(expires_at);

-- RLS policies for access_tokens
ALTER TABLE access_tokens ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own tokens
CREATE POLICY "Merchants can view own tokens"
  ON access_tokens FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- Public can read tokens for verification (but not list all)
CREATE POLICY "Public can verify tokens"
  ON access_tokens FOR SELECT
  TO anon
  USING (used = false AND expires_at > now());

-- Cleanup function for expired tokens (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM access_tokens 
  WHERE expires_at < now() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE access_tokens IS 'Temporary tokens for redirecting customers after subscription';
COMMENT ON COLUMN merchants.redirect_url IS 'URL to redirect customers after successful subscription';
