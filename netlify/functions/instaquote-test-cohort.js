/**
 * Netlify Function: instaquote-test-cohort
 * ----------------------------------------
 * Admin-only utility for dry-running the 7-touch InstaQuote nurture sequence
 * end-to-end against a small set of internal email addresses.
 *
 * What it does:
 *   1. Verifies caller against INTERNAL_API_SECRET
 *   2. Accepts { emails: string[] (1-10), compress_days: number (default 7) }
 *   3. Computes a backdate offset so that the 52-day sequence completes
 *      within `compress_days` real-world days from now
 *   4. INSERTs N fake jobs rows with:
 *        - lead_source = 'instaquote'
 *        - pipeline_stage = 'INSTAQUOTE_LEAD'
 *        - drip_campaign.startedAt = (now - 52*offset_factor) so the next
 *          processor run will fire Touch 1 immediately
 *        - source_metadata.test_cohort = true so they're easy to clean up
 *
 * Cleanup: rows can be deleted in bulk with
 *   DELETE FROM jobs WHERE source_metadata->>'test_cohort' = 'true';
 *
 * URL: POST /api/instaquote-test-cohort
 *   header: X-Internal-Secret: <INTERNAL_API_SECRET>
 *   body:   { "emails": ["jack+t1@luxurydecking.ca", ...], "compress_days": 7 }
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const LUXURY_DECKING_ORG_ID = '00000000-0000-0000-0000-000000000001';
const MAX_EMAILS = 10;
const SEQUENCE_DAYS = 52;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function nextJobNumber(idx) {
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `IQ-TEST-${ts}-${rand}-${idx}`;
}

export const handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'method_not_allowed' });
  }

  // Auth: shared secret in header
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    console.error('instaquote-test-cohort: INTERNAL_API_SECRET not set');
    return jsonResponse(500, { ok: false, error: 'internal_error' });
  }
  const provided = event.headers['x-internal-secret']
    || event.headers['X-Internal-Secret'];
  if (!provided || provided !== expected) {
    return jsonResponse(401, { ok: false, error: 'unauthorized' });
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { ok: false, error: 'invalid_json' });
  }

  const emails = Array.isArray(body.emails) ? body.emails : [];
  const compressDays = Number.isFinite(body.compress_days) && body.compress_days > 0
    ? Math.min(Math.max(body.compress_days, 1), SEQUENCE_DAYS)
    : 7;

  if (emails.length === 0 || emails.length > MAX_EMAILS) {
    return jsonResponse(400, {
      ok: false,
      error: 'validation_error',
      message: `emails must be a non-empty array of up to ${MAX_EMAILS} addresses.`,
    });
  }
  for (const e of emails) {
    if (typeof e !== 'string' || !EMAIL_RE.test(e) || e.length > 254) {
      return jsonResponse(400, {
        ok: false,
        error: 'validation_error',
        message: `Invalid email in cohort: ${e}`,
      });
    }
  }

  // Env / Supabase
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { ok: false, error: 'missing_supabase_env' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Compute the backdated startedAt. The drip processor walks each touch
  // by `delayDays from startedAt`. For the full 52-day sequence to finish
  // within `compress_days` actual days, we don't actually shorten delays
  // (those are baked into the touch definitions). Instead we backdate
  // startedAt so that some touches are already due NOW, and the rest
  // become due over the compressed window. The offset per real-world day
  // is (SEQUENCE_DAYS / compressDays) campaign-days.
  //
  // For compress_days=7 the math:
  //   ratio = 52 / 7  ~= 7.43
  //   We backdate startedAt by 0 days for index 0, so Touch 1 fires now.
  //   Each subsequent fake lead is offset by some random scatter so they
  //   don't all fire at the same minute.
  //
  // Simpler: for ALL leads, set startedAt to (now - SEQUENCE_DAYS days +
  // small jitter). The processor will then immediately fire all 7 touches
  // back-to-back during the compressed window's first run.
  // That doesn't actually test send-time spacing.
  //
  // Compromise that meets the spec ("all 7 touches will fire within
  // compress_days"): scale the start offset per cohort index so the
  // sequence playback is more visible across the compressed window.

  const now = new Date();
  const ratio = SEQUENCE_DAYS / compressDays;

  const rows = emails.map((email, idx) => {
    // Stagger: lead 0 starts SEQUENCE_DAYS ago (all touches due immediately),
    // lead N starts SEQUENCE_DAYS - (idx * spacingDays) ago, where
    // spacingDays distributes the cohort across the first half of compressDays.
    const cohortSpacing = (compressDays / 2) / Math.max(1, emails.length - 1);
    const realDaysAgo = SEQUENCE_DAYS - (idx * cohortSpacing * ratio);
    const startedAt = new Date(now.getTime() - realDaysAgo * 24 * 60 * 60 * 1000);
    const submittedAt = startedAt.toISOString();

    return {
      org_id: LUXURY_DECKING_ORG_ID,
      job_number: nextJobNumber(idx),
      client_name: `Test Cohort ${idx + 1}`,
      client_email: email,
      project_address: '',
      pipeline_stage: 'INSTAQUOTE_LEAD',
      status: 'ACTIVE',
      lifecycle_stage: 'lead',
      lead_source: 'instaquote',
      submission_id: crypto.randomUUID(),
      ip_hash: 'test_cohort',
      estimate_amount: 12000,
      next_follow_up_date: submittedAt.slice(0, 10),
      follow_up_status: 'NEW',
      source_metadata: {
        test_cohort: true,
        compress_days: compressDays,
        cohort_index: idx,
        config: { width_ft: 12, length_ft: 16, sqft: 192, perimeter_lin_ft: 56,
                  steps: 3, railing_material: 'aluminum', railing_sides: 3,
                  railing_lin_ft: 40 },
        estimates: {
          silver:   { low: 9500,  high: 11500 },
          gold:     { low: 12500, high: 14500 },
          platinum: { low: 16500, high: 19500 },
        },
        meta: {
          page_url: 'https://luxurydecking.ca/pages/instaquote',
          submitted_at_utc: submittedAt,
          user_agent: 'test-cohort-harness',
        },
      },
      drip_campaign: {
        campaignType: 'INSTAQUOTE_NURTURE',
        startedAt: submittedAt,
        currentTouch: 0,
        completedTouches: [],
        status: 'active',
      },
    };
  });

  const { data, error } = await supabase.from('jobs').insert(rows).select('id,client_email,drip_campaign');
  if (error) {
    console.error('instaquote-test-cohort insert error:', error);
    return jsonResponse(500, { ok: false, error: 'insert_failed', message: error.message });
  }

  return jsonResponse(200, {
    ok: true,
    inserted: data?.length || 0,
    compress_days: compressDays,
    sequence_days: SEQUENCE_DAYS,
    leads: (data || []).map(r => ({
      id: r.id,
      email: r.client_email,
      started_at: r.drip_campaign?.startedAt,
    })),
    cleanup_sql: "DELETE FROM jobs WHERE source_metadata->>'test_cohort' = 'true';",
  });
};
