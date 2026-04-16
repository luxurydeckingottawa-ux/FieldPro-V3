/**
 * Netlify Function: Send SMS via Twilio
 * 
 * Sends automated SMS messages for drip campaigns.
 * 
 * Environment variables required:
 *   TWILIO_ACCOUNT_SID - Your Twilio Account SID
 *   TWILIO_AUTH_TOKEN - Your Twilio Auth Token
 *   TWILIO_PHONE_NUMBER - Your Twilio phone number (e.g., +16135551234)
 * 
 * POST /.netlify/functions/send-sms
 * Body: { to, message, campaignId?, touchId? }
 */

const https = require('https');

// Simple request-size guard to prevent abuse (S-10)
function checkPayloadSize(event, maxBytes = 10000) {
  if (event.body && event.body.length > maxBytes) return false;
  return true;
}

// Shared secret guard. SECURITY: defaults to DENY when env var is missing.
function checkInternalSecret(event) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const provided = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'];
  return provided === secret;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!checkInternalSecret(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (!checkPayloadSize(event)) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Payload too large' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { to, message, campaignId, touchId } = payload;

  if (!to || !message) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: to, message' }) };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('Twilio credentials not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SMS service not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to Netlify environment variables.' }),
    };
  }

  // Format phone number (ensure +1 prefix for North American numbers)
  let formattedTo = to.replace(/[^0-9+]/g, '');
  if (!formattedTo.startsWith('+')) {
    if (formattedTo.length === 10) formattedTo = '+1' + formattedTo;
    else if (formattedTo.length === 11 && formattedTo.startsWith('1')) formattedTo = '+' + formattedTo;
    else formattedTo = '+' + formattedTo;
  }

  // Build Twilio API request
  const postData = new URLSearchParams({
    To: formattedTo,
    From: fromNumber,
    Body: message,
  }).toString();

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                message: 'SMS sent successfully',
                sid: data.sid,
                campaignId,
                touchId,
              }),
            });
          } else {
            // Log full error server-side but return generic message to client
            console.error('Twilio error:', res.statusCode, data.message || responseBody);
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'SMS delivery failed. Please try again.' }),
            });
          }
        } catch (e) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to parse Twilio response' }),
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Twilio request error:', error);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to connect to SMS service' }),
      });
    });

    req.write(postData);
    req.end();
  });
};
