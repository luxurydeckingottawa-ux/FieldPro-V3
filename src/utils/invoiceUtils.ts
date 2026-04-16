import { Invoice, InvoiceType, Job } from '../types';
import { COMPANY } from '../config/company';

/** Escape HTML special characters to prevent XSS in document.write output */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const yearInvoices = existingInvoices.filter(inv =>
    inv.invoiceNumber.startsWith(`INV-${year}-`)
  );
  const next = yearInvoices.length + 1;
  return `INV-${year}-${String(next).padStart(3, '0')}`;
}

export function createInvoice(
  job: Job,
  type: InvoiceType,
  allInvoices: Invoice[]
): Invoice {
  const base = job.estimateAmount || 0;
  const pctMap: Record<InvoiceType, number> = {
    deposit: 0.30,
    material_delivery: 0.30,
    final_payment: 0.40,
  };
  const labelMap: Record<InvoiceType, string> = {
    deposit: '30% Deposit -- Project Commencement',
    material_delivery: '30% Progress Payment -- Material Delivery',
    final_payment: '40% Final Payment -- Project Completion',
  };

  const pct = pctMap[type];
  const subtotal = Math.round(base * pct * 100) / 100;
  const hstRate = 0.13;
  const hstAmount = Math.round(subtotal * hstRate * 100) / 100;
  const total = subtotal + hstAmount;

  const clientName = job.clientName || 'Client';
  const address = job.projectAddress || '';

  return {
    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    invoiceNumber: generateInvoiceNumber(allInvoices),
    jobId: job.id,
    customerName: clientName,
    customerPhone: job.clientPhone || '',
    customerEmail: job.clientEmail || '',
    jobTitle: job.projectAddress || job.jobNumber || 'Deck Project',
    jobAddress: address,
    type,
    status: 'draft',
    subtotal,
    hstRate,
    hstAmount,
    total,
    description: labelMap[type],
    issuedDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
}

export function printInvoice(invoice: Invoice): void {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '\u2014';

  const statusBadge =
    invoice.status === 'paid'
      ? `<div style="display:inline-block;padding:4px 12px;background:#d1fae5;color:#065f46;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">PAID ${invoice.paidDate ? '\u2022 ' + formatDate(invoice.paidDate) : ''}</div>`
      : invoice.status === 'sent'
      ? `<div style="display:inline-block;padding:4px 12px;background:#fef3c7;color:#92400e;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">SENT -- AWAITING PAYMENT</div>`
      : `<div style="display:inline-block;padding:4px 12px;background:#f3f4f6;color:#374151;border-radius:20px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;">DRAFT</div>`;

  // SECURITY: Escape all user-sourced fields before HTML interpolation
  const safeName = escapeHtml(invoice.customerName || '');
  const safePhone = escapeHtml(invoice.customerPhone || '');
  const safeEmail = escapeHtml(invoice.customerEmail || '');
  const safeJobTitle = escapeHtml(invoice.jobTitle || '');
  const safeJobAddress = escapeHtml(invoice.jobAddress || '');
  const safeDescription = escapeHtml(invoice.description || '');
  const safeInvNum = escapeHtml(invoice.invoiceNumber || '');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${safeInvNum} \u2014 ${COMPANY.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: #fff; padding: 60px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 3px solid #c9a84c; }
  .company-name { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; color: #111; }
  .company-sub { font-size: 12px; color: #666; margin-top: 4px; }
  .invoice-label { text-align: right; }
  .invoice-number { font-size: 22px; font-weight: 900; color: #c9a84c; }
  .invoice-date { font-size: 12px; color: #666; margin-top: 4px; }
  .billing-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .billing-block h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #999; margin-bottom: 8px; }
  .billing-block p { font-size: 14px; color: #111; line-height: 1.6; }
  .billing-block .name { font-weight: 700; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  thead th { background: #111; color: #fff; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
  thead th:last-child { text-align: right; }
  tbody td { padding: 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; vertical-align: top; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  .totals { margin-left: auto; width: 300px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e5e7eb; }
  .totals-row.subtotal { color: #555; }
  .totals-row.hst { color: #555; }
  .totals-row.total { font-weight: 900; font-size: 18px; color: #111; border-bottom: none; border-top: 2px solid #111; padding-top: 12px; margin-top: 4px; }
  .status-section { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .footer { margin-top: 60px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; line-height: 1.8; }
  @media print {
    body { padding: 40px; }
    @page { margin: 1cm; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="company-name">${COMPANY.name}</div>
    <div class="company-sub">${COMPANY.fullAddress} \u00b7 ${COMPANY.website} \u00b7 ${COMPANY.phone}</div>
  </div>
  <div class="invoice-label">
    <div class="invoice-number">${safeInvNum}</div>
    <div class="invoice-date">Issued: ${formatDate(invoice.issuedDate)}</div>
    ${invoice.dueDate ? `<div class="invoice-date">Due: ${formatDate(invoice.dueDate)}</div>` : ''}
  </div>
</div>

<div class="billing-section">
  <div class="billing-block">
    <h4>Bill To</h4>
    <p class="name">${safeName}</p>
    ${invoice.customerPhone ? `<p>${safePhone}</p>` : ''}
    ${invoice.customerEmail ? `<p>${safeEmail}</p>` : ''}
  </div>
  <div class="billing-block">
    <h4>Project</h4>
    <p class="name">${safeJobTitle}</p>
    ${invoice.jobAddress ? `<p>${safeJobAddress}</p>` : ''}
  </div>
  <div class="billing-block" style="text-align:right;">
    <h4>Status</h4>
    ${statusBadge}
  </div>
</div>

<table>
  <thead>
    <tr><th>Description</th><th style="text-align:right;">Amount</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <strong>${safeDescription}</strong><br>
        <span style="font-size:12px;color:#666;">${safeJobTitle} \u2014 ${safeJobAddress || COMPANY.fullAddress}</span>
      </td>
      <td>${formatCurrency(invoice.subtotal)}</td>
    </tr>
  </tbody>
</table>

<div class="totals">
  <div class="totals-row subtotal"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
  <div class="totals-row hst"><span>HST (13%) \u2014 ON</span><span>${formatCurrency(invoice.hstAmount)}</span></div>
  <div class="totals-row total"><span>TOTAL</span><span>${formatCurrency(invoice.total)}</span></div>
</div>

${invoice.notes ? `<div style="margin-top:32px;padding:16px;background:#f9fafb;border-radius:8px;font-size:13px;color:#555;"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ''}

<div class="status-section">${statusBadge}</div>

<div class="footer">
  ${COMPANY.name} \u00b7 ${COMPANY.fullAddress} \u00b7 ${COMPANY.phone} \u00b7 ${COMPANY.email}<br>
  Thank you for choosing ${COMPANY.name}. Payment is due upon receipt unless otherwise agreed.
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }
}
