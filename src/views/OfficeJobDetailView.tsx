import React, { useMemo, useState } from 'react';

import {
  Job,
  PipelineStage,
  Role,
  FieldStatus,
  CompletionPackageStatus,
  PhotoCompletionStatus,
  CompletionReadinessStatus,
  OfficeReviewStatus,
  ScheduleStatus,
  CustomerLifecycle,
  DepositStatus,
  Invoice,
  InvoiceType,
} from '../types';
import { printInvoice } from '../utils/invoiceUtils';
import { PIPELINE_STAGES, APP_USERS, PAGE_TITLES, createDefaultBuildDetails } from '../constants';
import JobSummaryCard from '../components/JobSummaryCard';
import PortalSharingCard from '../components/PortalSharingCard';
import QuickMessageModal from '../components/QuickMessageModal';
import CustomerChatThread from '../components/CustomerChatThread';
import { getJobIssues } from '../utils/issueLogic';
import { timeClockService } from '../services/TimeClockService';
import { 
  Edit2,
  Settings,
  Save,
  Plus,
  Trash2,
  ArrowLeft, 
  FileText, 
  MessageSquare, 
  Mail,
  Paperclip, 
  Play,
  CheckCircle2,
  AlertTriangle,
  Ruler,
  ShieldCheck,
  Camera,
  CheckSquare,
  History,
  Users,
  Download,
  ExternalLink,
  ClipboardCheck,
  ClipboardList,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronUp,

  Hammer,
  Zap,
  Info,
  Phone,
  Construction,
  Layers,

  X,
  Activity,
  BarChart3,
  Check,
  Sparkles,
  Loader2,
  CreditCard,
  DollarSign,
  Printer,
  Send,
} from 'lucide-react';
import { OfficeAIAssistant } from '../components/OfficeAIAssistant';
import { AIOfficeInsights } from '../components/AIOfficeInsights';
import CustomerActionPanel from '../components/CustomerActionPanel';
import { getCampaignTouches } from '../utils/dripCampaign';
import { calculateEngagementTier } from '../utils/engagementScoring';
import { generateBuildPassport } from '../utils/buildPassportGenerator';

interface OfficeJobDetailViewProps {
  job: Job;
  allJobs?: Job[];
  onBack: () => void;
  onUpdatePipelineStage: (jobId: string, newStage: PipelineStage) => void;
  onUpdateOfficeChecklist: (jobId: string, stage: PipelineStage, itemId: string, completed: boolean, isNA?: boolean) => void;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
  onUpdateSchedule: (jobId: string, updates: Partial<Job>) => void;
  onOpenFieldWorkflow: (job: Job) => void;
  onSendMessage: (sessionId: string, text: string) => void;
  onPreviewPortal: (job: Job) => void;
  onDeleteJob?: (jobId: string) => void;
  onOpenJobSetup?: () => void;
  onGenerateInvoice?: (job: Job, type: InvoiceType) => void;
  onGenerateAndSendInvoice?: (job: Job, type: InvoiceType) => Invoice | void;
  jobInvoices?: Invoice[];
}

const OfficeJobDetailView: React.FC<OfficeJobDetailViewProps> = ({
  job,
  allJobs = [],
  onBack,
  onUpdatePipelineStage,
  onUpdateOfficeChecklist,
  onUpdateJob,
  onUpdateSchedule,
  onOpenFieldWorkflow,
  onSendMessage,
  onPreviewPortal,
  onDeleteJob,
  onOpenJobSetup,
  onGenerateInvoice,
  onGenerateAndSendInvoice,
  jobInvoices = [],
}) => {
  const [showLiveStatusReport, setShowLiveStatusReport] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Job> | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms');
  const [pendingReminderMessage, setPendingReminderMessage] = useState<string>('');
  const [customerInfoCollapsed, setCustomerInfoCollapsed] = useState(false);
  const [officeNotesCollapsed, setOfficeNotesCollapsed] = useState(true);
  const [siteNotesCollapsed, setSiteNotesCollapsed] = useState(true);
  const [fieldAssignmentExpanded, setFieldAssignmentExpanded] = useState(false);
  const [paymentScheduleExpanded, setPaymentScheduleExpanded] = useState(false);
  const [invoiceSentFlash, setInvoiceSentFlash] = useState<string | null>(null);
  const [sendingLeadTouchId, setSendingLeadTouchId] = useState<string | null>(null);
  const [expandedLeadTouchId, setExpandedLeadTouchId] = useState<string | null>(null);
  const [leadTouchSentFeedback, setLeadTouchSentFeedback] = useState<string | null>(null);
  const [isGeneratingPassport, setIsGeneratingPassport] = useState(false);
  const [fieldNoteMeasurementsOpen, setFieldNoteMeasurementsOpen] = useState(false);
  const [fieldNotePhotosOpen, setFieldNotePhotosOpen] = useState(false);
  const [fieldNoteSketchOpen, setFieldNoteSketchOpen] = useState(false);
  const [attentionDismissed, setAttentionDismissed] = useState(false);

  const handleGenerateBuildPassport = async (): Promise<void> => {
    if (isGeneratingPassport) return;
    setIsGeneratingPassport(true);
    try {
      const dataUri = await generateBuildPassport(job);
      // window.open(dataUri) is blocked by modern browsers — convert to Blob URL instead
      const [header, base64] = dataUri.split(',');
      const mime = (header.match(/:(.*?);/) ?? [])[1] ?? 'application/pdf';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // Popup blocked — fall back to direct download
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Luxury-Decking-Build-Passport-${job.jobNumber ?? job.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      // Release blob URL after 30s (enough time for browser to load it)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } finally {
      setIsGeneratingPassport(false);
    }
  };

  const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === job.pipelineStage);
  const currentStageInfo = stageIndex !== -1 ? PIPELINE_STAGES[stageIndex] : null;

  const isEstimateStage = [
    PipelineStage.LEAD_IN,
    PipelineStage.FIRST_CONTACT,
    PipelineStage.SECOND_CONTACT,
    PipelineStage.THIRD_CONTACT,
    PipelineStage.LEAD_ON_HOLD,
    PipelineStage.LEAD_WON,
    PipelineStage.LEAD_LOST,
    PipelineStage.EST_UNSCHEDULED,
    PipelineStage.EST_SCHEDULED,
    PipelineStage.EST_IN_PROGRESS,
    PipelineStage.EST_COMPLETED,
    PipelineStage.EST_SENT,
    PipelineStage.EST_ON_HOLD,
    PipelineStage.EST_APPROVED,
    PipelineStage.EST_REJECTED,
    // Legacy stages
    PipelineStage.SITE_VISIT_SCHEDULED,
    PipelineStage.ESTIMATE_IN_PROGRESS,
    PipelineStage.ESTIMATE_SENT,
    PipelineStage.FOLLOW_UP
  ].includes(job.pipelineStage);

  const currentChecklist = job.officeChecklists?.find(cl => cl.stage === job.pipelineStage);
  const isStageComplete = currentChecklist?.items?.every(item => item.completed) ?? false;
  const leadUser = APP_USERS.find(u => u.id === job.assignedUsers?.[0]);

  const issues = useMemo(() => getJobIssues(job), [job]);

  // Self-healing document list. Even if job.files lost the contract /
  // invoice attachments somewhere along the lifecycle (e.g. legacy data,
  // failed Supabase persist), surface them by deriving from their
  // canonical sources: job.contractPdfUrl + jobInvoices. Dedupes by id +
  // by url so a properly-attached file isn't double-rendered.
  const displayFiles = useMemo(() => {
    type FileEntry = { id: string; name: string; url: string; type: string; uploadedAt: string; uploadedBy?: string; derived?: boolean };
    const persisted: FileEntry[] = (job.files || []).map(f => ({ ...f, uploadedAt: f.uploadedAt || new Date().toISOString() }));
    const out: FileEntry[] = [...persisted];
    const seenUrls = new Set(persisted.map(f => f.url).filter(Boolean));
    const seenIds = new Set(persisted.map(f => f.id));

    // Derived: contract
    if (job.contractPdfUrl && !seenUrls.has(job.contractPdfUrl)) {
      const id = `derived-contract-${job.id}`;
      if (!seenIds.has(id) && !persisted.some(f => f.type === 'contract')) {
        out.push({
          id, name: `Contract-${job.jobNumber || job.id}.pdf`,
          url: job.contractPdfUrl, type: 'contract',
          uploadedAt: job.contractSignedDate || job.acceptedDate || new Date().toISOString(),
          derived: true,
        });
      }
    }

    // Derived: invoices (one entry per invoice that isn't already in files)
    for (const inv of jobInvoices) {
      if (!inv.pdfUrl) continue;
      if (seenUrls.has(inv.pdfUrl)) continue;
      const id = `derived-inv-${inv.id}`;
      if (seenIds.has(id)) continue;
      out.push({
        id,
        name: `${inv.invoiceNumber || 'Invoice'}.pdf`,
        url: inv.pdfUrl,
        type: 'other',
        uploadedAt: inv.issuedDate || new Date().toISOString(),
        derived: true,
      });
    }

    return out;
  }, [job.files, job.contractPdfUrl, job.contractSignedDate, job.acceptedDate, job.jobNumber, job.id, jobInvoices]);

  const labourSummary = useMemo(() => timeClockService.getLabourSummary(job.id), [job.id]);

  const leadCampaignTouches = useMemo(() => {
    if (!job.dripCampaign || job.dripCampaign.campaignType !== 'LEAD_FOLLOW_UP') return [];
    return getCampaignTouches('LEAD_FOLLOW_UP', job, job.portalEngagement);
  }, [job]);

  const handleSendLeadTouch = async (touchId: string, channel: 'sms' | 'email' | 'sms+email', smsBody: string, emailBody: string, subject?: string) => {
    if (!job.clientPhone && !job.clientEmail) return;
    setSendingLeadTouchId(touchId);
    try {
      const sends: Promise<Response>[] = [];
      if ((channel === 'sms' || channel === 'sms+email') && job.clientPhone) {
        sends.push(fetch('/.netlify/functions/send-sms', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: job.clientPhone, message: smsBody }),
        }));
      }
      if ((channel === 'email' || channel === 'sms+email') && job.clientEmail) {
        const htmlBody = emailBody.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>');
        sends.push(fetch('/.netlify/functions/send-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: job.clientEmail, subject: subject || 'Luxury Decking Follow-Up', htmlBody }),
        }));
      }
      await Promise.all(sends);
      const tier = calculateEngagementTier(job.portalEngagement).tier;
      const updatedCampaign = {
        ...job.dripCampaign!,
        completedTouches: [...(job.dripCampaign!.completedTouches || []), touchId],
        sentMessages: [...(job.dripCampaign!.sentMessages || []), {
          touchId,
          channel: (channel === 'sms+email' ? 'sms' : channel) as 'sms' | 'email',
          sentAt: new Date().toISOString(),
          engagementTier: tier,
        }],
      };
      onUpdateJob(job.id, { dripCampaign: updatedCampaign });
      setLeadTouchSentFeedback(touchId);
      setTimeout(() => setLeadTouchSentFeedback(null), 3000);
    } catch (err) { console.error('Failed to send lead touch:', err); }
    finally { setSendingLeadTouchId(null); }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
      case 'signed':
      case 'submitted':
      case 'confirmed':
      case 'ready':
      case 'received_ready':
      case 'review_complete':
        return 'text-[var(--brand-gold)] bg-[var(--brand-gold)]/5 border-[var(--brand-gold)]/10';
      case 'pending':
      case 'not_submitted':
      case 'not_confirmed':
      case 'not_ready':
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'needs_attention':
        return 'text-rose-600 bg-rose-50 border-rose-100';
      default:
        return 'text-[var(--text-tertiary)] bg-gray-50 border-gray-100';
    }
  };

  const getScheduleStatusColor = (status?: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.ON_SCHEDULE: return 'text-[var(--brand-gold)] bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/20';
      case ScheduleStatus.AHEAD: return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
      case ScheduleStatus.BEHIND: return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case ScheduleStatus.DELAYED: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-[var(--text-tertiary)] bg-gray-500/10 border-gray-500/20';
    }
  };

  const hasScheduleDiscrepancy = useMemo(() => {
    if (!job.fieldForecast) return false;
    return job.fieldForecast.status !== job.officialScheduleStatus;
  }, [job.fieldForecast, job.officialScheduleStatus]);

  const engagementHeat = useMemo(() => {
    if (!job.portalEngagement) return 'cold';
    const { totalOpens, totalTimeSpentSeconds, lastOpenedAt } = job.portalEngagement;
    const lastOpenedDate = lastOpenedAt ? new Date(lastOpenedAt) : null;
    const isRecentlyOpened = lastOpenedDate && (new Date().getTime() - lastOpenedDate.getTime()) < 24 * 60 * 60 * 1000;
    if (totalOpens > 5 || totalTimeSpentSeconds > 300 || isRecentlyOpened) return 'hot';
    if (totalOpens > 2 || totalTimeSpentSeconds > 60) return 'warm';
    return 'cold';
  }, [job.portalEngagement]);


  return (
    <div


      className="flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen"
    >
      {/* Header / Navigation */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] p-4 shrink-0 sticky top-0 z-40 backdrop-blur-xl bg-[var(--bg-primary)]/80">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-[var(--bg-secondary)] rounded-xl transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-[var(--border-color)] mx-2 hidden md:block" />
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-2 py-0.5 rounded border border-[var(--brand-gold)]/20">
                  {job.jobNumber}
                </span>
                <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight uppercase italic">{job.clientName}</h1>
                {job.finalSubmissionStatus === 'submitted' && (
                  <span className="text-[9px] font-black text-white uppercase tracking-widest bg-[var(--brand-gold)] px-2 py-0.5 rounded border border-[var(--brand-gold)]/20 flex items-center gap-1 shadow-lg shadow-[var(--brand-gold)]/20">
                    <CheckCircle2 size={10} /> Submitted from Field
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-widest">
                {job.projectType}
              </p>
            </div>
          </div>

          {/* Pipeline Tracker */}
          <div className="hidden lg:flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCurrent = stage.id === job.pipelineStage;
              const isPast = PIPELINE_STAGES.findIndex(s => s.id === job.pipelineStage) > idx;
              
              return (
                <div key={stage.id} className="flex items-center">
                  <button
                    onClick={() => onUpdatePipelineStage(job.id, stage.id)}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      isCurrent
                        ? 'bg-[var(--brand-gold)] text-black shadow-sm'
                        : isPast
                          ? 'text-[var(--brand-gold)] hover:text-[var(--brand-gold-light)]'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {stage.label}
                  </button>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-[var(--text-primary)] mx-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {(job.pipelineStage === PipelineStage.IN_FIELD || job.pipelineStage === PipelineStage.COMPLETION) && (
              <>
                <button
                  onClick={() => setShowLiveStatusReport(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-tertiary)] transition-all shadow-md"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Status
                </button>
                <button 
                  onClick={() => onOpenFieldWorkflow(job)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--brand-gold)] transition-all shadow-lg shadow-[var(--brand-gold)]/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Field View
                </button>
              </>
            )}
            {onDeleteJob && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${job.clientName || 'this job'}? This cannot be undone.`)) {
                    onDeleteJob(job.id);
                  }
                }}
                className="p-2 text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Delete Job"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
        <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* LEFT SIDEBAR: utility/reference boxes — sticky */}
          <div className="space-y-4">

            {/* Job Summary Card — top of sidebar */}
            <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
              <JobSummaryCard
                job={job}
                onOpenMessageModal={(type) => {
                  setMessageType(type);
                  setIsMessageModalOpen(true);
                }}
                onEditAssignment={() => {
                  setEditFormData({
                    assignedUsers: job.assignedUsers,
                    assignedCrewOrSubcontractor: job.assignedCrewOrSubcontractor,
                    plannedStartDate: job.plannedStartDate,
                    plannedDurationDays: job.plannedDurationDays,
                    plannedFinishDate: job.plannedFinishDate,
                    officialScheduleStatus: job.officialScheduleStatus
                  });
                  setEditingSection('schedule');
                }}
                onUpdateJob={onUpdateJob}
              />
            </section>

            {/* AI Assistant Section */}
            {isEstimateStage && (
              <OfficeAIAssistant job={job} onUpdateJob={onUpdateJob} />
            )}

            {/* Field Assignment */}
            {!isEstimateStage && (
              <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    onClick={() => setFieldAssignmentExpanded(prev => !prev)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Users size={12} className="text-[var(--brand-gold)] shrink-0" />
                    <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Field Assignment</h3>
                    <ChevronDown size={12} className={`text-[var(--text-tertiary)] transition-transform ml-auto shrink-0 ${fieldAssignmentExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {fieldAssignmentExpanded && (
                    <button
                      onClick={() => {
                        setEditFormData({
                          assignedUsers: job.assignedUsers,
                          assignedCrewOrSubcontractor: job.assignedCrewOrSubcontractor,
                          plannedStartDate: job.plannedStartDate,
                          plannedDurationDays: job.plannedDurationDays,
                          plannedFinishDate: job.plannedFinishDate,
                          officialScheduleStatus: job.officialScheduleStatus
                        });
                        setEditingSection('schedule');
                      }}
                      className="text-[9px] font-black text-[var(--brand-gold)] hover:opacity-70 uppercase tracking-widest transition-opacity ml-3 shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {fieldAssignmentExpanded && (
                <div className="px-5 pb-4 space-y-3 border-t border-[var(--border-color)] pt-4">
                  {/* Crew */}
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Crew / Subcontractor</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {job.assignedCrewOrSubcontractor || leadUser?.name || <span className="text-[var(--text-tertiary)] italic font-normal text-xs">Unassigned</span>}
                    </p>
                  </div>
                  {/* Schedule row */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5">
                      <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Start</p>
                      <p className="text-[11px] font-bold text-[var(--text-primary)]">{job.plannedStartDate || <span className="text-[var(--text-tertiary)]">TBD</span>}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5">
                      <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Days</p>
                      <p className="text-[11px] font-bold text-[var(--text-primary)]">{job.plannedDurationDays ? `${job.plannedDurationDays}d` : <span className="text-[var(--text-tertiary)]">—</span>}</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2.5">
                      <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Finish</p>
                      <p className="text-[11px] font-bold text-[var(--text-primary)]">{job.plannedFinishDate || <span className="text-[var(--text-tertiary)]">TBD</span>}</p>
                    </div>
                  </div>
                  {/* Schedule status badge */}
                  {job.officialScheduleStatus && (
                    <div className="pt-1">
                      <span className={`inline-flex text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getScheduleStatusColor(job.officialScheduleStatus)}`}>
                        {job.officialScheduleStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>
                )}
              </section>
            )}

            {/* Customer Experience Portal Sharing */}
            <PortalSharingCard
              job={job}
              allJobs={allJobs}
              isEstimateStage={isEstimateStage}
              onPreviewPortal={onPreviewPortal}
            />

            {/* Text-thread bubble — full SMS history + compose box. Available
                at every lifecycle stage so office can chase leads, confirm
                appointments, answer build-stage questions, all from one place. */}
            <CustomerChatThread
              clientName={job.clientName}
              clientPhone={job.clientPhone}
              jobId={job.id}
            />

            {/* Payment Schedule */}
            {!isEstimateStage && (
              <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
                <button
                  onClick={() => setPaymentScheduleExpanded(prev => !prev)}
                  className="w-full flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={12} className="text-[var(--brand-gold)]" />
                    <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Payment Schedule</span>
                  </div>
                  <ChevronDown size={12} className={`text-[var(--text-tertiary)] transition-transform ${paymentScheduleExpanded ? 'rotate-180' : ''}`} />
                </button>
                {paymentScheduleExpanded && (() => {
                  const base = job.estimateAmount || 0;
                  const depositPaid = !!(job.depositReceivedDate || job.depositStatus === DepositStatus.RECEIVED);
                  const materialPaid = [PipelineStage.IN_FIELD, PipelineStage.COMPLETION, PipelineStage.PAID_CLOSED].includes(job.pipelineStage);
                  const finalPaid = job.pipelineStage === PipelineStage.PAID_CLOSED;

                  const milestones: Array<{ label: string; sub: string; pct: number; paid: boolean; invoiceType: InvoiceType }> = [
                    { label: 'Deposit', sub: 'Due on signing', pct: 0.30, paid: depositPaid, invoiceType: 'deposit' },
                    { label: 'Material Delivery', sub: 'Due on delivery', pct: 0.30, paid: materialPaid, invoiceType: 'material_delivery' },
                    { label: 'Full Completion', sub: 'Due on completion', pct: 0.40, paid: finalPaid, invoiceType: 'final_payment' },
                  ];

                  const totalPaid = milestones.filter(m => m.paid).reduce((s, m) => s + Math.round(base * m.pct), 0);
                  const totalOutstanding = milestones.filter(m => !m.paid).reduce((s, m) => s + Math.round(base * m.pct), 0);

                  return (
                    <div>
                      <div className="divide-y divide-[var(--border-color)]">
                        {milestones.map((m, i) => {
                          const existingInv = jobInvoices.find(inv => inv.type === m.invoiceType);
                          return (
                          <div key={i} className={`px-5 py-3 transition-colors ${m.paid ? 'bg-[var(--bg-secondary)]/50' : ''}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${m.paid ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'}`}>
                                  {m.paid && <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[10px] font-black uppercase tracking-widest leading-none ${m.paid ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                                    {m.label} <span className="font-normal text-[var(--text-tertiary)]">({Math.round(m.pct * 100)}%)</span>
                                  </p>
                                  <p className="text-[8px] text-[var(--text-tertiary)] mt-0.5">{m.sub}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-sm font-black font-mono ${m.paid ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                                  ${Math.round(base * m.pct).toLocaleString()}
                                </span>
                                {existingInv ? (
                                  <div className="flex items-center gap-1">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                                      existingInv.status === 'paid'
                                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                                        : existingInv.status === 'sent'
                                        ? 'bg-amber-500/15 text-amber-500 border-amber-500/25'
                                        : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-color)]'
                                    }`}>
                                      {existingInv.invoiceNumber}
                                    </span>
                                    <button
                                      onClick={() => printInvoice(existingInv)}
                                      title="Print Invoice"
                                      className="p-1 rounded-lg border border-[var(--border-color)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/20 transition-all"
                                    >
                                      <Printer size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  (onGenerateAndSendInvoice || onGenerateInvoice) && (
                                    invoiceSentFlash === m.invoiceType ? (
                                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">
                                        <Check size={9} strokeWidth={3} /> Sent
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (onGenerateAndSendInvoice) {
                                            onGenerateAndSendInvoice(job, m.invoiceType);
                                          } else if (onGenerateInvoice) {
                                            onGenerateInvoice(job, m.invoiceType);
                                          }
                                          setInvoiceSentFlash(m.invoiceType);
                                          setTimeout(() => setInvoiceSentFlash(null), 2400);
                                        }}
                                        title="Generate the invoice and mark it sent in one step"
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--brand-gold)]/25 bg-[var(--brand-gold)]/8 text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/15 transition-all text-[8px] font-black uppercase tracking-widest"
                                      >
                                        <Send size={9} />
                                        Generate &amp; Send
                                      </button>
                                    )
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                      {/* Summary footer */}
                      <div className="px-5 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] space-y-1.5">
                        {totalPaid > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Collected</span>
                            <span className="text-xs font-black text-emerald-500 font-mono">${totalPaid.toLocaleString()}</span>
                          </div>
                        )}
                        {totalOutstanding > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Outstanding</span>
                            <span className="text-xs font-black text-[var(--text-primary)] font-mono">${totalOutstanding.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {/* Payment Reminder SMS */}
                      <div className="px-5 pt-3 pb-1">
                        <button
                          onClick={() => {
                            const firstName = job.clientName?.split(' ')[0] || job.clientName || 'there';
                            const reminder = `Hi ${firstName}, just a friendly reminder that a payment is due on your ${job.jobNumber || 'project'} project. Please reach out if you have any questions. \u2013 Luxury Decking`;
                            setPendingReminderMessage(reminder);
                            setMessageType('sms');
                            setIsMessageModalOpen(true);
                          }}
                          className="w-full py-2.5 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/25 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/15 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={11} /> Send Payment Reminder
                        </button>
                      </div>
                      {/* Stripe CTA */}
                      <div className="px-5 pb-4 pt-1">
                        <button
                          disabled
                          className="w-full py-2.5 bg-[var(--brand-gold)]/8 border border-[var(--brand-gold)]/15 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--brand-gold)]/40 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <CreditCard size={11} /> Send Payment Request via Stripe
                        </button>
                        <p className="text-[8px] text-[var(--text-tertiary)] text-center mt-2 leading-relaxed">Connect Stripe in Settings to send secure payment links via SMS</p>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* Office Notes */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare size={13} className="text-[var(--brand-gold)]" /> Office Notes
                  {job.officeNotes && job.officeNotes.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[9px] font-black rounded border border-[var(--border-color)]">{job.officeNotes.length}</span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[var(--brand-gold)]/20 transition-all border border-[var(--brand-gold)]/20">
                    Add
                  </button>
                  <button
                    onClick={() => setOfficeNotesCollapsed(prev => !prev)}
                    className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <ChevronDown size={12} className={officeNotesCollapsed ? 'rotate-[-90deg]' : ''} />
                  </button>
                </div>
              </div>
              {!officeNotesCollapsed && (
                <div className="px-5 pb-5 border-t border-[var(--border-color)] pt-4 space-y-3">
                  {job.officeNotes && job.officeNotes.length > 0 ? (
                    job.officeNotes.map(note => (
                      <div key={note.id} className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-color)]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{note.author}</span>
                          <span className="text-[9px] font-black text-[var(--muted-text)]">{new Date(note.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">{note.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest text-center py-3">No office notes yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Site Notes */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={13} className="text-[var(--brand-gold)]" /> Site Notes
                  {job.siteNotes && job.siteNotes.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] text-[9px] font-black rounded">{job.siteNotes.length}</span>
                  )}
                </h3>
                <button
                  onClick={() => setSiteNotesCollapsed(prev => !prev)}
                  className="p-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                  <ChevronDown size={12} className={siteNotesCollapsed ? 'rotate-[-90deg]' : ''} />
                </button>
              </div>
              {!siteNotesCollapsed && (
                <div className="px-5 pb-5 border-t border-[var(--border-color)] pt-4 space-y-3">
                  {job.siteNotes && job.siteNotes.length > 0 ? (
                    job.siteNotes.map(note => (
                      <div key={note.id} className="bg-[var(--brand-gold)]/5 rounded-xl p-4 border border-[var(--brand-gold)]/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest">{note.author}</span>
                          <span className="text-[9px] font-black text-[var(--brand-gold)]/40">{new Date(note.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed italic">"{note.text}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest text-center py-3">No field notes yet.</p>
                  )}
                </div>
              )}
            </div>


            {/* Estimator Field Notes — sidebar card */}
            {job.estimatorIntake && (
              <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center gap-2">
                  <ClipboardCheck size={13} className="text-[var(--brand-gold)]" />
                  <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Estimator Field Notes</h3>
                </div>

                {/* Site Checklist — always visible */}
                <div className="px-5 py-4 space-y-2">
                  {([
                    ['elevationConfirmed', 'Elevation Confirmed'],
                    ['accessConfirmed', 'Site Access Confirmed'],
                    ['removalRequired', 'Removal/Disposal Required'],
                    ['helicalPileAccess', 'Helical Pile Access'],
                    ['obstaclesIdentified', 'Obstacles Identified'],
                    ['permitRequired', 'Permit Required'],
                  ] as [string, string][]).map(([key, label]) => {
                    const val = (job.estimatorIntake!.checklist as unknown as Record<string, boolean | string | undefined>)[key];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${val ? 'bg-[var(--brand-gold)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}>
                          {val && <Check className="w-2 h-2 text-black" />}
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)]">{label}</span>
                      </div>
                    );
                  })}
                  {job.estimatorIntake.checklist.elevationMeasurement && (
                    <p className="text-[10px] text-[var(--text-tertiary)] pt-1">Elevation: <span className="text-[var(--text-primary)]">{job.estimatorIntake.checklist.elevationMeasurement}</span></p>
                  )}
                  {job.estimatorIntake.notes && (
                    <p className="text-[10px] text-[var(--text-tertiary)] italic leading-relaxed pt-1 border-t border-[var(--border-color)] mt-2">"{job.estimatorIntake.notes}"</p>
                  )}
                </div>

                {/* Site Measurements — collapsible */}
                {job.estimatorIntake.measureSheet && (
                  <div className="border-t border-[var(--border-color)]">
                    <button
                      onClick={() => setFieldNoteMeasurementsOpen(prev => !prev)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Site Measurements</span>
                      <ChevronDown size={12} className={`text-[var(--text-tertiary)] transition-transform ${fieldNoteMeasurementsOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {fieldNoteMeasurementsOpen && (
                      <div className="px-5 pb-4 space-y-1">
                        {job.estimatorIntake.measureSheet.deckSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Deck Area</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.deckSqft} sqft</span></div>}
                        {job.estimatorIntake.measureSheet.footingCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Footings ({job.estimatorIntake.measureSheet.footingType})</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.footingCount} pcs</span></div>}
                        {job.estimatorIntake.measureSheet.fasciaLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Fascia</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.fasciaLf} lf</span></div>}
                        {job.estimatorIntake.measureSheet.woodRailingLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Railing</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.woodRailingLf} lf</span></div>}
                        {job.estimatorIntake.measureSheet.stairLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Stairs</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.stairLf} steps</span></div>}
                        {job.estimatorIntake.measureSheet.skirtingSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Skirting</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.skirtingSqft} sqft</span></div>}
                        {job.estimatorIntake.measureSheet.privacyWallLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Privacy Wall</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.privacyWallLf} lf</span></div>}
                        {job.estimatorIntake.measureSheet.lightingFixtures > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Lighting</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.lightingFixtures} pcs</span></div>}
                        {job.estimatorIntake.measureSheet.removeDispose && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Demo/Removal</span><span className="text-[10px] font-semibold text-amber-400">Yes{job.estimatorIntake.measureSheet.demoSqft > 0 ? ` (${job.estimatorIntake.measureSheet.demoSqft} sqft)` : ''}</span></div>}
                        {job.estimatorIntake.measureSheet.permitRequired && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Permit</span><span className="text-[10px] font-semibold text-amber-400">Required</span></div>}
                      </div>
                    )}
                  </div>
                )}

                {/* Site Photos — collapsible */}
                {job.estimatorIntake.photos && job.estimatorIntake.photos.length > 0 && (
                  <div className="border-t border-[var(--border-color)]">
                    <button
                      onClick={() => setFieldNotePhotosOpen(prev => !prev)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Site Photos ({job.estimatorIntake.photos.length})</span>
                      <ChevronDown size={12} className={`text-[var(--text-tertiary)] transition-transform ${fieldNotePhotosOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {fieldNotePhotosOpen && (
                      <div className="px-5 pb-4 grid grid-cols-2 gap-2">
                        {job.estimatorIntake.photos.map(photo => (
                          <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                            <img src={photo.url} alt={photo.category} className="w-full h-20 object-cover rounded-lg border border-[var(--border-color)] hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Site Sketch — collapsible */}
                {job.estimatorIntake.sketch && job.estimatorIntake.sketch.strokes && job.estimatorIntake.sketch.strokes.length > 0 && (
                  <div className="border-t border-[var(--border-color)]">
                    <button
                      onClick={() => setFieldNoteSketchOpen(prev => !prev)}
                      className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Site Sketch</span>
                      <ChevronDown size={12} className={`text-[var(--text-tertiary)] transition-transform ${fieldNoteSketchOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {fieldNoteSketchOpen && (
                      <div className="px-5 pb-4">
                        <div className="bg-white rounded-xl overflow-hidden">
                          <svg viewBox="0 0 400 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
                            {job.estimatorIntake.sketch.strokes.map((stroke, i) => {
                              const pts: string[] = [];
                              for (let j = 0; j < stroke.points.length; j += 2) {
                                pts.push(`${stroke.points[j]},${stroke.points[j + 1]}`);
                              }
                              return (
                                <polyline key={i} points={pts.join(' ')} fill="none"
                                  stroke={stroke.color || '#000'} strokeWidth={stroke.width || 2}
                                  strokeLinecap="round" strokeLinejoin="round" />
                              );
                            })}
                            {job.estimatorIntake.sketch.labels?.map(label => (
                              <text key={label.id} x={label.x} y={label.y} fontSize="12" fill="#333">{label.text}</text>
                            ))}
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Job Files & Documents Package */}
            <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] -mr-24 -mt-24 pointer-events-none" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                    <Paperclip size={14} className="text-[var(--brand-gold)]" /> Job Files & Documents
                  </h3>
                  <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight italic">Construction Package</h2>
                </div>
                <button
                  onClick={() => {
                    setEditingSection('files');
                  }}
                  className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
                >
                  Manage Files
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                {displayFiles.length > 0 ? (
                  <>
                    {[
                      { type: 'estimate', label: 'Itemized Estimate', icon: ClipboardList, color: 'text-[var(--brand-gold)]' },
                      { type: 'contract', label: 'Signed Contract', icon: FileText, color: 'text-[var(--brand-gold)]' },
                      { type: 'drawing', label: 'Technical Drawings & Plans', icon: Ruler, color: 'text-[var(--brand-gold)]' },
                      { type: 'permit', label: 'Permits & Legal', icon: ShieldCheck, color: 'text-blue-400' },
                      { type: 'closeout', label: 'Closeout & Warranty Packages', icon: ClipboardCheck, color: 'text-amber-400' },
                      { type: 'photo', label: 'Site & Progress Photos', icon: Camera, color: 'text-purple-400' },
                      { type: 'other', label: 'Other Documents', icon: FileText, color: 'text-[var(--text-tertiary)]' }
                    ].map(group => {
                      const groupFiles = displayFiles.filter(f => f.type === group.type);
                      if (groupFiles.length === 0) return null;

                      return (
                        <div key={group.type} className="space-y-3">
                          <div className="flex items-center gap-2 px-1">
                            <group.icon className={`w-3.5 h-3.5 ${group.color}`} />
                            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{group.label}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {groupFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (!file.url) return;
                                  if (file.url.startsWith('data:text/html')) {
                                    const [, base64] = file.url.split(',');
                                    try {
                                      const html = atob(base64);
                                      const blob = new Blob([html], { type: 'text/html' });
                                      const blobUrl = URL.createObjectURL(blob);
                                      window.open(blobUrl, '_blank');
                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                                    } catch { window.open(file.url, '_blank'); }
                                  } else if (file.url.startsWith('data:application/pdf') || file.url.startsWith('data:')) {
                                    try {
                                      const [, base64] = file.url.split(',');
                                      const binary = atob(base64);
                                      const bytes = new Uint8Array(binary.length);
                                      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                      const mimeMatch = file.url.match(/^data:([^;]+)/);
                                      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                                      const blob = new Blob([bytes], { type: mime });
                                      const blobUrl = URL.createObjectURL(blob);
                                      window.open(blobUrl, '_blank');
                                      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
                                    } catch { window.open(file.url, '_blank'); }
                                  } else {
                                    window.open(file.url, '_blank');
                                  }
                                }}
                                className={`flex items-center p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--brand-gold)]/30 transition-all group ${file.url ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                              >
                                <div className="h-10 w-10 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center mr-4 group-hover:border-[var(--brand-gold)]/30 transition-all">
                                  <group.icon className={`h-4 w-4 ${group.color}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-gold)] transition-colors">{file.name}</p>
                                  <p className="text-[8px] text-[var(--muted-text)] uppercase font-black tracking-[0.2em] mt-0.5">
                                    {new Date(file.uploadedAt).toLocaleDateString()}
                                    {!file.url && ' · Pending attachment'}
                                  </p>
                                </div>
                                {file.url && <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-all" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-12 rounded-[2rem] border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-center bg-[var(--bg-secondary)]">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                      <Paperclip className="w-6 h-6 text-[var(--text-tertiary)]" />
                    </div>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">No files attached to this job package</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-2 max-w-[200px]">Upload plans, permits, or site photos to build the work order.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Customer Action Required — office-controlled portal prompts */}
            {!isEstimateStage && (
              <CustomerActionPanel job={job} onUpdateJob={onUpdateJob} />
            )}

            {/* AI Office Insights — bottom of sidebar */}
            {!isEstimateStage && (
              <AIOfficeInsights job={job} onUpdateJob={onUpdateJob} />
            )}
          </div>

          {/* RIGHT MAIN CONTENT: action/work area */}
          <div className="space-y-6 min-w-0">

            {/* ── ATTENTION BANNER ─────────────────────────────────── */}
            {(() => {
              const flags: { label: string; severity: 'red' | 'amber' }[] = [];

              // Contact info
              if (!job.clientPhone && !job.clientEmail) {
                flags.push({ label: 'No contact info on file', severity: 'red' });
              } else {
                if (!job.clientPhone) flags.push({ label: 'Missing phone number', severity: 'amber' });
                if (!job.clientEmail) flags.push({ label: 'Missing email', severity: 'amber' });
              }

              // Contract (non-estimate stages)
              if (!isEstimateStage && !job.contractSignedDate && !job.contractPdfUrl && !job.customerSignature) {
                flags.push({ label: 'Contract not signed', severity: 'red' });
              }

              // Deposit (pre-production only)
              if (job.pipelineStage === PipelineStage.PRE_PRODUCTION && !job.depositReceivedDate) {
                flags.push({ label: 'Deposit not collected', severity: 'red' });
              }

              // Start date
              if ((job.pipelineStage === PipelineStage.PRE_PRODUCTION || job.pipelineStage === PipelineStage.IN_FIELD) && !job.plannedStartDate) {
                flags.push({ label: 'No start date set', severity: 'amber' });
              }

              // Crew assignment
              if ((job.pipelineStage === PipelineStage.PRE_PRODUCTION || job.pipelineStage === PipelineStage.IN_FIELD) && !job.assignedCrewOrSubcontractor && (!job.assignedUsers || job.assignedUsers.length === 0)) {
                flags.push({ label: 'No crew assigned', severity: 'amber' });
              }

              // Permit required
              if (!isEstimateStage && job.estimatorIntake?.measureSheet?.permitRequired) {
                flags.push({ label: 'Permit required — confirm status', severity: 'amber' });
              }

              // Flagged issues
              if (job.flaggedIssues && job.flaggedIssues.length > 0) {
                flags.push({ label: `${job.flaggedIssues.length} flagged issue${job.flaggedIssues.length > 1 ? 's' : ''}`, severity: 'red' });
              }

              if (flags.length === 0 || attentionDismissed) return null;
              const hasRed = flags.some(f => f.severity === 'red');

              return (
                <div className={`rounded-2xl border px-5 py-4 flex items-center gap-3 flex-wrap ${hasRed ? 'bg-rose-500/[0.08] border-rose-500/25' : 'bg-amber-500/[0.08] border-amber-500/25'}`}>
                  <div className="flex items-center gap-2 shrink-0">
                    <AlertTriangle size={14} className={hasRed ? 'text-rose-400' : 'text-amber-400'} />
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${hasRed ? 'text-rose-400' : 'text-amber-400'}`}>
                      Needs Attention
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {flags.map((flag, i) => (
                      <span key={i} className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                        flag.severity === 'red'
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}>
                        {flag.label}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setAttentionDismissed(true)}
                    className="shrink-0 ml-auto p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })()}

            {/* Final Closeout & Warranty */}
            {(job.verifiedBuildPassportUrl || job.subcontractorInvoiceUrl ||
              job.pipelineStage === PipelineStage.COMPLETION ||
              job.pipelineStage === PipelineStage.PAID_CLOSED) && (
              <section
                className="bg-[var(--brand-gold)]/10 border-2 border-[var(--brand-gold)]/30 rounded-[2rem] p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/10 blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-xs font-black text-[var(--brand-gold)] uppercase tracking-widest mb-1 flex items-center gap-2">
                      <ShieldCheck size={14} /> Final Closeout & Warranty
                    </h3>
                    <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Luxury Decking Verified Build Passport</h2>
                    <p className="text-[10px] text-[var(--brand-gold)]/60 font-black uppercase tracking-widest mt-1">Official Project Documentation Package</p>
                  </div>
                  {(job.verifiedBuildPassportUrl || job.subcontractorInvoiceUrl) && (
                    <div className="px-4 py-2 rounded-xl bg-[var(--brand-gold)] text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--brand-gold)]/20">
                      <CheckCircle2 size={14} /> Package Submitted
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {/* Primary passport action — download if submitted, generate if not */}
                  {job.verifiedBuildPassportUrl ? (
                    <a
                      href={job.verifiedBuildPassportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-6 rounded-2xl bg-[var(--brand-gold)] border border-[var(--brand-gold)] hover:brightness-110 transition-all group shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-black/20 flex items-center justify-center text-black shadow-inner">
                          <ClipboardCheck size={28} />
                        </div>
                        <div className="text-left">
                          <p className="text-base font-black text-black uppercase tracking-tight italic">Luxury Decking Build Passport</p>
                          <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Field-Submitted · Includes Warranty</p>
                        </div>
                      </div>
                      <ExternalLink size={20} className="text-black/70 shrink-0" />
                    </a>
                  ) : (
                    <button
                      onClick={handleGenerateBuildPassport}
                      disabled={isGeneratingPassport}
                      className="flex items-center justify-between p-6 rounded-2xl bg-[var(--brand-gold)] border border-[var(--brand-gold)] hover:brightness-110 active:scale-95 transition-all group shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-black/20 flex items-center justify-center text-black shadow-inner">
                          {isGeneratingPassport
                            ? <Loader2 size={28} className="animate-spin" />
                            : <Sparkles size={28} />
                          }
                        </div>
                        <div className="text-left">
                          <p className="text-base font-black text-black uppercase tracking-tight italic">
                            {isGeneratingPassport ? 'Generating...' : 'Generate Build Passport'}
                          </p>
                          <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest">
                            Premium PDF with Warranty Certificate
                          </p>
                        </div>
                      </div>
                      {!isGeneratingPassport && (
                        <ExternalLink size={20} className="text-black/70 shrink-0" />
                      )}
                    </button>
                  )}

                  {job.subcontractorInvoiceUrl && (
                    <a
                      href={job.subcontractorInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-6 rounded-2xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 transition-all group shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                          <FileText size={28} />
                        </div>
                        <div>
                          <p className="text-base font-black text-white uppercase tracking-tight">Subcontractor Invoice</p>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Internal Billing Package</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Download size={20} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ExternalLink size={20} className="text-blue-400" />
                      </div>
                    </a>
                  )}

                  {/* When a field-submitted version exists, allow regenerating from current data */}
                  {job.verifiedBuildPassportUrl && (
                    <button
                      onClick={handleGenerateBuildPassport}
                      disabled={isGeneratingPassport}
                      className="md:col-span-2 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--brand-gold)] transition-colors disabled:opacity-40"
                    >
                      {isGeneratingPassport
                        ? <><Loader2 size={11} className="animate-spin" /> Regenerating...</>
                        : <><Sparkles size={11} /> Regenerate from current job data</>
                      }
                    </button>
                  )}
                </div>
              </section>
            )}
            

            {/* Proposal Engagement Tracking */}
            {isEstimateStage && job.portalEngagement && (
              <section
                
                
                
                className={`border rounded-[2.5rem] p-8 relative overflow-hidden group ${
                  engagementHeat === 'hot' ? 'bg-orange-500/5 border-orange-500/20' :
                  engagementHeat === 'warm' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <div className={`absolute top-0 right-0 w-96 h-96 blur-[100px] -mr-48 -mt-48 pointer-events-none ${
                  engagementHeat === 'hot' ? 'bg-orange-500/10' :
                  engagementHeat === 'warm' ? 'bg-amber-500/10' :
                  'bg-blue-500/10'
                }`} />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                      engagementHeat === 'hot' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                      engagementHeat === 'warm' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                      'bg-blue-500/10 border-blue-500/20 text-blue-500'
                    }`}>
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${
                        engagementHeat === 'hot' ? 'text-orange-500' :
                        engagementHeat === 'warm' ? 'text-amber-500' :
                        'text-blue-500'
                      }`}>Proposal Engagement</h3>
                      <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Customer Interest Signals</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${
                      engagementHeat === 'hot' ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20' :
                      engagementHeat === 'warm' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      <Zap size={14} /> {engagementHeat.toUpperCase()} LEAD
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                  <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total Opens</p>
                    <p className="text-2xl font-black text-[var(--text-primary)] italic">{job.portalEngagement.totalOpens}</p>
                    <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Portal Sessions</p>
                  </div>
                  <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Time Spent</p>
                    <p className="text-2xl font-black text-[var(--text-primary)] italic">{Math.floor(job.portalEngagement.totalTimeSpentSeconds / 60)}m {job.portalEngagement.totalTimeSpentSeconds % 60}s</p>
                    <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Total Attention</p>
                  </div>
                  <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Option Clicks</p>
                    <p className="text-2xl font-black text-[var(--text-primary)] italic">
                      {Object.values(job.portalEngagement.optionClicks || {}).reduce((a, b) => a + b, 0)}
                    </p>
                    <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Comparison Activity</p>
                  </div>
                  <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Last Activity</p>
                    <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight mt-2">
                      {job.portalEngagement.lastOpenedAt ? new Date(job.portalEngagement.lastOpenedAt).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Recency Signal</p>
                  </div>
                </div>

                {/* Interaction Breakdown */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                    <h4 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BarChart3 size={12} className="text-blue-500" /> Option Engagement
                    </h4>
                    <div className="space-y-2">
                      {job.estimateData?.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[var(--text-secondary)]">{opt.name}</span>
                          <div className="flex-1 mx-3 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${Math.min(100, (job.portalEngagement?.optionClicks?.[opt.id] || 0) * 20)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-[var(--text-primary)]">{job.portalEngagement?.optionClicks?.[opt.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                    <h4 className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={12} className="text-orange-500" /> Upgrade Interest
                    </h4>
                    <div className="space-y-2">
                      {job.estimateData?.addOns.slice(0, 3).map(addon => (
                        <div key={addon.id} className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[var(--text-secondary)]">{addon.name}</span>
                          <div className="flex-1 mx-3 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${Math.min(100, (job.portalEngagement?.addOnInteractions?.[addon.id] || 0) * 25)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-[var(--text-primary)]">{job.portalEngagement?.addOnInteractions?.[addon.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Production-stage engagement meter ────────────────────────
                Same philosophy as the estimate engagement card above but
                scoped for sold/production jobs: shows how often the customer
                is checking the build-stage portal (progress photos, timeline,
                payment schedule). A customer logging in daily during the
                build is a signal the office can use to time updates proactively. */}
            {!isEstimateStage && job.portalEngagement && job.portalEngagement.totalOpens > 0 && (() => {
              const e = job.portalEngagement!;
              const mins = Math.floor((e.totalTimeSpentSeconds || 0) / 60);
              const secs = (e.totalTimeSpentSeconds || 0) % 60;
              const daysSinceLast = e.lastOpenedAt
                ? Math.floor((Date.now() - new Date(e.lastOpenedAt).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              // Tier by visit cadence (simpler than the estimate version —
              // sold customers don't click "options" so we skip that dimension).
              const tier: 'hot' | 'warm' | 'cool' =
                (e.totalOpens >= 8 || (daysSinceLast !== null && daysSinceLast <= 1 && e.totalOpens >= 3))
                  ? 'hot'
                  : (e.totalOpens >= 3 || (daysSinceLast !== null && daysSinceLast <= 3))
                    ? 'warm'
                    : 'cool';
              // Static class map — Tailwind JIT requires fully literal class names.
              const tierStyles = {
                hot: {
                  section: 'bg-emerald-500/5 border-emerald-500/20',
                  glow: 'bg-emerald-500/10',
                  icon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
                  title: 'text-emerald-500',
                  badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                },
                warm: {
                  section: 'bg-amber-500/5 border-amber-500/20',
                  glow: 'bg-amber-500/10',
                  icon: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
                  title: 'text-amber-500',
                  badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                },
                cool: {
                  section: 'bg-blue-500/5 border-blue-500/20',
                  glow: 'bg-blue-500/10',
                  icon: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
                  title: 'text-blue-500',
                  badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                },
              }[tier];
              return (
                <section className={`border rounded-[2.5rem] p-8 relative overflow-hidden ${tierStyles.section}`}>
                  <div className={`absolute top-0 right-0 w-96 h-96 blur-[100px] -mr-48 -mt-48 pointer-events-none ${tierStyles.glow}`} />
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${tierStyles.icon}`}>
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${tierStyles.title}`}>
                          Portal Engagement
                        </h3>
                        <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">
                          Customer Check-Ins
                        </h2>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${tierStyles.badge}`}>
                      <Zap size={14} /> {tier} engagement
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                    <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total Visits</p>
                      <p className="text-2xl font-black text-[var(--text-primary)] italic">{e.totalOpens}</p>
                      <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Portal Opens</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Time Spent</p>
                      <p className="text-2xl font-black text-[var(--text-primary)] italic">{mins}m {secs}s</p>
                      <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Total Attention</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Last Visit</p>
                      <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight mt-2">
                        {daysSinceLast === 0 ? 'Today' :
                         daysSinceLast === 1 ? 'Yesterday' :
                         daysSinceLast !== null ? `${daysSinceLast}d ago` : 'N/A'}
                      </p>
                      <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Recency Signal</p>
                    </div>
                    <div className="p-4 bg-[var(--bg-primary)]/60 rounded-2xl border border-[var(--border-color)]">
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">First Opened</p>
                      <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight mt-2">
                        {e.firstOpenedAt ? new Date(e.firstOpenedAt).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-[8px] text-[var(--text-tertiary)] font-bold uppercase mt-1">Journey Start</p>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Lead Campaign Queue — intentionally hidden on Job Sold view; only relevant during estimate/lead stages */}
            {false && job.dripCampaign?.campaignType === 'LEAD_FOLLOW_UP' && leadCampaignTouches.length > 0 && (
              <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={13} className="text-[var(--brand-gold)]" />
                    <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em]">Lead Follow-Up Campaign</h3>
                  </div>
                  {(() => {
                    const tier = calculateEngagementTier(job.portalEngagement).tier;
                    const tierColors: Record<string, string> = {
                      HOT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                      WARM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                      COOL: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
                      COLD: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
                    };
                    return (
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${tierColors[tier] || tierColors.COLD}`}>
                        {tier} Engagement
                      </span>
                    );
                  })()}
                </div>
                <div className="p-4 space-y-2">
                  {leadCampaignTouches.map((touch) => {
                    const completedIds = new Set(job.dripCampaign?.completedTouches || []);
                    const isDone = completedIds.has(touch.id);
                    const isExpanded = expandedLeadTouchId === touch.id;
                    const isSending = sendingLeadTouchId === touch.id;
                    const justSent = leadTouchSentFeedback === touch.id;
                    const delayLabel = touch.delayDays === 0
                      ? (touch.delayMinutes ? `${touch.delayMinutes}m after` : 'Instant')
                      : `Day ${touch.delayDays}`;
                    const channelLabel = touch.channel === 'sms+email' ? 'SMS + Email' : touch.channel.toUpperCase();
                    return (
                      <div
                        key={touch.id}
                        className={`rounded-xl border transition-all ${
                          isDone
                            ? 'border-[var(--brand-gold)]/20 bg-[var(--brand-gold)]/5'
                            : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--brand-gold)]/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                            isDone ? 'bg-[var(--brand-gold)] text-black' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                          }`}>
                            {isDone ? <Check size={10} /> : touch.touchNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-wide">{delayLabel}</span>
                              <span className="text-[8px] font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded uppercase tracking-wider">{channelLabel}</span>
                              {touch.subject && (
                                <span className="text-[9px] text-[var(--text-tertiary)] truncate max-w-[180px]">{touch.subject}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(touch.emailTemplate || touch.smsTemplate) && (
                              <button
                                onClick={() => setExpandedLeadTouchId(isExpanded ? null : touch.id)}
                                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                            {isDone ? (
                              <span className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Sent</span>
                            ) : justSent ? (
                              <span className="text-[8px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                                <Check size={10} /> Sent!
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendLeadTouch(touch.id, touch.channel, touch.smsTemplate, touch.emailTemplate, touch.subject)}
                                disabled={isSending}
                                className="px-3 py-1.5 bg-[var(--brand-gold)] text-black text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--brand-gold-light)] transition-all disabled:opacity-50 flex items-center gap-1"
                              >
                                {isSending ? <Loader2 size={10} className="animate-spin" /> : <MessageSquare size={10} />}
                                Send
                              </button>
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-2 border-t border-[var(--border-color)] pt-3">
                            {touch.emailTemplate && (
                              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                  <Mail size={9} /> Email
                                  {touch.subject && <span className="text-[var(--text-tertiary)] normal-case font-normal ml-1">— {touch.subject}</span>}
                                </p>
                                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                  {touch.emailTemplate.length > 250 ? touch.emailTemplate.slice(0, 250) + '…' : touch.emailTemplate}
                                </p>
                              </div>
                            )}
                            {touch.smsTemplate && (
                              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                                <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                  <MessageSquare size={9} /> SMS
                                </p>
                                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">{touch.smsTemplate}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Sales & Estimating Profile */}
            {(job.lifecycleStage === CustomerLifecycle.ESTIMATE_IN_PROGRESS ||
              job.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ||
              job.lifecycleStage === CustomerLifecycle.FOLLOW_UP_NEEDED ||
              job.lifecycleStage === CustomerLifecycle.NEW_LEAD ||
              job.lifecycleStage === CustomerLifecycle.CONTACTED) && (
              <section
                
                
                
                className="bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] p-8 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Sales & Estimating</h3>
                      <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Client Profile & Site File</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest ${
                      job.estimateStatus === 'sent' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                      job.estimateStatus === 'accepted' ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {job.estimateStatus?.replace('_', ' ') || 'Lead'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  {/* Client Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] border-b border-[var(--border-color)] pb-2">
                      <Info size={14} className="text-blue-500" /> Contact Information
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] group-hover/item:text-blue-500 transition-colors">
                          <Mail size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Email Address</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{job.clientEmail || 'No email provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] group-hover/item:text-blue-500 transition-colors">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Phone Number</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{job.clientPhone || 'No phone provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] group-hover/item:text-blue-500 transition-colors">
                          <Zap size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Lead Source</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{job.leadSource || 'Website'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Site Assessment & Photos */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                        <Camera size={14} className="text-blue-500" /> Site Assessment Photos
                      </div>
                      <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                        Upload More
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {job.files?.filter(f => f.type === 'photo').length > 0 ? (
                        job.files.filter(f => f.type === 'photo').slice(0, 4).map((photo) => (
                          <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] relative group">
                            <img 
                              src={photo.url} 
                              alt={photo.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ExternalLink size={16} className="text-white" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-4 py-8 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-center">
                          <Camera className="w-8 h-8 text-[var(--text-tertiary)] mb-2" />
                          <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">No site photos yet</p>
                          <p className="text-[9px] text-[var(--text-tertiary)] mt-1">Estimators can upload house & site photos here</p>
                        </div>
                      )}
                    </div>

                    {job.siteNotes && job.siteNotes.length > 0 && (
                      <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                        <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                          <ClipboardCheck size={12} className="text-blue-500" /> Estimator Site Notes
                        </p>
                        <div className="space-y-3">
                          {job.siteNotes.slice(0, 2).map((note) => (
                            <div key={note.id} className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                              "{note.text}"
                              <span className="block text-[8px] font-black text-[var(--text-tertiary)] uppercase mt-1">— {note.author} • {note.timestamp.split('T')[0]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estimate Data Summary */}
                {job.estimateData && (
                  <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                        <FileText size={14} className="text-blue-500" /> Estimate Proposal Details
                      </div>
                      {job.portalEngagement && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Portal Opens:</span>
                            <span className="text-[10px] font-black text-blue-500">{job.portalEngagement.totalOpens}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Last Viewed:</span>
                            <span className="text-[10px] font-black text-blue-500">{job.portalEngagement.lastOpenedAt?.split('T')[0] || 'N/A'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {job.estimateData.options.map((option) => (
                        <div key={option.id} className={`p-4 rounded-2xl border transition-all ${
                          job.acceptedOptionId === option.id
                            ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--brand-gold)]/20'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{option.name}</p>
                            {job.acceptedOptionId === option.id && (
                              <span className="px-2 py-0.5 bg-[var(--brand-gold)] text-black text-[8px] font-black uppercase rounded">Accepted</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{option.title}</p>
                          <p className="text-lg font-black text-[var(--text-primary)] italic">${option.price.toLocaleString()}</p>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {option.features.slice(0, 3).map((f, i) => (
                              <span key={i} className="text-[8px] font-bold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded uppercase tracking-wider">{f}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itemized Estimate Breakdown — Feature #18 */}
                <div className="mt-8 pt-8 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                      <DollarSign size={14} className="text-[var(--brand-gold)]" /> Estimate Breakdown
                    </div>
                    {/* Feature #61 — Email Estimate button */}
                    {job.clientEmail && job.estimateAmount && (
                      <button
                        onClick={() => {
                          const firstName = job.clientName?.split(' ')[0] || 'there';
                          const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
                          const subject = `Your Luxury Decking Estimate ${job.jobNumber ? `#${job.jobNumber}` : ''} — ${job.clientName}`;
                          const body = `Hi ${firstName},

Thank you for choosing Luxury Decking! We're excited to present your custom deck estimate.

ESTIMATE SUMMARY
────────────────
Project: ${job.projectAddress || ''}
${job.acceptedBuildSummary?.optionName ? `Option: ${job.acceptedBuildSummary.optionName}` : ''}
Estimate Amount: $${(job.estimateAmount || 0).toLocaleString()} + HST

WHAT HAPPENS NEXT
─────────────────
1. Review your estimate in your Project Portal
2. Accept your preferred option
3. We'll reach out to schedule your project start date

View your personalised Project Portal:
${portalUrl}

This estimate is valid for 30 days.

Questions? Reply to this email or call us anytime.

- The Luxury Decking Team
Ottawa's Premium Deck Builders`;
                          window.location.href = `mailto:${job.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-400 transition-all"
                      >
                        <Mail size={11} /> Email Estimate
                      </button>
                    )}
                  </div>

                  {job.acceptedBuildSummary ? (
                    <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
                      {/* Option name header */}
                      <div className="px-4 py-3 border-b border-[var(--border-color)]">
                        <span className="text-[11px] font-black text-[var(--text-primary)] uppercase tracking-wide">{job.acceptedBuildSummary.optionName}</span>
                      </div>
                      {/* Line items */}
                      <div className="divide-y divide-[var(--border-color)]">
                        {(() => {
                          const addOnsTotal = (job.acceptedBuildSummary!.addOns || []).reduce((s, a) => s + a.price, 0);
                          const baseInstall = (job.acceptedBuildSummary!.basePrice || 0) - addOnsTotal;
                          return baseInstall > 50 ? (
                            <div className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-[10px] text-[var(--text-secondary)]">Base Deck Installation</span>
                              <span className="text-[10px] font-semibold text-[var(--text-primary)]">${baseInstall.toLocaleString()}</span>
                            </div>
                          ) : null;
                        })()}
                        {(job.acceptedBuildSummary.addOns || []).map((addon, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5">
                            <span className="text-[10px] text-[var(--text-secondary)]">{addon.name}</span>
                            <span className="text-[10px] font-semibold text-[var(--text-primary)]">${addon.price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      {/* Totals */}
                      <div className="border-t border-[var(--border-color)] divide-y divide-[var(--border-color)]">
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-[10px] text-[var(--text-secondary)]">Subtotal</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">${(job.acceptedBuildSummary.basePrice || job.estimateAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-[10px] text-[var(--text-secondary)]">HST (13%)</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">+${Math.round((job.acceptedBuildSummary.basePrice || job.estimateAmount || 0) * 0.13).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--brand-gold)]/5">
                          <span className="text-[11px] font-black text-[var(--brand-gold)] uppercase tracking-wider">Total</span>
                          <span className="text-base font-black text-[var(--brand-gold)]">${Math.round((job.acceptedBuildSummary.basePrice || job.estimateAmount || 0) * 1.13).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)]">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-[10px] text-[var(--text-secondary)]">Estimate</span>
                        <span className="text-sm font-black text-[var(--text-primary)]">${(job.estimateAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── FIELD STATUS TIMELINE (IN_FIELD / COMPLETION / PAID) ── */}
            {(job.pipelineStage === PipelineStage.IN_FIELD || job.pipelineStage === PipelineStage.COMPLETION || job.pipelineStage === PipelineStage.PAID_CLOSED) && (
              <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2.5rem] overflow-hidden relative">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--brand-gold)]/40" />

                {/* Header */}
                <div className="px-8 pt-7 pb-5 flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em] mb-1 flex items-center gap-1.5">
                      <Play size={10} className="fill-current" /> Field Execution
                    </p>
                    <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Live Field Status</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.pipelineStage === PipelineStage.IN_FIELD && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] text-[8px] font-black uppercase tracking-widest rounded-full border border-[var(--brand-gold)]/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)] animate-pulse" />
                        Live
                      </div>
                    )}
                    {job.officialScheduleStatus && (
                      <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${getScheduleStatusColor(job.officialScheduleStatus)}`}>
                        {job.officialScheduleStatus.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Overall progress bar */}
                <div className="px-8 pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Overall Progress — Stage {job.currentStage} of 5</span>
                    <span className="text-sm font-black text-[var(--brand-gold)]">{Math.round((job.currentStage / 5) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-secondary)] rounded-full overflow-hidden border border-[var(--border-color)]">
                    <div
                      className="h-full bg-[var(--brand-gold)] transition-all duration-700 rounded-full"
                      style={{ width: `${(job.currentStage / 5) * 100}%` }}
                    />
                  </div>
                  {/* Stage dots */}
                  <div className="flex justify-between mt-2 px-0.5">
                    {[1,2,3,4,5].map(s => (
                      <div key={s} className="flex flex-col items-center gap-1">
                        <div className={`w-2 h-2 rounded-full border ${s <= job.currentStage ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)]' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'}`} />
                        <span className="text-[7px] font-black text-[var(--text-tertiary)] uppercase">{s}</span>
                      </div>
                    ))}
                  </div>
                  {/* Last update timestamp */}
                  {(() => {
                    const ts = job.fieldForecast?.updatedAt || job.lastScheduleUpdateAt || job.updatedAt;
                    if (!ts) return null;
                    const d = new Date(ts);
                    const dateStr = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
                    const timeStr = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
                    const by = job.fieldForecast?.updatedBy || job.lastScheduleUpdatedBy;
                    return (
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border-color)]">
                        <Clock size={9} className="text-[var(--text-tertiary)] shrink-0" />
                        <span className="text-[9px] text-[var(--text-tertiary)]">
                          Last update: <span className="font-bold text-[var(--text-secondary)]">{dateStr} at {timeStr}</span>
                          {by && <span className="text-[var(--text-tertiary)]"> — {by}</span>}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Schedule grid */}
                <div className="grid grid-cols-3 gap-4 px-8 pb-6">
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={9} /> Start Date</p>
                    <p className="text-base font-black text-[var(--text-primary)]">{job.plannedStartDate || <span className="text-[var(--text-tertiary)] text-sm font-normal italic">TBD</span>}</p>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={9} /> Duration</p>
                    <p className="text-base font-black text-[var(--text-primary)]">{job.plannedDurationDays ? `${job.plannedDurationDays} days` : <span className="text-[var(--text-tertiary)] text-sm font-normal italic">—</span>}</p>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4">
                    <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 flex items-center gap-1"><Calendar size={9} /> Est. Finish</p>
                    <p className="text-base font-black text-[var(--text-primary)]">{job.plannedFinishDate || <span className="text-[var(--text-tertiary)] text-sm font-normal italic">TBD</span>}</p>
                  </div>
                </div>

                {/* Field Forecast from installer */}
                {job.fieldForecast ? (
                  <div className="mx-8 mb-8 p-6 rounded-2xl bg-amber-500/[0.06] border border-amber-500/25">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-0.5">Field Forecast — From Installer</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">Submitted by field crew</p>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getScheduleStatusColor(job.fieldForecast.status)}`}>
                        {job.fieldForecast.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-black text-[var(--text-primary)]">{job.fieldForecast.estimatedDaysRemaining}</span>
                      <span className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest">Days Remaining</span>
                    </div>
                    {job.fieldForecast.note && (
                      <p className="text-sm text-[var(--text-secondary)] italic mb-4 leading-relaxed">"{job.fieldForecast.note}"</p>
                    )}
                    {job.fieldForecast.delayReason && (
                      <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-bold text-rose-500">{job.fieldForecast.delayReason}</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (job.fieldForecast) {
                          const newFinish = new Date();
                          newFinish.setDate(newFinish.getDate() + job.fieldForecast.estimatedDaysRemaining);
                          const finishStr = newFinish.toISOString().split('T')[0];
                          let newDuration = job.plannedDurationDays;
                          if (job.plannedStartDate) {
                            const start = new Date(job.plannedStartDate);
                            newDuration = Math.ceil((newFinish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          }
                          onUpdateSchedule?.(job.id, {
                            officialScheduleStatus: job.fieldForecast.status,
                            plannedFinishDate: finishStr,
                            plannedDurationDays: newDuration,
                            fieldForecast: undefined
                          });
                        }
                      }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Accept Forecast — Update Official Schedule
                    </button>
                  </div>
                ) : (
                  <div className="mx-8 mb-8 p-6 rounded-2xl border border-dashed border-[var(--border-color)] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-[var(--text-tertiary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest">Awaiting Field Forecast</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Installer will submit a progress update from the job site</p>
                    </div>
                  </div>
                )}

                {/* Flagged Issues */}
                {job.flaggedIssues && job.flaggedIssues.length > 0 && (
                  <div className="mx-8 mb-8 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-rose-500 uppercase tracking-[0.15em]">Flagged Issues</p>
                        <p className="text-[10px] text-rose-400/70 mt-0.5">Reported from field — requires office review</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-rose-500">{job.flaggedIssues.length}</span>
                  </div>
                )}
              </section>
            )}

            {/* Stage Checklist */}
            <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2.5rem] p-8 min-h-[300px] relative overflow-hidden">
              {/* Gold progress bar at top */}
              {currentChecklist && currentChecklist.items && currentChecklist.items.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[2.5rem] bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand-gold)] transition-all duration-700"
                    style={{ width: `${Math.round(((currentChecklist.items.filter(i => i.completed || i.isNA).length) / currentChecklist.items.length) * 100)}%` }}
                  />
                </div>
              )}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                    <CheckSquare size={14} className="text-[var(--brand-gold)]" /> Stage Checklist
                  </h3>
                  <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight italic">{currentStageInfo?.label} Readiness</h2>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-1">Progress</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-[var(--brand-gold)] font-mono">
                      {(currentChecklist?.items || []).filter(i => i.completed || i.isNA).length}
                    </span>
                    <span className="text-xs font-black text-[var(--muted-text)]">/</span>
                    <span className="text-xs font-black text-[var(--text-tertiary)] font-mono">
                      {currentChecklist?.items?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
              {/* Full-width thin progress bar below header */}
              <div className="mb-6 h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--brand-gold)] transition-all duration-500 rounded-full"
                  style={{ width: `${currentChecklist?.items?.length ? Math.round((currentChecklist.items.filter(i => i.completed || i.isNA).length / currentChecklist.items.length) * 100) : 0}%` }}
                />
              </div>

              <div className="space-y-3">
                {(currentChecklist?.items || []).map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onUpdateOfficeChecklist(job.id, job.pipelineStage, item.id, !item.completed, false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onUpdateOfficeChecklist(job.id, job.pipelineStage, item.id, !item.completed, false);
                        }
                      }}
                      className={`flex-1 flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group relative overflow-hidden cursor-pointer outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/50 ${
                        item.completed && !item.isNA
                          ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/20 text-[var(--brand-gold-light)]' 
                          : item.isNA
                            ? 'bg-amber-500/5 border-amber-500/20 text-amber-500/70 opacity-80'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/30 hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      {item.completed && !item.isNA && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--brand-gold)] shadow-[0_0_10px_rgba(196,164,50,0.5)]"></div>
                      )}
                      <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        item.completed && !item.isNA
                          ? 'bg-[var(--brand-gold)] text-black shadow-[0_0_15px_rgba(196,164,50,0.3)]' 
                          : item.isNA
                            ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] group-hover:border-[var(--brand-gold)]/30'
                      }`}>
                        {item.completed && !item.isNA && <CheckCircle2 className="w-4 h-4" strokeWidth={3} />}
                        {item.isNA && <span className="text-[8px] font-black">N/A</span>}
                      </div>
                      <span className={`text-sm font-bold tracking-tight ${item.completed && !item.isNA ? 'opacity-90' : 'opacity-70'} ${item.isNA ? 'italic line-through' : ''}`}>
                        {item.label}
                      </span>
                      
                      {/* Material Delivery Text — opens the QuickMessageModal pre-filled with
                          a default delivery-date message. Office must review/edit (date, day,
                          placement notes) before pressing Send. No more auto-fire. */}
                      {item.label.toLowerCase().includes('arrange delivery') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!job.clientPhone) { alert('No phone number on file for this customer.'); return; }
                            const firstName = job.clientName?.split(' ')[0] || 'there';
                            const msg = `Hi ${firstName}, your materials for your Luxury Decking project are scheduled for delivery on [DAY/DATE] and will be placed on your driveway. Please let us know if you have specific placement instructions. Thank you!`;
                            setPendingReminderMessage(msg);
                            setMessageType('sms');
                            setIsMessageModalOpen(true);
                          }}
                          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-lg hover:bg-[var(--brand-gold)] hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                          title="Preview and edit the delivery-date text before sending"
                        >
                          <MessageSquare size={11} /> Text
                        </button>
                      )}
                      {/* Communication Hook */}
                      {!item.label.toLowerCase().includes('arrange delivery') && !item.label.toLowerCase().includes('apply for permits') && (item.label.toLowerCase().includes('notify') ||
                        item.label.toLowerCase().includes('send') ||
                        item.label.toLowerCase().includes('request')) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMessageType(item.label.toLowerCase().includes('email') ? 'email' : 'sms');
                            setIsMessageModalOpen(true);
                          }}
                          className="ml-auto p-2 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-lg hover:bg-[var(--brand-gold)] hover:text-black transition-all"
                          title="Send Message"
                        >
                          <MessageSquare size={12} />
                        </button>
                      )}
                      {/* Permit Notice Toggle — surfaces a "Permit Approval In Progress" banner on the customer portal */}
                      {item.label.toLowerCase().includes('apply for permits') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateJob(job.id, { permitNoticeActive: !job.permitNoticeActive });
                          }}
                          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-[9px] font-black uppercase tracking-widest ${
                            job.permitNoticeActive
                              ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-color)] hover:border-amber-500/50 hover:text-amber-500'
                          }`}
                          title={job.permitNoticeActive ? 'Notice ON — customer portal shows the permit-pending banner' : 'Show "Permit Approval In Progress" notice on the customer portal'}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${job.permitNoticeActive ? 'bg-black' : 'bg-[var(--text-tertiary)]'}`} />
                          Notify Customer
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => onUpdateOfficeChecklist(job.id, job.pipelineStage, item.id, !item.isNA, !item.isNA)}
                      className={`px-4 py-5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                        item.isNA
                          ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/50 hover:text-amber-500'
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                ))}
                {(!currentChecklist || !currentChecklist.items || currentChecklist.items.length === 0) && (
                  <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">No checklist items for this stage.</p>
                  </div>
                )}
              </div>

              {!isStageComplete && job.pipelineStage !== PipelineStage.IN_FIELD && (
                <div className="mt-8 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest leading-relaxed">
                    Complete all checklist items to move to the next stage
                  </p>
                </div>
              )}
            </section>

            {/* Accepted Scope of Work */}
            {!isEstimateStage && (job.acceptedBuildSummary || job.estimateAmount) && (
              <section className="bg-[var(--card-bg)] border border-[var(--brand-gold)]/20 rounded-[2rem] overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--brand-gold)]/30" />
                <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em] mb-0.5">Accepted Quote</p>
                    <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight italic">
                      {job.acceptedBuildSummary?.optionName || 'Scope of Work'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-black bg-[var(--brand-gold)] text-black px-2.5 py-1 rounded uppercase tracking-widest">
                      Accepted
                    </span>
                  </div>
                </div>

                {job.acceptedBuildSummary ? (
                  <div>
                    {/* Table header */}
                    <div className="grid grid-cols-[80px_1fr_100px] gap-0 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                      <div className="px-4 py-2.5 text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Qty</div>
                      <div className="px-4 py-2.5 text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Description</div>
                      <div className="px-4 py-2.5 text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest text-right">Price</div>
                    </div>

                    {/* Base install row */}
                    {(() => {
                      const addOnsTotal = (job.acceptedBuildSummary!.addOns || []).reduce((s, a) => s + a.price, 0);
                      const baseInstall = (job.acceptedBuildSummary!.basePrice || 0) - addOnsTotal;
                      const deckSqft = job.estimatorIntake?.measureSheet?.deckSqft;
                      return baseInstall > 50 ? (
                        <div className="grid grid-cols-[80px_1fr_100px] border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/50 transition-colors">
                          <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">{deckSqft ? `${deckSqft} sf` : '—'}</div>
                          <div className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">Base Deck Installation</div>
                          <div className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)] font-mono text-right">${baseInstall.toLocaleString()}</div>
                        </div>
                      ) : null;
                    })()}

                    {/* Add-on rows */}
                    {(job.acceptedBuildSummary.addOns || []).map((addon, i) => {
                      const ms = job.estimatorIntake?.measureSheet;
                      const n = addon.name.toLowerCase();
                      let qty = '—';
                      if (ms) {
                        if ((n.includes('deck') || n.includes('decking')) && ms.deckSqft > 0) qty = `${ms.deckSqft} sf`;
                        else if ((n.includes('helical') || n.includes('footing') || n.includes('pile')) && ms.footingCount > 0) qty = `${ms.footingCount} ${ms.footingType || 'piles'}`;
                        else if (n.includes('fascia') && ms.fasciaLf > 0) qty = `${ms.fasciaLf} lf`;
                        else if (n.includes('railing') && ms.woodRailingLf > 0) qty = `${ms.woodRailingLf} lf`;
                        else if (n.includes('skirting') && ms.skirtingSqft > 0) qty = `${ms.skirtingSqft} sf`;
                        else if (n.includes('privacy') && ms.privacyWallLf > 0) qty = `${ms.privacyWallLf} lf`;
                        else if ((n.includes('stair') || n.includes('step')) && ms.stairLf > 0) qty = `${ms.stairLf} steps`;
                        else if (n.includes('removal') || n.includes('demo')) qty = ms.removeDispose ? (ms.demoSqft > 0 ? `${ms.demoSqft} sf` : 'Yes') : '—';
                        else if (n.includes('permit')) qty = ms.permitRequired ? 'Req.' : '—';
                        else if (n.includes('lighting')) qty = ms.lightingFixtures > 0 ? `${ms.lightingFixtures} pcs` : '—';
                        else if (n.includes('pergola')) qty = ms.pergolaRequired ? (ms.pergolaSize || 'Yes') : '—';
                        else if (n.includes('glass') && ms.glassSection6Count > 0) qty = `${ms.glassSection6Count} pcs`;
                        else if (n.includes('aluminum') && ms.aluminumPostCount > 0) qty = `${ms.aluminumPostCount} posts`;
                      }
                      return (
                        <div key={i} className="grid grid-cols-[80px_1fr_100px] border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/50 transition-colors">
                          <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">{qty}</div>
                          <div className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{addon.name}</div>
                          <div className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)] font-mono text-right">${addon.price.toLocaleString()}</div>
                        </div>
                      );
                    })}

                    {/* Subtotal */}
                    <div className="grid grid-cols-[80px_1fr_100px] bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                      <div className="px-4 py-2.5" />
                      <div className="px-4 py-2.5 text-xs text-[var(--text-tertiary)]">Subtotal</div>
                      <div className="px-4 py-2.5 text-xs text-[var(--text-tertiary)] font-mono text-right">${(job.acceptedBuildSummary.basePrice || job.estimateAmount || 0).toLocaleString()}</div>
                    </div>

                    {/* HST */}
                    <div className="grid grid-cols-[80px_1fr_100px] bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                      <div className="px-4 py-2.5" />
                      <div className="px-4 py-2.5 text-xs text-[var(--text-tertiary)]">HST (13%)</div>
                      <div className="px-4 py-2.5 text-xs text-[var(--text-tertiary)] font-mono text-right">+${Math.round((job.acceptedBuildSummary.basePrice || job.estimateAmount || 0) * 0.13).toLocaleString()}</div>
                    </div>

                    {/* Contract Total */}
                    <div className="grid grid-cols-[80px_1fr_100px] bg-[var(--brand-gold)]/5">
                      <div className="px-4 py-4" />
                      <div className="px-4 py-4 text-sm font-black text-[var(--brand-gold)] uppercase tracking-wider">Contract Total</div>
                      <div className="px-4 py-4 text-xl font-black text-[var(--brand-gold)] font-mono text-right">${Math.round((job.acceptedBuildSummary.basePrice || job.estimateAmount || 0) * 1.13).toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-6 py-4">
                    <span className="text-sm text-[var(--text-secondary)]">Estimate Amount</span>
                    <span className="text-xl font-black text-[var(--brand-gold)] font-mono">${(job.estimateAmount || 0).toLocaleString()}</span>
                  </div>
                )}
              </section>
            )}

            {/* ── DIGITAL WORK ORDER ──────────────────────────────── */}
            {(job.buildDetails || job.digitalWorkOrder) && (
              <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden">

                {/* Header bar */}
                <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em] mb-0.5 flex items-center gap-1.5">
                      <ClipboardCheck size={11} /> Build Specifications
                    </p>
                    <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight italic">Digital Work Order</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20 px-2.5 py-1 rounded uppercase tracking-widest">
                      Handoff Ready
                    </span>
                    {job.buildDetails && (
                      <button
                        onClick={() => {
                          setEditFormData(JSON.parse(JSON.stringify(job.buildDetails)));
                          setEditingSection('buildDetails');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                      >
                        <Edit2 size={10} /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Spec grid */}
                <div className="divide-y divide-[var(--border-color)]">

                  {/* ── SECTION: Site & Foundation ── */}
                  {(job.buildDetails?.footings || job.digitalWorkOrder?.footingType || job.digitalWorkOrder?.footingSystem || job.digitalWorkOrder?.deckType || job.digitalWorkOrder?.deckHeight || job.digitalWorkOrder?.footingsCount || job.digitalWorkOrder?.permitRequired) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Site & Foundation</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {job.digitalWorkOrder?.deckType && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Deck Type</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.deckType}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder?.deckHeight && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Deck Height</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.deckHeight}</p>
                          </div>
                        )}
                        {(job.buildDetails?.footings?.type || job.digitalWorkOrder?.footingType) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Footing Type</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.footings?.type || job.digitalWorkOrder?.footingType}</p>
                          </div>
                        )}
                        {(job.buildDetails?.footings?.bracketType || job.digitalWorkOrder?.footingSystem) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Bracket / System</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.footings?.bracketType || job.digitalWorkOrder?.footingSystem}</p>
                          </div>
                        )}
                        {(job.estimatorIntake?.measureSheet?.footingCount > 0 || job.digitalWorkOrder?.footingsCount) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Quantity</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake?.measureSheet?.footingCount || job.digitalWorkOrder?.footingsCount} pcs</p>
                          </div>
                        )}
                        {job.digitalWorkOrder?.permitNumber && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Permit #</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.permitNumber}</p>
                          </div>
                        )}
                        {(job.buildDetails?.footings?.attachedToHouse || job.buildDetails?.footings?.floating || job.buildDetails?.sitePrep?.permitsRequired || job.buildDetails?.sitePrep?.locatesRequired || job.digitalWorkOrder?.permitRequired) && (
                          <div className="col-span-2 flex flex-wrap gap-1.5 mt-1">
                            {job.buildDetails?.footings?.attachedToHouse && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-widest">Attached to House</span>}
                            {job.buildDetails?.footings?.floating && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Floating</span>}
                            {(job.buildDetails?.sitePrep?.permitsRequired || job.digitalWorkOrder?.permitRequired) && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase tracking-widest">Permit Required</span>}
                            {job.buildDetails?.sitePrep?.locatesRequired && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-widest">Locates Required</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Framing / Structure ──
                      Dual-sourced: buildDetails (older intake) OR digitalWorkOrder
                      (Job Setup Wizard writes here). Without the DWO fallback the
                      entire section hid for new wizard-only jobs. */}
                  {(job.buildDetails?.framing || job.digitalWorkOrder?.framingMaterial || job.digitalWorkOrder?.joistSize || job.digitalWorkOrder?.joistSpacing || job.digitalWorkOrder?.joistProtection) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Framing & Structure</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {(job.buildDetails?.framing?.type || job.digitalWorkOrder?.framingMaterial) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Frame Type</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.framing?.type || job.digitalWorkOrder?.framingMaterial}</p>
                          </div>
                        )}
                        {(job.buildDetails?.framing?.joistSize || job.buildDetails?.framing?.joistSpacing || job.digitalWorkOrder?.joistSize || job.digitalWorkOrder?.joistSpacing) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Joists</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {job.buildDetails?.framing?.joistSize || job.digitalWorkOrder?.joistSize}
                              {(job.buildDetails?.framing?.joistSpacing || job.digitalWorkOrder?.joistSpacing) ? ` @ ${job.buildDetails?.framing?.joistSpacing || job.digitalWorkOrder?.joistSpacing}` : ''}
                            </p>
                          </div>
                        )}
                        {(job.buildDetails?.framing?.joistProtection || job.digitalWorkOrder?.joistProtection) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Joist Protection</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.framing?.joistProtectionType || 'Yes'}</p>
                          </div>
                        )}
                        {job.estimatorIntake?.measureSheet?.deckSqft > 0 && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Deck Area</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.deckSqft} sqft</p>
                          </div>
                        )}
                      </div>
                      {job.buildDetails?.framing?.notes && (
                        <p className="mt-3 text-xs text-[var(--text-secondary)] italic leading-relaxed border-t border-[var(--border-color)] pt-3">{job.buildDetails.framing.notes}</p>
                      )}
                    </div>
                  )}

                  {/* ── SECTION: Decking ── */}
                  {(job.buildDetails?.decking || job.digitalWorkOrder?.deckingMaterial || job.digitalWorkOrder?.deckingBrand || job.digitalWorkOrder?.deckingColor || job.digitalWorkOrder?.deckSqFt || job.digitalWorkOrder?.pictureFrame) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Decking</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {(job.buildDetails?.decking?.brand || job.buildDetails?.decking?.type || job.digitalWorkOrder?.deckingMaterial || job.digitalWorkOrder?.deckingBrand) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Material</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {job.buildDetails?.decking
                                ? `${job.buildDetails.decking.brand ?? ''} ${job.buildDetails.decking.type ?? ''}`.trim()
                                : `${job.digitalWorkOrder?.deckingBrand ?? ''} ${job.digitalWorkOrder?.deckingMaterial ?? ''}`.trim()}
                            </p>
                          </div>
                        )}
                        {(job.buildDetails?.decking?.color || job.digitalWorkOrder?.deckingColor) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Colour</p>
                            <p className="text-sm font-bold text-[var(--brand-gold)]">{job.buildDetails?.decking?.color || job.digitalWorkOrder?.deckingColor}</p>
                          </div>
                        )}
                        {(job.estimatorIntake?.measureSheet?.deckSqft > 0 || job.digitalWorkOrder?.deckSqFt) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Area</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake?.measureSheet?.deckSqft || job.digitalWorkOrder?.deckSqFt} sqft</p>
                          </div>
                        )}
                        {job.estimatorIntake?.measureSheet?.fasciaLf > 0 && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Fascia</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.fasciaLf} lf</p>
                          </div>
                        )}
                        {job.digitalWorkOrder?.fastenerType && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Fasteners</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.fastenerType}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder?.pictureFrame && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Picture Frame Border</p>
                            <p className="text-sm font-bold text-[var(--brand-gold)]">{job.digitalWorkOrder.pictureFrameColor || 'Yes'}</p>
                          </div>
                        )}
                      </div>
                      {job.buildDetails?.decking?.accentNote && (
                        <p className="mt-3 text-xs text-[var(--text-secondary)] italic leading-relaxed border-t border-[var(--border-color)] pt-3">{job.buildDetails.decking.accentNote}</p>
                      )}
                    </div>
                  )}

                  {/* ── SECTION: Railing ── */}
                  {(job.buildDetails?.railing?.included || job.digitalWorkOrder?.railingIncluded || job.digitalWorkOrder?.railingType || job.digitalWorkOrder?.railingSystem || job.digitalWorkOrder?.railingBrand || job.digitalWorkOrder?.railingLF) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Railing</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        <div>
                          <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Type</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.railing?.type || job.digitalWorkOrder?.railingType || job.digitalWorkOrder?.railingSystem || 'Included'}</p>
                        </div>
                        {job.digitalWorkOrder?.railingBrand && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Brand</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.railingBrand}</p>
                          </div>
                        )}
                        {(job.estimatorIntake?.measureSheet?.woodRailingLf > 0 || job.digitalWorkOrder?.railingLF) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Linear Feet</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake?.measureSheet?.woodRailingLf || job.digitalWorkOrder?.railingLF} lf</p>
                          </div>
                        )}
                        {job.estimatorIntake?.measureSheet?.aluminumPostCount > 0 && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Posts</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.aluminumPostCount} pcs</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Stairs ── */}
                  {(job.buildDetails?.stairs?.included || job.digitalWorkOrder?.stairsIncluded || job.digitalWorkOrder?.stairs || job.digitalWorkOrder?.stairCount) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Stairs</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {(job.buildDetails?.stairs?.style || job.digitalWorkOrder?.stairs) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Style</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.stairs?.style || job.digitalWorkOrder?.stairs}</p>
                          </div>
                        )}
                        {job.buildDetails?.stairs?.type && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Type</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails.stairs.type}</p>
                          </div>
                        )}
                        {(job.estimatorIntake?.measureSheet?.stairLf > 0 || job.digitalWorkOrder?.stairCount) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Steps</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake?.measureSheet?.stairLf || job.digitalWorkOrder?.stairCount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Skirting & Privacy ── */}
                  {(job.buildDetails?.skirting?.included || job.digitalWorkOrder?.skirtingIncluded || job.digitalWorkOrder?.skirtingType || job.digitalWorkOrder?.skirtingGate || job.estimatorIntake?.measureSheet?.skirtingSqft > 0 || job.estimatorIntake?.measureSheet?.privacyWallLf > 0 || job.buildDetails?.features?.privacyWall) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Skirting & Privacy</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {(job.buildDetails?.skirting?.included || job.digitalWorkOrder?.skirtingIncluded || job.digitalWorkOrder?.skirtingType) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Skirting Type</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails?.skirting?.type || job.digitalWorkOrder?.skirtingType || 'Included'}</p>
                          </div>
                        )}
                        {job.estimatorIntake?.measureSheet?.skirtingSqft > 0 && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Skirting Area</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.skirtingSqft} sqft</p>
                          </div>
                        )}
                        {(job.buildDetails?.features?.privacyWall || job.estimatorIntake?.measureSheet?.privacyWallLf > 0) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Privacy Wall</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {job.buildDetails?.features?.privacyWallType || (job.estimatorIntake?.measureSheet?.privacyWallLf > 0 ? `${job.estimatorIntake.measureSheet.privacyWallLf} lf` : 'Yes')}
                            </p>
                          </div>
                        )}
                        {(job.buildDetails?.skirting?.trapDoor || job.digitalWorkOrder?.skirtingGate) && (
                          <div className="col-span-2 flex items-center gap-1.5">
                            {job.digitalWorkOrder?.skirtingGate && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Skirting Gate</span>}
                            {job.buildDetails?.skirting?.trapDoor && <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">Trap Door</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Electrical & Extras ── */}
                  {(job.buildDetails?.electrical?.lightingIncluded || job.digitalWorkOrder?.lightingIncluded || job.digitalWorkOrder?.lightingType || job.buildDetails?.features?.pergolaRequired || job.estimatorIntake?.measureSheet?.lightingFixtures > 0 || job.estimatorIntake?.measureSheet?.pergolaRequired) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Electrical & Extras</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {(job.buildDetails?.electrical?.lightingIncluded || job.digitalWorkOrder?.lightingIncluded || job.estimatorIntake?.measureSheet?.lightingFixtures > 0) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Lighting</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              {job.buildDetails?.electrical?.lightingType || job.digitalWorkOrder?.lightingType || (job.estimatorIntake?.measureSheet?.lightingFixtures > 0 ? `${job.estimatorIntake.measureSheet.lightingFixtures} fixtures` : 'Yes')}
                            </p>
                          </div>
                        )}
                        {job.buildDetails?.electrical?.roughInNotes && (
                          <div className="col-span-2">
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Electrical Notes</p>
                            <p className="text-xs text-[var(--text-secondary)]">{job.buildDetails.electrical.roughInNotes}</p>
                          </div>
                        )}
                        {(job.buildDetails?.features?.pergolaRequired || job.estimatorIntake?.measureSheet?.pergolaRequired) && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Pergola</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimatorIntake?.measureSheet?.pergolaSize || 'Yes'}</p>
                          </div>
                        )}
                        {job.buildDetails?.landscaping?.prepType && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Landscaping</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.buildDetails.landscaping.prepType}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Scope Notes & Add-Ons (from digitalWorkOrder) ──
                      Free-form scope notes + selected add-ons written by the
                      Job Setup Wizard. Separate from the build-specs fields
                      above so they don't crowd a category grid. */}
                  {(job.digitalWorkOrder?.scopeNotes || (job.digitalWorkOrder?.addOns && job.digitalWorkOrder.addOns.length > 0)) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Scope Notes & Add-Ons</p>
                      {job.digitalWorkOrder?.addOns && job.digitalWorkOrder.addOns.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.digitalWorkOrder.addOns.map((addon, i) => (
                            <span key={i} className="text-[9px] font-black px-2.5 py-1 rounded-full bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 text-[var(--brand-gold)] uppercase tracking-widest">
                              {addon}
                            </span>
                          ))}
                        </div>
                      )}
                      {job.digitalWorkOrder?.scopeNotes && (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{job.digitalWorkOrder.scopeNotes}</p>
                      )}
                    </div>
                  )}

                  {/* ── SECTION: Schedule & Crew (from digitalWorkOrder) ── */}
                  {(job.digitalWorkOrder?.estimatedStartDate || job.digitalWorkOrder?.estimatedDuration || job.digitalWorkOrder?.assignedTo || job.digitalWorkOrder?.permitNumber) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Schedule & Crew</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {job.digitalWorkOrder.estimatedStartDate && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Estimated Start</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.estimatedStartDate}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder.estimatedDuration && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Estimated Duration</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.estimatedDuration} {job.digitalWorkOrder.estimatedDuration === 1 ? 'day' : 'days'}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder.assignedTo && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Crew Lead</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.assignedTo}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Site Access & Delivery (from digitalWorkOrder) ── */}
                  {(job.digitalWorkOrder?.siteAccessNotes || job.digitalWorkOrder?.parkingNotes || job.digitalWorkOrder?.materialDeliveryDate || job.digitalWorkOrder?.deliveryNotes) && (
                    <div className="px-6 py-4">
                      <p className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-3">Site Access & Delivery</p>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        {job.digitalWorkOrder.siteAccessNotes && (
                          <div className="col-span-2">
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Site Access</p>
                            <p className="text-xs text-[var(--text-secondary)]">{job.digitalWorkOrder.siteAccessNotes}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder.parkingNotes && (
                          <div className="col-span-2">
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Parking / Staging</p>
                            <p className="text-xs text-[var(--text-secondary)]">{job.digitalWorkOrder.parkingNotes}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder.materialDeliveryDate && (
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Delivery Date</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{job.digitalWorkOrder.materialDeliveryDate}</p>
                          </div>
                        )}
                        {job.digitalWorkOrder.deliveryNotes && (
                          <div className="col-span-2">
                            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Delivery Notes</p>
                            <p className="text-xs text-[var(--text-secondary)]">{job.digitalWorkOrder.deliveryNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── SECTION: Custom Notes ── */}
                  {(job.buildDetails?.features?.customNotes || job.buildDetails?.sitePrep?.notes) && (
                    <div className="px-6 py-4 bg-[var(--bg-secondary)]">
                      <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2">Additional Notes</p>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                        {job.buildDetails?.features?.customNotes || job.buildDetails?.sitePrep?.notes}
                      </p>
                    </div>
                  )}

                </div>
              </section>
            )}

            {/* Prominent amber banner when setup was deferred ("Fill Later") */}
            {job.needsJobSetup && !job.digitalWorkOrder && onOpenJobSetup && (
              <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <span className="text-amber-500 text-lg font-black">!</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-0.5">Job Setup Pending</p>
                    <p className="text-sm text-[var(--text-secondary)]">The job details form was skipped on-site. Complete it now to populate the Digital Work Order.</p>
                  </div>
                </div>
                <button
                  onClick={onOpenJobSetup}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-black rounded-xl text-sm font-black hover:bg-amber-400 transition-all whitespace-nowrap shadow-lg shadow-amber-500/20"
                >
                  Complete Now <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Prompt to complete job setup when neither buildDetails nor digitalWorkOrder is set */}
            {!job.needsJobSetup && !job.buildDetails && !job.digitalWorkOrder && onOpenJobSetup && (
              <div className="bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/20 rounded-3xl p-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-1">Digital Work Order</p>
                  <p className="text-sm text-[var(--text-secondary)]">Complete job setup to populate the work order and attach the signed contract.</p>
                </div>
                <button
                  onClick={onOpenJobSetup}
                  className="flex items-center gap-2 px-5 py-3 bg-[var(--brand-gold)] text-black rounded-xl text-sm font-black hover:opacity-90 transition-all whitespace-nowrap"
                >
                  Complete Job Setup <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Scheduling — Compact card */}
            {job.pipelineStage === PipelineStage.READY_TO_START && (
              <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--brand-gold)]" />
                    <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Project Schedule</h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditFormData({
                        plannedStartDate: job.plannedStartDate,
                        plannedDurationDays: job.plannedDurationDays,
                        plannedFinishDate: job.plannedFinishDate,
                        officialScheduleStatus: job.officialScheduleStatus,
                        assignedCrewOrSubcontractor: job.assignedCrewOrSubcontractor,
                        assignedUsers: job.assignedUsers
                      });
                      setEditingSection('schedule');
                    }}
                    className="px-3 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                </div>
                <div className="p-5 grid grid-cols-3 gap-3">
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Start</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{job.plannedStartDate || 'TBD'}</p>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Duration</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{job.plannedDurationDays || 0}d</p>
                  </div>
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-xl">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Finish</p>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{job.plannedFinishDate || 'TBD'}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Financial Performance Overview */}
            {!isEstimateStage && (
            <section className="bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/20 rounded-[2rem] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/10 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <Activity size={14} /> Financial Performance
                  </h3>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Job Financial Overview</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Gross Profit (Est.)</p>
                    <p className={`text-2xl font-black italic tracking-tight ${((job.totalAmount || 0) - (job.materialCost || 0) - (job.labourCost || labourSummary.estimatedCost || 0)) >= 0 ? 'text-[var(--brand-gold)]' : 'text-rose-500'}`}>
                      ${((job.totalAmount || 0) - (job.materialCost || 0) - (job.labourCost || labourSummary.estimatedCost || 0)).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditFormData({
                        clientName: job.clientName,
                        clientPhone: job.clientPhone || '',
                        projectAddress: job.projectAddress,
                        projectType: job.projectType,
                        totalAmount: job.totalAmount || 0,
                        paidAmount: job.paidAmount || 0,
                        materialCost: job.materialCost || 0,
                        labourCost: job.labourCost || labourSummary.estimatedCost || 0,
                        assignedUsers: job.assignedUsers || [],
                        assignedCrewOrSubcontractor: job.assignedCrewOrSubcontractor || '',
                        plannedStartDate: job.plannedStartDate || '',
                        plannedDurationDays: job.plannedDurationDays || 0,
                        scopeSummary: job.scopeSummary || '',
                        buildDetails: job.buildDetails || createDefaultBuildDetails()
                      });
                      setEditingSection('jobInfo');
                    }}
                    className="p-3 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-xl hover:bg-[var(--brand-gold)] hover:text-black transition-all"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                <div className="p-6 rounded-2xl bg-[var(--bg-primary)]/60 border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Total Revenue</p>
                  <p className="text-xl font-black text-[var(--text-primary)] tracking-tight">${(job.totalAmount || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand-gold)] w-full"></div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--bg-primary)]/60 border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Paid Amount</p>
                  <p className="text-xl font-black text-[var(--brand-gold)] tracking-tight">${(job.paidAmount || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--brand-gold)]" style={{ width: `${Math.min(100, ((job.paidAmount || 0) / (job.totalAmount || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--bg-primary)]/60 border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Material Costs</p>
                  <p className="text-xl font-black text-[var(--text-primary)] tracking-tight">${(job.materialCost || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, ((job.materialCost || 0) / (job.totalAmount || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[var(--bg-primary)]/60 border border-[var(--border-color)]">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-2">Labour Costs (Est.)</p>
                  <p className="text-xl font-black text-[var(--text-primary)] tracking-tight">${(job.labourCost || labourSummary.estimatedCost || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((job.labourCost || labourSummary.estimatedCost || 0) / (job.totalAmount || 1)) * 100)}%` }}></div>
                  </div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2">
                    {labourSummary.totalHours} Total Hours
                  </p>
                  {labourSummary.estimatedCost > 0 && (
                    <button
                      onClick={() => onUpdateJob(job.id, { labourCost: Math.round(labourSummary.estimatedCost) })}
                      className="mt-3 w-full py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500/20 transition-all"
                    >
                      ↑ Sync ${Math.round(labourSummary.estimatedCost).toLocaleString()} from Time Clock
                    </button>
                  )}
                </div>
              </div>
            </section>
            )}
          </div>
        </div>
      </div>
      {/* Edit Modals */}
      {editingSection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setEditingSection(null)} />
          
          <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
                  <Edit2 className="h-6 w-6 text-[var(--brand-gold)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">
                    {editingSection === 'jobInfo' ? 'Edit Job Information' :
                     editingSection === 'schedule' ? 'Edit Schedule & Assignment' :
                     editingSection === 'buildDetails' ? 'Edit Build Specifications' :
                     editingSection === 'scopeSummary' ? 'Edit Scope Summary' :
                     editingSection === 'files' ? 'Manage Job Files' : 'Edit Section'}
                  </h2>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-widest">Update project details for {job.jobNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSection(null)}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all text-[var(--text-tertiary)] hover:text-white border border-transparent hover:border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {editingSection === 'jobInfo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Client Name</label>
                    <input 
                      type="text"
                      value={editFormData.clientName}
                      onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Client Phone</label>
                    <input 
                      type="text"
                      value={editFormData.clientPhone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, clientPhone: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Project Address</label>
                    <input 
                      type="text"
                      value={editFormData.projectAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, projectAddress: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Project Type</label>
                    <input 
                      type="text"
                      value={editFormData.projectType}
                      onChange={(e) => setEditFormData({ ...editFormData, projectType: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Job Total Amount ($)</label>
                    <input 
                      type="number"
                      value={editFormData.totalAmount || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, totalAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Paid Amount ($)</label>
                    <input 
                      type="number"
                      value={editFormData.paidAmount || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, paidAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Material Cost ($)</label>
                    <input 
                      type="number"
                      value={editFormData.materialCost || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, materialCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Labour Cost ($)</label>
                    <input 
                      type="number"
                      value={editFormData.labourCost || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, labourCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {editingSection === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Assigned Field Lead</label>
                    <select 
                      value={editFormData.assignedUsers?.[0] || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedUsers: [e.target.value] })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 appearance-none transition-all"
                    >
                      <option value="" className="bg-black text-white">Unassigned</option>
                      {APP_USERS.filter(u => u.role === Role.FIELD_EMPLOYEE || u.role === Role.SUBCONTRACTOR).map(u => (
                        <option key={u.id} value={u.id} className="bg-black text-white">{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Crew / Subcontractor</label>
                    <input 
                      type="text"
                      value={editFormData.assignedCrewOrSubcontractor || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedCrewOrSubcontractor: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Planned Start Date</label>
                    <input 
                      type="date"
                      value={editFormData.plannedStartDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, plannedStartDate: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Duration (Working Days)</label>
                    <input 
                      type="number"
                      value={editFormData.plannedDurationDays || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, plannedDurationDays: parseInt(e.target.value) || 0 })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Planned Finish Date</label>
                    <input 
                      type="date"
                      value={editFormData.plannedFinishDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, plannedFinishDate: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Official Schedule Status</label>
                    <select 
                      value={editFormData.officialScheduleStatus || ScheduleStatus.ON_SCHEDULE}
                      onChange={(e) => setEditFormData({ ...editFormData, officialScheduleStatus: e.target.value as ScheduleStatus })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 appearance-none transition-all"
                    >
                      {Object.values(ScheduleStatus).map(status => (
                        <option key={status} value={status} className="bg-black text-white">{status.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {editingSection === 'buildDetails' && (
                <div className="space-y-12">
                  {/* Site & Foundation */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--brand-gold)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Site & Foundation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Footing Type</label>
                        <input 
                          type="text"
                          value={editFormData.footings.type}
                          onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, type: e.target.value } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Bracket System</label>
                        <input 
                          type="text"
                          value={editFormData.footings.bracketType}
                          onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, bracketType: e.target.value } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-6 md:col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={editFormData.footings.attachedToHouse}
                            onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, attachedToHouse: e.target.checked } })}
                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-[var(--brand-gold)] focus:ring-[var(--brand-gold)]/20"
                          />
                          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-white transition-colors">Attached to House</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={editFormData.footings.floating}
                            onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, floating: e.target.checked } })}
                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-[var(--brand-gold)] focus:ring-[var(--brand-gold)]/20"
                          />
                          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest group-hover:text-white transition-colors">Floating Structure</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Framing */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--brand-gold)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Framing Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Lumber Type</label>
                        <input 
                          type="text"
                          value={editFormData.framing.type}
                          onChange={(e) => setEditFormData({ ...editFormData, framing: { ...editFormData.framing, type: e.target.value } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Joist Size</label>
                          <input 
                            type="text"
                            value={editFormData.framing.joistSize}
                            onChange={(e) => setEditFormData({ ...editFormData, framing: { ...editFormData.framing, joistSize: e.target.value } })}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Joist Spacing</label>
                          <input 
                            type="text"
                            value={editFormData.framing.joistSpacing}
                            onChange={(e) => setEditFormData({ ...editFormData, framing: { ...editFormData.framing, joistSpacing: e.target.value } })}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Surface & Finish */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--brand-gold)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Surface & Finish</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Decking Brand</label>
                        <input 
                          type="text"
                          value={editFormData.decking.brand}
                          onChange={(e) => setEditFormData({ ...editFormData, decking: { ...editFormData.decking, brand: e.target.value } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Decking Type</label>
                        <input 
                          type="text"
                          value={editFormData.decking.type}
                          onChange={(e) => setEditFormData({ ...editFormData, decking: { ...editFormData.decking, type: e.target.value } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Decking Color</label>
                        <input 
                          type="text"
                          value={editFormData.decking.color}
                          onChange={(e) => setEditFormData({ ...editFormData, decking: { ...editFormData.decking, color: e.target.value } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Railing & Skirting */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--brand-gold)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Railing & Skirting</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Railing Type</label>
                        <input 
                          type="text"
                          value={editFormData.railing.type}
                          onChange={(e) => setEditFormData({ ...editFormData, railing: { ...editFormData.railing, type: e.target.value, included: e.target.value !== '' } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          placeholder="e.g. Glass, Aluminum, Wood"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Skirting Type</label>
                        <input 
                          type="text"
                          value={editFormData.skirting.type}
                          onChange={(e) => setEditFormData({ ...editFormData, skirting: { ...editFormData.skirting, type: e.target.value, included: e.target.value !== '' } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          placeholder="e.g. Horizontal, Vertical, PVC"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Electrical & Features */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-[var(--brand-gold)] uppercase tracking-widest border-b border-[var(--border-color)] pb-2">Electrical & Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Lighting Details</label>
                        <input 
                          type="text"
                          value={editFormData.electrical.lightingType}
                          onChange={(e) => setEditFormData({ ...editFormData, electrical: { ...editFormData.electrical, lightingType: e.target.value, lightingIncluded: e.target.value !== '' } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          placeholder="e.g. In-deck LEDs, Post caps"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Custom Features</label>
                        <input 
                          type="text"
                          value={editFormData.features.privacyWallType}
                          onChange={(e) => setEditFormData({ ...editFormData, features: { ...editFormData.features, privacyWallType: e.target.value, privacyWall: e.target.value !== '' } })}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          placeholder="e.g. Privacy Wall, Pergola"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editingSection === 'scopeSummary' && (
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Scope Summary Text</label>
                  <textarea 
                    value={editFormData.scopeSummary}
                    onChange={(e) => setEditFormData({ ...editFormData, scopeSummary: e.target.value })}
                    rows={10}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-medium text-white focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all resize-none"
                    placeholder="Enter detailed job scope summary..."
                  />
                </div>
              )}

              {editingSection === 'files' && (
                <div className="space-y-8">
                  <div className="p-12 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center bg-white/[0.02] relative group">
                    <input 
                      type="file" 
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const newFile: JobFile = {
                            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: file.name,
                            url: URL.createObjectURL(file), // Mock URL
                            type: 'other',
                            uploadedAt: new Date().toISOString()
                          };
                          onUpdateJob(job.id, { files: [...(job.files || []), newFile] });
                        });
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8 text-[var(--brand-gold)]" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 italic">Upload New Documents</h3>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-widest mb-6">Drag and drop or click to select files</p>
                    <div className="px-8 py-4 bg-[var(--brand-gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl group-hover:bg-[var(--brand-gold)] transition-all">
                      Select Files
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest ml-1">Current Files ({job.files?.length || 0})</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {job.files?.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/[0.08] transition-all">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-[var(--brand-gold)]" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{file.name}</p>
                              <p className="text-[8px] text-[var(--text-tertiary)] uppercase font-black tracking-widest">{file.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--brand-gold)] transition-colors"
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button 
                              onClick={() => {
                                const updatedFiles = job.files.filter(f => f.id !== file.id);
                                onUpdateJob(job.id, { files: updatedFiles });
                              }}
                              className="p-2 text-[var(--text-tertiary)] hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!job.files || job.files.length === 0) && (
                        <div className="p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">No files uploaded yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-4">
              <button 
                onClick={() => setEditingSection(null)}
                className="px-8 py-4 bg-white/5 text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (editingSection === 'jobInfo' || editingSection === 'scopeSummary') {
                    onUpdateJob(job.id, editFormData);
                  } else if (editingSection === 'schedule') {
                    onUpdateSchedule(job.id, editFormData);
                  } else if (editingSection === 'buildDetails') {
                    onUpdateJob(job.id, { buildDetails: editFormData });
                  }
                  setEditingSection(null);
                }}
                className="px-8 py-4 bg-[var(--brand-gold)] text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--brand-gold)] transition-all flex items-center gap-3 shadow-xl shadow-[var(--brand-gold)]/20"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuickMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => { setIsMessageModalOpen(false); setPendingReminderMessage(''); }}
        clientName={job.clientName}
        clientPhone={job.clientPhone}
        clientEmail={job.clientEmail}
        initialType={messageType}
        initialMessage={pendingReminderMessage}
        job={job}
        onSend={(type, content) => {
          if (type === 'sms') {
            // Find or create session ID
            const sessionId = `session-${job.id}`;
            onSendMessage(sessionId, content);
          } else {
            // Handle email intent
            const mailLink = document.createElement('a'); mailLink.href = `mailto:${job.clientEmail}?subject=Luxury Decking: ${job.jobNumber}&body=${encodeURIComponent(content)}`; mailLink.click();
          }
        }}
      />

      {/* Live Status Report Modal */}
      {showLiveStatusReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowLiveStatusReport(false)} />
          
          <div className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-[var(--brand-gold)]" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Live Field Status Report</h2>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-black uppercase tracking-widest">Real-time progress from {job.assignedCrewOrSubcontractor || 'Assigned Crew'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLiveStatusReport(false)}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all text-[var(--text-tertiary)] hover:text-white border border-transparent hover:border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {!job.fieldProgress ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-[var(--text-primary)]" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 italic">No Live Data Yet</h3>
                  <p className="text-xs text-[var(--text-tertiary)] font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                    The field crew has not started the digital workflow for this job yet. Once they begin checking off items or uploading photos, they will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Progress Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Current Stage</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
                          <span className="text-lg font-black text-[var(--brand-gold)]">{job.currentStage + 1}</span>
                        </div>
                        <span className="text-lg font-black text-white uppercase tracking-tight italic">{PAGE_TITLES[job.currentStage]}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Checklist Items</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          {Object.values(job.fieldProgress).reduce((acc, page) => acc + page.checklist.filter(i => i.completed || i.isNA).length, 0)}
                        </span>
                        <span className="text-lg font-black text-[var(--text-tertiary)] uppercase tracking-tight italic">
                          / {Object.values(job.fieldProgress).reduce((acc, page) => acc + page.checklist.length, 0)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-4">Photos Uploaded</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          {Object.values(job.fieldProgress).reduce((acc, page) => acc + page.photos.filter(p => p.url || p.cloudinaryUrl).length, 0)}
                        </span>
                        <span className="text-lg font-black text-[var(--text-tertiary)] uppercase tracking-tight italic">Photos</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stage Breakdown */}
                  <div className="space-y-8">
                    <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] border-b border-white/5 pb-4">Detailed Progress Breakdown</h3>
                    
                    <div className="grid grid-cols-1 gap-8">
                      {[1, 2, 3, 4, 5].map(stageNum => {
                        const page = job.fieldProgress?.[stageNum];
                        if (!page) return null;

                        const completedItems = page.checklist.filter(i => i.completed || i.isNA).length;
                        const totalItems = page.checklist.length;
                        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                        return (
                          <div key={stageNum} className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                            <div className="p-6 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${progress === 100 ? 'bg-[var(--brand-gold)] text-black' : 'bg-white/10 text-white'}`}>
                                  {stageNum}
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">{PAGE_TITLES[stageNum]}</h4>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{completedItems} / {totalItems} Complete</span>
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-[var(--brand-gold)]' : 'bg-amber-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                              {/* Checklist */}
                              <div>
                                <div className="flex items-center gap-2 mb-6">
                                  <CheckSquare className="w-4 h-4 text-[var(--brand-gold)]" />
                                  <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Checklist Status</p>
                                </div>
                                <div className="space-y-3">
                                  {page.checklist.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 group">
                                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                        item.isNA 
                                          ? 'bg-amber-500/20 border-amber-500/40' 
                                          : item.completed 
                                            ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)]' 
                                            : 'bg-white/5 border-white/10'
                                      }`}>
                                        {item.isNA ? (
                                          <span className="text-[8px] font-black text-amber-500">N/A</span>
                                        ) : item.completed && (
                                          <CheckCircle2 className="w-3 h-3 text-black" />
                                        )}
                                      </div>
                                      <span className={`text-xs font-bold transition-all ${
                                        item.isNA 
                                          ? 'text-amber-500/60 italic' 
                                          : item.completed 
                                            ? 'text-white' 
                                            : 'text-[var(--text-tertiary)]'
                                      }`}>
                                        {item.label}
                                        {item.isNA && <span className="text-[8px] ml-2 opacity-50 font-black tracking-widest not-italic">NOT APPLICABLE</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Photos */}
                              <div>
                                <div className="flex items-center gap-2 mb-6">
                                  <Camera className="w-4 h-4 text-sky-500" />
                                  <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Field Photos</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {page.photos.map((photo, pIdx) => (
                                    <div key={pIdx} className="relative group aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                                      {(photo.url || photo.cloudinaryUrl) ? (
                                        <>
                                          <img 
                                            src={photo.cloudinaryUrl || photo.url} 
                                            alt={photo.label}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            referrerPolicy="no-referrer"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                            <p className="text-[9px] font-black text-white uppercase tracking-widest truncate">{photo.label}</p>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-30">
                                          <Camera className="w-5 h-5 text-[var(--text-tertiary)]" />
                                          <p className="text-[8px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{photo.label}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[var(--brand-gold)] animate-pulse" />
                <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest italic">Live Connection Active</p>
              </div>
              <button 
                onClick={() => setShowLiveStatusReport(false)}
                className="px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--brand-gold)] transition-all active:scale-[0.98]"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficeJobDetailView;
