import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Job, ChecklistItem, PhotoUpload } from '../types';
import { PAGE_TITLES } from '../constants';

// Brand colours
const GOLD: [number, number, number] = [212, 175, 55];
const BLACK: [number, number, number] = [0, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const OFF_WHITE: [number, number, number] = [252, 250, 245];
const DARK_GRAY: [number, number, number] = [40, 40, 40];
const MID_GRAY: [number, number, number] = [120, 120, 120];
const LIGHT_GRAY: [number, number, number] = [200, 200, 200];
const DIVIDER_GRAY: [number, number, number] = [230, 228, 222];

// Page dimensions (A4)
const PW = 210;
const PH = 297;
const MARGIN = 14;

// Colour helpers — avoids spread-on-overload TS issues with jsPDF typings
type RGB = [number, number, number];
function fc(doc: jsPDF, c: RGB): void { doc.setFillColor(c[0], c[1], c[2]); }
function dc(doc: jsPDF, c: RGB): void { doc.setDrawColor(c[0], c[1], c[2]); }
function tc(doc: jsPDF, c: RGB): void { doc.setTextColor(c[0], c[1], c[2]); }

// -----------------------------------------------------------------------
// Helper: fetch a remote image and return a base64 data URI, or null
// -----------------------------------------------------------------------
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------
// Helper: draw the gold double-border on the current page
// -----------------------------------------------------------------------
function drawGoldBorder(doc: jsPDF): void {
  // Outer border — 2.5pt
  dc(doc, GOLD);
  doc.setLineWidth(0.88); // ~2.5pt
  doc.rect(4, 4, PW - 8, PH - 8);
  // Inner border — 0.4pt
  doc.setLineWidth(0.14);
  doc.rect(6.5, 6.5, PW - 13, PH - 13);
}

// -----------------------------------------------------------------------
// Helper: draw a gold horizontal rule
// -----------------------------------------------------------------------
function drawGoldLine(doc: jsPDF, y: number, x1 = MARGIN, x2 = PW - MARGIN): void {
  dc(doc, GOLD);
  doc.setLineWidth(0.28); // ~0.8pt
  doc.line(x1, y, x2, y);
}

// -----------------------------------------------------------------------
// Helper: draw a light gray horizontal rule
// -----------------------------------------------------------------------
function drawGrayLine(doc: jsPDF, y: number, x1 = MARGIN, x2 = PW - MARGIN): void {
  dc(doc, DIVIDER_GRAY);
  doc.setLineWidth(0.11); // ~0.3pt
  doc.line(x1, y, x2, y);
}

// -----------------------------------------------------------------------
// Helper: format a Job ID as LD-XXXXXX
// -----------------------------------------------------------------------
function formatJobId(id: string): string {
  const short = id.replace(/-/g, '').toUpperCase().slice(0, 6);
  return `LD-${short}`;
}

// -----------------------------------------------------------------------
// Helper: format an ISO date string as "April 13, 2026"
// -----------------------------------------------------------------------
function formatDate(iso?: string): string {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

// -----------------------------------------------------------------------
// Helper: determine warranty tier label from acceptedOptionName
// -----------------------------------------------------------------------
function warrantyTier(job: Job): { label: string; years: number; isDiamond: boolean } {
  const name = (job.acceptedOptionName ?? '').toLowerCase();
  if (name.includes('diamond')) {
    return { label: 'Diamond Package', years: 10, isDiamond: true };
  }
  return { label: job.acceptedOptionName ?? 'Standard', years: 5, isDiamond: false };
}

// -----------------------------------------------------------------------
// Page 1: Premium Cover Page
// -----------------------------------------------------------------------
async function buildCoverPage(doc: jsPDF, job: Job, logoBase64: string | null): Promise<void> {
  drawGoldBorder(doc);

  // Black header band
  fc(doc, BLACK);
  doc.rect(4, 4, PW - 8, 55, 'F');

  // White logo centred in header (if available)
  if (logoBase64) {
    try {
      // Logo white version — 50mm wide, centred
      const logoW = 50;
      const logoH = 16;
      doc.addImage(logoBase64, 'PNG', (PW - logoW) / 2, 14, logoW, logoH);
    } catch {
      // Fallback text
      tc(doc, WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('LUXURY DECKING', PW / 2, 28, { align: 'center' });
    }
  } else {
    tc(doc, WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('LUXURY DECKING', PW / 2, 28, { align: 'center' });
  }

  // Gold accent line just below header
  let y = 63;
  drawGoldLine(doc, y);

  // Gold subtitle
  y = 70;
  tc(doc, GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('VERIFIED BUILD PASSPORT & COMPLETION REPORT', PW / 2, y, { align: 'center' });

  // Large title
  y = 83;
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Build Passport', PW / 2, y, { align: 'center' });

  // Off-white rounded info card
  y = 92;
  const cardX = MARGIN + 6;
  const cardW = PW - (MARGIN + 6) * 2;
  const cardH = 76;

  fc(doc, OFF_WHITE);
  dc(doc, GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, y, cardW, cardH, 3, 3, 'FD');

  // 6-row info table inside the card
  const tier = warrantyTier(job);
  const rows: [string, string][] = [
    ['CLIENT', job.clientName ?? 'N/A'],
    ['ADDRESS', job.address ?? job.projectAddress ?? 'N/A'],
    ['PROJECT #', formatJobId(job.id)],
    ['COMPLETION DATE', formatDate(job.updatedAt)],
    ['PACKAGE TIER', tier.label],
    ['WARRANTY COVERAGE', `${tier.years}-Year Labour & Workmanship`],
  ];

  const rowH = cardH / rows.length;
  rows.forEach(([label, value], i) => {
    const rowY = y + i * rowH;
    // Thin gray divider (except first row)
    if (i > 0) drawGrayLine(doc, rowY, cardX + 4, cardX + cardW - 4);
    const textY = rowY + rowH / 2 + 1.5;
    // Gold label
    tc(doc, GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(label, cardX + 6, textY - 3);
    // Dark-gray value
    tc(doc, DARK_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const maxW = cardW - 50;
    const lines = doc.splitTextToSize(value, maxW);
    doc.text(lines[0] ?? '', cardX + 6, textY + 2.5);
  });

  // Gold certified badge
  y = 178;
  const badgeW = 80;
  const badgeX = (PW - badgeW) / 2;
  fc(doc, GOLD);
  doc.roundedRect(badgeX, y, badgeW, 10, 2, 2, 'F');
  tc(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('\u2713 LUXURY DECKING CERTIFIED', PW / 2, y + 6.5, { align: 'center' });

  // Footer
  tc(doc, MID_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'LUXURY DECKING  \u00B7  OTTAWA, ON  \u00B7  613-707-3060  \u00B7  luxurydecking.ca',
    PW / 2,
    PH - 10,
    { align: 'center' }
  );
}

// -----------------------------------------------------------------------
// Pages 2-6: Completion Evidence pages (one per fieldProgress section)
// -----------------------------------------------------------------------
async function buildEvidencePage(
  doc: jsPDF,
  sectionIndex: number,
  checklist: ChecklistItem[],
  photos: PhotoUpload[],
  logoBase64: string | null
): Promise<void> {
  drawGoldBorder(doc);

  // Black header band
  fc(doc, BLACK);
  doc.rect(4, 4, PW - 8, 28, 'F');

  // White logo — left-aligned in header
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', MARGIN + 2, 9, 30, 10);
    } catch {
      tc(doc, WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('LUXURY DECKING', MARGIN + 2, 20);
    }
  } else {
    tc(doc, WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('LUXURY DECKING', MARGIN + 2, 20);
  }

  // "VERIFIED BUILD PASSPORT" in gold above section name on the right
  tc(doc, GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('VERIFIED BUILD PASSPORT', PW - MARGIN - 2, 13, { align: 'right' });

  // Section name in white
  tc(doc, WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    (PAGE_TITLES[sectionIndex] ?? `Section ${sectionIndex}`).toUpperCase(),
    PW - MARGIN - 2,
    22,
    { align: 'right' }
  );

  // Stats strip in gold
  const totalItems = checklist.length;
  const completedItems = checklist.filter(c => c.completed).length;
  const photoCount = photos.filter(p => p.cloudinaryUrl ?? p.url).length;

  fc(doc, GOLD);
  doc.rect(4, 32, PW - 8, 9, 'F');
  tc(doc, BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(
    `${completedItems} of ${totalItems} items completed  \u00B7  ${photoCount} site photos`,
    PW / 2,
    37.5,
    { align: 'center' }
  );

  // Checklist section
  let cy = 47;

  tc(doc, GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('COMPLETION CHECKLIST', MARGIN, cy);
  cy += 3;
  drawGoldLine(doc, cy);
  cy += 5;

  const circleR = 2.2;
  const itemIndent = MARGIN + 8;
  const textMaxW = PW - itemIndent - MARGIN - 4;

  for (const item of checklist) {
    // Page break guard
    if (cy > PH - 40) {
      doc.addPage();
      drawGoldBorder(doc);
      cy = 14;
    }

    const circleX = MARGIN + circleR + 1;
    const circleY = cy + 0.5;

    if (item.isNA) {
      // Gray filled circle with "N/A"
      fc(doc, MID_GRAY);
      doc.circle(circleX, circleY, circleR, 'F');
      tc(doc, WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.5);
      doc.text('N/A', circleX, circleY + 1.5, { align: 'center' });
      // Item text mid-gray
      tc(doc, MID_GRAY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    } else if (item.completed) {
      // Gold filled circle with white check
      fc(doc, GOLD);
      doc.circle(circleX, circleY, circleR, 'F');
      tc(doc, WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('\u2713', circleX, circleY + 1.8, { align: 'center' });
      // Item text dark-gray
      tc(doc, DARK_GRAY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    } else {
      // Outline circle only
      dc(doc, LIGHT_GRAY);
      doc.setLineWidth(0.4);
      doc.circle(circleX, circleY, circleR, 'S');
      // Item text light-gray
      tc(doc, LIGHT_GRAY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    const labelLines = doc.splitTextToSize(item.label, textMaxW);
    doc.text(labelLines, itemIndent, cy + 2.5);
    cy += Math.max(6, labelLines.length * 4.5) + 1.5;
  }

  // Photos section
  if (photoCount === 0) return;

  if (cy > PH - 50) {
    doc.addPage();
    drawGoldBorder(doc);
    cy = 14;
  }

  cy += 4;
  tc(doc, GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SITE PHOTOS', MARGIN, cy);
  cy += 3;
  drawGoldLine(doc, cy);
  cy += 5;

  const photoW = 82;
  const photoH = 60;
  const photoGap = 8;
  const col2X = MARGIN + photoW + photoGap;

  let colIndex = 0;
  for (const photo of photos) {
    const photoUrl = photo.cloudinaryUrl ?? photo.url;
    if (!photoUrl) continue;

    const xPos = colIndex === 0 ? MARGIN : col2X;

    // Page break guard
    if (cy + photoH + 14 > PH - 10) {
      doc.addPage();
      drawGoldBorder(doc);
      cy = 14;
      colIndex = 0;
    }

    // Fetch image
    const imgData = await fetchImageAsBase64(photoUrl);

    if (imgData) {
      try {
        doc.addImage(imgData, 'JPEG', xPos, cy, photoW, photoH);
      } catch {
        // Show placeholder box
        doc.setFillColor(245, 243, 238);
        dc(doc, LIGHT_GRAY);
        doc.setLineWidth(0.3);
        doc.rect(xPos, cy, photoW, photoH, 'FD');
        tc(doc, MID_GRAY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('Photo unavailable', xPos + photoW / 2, cy + photoH / 2, { align: 'center' });
      }
    } else {
      // Placeholder box
      doc.setFillColor(245, 243, 238);
      dc(doc, LIGHT_GRAY);
      doc.setLineWidth(0.3);
      doc.rect(xPos, cy, photoW, photoH, 'FD');
      tc(doc, MID_GRAY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('Photo unavailable', xPos + photoW / 2, cy + photoH / 2, { align: 'center' });
    }

    // Gold border around photo
    dc(doc, GOLD);
    doc.setLineWidth(0.4);
    doc.rect(xPos, cy, photoW, photoH);

    // Caption below
    tc(doc, MID_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const captionLines = doc.splitTextToSize(photo.label, photoW);
    doc.text(captionLines[0] ?? '', xPos, cy + photoH + 4);

    colIndex++;
    if (colIndex >= 2) {
      cy += photoH + 14;
      colIndex = 0;
    }
  }

  // If last row had only one photo, advance
  if (colIndex === 1) {
    cy += photoH + 14;
  }
}

// -----------------------------------------------------------------------
// Warranty Certificate Page
// -----------------------------------------------------------------------
function buildWarrantyCertPage(doc: jsPDF, job: Job, logoBlackBase64: string | null): void {
  drawGoldBorder(doc);

  // Heavier outer border matching the actual certificate
  dc(doc, GOLD);
  doc.setLineWidth(1.06); // ~3pt
  doc.rect(4, 4, PW - 8, PH - 8);
  doc.setLineWidth(0.18); // ~0.5pt
  doc.rect(7, 7, PW - 14, PH - 14);

  let y = 22;

  // Black logo centred at top
  if (logoBlackBase64) {
    try {
      const logoW = 44;
      doc.addImage(logoBlackBase64, 'PNG', (PW - logoW) / 2, y, logoW, 14);
      y += 22;
    } catch {
      tc(doc, DARK_GRAY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LUXURY DECKING', PW / 2, y + 8, { align: 'center' });
      y += 20;
    }
  } else {
    tc(doc, DARK_GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LUXURY DECKING', PW / 2, y + 8, { align: 'center' });
    y += 20;
  }

  // Title
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Labour & Workmanship Warranty Certificate', PW / 2, y, { align: 'center' });
  y += 8;

  // Gold italic subtitle
  tc(doc, GOLD);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(11);
  doc.text('5-Year Standard  \u2022  10-Year Extended Coverage', PW / 2, y, { align: 'center' });
  y += 8;

  drawGoldLine(doc, y);
  y += 10;

  // Fields with gold underlines
  const tier = warrantyTier(job);
  const fields: [string, string][] = [
    ['Client Name:', job.clientName ?? 'N/A'],
    ['Project Address:', job.address ?? job.projectAddress ?? 'N/A'],
    ['Project Completion Date:', formatDate(job.updatedAt)],
    ['Project / Invoice #:', formatJobId(job.id)],
  ];

  fields.forEach(([label, value]) => {
    tc(doc, DARK_GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, MARGIN + 6, y);
    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth(label);
    doc.text(value, MARGIN + 6 + labelW + 3, y);
    // Gold underline
    dc(doc, GOLD);
    doc.setLineWidth(0.4);
    doc.line(MARGIN + 6, y + 2, PW - MARGIN - 6, y + 2);
    y += 12;
  });

  y += 4;

  // Warranty Tier checkboxes
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Warranty Tier:', MARGIN + 6, y);
  y += 8;

  const checkSize = 5;
  const checkGap = 8;

  // Standard 5-Year
  const isStandard = !tier.isDiamond;
  dc(doc, GOLD);
  doc.setLineWidth(0.5);
  if (isStandard) {
    fc(doc, GOLD);
    doc.rect(MARGIN + 6, y - 4, checkSize, checkSize, 'FD');
    tc(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('\u2713', MARGIN + 6 + 1.5, y + 0.2);
  } else {
    doc.rect(MARGIN + 6, y - 4, checkSize, checkSize, 'S');
  }
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Standard 5-Year', MARGIN + 6 + checkSize + checkGap, y);

  // Extended 10-Year
  const extX = MARGIN + 6 + checkSize + checkGap + doc.getTextWidth('Standard 5-Year') + 14;
  if (tier.isDiamond) {
    fc(doc, GOLD);
    doc.rect(extX, y - 4, checkSize, checkSize, 'FD');
    tc(doc, BLACK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('\u2713', extX + 1.5, y + 0.2);
  } else {
    dc(doc, GOLD);
    doc.setLineWidth(0.5);
    doc.rect(extX, y - 4, checkSize, checkSize, 'S');
  }
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Extended 10-Year (Diamond / Upgrade)', extX + checkSize + checkGap, y);

  y += 20;

  // Authorised Signature line
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Authorized Signature (Luxury Decking):', MARGIN + 6, y);
  y += 4;
  dc(doc, DARK_GRAY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN + 6, y, MARGIN + 6 + 88, y);

  y += 14;

  // Footer italic note
  tc(doc, MID_GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(
    'This certificate confirms labour warranty coverage subject to full warranty terms on reverse.',
    PW / 2,
    PH - 12,
    { align: 'center' }
  );
}

// -----------------------------------------------------------------------
// Warranty Terms Page
// -----------------------------------------------------------------------
function buildWarrantyTermsPage(doc: jsPDF): void {
  drawGoldBorder(doc);

  let y = 18;

  // Title
  tc(doc, DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(
    'Luxury Decking & PermaLite \u2013 Labour & Workmanship Warranty Terms',
    PW - MARGIN * 2 - 12
  );
  doc.text(titleLines, PW / 2, y, { align: 'center' });
  y += titleLines.length * 7 + 2;

  drawGoldLine(doc, y);
  y += 8;

  type TermSection = { heading: string; body: string };
  const sections: TermSection[] = [
    {
      heading: 'Labour & Workmanship Warranty',
      body: 'Luxury Decking warrants all labour and workmanship for a period of five (5) years from the date of substantial completion. Where the Diamond Package or Extended Coverage Upgrade was selected, the labour and workmanship warranty is extended to ten (10) years from the date of substantial completion.',
    },
    {
      heading: 'Warranty Conditions',
      body: 'This warranty applies to normal residential use only. The structure must not have been altered, modified, or added to without prior written consent from Luxury Decking. Proper drainage conditions must be maintained around the structure, and the deck must not be subjected to abnormal loads.',
    },
    {
      heading: 'Exclusions',
      body: 'This warranty does not cover: normal wear and tear; manufacturer material defects (refer to material supplier warranties); colour fading or weathering of composite or wood materials; frost heave, deck block movement, or soil settlement; drainage issues caused by site conditions beyond our control; Acts of God including but not limited to flooding, hail, and ice storms; or any modifications, additions (including pergolas, hot tubs, or awnings), or repairs made by third parties after project completion.',
    },
    {
      heading: 'Limitation of Remedy',
      body: 'The sole remedy under this warranty is repair or replacement of defective workmanship at Luxury Decking\'s sole discretion. Luxury Decking shall not be liable for any consequential, incidental, or indirect damages arising from any warranty claim.',
    },
    {
      heading: 'Warranty Transferability',
      body: 'This warranty is non-transferable and applies solely to the original purchaser named on this certificate. It does not transfer to subsequent property owners.',
    },
    {
      heading: 'Warranty Claims',
      body: 'To make a warranty claim, contact Luxury Decking at 613-707-3060 or via luxurydecking.ca with your project number and a description of the concern. Luxury Decking will arrange an inspection within a reasonable time. Warranty service will be scheduled at Luxury Decking\'s discretion based on seasonal availability.',
    },
  ];

  const bodyMaxW = PW - MARGIN * 2 - 12;

  for (const section of sections) {
    // Page break guard
    if (y > PH - 30) {
      doc.addPage();
      drawGoldBorder(doc);
      y = 18;
    }

    // Heading in bold dark-gray
    tc(doc, DARK_GRAY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(section.heading, MARGIN + 6, y);
    y += 5;

    // Body in normal mid-gray
    tc(doc, MID_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const bodyLines = doc.splitTextToSize(section.body, bodyMaxW);
    doc.text(bodyLines, MARGIN + 6, y);
    y += bodyLines.length * 4.5 + 6;
  }

  // Footer
  tc(doc, MID_GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(
    'LUXURY DECKING  \u00B7  OTTAWA, ON  \u00B7  613-707-3060  \u00B7  luxurydecking.ca',
    PW / 2,
    PH - 10,
    { align: 'center' }
  );
}

// -----------------------------------------------------------------------
// Main export
// -----------------------------------------------------------------------
export const generateBuildPassport = async (job: Job): Promise<string> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;

  // Pre-fetch both logo variants in parallel
  const [logoWhiteBase64, logoBlackBase64] = await Promise.all([
    fetchImageAsBase64('/assets/logo-white.png'),
    fetchImageAsBase64('/assets/logo-black.png'),
  ]);

  // Page 1: Cover
  await buildCoverPage(doc, job, logoWhiteBase64);

  // Pages 2-6: One per fieldProgress section (indices 1-5), skip empty sections
  const fieldProgress = job.fieldProgress ?? {};
  for (let i = 1; i <= 5; i++) {
    const section = fieldProgress[i];
    if (!section) continue;

    const checklist: ChecklistItem[] = section.checklist ?? [];
    const photos: PhotoUpload[] = section.photos ?? [];

    // Skip if both are empty
    if (checklist.length === 0 && photos.length === 0) continue;

    doc.addPage();
    await buildEvidencePage(doc, i, checklist, photos, logoWhiteBase64);
  }

  // Warranty Certificate Page
  doc.addPage();
  buildWarrantyCertPage(doc, job, logoBlackBase64);

  // Warranty Terms Page
  doc.addPage();
  buildWarrantyTermsPage(doc);

  return doc.output('datauristring');
};
