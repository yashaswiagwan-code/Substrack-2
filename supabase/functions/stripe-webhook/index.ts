// supabase/functions/stripe-webhook/index.ts - COMPLETE FINAL VERSION
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import jsPDF from 'https://esm.sh/jspdf@2.5.1'
import 'https://esm.sh/jspdf-autotable@3.5.31'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

async function sendEmail(emailData: { to: string; from: string; subject: string; html: string; attachments?: any[] }) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify(emailData),
    })
    if (!response.ok) {
      console.error('❌ Email send failed:', await response.json())
      return false
    }
    console.log('✅ Email sent successfully')
    return true
  } catch (error) {
    console.error('💥 Email error:', error)
    return false
  }
}

async function generateAccessToken(subscriberId: string, merchantId: string) {
  try {
    const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-secret-key-change-this'
    const { data: subscriber, error } = await supabase.from('subscribers').select(`id, customer_email, customer_name, status, next_renewal_date, subscription_plans (id, name, features)`).eq('id', subscriberId).eq('merchant_id', merchantId).single()
    if (error || !subscriber) return null
    const payload = {
      sub: subscriber.customer_email, email: subscriber.customer_email, name: subscriber.customer_name, merchant_id: merchantId, subscriber_id: subscriber.id,
      plan_id: (subscriber.subscription_plans as any)?.id, plan_name: (subscriber.subscription_plans as any)?.name, features: (subscriber.subscription_plans as any)?.features || [],
      status: subscriber.status, expires_at: subscriber.next_renewal_date, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
    }
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', encoder.encode(JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${encodedHeader}.${encodedPayload}`))
    const signatureArray = new Uint8Array(signature)
    let binaryString = ''
    for (let i = 0; i < signatureArray.length; i++) binaryString += String.fromCharCode(signatureArray[i])
    const encodedSignature = btoa(binaryString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
  } catch (error) {
    console.error('❌ Error generating token:', error)
    return null
  }
}

function generateInvoicePDFBase64(data: any): string {
  const doc = new jsPDF()
  const primaryColor: [number, number, number] = [79, 70, 229]
  const textColor: [number, number, number] = [55, 65, 81]
  let currentY = 20
  doc.setFontSize(24)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text(data.merchantName, 20, currentY)
  doc.setFontSize(28)
  doc.setTextColor(...textColor)
  doc.text('INVOICE', 190, currentY, { align: 'right' })
  currentY += 15
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text(data.merchantEmail, 20, currentY)
  currentY += 5
  if (data.merchantPhone) { doc.text(data.merchantPhone, 20, currentY); currentY += 5 }
  if (data.merchantAddress) { const lines = doc.splitTextToSize(data.merchantAddress, 80); doc.text(lines, 20, currentY); currentY += lines.length * 5 }
  if (data.merchantGST) { doc.text(`GST: ${data.merchantGST}`, 20, currentY); currentY += 5 }
  currentY = Math.max(currentY, 60)
  doc.setLineWidth(0.5)
  doc.line(20, currentY, 190, currentY)
  currentY += 10
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Number:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(data.invoiceId, 60, currentY)
  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Date:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(data.invoiceDate, 60, currentY)
  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(22, 163, 74)
  doc.text('PAID', 60, currentY)
  doc.setTextColor(...textColor)
  const rightX = 120
  let rightY = currentY - 12
  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', rightX, rightY)
  rightY += 6
  doc.setFontSize(11)
  doc.text(data.customerName, rightX, rightY)
  rightY += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(data.customerEmail, rightX, rightY)
  currentY = Math.max(currentY, rightY) + 15
  doc.setTextColor(...textColor)
  const totalAmount = data.amount
  const baseAmount = totalAmount / 1.18
  const gstAmount = totalAmount - baseAmount
  ;(doc as any).autoTable({
    startY: currentY, head: [['Description', 'Details', 'Qty', 'Unit Price', 'Amount']],
    body: [[data.planName, data.billingCycle || 'Subscription', '1', `INR ${baseAmount.toFixed(2)}`, `INR ${baseAmount.toFixed(2)}`]],
    theme: 'striped', headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10, textColor: textColor },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 45 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 32.5, halign: 'right' }, 4: { cellWidth: 32.5, halign: 'right' } },
    margin: { left: 20, right: 20 },
  })
  const finalY = (doc as any).lastAutoTable.finalY + 10
  const totalsX = 125
  let totalsY = finalY
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX, totalsY)
  doc.text(`INR ${baseAmount.toFixed(2)}`, 190, totalsY, { align: 'right' })
  totalsY += 6
  doc.text('Tax (18%):', totalsX, totalsY)
  doc.text(`INR ${gstAmount.toFixed(2)}`, 190, totalsY, { align: 'right' })
  totalsY += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total Amount:', totalsX, totalsY)
  doc.setTextColor(...primaryColor)
  doc.text(`INR ${totalAmount.toFixed(2)}`, 190, totalsY, { align: 'right' })
  if (data.transactionId) {
    totalsY += 15
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textColor)
    doc.text('Payment Information:', 20, totalsY)
    totalsY += 5
    doc.setFont('helvetica', 'normal')
    doc.text(`Transaction ID: ${data.transactionId}`, 20, totalsY)
    totalsY += 4
    doc.text('Payment Method: Stripe', 20, totalsY)
  }
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 20
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Thank you for your business!', 105, footerY + 5, { align: 'center' })
  doc.text(`For queries, contact us at ${data.merchantEmail}`, 105, footerY + 10, { align: 'center' })
  return doc.output('datauristring').split(',')[1]
}

function generateInvoiceHTML(data: any): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.invoice-details{background:white;padding:20px;border-radius:8px;margin:20px 0;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.detail-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb}.detail-row:last-child{border-bottom:none}.footer{text-align:center;color:#6b7280;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}.paid-badge{color:#059669;font-weight:bold}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;font-size:28px">💳 Payment Received</h1><p style="margin:10px 0 0 0;opacity:0.9">Invoice #${data.invoiceId}</p></div><div class="content"><p style="font-size:16px">Dear ${data.customerName},</p><p>Thank you for your payment! Your invoice is attached to this email.</p><div class="invoice-details"><h3 style="margin-top:0;color:#374151">Payment Details</h3><div class="detail-row"><span><strong>Invoice ID:</strong></span><span>${data.invoiceId}</span></div><div class="detail-row"><span><strong>Date:</strong></span><span>${data.date}</span></div><div class="detail-row"><span><strong>Plan:</strong></span><span>${data.planName}</span></div><div class="detail-row"><span><strong>Amount:</strong></span><span class="paid-badge">INR ${data.amount.toFixed(2)}</span></div><div class="detail-row"><span><strong>Status:</strong></span><span class="paid-badge">PAID ✓</span></div></div><p style="font-size:14px;color:#6b7280">If you have any questions, please contact us at <a href="mailto:${data.merchantEmail}" style="color:#4f46e5">${data.merchantEmail}</a></p><div class="footer"><p><strong>${data.merchantName}</strong></p><p>This is an automated email. Please do not reply.</p></div></div></div></body></html>`
}

function generateSubscriptionConfirmationHTML(data: any): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:40px;text-align:center;border-radius:10px 10px 0 0}.success-icon{font-size:48px;margin-bottom:10px}.content{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}.subscription-box{background:white;padding:25px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.detail-row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e7eb}.detail-row:last-child{border-bottom:none}.info-box{background:#dbeafe;padding:15px;border-radius:6px;margin:20px 0;border-left:4px solid #3b82f6}.footer{text-align:center;color:#6b7280;font-size:12px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}ul{margin:10px 0;padding-left:20px}li{margin:5px 0}</style></head><body><div class="container"><div class="header"><div class="success-icon">✅</div><h1 style="margin:0;font-size:32px">Subscription Confirmed!</h1><p style="font-size:18px;margin:10px 0 0 0;opacity:0.9">Welcome to ${data.planName}</p></div><div class="content"><p style="font-size:16px">Hi ${data.customerName},</p><p>Thank you for subscribing! Your subscription to <strong>${data.planName}</strong> is now active and ready to use.</p><div class="subscription-box"><h3 style="margin-top:0;color:#059669">📋 Subscription Details</h3><div class="detail-row"><span><strong>Plan:</strong></span><span>${data.planName}</span></div><div class="detail-row"><span><strong>Amount:</strong></span><span style="font-weight:bold">INR ${data.amount.toFixed(2)} / ${data.billingCycle}</span></div><div class="detail-row"><span><strong>Start Date:</strong></span><span>${data.startDate}</span></div><div class="detail-row"><span><strong>Next Billing:</strong></span><span>${data.nextBillingDate}</span></div></div><div class="info-box"><p style="margin:0 0 10px 0"><strong>💡 What happens next?</strong></p><ul style="margin:10px 0"><li>Your subscription is active immediately</li><li>You'll receive an invoice for each payment</li><li>Automatic renewal on ${data.nextBillingDate}</li><li>You can manage your subscription anytime</li></ul></div><p style="margin-top:30px;font-size:14px">Need help? Contact us at <a href="mailto:${data.merchantEmail}" style="color:#4f46e5">${data.merchantEmail}</a></p><div class="footer"><p><strong>${data.merchantName}</strong></p><p>You're receiving this email because you subscribed to our service.</p></div></div></div></body></html>`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })
  try {
    const body = await req.text()
    const parsedBody = JSON.parse(body)
    let merchantId = parsedBody.data?.object?.metadata?.merchant_id
    if (!merchantId && parsedBody.data?.object?.parent?.subscription_details?.metadata) merchantId = parsedBody.data.object.parent.subscription_details.metadata.merchant_id
    if (!merchantId && parsedBody.data?.object?.lines?.data?.[0]?.metadata?.merchant_id) merchantId = parsedBody.data.object.lines.data[0].metadata.merchant_id
    if (!merchantId) {
      const subscriptionId = parsedBody.data?.object?.subscription
      if (subscriptionId) {
        const { data: subscriber } = await supabase.from('subscribers').select('merchant_id').eq('stripe_subscription_id', subscriptionId).single()
        if (subscriber) merchantId = subscriber.merchant_id
      }
    }
    if (!merchantId) return new Response('No merchant_id found', { status: 400 })
    const { data: merchant, error: merchantError } = await supabase.from('merchants').select('stripe_api_key, stripe_webhook_secret, business_name, email, bank_account, gst_number, phone, redirect_url').eq('id', merchantId).single()
    if (merchantError || !merchant?.stripe_api_key) return new Response('Merchant not found', { status: 400 })
    if (!merchant.stripe_webhook_secret) return new Response('Webhook secret not configured', { status: 400 })
    const stripe = new Stripe(merchant.stripe_api_key, { apiVersion: '2024-11-20.acacia', httpClient: Stripe.createFetchHttpClient() })
    const event = await stripe.webhooks.constructEventAsync(body, signature, merchant.stripe_webhook_secret, undefined, Stripe.createSubtleCryptoProvider())
    console.log('📧 Processing:', event.type)
    switch (event.type) {
      case 'checkout.session.completed': await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe, merchant); break
      case 'customer.subscription.updated': await handleSubscriptionUpdated(event.data.object as Stripe.Subscription); break
      case 'customer.subscription.deleted': await handleSubscriptionDeleted(event.data.object as Stripe.Subscription); break
      case 'invoice.payment_succeeded': await handlePaymentSucceeded(event.data.object as Stripe.Invoice, merchant); break
      case 'invoice.payment_failed': await handlePaymentFailed(event.data.object as Stripe.Invoice); break
    }
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' }, status: 200 })
  } catch (err: any) {
    console.error('💥 Webhook error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe, merchant: any) {
  const { customer, subscription, metadata, customer_email } = session
  const { plan_id, merchant_id, customer_name } = metadata as any
  if (!subscription) return
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription as string)
    const { data: plan } = await supabase.from('subscription_plans').select('name, price, currency, billing_cycle').eq('id', plan_id).single()
    const startDate = stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000).toISOString() : new Date().toISOString()
    const nextRenewalDate = stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000).toISOString() : null
    const { data: newSubscriber, error } = await supabase.from('subscribers').insert({ merchant_id, plan_id, customer_name, customer_email, status: 'active', stripe_subscription_id: subscription, stripe_customer_id: customer, start_date: startDate, next_renewal_date: nextRenewalDate }).select().single()
    if (error) throw error
    await supabase.rpc('increment_subscriber_count', { p_plan_id: plan_id })
    if (plan && customer_email) {
      const html = generateSubscriptionConfirmationHTML({ customerName: customer_name, planName: plan.name, amount: plan.price, billingCycle: plan.billing_cycle, startDate: formatDate(stripeSubscription.current_period_start), nextBillingDate: formatDate(stripeSubscription.current_period_end), merchantName: merchant.business_name, merchantEmail: merchant.email })
      await sendEmail({ to: customer_email, from: `${merchant.business_name} <onboarding@resend.dev>`, subject: `Welcome to ${plan.name} - Subscription Confirmed! 🎉`, html })
    }
    if (newSubscriber && newSubscriber.id && merchant.redirect_url) {
      const accessToken = await generateAccessToken(newSubscriber.id, merchant_id)
      if (accessToken) {
        await supabase.from('access_tokens').insert({ merchant_id, subscriber_id: newSubscriber.id, token: accessToken, stripe_session_id: session.id, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
        console.log('✅ Token stored with session_id:', session.id)
      }
    }
  } catch (error) {
    console.error('💥 Failed to process checkout:', error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const nextRenewalDate = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
  await supabase.from('subscribers').update({ status: subscription.status === 'active' ? 'active' : subscription.status, next_renewal_date: nextRenewalDate }).eq('stripe_subscription_id', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { data: subscriber } = await supabase.from('subscribers').select('plan_id').eq('stripe_subscription_id', subscription.id).single()
  await supabase.from('subscribers').update({ status: 'cancelled' }).eq('stripe_subscription_id', subscription.id)
  if (subscriber) await supabase.rpc('decrement_subscriber_count', { p_plan_id: subscriber.plan_id })
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice, merchant: any) {
  let subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subscriptionId) return
  const { data: subscribers } = await supabase.from('subscribers').select('id, merchant_id, plan_id, customer_name, customer_email, subscription_plans(name, price, currency, billing_cycle)').eq('stripe_subscription_id', subscriptionId)
  if (!subscribers || subscribers.length === 0) return
  const subscriber = subscribers[0]
  const plan = (subscriber as any).subscription_plans
  await supabase.from('subscribers').update({ status: 'active', last_payment_date: new Date().toISOString(), last_payment_amount: (invoice.amount_paid || 0) / 100 }).eq('id', subscriber.id)
  const invoiceId = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${invoice.id.substring(3, 11).toUpperCase()}`
  await supabase.from('payment_transactions').insert({ merchant_id: subscriber.merchant_id, subscriber_id: subscriber.id, plan_id: subscriber.plan_id, amount: (invoice.amount_paid || 0) / 100, status: 'success', stripe_payment_id: invoice.id, payment_date: new Date().toISOString() })
  if (subscriber.customer_email && plan) {
    try {
      const pdfBase64 = generateInvoicePDFBase64({ invoiceId, invoiceDate: formatDate(invoice.created), merchantName: merchant.business_name, merchantEmail: merchant.email, merchantAddress: merchant.bank_account, merchantGST: merchant.gst_number, merchantPhone: merchant.phone, customerName: subscriber.customer_name, customerEmail: subscriber.customer_email, planName: plan.name, amount: (invoice.amount_paid || 0) / 100, status: 'success', transactionId: invoice.id, billingCycle: plan.billing_cycle })
      const html = generateInvoiceHTML({ invoiceId, merchantName: merchant.business_name, merchantEmail: merchant.email, customerName: subscriber.customer_name, planName: plan.name, amount: (invoice.amount_paid || 0) / 100, date: formatDate(invoice.created) })
      await sendEmail({ to: subscriber.customer_email, from: `${merchant.business_name} <onboarding@resend.dev>`, subject: `Invoice ${invoiceId} from ${merchant.business_name}`, html, attachments: [{ filename: `${invoiceId}.pdf`, content: pdfBase64, content_type: 'application/pdf' }] })
    } catch (pdfError) {
      const html = generateInvoiceHTML({ invoiceId, merchantName: merchant.business_name, merchantEmail: merchant.email, customerName: subscriber.customer_name, planName: plan.name, amount: (invoice.amount_paid || 0) / 100, date: formatDate(invoice.created) })
      await sendEmail({ to: subscriber.customer_email, from: `${merchant.business_name} <onboarding@resend.dev>`, subject: `Invoice ${invoiceId} from ${merchant.business_name}`, html })
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  let subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subscriptionId) return
  const { data: subscriber } = await supabase.from('subscribers').select('id, merchant_id, plan_id').eq('stripe_subscription_id', subscriptionId).single()
  if (!subscriber) return
  await supabase.from('subscribers').update({ status: 'failed' }).eq('id', subscriber.id)
  await supabase.from('payment_transactions').insert({ merchant_id: subscriber.merchant_id, subscriber_id: subscriber.id, plan_id: subscriber.plan_id, amount: (invoice.amount_due || 0) / 100, status: 'failed', stripe_payment_id: invoice.id, payment_date: new Date().toISOString() })
}