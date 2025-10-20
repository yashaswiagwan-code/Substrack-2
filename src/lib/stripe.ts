import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripeInstance = (publishableKey: string) => {
  if (!stripePromise || stripePromise === null) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const resetStripeInstance = () => {
  stripePromise = null;
};