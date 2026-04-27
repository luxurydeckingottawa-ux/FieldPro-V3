import React, { useMemo } from 'react';
import { Job, PipelineStage } from '../types';
import { calculateEngagementTier, EngagementTier } from '../utils/engagementScoring';
import {
  BarChart3, TrendingUp, Users, Target, DollarSign,
  ArrowLeft, Megaphone, Globe, UserCheck, Share2,
  MapPin, Phone, Mail, Repeat, Award, Calendar,
  UserPlus, ThumbsUp, FileText, Briefcase,
} from 'lucide-react';

interface StatsViewProps {
  jobs: Job[];
  onBack: () => void;
}

const StatsView: React.FC<StatsViewProps> = ({ jobs, onBack }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    
    // Pipeline stage groups
    const leadStages = [PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.SECOND_CONTACT, PipelineStage.THIRD_CONTACT, PipelineStage.LEAD_ON_HOLD];
    const instaQuoteStages = [
      PipelineStage.INSTAQUOTE_LEAD, PipelineStage.INSTAQUOTE_TOUCH_1, PipelineStage.INSTAQUOTE_TOUCH_2,
      PipelineStage.INSTAQUOTE_TOUCH_3, PipelineStage.INSTAQUOTE_TOUCH_4, PipelineStage.INSTAQUOTE_TOUCH_5,
      PipelineStage.INSTAQUOTE_TOUCH_6, PipelineStage.INSTAQUOTE_TOUCH_7, PipelineStage.INSTAQUOTE_LONG_TERM,
    ];
    const estimateStages = [PipelineStage.EST_UNSCHEDULED, PipelineStage.EST_SCHEDULED, PipelineStage.EST_IN_PROGRESS, PipelineStage.EST_COMPLETED, PipelineStage.EST_SENT, PipelineStage.EST_ON_HOLD, PipelineStage.EST_APPROVED];
    const jobStages = [PipelineStage.JOB_SOLD, PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION, PipelineStage.READY_TO_START, PipelineStage.IN_FIELD, PipelineStage.COMPLETION, PipelineStage.PAID_CLOSED];

    const activeLeads = jobs.filter(j => leadStages.includes(j.pipelineStage) || instaQuoteStages.includes(j.pipelineStage));
    const activeEstimates = jobs.filter(j => estimateStages.includes(j.pipelineStage));
    const activeJobs = jobs.filter(j => jobStages.includes(j.pipelineStage));

    // ── Pipeline FUNNEL counts ──────────────────────────────────────────────
    // Lifetime totals (not just currently-active) so the office can see the
    // full inflow + conversion ratios. A lead that's now in JOB_SOLD still
    // counts as 1 lead-in, 1 qualified, 1 estimate-done, AND 1 job-booked.

    // LEADS IN: every job in the system (each job started life as a lead,
    // regardless of which source it came from — InstaQuote, Facebook lead,
    // email lead, walk-in, etc.).
    const leadsIn = jobs.length;

    // QUALIFIED LEADS: leads that progressed past the initial contact stage
    // (someone showed enough interest to be worth pursuing). Anyone past
    // INSTAQUOTE_LEAD / LEAD_IN / first-contact, AND not lost/closed.
    const unqualifiedStages = new Set<string>([
      PipelineStage.LEAD_IN,
      PipelineStage.INSTAQUOTE_LEAD,
      PipelineStage.LEAD_LOST,
      PipelineStage.INSTAQUOTE_CLOSED,
    ]);
    const qualifiedLeads = jobs.filter(j => !unqualifiedStages.has(j.pipelineStage)).length;

    // ESTIMATES DONE: customer received an actual quote. Counts anyone who
    // reached EST_SENT (or any post-sent stage including job stages, since
    // they wouldn't have signed without seeing an estimate first).
    const estimateDoneStages = new Set<string>([
      PipelineStage.EST_SENT, PipelineStage.EST_APPROVED, PipelineStage.EST_REJECTED,
      PipelineStage.EST_ON_HOLD, PipelineStage.ESTIMATE_SENT, PipelineStage.FOLLOW_UP,
      ...jobStages,
    ]);
    const estimatesDone = jobs.filter(j => estimateDoneStages.has(j.pipelineStage)).length;

    // JOBS BOOKED: estimates that converted into signed contracts. Anyone
    // in JOB_SOLD or any post-sale stage.
    const jobsBooked = jobs.filter(j => jobStages.includes(j.pipelineStage)).length;

    // Won / lost (kept for the legacy Pipeline Snapshot below — separate
    // concept from the funnel counts above).
    const wonJobs = jobs.filter(j => j.pipelineStage === PipelineStage.LEAD_WON || jobStages.includes(j.pipelineStage));
    const lostJobs = jobs.filter(j => j.pipelineStage === PipelineStage.LEAD_LOST || j.pipelineStage === PipelineStage.EST_REJECTED || j.pipelineStage === PipelineStage.INSTAQUOTE_CLOSED);

    // Closing rate = estimates done → jobs booked ratio. This is the truer
    // sales-team metric (of all the people who got an actual quote, what
    // percentage signed?). Previously this was won/(won+lost) which was
    // noisier because it counted leads who were never quoted.
    const closingRate = estimatesDone > 0 ? Math.round((jobsBooked / estimatesDone) * 100) : 0;
    
    // Revenue
    const totalRevenue = activeJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0);
    const paidRevenue = activeJobs.reduce((sum, j) => sum + (j.paidAmount || 0), 0);
    const outstandingRevenue = totalRevenue - paidRevenue;
    const avgJobValue = activeJobs.length > 0 ? Math.round(totalRevenue / activeJobs.length) : 0;
    
    // Lead sources
    const sourceMap: Record<string, { count: number; won: number; value: number }> = {};
    jobs.forEach(j => {
      const src = j.leadSource || 'Unknown';
      const base = src.split(' - ')[0].trim() || 'Unknown';
      if (!sourceMap[base]) sourceMap[base] = { count: 0, won: 0, value: 0 };
      sourceMap[base].count++;
      if (jobStages.includes(j.pipelineStage) || j.pipelineStage === PipelineStage.LEAD_WON) {
        sourceMap[base].won++;
        sourceMap[base].value += (j.totalAmount || 0);
      }
    });
    const leadSources = Object.entries(sourceMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({
        name,
        count: data.count,
        won: data.won,
        value: data.value,
        conversionRate: data.count > 0 ? Math.round((data.won / data.count) * 100) : 0
      }));
    
    // Completed jobs — include both COMPLETION (field done) and PAID_CLOSED (fully invoiced)
    const completedJobs = jobs.filter(j =>
      j.pipelineStage === PipelineStage.COMPLETION || j.pipelineStage === PipelineStage.PAID_CLOSED
    );
    
    return {
      activeLeads: activeLeads.length,
      activeEstimates: activeEstimates.length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      closingRate,
      totalRevenue,
      paidRevenue,
      outstandingRevenue,
      avgJobValue,
      leadSources,
      wonJobs: wonJobs.length,
      lostJobs: lostJobs.length,
      // Pipeline funnel — lifetime totals across all sources
      leadsIn,
      qualifiedLeads,
      estimatesDone,
      jobsBooked,
    };
  }, [jobs]);

  const sourceIcons: Record<string, React.ReactNode> = {
    'Facebook': <Megaphone className="w-4 h-4" />,
    'Google': <Globe className="w-4 h-4" />,
    'Referral': <UserCheck className="w-4 h-4" />,
    'Website': <Globe className="w-4 h-4" />,
    'Door Hanger': <MapPin className="w-4 h-4" />,
    'Phone': <Phone className="w-4 h-4" />,
    'Email': <Mail className="w-4 h-4" />,
    'Repeat Client': <Repeat className="w-4 h-4" />,
    'Instagram': <Share2 className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-[var(--bg-secondary)] rounded-xl transition-all text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Business Stats</h1>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Performance Overview</p>
          </div>
        </div>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-gold)]/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-[var(--brand-gold)]" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Closing Rate</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{stats.closingRate}%</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">{stats.jobsBooked} booked / {stats.estimatesDone} quoted</p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Total Revenue</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">${stats.totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">${stats.paidRevenue.toLocaleString()} collected</p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Avg Job Value</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">${stats.avgJobValue.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">{stats.activeJobs} active jobs</p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Outstanding</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">${stats.outstandingRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">To be collected</p>
        </div>
      </div>

      {/* Pipeline Funnel KPIs — lifetime totals across all sources.
          Reads left-to-right as the funnel: every lead that came in
          (any source: InstaQuote, Facebook, email, walk-in, etc.) →
          who got qualified → who got an actual quote → who signed.
          The closing rate above (jobs / quoted) is the conversion
          ratio between Estimates Done and Jobs Booked. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Leads In</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{stats.leadsIn.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">All sources, all time</p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Qualified Leads</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{stats.qualifiedLeads.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {stats.leadsIn > 0 ? `${Math.round((stats.qualifiedLeads / stats.leadsIn) * 100)}% of leads` : '—'}
          </p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Estimates Done</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{stats.estimatesDone.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {stats.qualifiedLeads > 0 ? `${Math.round((stats.estimatesDone / stats.qualifiedLeads) * 100)}% of qualified` : '—'}
          </p>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-gold)]/15 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-[var(--brand-gold)]" />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Jobs Booked</p>
          </div>
          <p className="text-3xl font-black text-[var(--text-primary)]">{stats.jobsBooked.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {stats.estimatesDone > 0 ? `${stats.closingRate}% close rate` : '—'}
          </p>
        </div>
      </div>

      {/* Pipeline Snapshot + Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Snapshot */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-color)]">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Pipeline Snapshot
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Active Leads</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (stats.activeLeads / Math.max(1, stats.activeLeads + stats.activeEstimates + stats.activeJobs)) * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] w-8 text-right">{stats.activeLeads}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Active Estimates</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (stats.activeEstimates / Math.max(1, stats.activeLeads + stats.activeEstimates + stats.activeJobs)) * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] w-8 text-right">{stats.activeEstimates}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-primary)]">Active Jobs</span>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--brand-gold)] rounded-full" style={{ width: `${Math.min(100, (stats.activeJobs / Math.max(1, stats.activeLeads + stats.activeEstimates + stats.activeJobs)) * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] w-8 text-right">{stats.activeJobs}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-sm font-medium text-[var(--text-primary)]">Completed</span>
              <div className="flex items-center gap-3">
                <Award className="w-4 h-4 text-[var(--brand-gold)]" />
                <span className="text-sm font-bold text-[var(--text-primary)] w-8 text-right">{stats.completedJobs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-color)]">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
              <Megaphone className="w-3.5 h-3.5" /> Lead Sources
            </h2>
          </div>
          <div className="p-5">
            {stats.leadSources.length > 0 ? (
              <div className="space-y-3">
                {stats.leadSources.map((source) => {
                  const maxCount = stats.leadSources[0]?.count || 1;
                  return (
                    <div key={source.name} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[var(--brand-gold)]/10 flex items-center justify-center text-[var(--brand-gold)] shrink-0">
                        {sourceIcons[source.name] || <Megaphone className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">{source.name}</span>
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0 ml-2">{source.count} leads</span>
                        </div>
                        <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--brand-gold)] rounded-full transition-all" style={{ width: `${(source.count / maxCount) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] text-[var(--text-secondary)]">{source.conversionRate}% conversion</span>
                          {source.value > 0 && <span className="text-[9px] text-[var(--brand-gold)] font-bold">${source.value.toLocaleString()} revenue</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Megaphone className="w-8 h-8 text-[var(--text-secondary)] opacity-20 mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)]">No lead source data yet</p>
                <p className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-1">Sources will appear as estimators capture marketing data during intake</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Tier Distribution + Campaign Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Distribution */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-color)]">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Engagement Distribution
            </h2>
          </div>
          <div className="p-5">
            {(() => {
              const tiers: Record<EngagementTier, number> = { HOT: 0, WARM: 0, COOL: 0, COLD: 0 };
              const estimateJobs = jobs.filter(j => j.pipelineStage === PipelineStage.EST_SENT || j.pipelineStage === PipelineStage.EST_COMPLETED);
              estimateJobs.forEach(j => {
                const { tier } = calculateEngagementTier(j.portalEngagement);
                tiers[tier]++;
              });
              const total = estimateJobs.length || 1;
              const tierData = [
                { tier: 'HOT' as EngagementTier, count: tiers.HOT, colour: 'bg-amber-500', text: 'text-amber-500' },
                { tier: 'WARM' as EngagementTier, count: tiers.WARM, colour: 'bg-blue-500', text: 'text-blue-500' },
                { tier: 'COOL' as EngagementTier, count: tiers.COOL, colour: 'bg-purple-500', text: 'text-purple-500' },
                { tier: 'COLD' as EngagementTier, count: tiers.COLD, colour: 'bg-gray-400', text: 'text-gray-400' },
              ];
              return (
                <div className="space-y-4">
                  {tierData.map(t => (
                    <div key={t.tier} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-12 ${t.text}`}>{t.tier}</span>
                      <div className="flex-1 h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <div className={`h-full ${t.colour} rounded-full transition-all`} style={{ width: `${(t.count / total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{t.count}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] w-10 text-right">{Math.round((t.count / total) * 100)}%</span>
                    </div>
                  ))}
                  {estimateJobs.length === 0 && (
                    <p className="text-xs text-[var(--text-secondary)] text-center py-4">No active estimates to score</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Campaign Activity */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-color)]">
            <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
              <Target className="w-3.5 h-3.5" /> Campaign Activity
            </h2>
          </div>
          <div className="p-5">
            {(() => {
              const activeCampaigns = jobs.filter(j => j.dripCampaign?.status === 'active');
              const leadCampaigns = activeCampaigns.filter(j => j.dripCampaign?.campaignType === 'LEAD_FOLLOW_UP');
              const estCampaigns = activeCampaigns.filter(j => j.dripCampaign?.campaignType === 'ESTIMATE_FOLLOW_UP');
              const totalMessagesSent = jobs.reduce((sum, j) => sum + (j.dripCampaign?.sentMessages?.length || 0), 0);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-black text-[var(--text-primary)]">{activeCampaigns.length}</p>
                      <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Active</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-black text-[var(--text-primary)]">{leadCampaigns.length}</p>
                      <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Lead Drips</p>
                    </div>
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg text-center">
                      <p className="text-2xl font-black text-[var(--text-primary)]">{estCampaigns.length}</p>
                      <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Estimate Drips</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)]">Total messages sent</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{totalMessagesSent}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsView;
