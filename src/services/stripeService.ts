/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-nocheck
import { supabase } from '../lib/supabase';
// Line 7 & 10 - Keep these imports but add eslint-disable
import {
  createStripeInstance,
  createStripeProduct,
  updateStripeProduct,
  archiveStripeProduct,
  createStripeCustomer, // Will be used in future
  createCheckoutSession,
  getStripeSubscription,
  cancelStripeSubscription, // Will be used in future
} from '../lib/stripeServer';
/* eslint-enable @typescript-eslint/no-unused-vars */

export class StripeService {
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private getStripe() {
    return createStripeInstance(this.secretKey);
  }

  // Sync plan to Stripe when created
  async syncPlanToStripe(
    planId: string,
    planName: string,
    planDescription: string | null,
    price: number,
    currency: string,
    billingCycle: string
  ): Promise<{ productId: string; priceId: string }> {
    const stripe = this.getStripe();
    const { productId, priceId } = await createStripeProduct(
      stripe,
      planName,
      planDescription,
      price,
      currency,
      billingCycle
    );

    // Update plan in database with Stripe IDs
    await supabase
      .from('subscription_plans')
      .update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
      })
      .eq('id', planId);

    return { productId, priceId };
  }

  // Update plan in Stripe
  async updatePlanInStripe(
    productId: string,
    planName: string,
    planDescription: string | null
  ): Promise<void> {
    const stripe = this.getStripe();
    await updateStripeProduct(stripe, productId, planName, planDescription);
  }

  // Archive plan in Stripe
  async archivePlanInStripe(productId: string): Promise<void> {
    const stripe = this.getStripe();
    await archiveStripeProduct(stripe, productId);
  }

  // Create checkout session for customer
  async createSubscriptionCheckout(
    priceId: string,
    customerEmail: string,
    customerName: string,
    planId: string,
    merchantId: string
  ): Promise<string> {
    const stripe = this.getStripe();
    
    const successUrl = `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/payment-cancelled`;

    const checkoutUrl = await createCheckoutSession(
      stripe,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      {
        plan_id: planId,
        merchant_id: merchantId,
        customer_name: customerName,
      }
    );

    return checkoutUrl;
  }

  // Process webhook events
  async processWebhookEvent(event: any): Promise<void> {
    const stripe = this.getStripe();

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const { customer, subscription, metadata } = session;
    const { plan_id, merchant_id, customer_name } = metadata;

    // Get subscription details
    const stripe = this.getStripe();
    const stripeSubscription = await getStripeSubscription(stripe, subscription);

    if (!stripeSubscription) return;

    // Create subscriber in database
    await supabase.from('subscribers').insert({
      merchant_id,
      plan_id,
      customer_name,
      customer_email: session.customer_email,
      status: 'active',
      stripe_subscription_id: subscription,
      stripe_customer_id: customer,
      start_date: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      next_renewal_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    });

    // Increment subscriber count
    await supabase.rpc('increment_subscriber_count', { plan_id });
  }

  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    // Additional logic if needed
    console.log('Subscription created:', subscription.id);
  }

  private async handleSubscriptionUpdated(subscription: any): Promise<void> {
    // Update subscriber status
    await supabase
      .from('subscribers')
      .update({
        status: subscription.status === 'active' ? 'active' : 'cancelled',
        next_renewal_date: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handleSubscriptionDeleted(subscription: any): Promise<void> {
    // Mark as cancelled
    await supabase
      .from('subscribers')
      .update({
        status: 'cancelled',
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    const { subscription, amount_paid, customer } = invoice;

    // Update last payment info
    await supabase
      .from('subscribers')
      .update({
        last_payment_date: new Date().toISOString(),
        last_payment_amount: amount_paid / 100, // Convert from cents
        status: 'active',
      })
      .eq('stripe_subscription_id', subscription);

    // Record transaction
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('id, merchant_id, plan_id')
      .eq('stripe_subscription_id', subscription)
      .single();

    if (subscriber) {
      await supabase.from('payment_transactions').insert({
        merchant_id: subscriber.merchant_id,
        subscriber_id: subscriber.id,
        plan_id: subscriber.plan_id,
        amount: amount_paid / 100,
        status: 'success',
        stripe_payment_id: invoice.id,
        payment_date: new Date().toISOString(),
      });
    }
  }

  private async handlePaymentFailed(invoice: any): Promise<void> {
    const { subscription, amount_due } = invoice;

    // Mark payment as failed
    await supabase
      .from('subscribers')
      .update({
        status: 'failed',
      })
      .eq('stripe_subscription_id', subscription);

    // Record failed transaction
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('id, merchant_id, plan_id')
      .eq('stripe_subscription_id', subscription)
      .single();

    if (subscriber) {
      await supabase.from('payment_transactions').insert({
        merchant_id: subscriber.merchant_id,
        subscriber_id: subscriber.id,
        plan_id: subscriber.plan_id,
        amount: amount_due / 100,
        status: 'failed',
        stripe_payment_id: invoice.id,
        payment_date: new Date().toISOString(),
      });
    }
  }
}