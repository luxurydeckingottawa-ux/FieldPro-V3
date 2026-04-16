import React, { useState } from 'react';

import { Job, User, Role, OfficeReviewStatus, ScheduleStatus, FieldScheduleForecast } from '../types';
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
  Settings,
  History,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  Users,
  Mail,
  ExternalLink
} from 'lucide-react';
import QuickMessageModal from '../components/QuickMessageModal';
import { COMPANY } from '../config/company';

interface JobDetailViewProps {
  job: Job;
  user: User;
  onBack: () => void;
  onOpenWorkflow: (job: Job) => void;
  onUpdateOfficeReviewStatus?: (jobId: string, status: OfficeReviewStatus) => void;
  onUpdateSchedule?: (jobId: string, updates: Partial<Job>) => void;
  onUpdateFieldForecast?: (jobId: string, forecast: Partial<FieldScheduleForecast>) => void;
  onSendMessage?: (sessionId: string, text: string) => void;
  allJobs?: Job[];
}

const JobDetailView: React.FC<JobDetailViewProps> = ({ 
  job, 
  user, 
  onBack, 
  onOpenWorkflow,
  onUpdateOfficeReviewStatus,
  onUpdateSchedule,
  onUpdateFieldForecast,
  onSendMessage,
  allJobs = []
}) => {
  const isAdminOrManager = user.role === Role.ADMIN;
  
  // Field-side form state
  const [forecastStatus, setForecastStatus] = useState<ScheduleStatus>(job.fieldForecast?.status || ScheduleStatus.ON_SCHEDULE);
  const [daysRemaining, setDaysRemaining] = useState<number>(job.fieldForecast?.estimatedDaysRemaining || job.plannedDurationDays || 0);
  const [delayReason, setDelayReason] = useState<string>(job.fieldForecast?.delayReason || '');
  const [forecastNote, setForecastNote] = useState<string>(job.fieldForecast?.note || '');
  const [isUpdatingForecast, setIsUpdatingForecast] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms');

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
                <button
                  onClick={() => onOpenWorkflow(job)}
                  className="flex items-center justify-center gap-4 px-10 py-6 bg-[var(--brand-gold)] text-black rounded-[2rem] text-sm font-black uppercase tracking-[0.3em] hover:bg-[var(--brand-gold)] transition-all shadow-[0_20px_50px_rgba(180,148,30,0.3)] active:scale-95 group"
                >
                  <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
                  <span>{job.currentStage > 0 ? 'Resume Workflow' : 'Start Workflow'}</span>
                </button>
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

        {/* Employee Time Clock */}
        {(user.role === Role.FIELD_EMPLOYEE || user.role === Role.SUBCONTRACTOR) && (
          <section
            
            
            
          >
            <TimeClockControls user={user} job={job} allJobs={allJobs} />
          </section>
        )}
          
          {/* Office Control Panel (Admin/Manager only) */}
          {isAdminOrManager && (
            <section 
              
              
              
              className="bg-white/[0.03] rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 backdrop-blur-md"
            >
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-[var(--brand-gold)]/10 flex items-center justify-center border border-[var(--brand-gold)]/20 shadow-[0_0_20px_rgba(196,164,50,0.1)]">
                  <Settings className="h-7 w-7 text-[var(--brand-gold)]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em] mb-1">Office Control</p>
                  <h2 className="text-xl font-black text-white tracking-tight italic uppercase">Review Management</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Status:</span>
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                  {[
                    { id: OfficeReviewStatus.NOT_READY, label: 'Pending' },
                    { id: OfficeReviewStatus.READY_FOR_REVIEW, label: 'Ready' },
                    { id: OfficeReviewStatus.UNDER_REVIEW, label: 'Reviewing' },
                    { id: OfficeReviewStatus.REVIEW_COMPLETE, label: 'Done' },
                  ].map((status) => (
                    <button
                      key={status.id}
                      onClick={() => onUpdateOfficeReviewStatus?.(job.id, status.id)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        job.officeReviewStatus === status.id 
                          ? 'bg-[var(--brand-gold)] text-black shadow-[0_0_15px_rgba(196,164,50,0.3)]' 
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

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
                  const val = (job.estimatorIntake!.checklist as any)[key];
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

          {/* ── Digital Work Order ── */}
          {(job.buildDetails || job.digitalWorkOrder) && (
            <section className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em] mb-0.5 flex items-center gap-1.5">
                    <Ruler size={11} /> Build Specifications
                  </p>
                  <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight italic">Digital Work Order</h3>
                </div>
                <span className="text-[8px] font-black bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20 px-2.5 py-1 rounded uppercase tracking-widest">Handoff Ready</span>
              </div>
              <div className="divide-y divide-[var(--border-color)]">

                {/* Foundation */}
                {(job.buildDetails?.footings || job.digitalWorkOrder?.footingType) && (
                  <div className="px-6 py-4">
                    <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Site & Foundation</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {(job.buildDetails?.footings?.type || job.digitalWorkOrder?.footingType) && (
                        <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Footing Type</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.footings?.type || job.digitalWorkOrder?.footingType}</p></div>
                      )}
                      {(job.buildDetails?.footings?.bracketType || job.digitalWorkOrder?.footingSystem) && (
                        <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Bracket / System</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.footings?.bracketType || job.digitalWorkOrder?.footingSystem}</p></div>
                      )}
                      {job.estimatorIntake?.measureSheet?.footingCount > 0 && (
                        <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Quantity</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.footingCount} pcs</p></div>
                      )}
                      <div className="col-span-2 flex flex-wrap gap-1.5">
                        {job.buildDetails?.footings?.attachedToHouse && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">Attached to House</span>}
                        {job.buildDetails?.footings?.floating && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Floating</span>}
                        {job.buildDetails?.sitePrep?.permitsRequired && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase tracking-widest">Permit Required</span>}
                        {job.buildDetails?.sitePrep?.locatesRequired && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-widest">Locates Required</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Framing */}
                {job.buildDetails?.framing && (
                  <div className="px-6 py-4">
                    <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Framing & Structure</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {job.buildDetails.framing.type && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Frame Type</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails.framing.type}</p></div>}
                      {(job.buildDetails.framing.joistSize || job.buildDetails.framing.joistSpacing) && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Joists</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails.framing.joistSize}{job.buildDetails.framing.joistSpacing ? ` @ ${job.buildDetails.framing.joistSpacing}` : ''}</p></div>}
                      {job.buildDetails.framing.joistProtection && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Joist Protection</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails.framing.joistProtectionType || 'Yes'}</p></div>}
                      {job.estimatorIntake?.measureSheet?.deckSqft > 0 && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Deck Area</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.deckSqft} sqft</p></div>}
                    </div>
                  </div>
                )}

                {/* Decking */}
                {(job.buildDetails?.decking || job.digitalWorkOrder?.deckingMaterial) && (
                  <div className="px-6 py-4">
                    <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Decking</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Material</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.decking ? `${job.buildDetails.decking.brand} ${job.buildDetails.decking.type}`.trim() : job.digitalWorkOrder?.deckingMaterial}</p></div>
                      {job.buildDetails?.decking?.color && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Colour</p><p className="text-sm font-bold text-[var(--brand-gold)]">{job.buildDetails.decking.color}</p></div>}
                      {job.estimatorIntake?.measureSheet?.deckSqft > 0 && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Area</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.deckSqft} sqft</p></div>}
                      {job.estimatorIntake?.measureSheet?.fasciaLf > 0 && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Fascia</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.fasciaLf} lf</p></div>}
                    </div>
                  </div>
                )}

                {/* Railing */}
                {(job.buildDetails?.railing?.included || job.digitalWorkOrder?.railingType) && (
                  <div className="px-6 py-4">
                    <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Railing</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Type</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.railing?.type || job.digitalWorkOrder?.railingType}</p></div>
                      {job.estimatorIntake?.measureSheet?.woodRailingLf > 0 && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Linear Feet</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.woodRailingLf} lf</p></div>}
                    </div>
                  </div>
                )}

                {/* Stairs */}
                {(job.buildDetails?.stairs?.included || job.digitalWorkOrder?.stairs) && (
                  <div className="px-6 py-4">
                    <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Stairs</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Style</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.stairs?.style || job.digitalWorkOrder?.stairs}</p></div>
                      {job.estimatorIntake?.measureSheet?.stairLf > 0 && <div><p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Steps</p><p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.stairLf}</p></div>}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {job.buildDetails?.features?.customNotes && (
                  <div className="px-6 py-4 bg-[var(--bg-secondary)]">
                    <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2">Build Notes</p>
                    <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">"{job.buildDetails.features.customNotes}"</p>
                  </div>
                )}

                {/* Site Access (from digitalWorkOrder) */}
                {(job.digitalWorkOrder?.siteAccessNotes || job.digitalWorkOrder?.parkingNotes) && (
                  <div className="px-6 py-4">
                    <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Site Access</p>
                    {job.digitalWorkOrder.siteAccessNotes && <p className="text-xs text-[var(--text-secondary)] mb-2">{job.digitalWorkOrder.siteAccessNotes}</p>}
                    {job.digitalWorkOrder.parkingNotes && <p className="text-[9px] text-[var(--text-tertiary)]">Parking: {job.digitalWorkOrder.parkingNotes}</p>}
                  </div>
                )}
              </div>
            </section>
          )}

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

          {/* Scheduling & Timeline Section */}
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
                  </div>
                )}

                {/* Field Update Form (Field View) */}
                {!isAdminOrManager && (
                  <div className="p-8 bg-[var(--bg-secondary)] rounded-[2rem] border border-[var(--card-border)] shadow-inner">
                    <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.3em] mb-8">Timeline Forecast Update</p>
                    <div className="space-y-8">
                      <div>
                        <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] mb-4 block">Current Status</label>
                        <div className="grid grid-cols-3 gap-3">
                          {[ScheduleStatus.AHEAD, ScheduleStatus.ON_SCHEDULE, ScheduleStatus.BEHIND].map(status => (
                            <button
                              key={status}
                              onClick={() => setForecastStatus(status)}
                              className={`py-4 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${
                                forecastStatus === status 
                                  ? 'bg-[var(--brand-gold)] text-black border-[var(--brand-gold)] shadow-[0_0_20px_rgba(196,164,50,0.4)]' 
                                  : 'bg-[var(--card-bg)] text-[var(--muted-text)] border-[var(--card-border)] hover:border-[var(--brand-gold)]/30'
                              }`}
                            >
                              {status.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Days Remaining</label>
                          <input 
                            type="number" 
                            value={daysRemaining}
                            onChange={(e) => setDaysRemaining(parseInt(e.target.value))}
                            className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)] transition-all shadow-inner"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Delay Reason</label>
                          <div className="relative">
                            <select 
                              value={delayReason}
                              onChange={(e) => setDelayReason(e.target.value)}
                              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)] appearance-none transition-all shadow-inner"
                            >
                              <option value="" className="bg-[var(--bg-primary)]">None / N/A</option>
                              <option value="Weather" className="bg-[var(--bg-primary)]">Rain / Weather</option>
                              <option value="Materials" className="bg-[var(--bg-primary)]">Material Delay</option>
                              <option value="Site Issue" className="bg-[var(--bg-primary)]">Site Issue</option>
                              <option value="Crew" className="bg-[var(--bg-primary)]">Crew Issue</option>
                              <option value="Inspection" className="bg-[var(--bg-primary)]">Inspection</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">Short Note (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Waiting on railing delivery"
                          value={forecastNote}
                          onChange={(e) => setForecastNote(e.target.value)}
                          className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--muted-text)]/30 focus:outline-none focus:border-[var(--brand-gold)] transition-all shadow-inner"
                        />
                      </div>

                      <button 
                        onClick={() => {
                          setIsUpdatingForecast(true);
                          onUpdateFieldForecast?.(job.id, {
                            status: forecastStatus,
                            estimatedDaysRemaining: daysRemaining,
                            delayReason,
                            note: forecastNote
                          });
                          setTimeout(() => setIsUpdatingForecast(false), 1000);
                        }}
                        disabled={isUpdatingForecast}
                        className="w-full py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl font-black uppercase tracking-[0.3em] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                      >
                        {isUpdatingForecast ? 'Updating...' : 'Submit Timeline Forecast'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
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
