import React, { useMemo, useState, useEffect } from 'react';
import { Job, JobStatus, PipelineStage, ChatSession, ForecastReviewStatus, ScheduleStatus } from '../types';
import { getJobIssues, JobIssue } from '../utils/issueLogic';
import TimeAttendanceView from '../components/TimeAttendanceView';
import { timeClockService } from '../services/TimeClockService';
import { COMPANY } from '../config/company';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ChevronRight,
  User as UserIcon,
  Plus,
  Zap,
  MapPin,
  MessageCircle,
  CalendarClock,
  TrendingDown
} from 'lucide-react';

interface OfficeDashboardViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onViewResources: () => void;
  onNewJob: () => void;
  onNavigateToChat?: () => void;
  chatSessions?: ChatSession[];
}

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  pulse?: boolean;
}> = ({ label, value, icon, color, onClick, pulse }) => {
  const colorMap: Record<string, string> = {
    emerald: 'text-[var(--brand-gold)] bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/20 shadow-[var(--brand-gold)]/5',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5',
  };

  const bgBlur: Record<string, string> = {
    emerald: 'bg-[var(--brand-gold)]',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  const Wrapper: any = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' } : {})}
      className={`card-base p-6 group relative overflow-hidden text-left ${onClick ? 'w-full cursor-pointer hover:border-[var(--brand-gold)]/40 transition-colors' : ''}`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 -mr-12 -mt-12 transition-all group-hover:opacity-30 ${bgBlur[color] || bgBlur.emerald}`} />
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.emerald} ${pulse && value > 0 ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
        <span className="text-3xl font-display text-[var(--text-primary)]">{value}</span>
      </div>
      <p className="font-label relative z-10 flex items-center gap-2">
        {label}
        {pulse && value > 0 && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
        )}
      </p>
    </Wrapper>
  );
};

const IssueBadge: React.FC<{ issue: JobIssue }> = ({ issue }) => {
  const styles = {
    error: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${styles[issue.type]}`}>
      {issue.type === 'error' && <AlertCircle size={8} />}
      {issue.label}
    </div>
  );
};

const JobCard: React.FC<{ job: Job; onClick: (job: Job) => void }> = ({ job, onClick }) => {
  const progress = Math.round((job.currentStage / 5) * 100);
  const issues = useMemo(() => getJobIssues(job), [job]);
  const labourSummary = useMemo(() => timeClockService.getLabourSummary(job.id), [job.id]);

  return (
    <button
      onClick={() => onClick(job)}
      className="w-full text-left card-base p-6 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-gold)]/5 blur-3xl -mr-16 -mt-16 group-hover:bg-[var(--brand-gold)]/10 transition-all" />
      
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-2 py-0.5 rounded-lg border border-[var(--brand-gold)]/20">
              {job.jobNumber}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
              job.status === JobStatus.IN_PROGRESS ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] dark:text-[var(--brand-gold-light)] border-[var(--brand-gold)]/20' :
              job.status === JobStatus.QC_PENDING ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
              'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border border-[var(--border-color)]'
            }`}>
              {job.status.replace('_', ' ')}
            </span>
            {issues.slice(0, 2).map((issue, idx) => (
              <IssueBadge key={idx} issue={issue} />
            ))}
          </div>
          <h4 className="text-lg font-display text-[var(--text-primary)] group-hover:text-[var(--brand-gold)] dark:group-hover:text-[var(--brand-gold-light)] transition-colors truncate">
            {job.clientName}
          </h4>
          <p className="font-label mt-1 truncate">
            {job.projectType}
          </p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="font-label mb-1">Last Update</p>
          <p className="text-xs font-bold text-[var(--text-secondary)]">
            {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'TBD'}
          </p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <MapPin size={14} className="text-[var(--brand-gold)] shrink-0" />
          <span className="text-xs font-medium truncate">{job.projectAddress}</span>
        </div>
        
        <div className="pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label">Field Progress</span>
            <span className="text-[10px] font-black text-[var(--brand-gold)]">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--text-primary)]/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--brand-gold)] shadow-[0_0_10px_rgba(196,164,50,0.5)] transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-[var(--text-primary)]/5 flex items-center justify-center border border-[var(--border-color)]">
                <UserIcon size={10} className="text-[var(--text-secondary)]" />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-secondary)]">{job.assignedCrewOrSubcontractor || 'Unassigned'}</span>
            </div>
            {labourSummary.totalHours > 0 && (
              <div className="flex items-center gap-2 border-l border-[var(--border-color)] pl-4">
                <Clock size={10} className="text-blue-500" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{labourSummary.totalHours}h</span>
                <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest ml-1">${labourSummary.estimatedCost}</span>
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </button>
  );
};

const OfficeDashboardView: React.FC<OfficeDashboardViewProps> = ({
  jobs,
  onSelectJob,
  onNewJob,
  onNavigateToChat,
  chatSessions = [],
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance'>('dashboard');
  const [unreadSmsCount, setUnreadSmsCount] = useState(0);

  // ─── Unread in-app portal chat ─────────────────────────────────────────
  // The customer's portal "Chat with our team" panel writes to ChatSession
  // (not the SMS table), with isFromClient=true and bumps unreadCount on
  // the session. We surface that here so the dashboard counter and the
  // New Messages section catch portal messages, not just inbound texts.
  const portalChatJobs = useMemo(() => {
    return chatSessions
      .filter(s => (s.unreadCount || 0) > 0)
      .map(s => {
        const job = jobs.find(j => j.id === s.jobId);
        return job ? { job, session: s } : null;
      })
      .filter((x): x is { job: Job; session: ChatSession } => x !== null)
      .sort((a, b) => {
        const at = a.session.lastMessageTimestamp ? new Date(a.session.lastMessageTimestamp).getTime() : 0;
        const bt = b.session.lastMessageTimestamp ? new Date(b.session.lastMessageTimestamp).getTime() : 0;
        return bt - at;
      });
  }, [chatSessions, jobs]);

  const portalChatUnreadTotal = useMemo(
    () => portalChatJobs.reduce((sum, x) => sum + (x.session.unreadCount || 0), 0),
    [portalChatJobs],
  );

  const unreadMessages = unreadSmsCount + portalChatUnreadTotal;

  // ─── Unread inbound SMS count ──────────────────────────────────────────
  // Pulls from the unified `incoming_messages` table (same source as the
  // per-job chat bubble) so the dashboard badge is always in sync with the
  // customer file. Subscribes to realtime INSERT/UPDATE so a fresh inbound
  // text bumps the badge instantly without a page refresh.
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    let cancelled = false;

    const fetchUnread = async () => {
      const { count, error } = await supabase!
        .from('incoming_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .eq('read', false);
      if (cancelled) return;
      if (!error && typeof count === 'number') setUnreadSmsCount(count);
    };

    fetchUnread();

    const channel = supabase!
      .channel('dashboard-unread-sms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incoming_messages' },
        () => { fetchUnread(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
    };
  }, []);

  // Summary Stats
  const stats = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return {
      active: jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.CANCELLED).length,
      inField: jobs.filter(j => j.pipelineStage === PipelineStage.IN_FIELD).length,
      startingSoon: jobs.filter(j => {
        if (!j.plannedStartDate) return false;
        const startDate = new Date(j.plannedStartDate);
        return startDate >= now && startDate <= nextWeek && j.pipelineStage !== PipelineStage.IN_FIELD;
      }).length,
      needsAttention: jobs.filter(j => getJobIssues(j).length > 0).length,
      scheduleChanges: jobs.filter(j => j.forecastReviewStatus === ForecastReviewStatus.REVIEW_NEEDED).length,
    };
  }, [jobs]);

  // Jobs where the field crew/sub submitted a schedule update that the
  // office hasn't confirmed yet. Shown as its own section because Jack
  // didn't notice these when they were buried inside Needs Attention.
  const scheduleChangeJobs = useMemo(() => {
    return jobs
      .filter(j => j.forecastReviewStatus === ForecastReviewStatus.REVIEW_NEEDED)
      .sort((a, b) => {
        // Behind-schedule first, then by most recently updated forecast
        const aBehind = a.fieldForecast?.status === ScheduleStatus.BEHIND || a.fieldForecast?.status === ScheduleStatus.DELAYED;
        const bBehind = b.fieldForecast?.status === ScheduleStatus.BEHIND || b.fieldForecast?.status === ScheduleStatus.DELAYED;
        if (aBehind && !bBehind) return -1;
        if (!aBehind && bBehind) return 1;
        const at = a.fieldForecast?.updatedAt ? new Date(a.fieldForecast.updatedAt).getTime() : 0;
        const bt = b.fieldForecast?.updatedAt ? new Date(b.fieldForecast.updatedAt).getTime() : 0;
        return bt - at;
      });
  }, [jobs]);

  // Section Data
  const needsAttentionJobs = useMemo(() => {
    return jobs
      .filter(j => getJobIssues(j).length > 0)
      .sort((a, b) => {
        const aIssues = getJobIssues(a);
        const bIssues = getJobIssues(b);
        // Sort by error presence first
        const aHasError = aIssues.some(i => i.type === 'error');
        const bHasError = bIssues.some(i => i.type === 'error');
        if (aHasError && !bHasError) return -1;
        if (!aHasError && bHasError) return 1;
        return bIssues.length - aIssues.length;
      })
      .slice(0, 6);
  }, [jobs]);

  const startingSoonJobs = useMemo(() => {
    const now = new Date();
    return jobs
      .filter(j => j.plannedStartDate && new Date(j.plannedStartDate) >= now && j.pipelineStage !== PipelineStage.IN_FIELD)
      .sort((a, b) => new Date(a.plannedStartDate!).getTime() - new Date(b.plannedStartDate!).getTime())
      .slice(0, 5);
  }, [jobs]);

  return (
    <div className="flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-full pb-12 transition-colors duration-300">
      {/* Header Section */}
      <div className="p-8 border-b border-[var(--border-color)] bg-gradient-to-b from-[var(--text-primary)]/[0.02] to-transparent">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[var(--brand-gold)]/10 rounded-[2rem] flex items-center justify-center border border-[var(--brand-gold)]/20 shadow-2xl shadow-[var(--brand-gold)]/10">
              <LayoutDashboard className="w-8 h-8 text-[var(--brand-gold)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[var(--brand-gold)] animate-pulse shadow-[0_0_8px_rgba(196,164,50,0.5)]" />
                <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em]">System Live</span>
              </div>
              <h1 className="text-5xl font-display leading-none">Operations Hub</h1>
              <p className="font-label mt-4">{COMPANY.name} Field Pro &bull; Control Layer</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mr-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
              >
                <Clock size={14} />
                Attendance
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <StatCard
            label="Active Jobs"
            value={stats.active}
            icon={<LayoutDashboard className="w-4 h-4" />}
            color="emerald"
          />
          <StatCard
            label="In Field"
            value={stats.inField}
            icon={<MapPin className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Needs Attention"
            value={stats.needsAttention}
            icon={<AlertCircle className="w-4 h-4" />}
            color="rose"
          />
          <StatCard
            label="Schedule Changes"
            value={stats.scheduleChanges}
            icon={<CalendarClock className="w-4 h-4" />}
            color="amber"
            pulse
          />
          <StatCard
            label="New Messages"
            value={unreadMessages}
            icon={<MessageCircle className="w-4 h-4" />}
            color="amber"
            onClick={onNavigateToChat}
            pulse
          />
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* New Messages Section — surfaces unread customer portal chats so
              Jack sees fresh messages without opening every job file. */}
          {portalChatJobs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display italic">New Messages</h2>
                    <p className="font-label">Unread customer portal chats</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToChat}
                  className="px-3 py-1 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] text-[10px] font-black rounded-lg border border-[var(--brand-gold)]/20 uppercase tracking-widest hover:bg-[var(--brand-gold)]/20 transition-colors"
                >
                  {portalChatUnreadTotal} New
                </button>
              </div>

              <div className="space-y-3">
                {portalChatJobs.slice(0, 5).map(({ job, session }) => {
                  const lastTs = session.lastMessageTimestamp
                    ? new Date(session.lastMessageTimestamp)
                    : null;
                  const lastClientMessage = [...session.messages]
                    .reverse()
                    .find(m => m.isFromClient);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onSelectJob(job)}
                      className="w-full flex items-start gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[var(--brand-gold)]/40 hover:bg-[var(--brand-gold)]/[0.03] transition-all text-left group"
                    >
                      <div className="relative h-11 w-11 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-[var(--brand-gold)]" />
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                          {session.unreadCount}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="text-sm font-display truncate group-hover:text-[var(--brand-gold)] transition-colors">
                            {session.clientName || job.clientName}
                          </p>
                          {lastTs && (
                            <span className="font-label shrink-0">
                              {lastTs.toLocaleString('en-CA', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {lastClientMessage?.text || session.lastMessage || 'New message'}
                        </p>
                        <p className="font-label mt-1 truncate">
                          {job.jobNumber} &middot; {job.projectType}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-[var(--text-tertiary)] group-hover:text-[var(--brand-gold)] group-hover:translate-x-1 transition-all mt-2 shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Schedule Change — Confirm Updated Dates
              Surfaces jobs where the field crew/sub submitted a schedule
              update and the office hasn't decided whether to push it to
              the official calendar. Sits ABOVE Needs Attention because
              calendar drift hits revenue scheduling fast and Jack didn't
              notice these when they were buried in the generic list. */}
          {scheduleChangeJobs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
                    <CalendarClock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display italic">Schedule Change — Confirm Updated Dates</h2>
                    <p className="font-label">Crew updated the schedule. Confirm or apply to official calendar.</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black rounded-lg border border-amber-500/20 uppercase tracking-widest">
                  {scheduleChangeJobs.length} Pending
                </span>
              </div>

              <div className="space-y-3">
                {scheduleChangeJobs.map(job => {
                  const isBehind = job.fieldForecast?.status === ScheduleStatus.BEHIND || job.fieldForecast?.status === ScheduleStatus.DELAYED;
                  const remaining = job.fieldForecast?.estimatedDaysRemaining;
                  const reason = job.fieldForecast?.delayReason || job.fieldForecast?.note;
                  const updatedBy = job.fieldForecast?.updatedBy;
                  const updatedAt = job.fieldForecast?.updatedAt ? new Date(job.fieldForecast.updatedAt) : null;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => onSelectJob(job)}
                      className="w-full flex items-start gap-4 p-5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/[0.07] transition-all text-left group"
                    >
                      <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                        {isBehind ? (
                          <TrendingDown className="w-5 h-5 text-amber-500" />
                        ) : (
                          <CalendarClock className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-2 py-0.5 rounded-lg border border-[var(--brand-gold)]/20 shrink-0">
                              {job.jobNumber}
                            </span>
                            <p className="text-sm font-display truncate group-hover:text-amber-500 transition-colors">
                              {job.clientName}
                            </p>
                          </div>
                          {updatedAt && (
                            <span className="font-label shrink-0">
                              {updatedAt.toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                            isBehind
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {(job.fieldForecast?.status || 'updated').replace('_', ' ')}
                          </span>
                          {typeof remaining === 'number' && remaining > 0 && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]">
                              {remaining}d remaining
                            </span>
                          )}
                          {updatedBy && (
                            <span className="font-label">by {updatedBy}</span>
                          )}
                        </div>
                        {reason && (
                          <p className="text-xs text-[var(--text-secondary)] italic truncate">"{reason}"</p>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-[var(--text-tertiary)] group-hover:text-amber-500 group-hover:translate-x-1 transition-all mt-2 shrink-0"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Needs Attention Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <h2 className="text-xl font-display italic">Needs Attention</h2>
                  <p className="font-label">Flagged issues & stalled jobs</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-black rounded-lg border border-rose-500/20 uppercase tracking-widest">
                {needsAttentionJobs.length} Active
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {needsAttentionJobs.length > 0 ? (
                needsAttentionJobs.map(job => (
                  <JobCard key={job.id} job={job} onClick={onSelectJob} />
                ))
              ) : (
                <div className="col-span-full p-12 rounded-[2rem] border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-center bg-[var(--text-primary)]/5">
                  <CheckCircle2 className="h-10 w-10 text-[var(--brand-gold)]/20 mb-4" />
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">All systems healthy</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-12 lg:sticky lg:top-24 lg:self-start">
          
          {/* Quick Access */}
          {/* Starting Soon Section */}
          <section className="card-base p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-label tracking-[0.3em]">Starting Soon</h3>
              <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Next 7 Days</span>
            </div>
            
            <div className="space-y-4">
              {startingSoonJobs.length > 0 ? (
                startingSoonJobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => onSelectJob(job)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--text-primary)]/5 border border-[var(--border-color)] hover:bg-[var(--text-primary)]/10 hover:border-[var(--brand-gold)]/30 transition-all group text-left"
                  >
                    <div className="h-12 w-12 rounded-xl bg-[var(--text-primary)]/5 flex flex-col items-center justify-center border border-[var(--border-color)] shrink-0 group-hover:bg-[var(--brand-gold)]/10 group-hover:border-[var(--brand-gold)]/20 transition-all">
                      <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase group-hover:text-[var(--brand-gold)]">
                        {new Date(job.plannedStartDate!).toLocaleDateString('en-CA', { month: 'short' })}
                      </span>
                      <span className="text-lg font-black text-[var(--text-primary)] group-hover:text-[var(--brand-gold)] dark:group-hover:text-[var(--brand-gold-light)] leading-none">
                        {new Date(job.plannedStartDate!).toLocaleDateString('en-CA', { day: 'numeric' })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-display truncate">{job.clientName}</p>
                      <p className="font-label mt-0.5 truncate">{job.projectType}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="bg-[var(--text-primary)]/5 border border-dashed border-[var(--border-color)] rounded-2xl p-8 text-center">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">No upcoming starts</p>
                </div>
              )}
            </div>
          </section>

          {/* Project Distribution */}
          <section className="card-base p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-gold)]/5 blur-3xl -mr-16 -mt-16" />
            <h3 className="font-label tracking-[0.3em] mb-8 relative z-10">Project Distribution</h3>
            <div className="space-y-6 relative z-10">
              {[
                { label: 'Sold / Setup', count: jobs.filter(j => j.pipelineStage === PipelineStage.JOB_SOLD || j.pipelineStage === PipelineStage.ADMIN_SETUP).length, color: 'bg-blue-500' },
                { label: 'Pre-Production', count: jobs.filter(j => j.pipelineStage === PipelineStage.PRE_PRODUCTION || j.pipelineStage === PipelineStage.READY_TO_START).length, color: 'bg-purple-500' },
                { label: 'In Field', count: jobs.filter(j => j.pipelineStage === PipelineStage.IN_FIELD).length, color: 'bg-[var(--brand-gold)]' },
                { label: 'Review / Close', count: jobs.filter(j => j.pipelineStage === PipelineStage.COMPLETION).length, color: 'bg-amber-500' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label">{item.label}</span>
                    <span className="text-xs font-black text-[var(--text-primary)]">{item.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--text-primary)]/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} transition-all duration-1000`}
                      style={{ width: `${(item.count / Math.max(jobs.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  ) : (
    <div className="p-8">
      <TimeAttendanceView jobs={jobs} />
    </div>
  )}
</div>
);
};

export default OfficeDashboardView;
