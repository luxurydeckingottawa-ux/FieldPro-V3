/**
 * Drip Campaign Auto-Processor
 *
 * Runs on app load and every 30 minutes.
 * Checks all active campaigns and fires any overdue touches automatically.
 * No manual intervention required.
 */

import { Job } from '../types';
import { getCampaignTouches, CampaignTouch } from './dripCampaign';
import { calculateEngagementTier } from './engagementScoring';

const NETLIFY_SMS   = '/.netlify/functions/send-sms';
const NETLIFY_EMAIL = '/.netlify/functions/send-email';

// ── helpers ──────────────────────────────────────────────────────────────────

function touchDueAt(startedAt: string, touch: CampaignTouch): Date {
  const due = new Date(startedAt);
  due.setDate(due.getDate() + (touch.delayDays || 0));
  if (touch.delayMinutes) due.setMinutes(due.getMinutes() + touch.delayMinutes);
  return due;
}

function isDone(touch: CampaignTouch, completedTouches: string[]): boolean {
  if (completedTouches.includes(touch.id)) return true;
  // Prefix match: handles tier changes between sends (e.g. est-fu2-day3-cold → est-fu2-day3-warm)
  const prefix = touch.id.split('-').slice(0, 3).join('-');
  return completedTouches.some(id => id.startsWith(prefix));
}

async function fireTouch(job: Job, touch: CampaignTouch): Promise<void> {
  const sends: Promise<Response>[] = [];

  if ((touch.channel === 'sms' || touch.channel === 'sms+email') && job.clientPhone && touch.smsTemplate) {
    sends.push(
      fetch(NETLIFY_SMS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: job.clientPhone, message: touch.smsTemplate }),
      })
    );
  }

  if ((touch.channel === 'email' || touch.channel === 'sms+email') && job.clientEmail && touch.emailTemplate) {
    const htmlBody = touch.emailTemplate
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    sends.push(
      fetch(NETLIFY_EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: job.clientEmail,
          subject: touch.subject || 'Luxury Decking Follow-Up',
          htmlBody,
        }),
      })
    );
  }

  if (sends.length > 0) await Promise.all(sends);
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Process all active drip campaigns.
 * Returns an array of { jobId, updates } for any jobs that had touches fired.
 * The caller (App.tsx) applies these updates via onUpdateJob.
 */
export async function processAllCampaigns(
  jobs: Job[]
): Promise<Array<{ jobId: string; updates: Partial<Job> }>> {
  const now = new Date();
  const results: Array<{ jobId: string; updates: Partial<Job> }> = [];

  for (const job of jobs) {
    if (!job.dripCampaign || job.dripCampaign.status !== 'active') continue;

    const campaign = job.dripCampaign;
    const completed = [...(campaign.completedTouches || [])];
    const sent = [...(campaign.sentMessages || [])];
    let fired = false;

    const touches = getCampaignTouches(campaign.campaignType, job, job.portalEngagement);

    for (const touch of touches) {
      if (isDone(touch, completed)) continue;
      if (now < touchDueAt(campaign.startedAt, touch)) continue;

      // Touch is due and not yet sent — fire it
      try {
        await fireTouch(job, touch);
        const tier = calculateEngagementTier(job.portalEngagement).tier;
        completed.push(touch.id);
        sent.push({
          touchId: touch.id,
          channel: (touch.channel === 'sms+email' ? 'sms' : touch.channel) as 'sms' | 'email',
          sentAt: now.toISOString(),
          engagementTier: tier,
        });
        fired = true;
        console.info(`[DripCampaign] Sent ${touch.id} for job ${job.id} (${job.clientName})`);
      } catch (err) {
        console.error(`[DripCampaign] Failed to send ${touch.id} for job ${job.id}:`, err);
      }
    }

    if (fired) {
      results.push({
        jobId: job.id,
        updates: {
          dripCampaign: {
            ...campaign,
            completedTouches: completed,
            sentMessages: sent,
          },
        },
      });
    }
  }

  return results;
}

// ── status helpers (for PipelineCard display) ─────────────────────────────────

export interface CampaignStatusSummary {
  label: string;          // e.g. "Touch 3 sent"
  nextLabel: string | null; // e.g. "Day 7 email in 2d" or null if all done
  overdue: boolean;       // true if a touch is past-due and not sent
}

export function getCampaignStatusSummary(job: Job): CampaignStatusSummary | null {
  if (!job.dripCampaign || job.dripCampaign.status !== 'active') return null;

  const campaign = job.dripCampaign;
  const touches  = getCampaignTouches(campaign.campaignType, job, job.portalEngagement);
  const completed = campaign.completedTouches || [];
  const now = new Date();

  const doneCount = touches.filter(t => isDone(t, completed)).length;
  const label = doneCount === 0 ? 'Campaign started' : `${doneCount} of ${touches.length} sent`;

  // Find next pending touch
  const next = touches.find(t => !isDone(t, completed));
  if (!next) return { label: 'All touches sent', nextLabel: null, overdue: false };

  const due = touchDueAt(campaign.startedAt, next);
  const diffMs  = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const overdue  = diffMs < 0;

  let timeStr: string;
  if (overdue) {
    timeStr = 'overdue';
  } else if (diffDays === 0) {
    const diffMins = Math.ceil(diffMs / (1000 * 60));
    timeStr = diffMins <= 60 ? `in ${diffMins}m` : 'today';
  } else if (diffDays === 1) {
    timeStr = 'tomorrow';
  } else {
    timeStr = `in ${diffDays}d`;
  }

  const channelShort = next.channel === 'sms+email' ? 'SMS+Email'
    : next.channel === 'sms' ? 'SMS' : 'Email';
  const nextLabel = `${channelShort} ${timeStr}`;

  return { label, nextLabel, overdue };
}
