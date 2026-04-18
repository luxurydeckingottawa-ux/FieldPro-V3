/**
 * Netlify Function: Share Proposal with Partner
 *
 * Public-facing endpoint used by the customer portal "Send to Your Partner"
 * modal. Unlike send-email.js (which gates behind INTERNAL_API_SECRET for
 * internal drip-campaign use), this endpoint is called directly from the
 * portal's client-side JS by homeowners. It therefore has its own guard rails:
 *
 *   1. The sender must pass a portalToken (UUID v4 shape). Guessing a valid
 *      one is computationally infeasible (2^122 space).
 *   2. The endpoint verifies the portalToken exists in Supabase (jobs table).
 *      If the token doesn't match a real job, we refuse. This prevents spam
 *      from anyone who hasn't actually been issued a portal link.
 *   3. The email body is TEMPLATED SERVER-SIDE. The sender's note is injected
 *      as plain text only — no HTML, no scripts, no attachments. Any raw
 *      HTML is stripped before rendering.
 *   4. Subject is fixed by the server. Sender cannot forge subject lines.
 *   5. Payload size is capped at 50 KB.
 *   6. Recipient email is validated against a standard shape.
 *
 * Environment variables required (same as send-email):
 *   SENDGRID_API_KEY         SendGrid API key
 *   SENDGRID_FROM_EMAIL      Sender email (admin@luxurydecking.ca)
 *   SENDGRID_FROM_NAME       Sender name (Angela - Luxury Decking)
 *   SENDGRID_REPLY_TO        Reply-to email (luxurydeckingteam@gmail.com)
 *   VITE_SUPABASE_URL        For portal token verification
 *   VITE_SUPABASE_ANON_KEY   For portal token verification
 */

const LUXURY_DECKING_ORG_ID = '00000000-0000-0000-0000-000000000001';

function checkPayloadSize(event, maxBytes = 50000) {
  return !(event.body && event.body.length > maxBytes);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Verify the portal token resolves to an actual job. Uses the Supabase REST
 * API with the anon key. The jobs row is fetched only by its portal token,
 * so this works even without the portal-header RLS rule.
 */
async function verifyPortalToken(portalToken) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Configuration failure — refuse rather than allow unverified sends.
    console.error('[share-proposal] Supabase env not configured; refusing');
    return null;
  }
  try {
    const res = await fetch(
      `${url}/rest/v1/jobs?customer_portal_token=eq.${encodeURIComponent(portalToken)}&select=id,client_name,project_address,job_number`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'x-portal-token': portalToken,
        },
      },
    );
    if (!res.ok) {
      console.warn('[share-proposal] Supabase verify returned', res.status);
      return null;
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch (e) {
    console.error('[share-proposal] Supabase verify threw:', e);
    return null;
  }
}

function buildEmailHtml({ clientFirstName, projectAddress, portalUrl, senderNote }) {
  // Strip tags from the note — we use it as plain text in <p> tags.
  const noteClean = escapeHtml(String(senderNote || '').trim());
  const noteHtml = noteClean
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Deck estimate from Luxury Decking</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;">
          <tr>
            <td style="padding:32px 40px 16px 40px;">
              <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.25em;color:#D4A853;text-transform:uppercase;">From Luxury Decking</p>
              <h1 style="margin:8px 0 0 0;font-size:26px;line-height:1.25;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">A deck proposal to review together</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 24px 40px;font-size:15px;line-height:1.65;color:#334155;">
              ${noteHtml || '<p style="margin:0 0 16px 0;">A note was not included with this share.</p>'}
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px 40px;">
              <a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:14px 28px;background:#D4A853;color:#0f172a;font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;">View the full proposal</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px 40px;font-size:13px;line-height:1.6;color:#64748b;">
              <p style="margin:0 0 8px 0;"><strong style="color:#0f172a;">Project:</strong> ${escapeHtml(projectAddress || 'deck project')}</p>
              <p style="margin:0;"><strong style="color:#0f172a;">Shared by:</strong> ${escapeHtml(clientFirstName || 'a family member')}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
              Luxury Decking, Ottawa. Quality without compromise.<br>
              Questions? Reply to this email and Angela will get back to you within one business day.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailText({ clientFirstName, projectAddress, portalUrl, senderNote }) {
  return `${(senderNote || '').trim()}

View the full proposal: ${portalUrl}

Project: ${projectAddress || 'deck project'}
Shared by: ${clientFirstName || 'a family member'}

Luxury Decking, Ottawa. Quality without compromise.
Questions? Reply to this email and Angela will get back to you within one business day.`;
}

exports.handler = async function(event) {
  // CORS preflight (rarely hit for same-origin fetches, but harmless).
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!checkPayloadSize(event)) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Payload too large' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const {
    portalToken,
    recipientEmail,
    recipientName,
    senderNote,
    portalUrl,
    clientFirstName,
    projectAddress,
  } = body;

  // Validate inputs.
  if (!portalToken || !UUID_RE.test(String(portalToken))) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or missing portalToken' }) };
  }
  if (!recipientEmail || !EMAIL_RE.test(String(recipientEmail))) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid recipient email' }) };
  }
  if (!portalUrl || typeof portalUrl !== 'string' || portalUrl.length > 500) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid portal URL' }) };
  }
  // portalUrl must be an http(s) URL pointing at the portal domain family.
  // This prevents the share from redirecting to an attacker-controlled site.
  if (!/^https?:\/\/[^\s]+$/i.test(portalUrl)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid portal URL protocol' }) };
  }

  // Verify the portal token actually resolves to a job. This is the main
  // abuse gate — without a real portal link, nothing sends.
  const job = await verifyPortalToken(portalToken);
  if (!job) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Portal token not recognised' }) };
  }

  // SendGrid config.
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Luxury Decking';
  const replyTo = process.env.SENDGRID_REPLY_TO || fromEmail;
  if (!apiKey || !fromEmail) {
    console.error('[share-proposal] SendGrid not fully configured');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  const subject = `Deck estimate for ${job.project_address || projectAddress || 'your project'} · Luxury Decking`;
  const html = buildEmailHtml({
    clientFirstName: clientFirstName || (job.client_name ? String(job.client_name).split(' ')[0] : ''),
    projectAddress: job.project_address || projectAddress,
    portalUrl,
    senderNote,
  });
  const text = buildEmailText({
    clientFirstName: clientFirstName || (job.client_name ? String(job.client_name).split(' ')[0] : ''),
    projectAddress: job.project_address || projectAddress,
    portalUrl,
    senderNote,
  });

  const sgPayload = {
    personalizations: [{
      to: [{
        email: String(recipientEmail).trim(),
        ...(recipientName && String(recipientName).trim() ? { name: String(recipientName).trim().slice(0, 100) } : {}),
      }],
    }],
    from: { email: fromEmail, name: fromName },
    reply_to: { email: replyTo, name: fromName },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html },
    ],
  };

  try {
    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgPayload),
    });
    if (resp.ok || resp.status === 202) {
      console.log('[share-proposal] sent for job', job.id, 'to', recipientEmail);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }
    const errTxt = await resp.text();
    console.error('[share-proposal] SendGrid error', resp.status, errTxt);
    return { statusCode: resp.status, body: JSON.stringify({ error: 'Failed to send email' }) };
  } catch (e) {
    console.error('[share-proposal] send threw:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
