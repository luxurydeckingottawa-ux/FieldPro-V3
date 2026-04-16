/**
 * Netlify Function: Gemini AI Proxy
 *
 * Keeps the GEMINI_API_KEY server-side so it is never exposed in the browser bundle.
 * All AI calls from the frontend route through here.
 *
 * POST /.netlify/functions/gemini-proxy
 * Body: { model, prompt, responseMimeType? }
 * Returns: { text: string }
 *
 * Environment variables:
 *   GEMINI_API_KEY — Google Gemini API key (server-side only, no VITE_ prefix)
 *   INTERNAL_API_SECRET — shared secret guard (see upload.js)
 */

const https = require('https');

// SECURITY: defaults to DENY when env var is missing.
function checkInternalSecret(event) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const provided = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'];
  return provided === secret;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!checkInternalSecret(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Gemini API key not configured on server. Add GEMINI_API_KEY to Netlify environment variables.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { model = 'gemini-2.0-flash', prompt, responseMimeType } = body;

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required field: prompt' }) };
  }

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(responseMimeType ? { generationConfig: { responseMimeType } } : {}),
  };

  const postData = JSON.stringify(requestBody);
  const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            resolve({ statusCode: 200, body: JSON.stringify({ text }) });
          } else {
            const errorMsg = parsed.error?.message || `Gemini API error ${res.statusCode}`;
            console.error('Gemini proxy error:', res.statusCode, errorMsg);
            resolve({ statusCode: res.statusCode, body: JSON.stringify({ error: errorMsg }) });
          }
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: 'Failed to parse Gemini response' }) });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Gemini proxy request error:', err.message);
      resolve({ statusCode: 500, body: JSON.stringify({ error: 'Failed to connect to Gemini API' }) });
    });

    req.write(postData);
    req.end();
  });
};
