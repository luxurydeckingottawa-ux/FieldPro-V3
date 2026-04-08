/**
 * Campaign Scheduler Engine
 * 
 * Evaluates all jobs and determines which follow-up messages
 * are due to be sent. Runs on a timer (e.g., every 15 minutes)
 * and queues messages for delivery.
 * 
 * Exclusion rules:
 * - If client replied to any message, remove from auto sequence
 * - If client accepted estimate, remove immediately
 * - If client explicitly declined, move to Lost and stop
 * - Do not send to clients in active projects
 * - Respect send windows (Tue-Thu, 9-10am ET)
 * - Never send on weekends or after 7pm
 */

import { Job, PipelineStage } from '../types';
import { calculateEngagementTier, EngagementTier } from './engagementScoring';
import { 
  LEAD_CAMPAIGN, 
  getEstimateFollowUp, 
  fillTemplate, 
  CampaignMessage,
  TemplateVars
} from './dripCampaignTemplates';

export interface PendingMessage {
  jobId: string;
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  messageId: string;
  channel: 'sms' | 'email' | 'sms+email';
  subject?: string;
  smsBody: string;
  emailBody: string;
  engagementTier: EngagementTier;
  followUpNumber: number;
  scheduledFor: string; // ISO date
  stage: 'lead' | 'estimate';
}

export interface CampaignState {
  /** Follow-up step index for lead campaign (0-6) */
  leadStep?: number;
  /** Follow-up step index for estimate campaign (1-5) */
  estimateStep?: number;
  /** When the campaign started (lead entered or estimate sent) */
  campaignStartDate?: string;
  /** When each touch was sent */
  touchesSent?: Record<string, string>; // messageId -> ISO date
  /** Whether the client has replied (stops auto sequence) */
  clientReplied?: boolean;
  /** Whether the campaign is paused */
  paused?: boolean;
}

// Lead pipeline stages
const LEAD_STAGES = [
  PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.SECOND_CONTACT,
  PipelineStage.THIRD_CONTACT, PipelineStage.LEAD_ON_HOLD
];

// Estimate stages where follow-up runs
const ESTIMATE_FOLLOW_UP_STAGES = [
  PipelineStage.EST_SENT, PipelineStage.EST_ON_HOLD
];

// Stages that stop all follow-ups
const STOP_STAGES = [
  PipelineStage.LEAD_LOST, PipelineStage.EST_REJECTED, PipelineStage.EST_APPROVED,
  PipelineStage.JOB_SOLD, PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION,
  PipelineStage.READY_TO_START, PipelineStage.IN_FIELD, PipelineStage.COMPLETION,
  PipelineStage.PAID_CLOSED
];

/**
 * Check if the current time is within the allowed send window.
 * Respects business hours (9am-7pm ET), Tue-Thu preferred.
 */
function isInSendWindow(message: CampaignMessage): boolean {
  const now = new Date();
  const hour = now.getHours(); // Local time (server should be ET)
  const day = now.getDay(); // 0=Sun, 6=Sat

  // Never send on weekends
  if (day === 0 || day === 6) return false;

  // Never send after 7pm or before 8am
  if (hour < 8 || hour >= 19) return false;

  // If message has a specific send window, check it
  if (message.sendWindow) {
    if (hour < message.sendWindow.startHour || hour >= message.sendWindow.endHour) return false;
  }

  // If message has preferred days, check them
  if (message.daysOfWeek && message.daysOfWeek.length > 0) {
    if (!message.daysOfWeek.includes(day)) return false;
  }

  return true;
}

/**
 * Check if enough time has passed since the campaign started
 * for this follow-up to be due.
 */
function isDue(startDate: string, delayDays: number, delayMinutes?: number): boolean {
  const start = new Date(startDate);
  const now = Date.now();
  const totalDelayMs = (delayDays * 24 * 60 * 60 * 1000) + ((delayMinutes || 0) * 60 * 1000);
  return now >= start.getTime() + totalDelayMs;
}

/**
 * Build template variables from a job record.
 */
function buildTemplateVars(job: Job): Partial<TemplateVars> {
  const currentMonth = new Date().toLocaleDateString('en-CA', { month: 'long' });
  const portalUrl = job.customerPortalToken 
    ? `${window.location.origin}?portal=${job.customerPortalToken}` 
    : '';

  return {
    firstName: (job.clientName || 'there').split(' ')[0],
    projectType: job.projectType || 'deck project',
    portalLink: portalUrl,
    timeline: currentMonth,
    month: currentMonth,
  };
}

/**
 * Evaluate a single job and return any pending messages that should be sent.
 */
export function evaluateJob(job: Job): PendingMessage[] {
  const pending: PendingMessage[] = [];
  const campaign = job.campaignState || {} as CampaignState;

  // Skip if client replied or campaign is paused
  if (campaign.clientReplied || campaign.paused) return [];

  // Skip if job is in a stop stage
  if (STOP_STAGES.includes(job.pipelineStage)) return [];

  // Skip if no client email and no phone
  if (!job.clientEmail && !job.clientPhone) return [];

  const touchesSent = campaign.touchesSent || {};
  const vars = buildTemplateVars(job);

  // ---- LEAD CAMPAIGN ----
  if (LEAD_STAGES.includes(job.pipelineStage)) {
    const startDate = campaign.campaignStartDate || job.updatedAt || new Date().toISOString();

    for (const message of LEAD_CAMPAIGN) {
      // Skip if already sent
      if (touchesSent[message.id]) continue;

      // Check if due
      if (!isDue(startDate, message.delayDays, message.delayMinutes)) continue;

      // For immediate messages (touch 1, 3), skip send window check
      const isImmediate = message.delayDays === 0 && (message.delayMinutes || 0) <= 15;
      if (!isImmediate && !isInSendWindow(message)) continue;

      pending.push({
        jobId: job.id,
        jobNumber: job.jobNumber || '',
        clientName: job.clientName || '',
        clientEmail: job.clientEmail || '',
        clientPhone: job.clientPhone || '',
        messageId: message.id,
        channel: message.channel,
        subject: message.subject ? fillTemplate(message.subject, vars) : undefined,
        smsBody: fillTemplate(message.smsBody, vars),
        emailBody: fillTemplate(message.emailBody, vars),
        engagementTier: 'COLD', // leads don't have engagement yet
        followUpNumber: LEAD_CAMPAIGN.indexOf(message) + 1,
        scheduledFor: new Date().toISOString(),
        stage: 'lead',
      });

      // Only queue one message at a time per job
      break;
    }
    return pending;
  }

  // ---- ESTIMATE CAMPAIGN ----
  if (ESTIMATE_FOLLOW_UP_STAGES.includes(job.pipelineStage)) {
    const startDate = job.estimateSentDate || campaign.campaignStartDate || job.updatedAt || new Date().toISOString();
    
    // Re-evaluate engagement tier at each check
    const engagementScore = calculateEngagementTier(job.portalEngagement);

    for (let step = 1; step <= 5; step++) {
      const message = getEstimateFollowUp(step, engagementScore.tier);
      
      // Skip if already sent
      if (touchesSent[message.id]) continue;

      // Check if due
      if (!isDue(startDate, message.delayDays, message.delayMinutes)) continue;

      // For day 0 confirmation, skip send window check
      const isImmediate = step === 1;
      if (!isImmediate && !isInSendWindow(message)) continue;

      pending.push({
        jobId: job.id,
        jobNumber: job.jobNumber || '',
        clientName: job.clientName || '',
        clientEmail: job.clientEmail || '',
        clientPhone: job.clientPhone || '',
        messageId: message.id,
        channel: message.channel,
        subject: message.subject ? fillTemplate(message.subject, vars) : undefined,
        smsBody: fillTemplate(message.smsBody, vars),
        emailBody: fillTemplate(message.emailBody, vars),
        engagementTier: engagementScore.tier,
        followUpNumber: step,
        scheduledFor: new Date().toISOString(),
        stage: 'estimate',
      });

      // Only queue one message at a time per job
      break;
    }
    return pending;
  }

  return [];
}

/**
 * Evaluate all jobs and return the full list of pending messages.
 */
export function evaluateAllJobs(jobs: Job[]): PendingMessage[] {
  return jobs.flatMap(evaluateJob);
}

/**
 * Mark a message as sent on the job's campaign state.
 */
export function markMessageSent(campaignState: CampaignState, messageId: string): CampaignState {
  return {
    ...campaignState,
    touchesSent: {
      ...(campaignState.touchesSent || {}),
      [messageId]: new Date().toISOString(),
    },
  };
}
