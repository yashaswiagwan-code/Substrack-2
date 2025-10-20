// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log('Webhook received:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { customer, subscription, metadata, customer_email } = session
  const { plan_id, merchant_id, customer_name } = metadata as any

  if (!subscription) return

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription as string)

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
    current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
  })

  if (error) {
    console.error('Error creating subscription:', error)
    throw error
  }

  // Increment subscriber count
  const { error: countError } = await supabase.rpc('increment_subscriber_count', { 
    p_plan_id: plan_id 
  })
  
  if (countError) console.error('Error incrementing count:', countError)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error updating subscription:', error)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error canceling subscription:', error)

  if (sub) {
    await supabase.rpc('decrement_subscriber_count', { p_plan_id: sub.plan_id })
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription?.id

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
        last_payment_amount: (invoice.amount_paid || 0) / 100,
      })
      .eq('id', subscription.id)

    await supabase.from('payment_transactions').insert({
      merchant_id: subscription.merchant_id,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('id', subscription.id)

    await supabase.from('payment_transactions').insert({
      merchant_id: subscription.merchant_id,
      subscription_id: subscription.id,
      plan_id: subscription.plan_id,
      amount: (invoice.amount_due || 0) / 100,
      status: 'failed',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    })
  }
}