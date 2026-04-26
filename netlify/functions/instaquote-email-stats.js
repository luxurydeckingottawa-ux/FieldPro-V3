/**
 * Netlify Function: instaquote-email-stats
 * ----------------------------------------
 * Returns SendGrid open/click stats for a specific recipient email.
 *
 * Used by the InstaQuote Blueprint card on the lead detail page so the
 * office can see "did they open the email yet?" without waiting on the
 * SendGrid Event Webhook to flow into our DB. Real-time, single API
 * call, no DB persistence.
 *
 * Request:
 *   GET /api/instaquote-email-stats?email=customer@example.com
 *   Origin must be one of the allowlisted domains (FieldPro app or local
 *   dev). The SendGrid API key never leaves this function.
 *
 * Response 200:
 *   {
 *     ok: true,
 *     stats: {
 *       sent_count: 1,
 *       opens_count: 3,        // total opens across all sends to this email
 *       clicks_count: 1,
 *       last_event_time: "2026-04-26T13:59:37Z",
 *       last_subject: "Your deck blueprint is ready"
 *     }
 *   }
 *
 * Response 200 with empty stats if SendGrid has no record for the email.
 *
 * --- WHY OPEN TRACKING IS NOT SPAM ---
 * SendGrid open tracking embeds a 1x1 invisible pixel image in the
 * email HTML. Universal practice across every commercial email service
 * (Mailchimp, Constant Contact, ConvertKit, Resend, Postmark, etc.).
 * Inbox providers do NOT flag this as spam. Apple Mail Privacy
 * Protection (iOS 15+) preloads images on the user's behalf, which
 * inflates open counts for Apple users — opens are still useful as a
 * relative-engagement signal but should not be read as exact opens.
 */

import crypto from 'crypto';

const ALLOWED_ORIGINS = new Set([
  'https://fieldprov3.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
]);

function corsHeaders(originHeader) {
  const allowed = ALLOWED_ORIGINS.has(originHeader) ? originHeader : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

function jsonResponse(statusCode, body, originHeader) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(originHeader) },
    body: JSON.stringify(body),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin || '';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' }, origin);
  }

  const email = ((event.queryStringParameters || {}).email || '').trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return jsonResponse(400, { ok: false, error: 'invalid_email' }, origin);
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  if (!SENDGRID_API_KEY) {
    return jsonResponse(500, { ok: false, error: 'sendgrid_not_configured' }, origin);
  }

  // Pull recent messages from SendGrid Activity API filtered by recipient.
  // Limit to 25 — more than enough for a single customer's history.
  const sgQuery = `to_email%3D%22${encodeURIComponent(email)}%22`;
  const sgUrl = `https://api.sendgrid.com/v3/messages?query=${sgQuery}&limit=25`;

  let sgRes;
  try {
    sgRes = await fetch(sgUrl, {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
    });
  } catch (e) {
    console.error('instaquote-email-stats: SendGrid fetch error', e);
    return jsonResponse(502, { ok: false, error: 'sendgrid_unreachable' }, origin);
  }

  if (!sgRes.ok) {
    const txt = await sgRes.text().catch(() => '');
    console.error('instaquote-email-stats: SendGrid returned', sgRes.status, txt.slice(0, 300));
    // Don't leak SendGrid's error structure to the client. Return empty stats.
    return jsonResponse(200, {
      ok: true,
      stats: { sent_count: 0, opens_count: 0, clicks_count: 0 },
      note: 'sendgrid_query_failed',
    }, origin);
  }

  let sgData;
  try {
    sgData = await sgRes.json();
  } catch {
    return jsonResponse(502, { ok: false, error: 'sendgrid_invalid_response' }, origin);
  }

  const messages = sgData.messages || [];
  // Aggregate across all sends to this email. We only care about InstaQuote
  // blueprint emails — filter by subject prefix so we don't count unrelated
  // estimate / nurture emails sent later in the lifecycle.
  const blueprints = messages.filter(m =>
    typeof m.subject === 'string' &&
    /deck blueprint|luxury decking blueprint/i.test(m.subject)
  );
  const opens = blueprints.reduce((sum, m) => sum + (m.opens_count || 0), 0);
  const clicks = blueprints.reduce((sum, m) => sum + (m.clicks_count || 0), 0);
  // last_event_time is per-message; pick the most recent
  const lastEvent = blueprints
    .map(m => m.last_event_time)
    .filter(Boolean)
    .sort()
    .pop();
  const lastSubject = blueprints.length > 0 ? blueprints[0].subject : null;

  return jsonResponse(200, {
    ok: true,
    stats: {
      sent_count: blueprints.length,
      opens_count: opens,
      clicks_count: clicks,
      last_event_time: lastEvent || null,
      last_subject: lastSubject,
    },
  }, origin);
};
