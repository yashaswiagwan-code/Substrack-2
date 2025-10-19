import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase, SubscriptionPlan } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check } from 'lucide-react';

export function Plans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly',
    features: [''],
  });

  useEffect(() => {
    if (user) {
      loadPlans();
    }
  }, [user]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('merchant_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading plans:', error);
    } else {
      setPlans(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const planData = {
      merchant_id: user!.id,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      billing_cycle: formData.billing_cycle,
      features: formData.features.filter(f => f.trim() !== ''),
      is_active: true,
    };

    if (editingPlan) {
      const { error } = await supabase
        .from('subscription_plans')
        .update(planData)
        .eq('id', editingPlan.id);

      if (error) {
        console.error('Error updating plan:', error);
      }
    } else {
      const { error } = await supabase
        .from('subscription_plans')
        .insert(planData);

      if (error) {
        console.error('Error creating plan:', error);
      }
    }

    setShowModal(false);
    setEditingPlan(null);
    resetForm();
    loadPlans();
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      billing_cycle: plan.billing_cycle,
      features: plan.features.length > 0 ? plan.features : [''],
    });
    setShowModal(true);
  };

  const handleDelete = async (planId: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('Error deleting plan:', error);
      } else {
        loadPlans();
      }
    }
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);

    if (error) {
      console.error('Error toggling plan status:', error);
    } else {
      loadPlans();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      billing_cycle: 'monthly',
      features: [''],
    });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  const copyEmbedCode = () => {
    const code = `<div id="substrack-embed"></div>\n<script src="https://cdn.substrack.com/embed.js" async></script>`;
    navigator.clipboard.writeText(code);
    alert('Embed code copied to clipboard!');
  };

  return (
    <DashboardLayout title="Plans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-700">Manage Subscription Plans</h2>
          <p className="text-sm text-gray-500 mt-1">Create, edit, and manage your subscription offerings.</p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setShowModal(true);
          }}
          className="mt-4 md:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl shadow-sm p-6 flex flex-col justify-between border ${
              plan.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.is_active}
                    onChange={() => toggleActive(plan)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${plan.price}
                <span className="text-base font-medium text-gray-500">/{plan.billing_cycle}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
              <ul className="space-y-3 text-sm text-gray-600 my-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-4 font-medium">
                {plan.subscriber_count} Active Subscribers
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-semibold text-sm hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-md font-semibold text-sm hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold text-gray-700">Website Integration</h3>
        <p className="text-sm text-gray-500 mt-1">Copy the code below to embed the subscription plans on your website.</p>
        <div className="mt-4 bg-gray-900 rounded-lg p-4 text-white font-mono text-sm relative">
          <button
            onClick={copyEmbedCode}
            className="absolute top-3 right-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-sans rounded px-2 py-1 transition-colors"
          >
            Copy
          </button>
          <pre><code>{`<div id="substrack-embed"></div>\n<script src="https://cdn.substrack.com/embed.js" async></script>`}</code></pre>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Basic Tier"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Ideal for startups and small businesses"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="29.99"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Feature description"
                      />
                      {formData.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFeature(index)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFeature}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add Feature
                  </button>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingPlan(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
