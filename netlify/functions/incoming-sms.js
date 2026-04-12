/**
 * Netlify Function: Handle Incoming SMS via Twilio
 * 
 * When someone texts the Twilio number (343-314-4019),
 * Twilio sends the message here via webhook.
 * 
 * This function:
 * 1. Parses the incoming SMS from Twilio
 * 2. Stores it in Supabase (incoming_messages table)
 * 3. Returns empty TwiML (no auto-reply)
 * 
 * The front-end polls Supabase for new messages and displays them in Chat.
 * 
 * Environment variables:
 *   VITE_SUPABASE_URL - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Supabase anon key
 */

const https = require('https');
const crypto = require('crypto');

/**
 * Validates a Twilio webhook signature.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function validateTwilioSignature(event) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // Not configured — allow (will log a warning below)

  const twilioSignature = event.headers['x-twilio-signature'] || event.headers['X-Twilio-Signature'];
  if (!twilioSignature) return false;

  // Reconstruct the full URL Twilio signed
  const host = event.headers.host || event.headers.Host || '';
  const url = `https://${host}${event.rawUrl || event.path || '/.netlify/functions/incoming-sms'}`;

  // Sort POST parameters and append to URL
  const params = new URLSearchParams(event.body || '');
  const sortedKeys = [...params.keys()].sort();
  const sigBase = url + sortedKeys.map(k => `${k}${params.get(k)}`).join('');

  const expectedSig = crypto.createHmac('sha1', authToken).update(sigBase, 'utf8').digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(twilioSignature), Buffer.from(expectedSig));
  } catch {
    return false; // Buffers not the same length — signature mismatch
  }
}

async function supabaseGet(url, anonKey, path) {
  return new Promise((resolve, reject) => {
    const hostname = url.replace('https://', '').replace('http://', '');
    const options = {
      hostname,
      port: 443,
      path: `/rest/v1/${path}`,
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '[]'));
        } else {
          reject(new Error(`Supabase error ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function supabaseInsert(url, anonKey, table, data) {
  const postData = JSON.stringify(data);
  
  return new Promise((resolve, reject) => {
    const hostname = url.replace('https://', '').replace('http://', '');
    const options = {
      hostname: hostname,
      port: 443,
      path: `/rest/v1/${table}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Prefer': 'return=representation',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '[]'));
        } else {
          reject(new Error(`Supabase error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

exports.handler = async function(event) {
  // Only handle POST from Twilio
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    };
  }

  // Verify the request genuinely came from Twilio
  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.warn('TWILIO_AUTH_TOKEN not set — webhook signature validation is disabled');
  } else if (!validateTwilioSignature(event)) {
    console.error('Invalid Twilio signature — rejecting request');
    return { statusCode: 403, body: 'Forbidden' };
  }

  // Parse Twilio webhook data
  const params = new URLSearchParams(event.body);
  const from = params.get('From') || '';
  const body = params.get('Body') || '';
  const to = params.get('To') || '';
  const messageSid = params.get('MessageSid') || '';

  // PII note: do not log phone numbers or message content

  // Store in Supabase if configured
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      // Resolve org_id from the Twilio `To` number
      let orgId = null;
      if (to) {
        try {
          const encodedTo = encodeURIComponent(to);
          const rows = await supabaseGet(
            supabaseUrl, supabaseKey,
            `org_phone_numbers?twilio_number=eq.${encodedTo}&select=org_id&limit=1`
          );
          if (rows && rows.length > 0) orgId = rows[0].org_id;
        } catch {
          // org_phone_numbers table may not exist yet — non-fatal
        }
      }

      await supabaseInsert(supabaseUrl, supabaseKey, 'incoming_messages', {
        from_number: from,
        to_number: to,
        message_body: body,
        twilio_sid: messageSid,
        org_id: orgId,
        received_at: new Date().toISOString(),
        read: false,
      });
    } catch (err) {
      console.error('Failed to store in Supabase:', err.message);
      // Don't fail the webhook, still return 200 to Twilio
    }
  } else {
    console.warn('Supabase not configured, message logged but not stored');
  }

  // Return empty TwiML (no auto-reply)
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
  };
};
