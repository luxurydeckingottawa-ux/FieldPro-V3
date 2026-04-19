/**
 * Netlify Function: Get Portal Context (Angela widget)
 *
 * Public-facing endpoint consumed by the Angela advisor widget
 * (hosted at angela.luxurydecking.ca). The widget is embedded on the
 * customer estimate portal via an iframe and needs a sanitised view of
 * the job record so Angela can answer customer questions with full
 * context the moment the portal loads.
 *
 * Auth model mirrors share-proposal.js:
 *   - The endpoint is public
 *   - The customerPortalToken itself is the auth (UUID v4, 2^122 space)
 *   - The token must resolve to a real job row in Supabase
 *
 * Response is a tightly-scoped subset of the job. Internal fields
 * (officeNotes, siteNotes, aiInsights, campaignState, dripCampaign,
 * nextAction, liveEstimate internals, margin data, itemized costs)
 * are never sent. Angela only ever sees what the customer themselves
 * can see on the portal page.
 *
 * Environment variables required:
 *   VITE_SUPABASE_URL        Supabase project URL
 *   VITE_SUPABASE_ANON_KEY   Supabase anon key (portal-token header auth)
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function checkPayloadSize(event, maxBytes = 10000) {
  return !(event.body && event.body.length > maxBytes);
}

/**
 * Fetch the job row from Supabase by customer_portal_token. Uses the anon
 * key with the x-portal-token header so the portal-header RLS rule (if
 * any) grants access to exactly this row.
 */
async function fetchJobByToken(portalToken) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('[get-portal-context] Supabase env not configured');
    return null;
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/jobs?customer_portal_token=eq.${encodeURIComponent(portalToken)}&select=*`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'x-portal-token': portalToken,
        },
      },
    );
    if (!res.ok) {
      console.warn('[get-portal-context] Supabase returned', res.status);
      return null;
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch (e) {
    console.error('[get-portal-context] Supabase fetch threw:', e);
    return null;
  }
}

/**
 * Strip any price-breakdown / margin fields from an option and keep only
 * the customer-visible feature summary. The customer already sees these
 * on the portal page, so Angela can safely reference them.
 */
function sanitiseOption(option) {
  if (!option || typeof option !== 'object') return null;
  return {
    id: option.id,
    name: option.name,
    price: typeof option.price === 'number' ? option.price : 0,
    keyFeatures: option.keyFeatures || {
      decking: '',
      framing: '',
      railing: '',
      foundation: '',
      materialWarranty: '',
      workmanshipWarranty: '',
      addOns: [],
    },
  };
}

function sanitiseAddOn(addOn) {
  if (!addOn || typeof addOn !== 'object') return null;
  return {
    id: addOn.id,
    name: addOn.name,
    price: typeof addOn.price === 'number' ? addOn.price : 0,
  };
}

function buildContext(row) {
  const estimate = row.estimate_data || {};
  const engagement = row.portal_engagement || {};

  // Derive heat from existing engagement signals — hot if >3 opens or >5 min
  // total, warm if any opens, cold otherwise. Angela uses this to modulate
  // her opening tone.
  let heat = 'cold';
  const opens = Number(engagement.totalOpens || 0);
  const timeSec = Number(engagement.totalTimeSpentSeconds || 0);
  if (opens >= 3 || timeSec >= 300) heat = 'hot';
  else if (opens >= 1) heat = 'warm';

  const options = Array.isArray(estimate.options)
    ? estimate.options.map(sanitiseOption).filter(Boolean)
    : [];
  const addOns = Array.isArray(estimate.addOns)
    ? estimate.addOns.map(sanitiseAddOn).filter(Boolean)
    : [];

  return {
    customer: {
      name: row.client_name || '',
      email: row.client_email || '',
      phone: row.client_phone || '',
      projectAddress: row.project_address || '',
      city: row.city || '',
    },
    estimate: {
      jobNumber: row.job_number || '',
      sentDate: estimate.sentDate || row.created_at || null,
      expiresAt: estimate.expiresAt || null,
      status: row.status || estimate.status || '',
      options,
      addOns,
      acceptedOption: row.accepted_option_id || null,
      acceptedAddOns: Array.isArray(row.selected_add_on_ids) ? row.selected_add_on_ids : [],
    },
    project: {
      dimensions: row.calculator_dimensions || {},
      leadSource: row.lead_source || '',
      salesperson: row.salesperson || '',
      lifecycleStage: row.lifecycle_stage || row.status || '',
    },
    engagement: {
      totalOpens: opens,
      heat,
      viewedAt: engagement.firstOpenedAt || null,
      timeOnPageSeconds: timeSec,
    },
  };
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }
  if (!checkPayloadSize(event)) {
    return {
      statusCode: 413,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Payload too large' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { portalToken } = body || {};
  if (!portalToken || !UUID_RE.test(String(portalToken))) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Invalid or missing portalToken' }),
    };
  }

  const row = await fetchJobByToken(portalToken);
  if (!row) {
    return {
      statusCode: 403,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Portal token not recognised' }),
    };
  }

  try {
    const context = buildContext(row);
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(context),
    };
  } catch (e) {
    console.error('[get-portal-context] buildContext threw:', e);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
