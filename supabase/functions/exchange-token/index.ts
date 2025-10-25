// supabase/functions/exchange-token/index.ts
// This allows merchant's site to exchange Stripe session_id for JWT token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()

    if (!session_id) {
      throw new Error('Missing session_id')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find subscriber by Stripe session (stored in stripe_subscription_id)
    // Note: We need to query Stripe to get subscription_id from session_id
    // For now, use a lookup table or store session_id during webhook

    // Get unused token for this session
    const { data: tokenRecord, error } = await supabase
      .from('access_tokens')
      .select('*, subscribers(customer_email, customer_name, subscription_plans(name, features))')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single()

    if (error || !tokenRecord) {
      throw new Error('Token not found or expired')
    }

    // Mark token as used
    await supabase
      .from('access_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id)

    return new Response(
      JSON.stringify({
        token: tokenRecord.token,
        subscriber: {
          email: (tokenRecord.subscribers as any)?.customer_email,
          name: (tokenRecord.subscribers as any)?.customer_name,
          plan: (tokenRecord.subscribers as any)?.subscription_plans?.name,
          features: (tokenRecord.subscribers as any)?.subscription_plans?.features || [],
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error exchanging token:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})