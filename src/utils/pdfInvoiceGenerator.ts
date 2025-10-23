// src/utils/pdfInvoiceGenerator.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface InvoiceData {
  invoiceId: string
  invoiceDate: string
  dueDate?: string

  // Merchant Info
  merchantName: string
  merchantEmail: string
  merchantAddress?: string
  merchantGST?: string
  merchantPhone?: string

  // Customer Info
  customerName: string
  customerEmail: string

  // Payment Info
  planName: string
  planDescription?: string
  amount: number
  currency: string
  status: string

  // Additional Info
  paymentMethod?: string
  transactionId?: string
  billingCycle?: string
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF()

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229] // Indigo
  const textColor: [number, number, number] = [55, 65, 81] // Gray-700
  const lightGray: [number, number, number] = [243, 244, 246] // Gray-100

  let currentY = 20

  // ===============================
  // HEADER SECTION
  // ===============================

  // Company Logo/Name (Left)
  doc.setFontSize(24)
  doc.setTextColor(...primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text(data.merchantName, 20, currentY)

  // Invoice Title (Right)
  doc.setFontSize(28)
  doc.setTextColor(...textColor)
  doc.text('INVOICE', 200, currentY, { align: 'right' })

  currentY += 10

  // Merchant Contact Info
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // Gray-500
  doc.setFont('helvetica', 'normal')
  doc.text(data.merchantEmail, 20, currentY)

  if (data.merchantPhone) {
    currentY += 5
    doc.text(data.merchantPhone, 20, currentY)
  }

  if (data.merchantAddress) {
    currentY += 5
    doc.text(data.merchantAddress, 20, currentY)
  }

  if (data.merchantGST) {
    currentY += 5
    doc.text(`GST: ${data.merchantGST}`, 20, currentY)
  }

  currentY = 45 // Reset for next section

  // Horizontal Line
  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.5)
  doc.line(20, currentY, 190, currentY)

  currentY += 10

  // ===============================
  // INVOICE DETAILS
  // ===============================

  // Left Column: Invoice Info
  doc.setFontSize(10)
  doc.setTextColor(...textColor)
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Number:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(data.invoiceId, 55, currentY)

  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Date:', 20, currentY)
  doc.setFont('helvetica', 'normal')
  doc.text(data.invoiceDate, 55, currentY)

  if (data.dueDate) {
    currentY += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Due Date:', 20, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(data.dueDate, 55, currentY)
  }

  currentY += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', 20, currentY)
  doc.setFont('helvetica', 'normal')

  // Status badge
  if (data.status === 'success') {
    doc.setTextColor(22, 163, 74) // Green
    doc.text('PAID', 55, currentY)
  } else if (data.status === 'failed') {
    doc.setTextColor(220, 38, 38) // Red
    doc.text('FAILED', 55, currentY)
  } else {
    doc.setTextColor(234, 179, 8) // Yellow
    doc.text('PENDING', 55, currentY)
  }

  // Reset text color
  doc.setTextColor(...textColor)

  // Right Column: Customer Info
  const rightX = 120
  let rightY = currentY - 18

  doc.setFont('helvetica', 'bold')
  doc.text('Bill To:', rightX, rightY)

  rightY += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(data.customerName, rightX, rightY)

  rightY += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(data.customerEmail, rightX, rightY)

  currentY += 15

  // ===============================
  // ITEMS TABLE
  // ===============================

  doc.setTextColor(...textColor)

  const tableData = [
    [
      data.planName,
      data.planDescription || data.billingCycle || 'Subscription',
      '1',
      `${data.currency} ${data.amount.toFixed(2)}`,
      `${data.currency} ${data.amount.toFixed(2)}`,
    ],
  ]

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
  })

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // ===============================
  // TOTALS SECTION
  // ===============================

  const totalsX = 130
  let totalsY = finalY

  // Subtotal
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', totalsX, totalsY)
  doc.text(`${data.currency} ${data.amount.toFixed(2)}`, 190, totalsY, {
    align: 'right',
  })

  totalsY += 6

  // Tax (if applicable) - you can add tax calculation here
  // doc.text('Tax (0%):', totalsX, totalsY);
  // doc.text(`${data.currency} 0.00`, 190, totalsY, { align: 'right' });
  // totalsY += 6;

  // Total Line
  doc.setDrawColor(...lightGray)
  doc.line(totalsX, totalsY, 190, totalsY)
  totalsY += 8

  // Total Amount
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Total:', totalsX, totalsY)
  doc.setTextColor(...primaryColor)
  doc.text(`${data.currency} ${data.amount.toFixed(2)}`, 190, totalsY, {
    align: 'right',
  })

  doc.setTextColor(...textColor)

  // ===============================
  // PAYMENT INFO
  // ===============================

  if (data.transactionId || data.paymentMethod) {
    totalsY += 15
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Information:', 20, totalsY)

    totalsY += 5
    doc.setFont('helvetica', 'normal')

    if (data.paymentMethod) {
      doc.text(`Payment Method: ${data.paymentMethod}`, 20, totalsY)
      totalsY += 4
    }

    if (data.transactionId) {
      doc.text(`Transaction ID: ${data.transactionId}`, 20, totalsY)
    }
  }

  // ===============================
  // FOOTER
  // ===============================

  const footerY = 270
  doc.setDrawColor(...lightGray)
  doc.line(20, footerY, 190, footerY)

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('Thank you for your business!', 105, footerY + 5, {
    align: 'center',
  })
  doc.text(
    'For any queries, please contact us at ' + data.merchantEmail,
    105,
    footerY + 10,
    { align: 'center' }
  )

  // ===============================
  // SAVE PDF
  // ===============================

  doc.save(`${data.invoiceId}.pdf`)
}

// Helper function to format date
export const formatInvoiceDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
