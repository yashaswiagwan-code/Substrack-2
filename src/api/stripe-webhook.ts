import Stripe from 'stripe';
import { supabase } from '../lib/supabase';

export async function handleStripeWebhook(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  const sig = request.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Webhook Error', { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { customer, subscription, metadata, customer_email } = session as any;
  const { plan_id, merchant_id, customer_name } = metadata;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  const stripeSubscription = await stripe.subscriptions.retrieve(subscription as string);

  await supabase.from('subscribers').insert({
    merchant_id,
    plan_id,
    customer_name,
    customer_email,
    status: 'active',
    stripe_subscription_id: subscription,
    stripe_customer_id: customer,
    start_date: new Date((stripeSubscription.current_period_start ?? 0) * 1000).toISOString(),
    next_renewal_date: new Date((stripeSubscription.current_period_end ?? 0) * 1000).toISOString(),
  });

  await supabase.rpc('increment_subscriber_count', { plan_id });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await supabase
    .from('subscribers')
    .update({
      status: subscription.status === 'active' ? 'active' : 'cancelled',
      next_renewal_date: new Date((subscription.current_period_end ?? 0) * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('plan_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  await supabase
    .from('subscribers')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);

  if (subscriber) {
    await supabase.rpc('decrement_subscriber_count', { plan_id: subscriber.plan_id });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subscriber) {
    await supabase
      .from('subscribers')
      .update({
        last_payment_date: new Date().toISOString(),
        last_payment_amount: (invoice.amount_paid ?? 0) / 100,
        status: 'active',
      })
      .eq('id', subscriber.id);

    await supabase.from('payment_transactions').insert({
      merchant_id: subscriber.merchant_id,
      subscriber_id: subscriber.id,
      plan_id: subscriber.plan_id,
      amount: (invoice.amount_paid ?? 0) / 100,
      status: 'success',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('id, merchant_id, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subscriber) {
    await supabase
      .from('subscribers')
      .update({ status: 'failed' })
      .eq('id', subscriber.id);

    await supabase.from('payment_transactions').insert({
      merchant_id: subscriber.merchant_id,
      subscriber_id: subscriber.id,
      plan_id: subscriber.plan_id,
      amount: (invoice.amount_due ?? 0) / 100,
      status: 'failed',
      stripe_payment_id: invoice.id,
      payment_date: new Date().toISOString(),
    });
  }
}
