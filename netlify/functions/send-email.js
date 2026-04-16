/**
 * Netlify Function: Send Follow-Up Email
 * 
 * Sends automated follow-up emails using SendGrid.
 * Called by the campaign scheduler from the frontend.
 * 
 * Environment variables required:
 *   SENDGRID_API_KEY - SendGrid API key
 *   SENDGRID_FROM_EMAIL - Sender email (admin@luxurydecking.ca)
 *   SENDGRID_FROM_NAME - Sender name (Angela - Luxury Decking)
 */

// Shared secret guard. SECURITY: defaults to DENY when env var is missing.
function checkInternalSecret(event) {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const provided = event.headers['x-internal-secret'] || event.headers['X-Internal-Secret'];
  return provided === secret;
}

exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!checkInternalSecret(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
  const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'FieldPro';
  const REPLY_TO_EMAIL = process.env.SENDGRID_REPLY_TO || FROM_EMAIL;

  if (!FROM_EMAIL) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Email sender not configured. Set SENDGRID_FROM_EMAIL.' }) };
  }

  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured. Add SENDGRID_API_KEY to Netlify environment variables.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { to, subject, htmlBody, textBody, replyTo } = body;

  if (!to || !subject || (!htmlBody && !textBody)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: to, subject, and htmlBody or textBody' }) };
  }

  // Validate recipient email format (prevent header injection)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(to)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid recipient email address' }) };
  }

  // Sanitise htmlBody — strip <script>, <iframe>, on* attributes, and javascript: hrefs
  // This prevents stored-XSS via email body being reflected back into admin UI
  const sanitiseHtml = (raw) => raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');

  // Convert plain text body to simple HTML if no HTML provided
  const html = htmlBody ? sanitiseHtml(htmlBody) : textBody.replace(/\n/g, '<br>');

  const sgPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    reply_to: { email: replyTo || REPLY_TO_EMAIL, name: FROM_NAME },
    subject: subject,
    content: [
      { type: 'text/plain', value: textBody || htmlBody.replace(/<[^>]*>/g, '') },
      { type: 'text/html', value: html },
    ],
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgPayload),
    });

    if (response.ok || response.status === 202) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'Email sent successfully' }),
      };
    } else {
      const errorText = await response.text();
      console.error('SendGrid error:', response.status, errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to send email', details: errorText }),
      };
    }
  } catch (error) {
    console.error('Email send error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error sending email' }),
    };
  }
};
