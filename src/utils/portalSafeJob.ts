/**
 * Portal-safe job filter.
 *
 * Strips internal/financial/operational fields from the Job object
 * before passing it to CustomerPortalView. Prevents PII and business
 * data from being visible in React DevTools on the client portal.
 */

import { Job } from '../types';

/** Fields that are safe for the customer portal to see */
const PORTAL_SAFE_FIELDS = new Set([
  // Identity
  'id', 'jobNumber', 'clientName', 'clientPhone', 'clientEmail', 'projectAddress',
  // Project
  'projectType', 'description', 'scopeSummary',
  // Status (what the customer should see)
  'pipelineStage', 'status',
  // Estimate data (what they're deciding on)
  'estimateAmount', 'totalAmount', 'estimateData',
  'acceptedOptionId', 'acceptedOptionName', 'acceptedDate',
  'acceptedBuildSummary', 'selectedAddOnIds',
  // Portal
  'customerPortalToken', 'portalStatus',
  // Schedule (customer-facing)
  'scheduledDate', 'plannedStartDate', 'plannedFinishDate', 'plannedDurationDays',
  // Warranty / completion
  'verifiedBuildPassportUrl', 'postProjectStatus',
  // Portal engagement (customer's own data)
  'portalEngagement',
  // Deposit status (they need to see payment status)
  'depositStatus', 'depositAmount',
]);

/**
 * Return a copy of the Job with only customer-safe fields.
 * Internal fields like labourCost, materialCost, officeNotes,
 * assignedUsers, aiInsights, dripCampaign, etc. are stripped.
 */
export function toPortalSafeJob(job: Job): Partial<Job> {
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(job)) {
    if (PORTAL_SAFE_FIELDS.has(key)) {
      safe[key] = (job as Record<string, unknown>)[key];
    }
  }
  return safe as Partial<Job>;
}
