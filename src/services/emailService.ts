// src/services/emailService.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EmailInvoiceData {
  invoiceId: string;
  invoiceDate: string;
  merchantName: string;
  merchantEmail: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  transactionId?: string;
}

interface SubscriptionConfirmationData {
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: string;
  nextBillingDate: string;
  merchantName: string;
  merchantEmail: string;
  subscriptionId: string;
}

// Generate PDF as base64 string for email attachment
export const generateInvoicePDFBase64 = (data: EmailInvoiceData): string => {
  const doc = new jsPDF();
  
  const primaryColor: [number, number, number] = [79, 70, 229];
  const textColor: [number, number, number] = [55, 65, 81];
  const lightGray: [number, number, number] = [243, 244, 246];
  
  let currentY = 20;
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(data.merchantName, 20, currentY);
  
  doc.setFontSize(28);
  doc.setTextColor(...textColor);
  doc.text('INVOICE', 200, currentY, { align: 'right' });
  
  currentY += 10;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(data.merchantEmail, 20, currentY);
  
  currentY = 45;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.line(20, currentY, 190, currentY);
  
  currentY += 10;
  
  // Invoice details
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceId, 55, currentY);
  
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceDate, 55, currentY);
  
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, currentY);
  doc.setFont('helvetica', 'normal');
  
  if (data.status === 'success') {
    doc.setTextColor(22, 163, 74);
    doc.text('PAID', 55, currentY);
  }
  
  doc.setTextColor(...textColor);
  
  // Customer info
  const rightX = 120;
  let rightY = currentY - 12;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', rightX, rightY);
  
  rightY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(data.customerName, rightX, rightY);
  
  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(data.customerEmail, rightX, rightY);
  
  currentY += 15;
  doc.setTextColor(...textColor);
  
  // Items table
  const tableData = [
    [
      data.planName,
      'Subscription',
      '1',
      `${data.currency} ${data.amount.toFixed(2)}`,
      `${data.currency} ${data.amount.toFixed(2)}`,
    ],
  ];
  
  autoTable(doc, {
    startY: currentY,
    head: [['Description', 'Details', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 10,
      textColor: textColor,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Totals
  const totalsX = 130;
  let totalsY = finalY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, totalsY);
  doc.text(`${data.currency} ${data.amount.toFixed(2)}`, 190, totalsY, { align: 'right' });
  
  totalsY += 6;
  doc.setDrawColor(...lightGray);
  doc.line(totalsX, totalsY, 190, totalsY);
  totalsY += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsX, totalsY);
  doc.setTextColor(...primaryColor);
  doc.text(`${data.currency} ${data.amount.toFixed(2)}`, 190, totalsY, { align: 'right' });
  
  // Footer
  const footerY = 270;
  doc.setDrawColor(...lightGray);
  doc.line(20, footerY, 190, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, footerY + 5, { align: 'center' });
  
  // Convert to base64
  return doc.output('datauristring').split(',')[1];
};

// Email templates
export const getInvoiceEmailHTML = (data: EmailInvoiceData): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Received</h1>
      <p>Invoice #${data.invoiceId}</p>
    </div>
    <div class="content">
      <p>Dear ${data.customerName},</p>
      <p>Thank you for your payment. Your invoice is attached to this email.</p>
      
      <div class="invoice-details">
        <h3 style="margin-top: 0;">Payment Details</h3>
        <div class="detail-row">
          <span><strong>Invoice ID:</strong></span>
          <span>${data.invoiceId}</span>
        </div>
        <div class="detail-row">
          <span><strong>Date:</strong></span>
          <span>${data.invoiceDate}</span>
        </div>
        <div class="detail-row">
          <span><strong>Plan:</strong></span>
          <span>${data.planName}</span>
        </div>
        <div class="detail-row">
          <span><strong>Amount:</strong></span>
          <span style="color: #059669; font-weight: bold;">${data.currency} ${data.amount.toFixed(2)}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span><strong>Status:</strong></span>
          <span style="color: #059669; font-weight: bold;">PAID</span>
        </div>
      </div>
      
      <p>If you have any questions about this invoice, please contact us at ${data.merchantEmail}</p>
      
      <div class="footer">
        <p>This is an automated email from ${data.merchantName}</p>
        <p>${data.merchantEmail}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export const getSubscriptionConfirmationHTML = (data: SubscriptionConfirmationData): string => {
  const manageUrl = `${window.location.origin}/manage-subscription/${data.subscriptionId}`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
    .success-icon { font-size: 48px; margin-bottom: 10px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .subscription-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #4338ca; }
    .info-box { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✅</div>
      <h1>Subscription Confirmed!</h1>
      <p style="font-size: 18px; margin: 10px 0 0 0;">Welcome to ${data.planName}</p>
    </div>
    <div class="content">
      <p style="font-size: 16px;">Hi ${data.customerName},</p>
      <p>Thank you for subscribing! Your subscription to <strong>${data.planName}</strong> is now active.</p>
      
      <div class="subscription-box">
        <h3 style="margin-top: 0; color: #059669;">📋 Subscription Details</h3>
        <div class="detail-row">
          <span><strong>Plan:</strong></span>
          <span>${data.planName}</span>
        </div>
        <div class="detail-row">
          <span><strong>Amount:</strong></span>
          <span style="font-weight: bold;">${data.currency} ${data.amount.toFixed(2)} / ${data.billingCycle}</span>
        </div>
        <div class="detail-row">
          <span><strong>Start Date:</strong></span>
          <span>${data.startDate}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span><strong>Next Billing:</strong></span>
          <span>${data.nextBillingDate}</span>
        </div>
      </div>
      
      <div class="info-box">
        <p style="margin: 0;"><strong>💡 What happens next?</strong></p>
        <ul style="margin: 10px 0;">
          <li>Your subscription is active immediately</li>
          <li>You'll receive an invoice for each payment</li>
          <li>Automatic renewal on ${data.nextBillingDate}</li>
          <li>Cancel anytime from the link below</li>
        </ul>
      </div>
      
      <center>
        <a href="${manageUrl}" class="button">Manage Subscription</a>
      </center>
      
      <p style="margin-top: 30px;">Need help? Contact us at <a href="mailto:${data.merchantEmail}">${data.merchantEmail}</a></p>
      
      <div class="footer">
        <p><strong>${data.merchantName}</strong></p>
        <p>You're receiving this email because you subscribed to our service.</p>
        <p style="margin-top: 10px;">
          <a href="${manageUrl}" style="color: #4f46e5; text-decoration: none;">Manage Subscription</a> | 
          <a href="mailto:${data.merchantEmail}" style="color: #4f46e5; text-decoration: none;">Contact Support</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// Send email via Supabase Edge Function
export const sendInvoiceEmail = async (
  invoiceData: EmailInvoiceData
): Promise<boolean> => {
  try {
    const pdfBase64 = generateInvoicePDFBase64(invoiceData);
    const htmlContent = getInvoiceEmailHTML(invoiceData);

    const { data, error } = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: invoiceData.customerEmail,
          from: invoiceData.merchantEmail,
          subject: `Invoice ${invoiceData.invoiceId} from ${invoiceData.merchantName}`,
          html: htmlContent,
          attachments: [
            {
              filename: `${invoiceData.invoiceId}.pdf`,
              content: pdfBase64,
              encoding: 'base64',
            },
          ],
        }),
      }
    ).then((res) => res.json());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return false;
  }
};

export const sendSubscriptionConfirmation = async (
  confirmationData: SubscriptionConfirmationData
): Promise<boolean> => {
  try {
    const htmlContent = getSubscriptionConfirmationHTML(confirmationData);

    const { data, error } = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: confirmationData.customerEmail,
          from: confirmationData.merchantEmail,
          subject: `Welcome to ${confirmationData.planName} - Subscription Confirmed`,
          html: htmlContent,
        }),
      }
    ).then((res) => res.json());

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
};