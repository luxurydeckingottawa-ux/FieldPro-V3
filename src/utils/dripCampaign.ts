/**
 * Drip Campaign Engine
 * 
 * Manages automated follow-up sequences for leads and estimates.
 * All templates from the Luxury Decking CRM Pipeline Follow-Up Master System.
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
  campaignType: 'LEAD_FOLLOW_UP' | 'ESTIMATE_FOLLOW_UP';
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

const PRICING_PAGE = 'https://luxurydecking.ca/pricing';
const INSTAQUOTE_LINK = 'https://luxurydecking.ca/instaquote';
const PROCESS_PAGE = 'https://luxurydecking.ca/our-process';
const MATERIALS_PAGE = 'https://luxurydecking.ca/materials';
const PHONE = '613-707-3060';
const EMAIL = 'info@luxurydecking.ca';
const WEBSITE = 'luxurydecking.ca';

function portalLink(job: Job): string {
  const token = job.customerPortalToken || '';
  return `${window.location.origin}?portal=${token}`;
}

function projectType(job: Job): string {
  return job.projectType || 'deck project';
}

function sig(): string {
  return `\nAngela\nLuxury Decking\n${PHONE} | ${EMAIL} | ${WEBSITE}`;
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
      smsTemplate: `Hi ${name}, this is Angela from Luxury Decking. Thank you for reaching out about your deck project. We will be in touch shortly to learn more about what you have in mind. In the meantime, feel free to explore our transparent pricing packages here: ${PRICING_PAGE}. Talk soon!`,
      emailTemplate: '',
    },
    {
      id: 'lead-t3-email',
      touchNumber: 3,
      channel: 'email',
      delayDays: 0,
      delayMinutes: 15,
      subject: 'Your Deck Project Inquiry - Luxury Decking',
      smsTemplate: '',
      emailTemplate: `Hi ${name},\n\nThank you for reaching out to Luxury Decking about your project.\n\nHere are a few things that might be helpful as you plan:\n\n- See our transparent pricing packages by size and tier: ${PRICING_PAGE}\n- Get an instant price range with our online estimator: ${INSTAQUOTE_LINK}\n- Learn about our process from consultation to completion: ${PROCESS_PAGE}\n\nWe are one of Ottawa's only deck builders that publishes pricing online because we believe you deserve clarity before you commit to anything. No mystery quotes, no guesswork.\n\nWhen is a good time to connect? You can reply here, call us at ${PHONE}, or text us back.\n\nLooking forward to helping with your project.${sig()}`,
    },
    {
      id: 'lead-t4-sms',
      touchNumber: 4,
      channel: 'sms',
      delayDays: 1,
      smsTemplate: `Hi ${name}, it is Angela from Luxury Decking. Just following up on your deck project inquiry. No rush at all. When would be a convenient time to chat? You can also get an instant price range anytime here: ${INSTAQUOTE_LINK}`,
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
      smsTemplate: `Hi ${name}, just one last check-in from Luxury Decking. If the timing is not right or you have gone another direction, completely understood. If your project is still on your radar, we are here whenever you are ready. Just reply or call ${PHONE}.`,
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
    subject: 'Your Luxury Decking estimate is ready',
    smsTemplate: `Hi ${name}, your estimate for your ${pType} has been sent to your inbox. You can view it, compare options, and explore different packages right from the portal. Let me know if you have any questions. - Angela, Luxury Decking`,
    emailTemplate: `Hi ${name},\n\nThank you for taking the time to meet with us about your deck project. Your personalized estimate is now ready to view in your portal.\n\nInside your estimate, you can:\n- Review the full project scope and specifications\n- Compare package tiers (Silver, Gold, Platinum, Diamond)\n- See exactly what is included at each level\n- Explore optional upgrades and add-ons\n\nTake your time reviewing everything. If you have any questions about materials, timelines, or the process, we are happy to walk through it with you.\n\nView Your Estimate: ${portalLink(job)}${sig()}`,
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
      email: `Hi ${name},\n\nJust checking in on your deck estimate. I know there is a lot to consider, so I wanted to share a couple of things that might help as you think it through.\n\nOne question we hear often is about the difference between our package tiers. Here is the short version: every tier uses the same structural standards and build process. The difference is in the surface materials, railing style, and finishing details. So you are never compromising on quality, just choosing the level of finish that fits your vision and budget.\n\nIf you have any questions, just reply to this email or text us at ${PHONE}. No pressure, just clarity.\n\nView Your Estimate: ${link}${sig()}`,
      sms: `Hi ${name}, following up on your deck estimate. Any questions I can help with? No rush, just want to make sure you have everything you need. - Angela`,
    },
    COOL: {
      subject: 'Your deck estimate - anything I can clarify?',
      email: `Hi ${name},\n\nI wanted to check in on the estimate we sent for your project. I know these decisions take time, and there is a lot of information to take in.\n\nIf anything in the estimate was unclear or if you have questions about scope, materials, or timeline, I am here to help. Sometimes a quick conversation can simplify things.\n\nYou can revisit your estimate anytime here: ${link}\n\nAnd if it helps, here is a quick look at how our process works from consultation to completion: ${PROCESS_PAGE}\n\nNo rush on your end. Just want to make sure you have what you need.${sig()}`,
      sms: `Hi ${name}, just a quick follow-up on your deck estimate. Let me know if you have any questions or if there is anything I can clarify. - Angela`,
    },
    COLD: {
      subject: 'Did you get a chance to see your deck estimate?',
      email: `Hi ${name},\n\nI wanted to make sure your estimate came through okay. Sometimes these things end up in spam or get buried in a busy inbox.\n\nYour personalized estimate is waiting in your portal and includes full project specifications, package options, and transparent pricing for your ${projectType(job)}.\n\nHere is a direct link: ${link}\n\nIf anything has changed or the timing is not right, that is completely fine. Just let me know and I will update your file.${sig()}`,
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
      email: `Hi ${name},\n\nIf you are comparing estimates from different builders right now, here are a few things that set Luxury Decking apart:\n\n- Transparent pricing: you can see exactly what is included at every tier, no hidden costs or vague allowances\n- We bring a mobile showroom to your consultation so you can see and touch actual materials before committing\n- Every project is built to the same structural standard regardless of which package you choose\n- We include a complimentary LED deck lighting kit ($750 value) this season\n\nI am not going to try to pressure you into a decision. I just want to make sure you have the full picture. If you want to revisit your estimate: ${link}${sig()}`,
      sms: `Hi ${name}, just sent a follow-up email about your deck estimate with some info that might help if you are comparing options. Let me know if you have any questions. - Angela`,
    },
    COOL: {
      subject: 'Still thinking about your deck project?',
      email: `Hi ${name},\n\nJust a gentle check-in. If your deck project is still on your mind, your estimate is ready whenever you are: ${link}\n\nIf you would like to adjust the scope, explore different material options, or talk through a different budget range, we can absolutely do that. Our estimates are not one-size-fits-all.\n\nLet me know how you would like to proceed, or if anything has changed.${sig()}`,
      sms: `Hi ${name}, just checking in on your deck estimate. If you want to adjust anything or have questions, just reply here. - Angela`,
    },
    COLD: {
      subject: 'Your estimate is still available',
      email: `Hi ${name},\n\nYour deck estimate is still available in your portal if you would like to take a look: ${link}\n\nIf the timing has changed or you have decided to hold off, no problem at all. Just let me know and I will close out your file.\n\nIf you have any concerns about scope, budget, or process, I am happy to discuss. Sometimes a quick text back and forth can clear things up.${sig()}`,
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
      ? `Hi ${name},\n\nThis will be my last follow-up on your estimate. I do not want to be a bother, and I know you are busy.\n\nIf you are still considering the project, here is what I want you to know:\n\n- Your estimate pricing is current as of today\n- Our build calendar is filling and earlier bookings get more scheduling flexibility\n- We can adjust scope, materials, or budget to find something that works\n\nIf you have decided to go another direction or the timing is not right, completely understood. We are here whenever your project comes back up.\n\nView Your Estimate: ${link}${sig()}`
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
  type: 'LEAD_FOLLOW_UP' | 'ESTIMATE_FOLLOW_UP',
  job: Job,
  engagement?: PortalEngagement
): CampaignTouch[] {
  if (type === 'LEAD_FOLLOW_UP') {
    return getLeadTouches(job);
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

  return { pause: false };
}
