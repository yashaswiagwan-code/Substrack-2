import { supabase } from '../lib/supabase';

export class StripeService {
  // Create checkout session via Supabase Edge Function
  async createSubscriptionCheckout(
    priceId: string,
    customerEmail: string,
    customerName: string,
    planId: string,
    merchantId: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          customerEmail,
          customerName,
          planId,
          merchantId,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      return data.url;
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      throw new Error('Failed to create checkout session');
    }
  }
}