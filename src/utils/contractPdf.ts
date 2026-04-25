/**
 * Contract PDF Generator
 * Generates a professional contract PDF as a data URL
 * using HTML-to-canvas approach (no external dependencies).
 */

import { COMPANY } from '../config/company';

interface ContractData {
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectAddress: string;
  totalAmount: number;
  depositAmount: number;
  scopeSummary: string;
  signature: string; // base64 data URL
  acceptedDate: string;
}

/**
 * Generate a contract PDF and return it as a data URL.
 * Uses a hidden iframe to render HTML, then converts to PDF via print.
 * Falls back to a blob URL if print isn't available.
 */
export async function generateContractPDF(data: ContractData): Promise<string> {
  const {
    jobNumber, clientName, clientEmail, clientPhone,
    projectAddress, totalAmount, depositAmount, 
    scopeSummary, signature, acceptedDate
  } = data;

  const formattedDate = new Date(acceptedDate).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const materialDelivery = Math.round(totalAmount * 0.3);
  const finalPayment = Math.round(totalAmount * 0.4);

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${COMPANY.name} – Deck Installation Agreement</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Georgia, serif;
    color: #1a1a1a;
    line-height: 1.65;
    padding: 56px 64px 48px 64px;
    max-width: 8.5in;
    margin: 0 auto;
    background: #ffffff;
  }
  .brand {
    text-align: center;
    margin-bottom: 8px;
  }
  .brand .lux {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.45em;
    color: #1a1a1a;
  }
  .brand .deck {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.45em;
    color: #1a1a1a;
  }
  h1.doc-title {
    font-family: 'Times New Roman', Georgia, serif;
    text-align: center;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 6px 0 18px 0;
  }
  .title-rule {
    border: 0;
    border-top: 2px solid #1a1a1a;
    margin: 0 0 28px 0;
  }
  .preamble {
    font-size: 13px;
    text-align: justify;
    margin-bottom: 22px;
  }
  h2.section-h {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #1a1a1a;
    margin-top: 22px;
    margin-bottom: 4px;
    padding-bottom: 6px;
    border-bottom: 1px solid #d4d4d4;
    page-break-after: avoid;
  }
  h3.sub-h {
    font-family: 'Times New Roman', Georgia, serif;
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    margin-top: 14px;
    margin-bottom: 4px;
    page-break-after: avoid;
  }
  p.body {
    font-size: 12.5px;
    text-align: justify;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  ul.payment-list {
    list-style: none;
    padding: 0;
    margin: 6px 0 10px 0;
  }
  ul.payment-list li {
    font-size: 12.5px;
    margin-bottom: 4px;
  }
  ul.payment-list li strong {
    font-weight: 700;
  }
  .acceptance-box {
    border: 2px solid #1a1a1a;
    padding: 22px 26px;
    margin-top: 30px;
    page-break-inside: avoid;
  }
  .acceptance-box .ab-title {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: underline;
    margin-bottom: 14px;
  }
  .acceptance-box p {
    font-size: 12.5px;
    margin-bottom: 8px;
  }
  .acceptance-box p.italic {
    font-style: italic;
    margin-top: 6px;
  }
  .signature-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 28px;
    margin-top: 32px;
    page-break-inside: avoid;
  }
  .sig-block .sig-label {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
  }
  .sig-block .sig-value {
    font-family: 'Times New Roman', Georgia, serif;
    font-size: 14px;
    font-weight: 700;
    color: #1a1a1a;
    min-height: 28px;
    border-bottom: 1.5px solid #1a1a1a;
    padding-bottom: 4px;
    display: flex;
    align-items: flex-end;
  }
  .sig-block .sig-value img {
    max-height: 48px;
    max-width: 100%;
    object-fit: contain;
  }
  .estimate-ref {
    font-size: 11px;
    color: #6b7280;
    margin-top: 18px;
  }
  .estimate-ref strong { color: #1a1a1a; }
  .doc-footer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 9.5px;
    color: #9ca3af;
    font-family: 'Helvetica Neue', Arial, sans-serif;
  }
  @media print {
    body { padding: 0.6in 0.7in; }
    .no-print { display: none; }
    h2.section-h, h3.sub-h { page-break-after: avoid; }
    p.body { orphans: 3; widows: 3; }
  }
</style>
</head>
<body>
  <div class="brand">
    <div class="lux">L U X U R Y</div>
    <div class="deck">D E C K I N G</div>
  </div>

  <h1 class="doc-title">Deck Installation Agreement</h1>
  <hr class="title-rule" />

  <p class="preamble">
    This Deck Installation Agreement (&ldquo;Agreement&rdquo;) is entered into between ${COMPANY.name}
    (&ldquo;Contractor&rdquo;) and <strong>${clientName}</strong> (&ldquo;Homeowner&rdquo;) for the property
    located at <strong>${projectAddress}</strong>.
  </p>

  <h2 class="section-h">Project Details</h2>

  <h3 class="sub-h">Scope of Work</h3>
  <p class="body">
    The parties agree that the project entails the construction of a new deck at the property listed above.
    The full scope of work is defined exclusively by the accepted ${COMPANY.name} estimate
    <strong>#${jobNumber}</strong>, including but not limited to project dimensions, materials,
    foundations, framing, decking, railings, stairs, and any selected upgrades.
  </p>
  ${scopeSummary ? `<p class="body" style="font-style: italic; color:#374151;">${scopeSummary}</p>` : ''}

  <h3 class="sub-h">Estimate Reference</h3>
  <p class="body">
    The accepted estimate forms an integral part of this Agreement and governs all pricing, inclusions,
    specifications, and assumptions.
  </p>

  <h2 class="section-h">Extras and Change Orders</h2>
  <p class="body">
    Any work, materials, or services not explicitly included in the accepted estimate shall be considered extras.
    All extras must be approved in writing by the Homeowner prior to commencement. Pricing for extras will be
    agreed upon before the additional work proceeds.
  </p>
  <p class="body">
    Payment for approved extras is due upon completion of the extra work unless otherwise agreed in writing.
  </p>

  <h2 class="section-h">Payment Schedule</h2>
  <p class="body">The Homeowner agrees to the following payment structure:</p>
  <ul class="payment-list">
    <li><strong>30% deposit</strong> due upon acceptance of this Agreement &mdash; $${depositAmount.toLocaleString()}</li>
    <li><strong>30% payment</strong> due upon material delivery to the site &mdash; $${materialDelivery.toLocaleString()}</li>
    <li><strong>40% final payment</strong> due upon substantial completion of the project &mdash; $${finalPayment.toLocaleString()}</li>
  </ul>

  <h2 class="section-h">Project Schedule, Site Access, and Working Hours</h2>
  <p class="body">
    The Contractor will provide an anticipated start window once materials are confirmed and the deposit has
    been received. Start dates are subject to weather, supplier lead times, site readiness, and crew availability.
  </p>
  <p class="body">
    The Homeowner agrees to provide clear access to the work area, including access through gates, side yards,
    and driveways as required. Vehicles, furniture, and personal items within the work zone must be removed
    prior to the start date.
  </p>
  <p class="body">
    Normal working hours are Monday to Saturday, 8:00 a.m. to 6:00 p.m., unless otherwise required due to
    weather or scheduling constraints.
  </p>

  <h2 class="section-h">Permits, Locates, and Inspections</h2>
  <p class="body">
    If permits or engineered drawings are required, responsibilities and costs will be as outlined in the
    accepted estimate. The Homeowner authorizes the Contractor to coordinate with the municipality and
    inspectors as needed.
  </p>
  <p class="body">
    Where applicable, utility locates must be completed prior to ground disturbance. If utility locates are
    not complete, the start date may be delayed without penalty to the Contractor.
  </p>
  <p class="body">
    Inspection timing is dependent on municipal availability. Delays caused by inspector scheduling do not
    constitute a breach of this Agreement.
  </p>

  <h2 class="section-h">Site Conditions and Unforeseen Work</h2>
  <p class="body">
    Pricing is based on typical site conditions. If hidden conditions are discovered (including but not
    limited to buried debris, unexpected soil conditions, rot, structural deficiencies, or concealed
    utilities), the Contractor will notify the Homeowner and provide a change order for approval.
  </p>
  <p class="body">
    The Homeowner acknowledges that construction may reveal conditions not visible during the initial
    consultation.
  </p>

  <h2 class="section-h">Weather, Delays, and Force Majeure</h2>
  <p class="body">
    Outdoor construction is weather-dependent. Rain, extreme temperatures, high winds, and other unsafe
    conditions may require schedule changes. The Contractor will make reasonable efforts to communicate
    schedule adjustments promptly.
  </p>
  <p class="body">
    The Contractor is not liable for delays caused by events beyond its reasonable control, including
    supplier backorders, labour disruptions, acts of God, or municipal delays.
  </p>

  <h2 class="section-h">Payment Policy</h2>
  <p class="body">Invoices are due within five (5) calendar days of receipt.</p>
  <p class="body">Any overdue balance is subject to:</p>
  <ul class="payment-list">
    <li>A <strong>10% late payment fee</strong> after the due date</li>
    <li>Interest at <strong>4% per month</strong>, calculated daily, on unpaid balances exceeding $1,000 until paid in full</li>
  </ul>
  <p class="body">
    Failure to remit payment in accordance with this policy constitutes a material breach of this Agreement.
  </p>

  <h2 class="section-h">Warranty</h2>
  <p class="body">
    ${COMPANY.name} provides a <strong>five (5) year workmanship warranty</strong> on labour. Manufacturer
    warranties on materials apply separately and are subject to the terms provided by the manufacturer.
  </p>

  <h2 class="section-h">Material Ownership</h2>
  <p class="body">
    All materials supplied for the project remain the property of the Contractor until payment is made in
    full. In the event of non-payment, the Contractor reserves the right to recover materials unless
    otherwise agreed in writing.
  </p>

  <h2 class="section-h">Jobsite Conditions and Property Damage</h2>
  <p class="body">
    The Homeowner acknowledges that minor disturbance to landscaping, lawn areas, or surrounding property
    may occur during construction. The Contractor will make reasonable efforts to minimize disruption but
    shall not be responsible for minor, unavoidable damage inherent to construction activities.
  </p>

  <h2 class="section-h">Jobsite Maintenance</h2>
  <p class="body">
    The Contractor will maintain the jobsite in a clean, neat, and orderly condition during construction
    and will remove construction debris upon project completion.
  </p>

  <h2 class="section-h">Governing Law</h2>
  <p class="body">
    This Agreement shall be governed by and interpreted in accordance with the laws of the Province of
    Ontario. Any disputes arising from this Agreement shall be resolved within Ontario jurisdiction.
  </p>

  <h2 class="section-h">Insurance and Safety</h2>
  <p class="body">
    The Contractor carries standard business liability coverage and will maintain reasonable safety measures
    on the jobsite. The Homeowner agrees to keep children and pets away from the work area during construction.
  </p>
  <p class="body">
    The Homeowner acknowledges that temporary hazards may exist during construction (including open
    excavations, tools, and materials).
  </p>

  <h2 class="section-h">Photos and Marketing</h2>
  <p class="body">
    The Contractor may take progress and completion photos for quality control and warranty documentation.
    With the Homeowner&rsquo;s permission, non-identifying photos may be used for portfolio and marketing
    purposes.
  </p>

  <h2 class="section-h">Entire Agreement</h2>
  <p class="body">
    This Agreement, together with the accepted estimate, constitutes the entire agreement between the parties
    and supersedes all prior discussions, representations, or agreements, whether written or oral. Any
    amendments must be made in writing and agreed upon by both parties.
  </p>

  <div class="acceptance-box">
    <div class="ab-title">Acceptance Summary</div>
    <p>This agreement reflects the estimate reviewed and accepted with ${COMPANY.name}.</p>
    <p><strong>Total Project Price:</strong> $${totalAmount.toLocaleString()} (HST included)</p>
    <p><strong>Deposit Required:</strong> 30% upon acceptance &mdash; $${depositAmount.toLocaleString()}</p>
    <p>Extras require written approval.</p>
    <p>This agreement is governed by Ontario law.</p>
    <p class="italic">By accepting this quote, the Homeowner authorizes ${COMPANY.name} to proceed with the project as outlined above.</p>
  </div>

  <div class="signature-row">
    <div class="sig-block">
      <div class="sig-label">Homeowner Name</div>
      <div class="sig-value">${clientName}</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Signature</div>
      <div class="sig-value">${signature ? `<img src="${signature}" alt="Client Signature" />` : ''}</div>
    </div>
    <div class="sig-block">
      <div class="sig-label">Date</div>
      <div class="sig-value">${formattedDate}</div>
    </div>
  </div>

  <p class="estimate-ref"><strong>Estimate Reference:</strong> #${jobNumber}${clientEmail ? ` &nbsp;·&nbsp; <strong>Email on File:</strong> ${clientEmail}` : ''}${clientPhone ? ` &nbsp;·&nbsp; <strong>Phone:</strong> ${clientPhone}` : ''}</p>

  <div class="doc-footer">
    <p>${COMPANY.name} &nbsp;·&nbsp; ${COMPANY.fullAddress} &nbsp;·&nbsp; ${COMPANY.phone} &nbsp;·&nbsp; ${COMPANY.website}</p>
    <p>Digitally signed on ${formattedDate}</p>
  </div>
</body>
</html>`;

  // Return a persistent data URI so the URL survives page reloads.
  // Blob URLs (URL.createObjectURL) die when the tab closes — data URIs are permanent.
  // We base64-encode the HTML to handle the full unicode character set safely.
  const base64 = btoa(unescape(encodeURIComponent(html)));
  return `data:text/html;charset=utf-8;base64,${base64}`;
}

/**
 * Open a contract data URI in a new tab where the user can view / print to PDF.
 */
export function printContract(contractUrl: string) {
  window.open(contractUrl, '_blank');
}
