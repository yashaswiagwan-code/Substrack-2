/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-nocheck
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, RefreshCw, Check, X } from 'lucide-react';

export function Settings() {
  const { user, merchant, refreshMerchant } = useAuth();
  const [activeTab, setActiveTab] = useState('business');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<'success' | 'error' | null>(null);

  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    gst_number: '',
    bank_account: '',
    bank_ifsc: '',
  });

  const [stripeInfo, setStripeInfo] = useState({
    stripe_secret_key: '',
    stripe_publishable_key: '',
  });

  const [profileInfo, setProfileInfo] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    if (merchant) {
      setBusinessInfo({
        business_name: merchant.business_name || '',
        gst_number: merchant.gst_number || '',
        bank_account: merchant.bank_account || '',
        bank_ifsc: merchant.bank_ifsc || '',
      });
      setStripeInfo({
        stripe_secret_key: merchant.stripe_api_key || '',
        stripe_publishable_key: merchant.stripe_publishable_key || '',
      });
      setProfileInfo({
        full_name: merchant.full_name || '',
        email: merchant.email || '',
      });
    }
  }, [merchant]);

  const handleBusinessInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('merchants')
        .update(businessInfo)
        .eq('id', user!.id);

      if (error) throw error;

      await refreshMerchant();
      setSuccessMessage('Business information updated successfully!');
    } catch (error: any) {
      console.error('Error updating business info:', error);
      alert('Failed to update business information');
    } finally {
      setLoading(false);
    }
  };

  const testStripeConnection = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeInfo.stripe_secret_key, {
        apiVersion: '2025-09-30.clover',
      });

      await stripe.products.list({ limit: 1 });
      setStripeTestResult('success');
    } catch (error) {
      console.error('Stripe test failed:', error);
      setStripeTestResult('error');
    } finally {
      setTestingStripe(false);
    }
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          stripe_api_key: stripeInfo.stripe_secret_key,
          stripe_publishable_key: stripeInfo.stripe_publishable_key,
        })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshMerchant();
      setSuccessMessage('Stripe API keys updated successfully!');
    } catch (error: any) {
      console.error('Error updating Stripe keys:', error);
      alert('Failed to update Stripe API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('merchants')
        .update({ full_name: profileInfo.full_name })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshMerchant();
      setSuccessMessage('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const key = 'sk_test_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setStripeInfo({ ...stripeInfo, stripe_secret_key: key });
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-4xl">
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('business')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'business'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Business Information
              </button>
              <button
                onClick={() => setActiveTab('stripe')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stripe'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Stripe Integration
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'business' && (
              <form onSubmit={handleBusinessInfoSubmit} className="space-y-6">
                {/* Business Info Fields */}
              </form>
            )}

            {activeTab === 'stripe' && (
              <form onSubmit={handleStripeSubmit} className="space-y-6">
                {/* Stripe Integration Fields + Test & Generate Buttons */}
              </form>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Profile Fields */}
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
