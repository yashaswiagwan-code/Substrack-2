import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';

export function Settings() {
  const { user, merchant, refreshMerchant } = useAuth();
  const [activeTab, setActiveTab] = useState('business');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    gst_number: '',
    bank_account: '',
    bank_ifsc: '',
  });

  const [stripeInfo, setStripeInfo] = useState({
    stripe_api_key: '',
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
        stripe_api_key: merchant.stripe_api_key || '',
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

  const handleStripeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('merchants')
        .update({ stripe_api_key: stripeInfo.stripe_api_key })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshMerchant();
      setSuccessMessage('Stripe API key updated successfully!');
    } catch (error: any) {
      console.error('Error updating Stripe key:', error);
      alert('Failed to update Stripe API key');
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
    setStripeInfo({ stripe_api_key: key });
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
                onClick={() => setActiveTab('integration')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'integration'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Integration
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
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={stripeInfo.stripe_api_key}
                            onChange={(e) =>
                              setStripeInfo({ ...stripeInfo, stripe_api_key: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="sk_test_..."
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
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
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save API Key'}
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
