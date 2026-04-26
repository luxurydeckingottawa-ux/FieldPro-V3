/**
 * InstaQuote Branded Blueprint PDF Generator (server-side)
 * --------------------------------------------------------
 * Used by netlify/functions/instaquote-lead.js to render a Luxury Decking
 * branded PDF the moment a customer finishes the website calculator.
 *
 * Why jsPDF (and not Puppeteer):
 *   - jsPDF is already a dependency (vendor-pdf chunk), pure JS, ~100 KB.
 *   - Puppeteer + @sparticuz/chromium adds ~50 MB to the function bundle
 *     and 2–4 s of cold-start latency on Netlify free tier. Overkill for
 *     a one-page brochure that will run inline in the request.
 *
 * Returns: Buffer (binary PDF) — emailed as attachment AND uploaded to
 * Supabase Storage so the customer also gets a signed download link.
 *
 * Brand: black background, gold accents (#C5A059), the same tier feature
 * lists as the on-page calculator so the email matches the website exactly.
 */

// Project package.json sets `"type": "module"` so this file loads as ESM.
// jsPDF's Node entry is CommonJS — use default-import + destructure for
// interop. The Node build avoids the DOM globals (window/document) that
// the browser entry references at load time.
import jspdfPkg from 'jspdf/dist/jspdf.node.min.js';
const { jsPDF } = jspdfPkg;

// ─── Brand palette (RGB tuples for jsPDF) ───────────────────────────────────
const GOLD   = [197, 160,  89];  // #C5A059
const BLACK  = [  0,   0,   0];
const NEAR   = [ 18,  18,  18];  // tier card background
const WHITE  = [255, 255, 255];
const MUTED  = [180, 180, 180];
const DIM    = [110, 110, 110];

// ─── Tier copy (matches on-page calculator exactly) ─────────────────────────
const TIERS = [
  {
    key: 'silver',
    name: 'SILVER SERIES',
    tagline: 'Premium pressure-treated wood. Timeless, warm, value-driven.',
    badge: null,
    features: [
      'Kiln-dried premium pressure-treated lumber',
      'Helical-pile foundation system',
      'Hidden fastener system on deck surface',
      'Stainless steel structural hardware',
      'Standard pressure-treated railing options',
      '5-year workmanship warranty',
    ],
  },
  {
    key: 'gold',
    name: 'GOLD SERIES',
    tagline: 'Premium composite by Fiberon & TimberTech. The Ottawa favourite.',
    badge: 'MOST CHOSEN',
    features: [
      'Premium capped composite boards (Fiberon / TimberTech)',
      'Helical-pile foundation system',
      'Hidden fastener system — no visible screws',
      'Stainless steel structural hardware',
      'Aluminum or glass railing upgrade options',
      '25-year board warranty + 5-year workmanship',
    ],
  },
  {
    key: 'platinum',
    name: 'PLATINUM SERIES',
    tagline: 'Premium PVC, fully capped. Top-of-class durability and finish.',
    badge: null,
    features: [
      'Premium fully-capped PVC decking',
      'Helical-pile foundation system',
      'Hidden fastener system + finished facia',
      'Stainless steel structural hardware',
      'Designer railing system included',
      'Lifetime board warranty + 10-year workmanship',
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function fc(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
function tc(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
function dc(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-CA');
}

function fmtRange(low, high) {
  return `${fmtMoney(low)} – ${fmtMoney(high)}`;
}

// ─── Logo cache ─────────────────────────────────────────────────────────────
// Fetch the GOLD logo PNG once per cold start and cache. jsPDF needs a
// base64 data URI to embed images. Falls back gracefully to the text
// wordmark if the fetch ever fails. (Note: the file at /assets/logo-white.png
// is misnamed -- it's actually a JPEG. The gold version is a real RGBA PNG
// that jsPDF accepts cleanly and looks great on the black PDF background.)
const LOGO_URL = 'https://fieldprov3.netlify.app/assets/logo-luxury-gold.png';
let _logoCache = null;

async function getLogoDataUri() {
  if (_logoCache !== null) return _logoCache;
  try {
    const res = await fetch(LOGO_URL);
    if (!res.ok) throw new Error(`logo fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    _logoCache = `data:image/png;base64,${buf.toString('base64')}`;
    return _logoCache;
  } catch (e) {
    console.warn('Logo fetch failed, falling back to text wordmark:', e.message);
    _logoCache = '';  // sentinel: tried, failed — don't keep retrying every PDF
    return '';
  }
}

// ─── Main entry ─────────────────────────────────────────────────────────────
/**
 * @param {object} input
 * @param {string} input.email        Customer email
 * @param {object} input.config       { width_ft, length_ft, sqft, perimeter_lin_ft, steps,
 *                                      railing_material, railing_sides, railing_lin_ft }
 * @param {object} input.estimates    { silver: {low,high}, gold: {...}, platinum: {...} }
 * @param {object} input.company      { name, phone, email, website } (optional, defaults inline)
 * @returns {Promise<Buffer>} PDF binary
 */
async function generateInstaQuotePdf({ email, config, estimates, company }) {
  const COMPANY = company || {
    name: 'Luxury Decking',
    phone: '(613) 707-3060',
    email: 'admin@luxurydecking.ca',
    website: 'luxurydecking.ca',
  };

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();   // 612 pt
  const H = doc.internal.pageSize.getHeight();  // 792 pt
  const M = 36;                                 // margin

  // ── Black page background ────────────────────────────────────────────────
  fc(doc, BLACK);
  doc.rect(0, 0, W, H, 'F');

  // ── Gold top bar + brand logo ────────────────────────────────────────────
  fc(doc, GOLD);
  doc.rect(0, 0, W, 6, 'F');

  // Render the gold logo CENTRED at the top of the page using its
  // NATURAL aspect ratio (2053×932 PNG = ~2.20:1). At width 200pt, height
  // is 200/2.20 ≈ 91pt — gives it room to breathe instead of being
  // squished. Falls back to a centred text wordmark if fetch/embed fails.
  const LOGO_W = 200;
  const LOGO_H = 91;            // natural aspect ratio of logo-luxury-gold.png
  const LOGO_X = (W - LOGO_W) / 2;
  const LOGO_Y = 28;            // 22pt clearance below the gold bar
  const HEADER_BOTTOM = LOGO_Y + LOGO_H;   // ~119pt

  const logoDataUri = await getLogoDataUri();
  if (logoDataUri) {
    try {
      doc.addImage(logoDataUri, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
    } catch (imgErr) {
      console.warn('addImage failed, using wordmark fallback:', imgErr.message);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      tc(doc, GOLD);
      doc.text(COMPANY.name.toUpperCase(), W / 2, 70, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    tc(doc, GOLD);
    doc.text(COMPANY.name.toUpperCase(), W / 2, 70, { align: 'center' });
  }

  // Tagline immediately under the logo, centred
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  tc(doc, MUTED);
  doc.text('PREMIUM OUTDOOR LIVING  ·  OTTAWA, ON', W / 2, HEADER_BOTTOM + 14, { align: 'center' });

  // Contact strip — centred under the tagline (more visually balanced
  // than the previous right-side stack which fought the centred logo).
  doc.setFontSize(9);
  tc(doc, MUTED);
  doc.text(
    `${COMPANY.phone}   ·   ${COMPANY.email}   ·   ${COMPANY.website}`,
    W / 2,
    HEADER_BOTTOM + 28,
    { align: 'center' }
  );

  // ── Title ─ pushed down to give the header proper breathing room
  let y = HEADER_BOTTOM + 70;   // ~190pt — well clear of the contact strip
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  tc(doc, WHITE);
  doc.text('Your Deck Blueprint', W / 2, y, { align: 'center' });

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  tc(doc, MUTED);
  doc.text(
    'A personalized estimate built from the dimensions you provided on luxurydecking.ca.',
    W / 2, y,
    { align: 'center' },
  );

  // ── Project summary card ────────────────────────────────────────────────
  y += 28;
  fc(doc, NEAR);
  doc.roundedRect(M, y, W - 2 * M, 92, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  tc(doc, GOLD);
  doc.text('YOUR PROJECT', M + 18, y + 22);

  // 2x3 grid of facts
  const facts = [
    ['Footprint',   `${config.width_ft} ft × ${config.length_ft} ft  (${config.sqft} sq ft)`],
    ['Perimeter',   `${config.perimeter_lin_ft} linear ft`],
    ['Steps',       `${config.steps}`],
    ['Railing',     `${labelRailing(config.railing_material)}  •  ${config.railing_sides} side(s)`],
    ['Railing run', `${config.railing_lin_ft} linear ft`],
    ['Sent to',     email],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const colW = (W - 2 * M - 36) / 3;
  facts.forEach((pair, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = M + 18 + col * colW;
    const yy  = y + 44 + row * 22;
    tc(doc, DIM);
    doc.text(pair[0].toUpperCase(), x, yy);
    tc(doc, WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text(pair[1], x, yy + 12);
    doc.setFont('helvetica', 'normal');
  });

  // ── Tier cards ──────────────────────────────────────────────────────────
  y += 110;
  const cardH = 168;
  const cardW = (W - 2 * M - 16) / 3; // 8pt gap between cards

  TIERS.forEach((tier, idx) => {
    const x = M + idx * (cardW + 8);
    const est = estimates[tier.key];

    // Card background
    fc(doc, NEAR);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, 'F');

    // Gold accent stripe at top
    fc(doc, GOLD);
    doc.rect(x, y, cardW, 3, 'F');

    let cy = y + 22;

    // Badge (Most Chosen)
    if (tier.badge) {
      fc(doc, GOLD);
      doc.roundedRect(x + 12, cy - 12, 78, 14, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      tc(doc, BLACK);
      doc.text(tier.badge, x + 12 + 39, cy - 2, { align: 'center' });
      cy += 14;
    }

    // Tier name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    tc(doc, GOLD);
    doc.text(tier.name, x + 12, cy);
    cy += 16;

    // Tagline (wrapped)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    tc(doc, MUTED);
    const taglineLines = doc.splitTextToSize(tier.tagline, cardW - 24);
    doc.text(taglineLines, x + 12, cy);
    cy += taglineLines.length * 10 + 6;

    // Price range
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    tc(doc, WHITE);
    doc.text(fmtRange(est.low, est.high), x + 12, cy);
    cy += 14;

    // Feature checklist
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    tc(doc, MUTED);
    tier.features.forEach((feat) => {
      // Gold checkmark
      tc(doc, GOLD);
      doc.text('+', x + 12, cy);
      tc(doc, MUTED);
      const line = doc.splitTextToSize(feat, cardW - 28);
      doc.text(line, x + 22, cy);
      cy += line.length * 9;
    });
  });

  // ── What happens next ───────────────────────────────────────────────────
  y += cardH + 24;

  fc(doc, GOLD);
  doc.rect(M, y, 4, 60, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  tc(doc, GOLD);
  doc.text('WHAT HAPPENS NEXT', M + 14, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  tc(doc, WHITE);
  const next = [
    '1.  Book a free in-person quote — we measure, sketch, and confirm your scope.',
    '2.  Get a fixed package price for the tier you choose, with payment terms in writing.',
    `3.  Reply to this email or call ${COMPANY.phone} when you’re ready to start.`,
  ];
  next.forEach((line, i) => doc.text(line, M + 14, y + 30 + i * 12));

  // ── Disclaimer + footer ────────────────────────────────────────────────
  y = H - 70;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  tc(doc, DIM);
  const disclaimer = doc.splitTextToSize(
    'Estimate ranges shown are based on the dimensions you supplied on luxurydecking.ca and the tier feature sets above. Final pricing is confirmed after an in-person site visit and may vary based on site conditions, permit requirements, and material selections. This document is informational and does not constitute a binding quote.',
    W - 2 * M,
  );
  doc.text(disclaimer, M, y);

  // Bottom gold bar
  fc(doc, GOLD);
  doc.rect(0, H - 6, W, 6, 'F');

  // Return as Node Buffer (jsPDF in node returns ArrayBuffer)
  const ab = doc.output('arraybuffer');
  return Buffer.from(ab);
}

function labelRailing(mat) {
  switch (mat) {
    case 'aluminum':         return 'Aluminum';
    case 'glass':            return 'Glass';
    case 'pressure_treated': return 'Pressure-Treated';
    case 'none':             return 'No railing';
    default:                 return mat || '—';
  }
}

export { generateInstaQuotePdf };
