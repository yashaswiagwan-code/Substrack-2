// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    
    // Extract merchant_id from metadata to get correct Stripe key
    let event: Stripe.Event
    
    // First, parse without verification to get merchant_id
    const parsedBody = JSON.parse(body)
    const merchantId = parsedBody.data?.object?.metadata?.merchant_id
    
    if (!merchantId) {
      console.error('No merchant_id in webhook metadata')
      return new Response('No merchant_id', { status: 400 })
    }

    // Get merchant's Stripe keys and webhook secret
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('stripe_api_key, stripe_webhook_secret')
      .eq('id', merchantId)
      .single()

    if (merchantError || !merchant?.stripe_api_key) {
      console.error('Merchant not found or no Stripe key')
      return new Response('Merchant not found', { status: 400 })
    }

    if (!merchant.stripe_webhook_secret) {
      console.error('Webhook secret not configured for merchant')
      return new Response('Webhook secret not configured', { status: 400 })
    }

    // Initialize Stripe with merchant's key
    const stripe = new Stripe(merchant.stripe_api_key, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Use merchant's specific webhook secret
    const webhookSecret = merchant.stripe_webhook_secret
    
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log('Webhook received:', event.type)

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
    console.error('Webhook error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  const { customer, subscription, metadata, customer_email } = session
  const { plan_id, merchant_id, customer_name } = metadata as any

  if (!subscription) return

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription as string)

  // Insert into subscribers table (not subscriptions!)
  const { error } = await supabase.from('subscribers').insert({
    merchant_id,
    plan_id,
    customer_name,
    customer_email,
    status: 'active',
    stripe_subscription_id: subscription,
    stripe_customer_id: customer,
    start_date: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    next_renewal_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
  })

  if (error) {
    console.error('Error creating subscriber:', error)
    throw error
  }

  // Increment subscriber count
  const { error: countError } = await supabase.rpc('increment_subscriber_count', { 
    p_plan_id: plan_id 
  })
  
  if (countError) console.error('Error incrementing count:', countError)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Update subscribers table (not subscriptions!)
  const { error } = await supabase
    .from('subscribers')
    .update({
      status: subscription.status === 'active' ? 'active' : subscription.status,
      next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error updating subscriber:', error)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Get subscriber to decrement count
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('plan_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  // Update subscribers table (not subscriptions!)
  const { error } = await supabase
    .from('subscribers')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error canceling subscriber:', error)

  if (subscriber) {
    await supabase.rpc('decrement_subscriber_count', { p_plan_id: subscriber.plan_id })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription?.id

  // Query subscribers table (not subscriptions!)
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscriber) {
    // Update subscribers table
    await supabase
      .from('subscribers')
      .update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
        last_payment_amount: (invoice.amount_paid || 0) / 100,
      })
      .eq('id', subscriber.id)

    await supabase.from('payment_transactions').insert({
      merchant_id: subscriber.merchant_id,
      subscriber_id: subscriber.id,
      plan_id: subscriber.plan_id,
      amount: (invoice.amount_paid || 0) / 100,
      status: 'success',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    })
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id

  // Query subscribers table (not subscriptions!)
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscriber) {
    // Update subscribers table
    await supabase
      .from('subscribers')
      .update({ status: 'failed' })
      .eq('id', subscriber.id)

    await supabase.from('payment_transactions').insert({
      merchant_id: subscriber.merchant_id,
      subscriber_id: subscriber.id,
      plan_id: subscriber.plan_id,
      amount: (invoice.amount_due || 0) / 100,
      status: 'failed',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    })
  }
}