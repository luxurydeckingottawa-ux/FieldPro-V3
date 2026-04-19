/**
 * Communications Module -- Centralized email templates and SMS/email send helpers.
 *
 * All HTML email templates and fetch-based send calls live here.
 * App.tsx / useJobs call these helpers instead of inlining 100+ line HTML strings.
 */

import { COMPANY } from '../config/company';

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;

const internalHeaders = (extra: Record<string, string> = {}) => ({
  'Content-Type': 'application/json',
  ...(INTERNAL_SECRET ? { 'X-Internal-Secret': INTERNAL_SECRET } : {}),
  ...extra,
});

// ── SMS Helpers ────────────────────────────────────────────────────────────

/** Send an SMS via the Netlify send-sms function. Non-blocking (fire-and-forget). */
export function sendSms(to: string, message: string): Promise<void> {
  return fetch('/.netlify/functions/send-sms', {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ to, message }),
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) console.error('SMS failed:', data.error);
    })
    .catch(err => console.error('SMS error:', err));
}

/** Send an appointment confirmation SMS (opens native SMS app as fallback). */
export function sendAppointmentConfirmationSms(phone: string, name: string): void {
  const firstName = name.split(' ')[0];
  const msg = `Hi ${firstName}, this is ${COMPANY.name} confirming your estimate appointment. Reply to this message if you have any questions!`;
  window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`);
}

/**
 * Touch-1 instant SMS for new leads. Only call during quiet-hours window (9 AM - 8 PM).
 * Returns a Promise<boolean> so callers can gate on success (e.g. to advance
 * the lead's pipeline_stage from LEAD_IN to FIRST_CONTACT). Never throws.
 */
export function sendLeadAcknowledgementSms(phone: string, clientName: string): Promise<boolean> {
  const firstName = clientName.split(' ')[0] || 'there';
  const smsT1 = `Hi ${firstName}, this is Angela from ${COMPANY.name}. Thank you for reaching out about your deck project. We will be in touch shortly to learn more about what you have in mind. In the meantime, feel free to explore our transparent pricing packages here: https://${COMPANY.website}/pricing. Talk soon!`;
  return fetch('/.netlify/functions/send-sms', {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ to: phone, message: smsT1 }),
  })
    .then(res => res.ok)
    .catch(err => {
      console.warn('[T1 SMS] failed:', err);
      return false;
    });
}

/** Google review request SMS. */
export function sendGoogleReviewSms(phone: string, clientName: string): void {
  const firstName = clientName.split(' ')[0] || 'there';
  const reviewUrl = COMPANY.googleReviewUrl;
  const reviewMsg = `Hi ${firstName}, thank you for choosing ${COMPANY.name}! We'd love it if you could take a moment to leave us a Google review: ${reviewUrl} -- Your feedback means the world to us!`;
  fetch('/.netlify/functions/send-sms', {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ to: phone, message: reviewMsg }),
  }).catch(err => console.warn('[review-sms] failed:', err));
}

/** Warranty delivery SMS with portal link. */
export function sendWarrantySms(phone: string, clientName: string, portalUrl: string): void {
  const firstName = clientName.split(' ')[0] || 'there';
  const warrantyMsg = `Hi ${firstName}, your ${COMPANY.name} project is officially complete! Your 5-year warranty is now active. Access your Project Portal and Warranty Package here: ${portalUrl}`;
  fetch('/.netlify/functions/send-sms', {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ to: phone, message: warrantyMsg }),
  }).catch(err => console.warn('[warranty-sms] failed:', err));
}

// ── Email Helpers ──────────────────────────────────────────────────────────

/** Generic send-email via Netlify function. */
export function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  return fetch('/.netlify/functions/send-email', {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ to, subject, htmlBody }),
  })
    .then(() => {})
    .catch(err => console.warn('[send-email] failed:', err));
}

// ── Email Templates ────────────────────────────────────────────────────────

/** Google review request email -- sent after field submission completion. */
export function buildGoogleReviewEmailHtml(clientFirstName: string): string {
  const GOOGLE_REVIEW_URL = COMPANY.googleReviewUrl;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  @keyframes starPop {
    0%   { transform: scale(1) rotate(-8deg); }
    30%  { transform: scale(1.35) rotate(4deg); }
    60%  { transform: scale(0.9) rotate(-3deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  .star { display:inline-block; animation: starPop 1.4s ease infinite; }
  .s1 { animation-delay: 0s; }
  .s2 { animation-delay: 0.18s; }
  .s3 { animation-delay: 0.36s; }
  .s4 { animation-delay: 0.54s; }
  .s5 { animation-delay: 0.72s; }
</style>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111111;border-radius:20px;overflow:hidden;border:1px solid #222;">

      <!-- Logo -->
      <tr><td align="center" style="padding:40px 40px 0;">
        <img src="https://fieldprov3.netlify.app/assets/logo-white.png"
             alt="${COMPANY.name}" width="160"
             style="display:block;width:160px;height:auto;" />
      </td></tr>

      <!-- Gold divider -->
      <tr><td align="center" style="padding:24px 40px 0;">
        <div style="height:2px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);width:100%;"></div>
      </td></tr>

      <!-- Stars -->
      <tr><td align="center" style="padding:36px 40px 0;">
        <span class="star s1" style="font-size:42px;">\u2B50</span>
        <span class="star s2" style="font-size:42px;">\u2B50</span>
        <span class="star s3" style="font-size:42px;">\u2B50</span>
        <span class="star s4" style="font-size:42px;">\u2B50</span>
        <span class="star s5" style="font-size:42px;">\u2B50</span>
      </td></tr>

      <!-- Headline -->
      <tr><td align="center" style="padding:28px 48px 0;">
        <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;letter-spacing:-0.5px;">
          How does your new deck look, ${clientFirstName}?
        </h1>
      </td></tr>

      <!-- Body copy -->
      <tr><td align="center" style="padding:20px 52px 0;">
        <p style="margin:0;font-size:15px;color:#aaaaaa;line-height:1.7;text-align:center;">
          The crew just wrapped up your project and we couldn't be prouder of the result.
          Your feedback means everything -- not just to us, but to every homeowner who's
          trying to decide if ${COMPANY.name} is the right team for them.
        </p>
      </td></tr>

      <tr><td align="center" style="padding:12px 52px 0;">
        <p style="margin:0;font-size:15px;color:#aaaaaa;line-height:1.7;text-align:center;">
          If you love your new deck, <strong style="color:#D4AF37;">30 seconds and 5 stars</strong>
          would mean the world to our team.
        </p>
      </td></tr>

      <!-- CTA Button -->
      <tr><td align="center" style="padding:36px 40px 0;">
        <a href="${GOOGLE_REVIEW_URL}" target="_blank"
           style="display:inline-flex;align-items:center;gap:14px;background:#ffffff;color:#111111;
                  text-decoration:none;padding:18px 36px;border-radius:50px;
                  font-size:16px;font-weight:900;letter-spacing:0.3px;
                  box-shadow:0 4px 24px rgba(212,175,55,0.25);">
          <img src="https://www.google.com/favicon.ico" width="22" height="22"
               alt="G" style="border-radius:4px;" />
          Leave a Google 5-Star Review
        </a>
      </td></tr>

      <!-- Subtext -->
      <tr><td align="center" style="padding:20px 40px 0;">
        <p style="margin:0;font-size:11px;color:#555555;letter-spacing:2px;text-transform:uppercase;font-weight:700;">
          It only takes 30 seconds to support our team
        </p>
      </td></tr>

      <!-- Gold divider -->
      <tr><td align="center" style="padding:32px 40px 0;">
        <div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);width:100%;"></div>
      </td></tr>

      <!-- Footer -->
      <tr><td align="center" style="padding:24px 40px 40px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:900;color:#D4AF37;letter-spacing:3px;text-transform:uppercase;">
          The ${COMPANY.name} Team
        </p>
        <p style="margin:0;font-size:11px;color:#444444;">
          ${COMPANY.fullAddress} &nbsp;\u00B7&nbsp; ${COMPANY.phone} &nbsp;\u00B7&nbsp; ${COMPANY.website}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Send the Google review request email after field submission. */
export function sendGoogleReviewEmail(clientEmail: string, clientName: string): void {
  const clientFirstName = clientName.split(' ')[0] || 'there';
  const html = buildGoogleReviewEmailHtml(clientFirstName);
  sendEmail(
    clientEmail,
    `The crew just packed up -- how does your new deck look? \u2B50\u2B50\u2B50\u2B50\u2B50`,
    html,
  );
}

/** Warranty delivery email with portal link and optional PDF download. */
export function buildWarrantyEmailHtml(
  clientFirstName: string,
  portalUrl: string,
  pdfUrl?: string,
): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
  <div style="text-align:center;margin-bottom:32px">
    <p style="margin:0;font-size:11px;font-weight:900;color:#c9a227;letter-spacing:3px;text-transform:uppercase">${COMPANY.name}</p>
    <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#fff">Your Project is Complete!</h1>
  </div>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Hi ${clientFirstName},</p>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Your ${COMPANY.name} project is officially complete. Your <strong style="color:#c9a227">5-year warranty is now active</strong>.</p>
  <div style="background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:24px 0;text-align:center">
    <p style="margin:0 0 4px;font-size:11px;font-weight:900;color:#888;letter-spacing:2px;text-transform:uppercase">Your Warranty</p>
    <p style="margin:0;font-size:20px;font-weight:900;color:#c9a227">5-Year Structural Warranty</p>
    <p style="margin:4px 0 0;font-size:13px;color:#666">Access your full warranty certificate and project documentation below</p>
  </div>
  <a href="${portalUrl}" style="display:block;background:#c9a227;color:#000;text-align:center;padding:16px;border-radius:12px;font-weight:900;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;margin:24px 0">Access Your Project Portal \u2192</a>
  ${pdfUrl ? `<a href="${pdfUrl}" style="display:block;border:1px solid #333;color:#c9a227;text-align:center;padding:14px;border-radius:12px;font-weight:700;text-decoration:none;font-size:13px;margin:0 0 24px 0">Download Warranty Certificate (PDF)</a>` : ''}
  <p style="color:#555;font-size:12px;text-align:center">Questions? Call us at ${COMPANY.phone}<br>${COMPANY.name} \u2014 ${COMPANY.fullAddress}</p>
</div>`;
}

/** Send warranty email. */
export function sendWarrantyEmail(
  clientEmail: string,
  clientName: string,
  portalUrl: string,
  pdfUrl?: string,
): void {
  const firstName = clientName.split(' ')[0] || 'there';
  const html = buildWarrantyEmailHtml(firstName, portalUrl, pdfUrl);
  sendEmail(
    clientEmail,
    `Your ${COMPANY.name} Warranty is Now Active`,
    html,
  );
}

/** Estimate ready email with portal link and pricing summary. */
export function buildEstimateEmailHtml(
  clientName: string,
  portalUrl: string,
  totalAmount: number,
  estimateNumber: number,
  clientAddress: string,
): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:40px;border-radius:16px">
  <div style="text-align:center;margin-bottom:32px">
    <p style="margin:0;font-size:11px;font-weight:900;color:#c9a227;letter-spacing:3px;text-transform:uppercase">${COMPANY.name}</p>
    <h1 style="margin:8px 0 0;font-size:28px;font-weight:900;color:#fff">Your Custom Estimate is Ready</h1>
  </div>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Hi ${clientName},</p>
  <p style="color:#aaa;font-size:15px;line-height:1.6">Thank you for your interest in ${COMPANY.name}. Your custom deck estimate is ready to review online.</p>
  <div style="background:#111;border:1px solid #333;border-radius:12px;padding:24px;margin:24px 0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:11px;font-weight:900;color:#888;letter-spacing:2px;text-transform:uppercase">Estimate Total</span>
      <span style="font-size:28px;font-weight:900;color:#c9a227">$${totalAmount.toLocaleString()}</span>
    </div>
    <div style="border-top:1px solid #222;padding-top:12px">
      <p style="margin:0;font-size:12px;color:#666">Estimate #${estimateNumber} \u2022 ${clientAddress}</p>
    </div>
  </div>
  <a href="${portalUrl}" style="display:block;background:#c9a227;color:#000;text-align:center;padding:16px;border-radius:12px;font-weight:900;text-decoration:none;font-size:14px;letter-spacing:1px;text-transform:uppercase;margin:24px 0">Review Your Estimate Online \u2192</a>
  <p style="color:#aaa;font-size:14px;line-height:1.6">Your portal lets you:</p>
  <ul style="color:#888;font-size:14px;line-height:2;padding-left:20px">
    <li>Review the full estimate breakdown</li>
    <li>Accept and secure your spot with a deposit</li>
    <li>Track your project from start to finish</li>
  </ul>
  <p style="color:#555;font-size:12px;text-align:center;margin-top:32px">Questions? Call us at <strong style="color:#c9a227">${COMPANY.phone}</strong> or reply to this email.<br>${COMPANY.name} \u2014 ${COMPANY.fullAddress}</p>
</div>`;
}

/** Send estimate-ready email. Falls back to mailto if no email on file. */
export function sendEstimateEmail(
  clientEmail: string,
  clientName: string,
  portalUrl: string,
  totalAmount: number,
  estimateNumber: number,
  clientAddress: string,
): void {
  if (clientEmail) {
    const html = buildEstimateEmailHtml(clientName, portalUrl, totalAmount, estimateNumber, clientAddress);
    sendEmail(
      clientEmail,
      `Your ${COMPANY.name} Estimate #${estimateNumber} \u2014 $${totalAmount.toLocaleString()}`,
      html,
    );
  } else {
    // Fallback: open mailto if no email on file
    const emailSubject = encodeURIComponent(`Your ${COMPANY.name} Estimate`);
    const emailBody = encodeURIComponent(
      `Hi ${clientName},\n\nYour custom estimate is ready: ${portalUrl}\n\n${COMPANY.name} \u2014 ${COMPANY.phone}`
    );
    const mailLink = document.createElement('a');
    mailLink.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;
    mailLink.click();
  }
}
