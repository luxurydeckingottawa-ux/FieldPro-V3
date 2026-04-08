/**
 * Engagement Scoring Engine
 * 
 * Scores portal engagement into HOT / WARM / COOL / COLD tiers.
 * Used to select which follow-up message template to send.
 * 
 * Based on the Luxury Decking CRM Pipeline Follow-Up Master System.
 */

import { PortalEngagement } from '../types';

export type EngagementTier = 'HOT' | 'WARM' | 'COOL' | 'COLD';

export interface EngagementScore {
  tier: EngagementTier;
  score: number; // 1-4
  label: string;
  colour: string;
  bgColour: string;
}

/**
 * Calculate the engagement tier from portal analytics.
 * 
 * HOT (4):  10+ min, 3+ visits, active comparison, last visit < 48h
 * WARM (3): 3-10 min, 1-2 visits, some clicking, last visit < 5 days
 * COOL (2): Opened once, < 3 min, minimal interaction, last visit > 5 days
 * COLD (1): Never opened, zero activity
 */
export function calculateEngagementTier(engagement?: PortalEngagement): EngagementScore {
  if (!engagement) {
    return { tier: 'COLD', score: 1, label: 'Cold', colour: '#6B7280', bgColour: 'rgba(107,114,128,0.1)' };
  }

  const now = Date.now();
  const lastVisit = engagement.lastOpenedAt ? new Date(engagement.lastOpenedAt).getTime() : 0;
  const hoursSinceLastVisit = lastVisit ? (now - lastVisit) / (1000 * 60 * 60) : Infinity;
  
  const totalVisits = engagement.totalOpens || 0;
  const totalMinutes = (engagement.totalTimeSpentSeconds || 0) / 60;
  const totalOptionClicks = Object.values(engagement.optionClicks || {}).reduce((sum, c) => sum + c, 0);
  const totalAddOnClicks = Object.values(engagement.addOnInteractions || {}).reduce((sum, c) => sum + c, 0);
  const totalInteractions = totalOptionClicks + totalAddOnClicks;

  // HOT: 10+ min, 3+ visits, active interaction, last visit within 48 hours
  if (totalMinutes >= 10 && totalVisits >= 3 && totalInteractions >= 3 && hoursSinceLastVisit <= 48) {
    return { tier: 'HOT', score: 4, label: 'Hot Lead', colour: '#F59E0B', bgColour: 'rgba(245,158,11,0.1)' };
  }

  // Also HOT if very high engagement even with fewer visits
  if (totalMinutes >= 10 && totalVisits >= 2 && hoursSinceLastVisit <= 48) {
    return { tier: 'HOT', score: 4, label: 'Hot Lead', colour: '#F59E0B', bgColour: 'rgba(245,158,11,0.1)' };
  }

  // WARM: 3-10 min, 1-2 visits, some clicking, last visit within 5 days
  if (totalMinutes >= 3 && totalVisits >= 1 && hoursSinceLastVisit <= 120) {
    return { tier: 'WARM', score: 3, label: 'Warm', colour: '#3B82F6', bgColour: 'rgba(59,130,246,0.1)' };
  }

  // COOL: Opened once, < 3 min, minimal interaction
  if (totalVisits >= 1) {
    return { tier: 'COOL', score: 2, label: 'Cool', colour: '#8B5CF6', bgColour: 'rgba(139,92,246,0.1)' };
  }

  // COLD: Never opened
  return { tier: 'COLD', score: 1, label: 'Cold', colour: '#6B7280', bgColour: 'rgba(107,114,128,0.1)' };
}

/**
 * Get the engagement tier colour for Tailwind classes
 */
export function getEngagementTierStyle(tier: EngagementTier): { text: string; bg: string; border: string } {
  switch (tier) {
    case 'HOT': return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    case 'WARM': return { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    case 'COOL': return { text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    case 'COLD': return { text: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
  }
}
