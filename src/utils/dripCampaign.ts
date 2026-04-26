/**
 * Drip Campaign Engine
 * 
 * Manages automated follow-up sequences for leads and estimates.
 * All templates from the ${COMPANY_NAME} CRM Pipeline Follow-Up Master System.
 * 
 * Two campaign types:
 * 1. LEAD_FOLLOW_UP: 7 touches from new lead to estimate booked
 * 2. ESTIMATE_FOLLOW_UP: 5 touches from estimate sent to signed contract
 */

import { Job, PipelineStage, PortalEngagement } from '../types';
import { EngagementTier, calculateEngagementTier } from './engagementScoring';

// ============================================================
// TYPES
// ============================================================

export interface CampaignTouch {
  id: string;
  touchNumber: number;
  channel: 'sms' | 'email' | 'sms+email';
  delayDays: number;      // days after campaign start
  delayMinutes?: number;   // minutes after campaign start (for same-day touches)
  subject?: string;        // email subject
  smsTemplate: string;
  emailTemplate: string;
  engagementAdaptive?: boolean; // if true, template varies by engagement tier
}

export interface CampaignStatus {
  campaignType: 'LEAD_FOLLOW_UP' | 'ESTIMATE_FOLLOW_UP' | 'INSTAQUOTE_NURTURE';
  startedAt: string;       // ISO date when campaign started
  currentTouch: number;    // which touch we're on (0-based)
  completedTouches: string[]; // IDs of touches already sent
  nextTouchAt?: string;    // ISO date of next scheduled touch
  nextTouchId?: string;    // ID of next touch to send
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  pauseReason?: string;
  lastEngagementTier?: EngagementTier;
}

export interface ScheduledMessage {
  id: string;
  jobId: string;
  touchId: string;
  channel: 'sms' | 'email';
  to: string;              // email or phone
  subject?: string;
  body: string;
  scheduledFor: string;    // ISO date
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string;
  engagementTier?: EngagementTier;
}

// ============================================================
// TEMPLATE HELPERS
// ============================================================

// TODO (SaaS): Pull these from org_settings when multi-tenant.
// For now, centralized here instead of scattered across templates.
import { COMPANY } from '../config/company';
const COMPANY_NAME = COMPANY.name;
const PRICING_PAGE = `https://${COMPANY.website}/pricing`;
const INSTAQUOTE_LINK = `https://${COMPANY.website}/instaquote`;
const PROCESS_PAGE = `https://${COMPANY.website}/our-process`;
const MATERIALS_PAGE = `https://${COMPANY.website}/materials`;
// InstaQuote nurture campaign — additional resource pages referenced in the
// 7-touch educational drip. Resource page slugs are placeholders; update
// when the actual pages go live on luxurydecking.ca.
const PORTFOLIO_PAGE = `https://${COMPANY.website}/portfolio`;
const CONSULTATION_RESOURCE = `https://${COMPANY.website}/what-to-expect`;
const BOOKING_LINK = `https://${COMPANY.website}/book-consultation`;
const PHONE = COMPANY.phone;
const EMAIL = COMPANY.email;
const WEBSITE = COMPANY.website;

/** Append UTM tracking params for the InstaQuote nurture campaign. */
function utm(url: string, touchNumber: number): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=instaquote_nurture&utm_medium=email&utm_campaign=instaquote_drip&utm_content=touch_${touchNumber}`;
}

function portalLink(job: Job): string {
  const token = job.customerPortalToken || '';
  return `${window.location.origin}?portal=${token}`;
}

/** HTML-friendly portal link for email templates — renders as a clickable button/link */
function portalLinkHtml(job: Job, label = 'View Your Estimate'): string {
  const url = portalLink(job);
  return `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px">${label}</a>`;
}

/** Clean text link for emails where a button is too heavy */
function portalLinkText(job: Job, label = 'Click here to view your estimate'): string {
  const url = portalLink(job);
  return `<a href="${url}" style="color:#c9a84c;font-weight:bold">${label}</a>`;
}

function projectType(job: Job): string {
  return job.projectType || 'deck project';
}

function sig(): string {
  return `\nAngela\n${COMPANY_NAME}\n${PHONE} | ${EMAIL} | ${WEBSITE}`;
}

// ============================================================
// LEAD FOLLOW-UP TEMPLATES (Stage 1)
// ============================================================

export function getLeadTouches(job: Job): CampaignTouch[] {
  const name = job.clientName?.split(' ')[0] || 'there';
  
  return [
    {
      id: 'lead-t1-sms',
      touchNumber: 1,
      channel: 'sms',
      delayDays: 0,
      delayMinutes: 0,
      smsTemplate: `Hi ${name}, this is Angela from ${COMPANY_NAME}. Thank you for reaching out about your deck project. We will be in touch shortly to learn more about what you have in mind. In the meantime, feel free to explore our transparent pricing packages here: ${PRICING_PAGE}. Talk soon!`,
      emailTemplate: '',
    },
    {
      id: 'lead-t3-email',
      touchNumber: 3,
      channel: 'email',
      delayDays: 0,
      delayMinutes: 15,
      subject: 'Your Deck Project Inquiry - ${COMPANY_NAME}',
      smsTemplate: '',
      emailTemplate: `Hi ${name},\n\nThank you for reaching out to ${COMPANY_NAME} about your project.\n\nHere are a few things that might be helpful as you plan:\n\n- See our transparent pricing packages by size and tier: ${PRICING_PAGE}\n- Get an instant price range with our online estimator: ${INSTAQUOTE_LINK}\n- Learn about our process from consultation to completion: ${PROCESS_PAGE}\n\nWe are one of Ottawa's only deck builders that publishes pricing online because we believe you deserve clarity before you commit to anything. No mystery quotes, no guesswork.\n\nWhen is a good time to connect? You can reply here, call us at ${PHONE}, or text us back.\n\nLooking forward to helping with your project.${sig()}`,
    },
    {
      id: 'lead-t4-sms',
      touchNumber: 4,
      channel: 'sms',
      delayDays: 1,
      smsTemplate: `Hi ${name}, it is Angela from ${COMPANY_NAME}. Just following up on your deck project inquiry. No rush at all. When would be a convenient time to chat? You can also get an instant price range anytime here: ${INSTAQUOTE_LINK}`,
      emailTemplate: '',
    },
    {
      id: 'lead-t5-email',
      touchNumber: 5,
      channel: 'email',
      delayDays: 3,
      subject: 'A quick tip for planning your deck project',
      smsTemplate: '',
      emailTemplate: `Hi ${name},\n\nJust a quick follow-up. I know choosing a deck builder is a big decision, so I wanted to share something that might help as you plan.\n\nOne of the most common questions we get is about material selection. The right material choice depends on how you plan to use your deck, your maintenance preferences, and your budget. We have put together a clear comparison to help you think through the options: ${MATERIALS_PAGE}\n\nIf you already have a sense of what you are looking for, our online estimator can give you a realistic price range in about 60 seconds, no commitment required: ${INSTAQUOTE_LINK}\n\nHappy to answer any questions whenever you are ready.${sig()}`,
    },
    {
      id: 'lead-t6-sms',
      touchNumber: 6,
      channel: 'sms+email',
      delayDays: 7,
      subject: 'Should I close your file?',
      smsTemplate: `Hi ${name}, just one last check-in from ${COMPANY_NAME}. If the timing is not right or you have gone another direction, completely understood. If your project is still on your radar, we are here whenever you are ready. Just reply or call ${PHONE}.`,
      emailTemplate: `Hi ${name},\n\nI have reached out a few times and have not heard back, which usually means one of three things:\n\n1. Life got busy and this is not a priority right now\n2. You have decided to go a different direction\n3. You are still thinking about it but have not had a chance to reply\n\nAny of those is perfectly fine. If your deck project comes back up, we would love to help. You can always reach us at ${PHONE} or ${EMAIL}, or get a quick price range online anytime: ${INSTAQUOTE_LINK}\n\nWishing you all the best with your project.${sig()}`,
    },
    {
      id: 'lead-t7-email',
      touchNumber: 7,
      channel: 'email',
      delayDays: 30,
      subject: 'Still thinking about your deck project?',
      smsTemplate: '',
      emailTemplate: `Hi ${name},\n\nIt has been a few weeks since you first reached out. If your deck project is still on your mind, we wanted you to know our team is here whenever you are ready.\n\nA few things that might be helpful:\n\n- Our pricing page shows transparent package options by size and tier: ${PRICING_PAGE}\n- Build availability fills up as the season progresses. Reaching out earlier generally means more flexibility on timing.\n\nNo pressure at all. Just reply to this email or give us a call at ${PHONE} if and when the time is right.${sig()}`,
    },
  ];
}

// ============================================================
// INSTAQUOTE NURTURE TEMPLATES (7 touches over 52 days)
// ------------------------------------------------------------
// Per the InstaQuote Nurture Campaign Master spec. Email-only (no SMS):
// homeowner only consented to email. Voice: Angela, premium calm dry tone.
// Brand rules: Canadian spelling, NO em dashes, NO emoji, NO exclamation
// marks, NO discount language. Sign-off "Angela / Luxury Decking" on two
// lines. Sender display "Angela at Luxury Decking", reply-to admin@.
//
// Send-time rules (enforced in getNextScheduledTouch + processor):
//   Tue/Wed/Thu only, 9:00-10:00 AM ET, no weekends, no holidays.
//   Day 0 PDF Blueprint email is exempt (transactional, fires on submit).
// ============================================================

export function getInstaQuoteTouches(job: Job): CampaignTouch[] {
  const name = job.clientName?.split(' ')[0] || 'there';
  const pdfUrl = job.pdfUrl ? utm(job.pdfUrl, 1) : utm(`https://${WEBSITE}/instaquote`, 1);
  const pricingT1 = utm(PRICING_PAGE, 1);
  const materialsT2 = utm(MATERIALS_PAGE, 2);
  const pricingT3 = utm(PRICING_PAGE, 3);
  const consultationT4 = utm(CONSULTATION_RESOURCE, 4);
  const bookingT4 = utm(BOOKING_LINK, 4);
  const portfolioT5 = utm(PORTFOLIO_PAGE, 5);
  const bookingT6 = utm(BOOKING_LINK, 6);
  const bookingT7 = utm(BOOKING_LINK, 7);

  return [
    // Touch 1 - Day 2: Re-anchor + pricing context
    {
      id: 'iq-t1-email',
      touchNumber: 1,
      channel: 'email',
      delayDays: 2,
      subject: 'Did your deck blueprint come through?',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `A quick note to make sure your deck blueprint landed in your inbox the other day. Sometimes these get caught in spam or buried under everything else.\n\n` +
        `Here is the link in case you want to view it again: ${pdfUrl}\n\n` +
        `While you have it open, one thing worth knowing. The numbers in your blueprint are based on the dimensions you entered. The actual final price can move up or down once we account for things like deck height, foundation type, and stair count. Our pricing page breaks all of that down by size and tier: ${pricingT1}\n\n` +
        `No rush. Take your time looking it over.\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
    // Touch 2 - Day 5: Materials education
    {
      id: 'iq-t2-email',
      touchNumber: 2,
      channel: 'email',
      delayDays: 5,
      subject: 'Wood, composite, or PVC?',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `One of the most common questions we get from homeowners researching a new deck is which material to choose. The right answer depends on your priorities. Some homeowners want the lowest upfront cost. Others want the lowest maintenance. A few care most about appearance and longevity.\n\n` +
        `We put together a guide that walks through the differences between pressure-treated wood, composite, and PVC, including where each one makes sense and where it does not.\n\n` +
        `You can read it here: ${materialsT2}\n\n` +
        `If you have questions about which material fits your project, just reply to this email.\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
    // Touch 3 - Day 10: Tier explanation + mobile showroom intro
    {
      id: 'iq-t3-email',
      touchNumber: 3,
      channel: 'email',
      delayDays: 10,
      subject: 'What you get at each pricing tier',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `Your blueprint included pricing across our Silver, Gold, and Platinum packages. The tiers are not arbitrary. Each one represents a different combination of materials, railings, and finishing details.\n\n` +
        `Here is the short version:\n\n` +
        `Silver. Pressure-treated wood, aluminum or wood railings, standard finish.\n` +
        `Gold. Composite decking, aluminum railings, upgraded fasteners and trim.\n` +
        `Platinum. Premium composite or PVC, glass or aluminum railings, full hidden fastener system.\n` +
        `Diamond. Top-tier PVC, custom design elements, fully integrated lighting and finishing.\n\n` +
        `The full breakdown by deck size lives on our pricing page: ${pricingT3}\n\n` +
        `If you would prefer to see and feel actual material samples, our mobile showroom comes to your home. Walk the space, look at samples in real light, ask questions in person.\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
    // Touch 4 - Day 17: First soft consultation ask + LED kit (only place it appears)
    {
      id: 'iq-t4-email',
      touchNumber: 4,
      channel: 'email',
      delayDays: 17,
      subject: 'What happens at a first consultation',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `Some homeowners hesitate to book a consultation because they assume it means a sales pitch and a hard close. Ours does not work that way.\n\n` +
        `Our consultations are educational. We come to your home, walk your space, take measurements, talk through materials, and answer your questions. You leave with a detailed written quote and clear next steps. There is no obligation, no pressure, and no commitment to move forward.\n\n` +
        `Every deck we build this season also includes a complimentary LED deck lighting kit, valued at $750. It is included automatically with any project signed for the current build season.\n\n` +
        `If you would like to read what to expect at a first consultation in more detail: ${consultationT4}\n\n` +
        `Or if you are ready to book, you can do that here: ${bookingT4}\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
    // Touch 5 - Day 26: Portfolio proof
    {
      id: 'iq-t5-email',
      touchNumber: 5,
      channel: 'email',
      delayDays: 26,
      subject: 'Recent Ottawa decks we have built',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `If it helps to see what your project could actually look like, here are some recent Ottawa builds across different sizes, materials, and tiers:\n\n` +
        `${portfolioT5}\n\n` +
        `Each project on the page shows the size, materials, and tier so you can compare directly to the blueprint we sent you.\n\n` +
        `If you see something close to what you have in mind, reply to this email and let us know. We can talk you through it.\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
    // Touch 6 - Day 38: Soft urgency, build season language
    {
      id: 'iq-t6-email',
      touchNumber: 6,
      channel: 'email',
      delayDays: 38,
      subject: 'A note on build availability',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `A quick note on timing. Our build season in Ottawa runs roughly May through October, weather permitting. The earlier in the year a project is booked, the more flexibility there is on the start date.\n\n` +
        `If your project is moving forward this season, the next step is a free consultation at your home. We bring the mobile showroom, walk your space, and prepare a detailed written quote on the spot.\n\n` +
        `You can book here: ${bookingT6}\n\n` +
        `If the timing is not right this year, no problem at all. Just reply and let us know and we will keep your file on hand for next season.\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
    // Touch 7 - Day 52: Graceful close
    {
      id: 'iq-t7-email',
      touchNumber: 7,
      channel: 'email',
      delayDays: 52,
      subject: 'Should we keep your file open?',
      smsTemplate: '',
      emailTemplate:
        `Hi ${name},\n\n` +
        `It has been a few weeks since you first looked at deck pricing on our site, and I want to respect your inbox. This will be the last note from us for now.\n\n` +
        `If your project is still in motion, we are here whenever you are ready. The blueprint we sent is still valid, and you can book a consultation any time: ${bookingT7}\n\n` +
        `If the timing is not right or you have decided to go a different direction, that is completely fine. Just reply with one word and we will close out your file.\n\n` +
        `Either way, thanks for considering Luxury Decking.\n\n` +
        `Angela\n` +
        `Luxury Decking`,
    },
  ];
}

/**
 * Map touch number (1-7) to the InstaQuote pipeline stage that the lead
 * advances to AFTER that touch fires. Used by the processor to auto-progress.
 */
export function instaQuoteStageAfterTouch(touchNumber: number): PipelineStage | null {
  const map: Record<number, PipelineStage> = {
    1: PipelineStage.INSTAQUOTE_TOUCH_1,
    2: PipelineStage.INSTAQUOTE_TOUCH_2,
    3: PipelineStage.INSTAQUOTE_TOUCH_3,
    4: PipelineStage.INSTAQUOTE_TOUCH_4,
    5: PipelineStage.INSTAQUOTE_TOUCH_5,
    6: PipelineStage.INSTAQUOTE_TOUCH_6,
    7: PipelineStage.INSTAQUOTE_TOUCH_7,
  };
  return map[touchNumber] || null;
}

// ============================================================
// ESTIMATE FOLLOW-UP TEMPLATES (Stage 2)
// ============================================================

function getEstimateTouch1(job: Job): CampaignTouch {
  const name = job.clientName?.split(' ')[0] || 'there';
  const pType = projectType(job);
  return {
    id: 'est-fu1-day0',
    touchNumber: 1,
    channel: 'sms+email',
    delayDays: 0,
    delayMinutes: 180, // 3 hours after estimate sent
    subject: 'Your ${COMPANY_NAME} estimate is ready',
    smsTemplate: `Hi ${name}, your estimate for your ${pType} has been sent to your inbox. You can view it, compare options, and explore different packages right from the portal. Let me know if you have any questions. - Angela, ${COMPANY_NAME}`,
    emailTemplate: `Hi ${name},\n\nThank you for taking the time to meet with us about your deck project. Your personalized estimate is now ready to view in your portal.\n\nInside your estimate, you can:\n- Review the full project scope and specifications\n- Compare package tiers (Silver, Gold, Platinum, Diamond)\n- See exactly what is included at each level\n- Explore optional upgrades and add-ons\n\nTake your time reviewing everything. If you have any questions about materials, timelines, or the process, we are happy to walk through it with you.\n\n${portalLinkHtml(job, 'View Your Estimate')}${sig()}`,
  };
}

function getEstimateTouchDay3(job: Job, tier: EngagementTier): CampaignTouch {
  const name = job.clientName?.split(' ')[0] || 'there';
  const link = portalLink(job);
  
  const templates: Record<EngagementTier, { subject: string; email: string; sms: string }> = {
    HOT: {
      subject: 'Quick question about your estimate',
      email: `Hi ${name},\n\nJust following up on your deck estimate. Most of our clients at this stage have questions about what separates the different package tiers, so I wanted to make sure you have everything you need.\n\nThe short version: every tier uses the same structural standards and build process. The difference is in the surface materials, railing style, and finishing details. So you are never compromising on quality, just choosing the level of finish that fits your vision and budget.\n\nA couple of things worth knowing:\n\n- Our current build schedule has availability for a spring/summer start\n- We include a complimentary LED deck lighting kit ($750 value) with every project booked this season\n\nIf you have any questions or would like to adjust anything in the scope, just reply here or text us at ${PHONE}. Happy to help.${sig()}`,
      sms: `Hi ${name}, just sent a quick email about your deck estimate. If you have any questions about the options or want to adjust anything, just reply here. - Angela`,
    },
    WARM: {
      subject: 'A few things that might help with your decision',
      email: `Hi ${name},\n\nJust checking in on your deck estimate. I know there is a lot to consider, so I wanted to share a couple of things that might help as you think it through.\n\nOne question we hear often is about the difference between our package tiers. Here is the short version: every tier uses the same structural standards and build process. The difference is in the surface materials, railing style, and finishing details. So you are never compromising on quality, just choosing the level of finish that fits your vision and budget.\n\nIf you have any questions, just reply to this email or text us at ${PHONE}. No pressure, just clarity.\n\n${portalLinkHtml(job, 'View Your Estimate')}${sig()}`,
      sms: `Hi ${name}, following up on your deck estimate. Any questions I can help with? No rush, just want to make sure you have everything you need. - Angela`,
    },
    COOL: {
      subject: 'Your deck estimate - anything I can clarify?',
      email: `Hi ${name},\n\nI wanted to check in on the estimate we sent for your project. I know these decisions take time, and there is a lot of information to take in.\n\nIf anything in the estimate was unclear or if you have questions about scope, materials, or timeline, I am here to help. Sometimes a quick conversation can simplify things.\n\nYou can revisit your estimate anytime here: ${link}\n\nAnd if it helps, here is a quick look at how our process works from consultation to completion: ${PROCESS_PAGE}\n\nNo rush on your end. Just want to make sure you have what you need.${sig()}`,
      sms: `Hi ${name}, just a quick follow-up on your deck estimate. Let me know if you have any questions or if there is anything I can clarify. - Angela`,
    },
    COLD: {
      subject: 'Did you get a chance to see your deck estimate?',
      email: `Hi ${name},\n\nI wanted to make sure your estimate came through okay. Sometimes these things end up in spam or get buried in a busy inbox.\n\nYour personalized estimate is waiting in your portal and includes full project specifications, package options, and transparent pricing for your ${projectType(job)}.\n\n${portalLinkHtml(job, 'View Your Estimate')}\n\nIf anything has changed or the timing is not right, that is completely fine. Just let me know and I will update your file.${sig()}`,
      sms: `Hi ${name}, just checking in. I sent your deck estimate a few days ago and wanted to make sure you received it. Here is the link: ${link}. Let me know if you have any questions. - Angela`,
    },
  };

  const t = templates[tier];
  return {
    id: `est-fu2-day3-${tier.toLowerCase()}`,
    touchNumber: 2,
    channel: 'sms+email',
    delayDays: 3,
    engagementAdaptive: true,
    subject: t.subject,
    smsTemplate: t.sms,
    emailTemplate: t.email,
  };
}

function getEstimateTouchDay7(job: Job, tier: EngagementTier): CampaignTouch {
  const name = job.clientName?.split(' ')[0] || 'there';
  const link = portalLink(job);

  const templates: Record<EngagementTier, { subject: string; email: string; sms: string }> = {
    HOT: {
      subject: 'One thing I wanted to mention about your project',
      email: `Hi ${name},\n\nJust a quick follow-up on your deck estimate. I wanted to mention a couple of things that are relevant to your timeline:\n\n- Build availability is filling for the upcoming window. Booking sooner gives you more flexibility on your preferred start date.\n- Your estimate is locked at current pricing. Material costs can shift, so the pricing in your portal reflects today's rates.\n- Every project this season includes a complimentary LED deck lighting kit ($750 value).\n\nIf there is anything holding you back or something I can adjust in the scope, I am happy to discuss. You can reply here or text us at ${PHONE}.${sig()}`,
      sms: `Hi ${name}, following up on your deck estimate. Build spots are filling up. If you have any questions or want to adjust the scope, just reply here. - Angela`,
    },
    WARM: {
      subject: 'How we are different from other quotes you might be comparing',
      email: `Hi ${name},\n\nIf you are comparing estimates from different builders right now, here are a few things that set ${COMPANY_NAME} apart:\n\n- Transparent pricing: you can see exactly what is included at every tier, no hidden costs or vague allowances\n- We bring a mobile showroom to your consultation so you can see and touch actual materials before committing\n- Every project is built to the same structural standard regardless of which package you choose\n- We include a complimentary LED deck lighting kit ($750 value) this season\n\nI am not going to try to pressure you into a decision. I just want to make sure you have the full picture. If you want to revisit your estimate: ${link}${sig()}`,
      sms: `Hi ${name}, just sent a follow-up email about your deck estimate with some info that might help if you are comparing options. Let me know if you have any questions. - Angela`,
    },
    COOL: {
      subject: 'Still thinking about your deck project?',
      email: `Hi ${name},\n\nJust a gentle check-in. If your deck project is still on your mind, your estimate is ready whenever you are.\n\n${portalLinkHtml(job, 'View Your Estimate')}\n\nIf you would like to adjust the scope, explore different material options, or talk through a different budget range, we can absolutely do that. Our estimates are not one-size-fits-all.\n\nLet me know how you would like to proceed, or if anything has changed.${sig()}`,
      sms: `Hi ${name}, just checking in on your deck estimate. If you want to adjust anything or have questions, just reply here. - Angela`,
    },
    COLD: {
      subject: 'Your estimate is still available',
      email: `Hi ${name},\n\nYour deck estimate is still available in your portal if you would like to take a look.\n\n${portalLinkHtml(job, 'View Your Estimate')}\n\nIf the timing has changed or you have decided to hold off, no problem at all. Just let me know and I will close out your file.\n\nIf you have any concerns about scope, budget, or process, I am happy to discuss. Sometimes a quick text back and forth can clear things up.${sig()}`,
      sms: `Hi ${name}, your deck estimate is still available here: ${link}. If the timing is not right, just let me know and I will update your file. - Angela`,
    },
  };

  const t = templates[tier];
  return {
    id: `est-fu3-day7-${tier.toLowerCase()}`,
    touchNumber: 3,
    channel: 'sms+email',
    delayDays: 7,
    engagementAdaptive: true,
    subject: t.subject,
    smsTemplate: t.sms,
    emailTemplate: t.email,
  };
}

function getEstimateTouchDay14(job: Job, tier: EngagementTier): CampaignTouch {
  const name = job.clientName?.split(' ')[0] || 'there';
  const link = portalLink(job);
  const isHotWarm = tier === 'HOT' || tier === 'WARM';

  return {
    id: `est-fu4-day14-${isHotWarm ? 'hot-warm' : 'cool-cold'}`,
    touchNumber: 4,
    channel: 'sms+email',
    delayDays: 14,
    engagementAdaptive: true,
    subject: isHotWarm ? 'Last check-in on your deck project' : 'Should I close your estimate file?',
    smsTemplate: isHotWarm
      ? `Hi ${name}, last follow-up from me on your deck estimate. If you are still interested, I would love to help finalize things. If you have gone another direction, no hard feelings. Just let me know. - Angela`
      : `Hi ${name}, just a final check-in about your deck project. If you have moved on, completely understood. If you are still thinking about it, your estimate is here: ${link}. - Angela`,
    emailTemplate: isHotWarm
      ? `Hi ${name},\n\nThis will be my last follow-up on your estimate. I do not want to be a bother, and I know you are busy.\n\nIf you are still considering the project, here is what I want you to know:\n\n- Your estimate pricing is current as of today\n- Our build calendar is filling and earlier bookings get more scheduling flexibility\n- We can adjust scope, materials, or budget to find something that works\n\nIf you have decided to go another direction or the timing is not right, completely understood. We are here whenever your project comes back up.\n\n${portalLinkHtml(job, 'View Your Estimate')}${sig()}`
      : `Hi ${name},\n\nI have followed up a few times and have not heard back, so I am going to go ahead and close your estimate file.\n\nIf your project comes back up in the future, please do not hesitate to reach out. We would be happy to put together a fresh estimate at that point.\n\nWishing you all the best.${sig()}`,
  };
}

function getEstimateTouchDay30(job: Job): CampaignTouch {
  const name = job.clientName?.split(' ')[0] || 'there';
  return {
    id: 'est-fu5-day30',
    touchNumber: 5,
    channel: 'email',
    delayDays: 30,
    subject: 'Your deck project - still on your mind?',
    smsTemplate: '',
    emailTemplate: `Hi ${name},\n\nIt has been about a month since we sent your estimate, and I wanted to reach out one more time.\n\nIf your project is still in the planning stages, we are here whenever you are ready. A few things worth knowing:\n\n- Pricing may be updated since your original estimate. If you decide to move forward, we can provide a refreshed quote quickly.\n- Build availability shifts throughout the season. Reaching out earlier generally means better scheduling flexibility.\n\nIf you would like to reconnect, just reply to this email or give us a call at ${PHONE}.${sig()}`,
  };
}

// ============================================================
// CAMPAIGN ORCHESTRATOR
// ============================================================

/**
 * Get the full sequence of touches for a campaign type.
 * For estimate follow-ups, the engagement tier determines which template to use.
 */
export function getCampaignTouches(
  type: 'LEAD_FOLLOW_UP' | 'ESTIMATE_FOLLOW_UP' | 'INSTAQUOTE_NURTURE',
  job: Job,
  engagement?: PortalEngagement
): CampaignTouch[] {
  if (type === 'LEAD_FOLLOW_UP') {
    return getLeadTouches(job);
  }
  if (type === 'INSTAQUOTE_NURTURE') {
    return getInstaQuoteTouches(job);
  }

  const tier = calculateEngagementTier(engagement).tier;
  return [
    getEstimateTouch1(job),
    getEstimateTouchDay3(job, tier),
    getEstimateTouchDay7(job, tier),
    getEstimateTouchDay14(job, tier),
    getEstimateTouchDay30(job),
  ];
}

/**
 * Apply InstaQuote send-time rules:
 *   - Only Tue/Wed/Thu (skip Fri/Sat/Sun/Mon to next eligible Tue)
 *   - Only between 9:00 and 10:00 AM Eastern Time
 *   - Day 0 PDF Blueprint (touchNumber 0 / no touch) is exempt
 *
 * Pushes the date FORWARD to the next eligible window. Never earlier.
 * Returns the same Date object adjusted in place; caller uses the result.
 *
 * NOTE: this is a single-tenant approximation. For multi-tenant we would
 * accept org timezone + holiday calendar from settings. For now we hardcode
 * America/Toronto (Ottawa) and skip a small list of major Canadian holidays.
 */
const CA_HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-04-03', '2026-05-18', '2026-07-01', '2026-08-03',
  '2026-09-07', '2026-10-12', '2026-12-25', '2026-12-28',
]);

export function applyInstaQuoteSendWindow(scheduledFor: Date): Date {
  // Convert to Eastern Time for the day-of-week + window check.
  // We use UTC math because Node may not have full ICU on Netlify functions.
  // Approximation: Eastern is UTC-5 (EST) or UTC-4 (EDT). For send-window
  // rules a one-hour DST drift is acceptable.
  const out = new Date(scheduledFor);
  for (let safety = 0; safety < 14; safety++) {
    const isoDay = out.toISOString().slice(0, 10);
    // Eastern day-of-week: subtract 4 hours from UTC then read the UTC day
    const etProbe = new Date(out.getTime() - 4 * 60 * 60 * 1000);
    const dow = etProbe.getUTCDay(); // 0=Sun..6=Sat
    const isEligibleDay = dow === 2 || dow === 3 || dow === 4; // Tue/Wed/Thu
    const isHoliday = CA_HOLIDAYS_2026.has(isoDay);
    if (isEligibleDay && !isHoliday) {
      // Force the time to 9:30 AM Eastern (13:30 UTC roughly)
      out.setUTCHours(13, 30, 0, 0);
      return out;
    }
    // Push forward one day and re-check
    out.setUTCDate(out.getUTCDate() + 1);
    out.setUTCHours(13, 30, 0, 0);
  }
  return out;
}

/**
 * Determine the next touch to send based on campaign status.
 * Returns null if the campaign is complete or paused.
 */
export function getNextScheduledTouch(
  campaign: CampaignStatus,
  job: Job,
  engagement?: PortalEngagement
): { touch: CampaignTouch; scheduledFor: Date } | null {
  if (campaign.status !== 'active') return null;

  const touches = getCampaignTouches(campaign.campaignType, job, engagement);
  const nextTouch = touches.find(t => !campaign.completedTouches.includes(t.id));
  
  if (!nextTouch) return null;

  const startDate = new Date(campaign.startedAt);
  const scheduledFor = new Date(startDate);
  
  if (nextTouch.delayMinutes !== undefined && nextTouch.delayDays === 0) {
    scheduledFor.setMinutes(scheduledFor.getMinutes() + nextTouch.delayMinutes);
  } else {
    scheduledFor.setDate(scheduledFor.getDate() + nextTouch.delayDays);
    // Respect send time rules: Tue-Thu, 9-10 AM ET
    if (nextTouch.delayDays > 0) {
      scheduledFor.setHours(9, 30, 0, 0);
      // Skip weekends and Monday/Friday
      const day = scheduledFor.getDay();
      if (day === 0) scheduledFor.setDate(scheduledFor.getDate() + 2); // Sun -> Tue
      if (day === 6) scheduledFor.setDate(scheduledFor.getDate() + 3); // Sat -> Tue
      if (day === 1) scheduledFor.setDate(scheduledFor.getDate() + 1); // Mon -> Tue
      if (day === 5) scheduledFor.setDate(scheduledFor.getDate() + 4); // Fri -> Tue
    }
  }

  // InstaQuote nurture has stricter rules (also skips Canadian holidays
  // and lands strictly in the 9-10 AM ET window). Apply on top.
  if (campaign.campaignType === 'INSTAQUOTE_NURTURE' && nextTouch.delayDays > 0) {
    return { touch: nextTouch, scheduledFor: applyInstaQuoteSendWindow(scheduledFor) };
  }

  return { touch: nextTouch, scheduledFor };
}

/**
 * Check if a campaign should be paused or cancelled.
 * 
 * Exclusion rules from the master system:
 * - Client replied to any message -> pause for manual follow-up
 * - Client booked consultation or accepted estimate -> cancel
 * - Client said "not interested" -> move to Lost, cancel
 * - Client is in an active project -> cancel
 */
export function shouldPauseCampaign(job: Job): { pause: boolean; reason?: string } {
  const jobStages = [
    PipelineStage.JOB_SOLD, PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION,
    PipelineStage.READY_TO_START, PipelineStage.IN_FIELD, PipelineStage.COMPLETION,
    PipelineStage.PAID_CLOSED
  ];

  if (jobStages.includes(job.pipelineStage)) {
    return { pause: true, reason: 'Job is in active project stage' };
  }

  if (job.pipelineStage === PipelineStage.EST_APPROVED) {
    return { pause: true, reason: 'Estimate accepted' };
  }

  if (job.pipelineStage === PipelineStage.EST_REJECTED || job.pipelineStage === PipelineStage.LEAD_LOST) {
    return { pause: true, reason: 'Lead lost or estimate rejected' };
  }

  // InstaQuote terminal stages — Won (booked) or Closed (cold/unsubscribed)
  // both stop the nurture sequence permanently.
  if (job.pipelineStage === PipelineStage.INSTAQUOTE_WON) {
    return { pause: true, reason: 'Consultation booked - moved to Won' };
  }
  if (job.pipelineStage === PipelineStage.INSTAQUOTE_CLOSED) {
    return { pause: true, reason: 'Lead closed - cold or unsubscribed' };
  }

  return { pause: false };
}
