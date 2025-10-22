// supabase/functions/stripe-webhook/index.ts - COMPLETE FIXED VERSION
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    console.error('❌ No signature provided')
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const parsedBody = JSON.parse(body)
    
    // Try to get merchant_id from metadata (works for checkout.session.completed)
    let merchantId = parsedBody.data?.object?.metadata?.merchant_id
    
    console.log('📧 Event type:', parsedBody.type)
    console.log('🔍 Merchant ID from metadata:', merchantId)

    // If no merchant_id in metadata, try to find it from subscription_id
    // This handles invoice events that don't carry metadata
    if (!merchantId) {
      const subscriptionId = parsedBody.data?.object?.subscription
      console.log('🔍 Looking up merchant from subscription:', subscriptionId)
      
      if (subscriptionId) {
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('merchant_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single()
        
        if (subscriber) {
          merchantId = subscriber.merchant_id
          console.log('✅ Found merchant from subscriber:', merchantId)
        }
      }
    }
    
    if (!merchantId) {
      console.error('❌ No merchant_id found in metadata or subscriber lookup')
      console.error('📦 Event data:', JSON.stringify(parsedBody.data?.object, null, 2))
      return new Response('No merchant_id found', { status: 400 })
    }

    console.log('✅ Processing webhook for merchant:', merchantId)

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('stripe_api_key, stripe_webhook_secret')
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant?.stripe_api_key) {
      console.error('❌ Merchant not found:', merchantError)
      return new Response('Merchant not found', { status: 400 })
    }

    if (!merchant.stripe_webhook_secret) {
      console.error('❌ Webhook secret not configured')
      return new Response('Webhook secret not configured', { status: 400 })
    }

    const stripe = new Stripe(merchant.stripe_api_key, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const webhookSecret = merchant.stripe_webhook_secret
    
    // Use constructEventAsync for Deno compatibility
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    )

    console.log('📧 Verified webhook event type:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('💥 Webhook error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  console.log('🎉 Processing checkout.session.completed')
  
  const { customer, subscription, metadata, customer_email } = session
  const { plan_id, merchant_id, customer_name } = metadata as any

  if (!subscription) {
    console.error('❌ No subscription in session')
    return
  }

  console.log('📝 Creating subscriber:', { merchant_id, plan_id, customer_name, customer_email })

  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription as string)

    const { data, error } = await supabase.from('subscribers').insert({
      merchant_id,
      plan_id,
      customer_name,
      customer_email,
      status: 'active',
      stripe_subscription_id: subscription,
      stripe_customer_id: customer,
      start_date: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      next_renewal_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    }).select()

    if (error) {
      console.error('❌ Error creating subscriber:', error)
      throw error
    }

    console.log('✅ Subscriber created successfully:', data)

    const { error: countError } = await supabase.rpc('increment_subscriber_count', { 
      p_plan_id: plan_id 
    })
    
    if (countError) {
      console.error('❌ Error incrementing count:', countError)
    } else {
      console.log('✅ Subscriber count incremented')
    }
  } catch (error) {
    console.error('💥 Failed to process checkout:', error)
    throw error
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Processing customer.subscription.updated')
  
  const { error } = await supabase
    .from('subscribers')
    .update({
      status: subscription.status === 'active' ? 'active' : subscription.status,
      next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('❌ Error updating subscriber:', error)
  } else {
    console.log('✅ Subscriber updated successfully')
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🗑️ Processing customer.subscription.deleted')
  
  const { data: subscriber, error: fetchError } = await supabase
    .from('subscribers')
    .select('plan_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (fetchError) {
    console.error('❌ Error fetching subscriber:', fetchError)
  }

  const { error } = await supabase
    .from('subscribers')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('❌ Error canceling subscriber:', error)
  } else {
    console.log('✅ Subscriber cancelled successfully')
  }

  if (subscriber) {
    const { error: countError } = await supabase.rpc('decrement_subscriber_count', { 
      p_plan_id: subscriber.plan_id 
    })
    
    if (countError) {
      console.error('❌ Error decrementing count:', countError)
    } else {
      console.log('✅ Subscriber count decremented')
    }
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Processing invoice.payment_succeeded')
  
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription?.id

  if (!subscriptionId) {
    console.error('❌ No subscription ID in invoice')
    return
  }

  const { data: subscriber, error: fetchError } = await supabase
    .from('subscribers')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (fetchError) {
    console.error('❌ Error fetching subscriber:', fetchError)
    return
  }

  if (subscriber) {
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
        last_payment_amount: (invoice.amount_paid || 0) / 100,
      })
      .eq('id', subscriber.id)

    if (updateError) {
      console.error('❌ Error updating subscriber payment:', updateError)
    }

    const { error: txError } = await supabase.from('payment_transactions').insert({
      merchant_id: subscriber.merchant_id,
      subscriber_id: subscriber.id,
      plan_id: subscriber.plan_id,
      amount: (invoice.amount_paid || 0) / 100,
      status: 'success',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    })

    if (txError) {
      console.error('❌ Error creating transaction:', txError)
    } else {
      console.log('✅ Payment recorded successfully')
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Processing invoice.payment_failed')
  
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id

  if (!subscriptionId) {
    console.error('❌ No subscription ID in invoice')
    return
  }

  const { data: subscriber, error: fetchError } = await supabase
    .from('subscribers')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (fetchError) {
    console.error('❌ Error fetching subscriber:', fetchError)
    return
  }

  if (subscriber) {
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({ status: 'failed' })
      .eq('id', subscriber.id)

    if (updateError) {
      console.error('❌ Error updating failed subscriber:', updateError)
    }

    const { error: txError } = await supabase.from('payment_transactions').insert({
      merchant_id: subscriber.merchant_id,
      subscriber_id: subscriber.id,
      plan_id: subscriber.plan_id,
      amount: (invoice.amount_due || 0) / 100,
      status: 'failed',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    })

    if (txError) {
      console.error('❌ Error creating failed transaction:', txError)
    } else {
      console.log('✅ Failed payment recorded successfully')
    }
  }
}