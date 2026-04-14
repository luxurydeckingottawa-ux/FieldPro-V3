import React, { useMemo } from 'react';
import { Job, ForecastReviewStatus, PipelineStage } from '../types';
import { MapPin, User as UserIcon, Calendar, AlertCircle, Clock, CheckCircle2, ShieldCheck, RefreshCw, Hourglass, Globe, Mail } from 'lucide-react';
import { getJobIssues } from '../utils/issueLogic';
import { getCampaignStatusSummary } from '../utils/dripCampaignProcessor';

interface PipelineCardProps {
  job: Job;
  onClick: () => void;
}

const PipelineCard: React.FC<PipelineCardProps> = ({ job, onClick }) => {
  const issues = useMemo(() => getJobIssues(job), [job]);
  const hasError = issues.some(i => i.type === 'error');
  const hasWarning = issues.some(i => i.type === 'warning');
  const hasInfo = issues.some(i => i.type === 'info');

  const campaignStatus = useMemo(() => getCampaignStatusSummary(job), [job]);

  const agingDays = useMemo(() => {
    if (!job.stageUpdatedAt) return 0;
    const diff = Date.now() - new Date(job.stageUpdatedAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [job.stageUpdatedAt]);

  const isStuck = useMemo(() => {
    const preWonStages = [
      PipelineStage.LEAD_IN,
      PipelineStage.SITE_VISIT_SCHEDULED,
      PipelineStage.ESTIMATE_IN_PROGRESS,
      PipelineStage.ESTIMATE_SENT,
      PipelineStage.FOLLOW_UP
    ];
    return preWonStages.includes(job.pipelineStage) && agingDays > 14;
  }, [job.pipelineStage, agingDays]);

  return (
    <div 
      onClick={onClick}
      className={`card-base p-4 cursor-pointer group relative overflow-hidden ${
        hasError ? 'border-rose-500/30 bg-rose-500/[0.02]' : 
        hasWarning ? 'border-amber-500/30 bg-amber-500/[0.02]' :
        'hover:border-[var(--brand-gold)]/30 hover:bg-[var(--bg-primary)]'
      }`}
    >
      {hasError && (
        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
      )}
      {!hasError && hasWarning && (
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
      )}
      {!hasError && !hasWarning && hasInfo && (
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-2 py-0.5 rounded-lg border border-[var(--brand-gold)]/20">
            {job.jobNumber}
          </span>
          {job.finalSubmissionStatus === 'submitted' && (
            <span className="text-[8px] font-black text-white uppercase tracking-widest bg-[var(--brand-gold)] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
              <CheckCircle2 size={10} /> Submitted
            </span>
          )}
          {job.verifiedBuildPassportUrl && (
            <span className="text-[8px] font-black text-white uppercase tracking-widest bg-blue-600 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
              <ShieldCheck size={10} /> Closeout Ready
            </span>
          )}
          {job.forecastReviewStatus === ForecastReviewStatus.REVIEW_NEEDED && (
            <span className="text-[8px] font-black text-white uppercase tracking-widest bg-purple-600 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm animate-pulse">
              <RefreshCw size={10} /> Review Needed
            </span>
          )}
          {isStuck && (
            <span className="text-[8px] font-black text-white uppercase tracking-widest bg-amber-600 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm animate-pulse">
              <Hourglass size={10} /> Stuck ({agingDays}d)
            </span>
          )}
          {job.portalStatus === 'viewed' && (
            <span className="text-[8px] font-black text-white uppercase tracking-widest bg-[var(--brand-gold)] px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
              <Globe size={10} /> Portal Viewed
            </span>
          )}
          {issues.length > 0 && (
            <div className="flex items-center gap-1">
              {hasError ? (
                <AlertCircle className="w-3 h-3 text-rose-500" />
              ) : hasWarning ? (
                <AlertCircle className="w-3 h-3 text-amber-500" />
              ) : (
                <Clock className="w-3 h-3 text-blue-500" />
              )}
              <span className={`text-[8px] font-black ${hasError ? 'text-rose-500' : hasWarning ? 'text-amber-500' : 'text-blue-500'}`}>
                {issues.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <h4 className="text-sm font-display text-[var(--text-primary)] mb-3 truncate group-hover:text-[var(--brand-gold-light)] transition-colors">
        {job.clientName}
      </h4>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <MapPin size={10} className="text-[var(--brand-gold)] opacity-60" />
          <span className="text-[10px] font-medium truncate tracking-wide">{job.projectAddress}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <UserIcon size={10} className="text-[var(--brand-gold)] opacity-60" />
          <span className="text-[10px] font-medium truncate tracking-wide">{job.assignedCrewOrSubcontractor || 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Calendar size={10} className="text-[var(--brand-gold)] opacity-60" />
          <span className="text-[10px] font-medium tracking-wide">
            {job.plannedStartDate ? new Date(job.plannedStartDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'TBD'}
          </span>
        </div>
      </div>

      {campaignStatus && (
        <div className={`mt-3 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 ${
          campaignStatus.overdue
            ? 'bg-rose-500/10 border border-rose-500/20'
            : 'bg-white/[0.03] border border-white/5'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Mail size={9} className={campaignStatus.overdue ? 'text-rose-400 shrink-0' : 'text-[var(--brand-gold)] shrink-0'} />
            <span className={`text-[8px] font-black uppercase tracking-widest truncate ${
              campaignStatus.overdue ? 'text-rose-400' : 'text-gray-500'
            }`}>
              {campaignStatus.label}
            </span>
          </div>
          {campaignStatus.nextLabel && (
            <span className={`text-[8px] font-bold shrink-0 ${
              campaignStatus.overdue ? 'text-rose-400' : 'text-[var(--brand-gold)]'
            }`}>
              {campaignStatus.nextLabel}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-label opacity-60 truncate max-w-[120px]">
            {job.projectType}
          </span>
          {job.estimateAmount > 0 && (
            <span className="text-[11px] font-black text-[var(--brand-gold)] mt-0.5">
              ${job.estimateAmount.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)]/50" />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)]" />
        </div>
      </div>
    </div>
  );
};

export default PipelineCard;
