/**
 * Estimate PDF Generator
 * Produces a professional, branded itemized estimate PDF using jsPDF.
 * Returns a persistent base64 data URI (survives page reloads).
 */
import { jsPDF } from 'jspdf';
import { COMPANY } from '../config/company';

// ─── Brand colours ────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const GOLD: RGB    = [212, 175, 55];
const BLACK: RGB   = [26,  26,  26];
const DARK: RGB    = [40,  40,  40];
const GRAY: RGB    = [110, 110, 110];
const LGRAY: RGB   = [240, 239, 235];
const MGRAY: RGB   = [200, 198, 192];
const WHITE: RGB   = [255, 255, 255];
const STRIPE: RGB  = [250, 249, 245];

// Colour helpers — avoids TypeScript overload spread issues with jsPDF typings
function fc(doc: jsPDF, c: RGB): void { doc.setFillColor(c[0], c[1], c[2]); }
function dc(doc: jsPDF, c: RGB): void { doc.setDrawColor(c[0], c[1], c[2]); }
function tc(doc: jsPDF, c: RGB): void { doc.setTextColor(c[0], c[1], c[2]); }

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EstimatePDFData {
  jobNumber: string;
  clientName: string;
  clientAddress: string;
  clientEmail?: string;
  clientPhone?: string;
  estimateDate: string;
  lineItems: Array<{ label: string; value: number }>;
  subTotal: number;
  hst: number;
  total: number;
  monthly?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/**
 * Extract a quantity hint from labels like:
 *   "Helical Piles (4x)"  → quantity "4x"
 *   "AL13 Rail (32 LF)"   → quantity "32 LF"
 *   "3x IN-LITE Hyve 22"  → quantity "3x"
 * Returns { quantity, cleanLabel } — quantity is empty string if not found.
 */
function parseLabel(label: string): { quantity: string; cleanLabel: string } {
  // Pattern 1 — parentheses at end: "Name (qty)"
  const endMatch = label.match(/\(([^)]+)\)\s*$/);
  if (endMatch) {
    return {
      quantity: endMatch[1],
      cleanLabel: label.replace(/\s*\([^)]+\)\s*$/, '').trim(),
    };
  }
  // Pattern 2 — numeric prefix: "3x Name" or "12x Name"
  const prefixMatch = label.match(/^(\d+x)\s+(.+)$/i);
  if (prefixMatch) {
    return {
      quantity: prefixMatch[1],
      cleanLabel: prefixMatch[2].trim(),
    };
  }
  return { quantity: '', cleanLabel: label };
}

interface LogoResult { dataUrl: string; width: number; height: number }

async function fetchLogoBase64(src: string): Promise<LogoResult | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Detect natural dimensions via Image element
    const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    return { dataUrl, width: w || 200, height: h || 60 };
  } catch {
    return null;
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generateEstimatePDF(data: EstimatePDFData): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = 210;
  const PH = 297;
  const M  = 14;  // margin
  const CW = PW - M * 2;

  // Try to load logo (prefer white version on dark PDF, black on light)
  const logoResult = await fetchLogoBase64('/assets/logo-black.png');

  let y = M;

  // ── HEADER ──────────────────────────────────────────────────────────────────

  if (logoResult) {
    // Scale logo to a fixed height of 16mm, preserving aspect ratio (max 50mm wide)
    const maxH = 16;
    const maxW = 50;
    const aspect = logoResult.width / Math.max(logoResult.height, 1);
    let logoW = maxH * aspect;
    let logoH = maxH;
    if (logoW > maxW) { logoW = maxW; logoH = maxW / aspect; }
    doc.addImage(logoResult.dataUrl, 'PNG', M, y + (22 - logoH) / 2, logoW, logoH);
  } else {
    // Text fallback
    tc(doc, BLACK);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY.name.toUpperCase(), M, y + 10);
    tc(doc, GRAY);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('ESTIMATOR', M + doc.getTextWidth(COMPANY.name.toUpperCase()) + 3, y + 10);
  }

  // Contact info — right aligned
  tc(doc, BLACK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, PW - M, y + 4, { align: 'right' });
  tc(doc, GRAY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY.phone} | ${COMPANY.email}`, PW - M, y + 9.5, { align: 'right' });
  doc.text(`www.${COMPANY.website}`, PW - M, y + 14.5, { align: 'right' });

  y += 22;

  // Gold rule
  dc(doc, GOLD);
  doc.setLineWidth(0.9);
  doc.line(M, y, PW - M, y);
  y += 6;

  // ── INFO CARDS ───────────────────────────────────────────────────────────────

  const cardW = (CW - 5) / 2;
  const cardH = 22;

  // Left — Prepared For
  fc(doc, LGRAY);
  dc(doc, MGRAY);
  doc.setLineWidth(0.2);
  doc.roundedRect(M, y, cardW, cardH, 2, 2, 'FD');

  tc(doc, GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR', M + 4, y + 5.5);

  tc(doc, BLACK);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.clientName || 'Client', M + 4, y + 12);

  tc(doc, GRAY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const addrLines = doc.splitTextToSize(data.clientAddress || '', cardW - 8);
  doc.text(addrLines.slice(0, 2) as string[], M + 4, y + 17.5);

  // Right — Estimate Details
  const rx = M + cardW + 5;
  fc(doc, LGRAY);
  dc(doc, MGRAY);
  doc.roundedRect(rx, y, cardW, cardH, 2, 2, 'FD');

  tc(doc, GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMATE DETAILS', rx + 4, y + 5.5);

  const formattedDate = new Date(data.estimateDate).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  tc(doc, GRAY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Date:', rx + 4, y + 12);
  tc(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedDate, rx + 16, y + 12);

  tc(doc, GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('Estimate #:', rx + 4, y + 17.5);
  tc(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${data.jobNumber}`, rx + 24, y + 17.5);

  y += cardH + 7;

  // ── ITEMIZED SCOPE OF WORK ────────────────────────────────────────────────────

  tc(doc, GOLD);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEMIZED SCOPE OF WORK', M, y);
  y += 4;

  // Table header bar
  fc(doc, BLACK);
  doc.setLineWidth(0);
  doc.rect(M, y, CW, 7, 'F');
  tc(doc, WHITE);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('QUANTITY', M + 3, y + 4.5);
  doc.text('DESCRIPTION', M + 32, y + 4.5);
  doc.text('AMOUNT', PW - M - 3, y + 4.5, { align: 'right' });
  y += 7;

  // Line items
  const nonZero = data.lineItems.filter(i => Math.round(i.value) !== 0);

  for (let idx = 0; idx < nonZero.length; idx++) {
    const item = nonZero[idx];

    // Check if we need a new page (leave room for summary + footer)
    if (y > PH - 90) {
      doc.addPage();
      y = M;
    }

    const rowH = 7;
    const bg: RGB = idx % 2 === 0 ? STRIPE : WHITE;
    fc(doc, bg);
    dc(doc, MGRAY);
    doc.setLineWidth(0.1);
    doc.rect(M, y, CW, rowH, 'FD');

    const { quantity, cleanLabel } = parseLabel(item.label);

    if (quantity) {
      tc(doc, GRAY);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(quantity, M + 3, y + 4.5);
    }

    tc(doc, DARK);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    const truncated = doc.splitTextToSize(cleanLabel, CW - 50)[0] as string;
    doc.text(truncated, M + 32, y + 4.5);

    tc(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(item.value), PW - M - 3, y + 4.5, { align: 'right' });

    y += rowH;
  }

  // Gold divider after table
  dc(doc, GOLD);
  doc.setLineWidth(0.7);
  doc.line(M, y + 3, PW - M, y + 3);
  y += 10;

  // ── INVESTMENT SUMMARY & PAYMENT TERMS ────────────────────────────────────────

  if (y > PH - 70) {
    doc.addPage();
    y = M;
  }

  tc(doc, GOLD);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INVESTMENT SUMMARY & PAYMENT TERMS', M, y);
  y += 7;

  const halfW = (CW - 6) / 2;
  const summaryStartY = y;

  // ── LEFT: Structured payment schedule ──────────────────────────────────────
  tc(doc, BLACK);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('STRUCTURED PAYMENT SCHEDULE', M, y);
  y += 5.5;

  const depositAmt      = Math.round(data.subTotal * 0.30);
  const materialAmt     = Math.round(data.subTotal * 0.30);
  const finalAmt        = data.subTotal - depositAmt - materialAmt;

  const payRows = [
    { label: 'Deposit / Retainer (30%)',         amt: depositAmt },
    { label: 'Upon material delivery (30%)',      amt: materialAmt },
    { label: 'Final handover / completion (40%)', amt: finalAmt },
  ];

  payRows.forEach(row => {
    tc(doc, DARK);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(row.label, M, y);
    tc(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(row.amt), M + halfW - 2, y, { align: 'right' });
    y += 6;
  });

  // ── RIGHT: Totals ───────────────────────────────────────────────────────────
  const rx2 = M + halfW + 6;
  let ry = summaryStartY;

  const totalRows: Array<{ label: string; value: number; large?: boolean }> = [
    { label: 'Project Subtotal:',  value: data.subTotal },
    { label: 'HST (13%):',         value: data.hst },
  ];

  totalRows.forEach(row => {
    tc(doc, GRAY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(row.label, rx2, ry);
    tc(doc, BLACK);
    doc.text(formatCurrency(row.value), PW - M - 3, ry, { align: 'right' });
    ry += 6;
  });

  // Rule above grand total
  dc(doc, BLACK);
  doc.setLineWidth(0.5);
  doc.line(rx2, ry - 1, PW - M, ry - 1);

  tc(doc, BLACK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Investment:', rx2, ry + 4.5);
  doc.text(formatCurrency(data.total), PW - M - 3, ry + 4.5, { align: 'right' });
  ry += 10;

  // Monthly financing estimate
  if (data.monthly && data.monthly > 0) {
    tc(doc, GOLD);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Estimated Financing: ${formatCurrency(data.monthly)}/mo O.A.C`,
      PW - M - 3,
      ry,
      { align: 'right' },
    );
    ry += 5;
  }

  y = Math.max(y, ry) + 8;

  // ── DISCLAIMER ───────────────────────────────────────────────────────────────

  if (y > PH - 40) {
    doc.addPage();
    y = M;
  }

  tc(doc, GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  const disclaimer =
    'This estimate is based on preliminary measurements and current market material pricing. ' +
    'Final price subject to site survey, engineering requirements, and municipal permit fees. ' +
    'Quote valid for 30 days. Workmanship guaranteed for 5 years. ' +
    'This document is for estimation purposes only and does not constitute a legal contract until converted to a work order.';
  const dLines = doc.splitTextToSize(disclaimer, CW) as string[];
  doc.text(dLines, M, y);
  y += dLines.length * 3.8 + 7;

  // ── SIGNATURE LINES ──────────────────────────────────────────────────────────

  if (y > PH - 25) {
    doc.addPage();
    y = M;
  }

  const sigW = (CW - 16) / 2;
  dc(doc, BLACK);
  doc.setLineWidth(0.4);
  doc.line(M, y, M + sigW, y);
  doc.line(PW - M - sigW, y, PW - M, y);

  tc(doc, BLACK);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT AUTHORIZATION SIGNATURE', M + sigW / 2, y + 4, { align: 'center' });
  doc.text(`${COMPANY.name.toUpperCase()} REPRESENTATIVE`, PW - M - sigW / 2, y + 4, { align: 'center' });

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footerY = PH - 8;
  dc(doc, MGRAY);
  doc.setLineWidth(0.15);
  doc.line(M, footerY - 4, PW - M, footerY - 4);
  tc(doc, GRAY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY.website, M, footerY);
  doc.text(`${String(doc.getCurrentPageInfo().pageNumber)}/${String(doc.getNumberOfPages())}`, PW - M, footerY, { align: 'right' });

  // datauristring = "data:application/pdf;filename=generated.pdf;base64,<b64>"
  // This is a persistent URI — safe to store in the job record across sessions.
  return doc.output('datauristring');
}
