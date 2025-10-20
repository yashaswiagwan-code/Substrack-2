import Stripe from 'stripe';

export const createStripeInstance = (secretKey: string): Stripe => {
  return new Stripe(secretKey, {
    apiVersion: '2025-09-30.clover',
  });
};

export interface StripeProduct {
  id: string;
  name: string;
  description?: string;
}

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  };
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
}

// Create a product and price in Stripe
export async function createStripeProduct(
  stripe: Stripe,
  planName: string,
  planDescription: string | null,
  price: number,
  currency: string,
  billingCycle: string
): Promise<{ productId: string; priceId: string }> {
  try {
    // Create product
    const product = await stripe.products.create({
      name: planName,
      description: planDescription || undefined,
    });

    // Map billing cycle to Stripe interval
    let interval: 'day' | 'week' | 'month' | 'year' = 'month';
    let intervalCount = 1;

    switch (billingCycle.toLowerCase()) {
      case 'daily':
        interval = 'day';
        break;
      case 'weekly':
        interval = 'week';
        break;
      case 'monthly':
        interval = 'month';
        break;
      case 'quarterly':
        interval = 'month';
        intervalCount = 3;
        break;
      case 'yearly':
        interval = 'year';
        break;
    }

    // Create price
    const priceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: currency.toLowerCase(),
      recurring: {
        interval,
        interval_count: intervalCount,
      },
    });

    return {
      productId: product.id,
      priceId: priceObj.id,
    };
  } catch (error: any) {
    console.error('Error creating Stripe product:', error);
    throw new Error(`Failed to create Stripe product: ${error.message}`);
  }
}

// Update a product in Stripe
export async function updateStripeProduct(
  stripe: Stripe,
  productId: string,
  planName: string,
  planDescription: string | null
): Promise<void> {
  try {
    await stripe.products.update(productId, {
      name: planName,
      description: planDescription || undefined,
    });
  } catch (error: any) {
    console.error('Error updating Stripe product:', error);
    throw new Error(`Failed to update Stripe product: ${error.message}`);
  }
}

// Archive a product in Stripe
export async function archiveStripeProduct(
  stripe: Stripe,
  productId: string
): Promise<void> {
  try {
    await stripe.products.update(productId, {
      active: false,
    });
  } catch (error: any) {
    console.error('Error archiving Stripe product:', error);
    throw new Error(`Failed to archive Stripe product: ${error.message}`);
  }
}

// Create a Stripe customer
export async function createStripeCustomer(
  stripe: Stripe,
  email: string,
  name: string
): Promise<string> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  } catch (error: any) {
    console.error('Error creating Stripe customer:', error);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
}

// Create a checkout session
export async function createCheckoutSession(
  stripe: Stripe,
  priceId: string,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
): Promise<string> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    });

    return session.url || '';
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }
}

// Retrieve subscription details
export async function getStripeSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<StripeSubscription | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription as any;
  } catch (error: any) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

// Cancel a subscription
export async function cancelStripeSubscription(
  stripe: Stripe,
  subscriptionId: string
): Promise<void> {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

// List all subscriptions for a customer
export async function listCustomerSubscriptions(
  stripe: Stripe,
  customerId: string
): Promise<StripeSubscription[]> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
    });
    return subscriptions.data as any;
  } catch (error: any) {
    console.error('Error listing subscriptions:', error);
    return [];
  }
}