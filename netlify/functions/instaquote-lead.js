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

// Project package.json sets `"type": "module"` so this file loads as ESM.
// Must use `import` + `export` — CommonJS `require`/`exports.handler`
// is silently ignored under ESM and Netlify reports "handler is
// undefined or not exported" at runtime.
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { generateInstaQuotePdf } from './_instaquote-pdf.js';

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
    // X-Client is the widget's identifier header (per Cowork's
    // implementation). Without listing it here, the browser CORS
    // preflight rejects the POST and the request never reaches us.
    // X-Requested-With is included for legacy/jQuery widgets and
    // generally safe to allow on a public POST endpoint.
    'Access-Control-Allow-Headers': 'Content-Type, X-Client, X-Requested-With',
    // Keep preflight cache short during the rollout window so any future
    // CORS adjustment propagates within minutes, not 24 hours. Doubles as
    // an escape hatch if a customer's browser caches a bad preflight.
    'Access-Control-Max-Age': '600',
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
export const handler = async function (event) {
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

  // 10b. Suppression list — never email an unsubscribed / hard-bounced address.
  // Service-role read; RLS on email_suppression denies SELECT to anon by design.
  {
    const emailLc = String(body.email).toLowerCase();
    const { data: suppressed, error: supErr } = await supabase
      .from('email_suppression')
      .select('email,reason')
      .eq('email', emailLc)
      .maybeSingle();
    if (supErr) {
      console.error('instaquote-lead suppression query error:', supErr);
      // Fail open: better to let the lead through than silently drop everything
      // if the table is somehow misconfigured. Logged for review.
    } else if (suppressed) {
      await supabase.from('instaquote_bot_log').insert({
        org_id: LUXURY_DECKING_ORG_ID,
        reason: 'suppressed_email',
        ip_hash,
        user_agent: (body?.meta?.user_agent || '').slice(0, 500),
        origin: origin || refererOrigin || null,
        payload_excerpt: { email: emailLc, suppression_reason: suppressed.reason },
      }).then(() => {}, () => {});
      // 202 with success-shape so the widget shows the user "thank you" and
      // doesn't trigger retries. We deliberately do NOT generate a PDF or
      // send mail to a suppressed address.
      return jsonResponse(202, { ok: true, suppressed: true }, origin);
    }
  }

  // 10c. Cross-pipeline merge — if the same email already has an active
  // record in any non-InstaQuote stage (i.e. they already raised their hand
  // through the regular Leads or Estimates pipeline), do NOT start a parallel
  // nurture sequence. Return the existing lead_id so the widget can move on.
  {
    const emailLc = String(body.email).toLowerCase();
    const INSTAQUOTE_STAGES = [
      'INSTAQUOTE_LEAD', 'INSTAQUOTE_TOUCH_1', 'INSTAQUOTE_TOUCH_2',
      'INSTAQUOTE_TOUCH_3', 'INSTAQUOTE_TOUCH_4', 'INSTAQUOTE_TOUCH_5',
      'INSTAQUOTE_TOUCH_6', 'INSTAQUOTE_TOUCH_7', 'INSTAQUOTE_LONG_TERM',
      'INSTAQUOTE_WON', 'INSTAQUOTE_CLOSED',
    ];
    const stageList = `(${INSTAQUOTE_STAGES.map(s => `"${s}"`).join(',')})`;
    const { data: dupes, error: dupErr } = await supabase
      .from('jobs')
      .select('id,pipeline_stage')
      .ilike('client_email', emailLc)
      .not('pipeline_stage', 'in', stageList)
      .order('created_at', { ascending: false })
      .limit(1);

    if (dupErr) {
      console.error('instaquote-lead dup-pipeline query error:', dupErr);
      // Fail open — proceed to insert as a normal InstaQuote lead.
    } else if (dupes && dupes.length > 0) {
      const existing = dupes[0];
      await supabase.from('instaquote_bot_log').insert({
        org_id: LUXURY_DECKING_ORG_ID,
        reason: 'cross_pipeline_merge',
        ip_hash,
        user_agent: (body?.meta?.user_agent || '').slice(0, 500),
        origin: origin || refererOrigin || null,
        payload_excerpt: {
          email: emailLc,
          existing_lead_id: existing.id,
          existing_stage: existing.pipeline_stage,
        },
      }).then(() => {}, () => {});

      // The customer asked for their PDF blueprint — that's a transactional
      // response we must honour even if their email is already in another
      // pipeline. Per spec, suppress only the NURTURE sequence (Touches
      // 1-7), NOT the Day 0 PDF email. Generate the PDF and send it now,
      // then return the existing lead_id without starting nurture.
      try {
        const pdfBuf = await generateInstaQuotePdf({
          email: body.email,
          config: body.config,
          estimates: body.estimates,
        });
        const pdfFileName = `instaquote-blueprint-${(body.email).replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(pdfFileName, pdfBuf, {
            contentType: 'application/pdf',
            upsert: true,
          });
        let signedUrl = '';
        if (!upErr) {
          const { data: signed } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(pdfFileName, SIGNED_URL_TTL_SECONDS);
          signedUrl = signed?.signedUrl || '';
        }
        await sendBlueprintEmail({
          apiKey: SENDGRID_API_KEY,
          from: { email: FROM_EMAIL, name: FROM_NAME },
          to: body.email,
          pdfBuffer: pdfBuf,
          signedUrl,
          config: body.config,
          estimates: body.estimates,
          storefront: STOREFRONT,
        });
      } catch (mergeMailErr) {
        // Non-fatal: lead exists in the other pipeline regardless. Log + continue.
        console.error('instaquote-lead merge-path PDF/email error (non-fatal):', mergeMailErr);
      }

      // 200 success: their existing record stands. The customer got their PDF.
      // The office sees the merge note in bot_log.
      return jsonResponse(200, {
        ok: true,
        merged: true,
        lead_id: existing.id,
      }, origin);
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
    // chk_job_status check constraint requires one of:
    // SCHEDULED|IN_PROGRESS|COMPLETED|CANCELLED|ON_HOLD|ACTIVE
    // Use ACTIVE for new leads — pipeline_stage carries the lifecycle.
    status: 'ACTIVE',
    lifecycle_stage: 'lead',
    lead_source: 'instaquote',
    source_metadata: sourceMetadata,
    submission_id: body.submission_id,
    ip_hash,
    estimate_amount: body.estimates?.gold?.low || null, // best mid-tier number to seed the pipeline
    next_follow_up_date: new Date().toISOString().slice(0, 10),
    follow_up_status: 'NEW',
    // Auto-enrol the lead in the InstaQuote nurture campaign. The drip
    // processor (supabase/functions/process-drip-campaigns or client-side
    // scheduler) reads this and dispatches Touch 1 on Day 2 per the
    // send-time rules (Tue/Wed/Thu 9-10 AM ET, no holidays).
    drip_campaign: {
      campaignType: 'INSTAQUOTE_NURTURE',
      startedAt: new Date().toISOString(),
      currentTouch: 0,
      completedTouches: [],
      status: 'active',
    },
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

  // 11.5 Upsert into customers table.
  // Every InstaQuote lead becomes a customer record. Dedupe by lowercase
  // email (Supabase upsert with onConflict). Tag with 'instaquote-lead'
  // so office can filter the Customer Hub by source. Status starts as
  // 'cold_lead' and gets bumped automatically as the lead progresses.
  try {
    const customerId = `customer:email:${body.email.toLowerCase()}`;
    await supabase.from('customers').upsert({
      id: customerId,
      org_id: LUXURY_DECKING_ORG_ID,
      first_name: '',
      last_name: '',
      display_name: body.email,           // until office fills it in
      email: body.email.toLowerCase(),
      phone: '',
      customer_type: 'homeowner',
      status: 'cold_lead',
      addresses: [],
      tags: ['instaquote-lead'],
      notes: 'Auto-created from InstaQuote calculator submission. Office can fill in name + phone after first contact.',
      lead_source: 'instaquote',
      lifetime_value: 0,
      total_jobs: 0,
      do_not_service: false,
      source: 'instaquote_widget',
    }, { onConflict: 'id', ignoreDuplicates: false });
  } catch (custErr) {
    // Non-fatal — lead is already created. Log and continue.
    console.warn('instaquote-lead customer upsert non-fatal error:', custErr);
  }

  // 12. Generate PDF
  let pdfBuffer;
  try {
    pdfBuffer = await generateInstaQuotePdf({
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
// Module-level logo cache for inline email attachment.
//
// We use the BLACK logo with transparent background for emails. Email
// clients (especially Gmail) often render emails on a beige/cream/white
// background regardless of the HTML's background-color directive — Gmail
// even forces light backgrounds in some preview panes. Black-on-clear
// works on every background, and Gmail's dark-mode auto-invert handles
// the dark-mode case automatically.
//
// (The PDF uses the gold version because the PDF background is locked
// to black — see _instaquote-pdf.js.)
const EMAIL_LOGO_URL = 'https://fieldprov3.netlify.app/assets/logo-luxury-black.png';
let _emailLogoCache = null;
async function getEmailLogoBase64() {
  if (_emailLogoCache !== null) return _emailLogoCache;
  try {
    const res = await fetch(EMAIL_LOGO_URL);
    if (!res.ok) throw new Error(`logo fetch ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    _emailLogoCache = buf.toString('base64');
    return _emailLogoCache;
  } catch (e) {
    console.warn('Email logo fetch failed:', e.message);
    _emailLogoCache = '';
    return '';
  }
}

async function sendBlueprintEmail({ apiKey, from, to, pdfBuffer, signedUrl, config, estimates, storefront }) {
  const subject = 'Your deck blueprint is ready';
  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-CA');
  const range = (t) => `${fmt(t.low)} – ${fmt(t.high)}`;

  // Inline the logo via SendGrid CID attachment so Gmail/Outlook show it
  // automatically (no "Display images below" prompt). Falls back to no-logo
  // if the fetch fails — header text still reads cleanly without the image.
  const logoBase64 = await getEmailLogoBase64();
  const logoBlock = logoBase64
    ? `<div style="text-align:center;margin:0 0 24px;"><img src="cid:luxury-logo" alt="Luxury Decking" width="220" style="display:block;max-width:75%;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;" /></div>`
    : `<div style="text-align:center;margin:0 0 24px;"><h1 style="color:#1a1a1a;font-size:26px;margin:0;letter-spacing:3px;font-weight:bold;">LUXURY DECKING</h1><p style="color:#888;font-size:11px;margin:8px 0 0;letter-spacing:1px;">PREMIUM OUTDOOR LIVING · OTTAWA, ON</p></div>`;

  const linkBlock = signedUrl
    ? `<p style="margin:16px 0;"><a href="${escapeHtml(signedUrl)}" style="display:inline-block;background:#C5A059;color:#000;padding:12px 20px;text-decoration:none;font-weight:bold;border-radius:4px;">Download your blueprint (PDF)</a></p>`
    : '';

  // Light cream/beige theme to match the Luxury Decking brand and play
  // nicely with Gmail/Outlook default rendering. Black logo on transparent
  // works on any light background. Gold accents preserve premium feel
  // without fighting the email client over background colours.
  const htmlBody = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f1ea;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;">
    <tr><td align="center" style="padding:24px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-top:4px solid #C5A059;border-bottom:4px solid #C5A059;">
        <tr><td style="padding:32px 36px;">
          ${logoBlock}

          <h2 style="color:#1a1a1a;font-size:24px;margin:0 0 12px;text-align:center;font-weight:bold;">Your deck blueprint is ready</h2>
          <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Your blueprint is attached here as a PDF and shows pricing for all three of our build tiers based on your specs:
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
            <tr><td style="color:#888;font-size:12px;padding:3px 14px 3px 0;">Footprint</td>
                <td style="color:#1a1a1a;font-size:13px;font-weight:bold;">${config.width_ft} ft × ${config.length_ft} ft (${config.sqft} sq ft)</td></tr>
            <tr><td style="color:#888;font-size:12px;padding:3px 14px 3px 0;">Silver</td>
                <td style="color:#1a1a1a;font-size:13px;">${escapeHtml(range(estimates.silver))}</td></tr>
            <tr><td style="color:#888;font-size:12px;padding:3px 14px 3px 0;">Gold</td>
                <td style="color:#C5A059;font-size:13px;font-weight:bold;">${escapeHtml(range(estimates.gold))} &nbsp; <span style="color:#888;font-weight:normal;">(most chosen)</span></td></tr>
            <tr><td style="color:#888;font-size:12px;padding:3px 14px 3px 0;">Platinum</td>
                <td style="color:#1a1a1a;font-size:13px;">${escapeHtml(range(estimates.platinum))}</td></tr>
          </table>

          ${linkBlock}

          <p style="color:#444;font-size:14px;line-height:1.6;margin:24px 0 8px;"><strong style="color:#1a1a1a;">What happens next?</strong></p>
          <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Reply to this email or visit <a href="${escapeHtml(storefront)}" style="color:#C5A059;font-weight:bold;">luxurydecking.ca</a> to book a free in-person quote. We'll measure, sketch, and confirm your scope, then lock in a fixed package price.
          </p>

          <p style="color:#888;font-size:11px;line-height:1.5;margin:24px 0 0;border-top:1px solid #e5dfd2;padding-top:16px;">
            Estimate ranges are based on the dimensions you supplied and our tier feature sets. Final pricing is confirmed after an in-person site visit and may vary based on site conditions, permit requirements, and material selections.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
  `.trim();

  const textBody =
`Your deck blueprint is ready
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

  const attachments = [
    {
      content: pdfBuffer.toString('base64'),
      filename: 'luxury-decking-blueprint.pdf',
      type: 'application/pdf',
      disposition: 'attachment',
    },
  ];
  // Inline logo as a CID attachment when we have it. SendGrid emits it
  // as a related part so Gmail/Outlook render it automatically without
  // the "Display images below" gate that blocks external <img src>.
  if (logoBase64) {
    attachments.push({
      content: logoBase64,
      filename: 'luxury-logo.png',
      type: 'image/png',
      disposition: 'inline',
      content_id: 'luxury-logo',
    });
  }

  const sgPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from.email, name: from.name },
    reply_to: { email: from.email, name: from.name },
    subject,
    content: [
      { type: 'text/plain', value: textBody },
      { type: 'text/html',  value: htmlBody  },
    ],
    attachments,
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
