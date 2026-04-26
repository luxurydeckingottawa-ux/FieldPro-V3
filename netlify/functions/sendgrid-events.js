/**
 * Netlify Function: sendgrid-events
 * ---------------------------------
 * Receives the SendGrid Event Webhook payload (an array of event objects)
 * and:
 *   1. Verifies the request signature using SENDGRID_WEBHOOK_PUBLIC_KEY
 *   2. Inserts every InstaQuote nurture event into instaquote_email_events
 *   3. Applies engagement-based exit triggers per the master spec:
 *        click on booking link  -> INSTAQUOTE_WON, pause campaign
 *        hard bounce            -> INSTAQUOTE_CLOSED, suppress address
 *        unsubscribe            -> INSTAQUOTE_CLOSED, suppress address
 *        spamreport             -> INSTAQUOTE_CLOSED, suppress address
 *
 * SendGrid signs each request:
 *   X-Twilio-Email-Event-Webhook-Signature   (base64 ECDSA P-256)
 *   X-Twilio-Email-Event-Webhook-Timestamp   (unix seconds)
 *
 * Verification:
 *   message = timestamp + raw_body
 *   verify(public_key, signature, sha256(message))
 *
 * Env vars required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SENDGRID_WEBHOOK_PUBLIC_KEY  -- base64 PEM-less DER from SendGrid dashboard
 *
 * Webhook URL to register in SendGrid:
 *   https://fieldprov3.netlify.app/api/sendgrid-events
 *
 * Multi-tenant note: webhook payloads do not carry org_id. We resolve org by
 * looking up the lead via category 'iq:lead:<lead_id>' that we will start
 * setting on outbound emails. Until that lands we fall back to the single
 * Luxury Decking org.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ─── Constants ──────────────────────────────────────────────────────────────
const LUXURY_DECKING_ORG_ID = '00000000-0000-0000-0000-000000000001';
const NURTURE_CATEGORY_PREFIX = 'instaquote-nurture';
const TOUCH_ID_RE = /^iq-t[1-7]-email$/;
const BOOKING_KEYWORDS = ['book-consultation', 'booking', 'book-a-consultation'];
const HARD_BOUNCE = 'bounce'; // sg event type, then we filter on `type === 'bounce'`

// ─── Helpers ────────────────────────────────────────────────────────────────
function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function emptyResponse(statusCode) {
  return { statusCode, body: '' };
}

/**
 * Verify the SendGrid Event Webhook signature.
 * Returns true if valid, false otherwise. Also returns true (with a warning
 * logged) when SENDGRID_WEBHOOK_PUBLIC_KEY is not configured -- this gives
 * us a development bypass while we wait for Jack to register the webhook in
 * the SendGrid dashboard. Once the env var is set, signatures are enforced.
 */
function verifySignature({ publicKey, signature, timestamp, rawBody }) {
  if (!publicKey) {
    console.warn('sendgrid-events: SENDGRID_WEBHOOK_PUBLIC_KEY not set, accepting all requests (dev mode).');
    return true;
  }
  if (!signature || !timestamp) return false;

  try {
    // Reject obviously stale requests (>5 min skew)
    const ts = parseInt(timestamp, 10);
    if (!Number.isFinite(ts)) return false;
    const skew = Math.abs(Math.floor(Date.now() / 1000) - ts);
    if (skew > 300) {
      console.warn('sendgrid-events: timestamp skew too large', { skew });
      return false;
    }

    // SendGrid public key is base64-encoded SubjectPublicKeyInfo (DER).
    // Wrap into PEM so Node's createPublicKey accepts it.
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey
      .replace(/\s+/g, '')
      .match(/.{1,64}/g)
      .join('\n')}\n-----END PUBLIC KEY-----`;

    const verifier = crypto.createVerify('sha256');
    verifier.update(timestamp + rawBody);
    verifier.end();

    return verifier.verify(pem, signature, 'base64');
  } catch (err) {
    console.error('sendgrid-events: signature verify error', err);
    return false;
  }
}

/** Extract the touch_id we set on outbound mail. Falls back to category match. */
function deriveTouchId(event) {
  // Preferred: we set unique_arg `touch_id` on outbound (will be wired by
  // a follow-up commit on the send path). For now infer from category.
  if (event.touch_id && TOUCH_ID_RE.test(event.touch_id)) return event.touch_id;
  if (Array.isArray(event.category)) {
    const found = event.category.find(c => TOUCH_ID_RE.test(c));
    if (found) return found;
  } else if (typeof event.category === 'string' && TOUCH_ID_RE.test(event.category)) {
    return event.category;
  }
  return null;
}

/** Returns lead_id if encoded in category as 'iq:lead:<uuid>'. */
function deriveLeadId(event) {
  if (event.lead_id) return event.lead_id;
  const cats = Array.isArray(event.category) ? event.category : [event.category].filter(Boolean);
  for (const c of cats) {
    if (typeof c === 'string' && c.startsWith('iq:lead:')) return c.slice('iq:lead:'.length);
  }
  return null;
}

/** True if this event belongs to the InstaQuote nurture campaign. */
function isInstaQuoteEvent(event) {
  const cats = Array.isArray(event.category) ? event.category : [event.category].filter(Boolean);
  return cats.some(c => typeof c === 'string' && c.includes(NURTURE_CATEGORY_PREFIX))
      || deriveTouchId(event) !== null
      || deriveLeadId(event) !== null;
}

/** Compact event excerpt to keep storage trim. */
function excerpt(event) {
  const out = {
    event: event.event,
    email: event.email,
    sg_message_id: event.sg_message_id,
  };
  if (event.url) out.url = event.url;
  if (event.type) out.type = event.type;
  if (event.reason) out.reason = String(event.reason).slice(0, 200);
  if (event.useragent) out.ua = String(event.useragent).slice(0, 120);
  return out;
}

function isBookingClick(url) {
  if (!url) return false;
  const lower = String(url).toLowerCase();
  return BOOKING_KEYWORDS.some(k => lower.includes(k));
}

/**
 * Try to resolve a lead by message_id or email when category did not carry
 * the lead_id. Returns { id, org_id } or null.
 */
async function lookupLead(supabase, { leadIdHint, sgMessageId, email }) {
  if (leadIdHint) {
    const { data } = await supabase
      .from('jobs')
      .select('id, org_id, pipeline_stage, drip_campaign')
      .eq('id', leadIdHint)
      .maybeSingle();
    if (data) return data;
  }
  if (email) {
    const { data } = await supabase
      .from('jobs')
      .select('id, org_id, pipeline_stage, drip_campaign')
      .eq('client_email', email)
      .eq('lead_source', 'instaquote')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

// ─── Main handler ───────────────────────────────────────────────────────────
export const handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return emptyResponse(204);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { ok: false, error: 'method_not_allowed' });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const PUBLIC_KEY = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('sendgrid-events: missing Supabase env vars');
    return jsonResponse(500, { ok: false, error: 'internal_error' });
  }

  const signature = event.headers['x-twilio-email-event-webhook-signature']
    || event.headers['X-Twilio-Email-Event-Webhook-Signature'];
  const timestamp = event.headers['x-twilio-email-event-webhook-timestamp']
    || event.headers['X-Twilio-Email-Event-Webhook-Timestamp'];
  const rawBody = event.body || '';

  if (!verifySignature({ publicKey: PUBLIC_KEY, signature, timestamp, rawBody })) {
    // Silent 401 -- no body so attackers learn nothing about the schema.
    return emptyResponse(401);
  }

  let events;
  try {
    events = JSON.parse(rawBody || '[]');
    if (!Array.isArray(events)) events = [events];
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const inserts = [];
  const suppressionUpserts = new Map(); // email -> { reason, source_event_id placeholder }
  const stageUpdates = new Map(); // lead_id -> { pipeline_stage, drip_campaign }
  const officeNotifications = []; // for click-to-book wins

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue;
    if (!isInstaQuoteEvent(ev)) continue;

    const touchId = deriveTouchId(ev);
    const leadIdHint = deriveLeadId(ev);
    const lead = await lookupLead(supabase, {
      leadIdHint,
      sgMessageId: ev.sg_message_id,
      email: ev.email,
    });

    const orgId = lead?.org_id || LUXURY_DECKING_ORG_ID;
    const leadId = lead?.id || null;

    inserts.push({
      org_id: orgId,
      lead_id: leadId,
      touch_id: touchId,
      event_type: ev.event,
      sg_message_id: ev.sg_message_id || null,
      sg_email: ev.email || null,
      url: ev.url || null,
      bounce_type: ev.event === 'bounce' || ev.event === 'dropped' ? (ev.type || null) : null,
      payload_excerpt: excerpt(ev),
      occurred_at: ev.timestamp
        ? new Date(ev.timestamp * 1000).toISOString()
        : new Date().toISOString(),
    });

    // ── Engagement-based exit triggers ───────────────────────────────────
    if (!lead) continue;
    const currentStage = lead.pipeline_stage;
    const drip = lead.drip_campaign || {};

    // 1. Booking-link click -> WON
    if (ev.event === 'click' && isBookingClick(ev.url)) {
      stageUpdates.set(lead.id, {
        pipeline_stage: 'INSTAQUOTE_WON',
        drip_campaign: { ...drip, status: 'paused', pauseReason: 'booking_link_clicked' },
      });
      officeNotifications.push({
        lead_id: lead.id,
        kind: 'instaquote_booking_click',
        email: ev.email,
        url: ev.url,
        at: new Date().toISOString(),
      });
      continue;
    }

    // 2. Hard bounce -> CLOSED + suppress
    if (ev.event === 'bounce' && (ev.type || '').toLowerCase() === 'hard') {
      stageUpdates.set(lead.id, {
        pipeline_stage: 'INSTAQUOTE_CLOSED',
        drip_campaign: { ...drip, status: 'cancelled', pauseReason: 'hard_bounce' },
      });
      if (ev.email) suppressionUpserts.set(ev.email.toLowerCase(), { reason: 'bounce', org_id: orgId });
      continue;
    }

    // 3. Unsubscribe / group_unsubscribe -> CLOSED + suppress
    if (ev.event === 'unsubscribe' || ev.event === 'group_unsubscribe') {
      stageUpdates.set(lead.id, {
        pipeline_stage: 'INSTAQUOTE_CLOSED',
        drip_campaign: { ...drip, status: 'cancelled', pauseReason: 'unsubscribed' },
      });
      if (ev.email) suppressionUpserts.set(ev.email.toLowerCase(), { reason: 'unsubscribe', org_id: orgId });
      continue;
    }

    // 4. Spam report -> CLOSED + suppress (treat same as unsubscribe)
    if (ev.event === 'spamreport') {
      stageUpdates.set(lead.id, {
        pipeline_stage: 'INSTAQUOTE_CLOSED',
        drip_campaign: { ...drip, status: 'cancelled', pauseReason: 'spam_report' },
      });
      if (ev.email) suppressionUpserts.set(ev.email.toLowerCase(), { reason: 'spamreport', org_id: orgId });
      continue;
    }

    // TODO: Reply detection requires SendGrid Inbound Parse on a dedicated
    // domain (e.g. reply.luxurydecking.ca). Out of scope for this commit.
    // When wired, the inbound parse function should set:
    //   pipeline_stage = 'INSTAQUOTE_WON' (if intent to book)
    //   drip_campaign.status = 'paused'
    // and notify the office for a human reply.

    void currentStage; // keep linter quiet
  }

  // ── Persist events ─────────────────────────────────────────────────────
  if (inserts.length > 0) {
    const { error } = await supabase.from('instaquote_email_events').insert(inserts);
    if (error) {
      console.error('sendgrid-events: insert events failed', error);
      // Still ack to SendGrid so it doesn't retry forever; investigate via logs.
    }
  }

  // ── Apply suppression list upserts ─────────────────────────────────────
  if (suppressionUpserts.size > 0) {
    const rows = [...suppressionUpserts.entries()].map(([email, meta]) => ({
      email,
      reason: meta.reason,
      org_id: meta.org_id,
    }));
    const { error } = await supabase
      .from('email_suppression')
      .upsert(rows, { onConflict: 'email', ignoreDuplicates: false });
    if (error) console.error('sendgrid-events: suppression upsert failed', error);
  }

  // ── Apply stage updates ────────────────────────────────────────────────
  for (const [leadId, updates] of stageUpdates.entries()) {
    const { error } = await supabase.from('jobs').update(updates).eq('id', leadId);
    if (error) console.error('sendgrid-events: stage update failed', { leadId, error });
  }

  // ── Office notifications (best-effort: write to bot_log as a generic log) ─
  for (const note of officeNotifications) {
    await supabase.from('instaquote_bot_log').insert({
      org_id: LUXURY_DECKING_ORG_ID,
      reason: note.kind,
      payload_excerpt: { lead_id: note.lead_id, email: note.email, url: note.url, at: note.at },
    }).then(() => {}, () => {});
  }

  return jsonResponse(200, {
    ok: true,
    received: events.length,
    relevant: inserts.length,
    stage_updates: stageUpdates.size,
    suppressed: suppressionUpserts.size,
  });
};
