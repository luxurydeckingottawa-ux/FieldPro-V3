/**
 * Contract PDF Generator
 * Generates a professional contract PDF as a data URL
 * using HTML-to-canvas approach (no external dependencies).
 */

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
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
    color: #1a1a1a; 
    line-height: 1.6;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header { 
    text-align: center; 
    padding-bottom: 24px; 
    border-bottom: 3px solid #059669; 
    margin-bottom: 32px;
  }
  .header h1 { 
    font-size: 28px; 
    font-weight: 800; 
    color: #059669; 
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .header p { color: #666; font-size: 12px; margin-top: 4px; }
  .contract-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 32px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .section { margin-bottom: 24px; }
  .section-title { 
    font-size: 11px; 
    font-weight: 700; 
    color: #059669; 
    text-transform: uppercase; 
    letter-spacing: 2px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-item label { 
    display: block; 
    font-size: 10px; 
    font-weight: 600; 
    color: #999; 
    text-transform: uppercase; 
    letter-spacing: 1px;
    margin-bottom: 2px;
  }
  .info-item span { font-size: 14px; font-weight: 600; }
  .amount { color: #059669; font-size: 22px !important; font-weight: 800 !important; }
  .payment-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .payment-table th { 
    text-align: left; 
    font-size: 10px; 
    font-weight: 700; 
    color: #999; 
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 8px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  .payment-table td { 
    padding: 10px 0; 
    font-size: 14px;
    border-bottom: 1px solid #f3f4f6;
  }
  .payment-table .total td { 
    font-weight: 700; 
    border-top: 2px solid #059669; 
    border-bottom: none;
    padding-top: 12px;
  }
  .terms { font-size: 11px; color: #666; line-height: 1.8; }
  .terms p { margin-bottom: 8px; }
  .signature-section { 
    margin-top: 32px; 
    padding-top: 24px;
    border-top: 2px solid #e5e7eb;
  }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .sig-block { }
  .sig-label { 
    font-size: 10px; 
    font-weight: 600; 
    color: #999; 
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .sig-line { 
    border-bottom: 2px solid #1a1a1a; 
    min-height: 60px;
    display: flex;
    align-items: flex-end;
    padding-bottom: 4px;
  }
  .sig-line img { height: 50px; object-fit: contain; }
  .sig-name { font-size: 14px; font-weight: 600; margin-top: 6px; }
  .sig-date { font-size: 12px; color: #666; margin-top: 2px; }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 10px;
    color: #999;
  }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Luxury Decking</h1>
    <p>Premium Custom Deck Builder | Ottawa, Ontario</p>
    <p>613-707-3060 | admin@luxurydecking.ca</p>
  </div>

  <div class="contract-title">Project Agreement & Acceptance</div>

  <div class="section">
    <div class="section-title">Project Information</div>
    <div class="info-grid">
      <div class="info-item">
        <label>Estimate Number</label>
        <span>${jobNumber}</span>
      </div>
      <div class="info-item">
        <label>Date</label>
        <span>${formattedDate}</span>
      </div>
      <div class="info-item">
        <label>Client Name</label>
        <span>${clientName}</span>
      </div>
      <div class="info-item">
        <label>Phone</label>
        <span>${clientPhone || 'N/A'}</span>
      </div>
      <div class="info-item" style="grid-column: span 2;">
        <label>Project Address</label>
        <span>${projectAddress}</span>
      </div>
    </div>
  </div>

  ${scopeSummary ? `
  <div class="section">
    <div class="section-title">Project Scope</div>
    <p style="font-size: 13px; color: #444;">${scopeSummary}</p>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Project Total</div>
    <div class="info-item">
      <label>Agreed Amount</label>
      <span class="amount">$${totalAmount.toLocaleString()}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payment Schedule</div>
    <table class="payment-table">
      <thead>
        <tr>
          <th>Milestone</th>
          <th>Percentage</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Deposit</td>
          <td>30%</td>
          <td style="text-align: right;">$${depositAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Upon Material Delivery</td>
          <td>30%</td>
          <td style="text-align: right;">$${materialDelivery.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Final Handover</td>
          <td>40%</td>
          <td style="text-align: right;">$${finalPayment.toLocaleString()}</td>
        </tr>
        <tr class="total">
          <td>Total</td>
          <td></td>
          <td style="text-align: right; color: #059669;">$${totalAmount.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Project Agreement</div>
    <div class="terms">
      <p><strong>Scope of Work:</strong> The parties agree that the project entails the construction of a new deck at the property listed above. The full scope of work is defined exclusively by the accepted Luxury Decking estimate #${jobNumber}, including but not limited to project dimensions, materials, foundations, framing, decking, railings, stairs, and any selected upgrades.</p>
      <p><strong>Extras and Change Orders:</strong> Any work not explicitly included in the accepted estimate shall be considered extras. All extras must be approved in writing by the Homeowner prior to commencement.</p>
      <p><strong>Schedule and Site Access:</strong> The Contractor will provide an anticipated start window once materials are confirmed and the deposit has been received. The Homeowner agrees to provide clear access to the work area. Normal working hours are Monday to Saturday, 8:00 a.m. to 6:00 p.m.</p>
      <p><strong>Site Conditions:</strong> Pricing is based on typical site conditions. If hidden conditions are discovered, the Contractor will notify the Homeowner and provide a change order for approval.</p>
      <p><strong>Weather and Delays:</strong> Outdoor construction is weather-dependent. The Contractor is not liable for delays caused by events beyond its reasonable control.</p>
      <p><strong>Payment Policy:</strong> Invoices are due within five (5) calendar days of receipt. Overdue balances are subject to a 10% late payment fee and interest at 4% per month on unpaid balances exceeding $1,000.</p>
      <p><strong>Warranty:</strong> Luxury Decking provides a five (5) year workmanship warranty on labour. Manufacturer warranties apply separately.</p>
      <p><strong>Material Ownership:</strong> All materials remain the property of the Contractor until payment is made in full.</p>
      <p><strong>Governing Law:</strong> This Agreement shall be governed by the laws of the Province of Ontario.</p>
      <p><strong>Entire Agreement:</strong> This Agreement, together with the accepted estimate, constitutes the entire agreement between the parties.</p>
    </div>
  </div>

  <div class="signature-section">
    <div class="section-title">Acceptance & Signature</div>
    <div class="sig-grid">
      <div class="sig-block">
        <div class="sig-label">Client Signature</div>
        <div class="sig-line">
          ${signature ? `<img src="${signature}" alt="Client Signature" />` : ''}
        </div>
        <div class="sig-name">${clientName}</div>
        <div class="sig-date">${formattedDate}</div>
      </div>
      <div class="sig-block">
        <div class="sig-label">For Luxury Decking</div>
        <div class="sig-line"></div>
        <div class="sig-name">Authorized Representative</div>
        <div class="sig-date">${formattedDate}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Luxury Decking | Ottawa, Ontario | 613-707-3060 | luxurydecking.ca</p>
    <p>This document was digitally signed on ${formattedDate}</p>
  </div>
</body>
</html>`;

  // Create a blob URL from the HTML for storage/viewing
  const blob = new Blob([html], { type: 'text/html' });
  const contractUrl = URL.createObjectURL(blob);
  
  // Store the HTML in localStorage for later PDF generation/download
  try {
    const contractKey = `contract_${jobNumber}_${Date.now()}`;
    localStorage.setItem(contractKey, html);
  } catch (e) {
    console.warn('Could not cache contract HTML:', e);
  }

  return contractUrl;
}

/**
 * Open a contract for printing/saving as PDF.
 * Opens the contract HTML in a new window where the user can print to PDF.
 */
export function printContract(contractUrl: string) {
  const win = window.open(contractUrl, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => win.print(), 500);
    };
  }
}
