/**
 * Supabase Edge Function: process-drip-campaigns
 *
 * Runs on a schedule (via cron-job.org) every hour.
 * Queries all active drip campaigns in Supabase, fires any overdue touches
 * via Twilio (SMS) and SendGrid (email), then updates the job record.
 *
 * Required Supabase secrets (set via: supabase secrets set KEY=value):
 *   CRON_SECRET          - shared secret that cron-job.org sends as Bearer token
 *   TWILIO_ACCOUNT_SID   - Twilio account SID
 *   TWILIO_AUTH_TOKEN    - Twilio auth token
 *   TWILIO_PHONE_NUMBER  - Twilio sending number e.g. +16137073060
 *   SENDGRID_API_KEY     - SendGrid API key
 *   SENDGRID_FROM_EMAIL  - Sender address e.g. angela@luxurydecking.ca
 *   SENDGRID_FROM_NAME   - Sender name e.g. Angela - Luxury Decking
 *   SITE_URL             - Production app URL e.g. https://fieldpro.luxurydecking.ca
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── env ───────────────────────────────────────────────────────────────────────
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET        = Deno.env.get('CRON_SECRET') ?? '';
const TWILIO_SID         = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_TOKEN       = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM        = Deno.env.get('TWILIO_PHONE_NUMBER') ?? '';
const SENDGRID_KEY       = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM_EMAIL         = Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'angela@luxurydecking.ca';
const FROM_NAME          = Deno.env.get('SENDGRID_FROM_NAME') ?? 'Angela - Luxury Decking';
const SITE_URL           = Deno.env.get('SITE_URL') ?? 'https://fieldpro.luxurydecking.ca';

// ── constants ─────────────────────────────────────────────────────────────────
const PRICING_PAGE   = 'https://luxurydecking.ca/pricing';
const INSTAQUOTE     = 'https://luxurydecking.ca/instaquote';
const PROCESS_PAGE   = 'https://luxurydecking.ca/our-process';
const MATERIALS_PAGE = 'https://luxurydecking.ca/materials';
const PHONE          = '613-707-3060';
const EMAIL          = 'admin@luxurydecking.ca';
const WEBSITE        = 'luxurydecking.ca';

// ── types (minimal, matching the React app) ───────────────────────────────────
type EngagementTier = 'HOT' | 'WARM' | 'COOL' | 'COLD';

interface PortalEngagement {
  totalOpens?: number;
  totalTimeSpentSeconds?: number;
  lastOpenedAt?: string;
  optionClicks?: Record<string, number>;
  addOnInteractions?: Record<string, number>;
}

interface SentMessage {
  touchId: string;
  channel: 'sms' | 'email';
  sentAt: string;
  engagementTier: EngagementTier;
}

interface DripCampaign {
  campaignType: 'LEAD_FOLLOW_UP' | 'ESTIMATE_FOLLOW_UP';
  startedAt: string;
  currentTouch: number;
  completedTouches: string[];
  sentMessages: SentMessage[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
}

interface TouchTemplate {
  id: string;
  channel: 'sms' | 'email' | 'sms+email';
  delayDays: number;
  delayMinutes?: number;
  subject?: string;
  sms: string;
  email: string;
}

interface Job {
  id: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  project_type?: string;
  customer_portal_token?: string;
  portal_engagement?: PortalEngagement;
  drip_campaign?: DripCampaign;
}

// ── engagement scoring ────────────────────────────────────────────────────────
function getEngagementTier(engagement?: PortalEngagement): EngagementTier {
  if (!engagement) return 'COLD';
  const now = Date.now();
  const lastVisit = engagement.lastOpenedAt ? new Date(engagement.lastOpenedAt).getTime() : 0;
  const hours = lastVisit ? (now - lastVisit) / 3_600_000 : Infinity;
  const visits  = engagement.totalOpens ?? 0;
  const minutes = (engagement.totalTimeSpentSeconds ?? 0) / 60;
  const clicks  = Object.values(engagement.optionClicks ?? {}).reduce((s, c) => s + c, 0)
                + Object.values(engagement.addOnInteractions ?? {}).reduce((s, c) => s + c, 0);

  if (minutes >= 10 && visits >= 2 && hours <= 48)  return 'HOT';
  if (minutes >= 10 && visits >= 3 && clicks >= 3 && hours <= 48) return 'HOT';
  if (minutes >= 3  && visits >= 1 && hours <= 120) return 'WARM';
  if (visits >= 1)                                  return 'COOL';
  return 'COLD';
}

// ── template helpers ──────────────────────────────────────────────────────────
function sig() {
  return `\nAngela\nLuxury Decking\n${PHONE} | ${EMAIL} | ${WEBSITE}`;
}
function firstName(job: Job) { return job.client_name?.split(' ')[0] || 'there'; }
function portalLink(job: Job) { return `${SITE_URL}?portal=${job.customer_portal_token ?? ''}`; }
function projectType(job: Job) { return job.project_type || 'deck project'; }

// ── touch templates ───────────────────────────────────────────────────────────
function getLeadTouches(job: Job): TouchTemplate[] {
  const n = firstName(job);
  return [
    {
      id: 'lead-t1-sms', channel: 'sms', delayDays: 0, delayMinutes: 0,
      sms: `Hi ${n}, this is Angela from Luxury Decking. Thank you for reaching out about your deck project. We will be in touch shortly to learn more about what you have in mind. In the meantime, feel free to explore our transparent pricing packages here: ${PRICING_PAGE}. Talk soon!`,
      email: '',
    },
    {
      id: 'lead-t3-email', channel: 'email', delayDays: 0, delayMinutes: 15,
      subject: 'Your Deck Project Inquiry - Luxury Decking',
      sms: '',
      email: `Hi ${n},\n\nThank you for reaching out to Luxury Decking about your project.\n\nHere are a few things that might be helpful as you plan:\n\n- See our transparent pricing packages by size and tier: ${PRICING_PAGE}\n- Get an instant price range with our online estimator: ${INSTAQUOTE}\n- Learn about our process from consultation to completion: ${PROCESS_PAGE}\n\nWe are one of Ottawa's only deck builders that publishes pricing online because we believe you deserve clarity before you commit to anything.\n\nWhen is a good time to connect? You can reply here, call us at ${PHONE}, or text us back.\n\nLooking forward to helping with your project.${sig()}`,
    },
    {
      id: 'lead-t4-sms', channel: 'sms', delayDays: 1,
      sms: `Hi ${n}, it is Angela from Luxury Decking. Just following up on your deck project inquiry. No rush at all. When would be a convenient time to chat? You can also get an instant price range anytime here: ${INSTAQUOTE}`,
      email: '',
    },
    {
      id: 'lead-t5-email', channel: 'email', delayDays: 3,
      subject: 'A quick tip for planning your deck project',
      sms: '',
      email: `Hi ${n},\n\nJust a quick follow-up. I know choosing a deck builder is a big decision, so I wanted to share something that might help as you plan.\n\nOne of the most common questions we get is about material selection. We have put together a clear comparison to help you think through the options: ${MATERIALS_PAGE}\n\nIf you already have a sense of what you are looking for, our online estimator can give you a realistic price range in about 60 seconds, no commitment required: ${INSTAQUOTE}\n\nHappy to answer any questions whenever you are ready.${sig()}`,
    },
    {
      id: 'lead-t6-sms', channel: 'sms+email', delayDays: 7,
      subject: 'Should I close your file?',
      sms: `Hi ${n}, just one last check-in from Luxury Decking. If the timing is not right or you have gone another direction, completely understood. If your project is still on your radar, we are here whenever you are ready. Just reply or call ${PHONE}.`,
      email: `Hi ${n},\n\nI have reached out a few times and have not heard back, which usually means one of three things:\n\n1. Life got busy and this is not a priority right now\n2. You have decided to go a different direction\n3. You are still thinking about it but have not had a chance to reply\n\nAny of those is perfectly fine. If your deck project comes back up, we would love to help. You can always reach us at ${PHONE} or ${EMAIL}, or get a quick price range online anytime: ${INSTAQUOTE}\n\nWishing you all the best with your project.${sig()}`,
    },
    {
      id: 'lead-t7-email', channel: 'email', delayDays: 30,
      subject: 'Still thinking about your deck project?',
      sms: '',
      email: `Hi ${n},\n\nIt has been a few weeks since you first reached out. If your deck project is still on your mind, we wanted you to know our team is here whenever you are ready.\n\n- Our pricing page shows transparent package options: ${PRICING_PAGE}\n- Build availability fills up as the season progresses.\n\nNo pressure at all. Just reply to this email or give us a call at ${PHONE} if and when the time is right.${sig()}`,
    },
  ];
}

function getEstimateTouches(job: Job, tier: EngagementTier): TouchTemplate[] {
  const n    = firstName(job);
  const link = portalLink(job);
  const pt   = projectType(job);

  const day3: Record<EngagementTier, { subject: string; email: string; sms: string }> = {
    HOT: {
      subject: 'Quick question about your estimate',
      email: `Hi ${n},\n\nJust following up on your deck estimate. Most clients at this stage have questions about the package tiers.\n\nEvery tier uses the same structural standards. The difference is in surface materials, railing style, and finishing details.\n\nA couple of things worth knowing:\n- Our current build schedule has availability for a spring/summer start\n- We include a complimentary LED deck lighting kit ($750 value) with every project booked this season\n\nIf you have any questions, just reply here or text us at ${PHONE}.${sig()}`,
      sms: `Hi ${n}, just sent a quick email about your deck estimate. If you have any questions or want to adjust anything, just reply here. - Angela`,
    },
    WARM: {
      subject: 'A few things that might help with your decision',
      email: `Hi ${n},\n\nJust checking in on your deck estimate. Every tier uses the same structural standards — the difference is in surface materials, railing style, and finishing details.\n\nIf you have any questions, just reply or text us at ${PHONE}. No pressure, just clarity.\n\nView Your Estimate: ${link}${sig()}`,
      sms: `Hi ${n}, following up on your deck estimate. Any questions I can help with? - Angela`,
    },
    COOL: {
      subject: 'Your deck estimate - anything I can clarify?',
      email: `Hi ${n},\n\nI wanted to check in on the estimate we sent for your project. If anything was unclear or if you have questions about scope, materials, or timeline, I am here to help.\n\nYou can revisit your estimate anytime here: ${link}\n\nHere is a quick look at how our process works: ${PROCESS_PAGE}${sig()}`,
      sms: `Hi ${n}, just a quick follow-up on your deck estimate. Let me know if you have any questions. - Angela`,
    },
    COLD: {
      subject: 'Did you get a chance to see your deck estimate?',
      email: `Hi ${n},\n\nI wanted to make sure your estimate came through okay. Sometimes these things end up in spam.\n\nYour personalized estimate is waiting in your portal: ${link}\n\nIf anything has changed or the timing is not right, just let me know and I will update your file.${sig()}`,
      sms: `Hi ${n}, just checking in. I sent your deck estimate a few days ago and wanted to make sure you received it. Here is the link: ${link}. - Angela`,
    },
  };

  const day7: Record<EngagementTier, { subject: string; email: string; sms: string }> = {
    HOT: {
      subject: 'One thing I wanted to mention about your project',
      email: `Hi ${n},\n\nJust a quick follow-up on your deck estimate. A couple of things relevant to your timeline:\n\n- Build availability is filling for the upcoming window\n- Your estimate is locked at current pricing\n- Every project this season includes a complimentary LED deck lighting kit ($750 value)\n\nIf there is anything holding you back, I am happy to discuss. Reply here or text us at ${PHONE}.${sig()}`,
      sms: `Hi ${n}, following up on your deck estimate. Build spots are filling up. Any questions? - Angela`,
    },
    WARM: {
      subject: 'How we are different from other quotes',
      email: `Hi ${n},\n\nIf you are comparing estimates right now, here are a few things that set Luxury Decking apart:\n\n- Transparent pricing — you can see exactly what is included at every tier\n- Mobile showroom at your consultation so you can see actual materials\n- Same structural standard regardless of package\n- Complimentary LED lighting kit ($750 value) this season\n\nIf you want to revisit your estimate: ${link}${sig()}`,
      sms: `Hi ${n}, just sent a follow-up email with info that might help if you are comparing options. - Angela`,
    },
    COOL: {
      subject: 'Still thinking about your deck project?',
      email: `Hi ${n},\n\nJust a gentle check-in. If your deck project is still on your mind, your estimate is ready whenever you are: ${link}\n\nIf you would like to adjust scope, explore different materials, or talk through a different budget, we can do that.${sig()}`,
      sms: `Hi ${n}, just checking in on your deck estimate. If you want to adjust anything, just reply here. - Angela`,
    },
    COLD: {
      subject: 'Your estimate is still available',
      email: `Hi ${n},\n\nYour deck estimate is still available in your portal: ${link}\n\nIf the timing has changed, no problem. Just let me know and I will close your file. If you have any concerns about scope or budget, I am happy to discuss.${sig()}`,
      sms: `Hi ${n}, your deck estimate is still available here: ${link}. If the timing is not right, just let me know. - Angela`,
    },
  };

  const isHotWarm = tier === 'HOT' || tier === 'WARM';

  return [
    {
      id: 'est-fu1-day0', channel: 'sms+email', delayDays: 0, delayMinutes: 180,
      subject: 'Your Luxury Decking estimate is ready',
      sms: `Hi ${n}, your estimate for your ${pt} has been sent to your inbox. You can view it, compare options, and explore different packages right from the portal. Let me know if you have any questions. - Angela, Luxury Decking`,
      email: `Hi ${n},\n\nThank you for taking the time to meet with us about your deck project. Your personalized estimate is now ready to view in your portal.\n\nInside your estimate, you can:\n- Review the full project scope and specifications\n- Compare package tiers (Silver, Gold, Platinum, Diamond)\n- See exactly what is included at each level\n- Explore optional upgrades and add-ons\n\nView Your Estimate: ${link}${sig()}`,
    },
    {
      id: `est-fu2-day3-${tier.toLowerCase()}`, channel: 'sms+email', delayDays: 3,
      subject: day3[tier].subject,
      sms: day3[tier].sms,
      email: day3[tier].email,
    },
    {
      id: `est-fu3-day7-${tier.toLowerCase()}`, channel: 'sms+email', delayDays: 7,
      subject: day7[tier].subject,
      sms: day7[tier].sms,
      email: day7[tier].email,
    },
    {
      id: `est-fu4-day14-${isHotWarm ? 'hot-warm' : 'cool-cold'}`, channel: 'sms+email', delayDays: 14,
      subject: isHotWarm ? 'Last check-in on your deck project' : 'Should I close your estimate file?',
      sms: isHotWarm
        ? `Hi ${n}, last follow-up from me on your deck estimate. If you are still interested, I would love to help finalize things. - Angela`
        : `Hi ${n}, final check-in about your deck project. Your estimate is here if you need it: ${link}. - Angela`,
      email: isHotWarm
        ? `Hi ${n},\n\nThis will be my last follow-up on your estimate. I do not want to be a bother.\n\nIf you are still considering the project:\n- Your estimate pricing is current as of today\n- Build calendar is filling — earlier bookings get more scheduling flexibility\n- We can adjust scope, materials, or budget\n\nIf you have decided to go another direction, completely understood.\n\nView Your Estimate: ${link}${sig()}`
        : `Hi ${n},\n\nI have followed up a few times and have not heard back, so I am going to close your estimate file.\n\nIf your project comes back up in the future, please do not hesitate to reach out. We would be happy to put together a fresh estimate.\n\nWishing you all the best.${sig()}`,
    },
    {
      id: 'est-fu5-day30', channel: 'email', delayDays: 30,
      subject: 'Your deck project - still on your mind?',
      sms: '',
      email: `Hi ${n},\n\nIt has been about a month since we sent your estimate, and I wanted to reach out one more time.\n\nIf your project is still in the planning stages, we are here whenever you are ready. Pricing may be updated since your original estimate. If you decide to move forward, we can provide a refreshed quote quickly.\n\nJust reply to this email or give us a call at ${PHONE}.${sig()}`,
    },
  ];
}

// ── due-date logic ────────────────────────────────────────────────────────────
function touchDueAt(startedAt: string, touch: TouchTemplate): Date {
  const due = new Date(startedAt);
  due.setDate(due.getDate() + (touch.delayDays || 0));
  if (touch.delayMinutes) due.setMinutes(due.getMinutes() + touch.delayMinutes);
  return due;
}

function isDone(touchId: string, completed: string[]): boolean {
  if (completed.includes(touchId)) return true;
  const prefix = touchId.split('-').slice(0, 3).join('-');
  return completed.some(id => id.startsWith(prefix));
}

// ── send helpers ──────────────────────────────────────────────────────────────
function formatPhone(raw: string): string {
  let p = raw.replace(/[^0-9+]/g, '');
  if (!p.startsWith('+')) {
    if (p.length === 10) p = '+1' + p;
    else if (p.length === 11 && p.startsWith('1')) p = '+' + p;
    else p = '+' + p;
  }
  return p;
}

async function sendSms(to: string, message: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) throw new Error('Twilio not configured');
  const body = new URLSearchParams({ To: formatPhone(to), From: TWILIO_FROM, Body: message });
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio ${res.status}: ${err}`);
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!SENDGRID_KEY) throw new Error('SendGrid not configured');
  const html = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>');
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    reply_to: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html',  value: html },
    ],
  };
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 202) {
    const err = await res.text();
    throw new Error(`SendGrid ${res.status}: ${err}`);
  }
}

// ── main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Auth check — cron-job.org sends Authorization: Bearer <CRON_SECRET>
  if (CRON_SECRET) {
    const auth = req.headers.get('Authorization') ?? '';
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();

  // Fetch all active campaigns
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, client_name, client_phone, client_email, project_type, customer_portal_token, portal_engagement, drip_campaign')
    .eq("drip_campaign->>'status'", 'active');

  if (error) {
    console.error('Supabase query error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const fired: Array<{ jobId: string; touchId: string; channel: string }> = [];
  const failed: Array<{ jobId: string; touchId: string; error: string }> = [];

  for (const job of (jobs ?? []) as Job[]) {
    if (!job.drip_campaign) continue;
    const campaign = job.drip_campaign;
    const completed = [...(campaign.completedTouches ?? [])];
    const sent      = [...(campaign.sentMessages ?? [])];
    let firedAny    = false;

    const tier   = getEngagementTier(job.portal_engagement);
    const touches = campaign.campaignType === 'LEAD_FOLLOW_UP'
      ? getLeadTouches(job)
      : getEstimateTouches(job, tier);

    for (const touch of touches) {
      if (isDone(touch.id, completed)) continue;
      if (now < touchDueAt(campaign.startedAt, touch)) continue;

      // SMS quiet hours: if this touch includes SMS and we're outside
      // 9 AM – 8 PM Eastern, delay the entire touch until the next morning.
      // The hourly cron will pick it up at the next eligible run.
      const hasSms = touch.channel === 'sms' || touch.channel === 'sms+email';
      if (hasSms) {
        const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
        const hour = eastern.getHours();
        if (hour < 9 || hour >= 20) continue; // Outside 9 AM – 8 PM ET
      }

      // Touch is due and within send window — fire it
      try {
        if ((touch.channel === 'sms' || touch.channel === 'sms+email') && job.client_phone && touch.sms) {
          await sendSms(job.client_phone, touch.sms);
        }
        if ((touch.channel === 'email' || touch.channel === 'sms+email') && job.client_email && touch.email) {
          await sendEmail(job.client_email, touch.subject ?? 'Luxury Decking Follow-Up', touch.email);
        }

        completed.push(touch.id);
        sent.push({
          touchId: touch.id,
          channel: touch.channel === 'sms+email' ? 'sms' : touch.channel as 'sms' | 'email',
          sentAt: now.toISOString(),
          engagementTier: tier,
        });
        firedAny = true;
        fired.push({ jobId: job.id, touchId: touch.id, channel: touch.channel });
        console.info(`[DripCampaign] ✓ ${touch.id} → ${job.client_name} (${job.id})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[DripCampaign] ✗ ${touch.id} → ${job.id}: ${msg}`);
        failed.push({ jobId: job.id, touchId: touch.id, error: msg });
      }
    }

    if (firedAny) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          drip_campaign: { ...campaign, completedTouches: completed, sentMessages: sent },
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`[DripCampaign] Failed to update job ${job.id}:`, updateError);
      }
    }
  }

  const summary = {
    ran_at: now.toISOString(),
    jobs_checked: jobs?.length ?? 0,
    touches_fired: fired.length,
    failures: failed.length,
    fired,
    failed,
  };

  console.info('[DripCampaign] Run complete:', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  });
});
