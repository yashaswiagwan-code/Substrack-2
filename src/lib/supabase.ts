import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Merchant {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  gst_number?: string;
  bank_account?: string;
  bank_ifsc?: string;
  logo_url?: string;
  stripe_api_key?: string;
<<<<<<< HEAD
  stripe_publishable_key?: string;  // Add this
=======
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_cycle: string;
  features: string[];
  is_active: boolean;
  subscriber_count: number;
<<<<<<< HEAD
  stripe_product_id?: string;  // Add this
  stripe_price_id?: string;    // Add this
=======
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id: string;
  merchant_id: string;
  plan_id: string;
  customer_name: string;
  customer_email: string;
  status: 'active' | 'cancelled' | 'failed';
  start_date: string;
  next_renewal_date?: string;
  last_payment_date?: string;
  last_payment_amount?: number;
  stripe_subscription_id?: string;
<<<<<<< HEAD
  stripe_customer_id?: string;  // Add this
  created_at: string;
  updated_at: string;
}
=======
  created_at: string;
  updated_at: string;
}

>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
export interface PaymentTransaction {
  id: string;
  merchant_id: string;
  subscriber_id: string;
  plan_id: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  stripe_payment_id?: string;
  payment_date: string;
  created_at: string;
}
