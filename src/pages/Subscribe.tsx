// src/pages/Subscribe.tsx - Public subscription page
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { StripeService } from '../services/stripeService'
import { Loader2, Check } from 'lucide-react'

export function Subscribe() {
  const { planId } = useParams<{ planId: string }>()
  const [plan, setPlan] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  useEffect(() => {
    loadPlanDetails()
  }, [planId])

  const loadPlanDetails = async () => {
    try {
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*, merchants(*)')
        .eq('id', planId)
        .eq('is_active', true)
        .single()

      if (planError) throw planError
      if (!planData) {
        setError('Plan not found or inactive')
        return
      }

      setPlan(planData)
      setMerchant((planData as any).merchants)
    } catch (err: any) {
      console.error('Error loading plan:', err)
      setError('Failed to load plan details')
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!plan?.stripe_price_id) {
      setError('Plan is not configured for payments')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const stripeService = new StripeService()
      const checkoutUrl = await stripeService.createSubscriptionCheckout(
        plan.stripe_price_id,
        customerEmail,
        customerName,
        plan.id,
        merchant.id
      )

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl
    } catch (err: any) {
      console.error('Error creating checkout:', err)
      setError('Failed to initiate payment. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
      </div>
    )
  }

  if (error && !plan) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center p-4'>
        <div className='bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center'>
          <div className='text-red-600 text-5xl mb-4'>⚠️</div>
          <h2 className='text-2xl font-bold text-gray-800 mb-2'>
            Plan Not Available
          </h2>
          <p className='text-gray-600'>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>
            Subscribe to {merchant?.business_name}
          </h1>
          <p className='text-gray-600'>
            Choose your plan and get started today
          </p>
        </div>

        <div className='grid md:grid-cols-2 gap-8'>
          {/* Plan Details */}
          <div className='bg-white rounded-xl shadow-lg p-8'>
            <h2 className='text-2xl font-bold text-gray-800 mb-2'>
              {plan.name}
            </h2>
            <p className='text-4xl font-bold text-blue-600 mb-4'>
              ₹{plan.price}
              <span className='text-lg font-normal text-gray-500'>
                /{plan.billing_cycle}
              </span>
            </p>
            <p className='text-gray-600 mb-6'>{plan.description}</p>

            <div className='border-t pt-6'>
              <h3 className='font-semibold text-gray-800 mb-4'>
                What's included:
              </h3>
              <ul className='space-y-3'>
                {plan.features.map((feature: string, idx: number) => (
                  <li key={idx} className='flex items-start'>
                    <Check className='w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5' />
                    <span className='text-gray-700'>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Subscription Form */}
          <div className='bg-white rounded-xl shadow-lg p-8'>
            <h2 className='text-2xl font-bold text-gray-800 mb-6'>
              Complete Your Subscription
            </h2>

            {error && (
              <div className='mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubscribe} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Full Name
                </label>
                <input
                  type='text'
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='John Doe'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Email Address
                </label>
                <input
                  type='email'
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='john@example.com'
                />
              </div>

              <div className='border-t pt-4 mt-6'>
                <div className='flex justify-between text-sm mb-2'>
                  <span className='text-gray-600'>Subtotal</span>
                  <span className='font-semibold'>₹{plan.price}</span>
                </div>
                <div className='flex justify-between text-sm mb-4'>
                  <span className='text-gray-600'>Billing Cycle</span>
                  <span className='font-semibold capitalize'>
                    {plan.billing_cycle}
                  </span>
                </div>
                <div className='flex justify-between text-lg font-bold border-t pt-4'>
                  <span>Total</span>
                  <span className='text-blue-600'>₹{plan.price}</span>
                </div>
              </div>

              <button
                type='submit'
                disabled={processing}
                className='w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
              >
                {processing ? (
                  <>
                    <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                    Processing...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </button>

              <p className='text-xs text-gray-500 text-center mt-4'>
                Your payment will be processed securely by Stripe
              </p>
            </form>
          </div>
        </div>

        {/* Trust Badges */}
        <div className='mt-8 text-center'>
          <div className='inline-flex items-center space-x-6 text-sm text-gray-600'>
            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-green-500 mr-2'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              Secure Payment
            </div>
            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-green-500 mr-2'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              Cancel Anytime
            </div>
            <div className='flex items-center'>
              <svg
                className='w-5 h-5 text-green-500 mr-2'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path d='M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z' />
                <path d='M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z' />
              </svg>
              Email Support
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
