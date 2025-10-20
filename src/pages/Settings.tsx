<<<<<<< HEAD
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-nocheck
=======
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
<<<<<<< HEAD
import { Eye, EyeOff, RefreshCw, Check, X } from 'lucide-react';
=======
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9

export function Settings() {
  const { user, merchant, refreshMerchant } = useAuth();
  const [activeTab, setActiveTab] = useState('business');
  const [showApiKey, setShowApiKey] = useState(false);
<<<<<<< HEAD
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<'success' | 'error' | null>(null);
=======
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9

  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    gst_number: '',
    bank_account: '',
    bank_ifsc: '',
  });

  const [stripeInfo, setStripeInfo] = useState({
<<<<<<< HEAD
    stripe_secret_key: '',
    stripe_publishable_key: '',
=======
    stripe_api_key: '',
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
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
<<<<<<< HEAD
        stripe_secret_key: merchant.stripe_api_key || '',
        stripe_publishable_key: merchant.stripe_publishable_key || '',
=======
        stripe_api_key: merchant.stripe_api_key || '',
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
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

<<<<<<< HEAD
  const testStripeConnection = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeInfo.stripe_secret_key, {
  apiVersion: '2025-09-30.clover', // Changed
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

=======
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('merchants')
<<<<<<< HEAD
        .update({
          stripe_api_key: stripeInfo.stripe_secret_key,
          stripe_publishable_key: stripeInfo.stripe_publishable_key,
        })
=======
        .update({ stripe_api_key: stripeInfo.stripe_api_key })
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
        .eq('id', user!.id);

      if (error) throw error;

      await refreshMerchant();
<<<<<<< HEAD
      setSuccessMessage('Stripe API keys updated successfully!');
    } catch (error: any) {
      console.error('Error updating Stripe keys:', error);
      alert('Failed to update Stripe API keys');
=======
      setSuccessMessage('Stripe API key updated successfully!');
    } catch (error: any) {
      console.error('Error updating Stripe key:', error);
      alert('Failed to update Stripe API key');
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
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

<<<<<<< HEAD
=======
  const generateApiKey = () => {
    const key = 'sk_test_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setStripeInfo({ stripe_api_key: key });
  };

>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
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
<<<<<<< HEAD
                onClick={() => setActiveTab('stripe')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stripe'
=======
                onClick={() => setActiveTab('integration')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'integration'
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
<<<<<<< HEAD
                Stripe Integration
=======
                Integration
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Business Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={businessInfo.business_name}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, business_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        value={businessInfo.gst_number}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, gst_number: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={businessInfo.bank_account}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, bank_account: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank IFSC Code
                      </label>
                      <input
                        type="text"
                        value={businessInfo.bank_ifsc}
                        onChange={(e) =>
                          setBusinessInfo({ ...businessInfo, bank_ifsc: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

<<<<<<< HEAD
            {activeTab === 'stripe' && (
              <form onSubmit={handleStripeSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Stripe Integration</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Connect your Stripe account to accept payments. Get your API keys from your{' '}
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Stripe Dashboard
                    </a>
                    .
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stripe Secret Key
=======
            {activeTab === 'integration' && (
              <form onSubmit={handleStripeSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Stripe Integration</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect your Stripe account to accept payments. Your API key is encrypted and stored securely.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stripe API Key
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
<<<<<<< HEAD
                            value={stripeInfo.stripe_secret_key}
                            onChange={(e) =>
                              setStripeInfo({ ...stripeInfo, stripe_secret_key: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="sk_live_..."
=======
                            value={stripeInfo.stripe_api_key}
                            onChange={(e) =>
                              setStripeInfo({ ...stripeInfo, stripe_api_key: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="sk_test_..."
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
<<<<<<< HEAD
                            {showApiKey ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Starts with sk_live_ or sk_test_
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stripe Publishable Key
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showPublishableKey ? 'text' : 'password'}
                            value={stripeInfo.stripe_publishable_key}
                            onChange={(e) =>
                              setStripeInfo({
                                ...stripeInfo,
                                stripe_publishable_key: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="pk_live_..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowPublishableKey(!showPublishableKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPublishableKey ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Starts with pk_live_ or pk_test_
                      </p>
                    </div>

                    {stripeInfo.stripe_secret_key && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={testStripeConnection}
                          disabled={testingStripe}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {testingStripe ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Testing Connection...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Test Connection
                            </>
                          )}
                        </button>

                        {stripeTestResult === 'success' && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                            <Check className="w-4 h-4" />
                            <span>Connection successful! Your Stripe keys are valid.</span>
                          </div>
                        )}

                        {stripeTestResult === 'error' && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                            <X className="w-4 h-4" />
                            <span>Connection failed. Please check your API keys.</span>
                          </div>
                        )}
                      </div>
                    )}
=======
                            {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={generateApiKey}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
                          title="Generate test key"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Get your API key from the Stripe Dashboard
                      </p>
                    </div>
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
<<<<<<< HEAD
                    {loading ? 'Saving...' : 'Save API Keys'}
=======
                    {loading ? 'Saving...' : 'Save API Key'}
>>>>>>> 71867761cd32b03b914f5f5f95183b89538731c9
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileInfo.full_name}
                        onChange={(e) =>
                          setProfileInfo({ ...profileInfo, full_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileInfo.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
