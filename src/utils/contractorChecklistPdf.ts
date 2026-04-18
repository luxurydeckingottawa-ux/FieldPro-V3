/**
 * Contractor Comparison Checklist PDF
 *
 * Generates a branded, one-page (with overflow to a second if needed) PDF of
 * "10 Questions to Ask Any Contractor" with each question followed by a
 * small-type "Luxury Decking answer" underneath. Intended to be saved or
 * printed by the customer so they can evaluate competing quotes with the
 * exact same rubric.
 *
 * Same jsPDF + gold/black palette as estimatePdf.ts so the deliverables
 * feel like they came from the same package.
 */

import { jsPDF } from 'jspdf';
import { COMPANY } from '../config/company';

type RGB = [number, number, number];
const GOLD: RGB  = [212, 168, 83];     // #D4A853
const BLACK: RGB = [15, 23, 42];       // slate-900
const DARK: RGB  = [51, 65, 85];       // slate-700
const GRAY: RGB  = [100, 116, 139];    // slate-500
const LGRAY: RGB = [226, 232, 240];    // slate-200
const STRIPE: RGB = [248, 250, 252];   // slate-50

function fc(doc: jsPDF, c: RGB): void { doc.setFillColor(c[0], c[1], c[2]); }
function dc(doc: jsPDF, c: RGB): void { doc.setDrawColor(c[0], c[1], c[2]); }
function tc(doc: jsPDF, c: RGB): void { doc.setTextColor(c[0], c[1], c[2]); }

export interface ChecklistItem {
  q: string;           // Short topic, e.g. "Joist spacing"
  ask: string;         // The literal question to ask
  why: string;         // Why it matters
  our: string;         // Luxury Decking's answer
}

export interface ChecklistPDFOptions {
  items: ChecklistItem[];
  /** Optional override for the client name (e.g., "Prepared for Sarah M."). */
  clientName?: string;
}

/**
 * Build and trigger a download of the branded checklist PDF.
 * Returns the jsPDF doc so the caller can override the filename if desired.
 */
export function generateContractorChecklistPDF({ items, clientName }: ChecklistPDFOptions): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();   // 215.9 mm
  const pageH = doc.internal.pageSize.getHeight();  // 279.4 mm
  const M = 16; // margin
  let y = M;

  // ─── Header band ──────────────────────────────────────────────────────────
  fc(doc, BLACK);
  doc.rect(0, 0, pageW, 28, 'F');

  // Gold hairline under header
  fc(doc, GOLD);
  doc.rect(0, 28, pageW, 0.8, 'F');

  // Company name left
  tc(doc, [255, 255, 255]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text((COMPANY.name || 'Luxury Decking').toUpperCase(), M, 15);
  tc(doc, GOLD);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('QUALITY WITHOUT COMPROMISE', M, 20);

  // Right-aligned meta
  tc(doc, [255, 255, 255]);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(dateStr, pageW - M, 15, { align: 'right' });
  doc.setFontSize(7);
  tc(doc, GOLD);
  doc.text('CONTRACTOR COMPARISON CHECKLIST', pageW - M, 20, { align: 'right' });

  y = 42;

  // ─── Title block ──────────────────────────────────────────────────────────
  tc(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('10 Questions to Ask', M, y);
  y += 8;
  tc(doc, GOLD);
  doc.setFontSize(22);
  doc.text('Any Contractor.', M, y);
  y += 9;

  // Subtitle
  tc(doc, GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const sub = 'Use this checklist when you compare us to anyone else. If the answer to any of these is unclear or missing, the lower number is almost always a hidden cost.';
  const subLines = doc.splitTextToSize(sub, pageW - M * 2);
  doc.text(subLines, M, y);
  y += subLines.length * 4.5 + 4;

  // Thin gold rule
  fc(doc, GOLD);
  doc.rect(M, y, 20, 0.6, 'F');
  y += 8;

  if (clientName) {
    tc(doc, DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Prepared for: ${clientName}`, M, y);
    y += 6;
  }

  // ─── Questions ────────────────────────────────────────────────────────────
  const contentW = pageW - M * 2;
  const numberW = 12;
  const questionX = M + numberW;
  const questionW = contentW - numberW;

  items.forEach((item, idx) => {
    // Measure total block height so we can page-break cleanly.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const askLines = doc.splitTextToSize(item.ask, questionW);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const whyLines = doc.splitTextToSize(`Why it matters: ${item.why}`, questionW);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    const ourLines = doc.splitTextToSize(`Our answer: ${item.our}`, questionW - 4);

    const blockH =
      4 + // topic label
      askLines.length * 4.8 + // question
      3 +
      whyLines.length * 3.8 +
      3 +
      ourLines.length * 3.8 +
      8; // bottom padding between questions

    // Page break if the block won't fit
    if (y + blockH > pageH - 28) {
      doc.addPage();
      y = M;
      // Slim header on continuation pages
      fc(doc, BLACK);
      doc.rect(0, 0, pageW, 10, 'F');
      tc(doc, GOLD);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('LUXURY DECKING · CONTRACTOR COMPARISON CHECKLIST (CONTINUED)', M, 6.5);
      y = 22;
    }

    // Gold number
    tc(doc, GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(idx + 1).padStart(2, '0'), M, y + 3);

    // Topic label (small caps above the question)
    tc(doc, GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(item.q.toUpperCase(), questionX, y);
    y += 4;

    // The question itself
    tc(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(askLines, questionX, y + 4);
    y += askLines.length * 4.8 + 3;

    // Why it matters
    tc(doc, DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(whyLines, questionX, y);
    y += whyLines.length * 3.8 + 3;

    // Luxury Decking answer — in a subtle gold strip
    fc(doc, STRIPE);
    doc.rect(questionX, y - 2, questionW, ourLines.length * 3.8 + 4, 'F');
    // Gold left edge
    fc(doc, GOLD);
    doc.rect(questionX, y - 2, 1, ourLines.length * 3.8 + 4, 'F');
    tc(doc, BLACK);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text(ourLines, questionX + 3, y + 1.5);
    y += ourLines.length * 3.8 + 7;
  });

  // ─── Closing statement ────────────────────────────────────────────────────
  if (y + 26 > pageH - 24) {
    doc.addPage();
    y = M + 4;
  }
  fc(doc, BLACK);
  doc.rect(M, y, contentW, 18, 'F');
  fc(doc, GOLD);
  doc.rect(M, y, 2, 18, 'F');
  tc(doc, [255, 255, 255]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  const closing = 'A quote that can answer all ten of these questions in writing is the quote worth comparing on price. A quote that cannot is not cheaper. It is riskier.';
  const closingLines = doc.splitTextToSize(closing, contentW - 12);
  doc.text(closingLines, M + 6, y + 7);
  y += 22;

  // ─── Footer on final page ────────────────────────────────────────────────
  const footerY = pageH - 14;
  dc(doc, LGRAY);
  doc.setLineWidth(0.3);
  doc.line(M, footerY - 6, pageW - M, footerY - 6);

  tc(doc, GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${COMPANY.name || 'Luxury Decking'}  ·  ${COMPANY.phone || ''}  ·  ${COMPANY.email || ''}`, M, footerY);
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber} of ${doc.getNumberOfPages()}`, pageW - M, footerY, { align: 'right' });

  // Download
  const filename = `Contractor-Comparison-Checklist-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
