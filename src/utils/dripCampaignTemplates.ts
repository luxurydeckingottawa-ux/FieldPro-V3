/**
 * CRM Drip Campaign Templates
 * 
 * Complete follow-up message templates for both Lead and Estimate stages.
 * Based on the Luxury Decking CRM Pipeline Follow-Up Master System.
 * 
 * All messages use Angela as the sender voice.
 * Canadian spelling throughout.
 * Never reference portal activity or engagement data in messages.
 */

import { EngagementTier } from './engagementScoring';

export interface CampaignMessage {
  id: string;
  channel: 'sms' | 'email' | 'sms+email';
  subject?: string; // email only
  smsBody: string;
  emailBody: string;
  delayDays: number; // days after trigger (0 = same day)
  delayMinutes?: number; // minutes after trigger (for same-day sends)
  sendWindow?: { startHour: number; endHour: number }; // ET, null = send immediately
  daysOfWeek?: number[]; // 0=Sun, 1=Mon... null = any day
  engagementTier?: EngagementTier; // null = same for all tiers
}

// ============================================================
// LEAD FOLLOW-UP TEMPLATES (Stage 1)
// ============================================================

export const LEAD_CAMPAIGN: CampaignMessage[] = [
  // Touch 1: Instant Auto-Text
  {
    id: 'lead-touch-1-sms',
    channel: 'sms',
    smsBody: `Hi {{firstName}}, this is Angela from Luxury Decking. Thank you for reaching out about your deck project. We will be in touch shortly to learn more about what you have in mind. In the meantime, feel free to explore our transparent pricing packages here: {{pricingLink}}. Talk soon!`,
    emailBody: '',
    delayDays: 0,
    delayMinutes: 0,
    // Fires immediately regardless of day/time (response to inquiry)
  },

  // Touch 3: First Email (15 minutes)
  {
    id: 'lead-touch-3-email',
    channel: 'email',
    subject: 'Your Deck Project Inquiry - Luxury Decking',
    smsBody: '',
    emailBody: `Hi {{firstName}},

Thank you for reaching out to Luxury Decking about your project.

Here are a few things that might be helpful as you plan:

- See our transparent pricing packages by size and tier: {{pricingLink}}
- Get an instant price range with our online estimator: {{instaQuoteLink}}
- Learn about our process from consultation to completion: {{processLink}}

We are one of Ottawa's only deck builders that publishes pricing online because we believe you deserve clarity before you commit to anything. No mystery quotes, no guesswork.

When is a good time to connect? You can reply here, call us at {{phone}}, or text us back.

Looking forward to helping with your project.

Angela
Luxury Decking
{{phone}} | {{email}} | {{website}}`,
    delayDays: 0,
    delayMinutes: 15,
  },

  // Touch 4: Day 1 Follow-Up Text
  {
    id: 'lead-touch-4-sms',
    channel: 'sms',
    smsBody: `Hi {{firstName}}, it is Angela from Luxury Decking. Just following up on your deck project inquiry. No rush at all. When would be a convenient time to chat? You can also get an instant price range anytime here: {{instaQuoteLink}}`,
    emailBody: '',
    delayDays: 1,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2, 3, 4], // Tue-Thu
  },

  // Touch 5: Day 3 Value-Add Email
  {
    id: 'lead-touch-5-email',
    channel: 'email',
    subject: 'A quick tip for planning your deck project',
    smsBody: '',
    emailBody: `Hi {{firstName}},

Just a quick follow-up. I know choosing a deck builder is a big decision, so I wanted to share something that might help as you plan.

One of the most common questions we get is about material selection. The right material choice depends on how you plan to use your deck, your maintenance preferences, and your budget. We have put together a clear comparison to help you think through the options: {{materialsLink}}

If you already have a sense of what you are looking for, our online estimator can give you a realistic price range in about 60 seconds, no commitment required: {{instaQuoteLink}}

Happy to answer any questions whenever you are ready.

Angela
Luxury Decking`,
    delayDays: 3,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2, 4], // Tue or Thu preferred
  },

  // Touch 6: Day 7 Soft Close (SMS + Email)
  {
    id: 'lead-touch-6-sms',
    channel: 'sms',
    smsBody: `Hi {{firstName}}, just one last check-in from Luxury Decking. If the timing is not right or you have gone another direction, completely understood. If your project is still on your radar, we are here whenever you are ready. Just reply or call {{phone}}.`,
    emailBody: '',
    delayDays: 7,
    sendWindow: { startHour: 10, endHour: 11 },
    daysOfWeek: [2, 3, 4],
  },
  {
    id: 'lead-touch-6-email',
    channel: 'email',
    subject: 'Should I close your file?',
    smsBody: '',
    emailBody: `Hi {{firstName}},

I have reached out a few times and have not heard back, which usually means one of three things:

1. Life got busy and this is not a priority right now
2. You have decided to go a different direction
3. You are still thinking about it but have not had a chance to reply

Any of those is perfectly fine. If your deck project comes back up, we would love to help. You can always reach us at {{phone}} or {{email}}, or get a quick price range online anytime: {{instaQuoteLink}}

Wishing you all the best with your project.

Angela
Luxury Decking`,
    delayDays: 7,
    delayMinutes: 30, // 30 min after the SMS
    sendWindow: { startHour: 10, endHour: 11 },
    daysOfWeek: [2, 3, 4],
  },

  // Touch 7: Day 30 Long-Term Nurture
  {
    id: 'lead-touch-7-email',
    channel: 'email',
    subject: 'Still thinking about your deck project?',
    smsBody: '',
    emailBody: `Hi {{firstName}},

It has been a few weeks since you first reached out. If your deck project is still on your mind, we wanted you to know our team is here whenever you are ready.

A few things that might be helpful:

- Our pricing page shows transparent package options by size and tier: {{pricingLink}}
- Build availability fills up as the season progresses. Reaching out earlier generally means more flexibility on timing.

No pressure at all. Just reply to this email or give us a call at {{phone}} if and when the time is right.

Angela
Luxury Decking`,
    delayDays: 30,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2], // Tuesday
  },
];

// ============================================================
// ESTIMATE FOLLOW-UP TEMPLATES (Stage 2)
// Engagement-adaptive: different messages per tier
// ============================================================

// Follow-Up 1: Day 0 confirmation (same for all tiers)
export const ESTIMATE_FU1_DAY0: CampaignMessage = {
  id: 'est-fu1-day0',
  channel: 'sms+email',
  subject: 'Your Luxury Decking estimate is ready',
  smsBody: `Hi {{firstName}}, your estimate for your {{projectType}} has been sent to your inbox. You can view it, compare options, and explore different packages right from the portal. Let me know if you have any questions. - Angela, Luxury Decking`,
  emailBody: `Hi {{firstName}},

Thank you for taking the time to meet with us about your deck project. Your personalized estimate is now ready to view in your portal.

Inside your estimate, you can:
- Review the full project scope and specifications
- Compare package tiers (Silver, Gold, Platinum, Diamond)
- See exactly what is included at each level
- Explore optional upgrades and add-ons

Take your time reviewing everything. If you have any questions about materials, timelines, or the process, we are happy to walk through it with you.

View Your Estimate: {{portalLink}}

Angela
Luxury Decking
{{phone}} | {{email}}`,
  delayDays: 0,
  delayMinutes: 180, // 3 hours after sent
};

// Follow-Up 2: Day 3 (engagement-adaptive)
export const ESTIMATE_FU2_DAY3: Record<EngagementTier, CampaignMessage> = {
  HOT: {
    id: 'est-fu2-day3-hot',
    channel: 'sms+email',
    subject: 'Quick question about your estimate',
    smsBody: `Hi {{firstName}}, just sent a quick email about your deck estimate. If you have any questions about the options or want to adjust anything, just reply here. - Angela`,
    emailBody: `Hi {{firstName}},

Just following up on your deck estimate. Most of our clients at this stage have questions about what separates the different package tiers, so I wanted to make sure you have everything you need.

The short version: every tier uses the same structural standards and build process. The difference is in the surface materials, railing style, and finishing details. So you are never compromising on quality, just choosing the level of finish that fits your vision and budget.

A couple of things worth knowing:

- Our current build schedule has availability for a {{timeline}} start
- We include a complimentary LED deck lighting kit ($750 value) with every project booked this season

If you have any questions or would like to adjust anything in the scope, just reply here or text us at {{phone}}. Happy to help.

Angela
Luxury Decking`,
    delayDays: 3,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2, 3, 4],
  },
  WARM: {
    id: 'est-fu2-day3-warm',
    channel: 'sms+email',
    subject: 'A few things that might help with your decision',
    smsBody: `Hi {{firstName}}, following up on your deck estimate. Any questions I can help with? No rush, just want to make sure you have everything you need. - Angela`,
    emailBody: `Hi {{firstName}},

Just checking in on your deck estimate. I know there is a lot to consider, so I wanted to share a couple of things that might help as you think it through.

One question we hear often is about the difference between our package tiers. Here is the short version: every tier uses the same structural standards and build process. The difference is in the surface materials, railing style, and finishing details. So you are never compromising on quality, just choosing the level of finish that fits your vision and budget.

If you have any questions, just reply to this email or text us at {{phone}}. No pressure, just clarity.

View Your Estimate: {{portalLink}}

Angela
Luxury Decking`,
    delayDays: 3,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2, 3, 4],
  },
  COOL: {
    id: 'est-fu2-day3-cool',
    channel: 'sms+email',
    subject: 'Your deck estimate - anything I can clarify?',
    smsBody: `Hi {{firstName}}, just a quick follow-up on your deck estimate. Let me know if you have any questions or if there is anything I can clarify. - Angela`,
    emailBody: `Hi {{firstName}},

I wanted to check in on the estimate we sent for your project. I know these decisions take time, and there is a lot of information to take in.

If anything in the estimate was unclear or if you have questions about scope, materials, or timeline, I am here to help. Sometimes a quick conversation can simplify things.

You can revisit your estimate anytime here: {{portalLink}}

And if it helps, here is a quick look at how our process works from consultation to completion: {{processLink}}

No rush on your end. Just want to make sure you have what you need.

Angela
Luxury Decking`,
    delayDays: 3,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2, 3, 4],
  },
  COLD: {
    id: 'est-fu2-day3-cold',
    channel: 'sms+email',
    subject: 'Did you get a chance to see your deck estimate?',
    smsBody: `Hi {{firstName}}, just checking in. I sent your deck estimate a few days ago and wanted to make sure you received it. Here is the link: {{portalLink}}. Let me know if you have any questions. - Angela`,
    emailBody: `Hi {{firstName}},

I wanted to make sure your estimate came through okay. Sometimes these things end up in spam or get buried in a busy inbox.

Your personalized estimate is waiting in your portal and includes full project specifications, package options, and transparent pricing for your {{projectType}}.

Here is a direct link: {{portalLink}}

If anything has changed or the timing is not right, that is completely fine. Just let me know and I will update your file.

Angela
Luxury Decking`,
    delayDays: 3,
    sendWindow: { startHour: 9, endHour: 10 },
    daysOfWeek: [2, 3, 4],
  },
};

// Follow-Up 3: Day 7 (engagement-adaptive)
export const ESTIMATE_FU3_DAY7: Record<EngagementTier, CampaignMessage> = {
  HOT: {
    id: 'est-fu3-day7-hot',
    channel: 'sms+email',
    subject: 'One thing I wanted to mention about your project',
    smsBody: `Hi {{firstName}}, following up on your deck estimate. Build spots are filling for {{month}}. If you have any questions or want to adjust the scope, just reply here. - Angela`,
    emailBody: `Hi {{firstName}},

Just a quick follow-up on your deck estimate. I wanted to mention a couple of things that are relevant to your timeline:

- Build availability is filling for the {{month}} window. Booking sooner gives you more flexibility on your preferred start date.
- Your estimate is locked at current pricing. Material costs can shift, so the pricing in your portal reflects today's rates.
- Every project this season includes a complimentary LED deck lighting kit ($750 value).

If there is anything holding you back or something I can adjust in the scope, I am happy to discuss. You can reply here or text us at {{phone}}.

Angela
Luxury Decking`,
    delayDays: 7,
    sendWindow: { startHour: 10, endHour: 11 },
    daysOfWeek: [2, 3, 4],
  },
  WARM: {
    id: 'est-fu3-day7-warm',
    channel: 'sms+email',
    subject: 'How we are different from other quotes you might be comparing',
    smsBody: `Hi {{firstName}}, just sent a follow-up email about your deck estimate with some info that might help if you are comparing options. Let me know if you have any questions. - Angela`,
    emailBody: `Hi {{firstName}},

If you are comparing estimates from different builders right now, here are a few things that set Luxury Decking apart:

- Transparent pricing: you can see exactly what is included at every tier, no hidden costs or vague allowances
- We bring a mobile showroom to your consultation so you can see and touch actual materials before committing
- Every project is built to the same structural standard regardless of which package you choose
- We include a complimentary LED deck lighting kit ($750 value) this season

I am not going to try to pressure you into a decision. I just want to make sure you have the full picture. If you want to revisit your estimate: {{portalLink}}

Angela
Luxury Decking`,
    delayDays: 7,
    sendWindow: { startHour: 10, endHour: 11 },
    daysOfWeek: [2, 3, 4],
  },
  COOL: {
    id: 'est-fu3-day7-cool',
    channel: 'sms+email',
    subject: 'Still thinking about your deck project?',
    smsBody: `Hi {{firstName}}, just checking in on your deck estimate. If you want to adjust anything or have questions, just reply here. - Angela`,
    emailBody: `Hi {{firstName}},

Just a gentle check-in. If your deck project is still on your mind, your estimate is ready whenever you are: {{portalLink}}

If you would like to adjust the scope, explore different material options, or talk through a different budget range, we can absolutely do that. Our estimates are not one-size-fits-all.

Let me know how you would like to proceed, or if anything has changed.

Angela
Luxury Decking`,
    delayDays: 7,
    sendWindow: { startHour: 10, endHour: 11 },
    daysOfWeek: [2, 3, 4],
  },
  COLD: {
    id: 'est-fu3-day7-cold',
    channel: 'sms+email',
    subject: 'Your estimate is still available',
    smsBody: `Hi {{firstName}}, your deck estimate is still available here: {{portalLink}}. If the timing is not right, just let me know and I will update your file. - Angela`,
    emailBody: `Hi {{firstName}},

Your deck estimate is still available in your portal if you would like to take a look: {{portalLink}}

If the timing has changed or you have decided to hold off, no problem at all. Just let me know and I will close out your file.

If you have any concerns about scope, budget, or process, I am happy to discuss. Sometimes a quick text back and forth can clear things up.

Angela
Luxury Decking`,
    delayDays: 7,
    sendWindow: { startHour: 10, endHour: 11 },
    daysOfWeek: [2, 3, 4],
  },
};

// Follow-Up 4: Day 14 (hot/warm vs cool/cold)
export const ESTIMATE_FU4_DAY14_HOT_WARM: CampaignMessage = {
  id: 'est-fu4-day14-hot-warm',
  channel: 'sms+email',
  subject: 'Last check-in on your deck project',
  smsBody: `Hi {{firstName}}, last follow-up from me on your deck estimate. If you are still interested, I would love to help finalize things. If you have gone another direction, no hard feelings. Just let me know. - Angela`,
  emailBody: `Hi {{firstName}},

This will be my last follow-up on your estimate. I do not want to be a bother, and I know you are busy.

If you are still considering the project, here is what I want you to know:

- Your estimate pricing is current as of today
- Our build calendar is filling and earlier bookings get more scheduling flexibility
- We can adjust scope, materials, or budget to find something that works

If you have decided to go another direction or the timing is not right, completely understood. We are here whenever your project comes back up.

View Your Estimate: {{portalLink}}

Angela
Luxury Decking`,
  delayDays: 14,
  sendWindow: { startHour: 10, endHour: 11 },
  daysOfWeek: [2, 3, 4],
};

export const ESTIMATE_FU4_DAY14_COOL_COLD: CampaignMessage = {
  id: 'est-fu4-day14-cool-cold',
  channel: 'sms+email',
  subject: 'Should I close your estimate file?',
  smsBody: `Hi {{firstName}}, just a final check-in about your deck project. If you have moved on, completely understood. If you are still thinking about it, your estimate is here: {{portalLink}}. - Angela`,
  emailBody: `Hi {{firstName}},

I have followed up a few times and have not heard back, so I am going to go ahead and close your estimate file.

If your project comes back up in the future, please do not hesitate to reach out. We would be happy to put together a fresh estimate at that point.

Wishing you all the best.

Angela
Luxury Decking`,
  delayDays: 14,
  sendWindow: { startHour: 10, endHour: 11 },
  daysOfWeek: [2, 3, 4],
};

// Follow-Up 5: Day 30 (same for all tiers)
export const ESTIMATE_FU5_DAY30: CampaignMessage = {
  id: 'est-fu5-day30',
  channel: 'email',
  subject: 'Your deck project - still on your mind?',
  smsBody: '',
  emailBody: `Hi {{firstName}},

It has been about a month since we sent your estimate, and I wanted to reach out one more time.

If your project is still in the planning stages, we are here whenever you are ready. A few things worth knowing:

- Pricing may be updated since your original estimate. If you decide to move forward, we can provide a refreshed quote quickly.
- Build availability shifts throughout the season. Reaching out earlier generally means better scheduling flexibility.

If you would like to reconnect, just reply to this email or give us a call at {{phone}}.

Angela
Luxury Decking`,
  delayDays: 30,
  sendWindow: { startHour: 9, endHour: 10 },
  daysOfWeek: [2],
};

// ============================================================
// TEMPLATE VARIABLE REPLACEMENT
// ============================================================

export interface TemplateVars {
  firstName: string;
  projectType: string;
  phone: string;
  email: string;
  website: string;
  portalLink: string;
  pricingLink: string;
  instaQuoteLink: string;
  processLink: string;
  materialsLink: string;
  timeline: string;
  month: string;
}

const DEFAULT_VARS: Partial<TemplateVars> = {
  phone: '613-707-3060',
  email: 'admin@luxurydecking.ca',
  website: 'luxurydecking.ca',
  pricingLink: 'https://luxurydecking.ca/pages/pricing',
  instaQuoteLink: 'https://luxurydecking.ca/pages/instaquote',
  processLink: 'https://luxurydecking.ca/pages/our-process',
  materialsLink: 'https://luxurydecking.ca/pages/materials',
};

/**
 * Replace template variables in a message string.
 */
export function fillTemplate(template: string, vars: Partial<TemplateVars>): string {
  const merged = { ...DEFAULT_VARS, ...vars };
  let result = template;
  
  Object.entries(merged).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  });
  
  return result;
}

/**
 * Get the appropriate estimate follow-up message for a given
 * follow-up number and engagement tier.
 */
export function getEstimateFollowUp(
  followUpNumber: number, // 1-5
  tier: EngagementTier
): CampaignMessage {
  switch (followUpNumber) {
    case 1:
      return ESTIMATE_FU1_DAY0;
    case 2:
      return ESTIMATE_FU2_DAY3[tier];
    case 3:
      return ESTIMATE_FU3_DAY7[tier];
    case 4:
      return (tier === 'HOT' || tier === 'WARM') 
        ? ESTIMATE_FU4_DAY14_HOT_WARM 
        : ESTIMATE_FU4_DAY14_COOL_COLD;
    case 5:
      return ESTIMATE_FU5_DAY30;
    default:
      return ESTIMATE_FU5_DAY30;
  }
}
