/**
 * Deposit Invoice Generator
 * Generates a 30% deposit invoice as an HTML blob URL.
 */

import { COMPANY } from '../config/company';

interface DepositInvoiceData {
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectAddress: string;
  totalAmount: number;
  depositPercent: number;
  invoiceDate: string;
}

export function generateDepositInvoice(data: DepositInvoiceData): string {
  const {
    jobNumber, clientName, clientEmail, clientPhone,
    projectAddress, totalAmount, depositPercent, invoiceDate
  } = data;

  const depositAmount = Math.round(totalAmount * (depositPercent / 100));
  const hst = Math.round(depositAmount * 0.13);
  const invoiceTotal = depositAmount + hst;
  const formattedDate = new Date(invoiceDate).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const dueDate = new Date(new Date(invoiceDate).getTime() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  const invoiceNum = `INV-${jobNumber.replace(/[^A-Z0-9]/gi, '')}-DEP`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #059669; margin-bottom: 32px; }
.header h1 { font-size: 24px; font-weight: 800; color: #059669; letter-spacing: 2px; text-transform: uppercase; }
.header p { color: #666; font-size: 11px; margin-top: 2px; }
.invoice-badge { background: #059669; color: white; padding: 8px 20px; border-radius: 8px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
.section { margin-bottom: 24px; }
.section-title { font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-item label { display: block; font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
.info-item span { font-size: 14px; font-weight: 600; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; }
th { text-align: left; font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
td { padding: 12px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.total-row td { font-weight: 700; border-top: 2px solid #059669; border-bottom: none; font-size: 16px; padding-top: 14px; }
.amount { color: #059669; font-size: 24px; font-weight: 800; }
.payment-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-top: 24px; }
.payment-box h3 { font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.payment-box p { font-size: 13px; color: #444; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #999; }
@media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div>
    <h1>${COMPANY.name}</h1>
    <p>${COMPANY.tagline} | ${COMPANY.fullAddress}</p>
    <p>${COMPANY.phone} | ${COMPANY.email}</p>
  </div>
  <div class="invoice-badge">Deposit Invoice</div>
</div>

<div class="section">
  <div class="section-title">Invoice Details</div>
  <div class="info-grid">
    <div class="info-item"><label>Invoice Number</label><span>${invoiceNum}</span></div>
    <div class="info-item"><label>Invoice Date</label><span>${formattedDate}</span></div>
    <div class="info-item"><label>Due Date</label><span>${dueDate}</span></div>
    <div class="info-item"><label>Estimate Reference</label><span>${jobNumber}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Bill To</div>
  <div class="info-grid">
    <div class="info-item"><label>Client</label><span>${clientName}</span></div>
    <div class="info-item"><label>Phone</label><span>${clientPhone || 'N/A'}</span></div>
    <div class="info-item" style="grid-column: span 2;"><label>Project Address</label><span>${projectAddress}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Invoice Summary</div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>Project Deposit (${depositPercent}% of $${totalAmount.toLocaleString()} project total)</td>
        <td style="text-align:right;">$${depositAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td>HST (13%)</td>
        <td style="text-align:right;">$${hst.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td>Amount Due</td>
        <td style="text-align:right;" class="amount">$${invoiceTotal.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="payment-box">
  <h3>Payment Instructions</h3>
  <p>Please send your deposit via e-Transfer to: <strong>${COMPANY.email}</strong></p>
  <p style="margin-top:8px;">Payment is due within 7 days to secure your build slot. Upon receipt, your project will move into the planning and scheduling phase.</p>
</div>

<div class="section" style="margin-top:24px;">
  <div class="section-title">Full Payment Schedule</div>
  <table>
    <thead><tr><th>Milestone</th><th>Percentage</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>
      <tr><td>Deposit (this invoice)</td><td>30%</td><td style="text-align:right;">$${depositAmount.toLocaleString()}</td></tr>
      <tr><td>Upon Material Delivery</td><td>30%</td><td style="text-align:right;">$${Math.round(totalAmount * 0.3).toLocaleString()}</td></tr>
      <tr><td>Final Handover</td><td>40%</td><td style="text-align:right;">$${Math.round(totalAmount * 0.4).toLocaleString()}</td></tr>
    </tbody>
  </table>
</div>

<div class="footer">
  <p>${COMPANY.name} | ${COMPANY.fullAddress} | ${COMPANY.phone} | ${COMPANY.website}</p>
  <p>Thank you for choosing ${COMPANY.name}.</p>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}
