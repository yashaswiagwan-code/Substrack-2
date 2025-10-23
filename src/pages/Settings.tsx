import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, RefreshCw, Check, X, Copy } from 'lucide-react';

export function Settings() {
  const { user, merchant, refreshMerchant } = useAuth();
  const [activeTab, setActiveTab] = useState('business');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<'success' | 'error' | null>(null);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);

  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    gst_number: '',
    bank_account: '',
    bank_ifsc: '',
  });

  const [stripeInfo, setStripeInfo] = useState({
    stripe_secret_key: '',
    stripe_publishable_key: '',
    stripe_webhook_secret: '',
  });

  const [profileInfo, setProfileInfo] = useState({
    full_name: '',
    email: '',
  });

  // Webhook URL - dynamically constructed
  const webhookUrl = `${window.location.origin.replace(window.location.hostname, 'niisdiotuzvydotoaurt.supabase.co')}/functions/v1/stripe-webhook`;

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
        stripe_webhook_secret: (merchant as any).stripe_webhook_secret || '',
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

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Validate a Stripe API key (secret or publishable)
 * @param {string} key - The Stripe API key to validate
 * @param {'secret'|'publishable'} type - The type of Stripe API key to validate
 * @returns {boolean} true if the key is valid, false otherwise
 */
/*******  45ddbb3e-182c-4cd5-bc0f-1bd08126065a  *******/
  const validateStripeKey = (key: string, type: 'secret' | 'publishable'): boolean => {
    if (!key) return false;
    
    if (type === 'secret') {
      return key.startsWith('sk_test_') || key.startsWith('sk_live_');
    } else {
      return key.startsWith('pk_test_') || key.startsWith('pk_live_');
    }
  };

  const testStripeConnection = async () => {
    if (!validateStripeKey(stripeInfo.stripe_secret_key, 'secret')) {
      setStripeTestResult('error');
      alert('Invalid Stripe Secret Key format. Must start with sk_test_ or sk_live_');
      return;
    }

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

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookUrlCopied(true);
    setTimeout(() => setWebhookUrlCopied(false), 2000);
  };

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    // Validate keys
    if (!validateStripeKey(stripeInfo.stripe_secret_key, 'secret')) {
      alert('Invalid Stripe Secret Key. Must start with sk_test_ or sk_live_');
      setLoading(false);
      return;
    }

    if (!validateStripeKey(stripeInfo.stripe_publishable_key, 'publishable')) {
      alert('Invalid Stripe Publishable Key. Must start with pk_test_ or pk_live_');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          stripe_api_key: stripeInfo.stripe_secret_key,
          stripe_publishable_key: stripeInfo.stripe_publishable_key,
          stripe_webhook_secret: stripeInfo.stripe_webhook_secret,
        })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshMerchant();
      setSuccessMessage('Stripe API keys updated successfully!');
      setStripeTestResult(null);
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
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showSecretKey ? 'text' : 'password'}
                            value={stripeInfo.stripe_secret_key}
                            onChange={(e) =>
                              setStripeInfo({ ...stripeInfo, stripe_secret_key: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="sk_live_..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecretKey(!showSecretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showSecretKey ? (
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

                    {/* Webhook Configuration Section */}
                    <div className="border-t pt-4 mt-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Webhook Configuration</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Configure webhooks in your{' '}
                        <a
                          href="https://dashboard.stripe.com/webhooks"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Stripe Dashboard
                        </a>{' '}
                        to receive subscription updates.
                      </p>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Your Webhook URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={webhookUrl}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                          />
                          <button
                            type="button"
                            onClick={copyWebhookUrl}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            {webhookUrlCopied ? (
                              <>
                                <Check className="w-4 h-4 text-green-600" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-800 font-medium mb-2">
                          📋 Setup Instructions:
                        </p>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                          <li>Copy the webhook URL above</li>
                          <li>Go to Stripe Dashboard → Webhooks</li>
                          <li>Click "Add Destination" and paste the URL</li>
                          <li>Select these events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed</li>
                          <li>Copy the "Signing secret" (starts with whsec_)</li>
                          <li>Paste it in the field below</li>
                        </ol>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Webhook Signing Secret
                        </label>
                        <div className="relative">
                          <input
                            type={showWebhookSecret ? 'text' : 'password'}
                            value={stripeInfo.stripe_webhook_secret}
                            onChange={(e) =>
                              setStripeInfo({
                                ...stripeInfo,
                                stripe_webhook_secret: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="whsec_..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showWebhookSecret ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Starts with whsec_ (from Stripe webhook settings)
                        </p>
                      </div>
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
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save API Keys'}
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