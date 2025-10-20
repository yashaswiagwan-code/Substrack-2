/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-nocheck
import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase, SubscriptionPlan } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check, ExternalLink } from 'lucide-react';
import { StripeService } from '../services/stripeService';

export function Plans() {
  const { user, merchant } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly',
    features: [''],
  });

  useEffect(() => {
    if (user) loadPlans();
  }, [user]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('merchant_id', user!.id)
      .order('created_at', { ascending: false });
    if (error) console.error('Error loading plans:', error);
    else setPlans(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const planData = {
        merchant_id: user!.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: 'INR',
        billing_cycle: formData.billing_cycle,
        features: formData.features.filter((f) => f.trim() !== ''),
        is_active: true,
      };

      if (editingPlan) {
        // Update locally
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id);
        if (error) throw error;

        // Update in Stripe
        if (merchant?.stripe_api_key && editingPlan.stripe_product_id) {
          try {
            const stripeService = new StripeService(merchant.stripe_api_key);
            await stripeService.updatePlanInStripe(
              editingPlan.stripe_product_id,
              formData.name,
              formData.description
            );
          } catch (stripeError) {
            console.error('Failed to update plan in Stripe:', stripeError);
            alert('Plan updated locally, but failed to sync with Stripe.');
          }
        }
      } else {
        // Create new plan
        const { data: newPlan, error } = await supabase
          .from('subscription_plans')
          .insert(planData)
          .select()
          .single();
        if (error) throw error;

        // Sync with Stripe
        if (merchant?.stripe_api_key && newPlan) {
          try {
            const stripeService = new StripeService(merchant.stripe_api_key);
            await stripeService.syncPlanToStripe(
              newPlan.id,
              formData.name,
              formData.description,
              parseFloat(formData.price),
              'INR',
              formData.billing_cycle
            );
          } catch (stripeError) {
            console.error('Failed to create plan in Stripe:', stripeError);
            alert('Plan created locally, but failed to sync with Stripe.');
          }
        }
      }

      setShowModal(false);
      setEditingPlan(null);
      resetForm();
      loadPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan: ' + error.message);
    } finally {
      setLoading(false);
    }
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
    if (!confirm('Are you sure you want to delete this plan?')) return;

    const plan = plans.find((p) => p.id === planId);

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;

      // Archive in Stripe
      if (merchant?.stripe_api_key && plan?.stripe_product_id) {
        try {
          const stripeService = new StripeService(merchant.stripe_api_key);
          await stripeService.archivePlanInStripe(plan.stripe_product_id);
        } catch (stripeError) {
          console.error('Failed to archive plan in Stripe:', stripeError);
        }
      }

      loadPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan: ' + error.message);
    }
  };

  const toggleActive = async (plan: SubscriptionPlan) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: !plan.is_active })
      .eq('id', plan.id);
    if (error) console.error('Error toggling plan status:', error);
    else loadPlans();
  };

  const getPaymentLink = (plan: SubscriptionPlan) => {
    if (!plan.stripe_price_id) return '#';
    return `${window.location.origin}/subscribe/${plan.id}`;
  };

  const copyPaymentLink = (plan: SubscriptionPlan) => {
    const link = getPaymentLink(plan);
    navigator.clipboard.writeText(link);
    alert('Payment link copied!');
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

  const addFeature = () => setFormData({ ...formData, features: [...formData.features, ''] });
  const updateFeature = (i: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[i] = value;
    setFormData({ ...formData, features: newFeatures });
  };
  const removeFeature = (i: number) => {
    setFormData({ ...formData, features: formData.features.filter((_, idx) => idx !== i) });
  };
  const copyEmbedCode = () => {
    const code = `<div id="substrack-embed"></div>\n<script src="https://cdn.substrack.com/embed.js" async></script>`;
    navigator.clipboard.writeText(code);
    alert('Embed code copied!');
  };

  return (
    <DashboardLayout title="Plans">
      {!merchant?.stripe_api_key && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Stripe not configured</h3>
              <p className="text-sm text-yellow-700 mt-1">
                To accept payments, please configure your Stripe API keys in{' '}
                <a href="/settings" className="underline font-semibold">Settings</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ...rest of your JSX remains unchanged, including modal, plans list, embed code */}
    </DashboardLayout>
  );
}
