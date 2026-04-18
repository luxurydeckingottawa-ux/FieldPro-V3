/**
 * Engagement Scoring Engine
 *
 * Scores portal engagement into HOT / WARM / COOL / COLD tiers.
 * Used to select which follow-up message template to send.
 *
 * Based on the FieldPro CRM Pipeline Follow-Up Master System.
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
 * Scoring is multi-dimensional. Any single strong signal can earn a tier
 * on its own, because engagement data is often incomplete (session timers
 * can be cut short by tab close, clicks are client-side and can be missed).
 * Visit count is the most reliable signal — we weight it accordingly.
 *
 *   HOT  (4): 10+ visits ever
 *             OR 5+ visits with activity in last 7 days
 *             OR 10+ min & 3+ visits & 3+ clicks & last visit < 48h
 *             OR 10+ min & 2+ visits & last visit < 48h
 *   WARM (3): 3+ visits with activity in last 14 days
 *             OR 3+ min time spent with at least one visit in last 5 days
 *   COOL (2): any portal open
 *   COLD (1): never opened
 */
const HOT: EngagementScore  = { tier: 'HOT',  score: 4, label: 'Hot Lead', colour: '#F59E0B', bgColour: 'rgba(245,158,11,0.1)' };
const WARM: EngagementScore = { tier: 'WARM', score: 3, label: 'Warm',     colour: '#3B82F6', bgColour: 'rgba(59,130,246,0.1)' };
const COOL: EngagementScore = { tier: 'COOL', score: 2, label: 'Cool',     colour: '#8B5CF6', bgColour: 'rgba(139,92,246,0.1)' };
const COLD: EngagementScore = { tier: 'COLD', score: 1, label: 'Cold',     colour: '#6B7280', bgColour: 'rgba(107,114,128,0.1)' };

export function calculateEngagementTier(engagement?: PortalEngagement): EngagementScore {
  if (!engagement) return COLD;

  const now = Date.now();
  const lastVisit = engagement.lastOpenedAt ? new Date(engagement.lastOpenedAt).getTime() : 0;
  const hoursSinceLastVisit = lastVisit ? (now - lastVisit) / (1000 * 60 * 60) : Infinity;

  const totalVisits = engagement.totalOpens || 0;
  const totalMinutes = (engagement.totalTimeSpentSeconds || 0) / 60;
  const totalOptionClicks = Object.values(engagement.optionClicks || {}).reduce((sum, c) => sum + c, 0);
  const totalAddOnClicks = Object.values(engagement.addOnInteractions || {}).reduce((sum, c) => sum + c, 0);
  const totalInteractions = totalOptionClicks + totalAddOnClicks;

  // ── HOT ────────────────────────────────────────────────────────────────
  // Heavy visit count is the strongest stand-alone signal. If someone has
  // opened this portal 10+ times, the time-tracker being cold is irrelevant.
  if (totalVisits >= 10) return HOT;

  // 5+ visits with recent activity (within a week).
  if (totalVisits >= 5 && hoursSinceLastVisit <= 168) return HOT;

  // Heavy time + recent multi-visit activity.
  if (totalMinutes >= 10 && totalVisits >= 3 && totalInteractions >= 3 && hoursSinceLastVisit <= 48) return HOT;
  if (totalMinutes >= 10 && totalVisits >= 2 && hoursSinceLastVisit <= 48) return HOT;

  // ── WARM ───────────────────────────────────────────────────────────────
  // 3+ visits is a real signal of interest even if time tracker looks thin.
  if (totalVisits >= 3 && hoursSinceLastVisit <= 336) return WARM; // within 14 days

  // Or a solid single chunk of attention in the last 5 days.
  if (totalMinutes >= 3 && totalVisits >= 1 && hoursSinceLastVisit <= 120) return WARM;

  // ── COOL ───────────────────────────────────────────────────────────────
  if (totalVisits >= 1) return COOL;

  // ── COLD ───────────────────────────────────────────────────────────────
  return COLD;
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
