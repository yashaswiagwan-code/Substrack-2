// supabase/functions/exchange-token/index.ts - FIXED
// Exchanges Stripe session_id for JWT access token

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()

    console.log('🔄 Exchange token request for session:', session_id)

    if (!session_id) {
      throw new Error('Missing session_id parameter')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find token by Stripe session ID
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('access_tokens')
      .select(`
        id,
        token,
        used,
        expires_at,
        subscribers (
          customer_email,
          customer_name,
          status,
          subscription_plans (
            name,
            features
          )
        )
      `)
      .eq('stripe_session_id', session_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenRecord) {
      console.error('❌ Token not found or expired:', tokenError?.message)
      throw new Error('Token not found or expired. Please contact support.')
    }

    console.log('✅ Token found for session:', session_id)

    // Mark token as used
    const { error: updateError } = await supabase
      .from('access_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id)

    if (updateError) {
      console.error('❌ Error marking token as used:', updateError)
    }

    // Prepare subscriber data
    const subscriber = tokenRecord.subscribers as any
    const plan = subscriber?.subscription_plans as any

    const response = {
      token: tokenRecord.token,
      subscriber: {
        email: subscriber?.customer_email || '',
        name: subscriber?.customer_name || '',
        plan: plan?.name || 'Unknown Plan',
        features: plan?.features || [],
        status: subscriber?.status || 'active',
      }
    }

    console.log('✅ Token exchanged successfully for:', subscriber?.customer_email)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Error exchanging token:', error.message)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to exchange token',
        details: 'Please ensure the session is valid and not expired.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})