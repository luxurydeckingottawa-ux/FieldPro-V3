/**
 * Netlify Function: instaquote-lead
 * ---------------------------------
 * Receives lead submissions from the InstaQuote widget on luxurydecking.ca.
 *
 * Flow (all inline, ~2-3 s):
 *   1. CORS / method / origin / honeypot checks
 *   2. Validate payload per the contract in instaquote/COWORK_INTEGRATION_BRIEF.md
 *   3. Hash submitter IP (SHA-256 + ORG_SALT) for rate-limit + analytics
 *   4. Rate-limit: ≥ 5 submissions / hour / ip_hash → 429
 *   5. Idempotency: existing submission_id → 409 with idempotent:true
 *   6. INSERT row into `jobs` (pipeline_stage = 'INSTAQUOTE_LEAD')
 *   7. Generate branded PDF, upload to Storage, save signed URL on row
 *   8. Email customer via SendGrid (PDF attached + signed link)
 *   9. Return 200 { ok:true, lead_id }
 *
 * Single tenant for now — ORG_ID hardcoded to Luxury Decking. When we go
 * multi-tenant the origin → org lookup goes here.
 *
 * Env vars required (set in Netlify env):
 *   ORG_SALT                    — 32+ random bytes for IP hashing
 *   SUPABASE_URL                — already exists
 *   SUPABASE_SERVICE_ROLE_KEY   — already exists
 *   SENDGRID_API_KEY            — already exists
 *   SENDGRID_FROM_EMAIL         — already exists (admin@luxurydecking.ca)
 *   SENDGRID_FROM_NAME          — optional, defaults to 'Luxury Decking'
 *   STOREFRONT_BASE_URL         — defaults to 'https://luxurydecking.ca'
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { generateInstaQuotePdf } = require('./_instaquote-pdf.js');

// ─── Constants ──────────────────────────────────────────────────────────────
const LUXURY_DECKING_ORG_ID = '00000000-0000-0000-0000-000000000001';

const ALLOWED_ORIGINS = [
  'https://luxurydecking.ca',
  'https://www.luxurydecking.ca',
];
const ALLOWED_ORIGIN_SUFFIXES = ['.myshopify.com'];

const RATE_LIMIT_PER_HOUR = 5;
const STORAGE_BUCKET = 'instaquote-pdfs';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const MAX_BODY_BYTES = 50_000;

const VALID_RAILING = new Set(['pressure_treated', 'aluminum', 'glass', 'none']);
const VALID_RAILING_SIDES = new Set([0, 1, 2, 3, 4]);

// ─── CORS helpers ───────────────────────────────────────────────────────────
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some(suf => u.hostname.endsWith(suf));
  } catch {
    return false;
  }
}

function corsHeaders(originHeader) {
  const allowed = isAllowedOrigin(originHeader) ? originHeader : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// ─── Response helpers ───────────────────────────────────────────────────────
function jsonResponse(statusCode, body, originHeader) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(originHeader) },
    body: JSON.stringify(body),
  };
}

function validationError(field, message, origin) {
  return jsonResponse(400, { ok: false, error: 'validation_error', field, message }, origin);
}

// ─── Validation ─────────────────────────────────────────────────────────────
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFiniteNumber(n) { return typeof n === 'number' && Number.isFinite(n); }
function inRange(n, lo, hi) { return isFiniteNumber(n) && n >= lo && n <= hi; }

/** Returns null on success, else { field, message }. */
function validatePayload(body) {
  if (!body || typeof body !== 'object')
    return { field: 'body', message: 'Body must be a JSON object.' };

  if (!UUID_V4_RE.test(body.submission_id || ''))
    return { field: 'submission_id', message: 'submission_id must be a UUIDv4.' };

  if (typeof body.email !== 'string' || body.email.length > 254 || !EMAIL_RE.test(body.email))
    return { field: 'email', message: 'Invalid email format.' };

  // Honeypot — must be empty or omitted (we handle non-empty separately, silently)
  if ('honeypot' in body && body.honeypot !== '' && body.honeypot != null)
    return { field: 'honeypot', message: 'Form must be filled by a human.' };

  const c = body.config;
  if (!c || typeof c !== 'object')
    return { field: 'config', message: 'config object is required.' };

  if (!inRange(c.width_ft,  4, 80))  return { field: 'config.width_ft',  message: 'width_ft must be between 4 and 80.' };
  if (!inRange(c.length_ft, 4, 80))  return { field: 'config.length_ft', message: 'length_ft must be between 4 and 80.' };

  const expectedSqft = c.width_ft * c.length_ft;
  if (!isFiniteNumber(c.sqft) || Math.abs(c.sqft - expectedSqft) > 1)
    return { field: 'config.sqft', message: `sqft must equal width_ft × length_ft (±1). Expected ~${expectedSqft}.` };

  if (!inRange(c.perimeter_lin_ft, 8, 320))
    return { field: 'config.perimeter_lin_ft', message: 'perimeter_lin_ft must be between 8 and 320.' };

  if (!inRange(c.steps, 0, 20) || !Number.isInteger(c.steps))
    return { field: 'config.steps', message: 'steps must be an integer 0-20.' };

  if (!VALID_RAILING.has(c.railing_material))
    return { field: 'config.railing_material', message: 'railing_material must be pressure_treated, aluminum, glass, or none.' };

  if (!VALID_RAILING_SIDES.has(c.railing_sides))
    return { field: 'config.railing_sides', message: 'railing_sides must be 0, 1, 2, 3, or 4.' };

  if (!inRange(c.railing_lin_ft, 0, 320))
    return { field: 'config.railing_lin_ft', message: 'railing_lin_ft must be between 0 and 320.' };

  const e = body.estimates;
  if (!e || typeof e !== 'object')
    return { field: 'estimates', message: 'estimates object is required.' };
  for (const tier of ['silver', 'gold', 'platinum']) {
    const t = e[tier];
    if (!t || !isFiniteNumber(t.low) || !isFiniteNumber(t.high))
      return { field: `estimates.${tier}`, message: `estimates.${tier} requires numeric low and high.` };
    if (!(t.low > 0 && t.high > 0 && t.low <= t.high))
      return { field: `estimates.${tier}`, message: `estimates.${tier}: low and high must be > 0 and low <= high.` };
  }

  const m = body.meta;
  if (!m || typeof m !== 'object')
    return { field: 'meta', message: 'meta object is required.' };
  if (typeof m.page_url !== 'string')
    return { field: 'meta.page_url', message: 'page_url is required.' };

  // Page URL must come from an allowlisted origin
  try {
    const url = new URL(m.page_url);
    const pageOrigin = `${url.protocol}//${url.host}`;
    if (!isAllowedOrigin(pageOrigin))
      return { field: 'meta.page_url', message: 'page_url must be on an allowlisted domain.' };
  } catch {
    return { field: 'meta.page_url', message: 'page_url must be a valid URL.' };
  }

  if (typeof m.submitted_at_utc !== 'string')
    return { field: 'meta.submitted_at_utc', message: 'submitted_at_utc is required.' };
  const submittedAt = Date.parse(m.submitted_at_utc);
  if (!Number.isFinite(submittedAt))
    return { field: 'meta.submitted_at_utc', message: 'submitted_at_utc must be ISO 8601.' };
  if (Math.abs(Date.now() - submittedAt) > 10 * 60 * 1000)
    return { field: 'meta.submitted_at_utc', message: 'submitted_at_utc must be within ±10 minutes of server time.' };

  return null;
}

// ─── Misc helpers ───────────────────────────────────────────────────────────
function clientIp(event) {
  // Netlify forwards the real client IP in x-nf-client-connection-ip
  return (
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['X-NF-Client-Connection-Ip'] ||
    (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

function hashIp(ip, salt) {
  return crypto.createHash('sha256').update(`${ip}|${salt}`).digest('hex');
}

function nextJobNumber() {
  // Lightweight unique job number for InstaQuote leads. Office can rename later.
  const ts = new Date();
  const yyyymmdd = ts.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `IQ-${yyyymmdd}-${rand}`;
}

// ─── Main handler ───────────────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin || '';

  // 1. Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  // 2. Method
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' }, origin);
  }

  // 3. Origin allowlist (Origin OR Referer must be allowlisted)
  const referer = event.headers.referer || event.headers.Referer || '';
  let refererOrigin = '';
  try { refererOrigin = referer ? new URL(referer).origin : ''; } catch { /* ignore */ }
  if (!isAllowedOrigin(origin) && !isAllowedOrigin(refererOrigin)) {
    return jsonResponse(403, { ok: false, error: 'forbidden_origin' }, origin);
  }

  // 4. Body size guard
  if (event.body && event.body.length > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, error: 'payload_too_large' }, origin);
  }

  // 5. Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json', message: 'Body is not valid JSON.' }, origin);
  }

  // 6. Env / Supabase setup
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ORG_SALT = process.env.ORG_SALT;
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
  const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Luxury Decking';
  const STOREFRONT = process.env.STOREFRONT_BASE_URL || 'https://luxurydecking.ca';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('instaquote-lead: missing Supabase env vars');
    return jsonResponse(500, { ok: false, error: 'internal_error' }, origin);
  }
  if (!ORG_SALT) {
    console.error('instaquote-lead: missing ORG_SALT');
    return jsonResponse(500, { ok: false, error: 'internal_error' }, origin);
  }
  if (!SENDGRID_API_KEY || !FROM_EMAIL) {
    console.error('instaquote-lead: missing SendGrid env vars');
    return jsonResponse(500, { ok: false, error: 'internal_error' }, origin);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip = clientIp(event);
  const ip_hash = hashIp(ip, ORG_SALT);

  // 7. Honeypot — silent 202, log to bot table
  if (typeof body.honeypot === 'string' && body.honeypot.trim() !== '') {
    await supabase.from('instaquote_bot_log').insert({
      org_id: LUXURY_DECKING_ORG_ID,
      reason: 'honeypot',
      ip_hash,
      user_agent: (body?.meta?.user_agent || '').slice(0, 500),
      origin: origin || refererOrigin || null,
      payload_excerpt: { email: typeof body.email === 'string' ? body.email.slice(0, 254) : null },
    });
    // Bot thinks it succeeded — don't tip them off
    return jsonResponse(202, { ok: true }, origin);
  }

  // 8. Validate payload
  const ve = validatePayload(body);
  if (ve) {
    // Log validation failures lightly (no PII payload, just field name)
    await supabase.from('instaquote_bot_log').insert({
      org_id: LUXURY_DECKING_ORG_ID,
      reason: 'validation',
      ip_hash,
      user_agent: (body?.meta?.user_agent || '').slice(0, 500),
      origin: origin || refererOrigin || null,
      payload_excerpt: { field: ve.field },
    }).then(() => {}, () => {}); // best effort
    return validationError(ve.field, ve.message, origin);
  }

  // 9. Rate limit — count instaquote leads from this ip_hash in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: rlErr } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', LUXURY_DECKING_ORG_ID)
    .eq('lead_source', 'instaquote')
    .eq('ip_hash', ip_hash)
    .gte('created_at', oneHourAgo);

  if (rlErr) {
    console.error('instaquote-lead rate-limit query error:', rlErr);
    return jsonResponse(500, { ok: false, error: 'internal_error' }, origin);
  }

  if ((recentCount || 0) >= RATE_LIMIT_PER_HOUR) {
    await supabase.from('instaquote_bot_log').insert({
      org_id: LUXURY_DECKING_ORG_ID,
      reason: 'rate_limit',
      ip_hash,
      user_agent: (body?.meta?.user_agent || '').slice(0, 500),
      origin: origin || refererOrigin || null,
      payload_excerpt: { recentCount },
    });
    return jsonResponse(429, { ok: false, error: 'rate_limited', retry_after_seconds: 3600 }, origin);
  }

  // 10. Idempotency — check submission_id
  {
    const { data: existing, error: idemErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('submission_id', body.submission_id)
      .maybeSingle();

    if (idemErr) {
      console.error('instaquote-lead idempotency query error:', idemErr);
      return jsonResponse(500, { ok: false, error: 'internal_error' }, origin);
    }
    if (existing && existing.id) {
      return jsonResponse(409, { ok: true, lead_id: existing.id, idempotent: true }, origin);
    }
  }

  // 11. Insert lead row
  const sourceMetadata = {
    config: body.config,
    estimates: body.estimates,
    meta: body.meta,
  };

  const insertPayload = {
    org_id: LUXURY_DECKING_ORG_ID,
    job_number: nextJobNumber(),
    client_name: '',
    client_email: body.email,
    project_address: '',
    pipeline_stage: 'INSTAQUOTE_LEAD',
    status: 'LEAD',
    lifecycle_stage: 'lead',
    lead_source: 'instaquote',
    source_metadata: sourceMetadata,
    submission_id: body.submission_id,
    ip_hash,
    estimate_amount: body.estimates?.gold?.low || null, // best mid-tier number to seed the pipeline
    next_follow_up_date: new Date().toISOString().slice(0, 10),
    follow_up_status: 'NEW',
  };

  const { data: insertedRow, error: insertErr } = await supabase
    .from('jobs')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertErr) {
    // Race: another request inserted the same submission_id between our check and now.
    // The unique index will surface as code '23505'.
    if (insertErr.code === '23505') {
      const { data: raceRow } = await supabase
        .from('jobs')
        .select('id')
        .eq('submission_id', body.submission_id)
        .maybeSingle();
      if (raceRow && raceRow.id) {
        return jsonResponse(409, { ok: true, lead_id: raceRow.id, idempotent: true }, origin);
      }
    }
    console.error('instaquote-lead insert error:', insertErr);
    return jsonResponse(500, { ok: false, error: 'internal_error' }, origin);
  }

  const leadId = insertedRow.id;

  // 12. Generate PDF
  let pdfBuffer;
  try {
    pdfBuffer = generateInstaQuotePdf({
      email: body.email,
      config: body.config,
      estimates: body.estimates,
    });
  } catch (e) {
    console.error('instaquote-lead PDF generation error:', e);
    // Lead is already saved — return 200 so customer's submit doesn't fail,
    // but flag in logs so we can backfill the email manually.
    return jsonResponse(200, {
      ok: true,
      lead_id: leadId,
      warning: 'pdf_generation_failed_email_not_sent',
    }, origin);
  }

  // 13. Upload to Supabase Storage
  const storagePath = `${LUXURY_DECKING_ORG_ID}/${leadId}.pdf`;
  let signedUrl = null;
  try {
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (upErr) throw upErr;

    const { data: signed, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signErr) throw signErr;

    signedUrl = signed?.signedUrl || null;

    if (signedUrl) {
      await supabase
        .from('jobs')
        .update({ pdf_url: signedUrl, pdf_generated_at: new Date().toISOString() })
        .eq('id', leadId);
    }
  } catch (e) {
    console.error('instaquote-lead storage upload error:', e);
    // Continue — we'll still try to email the PDF as an attachment
  }

  // 14. Email via SendGrid (PDF attached + signed link if we have one)
  try {
    await sendBlueprintEmail({
      apiKey: SENDGRID_API_KEY,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      to: body.email,
      pdfBuffer,
      signedUrl,
      config: body.config,
      estimates: body.estimates,
      storefront: STOREFRONT,
    });
  } catch (e) {
    console.error('instaquote-lead email send error:', e);
    return jsonResponse(200, {
      ok: true,
      lead_id: leadId,
      warning: 'email_send_failed',
    }, origin);
  }

  return jsonResponse(200, { ok: true, lead_id: leadId }, origin);
};

// ─── Email templating + send ────────────────────────────────────────────────
async function sendBlueprintEmail({ apiKey, from, to, pdfBuffer, signedUrl, config, estimates, storefront }) {
  const subject = 'Your Luxury Decking Blueprint';
  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-CA');
  const range = (t) => `${fmt(t.low)} – ${fmt(t.high)}`;

  const linkBlock = signedUrl
    ? `<p style="margin:16px 0;"><a href="${escapeHtml(signedUrl)}" style="display:inline-block;background:#C5A059;color:#000;padding:12px 20px;text-decoration:none;font-weight:bold;border-radius:4px;">Download your blueprint (PDF)</a></p>`
    : '';

  const htmlBody = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#eee;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:24px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-top:4px solid #C5A059;border-bottom:4px solid #C5A059;">
        <tr><td style="padding:28px 32px;">
          <h1 style="color:#C5A059;font-size:22px;margin:0 0 4px;letter-spacing:1px;">LUXURY DECKING</h1>
          <p style="color:#888;font-size:11px;margin:0 0 24px;">Premium Outdoor Living • Ottawa, ON</p>

          <h2 style="color:#fff;font-size:24px;margin:0 0 8px;">Your custom deck blueprint is ready</h2>
          <p style="color:#bbb;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Thanks for using our InstaQuote calculator. Your full branded blueprint is attached as a PDF and shows pricing for all three of our build tiers based on your specs:
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="color:#888;font-size:12px;padding:2px 12px 2px 0;">Footprint</td>
                <td style="color:#fff;font-size:13px;font-weight:bold;">${config.width_ft} ft × ${config.length_ft} ft (${config.sqft} sq ft)</td></tr>
            <tr><td style="color:#888;font-size:12px;padding:2px 12px 2px 0;">Silver</td>
                <td style="color:#fff;font-size:13px;">${escapeHtml(range(estimates.silver))}</td></tr>
            <tr><td style="color:#888;font-size:12px;padding:2px 12px 2px 0;">Gold</td>
                <td style="color:#C5A059;font-size:13px;font-weight:bold;">${escapeHtml(range(estimates.gold))} &nbsp; <span style="color:#888;font-weight:normal;">(most chosen)</span></td></tr>
            <tr><td style="color:#888;font-size:12px;padding:2px 12px 2px 0;">Platinum</td>
                <td style="color:#fff;font-size:13px;">${escapeHtml(range(estimates.platinum))}</td></tr>
          </table>

          ${linkBlock}

          <p style="color:#bbb;font-size:14px;line-height:1.5;margin:24px 0 8px;"><strong style="color:#C5A059;">What happens next?</strong></p>
          <p style="color:#bbb;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Reply to this email or visit <a href="${escapeHtml(storefront)}" style="color:#C5A059;">luxurydecking.ca</a> to book a free in-person quote. We'll measure, sketch, and confirm your scope, then lock in a fixed package price.
          </p>

          <p style="color:#666;font-size:11px;line-height:1.5;margin:24px 0 0;border-top:1px solid #222;padding-top:16px;">
            Estimate ranges are based on the dimensions you supplied and our tier feature sets. Final pricing is confirmed after an in-person site visit and may vary based on site conditions, permit requirements, and material selections.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
  `.trim();

  const textBody =
`Your Luxury Decking Blueprint
==============================

Footprint: ${config.width_ft} ft x ${config.length_ft} ft (${config.sqft} sq ft)

Silver:   ${range(estimates.silver)}
Gold:     ${range(estimates.gold)}   (most chosen)
Platinum: ${range(estimates.platinum)}

Your full branded blueprint is attached as a PDF.${signedUrl ? `\n\nDownload link (valid 30 days):\n${signedUrl}` : ''}

What happens next?
Reply to this email or visit ${storefront} to book a free in-person quote.

— Luxury Decking
  Premium Outdoor Living, Ottawa ON`;

  const sgPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from.email, name: from.name },
    reply_to: { email: from.email, name: from.name },
    subject,
    content: [
      { type: 'text/plain', value: textBody },
      { type: 'text/html',  value: htmlBody  },
    ],
    attachments: [
      {
        content: pdfBuffer.toString('base64'),
        filename: 'luxury-decking-blueprint.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sgPayload),
  });
  if (!res.ok && res.status !== 202) {
    const txt = await res.text().catch(() => '');
    throw new Error(`SendGrid ${res.status}: ${txt}`);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
