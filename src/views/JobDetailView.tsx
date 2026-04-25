import React, { useState } from 'react';

import { Job, User, Role, ScheduleStatus, FieldScheduleForecast } from '../types';
import { APP_USERS } from '../constants';
import ProjectLocationMap from '../components/ProjectLocationMap';
import TimeClockControls from '../components/TimeClockControls';
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Paperclip,
  Play,
  CheckCircle2,
  Check,
  Clock,
  AlertTriangle,
  Ruler,
  ClipboardCheck,
  ShieldCheck,
  Camera,
  History,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  Users,
  Mail,
  ExternalLink,
  Lock,
  CalendarClock
} from 'lucide-react';
import QuickMessageModal from '../components/QuickMessageModal';
import BuildSpecsPanel from '../components/BuildSpecsPanel';
import { COMPANY } from '../config/company';

interface JobDetailViewProps {
  job: Job;
  user: User;
  onBack: () => void;
  onOpenWorkflow: (job: Job) => void;
  onUpdateSchedule?: (jobId: string, updates: Partial<Job>) => void;
  onUpdateFieldForecast?: (jobId: string, forecast: Partial<FieldScheduleForecast>) => void;
  /** Clears forecastReviewStatus back to UP_TO_DATE without changing dates.
   *  Used when the office reviews a field schedule update and decides not
   *  to push it to the official schedule. */
  onConfirmFieldForecast?: (jobId: string) => void;
  onSendMessage?: (sessionId: string, text: string) => void;
  allJobs?: Job[];
}

const JobDetailView: React.FC<JobDetailViewProps> = ({
  job,
  user,
  onBack,
  onOpenWorkflow,
  onUpdateSchedule,
  onUpdateFieldForecast,
  onConfirmFieldForecast,
  onSendMessage,
  allJobs = []
}) => {
  const isAdminOrManager = user.role === Role.ADMIN;
  const isFieldUser = user.role === Role.FIELD_EMPLOYEE || user.role === Role.SUBCONTRACTOR;

  // Daily Schedule Check-In gate.
  //
  // Field user MUST explicitly select a status every visit — no auto-default
  // to ON_SCHEDULE. If they're BEHIND, days-remaining + reason are required
  // before the workflow can open. The gate lives at the file level (not
  // inside the workflow) so resumed-mid-stage jobs still hit it.
  //
  // If they already submitted earlier today, we pre-fill their selection so
  // they can confirm or change without retyping. If they haven't, status
  // starts unselected and the Resume button stays disabled.
  const updatedToday =
    !!job.fieldForecast?.updatedAt &&
    new Date(job.fieldForecast.updatedAt).toDateString() ===
      new Date().toDateString();

  const [forecastStatus, setForecastStatus] = useState<ScheduleStatus | null>(
    () => (updatedToday ? job.fieldForecast?.status || null : null)
  );
  const [daysRemaining, setDaysRemaining] = useState<number>(
    () =>
      updatedToday && job.fieldForecast?.estimatedDaysRemaining !== undefined
        ? job.fieldForecast.estimatedDaysRemaining
        : job.plannedDurationDays || 0
  );
  const [delayReason, setDelayReason] = useState<string>(() =>
    updatedToday ? job.fieldForecast?.delayReason || '' : ''
  );
  const [forecastNote, setForecastNote] = useState<string>(() =>
    updatedToday ? job.fieldForecast?.note || '' : ''
  );
  const [isUpdatingForecast, setIsUpdatingForecast] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms');

  // Validation: status must be picked. If BEHIND, days > 0 AND reason set.
  const isBehind = forecastStatus === ScheduleStatus.BEHIND;
  const canResume = isFieldUser
    ? forecastStatus !== null &&
      (!isBehind || (daysRemaining > 0 && !!delayReason))
    : true;

  const handleSubmitDailyCheckIn = (openWorkflowAfter: boolean) => {
    if (!forecastStatus) return; // safety \u2014 button disabled when null
    setIsUpdatingForecast(true);
    onUpdateFieldForecast?.(job.id, {
      status: forecastStatus,
      estimatedDaysRemaining: daysRemaining,
      delayReason,
      note: forecastNote
    });
    setTimeout(() => {
      setIsUpdatingForecast(false);
      if (openWorkflowAfter) onOpenWorkflow(job);
    }, 600);
  };

  const handleSendMessage = (type: 'sms' | 'email', message: string) => {
    if (type === 'sms') {
      const sessionId = `session-${job.id}`;
      onSendMessage?.(sessionId, message);
    } else {
      // Handle email intent
      const mailLink = document.createElement('a'); mailLink.href = `mailto:${job.clientEmail}?subject=${COMPANY.name}: ${job.jobNumber}&body=${encodeURIComponent(message)}`; mailLink.click();
    }
    setIsMessageModalOpen(false);
  };

  return (
    <div 
      
      
      className="bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen overflow-y-auto pb-32"
    >
      <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-10">
        
        {/* Top Navigation / Back */}
        <div 
          
          
          className="flex items-center justify-between"
        >
          <button 
            onClick={onBack}
            className="flex items-center gap-3 text-[var(--muted-text)] hover:text-[var(--text-primary)] transition-colors group"
          >
            <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] group-hover:bg-[var(--bg-secondary)] transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Jobs</span>
          </button>
        </div>

        {/* Header Card */}
        <header 
          
          
          
          className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand-gold)]/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row gap-10 relative z-10">
            {/* Map Preview Square */}
            <div className="w-full lg:w-48 h-48 lg:h-48 shrink-0">
              <ProjectLocationMap 
                address={job.projectAddress} 
                hideAddress={true} 
                className="h-full w-full shadow-xl" 
              />
            </div>

            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-4 py-1.5 rounded-xl border border-[var(--brand-gold)]/20">
                    {job.jobNumber}
                  </span>
                  <div className="h-4 w-px bg-[var(--card-border)]" />
                  <span className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                    {job.projectType}
                  </span>
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight uppercase italic leading-none mb-4">
                    {job.clientName}
                  </h1>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em]">
                      <MapPin size={12} /> Project Location
                    </div>
                    <p className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-tight italic leading-tight">
                      {job.projectAddress}
                    </p>
                  </div>

                  <div className="pt-4 flex flex-wrap gap-3">
                    <button 
                      onClick={() => {
                        setMessageType('sms');
                        setIsMessageModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-xl border border-[var(--brand-gold)]/20 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--brand-gold)] hover:text-black transition-all"
                    >
                      <MessageSquare size={12} /> Chat with Client
                    </button>
                    {isAdminOrManager && (
                      <>
                        <button 
                          onClick={() => {
                            setMessageType('email');
                            setIsMessageModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                        >
                          <Mail size={12} /> Email Client
                        </button>
                        <button 
                          onClick={() => {
                            const portalUrl = `${window.location.origin}/portal/${job.customerPortalToken}`;
                            window.open(portalUrl, '_blank');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all"
                        >
                          <ExternalLink size={12} /> Preview Portal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch md:items-end gap-6">
                {/* Admin/manager Resume button — field users get the gated
                    Daily Schedule Check-In card below instead. */}
                {!isFieldUser && (
                  <button
                    onClick={() => onOpenWorkflow(job)}
                    className="flex items-center justify-center gap-4 px-10 py-6 bg-[var(--brand-gold)] text-black rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] hover:bg-[var(--brand-gold)] transition-all shadow-[0_20px_50px_rgba(180,148,30,0.3)] active:scale-95 group"
                  >
                    <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                    <span>{job.currentStage > 0 ? 'Resume Workflow' : 'Start Workflow'}</span>
                  </button>
                )}
                <div className="flex items-center justify-center md:justify-end gap-3">
                  <div className="h-1.5 w-32 bg-[var(--bg-primary)]/20 rounded-full overflow-hidden border border-[var(--card-border)]">
                    <div 
                      
                      style={{ width: `${(job.currentStage / 5) * 100}%` }}
                      className="h-full bg-[var(--brand-gold)] shadow-[0_0_10px_rgba(196,164,50,0.5)]"
                    />
                  </div>
                  <span className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                    Stage {job.currentStage}/5
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Schedule + Daily Check-In (field users only) ──
            Single unified card. Office plan (start/finish/duration) + today\u2019s
            check-in form + Resume button — all in one box. Status MUST be
            explicitly picked every visit (no auto-default). If BEHIND, days
            and reason are required before the workflow opens. */}
        {isFieldUser && (
          <section
            className={`bg-[var(--card-bg)] border-2 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden transition-all ${
              canResume
                ? 'border-[var(--brand-gold)]/30'
                : 'border-amber-500/40 ring-4 ring-amber-500/10'
            }`}
          >
            <div
              className={`absolute top-0 right-0 w-96 h-96 blur-[100px] -mr-48 -mt-48 pointer-events-none ${
                canResume ? 'bg-[var(--brand-gold)]/5' : 'bg-amber-500/10'
              }`}
            />

            <div className="relative z-10 space-y-8">
              {/* Header */}
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-5">
                  <div
                    className={`p-4 rounded-2xl border ${
                      canResume
                        ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30'
                        : 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {canResume ? (
                      <CalendarClock className="w-7 h-7 text-[var(--brand-gold)]" />
                    ) : (
                      <Lock className="w-7 h-7 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${
                        canResume ? 'text-[var(--brand-gold)]' : 'text-amber-500'
                      }`}
                    >
                      {canResume
                        ? 'Schedule & Today\u2019s Check-In'
                        : 'Confirm Status to Continue'}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] uppercase italic tracking-tight leading-none">
                      Daily Schedule Check-In
                    </h2>
                  </div>
                </div>
                {updatedToday && job.fieldForecast && (
                  <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                      Last update{' '}
                      {new Date(job.fieldForecast.updatedAt).toLocaleTimeString(
                        [],
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Office Plan (Start / Finish / Estimate) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--card-border)]">
                  <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                    <Calendar size={10} className="text-[var(--brand-gold)]" /> Start
                  </p>
                  <p className="text-base font-black text-[var(--text-primary)]">
                    {job.plannedStartDate
                      ? new Date(job.plannedStartDate).toLocaleDateString()
                      : 'TBD'}
                  </p>
                </div>
                <div className="p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--card-border)]">
                  <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                    <Clock size={10} className="text-[var(--brand-gold)]" /> Finish
                  </p>
                  <p className="text-base font-black text-[var(--text-primary)]">
                    {job.plannedFinishDate
                      ? new Date(job.plannedFinishDate).toLocaleDateString()
                      : 'TBD'}
                  </p>
                </div>
                <div className="p-5 bg-[var(--brand-gold)]/10 rounded-2xl border border-[var(--brand-gold)]/30">
                  <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                    <CalendarClock size={10} /> Office Estimate
                  </p>
                  <p className="text-base font-black text-[var(--brand-gold)]">
                    {job.plannedDurationDays || 0} day
                    {(job.plannedDurationDays || 0) === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {/* Status Pills (no default \u2014 must pick) */}
              <div>
                <label className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-[0.25em] mb-4 block flex items-center gap-2">
                  How are you tracking today?
                  <span className="text-rose-500 text-sm">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ScheduleStatus.AHEAD,
                    ScheduleStatus.ON_SCHEDULE,
                    ScheduleStatus.BEHIND
                  ].map(status => {
                    const isAheadOpt = status === ScheduleStatus.AHEAD;
                    const isOnOpt = status === ScheduleStatus.ON_SCHEDULE;
                    const isBehindOpt = status === ScheduleStatus.BEHIND;
                    const isSelected = forecastStatus === status;
                    const selectedClass = isAheadOpt
                      ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                      : isOnOpt
                        ? 'bg-[var(--brand-gold)] text-black border-[var(--brand-gold)] shadow-[0_0_25px_rgba(196,164,50,0.4)]'
                        : 'bg-amber-500 text-black border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.4)]';
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          setForecastStatus(status);
                          // Clear delay reason when switching off BEHIND so
                          // the gate doesn\u2019t hold a stale Weather reason
                          // on a Now-On-Schedule check-in.
                          if (status !== ScheduleStatus.BEHIND) {
                            setDelayReason('');
                          }
                        }}
                        className={`py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2 transition-all flex flex-col items-center gap-2 ${
                          isSelected
                            ? selectedClass
                            : 'bg-[var(--bg-secondary)] text-[var(--muted-text)] border-[var(--card-border)] hover:border-[var(--brand-gold)]/40 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isAheadOpt && <TrendingUp size={20} />}
                        {isOnOpt && <Check size={20} />}
                        {isBehindOpt && <TrendingDown size={20} />}
                        {status.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BEHIND-only block: required days + reason */}
              {isBehind && (
                <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/30 space-y-6">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em] flex items-center gap-2">
                    <AlertCircle size={12} /> Behind \u2014 Tell Office Why
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.25em] flex items-center justify-between gap-2">
                        <span>
                          Days Remaining{' '}
                          <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-[var(--brand-gold)] normal-case tracking-tight font-bold">
                          office said {job.plannedDurationDays || 0}
                        </span>
                      </label>
                      <input
                        type="number"
                        value={daysRemaining}
                        onChange={e =>
                          setDaysRemaining(parseInt(e.target.value) || 0)
                        }
                        min={1}
                        className={`w-full bg-[var(--card-bg)] border-2 rounded-xl p-5 text-base font-black text-[var(--text-primary)] focus:outline-none transition-all shadow-inner ${
                          daysRemaining > 0
                            ? 'border-[var(--card-border)] focus:border-[var(--brand-gold)]'
                            : 'border-amber-500/40 focus:border-amber-500'
                        }`}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.25em]">
                        Reason <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={delayReason}
                        onChange={e => setDelayReason(e.target.value)}
                        className={`w-full bg-[var(--card-bg)] border-2 rounded-xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none appearance-none transition-all shadow-inner ${
                          delayReason
                            ? 'border-[var(--card-border)] focus:border-[var(--brand-gold)]'
                            : 'border-amber-500/40 focus:border-amber-500'
                        }`}
                      >
                        <option value="">Select reason\u2026</option>
                        <option value="Weather">Rain / Weather</option>
                        <option value="Materials">Material Delay</option>
                        <option value="Site Issue">Site Issue</option>
                        <option value="Crew">Crew Issue</option>
                        <option value="Inspection">Inspection</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Note (always visible, optional) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.25em]">
                  Note for Office (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Waiting on railing delivery, expecting tomorrow"
                  value={forecastNote}
                  onChange={e => setForecastNote(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl p-5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--muted-text)]/40 focus:outline-none focus:border-[var(--brand-gold)] transition-all shadow-inner"
                />
              </div>

              {/* Submit + open workflow */}
              <button
                onClick={() => handleSubmitDailyCheckIn(true)}
                disabled={!canResume || isUpdatingForecast}
                className={`w-full py-7 rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] transition-all active:scale-95 flex items-center justify-center gap-4 group ${
                  canResume && !isUpdatingForecast
                    ? 'bg-[var(--brand-gold)] text-black hover:opacity-90 shadow-[0_25px_60px_rgba(196,164,50,0.35)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--muted-text)] border border-[var(--card-border)] cursor-not-allowed opacity-60'
                }`}
              >
                <Play size={16} className={canResume ? 'fill-current group-hover:scale-110 transition-transform' : 'opacity-40'} />
                {isUpdatingForecast
                  ? 'Saving\u2026'
                  : !forecastStatus
                    ? 'Select status to continue'
                    : isBehind && (!daysRemaining || !delayReason)
                      ? 'Enter days + reason to continue'
                      : `Save & ${job.currentStage > 0 ? 'Resume' : 'Start'} Workflow`}
              </button>
            </div>
          </section>
        )}

        {/* Employee Time Clock */}
        {(user.role === Role.FIELD_EMPLOYEE || user.role === Role.SUBCONTRACTOR) && (
          <section
            
            
            
          >
            <TimeClockControls user={user} job={job} allJobs={allJobs} />
          </section>
        )}
          
          {/* Office Review Management panel removed — Jack confirmed there's
              no actual office review step in the workflow. Pipeline stages +
              checklists drive completion now. */}

          <section 
            
            
            
            
            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand-gold)]/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                  <Calendar size={14} className="text-[var(--brand-gold)]" /> Schedule
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-[var(--text-primary)]">Start: {job.plannedStartDate || 'TBD'}</p>
                  <p className="text-sm font-bold text-[var(--muted-text)]">Finish: {job.plannedFinishDate || 'TBD'}</p>
                </div>
                <div className="inline-flex items-center px-2 py-1 bg-[var(--bg-primary)]/20 rounded-lg border border-[var(--card-border)] text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                  {job.plannedDurationDays || 0} Working Days
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                  <Users size={14} className="text-[var(--brand-gold)]" /> Assignment
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-[var(--text-primary)]">{job.assignedCrewOrSubcontractor || 'Unassigned'}</p>
                  <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                    Lead: {APP_USERS.find(u => u.id === job.assignedUsers?.[0])?.name || 'None'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-10">
          {/* Scope Summary */}
          <section 
            
            
            
            className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--card-border)]"
          >
            <h3 className="text-xs font-black text-[var(--muted-text)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileText size={14} /> Scope Summary
            </h3>
            <p className="text-[var(--text-primary)] leading-relaxed font-medium">
              {job.scopeSummary}
            </p>
          </section>

          {/* ── Site Checklist (from estimator) ── */}
          {job.estimatorIntake?.checklist && (
            <section className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center gap-2">
                <ClipboardCheck size={13} className="text-[var(--brand-gold)]" />
                <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Site Checklist</h3>
              </div>
              <div className="px-6 py-4 grid grid-cols-2 gap-3">
                {([
                  ['elevationConfirmed', 'Elevation Confirmed'],
                  ['accessConfirmed', 'Site Access Confirmed'],
                  ['removalRequired', 'Removal / Disposal'],
                  ['helicalPileAccess', 'Helical Pile Access'],
                  ['obstaclesIdentified', 'Obstacles Identified'],
                  ['permitRequired', 'Permit Required'],
                ] as [string, string][]).map(([key, label]) => {
                  const val = (job.estimatorIntake!.checklist as unknown as Record<string, boolean | string | undefined>)[key];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${val ? 'bg-[var(--brand-gold)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}>
                        {val && <Check className="w-2.5 h-2.5 text-black" />}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                    </div>
                  );
                })}
              </div>
              {(job.estimatorIntake.checklist.elevationMeasurement || job.estimatorIntake.notes) && (
                <div className="px-6 pb-4 space-y-1 border-t border-[var(--border-color)] pt-3">
                  {job.estimatorIntake.checklist.elevationMeasurement && (
                    <p className="text-xs text-[var(--text-tertiary)]">Elevation: <span className="text-[var(--text-primary)] font-semibold">{job.estimatorIntake.checklist.elevationMeasurement}</span></p>
                  )}
                  {job.estimatorIntake.notes && (
                    <p className="text-xs text-[var(--text-tertiary)] italic">"{job.estimatorIntake.notes}"</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Build Specifications / Digital Work Order ──
              Same full DWO view the office sees, minus any pricing. Installers
              and subcontractors see deck type, height, footings, framing, deck
              board + colour, railing, stairs, skirting, electrical, site access
              + delivery notes, scope notes & add-ons — everything they need to
              execute. Subcontractors hide Schedule & Crew (they only know
              their own assignment, not the full crew list). */}
          <BuildSpecsPanel
            job={job}
            showScheduleAndCrew={user.role !== Role.SUBCONTRACTOR}
          />

          {/* Handoff Package - Grouped for Scannability (legacy buildDetails card kept for older jobs) */}
          <div className="grid grid-cols-1 gap-10">
            {/* Build Specifications (legacy — shown only when no new unified card above) */}
            {job.buildDetails && false && (
              <section 
                
                
                
                className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-[var(--card-border)] backdrop-blur-md relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-12 relative z-10">
                  <div>
                    <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-2 flex items-center gap-3">
                      <Ruler size={16} /> Handoff Package
                    </h3>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Build Specifications</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                  {/* Site & Foundation */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] border-b border-[var(--card-border)] pb-4">Site & Foundation</h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Footing Type</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.footings?.type || 'N/A'}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Bracket</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.footings?.bracketType || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-3">
                          {job.buildDetails?.footings?.attachedToHouse && <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase rounded-xl border border-blue-500/20 tracking-widest">Attached</span>}
                          {job.buildDetails?.footings?.floating && <span className="px-4 py-1.5 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase rounded-xl border border-amber-500/20 tracking-widest">Floating</span>}
                          {job.buildDetails?.sitePrep?.permitsRequired && <span className="px-4 py-1.5 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase rounded-xl border border-purple-500/20 tracking-widest">Permit Req.</span>}
                        </div>
                      </div>
                  </div>

                  {/* Framing */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] border-b border-[var(--card-border)] pb-4">Framing</h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Lumber</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.framing?.type || 'N/A'}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Joists</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.framing?.joistSize} @ {job.buildDetails?.framing?.joistSpacing}</p>
                        </div>
                        {job.buildDetails?.framing?.joistProtection && (
                          <div className="col-span-2 space-y-2">
                            <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Protection</p>
                            <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.framing?.joistProtectionType}</p>
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Decking & Railing */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] border-b border-[var(--card-border)] pb-4">Decking & Railing</h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Material</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.decking?.brand} {job.buildDetails?.decking?.type}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Color</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.decking?.color}</p>
                        </div>
                        {job.buildDetails?.railing?.included && (
                          <div className="col-span-2 space-y-2">
                            <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Railing</p>
                            <p className="text-base font-bold text-[var(--text-primary)]">{job.buildDetails?.railing?.type}</p>
                          </div>
                        )}
                      </div>
                  </div>

                  {/* Stairs & Skirting */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] border-b border-[var(--card-border)] pb-4">Stairs & Skirting</h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Stairs</p>
                        <p className={`text-base font-bold ${job.buildDetails?.stairs?.included ? 'text-[var(--text-primary)]' : 'text-[var(--muted-text)] italic'}`}>
                          {job.buildDetails?.stairs?.included ? job.buildDetails?.stairs?.style : 'None'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Skirting</p>
                        <p className={`text-base font-bold ${job.buildDetails?.skirting?.included ? 'text-[var(--text-primary)]' : 'text-[var(--muted-text)] italic'}`}>
                          {job.buildDetails?.skirting?.included ? job.buildDetails?.skirting?.type : 'None'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {job.buildDetails?.features?.customNotes && (
                  <div className="mt-12 p-8 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--card-border)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--brand-gold)]/30" />
                    <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-4">Build Notes</p>
                    <p className="text-base text-[var(--text-primary)] leading-relaxed font-medium italic">"{job.buildDetails.features.customNotes}"</p>
                  </div>
                )}
              </section>
            )}

            {/* Site Notes & Files Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Site Notes */}
              <section 
                
                
                
                className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--card-border)] backdrop-blur-md"
              >
                <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <MessageSquare size={16} /> Site Notes
                </h3>
                <div className="space-y-6">
                  {job.siteNotes && job.siteNotes.length > 0 ? (
                    job.siteNotes.map(note => (
                      <div key={note.id} className="bg-[var(--bg-secondary)] rounded-[2rem] p-6 border border-[var(--card-border)] hover:border-[var(--brand-gold)]/20 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-[var(--brand-gold)]/20 flex items-center justify-center text-[11px] font-black text-[var(--brand-gold)] border border-[var(--brand-gold)]/20">
                              {note.author.charAt(0)}
                            </div>
                            <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">{note.author}</span>
                          </div>
                          <span className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest">{note.timestamp ? new Date(note.timestamp).toLocaleDateString() : 'TBD'}</span>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed italic">"{note.text}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 rounded-[2rem] border border-dashed border-[var(--card-border)] flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.3em]">No site notes logged yet</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Job Files */}
              <section 
                
                
                
                className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--card-border)] backdrop-blur-md"
              >
                <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <Paperclip size={16} /> Job Files
                </h3>
                <div className="space-y-4">
                  {job.files && job.files.length > 0 ? (
                    job.files.map(file => (
                      <a 
                        key={file.id}
                        href={file.url}
                        className="flex items-center p-5 rounded-[2rem] border border-[var(--card-border)] bg-[var(--bg-secondary)] hover:bg-[var(--brand-gold)]/10 hover:border-[var(--brand-gold)]/30 transition-all group"
                      >
                        <div className="h-12 w-12 rounded-2xl bg-[var(--card-bg)] shadow-inner flex items-center justify-center mr-5 group-hover:scale-110 transition-transform border border-[var(--card-border)]">
                          {file.type === 'drawing' && <Ruler className="h-6 w-6 text-[var(--brand-gold)]" />}
                          {file.type === 'permit' && <ShieldCheck className="h-6 w-6 text-blue-500" />}
                          {file.type === 'photo' && <Camera className="h-6 w-6 text-purple-500" />}
                          {file.type === 'other' && <FileText className="h-6 w-6 text-[var(--text-secondary)]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-gold)] transition-colors uppercase tracking-tight">{file.name}</p>
                          <p className="text-[9px] text-[var(--muted-text)] uppercase font-black tracking-[0.2em] mt-1">{file.type}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[var(--muted-text)] group-hover:text-[var(--text-primary)] transition-all" />
                      </a>
                    ))
                  ) : (
                    <div className="p-12 rounded-[2rem] border border-dashed border-[var(--card-border)] flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.3em]">No files attached to this job</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Scheduling & Timeline Section \u2014 admin/manager only.
              Field users see all of this (start/finish/duration + their
              daily check-in form) consolidated in the gate card up top, so
              this section is redundant for them. */}
          {isAdminOrManager && (
          <section



            className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-[var(--card-border)] backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-2 flex items-center gap-3">
                  <History size={16} /> Timeline Forecast
                </h3>
                <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Scheduling & Progress</h2>
              </div>
              {job.officialScheduleStatus && (
                <span className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg ${
                  job.officialScheduleStatus === ScheduleStatus.ON_SCHEDULE ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold-light)] border-[var(--brand-gold)]/20' :
                  job.officialScheduleStatus === ScheduleStatus.BEHIND ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {job.officialScheduleStatus.replace('_', ' ')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-8">
                <div className="p-8 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--card-border)] shadow-inner">
                  <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.3em] mb-6">Official Schedule</p>
                  <div className="flex items-center justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-[var(--brand-gold)]" />
                        <p className="text-sm font-bold text-[var(--text-primary)]">Start: {job.plannedStartDate ? new Date(job.plannedStartDate).toLocaleDateString() : 'Not Set'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock size={14} className="text-[var(--brand-gold)]" />
                        <p className="text-sm font-bold text-[var(--text-primary)]">Finish: {job.plannedFinishDate ? new Date(job.plannedFinishDate).toLocaleDateString() : 'Not Set'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[var(--brand-gold)] uppercase italic tracking-tighter leading-none">{job.plannedDurationDays || 0}</p>
                      <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] mt-1">Planned Days</p>
                    </div>
                  </div>
                </div>

                {isAdminOrManager && (
                  <div className="p-8 bg-[var(--brand-gold)]/5 rounded-[2rem] border border-[var(--brand-gold)]/20">
                    <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-6">Office Schedule Control</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Start Date</label>
                        <input 
                          type="date" 
                          value={job.plannedStartDate || ''}
                          onChange={(e) => onUpdateSchedule?.(job.id, { plannedStartDate: e.target.value })}
                          className="w-full bg-[var(--bg-primary)]/50 border border-[var(--card-border)] rounded-xl p-4 text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)] transition-all"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Duration (Days)</label>
                        <input 
                          type="number" 
                          value={job.plannedDurationDays || 0}
                          onChange={(e) => onUpdateSchedule?.(job.id, { plannedDurationDays: parseInt(e.target.value) })}
                          className="w-full bg-[var(--bg-primary)]/50 border border-[var(--card-border)] rounded-xl p-4 text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Field Forecast Display (Office View) */}
                {isAdminOrManager && job.fieldForecast && (
                  <div className="p-8 bg-amber-500/5 rounded-[2rem] border border-amber-500/20 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 p-4">
                      <AlertCircle className="w-6 h-6 text-amber-500 opacity-20" />
                    </div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-6">Latest Field Forecast</p>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${job.fieldForecast.status === ScheduleStatus.BEHIND ? 'bg-amber-500/20' : 'bg-[var(--brand-gold)]/20'}`}>
                          {job.fieldForecast.status === ScheduleStatus.BEHIND ? <TrendingDown className="w-6 h-6 text-amber-500" /> : <TrendingUp className="w-6 h-6 text-[var(--brand-gold)]" />}
                        </div>
                        <span className="text-lg font-black text-[var(--text-primary)] uppercase italic tracking-tight">{job.fieldForecast.status.replace('_', ' ')}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-amber-500 uppercase italic tracking-tighter leading-none">{job.fieldForecast.estimatedDaysRemaining}</p>
                        <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-[0.2em] mt-1">Est. Remaining</p>
                      </div>
                    </div>
                    {job.fieldForecast.delayReason && (
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest">Reason:</span>
                        <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">{job.fieldForecast.delayReason}</span>
                      </div>
                    )}
                    {job.fieldForecast.note && (
                      <p className="text-sm text-amber-200/70 italic leading-relaxed mb-8 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">"{job.fieldForecast.note}"</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          const newFinish = new Date();
                          newFinish.setDate(newFinish.getDate() + job.fieldForecast!.estimatedDaysRemaining);
                          const finishStr = newFinish.toISOString().split('T')[0];

                          let newDuration = job.plannedDurationDays;
                          if (job.plannedStartDate) {
                            const start = new Date(job.plannedStartDate);
                            newDuration = Math.ceil((newFinish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          }

                          onUpdateSchedule?.(job.id, {
                            officialScheduleStatus: job.fieldForecast!.status,
                            plannedFinishDate: finishStr,
                            plannedDurationDays: newDuration,
                            fieldForecast: undefined
                          });
                        }}
                        className="w-full py-5 bg-amber-600 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-amber-500 transition-all active:scale-95 shadow-[0_15px_40px_rgba(217,119,6,0.3)]"
                      >
                        Apply to Official Schedule
                      </button>
                      <button
                        onClick={() => onConfirmFieldForecast?.(job.id)}
                        className="w-full py-5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:border-[var(--brand-gold)]/40 transition-all active:scale-95"
                        title="Mark this schedule change as reviewed without changing the official dates"
                      >
                        Acknowledge — Keep Dates
                      </button>
                    </div>
                  </div>
                )}

                {/* Field Update Form removed \u2014 the Daily Schedule Check-In
                    gate at the top of the file is now the single source for
                    field timeline updates. Office still sees the Latest Field
                    Forecast review card above when REVIEW_NEEDED. */}
              </div>
            </div>
          </section>
          )}
          {/* Execution Status */}
            <section 
              
              
              
              className="bg-[var(--card-bg)] rounded-[2.5rem] p-8 shadow-2xl border border-[var(--card-border)] backdrop-blur-md"
            >
              <h3 className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <Play size={14} className="text-[var(--brand-gold)] fill-current" /> Project Health
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-6 rounded-[2rem] bg-[var(--bg-secondary)] border border-[var(--card-border)] group hover:border-[var(--brand-gold)]/30 transition-all">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] mb-2">Current Stage</span>
                    <span className="text-lg font-black text-[var(--text-primary)] uppercase italic tracking-tight">Stage {job.currentStage} of 5</span>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center shadow-[0_0_20px_rgba(196,164,50,0.1)]">
                    <span className="text-xs font-black text-[var(--brand-gold)]">{Math.round((job.currentStage / 5) * 100)}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-6 rounded-[2rem] bg-[var(--bg-secondary)] border border-[var(--card-border)] group hover:border-white/20 transition-all">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] mb-2">Customer Sign-off</span>
                    <span className={`text-lg font-black uppercase italic tracking-tight ${job.signoffStatus === 'signed' ? 'text-[var(--brand-gold)]' : 'text-[var(--muted-text)]'}`}>
                      {job.signoffStatus === 'signed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  {job.signoffStatus === 'signed' ? (
                    <CheckCircle2 className="h-8 w-8 text-[var(--brand-gold)]" />
                  ) : (
                    <Clock className="h-8 w-8 text-[var(--muted-text)] group-hover:text-[var(--text-primary)] transition-colors" />
                  )}
                </div>

                {job.flaggedIssues && job.flaggedIssues.length > 0 && (
                  <div className="sm:col-span-2 flex items-center justify-between p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 animate-pulse">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="w-6 h-6 text-rose-500" />
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Active Flagged Issues</span>
                    </div>
                    <span className="text-xl font-black text-rose-500 italic">{job.flaggedIssues.length}</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <QuickMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          onSend={handleSendMessage}
          clientName={job.clientName}
          clientPhone={user.role === Role.ADMIN ? job.clientPhone : undefined}
          clientEmail={job.clientEmail}
          initialType={messageType}
          job={job}
          messageType={messageType}
          disableEmail={!isAdminOrManager}
        />
    </div>
  );
};

export default JobDetailView;
