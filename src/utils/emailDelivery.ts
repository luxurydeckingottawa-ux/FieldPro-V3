/**
 * Email Delivery Service
 * 
 * Sends emails through the Netlify serverless function.
 * Handles both follow-up campaign emails and manual emails.
 */

import { PendingMessage } from './campaignScheduler';

const SEND_EMAIL_URL = '/.netlify/functions/send-email';

/**
 * Send a follow-up email through the Netlify function.
 */
export async function sendFollowUpEmail(message: PendingMessage): Promise<boolean> {
  if (!message.clientEmail || !message.emailBody) {
    console.warn('Cannot send email: missing client email or body');
    return false;
  }

  try {
    const response = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: message.clientEmail,
        subject: message.subject || 'Luxury Decking',
        textBody: message.emailBody,
        replyTo: 'admin@luxurydecking.ca',
      }),
    });

    if (response.ok) {
      console.log(`Email sent: ${message.messageId} to ${message.clientEmail}`);
      return true;
    } else {
      const error = await response.json().catch(() => ({}));
      console.error(`Email failed: ${message.messageId}`, error);
      return false;
    }
  } catch (error) {
    console.error('Email delivery error:', error);
    return false;
  }
}

/**
 * Send a manual email (not part of a campaign).
 */
export async function sendManualEmail(
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  try {
    const response = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        textBody: body,
        replyTo: 'admin@luxurydecking.ca',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Manual email error:', error);
    return false;
  }
}
