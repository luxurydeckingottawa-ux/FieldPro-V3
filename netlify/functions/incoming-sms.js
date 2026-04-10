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

  // Parse Twilio webhook data
  const params = new URLSearchParams(event.body);
  const from = params.get('From') || '';
  const body = params.get('Body') || '';
  const to = params.get('To') || '';
  const messageSid = params.get('MessageSid') || '';

  console.log(`Incoming SMS from ${from}: ${body}`);

  // Store in Supabase if configured
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      await supabaseInsert(supabaseUrl, supabaseKey, 'incoming_messages', {
        from_number: from,
        to_number: to,
        message_body: body,
        twilio_sid: messageSid,
        received_at: new Date().toISOString(),
        read: false,
      });
      console.log('Message stored in Supabase');
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
