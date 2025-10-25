// supabase/functions/generate-access-token/index.ts - FIXED WITH CORS
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 🔥 FIX: Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 🔥 FIX: Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscriberId, merchantId } = await req.json()

    if (!subscriberId || !merchantId) {
      throw new Error('Missing subscriberId or merchantId')
    }

    const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-secret-key-change-this'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get subscriber details
    const { data: subscriber, error } = await supabase
      .from('subscribers')
      .select(`
        id,
        customer_email,
        customer_name,
        status,
        next_renewal_date,
        subscription_plans (
          id,
          name,
          features
        )
      `)
      .eq('id', subscriberId)
      .eq('merchant_id', merchantId)
      .single()

    if (error || !subscriber) {
      throw new Error('Subscriber not found')
    }

    // Create JWT payload
    const payload = {
      sub: subscriber.customer_email,
      email: subscriber.customer_email,
      name: subscriber.customer_name,
      merchant_id: merchantId,
      subscriber_id: subscriber.id,
      plan_id: (subscriber.subscription_plans as any)?.id,
      plan_name: (subscriber.subscription_plans as any)?.name,
      features: (subscriber.subscription_plans as any)?.features || [],
      status: subscriber.status,
      expires_at: subscriber.next_renewal_date,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days
    }

    // Sign JWT using Web Crypto API (consistent with webhook)
    const encoder = new TextEncoder()
    const keyBuf = encoder.encode(JWT_SECRET)
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // Create JWT manually
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`)
    const signature = await crypto.subtle.sign('HMAC', key, data)
    
    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature)
    let binaryString = ''
    for (let i = 0; i < signatureArray.length; i++) {
      binaryString += String.fromCharCode(signatureArray[i])
    }
    const encodedSignature = btoa(binaryString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`

    console.log('✅ Access token generated for subscriber:', subscriber.customer_email)

    // 🔥 FIX: Return with CORS headers
    return new Response(
      JSON.stringify({ 
        token,
        subscriber: {
          email: subscriber.customer_email,
          name: subscriber.customer_name,
          plan: (subscriber.subscription_plans as any)?.name,
          status: subscriber.status,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Error generating token:', error)
    // 🔥 FIX: Return error with CORS headers
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})