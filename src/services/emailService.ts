/**
 * Message Service
 *
 * Sends emails and SMS through Netlify serverless functions.
 * Used by the drip campaign engine to send automated follow-ups.
 */

const internalSecret = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;        // Plain text body
  htmlBody?: string;   // Optional HTML body
  replyTo?: string;
}

interface SendSmsParams {
  to: string;
  message: string;
}

interface SendResult {
  success: boolean;
  error?: string;
}

/**
 * Send an email via the Netlify function.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  try {
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(internalSecret ? { 'X-Internal-Secret': internalSecret } : {}) },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        textBody: params.body,
        htmlBody: params.htmlBody || formatPlainTextToHtml(params.body),
        replyTo: params.replyTo || 'info@luxurydecking.ca',
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error: 'Network error sending email' };
  }
}

/**
 * Send an SMS via the Netlify function (Twilio).
 */
export async function sendSms(params: SendSmsParams): Promise<SendResult> {
  try {
    const response = await fetch('/.netlify/functions/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(internalSecret ? { 'X-Internal-Secret': internalSecret } : {}) },
      body: JSON.stringify({
        to: params.to,
        message: params.message,
      }),
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Failed to send SMS' };
    }
  } catch (error) {
    console.error('SMS service error:', error);
    return { success: false, error: 'Network error sending SMS' };
  }
}

/**
 * Send a drip campaign touch (may include both email and SMS).
 */
export async function sendCampaignTouch(params: {
  channel: 'sms' | 'email' | 'sms+email';
  email?: string;
  phone?: string;
  subject?: string;
  emailBody: string;
  smsBody: string;
}): Promise<{ emailResult?: SendResult; smsResult?: SendResult }> {
  const results: { emailResult?: SendResult; smsResult?: SendResult } = {};

  if ((params.channel === 'email' || params.channel === 'sms+email') && params.email) {
    results.emailResult = await sendEmail({
      to: params.email,
      subject: params.subject || 'Luxury Decking',
      body: params.emailBody,
    });
  }

  if ((params.channel === 'sms' || params.channel === 'sms+email') && params.phone) {
    results.smsResult = await sendSms({
      to: params.phone,
      message: params.smsBody,
    });
  }

  return results;
}

/**
 * Convert plain text to styled HTML email.
 */
function formatPlainTextToHtml(text: string): string {
  const bodyHtml = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin: 0 0 16px 0;">')
    .replace(/\n- /g, '<br>&bull; ')
    .replace(/\n/g, '<br>');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; color: #333; line-height: 1.6;">
      <div style="border-bottom: 2px solid #C4A432; padding-bottom: 20px; margin-bottom: 25px;">
        <img src="https://fieldprov3.netlify.app/assets/logo-black.png" alt="Luxury Decking" style="height: 40px;" />
      </div>
      <p style="margin: 0 0 16px 0;">${bodyHtml}</p>
    </div>
  `;
}
