import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
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
  CustomerLifecycle
} from '../types';
import { PIPELINE_STAGES, APP_USERS, PAGE_TITLES } from '../constants';
import ProjectLocationMap from '../components/ProjectLocationMap';
import QuickMessageModal from '../components/QuickMessageModal';
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
  Copy,
  Check,
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
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  AlertCircle,
  Hammer,
  Zap,
  Info,
  Phone,
  Construction,
  Layers,
  CalendarCheck,
  CalendarClock,
  X,
  Activity,
  Sun,
  Cloud,
  CloudRain,
  BarChart3
} from 'lucide-react';
import { OfficeAIAssistant } from '../components/OfficeAIAssistant';
import { AIOfficeInsights } from '../components/AIOfficeInsights';

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
  onPreviewPortal
}) => {
  const [showLiveStatusReport, setShowLiveStatusReport] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms');
  const [copied, setCopied] = useState(false);

  const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === job.pipelineStage);
  const currentStageInfo = stageIndex !== -1 ? PIPELINE_STAGES[stageIndex] : null;

  const isEstimateStage = [
    PipelineStage.LEAD_IN,
    PipelineStage.SITE_VISIT_SCHEDULED,
    PipelineStage.ESTIMATE_IN_PROGRESS,
    PipelineStage.ESTIMATE_SENT,
    PipelineStage.FOLLOW_UP
  ].includes(job.pipelineStage);

  const currentChecklist = job.officeChecklists?.find(cl => cl.stage === job.pipelineStage);
  const isStageComplete = currentChecklist?.items?.every(item => item.completed) ?? false;

  const issues = useMemo(() => getJobIssues(job), [job]);

  const labourSummary = useMemo(() => timeClockService.getLabourSummary(job.id), [job.id]);

  const copyPortalLink = () => {
    const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePortalLink = (type: 'sms' | 'email') => {
    const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
    const message = `Hi ${job.clientName}, here is your secure project portal link for your Luxury Decking project: ${portalUrl}`;
    
    if (type === 'sms') {
      window.location.href = `sms:${job.clientPhone || ''}?body=${encodeURIComponent(message)}`;
    } else {
      window.location.href = `mailto:${job.clientEmail || ''}?subject=${encodeURIComponent('Your Luxury Decking Project Portal')}&body=${encodeURIComponent(message)}`;
    }
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
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'pending':
      case 'not_submitted':
      case 'not_confirmed':
      case 'not_ready':
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'needs_attention':
        return 'text-rose-600 bg-rose-50 border-rose-100';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getScheduleStatusColor = (status?: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.ON_SCHEDULE: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case ScheduleStatus.AHEAD: return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
      case ScheduleStatus.BEHIND: return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case ScheduleStatus.DELAYED: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen"
    >
      {/* Header / Navigation */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] p-4 shrink-0 sticky top-0 z-40 backdrop-blur-xl bg-[var(--bg-primary)]/80">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {job.jobNumber}
                </span>
                <h1 className="text-lg font-black text-white tracking-tight uppercase italic">{job.clientName}</h1>
                {job.finalSubmissionStatus === 'submitted' && (
                  <span className="text-[9px] font-black text-white uppercase tracking-widest bg-emerald-600 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={10} /> Submitted from Field
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                {job.projectType}
              </p>
            </div>
          </div>

          {/* Pipeline Tracker */}
          <div className="hidden lg:flex items-center gap-1 bg-white/[0.02] p-1 rounded-xl border border-[var(--border-color)]">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCurrent = stage.id === job.pipelineStage;
              const isPast = PIPELINE_STAGES.findIndex(s => s.id === job.pipelineStage) > idx;
              
              return (
                <div key={stage.id} className="flex items-center">
                  <button
                    onClick={() => onUpdatePipelineStage(job.id, stage.id)}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      isCurrent 
                        ? 'bg-white text-black shadow-lg' 
                        : isPast 
                          ? 'text-emerald-500 hover:text-emerald-400' 
                          : 'text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {stage.label}
                  </button>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-800 mx-0.5" />
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
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all shadow-lg"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Live Status
                </button>
                <button 
                  onClick={() => onOpenFieldWorkflow(job)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Field View
                </button>
              </>
            )}
            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
            <div className={`px-3 py-1.5 rounded-lg border font-black text-[9px] uppercase tracking-widest ${getStatusColor(job.completionReadinessStatus || '')}`}>
              {job.completionReadinessStatus?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
        <div className="max-w-[1600px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Primary Controls & Info */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Generated Packages Review (Always visible if submitted) - MOVED TO TOP FOR PROMINENCE */}
            {(job.verifiedBuildPassportUrl || job.subcontractorInvoiceUrl) && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <ShieldCheck size={14} /> Final Closeout & Warranty
                    </h3>
                    <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Luxury Decking Verified Build Passport</h2>
                    <p className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest mt-1">Official Project Documentation Package</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 size={14} /> Package Submitted
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  {job.verifiedBuildPassportUrl && (
                    <a 
                      href={job.verifiedBuildPassportUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all group shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center text-black shadow-lg shadow-emerald-500/30">
                          <ClipboardCheck size={28} />
                        </div>
                        <div>
                          <p className="text-base font-black text-white uppercase tracking-tight italic">Luxury Decking Verified Build Passport</p>
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Includes 5-Year Warranty</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Download size={20} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ExternalLink size={20} className="text-emerald-400" />
                      </div>
                    </a>
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
                </div>
              </motion.section>
            )}
            
            {/* Needs Attention Summary */}
            {issues.length > 0 && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-rose-500/5 border border-rose-500/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Needs Attention</h2>
                    <p className="text-[10px] text-rose-500/70 font-black uppercase tracking-widest">{issues.length} Issues Identified</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                      <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${
                        issue.type === 'error' ? 'bg-rose-500' : 
                        issue.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${
                          issue.type === 'error' ? 'text-rose-400' : 
                          issue.type === 'warning' ? 'text-amber-400' : 'text-blue-400'
                        }`}>
                          {issue.label}
                        </p>
                        {issue.description && (
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5 leading-relaxed">{issue.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Proposal Engagement Tracking */}
            {job.portalEngagement && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className={`border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group ${
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
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Customer Interest Signals</h2>
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
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Opens</p>
                    <p className="text-2xl font-black text-white italic">{job.portalEngagement.totalOpens}</p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Portal Sessions</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Time Spent</p>
                    <p className="text-2xl font-black text-white italic">{Math.floor(job.portalEngagement.totalTimeSpentSeconds / 60)}m {job.portalEngagement.totalTimeSpentSeconds % 60}s</p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Total Attention</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Option Clicks</p>
                    <p className="text-2xl font-black text-white italic">
                      {Object.values(job.portalEngagement.optionClicks || {}).reduce((a, b) => a + b, 0)}
                    </p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Comparison Activity</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Last Activity</p>
                    <p className="text-sm font-black text-white uppercase tracking-tight mt-2">
                      {job.portalEngagement.lastOpenedAt ? new Date(job.portalEngagement.lastOpenedAt).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Recency Signal</p>
                  </div>
                </div>

                {/* Interaction Breakdown */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BarChart3 size={12} className="text-blue-500" /> Option Engagement
                    </h4>
                    <div className="space-y-2">
                      {job.estimateData?.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400">{opt.name}</span>
                          <div className="flex-1 mx-3 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${Math.min(100, (job.portalEngagement?.optionClicks?.[opt.id] || 0) * 20)}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-black text-white">{job.portalEngagement?.optionClicks?.[opt.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={12} className="text-orange-500" /> Upgrade Interest
                    </h4>
                    <div className="space-y-2">
                      {job.estimateData?.addOns.slice(0, 3).map(addon => (
                        <div key={addon.id} className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400">{addon.name}</span>
                          <div className="flex-1 mx-3 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500" 
                              style={{ width: `${Math.min(100, (job.portalEngagement?.addOnInteractions?.[addon.id] || 0) * 25)}%` }} 
                            />
                          </div>
                          <span className="text-[10px] font-black text-white">{job.portalEngagement?.addOnInteractions?.[addon.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Sales & Estimating Profile (Prominent in Estimating Phase) */}
            {(job.lifecycleStage === CustomerLifecycle.ESTIMATE_IN_PROGRESS || 
              job.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT || 
              job.lifecycleStage === CustomerLifecycle.FOLLOW_UP_NEEDED ||
              job.lifecycleStage === CustomerLifecycle.NEW_LEAD ||
              job.lifecycleStage === CustomerLifecycle.CONTACTED) && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-blue-500/5 border border-blue-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">Sales & Estimating</h3>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Client Profile & Site File</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest ${
                      job.estimateStatus === 'sent' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                      job.estimateStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {job.estimateStatus?.replace('_', ' ') || 'Lead'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  {/* Client Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">
                      <Info size={14} className="text-blue-500" /> Contact Information
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover/item:text-blue-400 transition-colors">
                          <Mail size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Email Address</p>
                          <p className="text-sm font-bold text-white">{job.clientEmail || 'No email provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover/item:text-blue-400 transition-colors">
                          <MessageSquare size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Phone Number</p>
                          <p className="text-sm font-bold text-white">{job.clientPhone || 'No phone provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 group/item">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover/item:text-blue-400 transition-colors">
                          <Zap size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lead Source</p>
                          <p className="text-sm font-bold text-white">{job.leadSource || 'Website'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Site Assessment & Photos */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        <Camera size={14} className="text-blue-500" /> Site Assessment Photos
                      </div>
                      <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                        Upload More
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {job.files?.filter(f => f.type === 'photo').length > 0 ? (
                        job.files.filter(f => f.type === 'photo').slice(0, 4).map((photo) => (
                          <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group">
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
                        <div className="col-span-4 py-8 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                          <Camera className="w-8 h-8 text-gray-700 mb-2" />
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No site photos yet</p>
                          <p className="text-[9px] text-gray-700 mt-1">Estimators can upload house & site photos here</p>
                        </div>
                      )}
                    </div>

                    {job.siteNotes && job.siteNotes.length > 0 && (
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <ClipboardCheck size={12} className="text-blue-500" /> Estimator Site Notes
                        </p>
                        <div className="space-y-3">
                          {job.siteNotes.slice(0, 2).map((note) => (
                            <div key={note.id} className="text-[11px] text-gray-400 leading-relaxed italic">
                              "{note.text}"
                              <span className="block text-[8px] font-black text-gray-600 uppercase mt-1">— {note.author} • {note.timestamp.split('T')[0]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estimate Data Summary */}
                {job.estimateData && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                        <FileText size={14} className="text-blue-500" /> Estimate Proposal Details
                      </div>
                      {job.portalEngagement && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Portal Opens:</span>
                            <span className="text-[10px] font-black text-blue-500">{job.portalEngagement.totalOpens}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Last Viewed:</span>
                            <span className="text-[10px] font-black text-blue-500">{job.portalEngagement.lastOpenedAt?.split('T')[0] || 'N/A'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {job.estimateData.options.map((option) => (
                        <div key={option.id} className={`p-4 rounded-2xl border transition-all ${
                          job.acceptedOptionId === option.id 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{option.name}</p>
                            {job.acceptedOptionId === option.id && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-black text-[8px] font-black uppercase rounded">Accepted</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-white mb-1">{option.title}</p>
                          <p className="text-lg font-black text-white italic">${option.price.toLocaleString()}</p>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {option.features.slice(0, 3).map((f, i) => (
                              <span key={i} className="text-[8px] font-bold text-gray-500 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">{f}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {/* Job Summary Card */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                  <Info size={14} className="text-emerald-500" /> Job Summary
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 relative z-10">
                {/* Map Preview Square */}
                <div className="w-full md:w-48 h-48 shrink-0">
                  <ProjectLocationMap 
                    address={job.projectAddress} 
                    hideAddress={true} 
                    className="h-full w-full shadow-xl" 
                  />
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                          <MapPin size={14} className="text-emerald-500" /> Project Location
                        </div>
                        <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">{job.projectAddress}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                          <Zap size={14} className="text-emerald-500" /> Job Total
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-black text-white tracking-tight italic">
                            ${(job.totalAmount || 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Contract Value</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                        <Users size={14} className="text-emerald-500" /> Client Contact
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight italic">{job.clientName}</p>
                        
                        {job.clientPhone && (
                          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl group/item">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <Phone size={12} />
                              </div>
                              <p className="text-[11px] font-bold text-white">{job.clientPhone}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setMessageType('sms');
                                setIsMessageModalOpen(true);
                              }}
                              className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 transition-all hover:text-black"
                              title="Send SMS"
                            >
                              <MessageSquare size={12} />
                            </button>
                          </div>
                        )}

                        {job.clientEmail && (
                          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl group/item">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <Mail size={12} />
                              </div>
                              <p className="text-[11px] font-bold text-white truncate max-w-[120px]">{job.clientEmail}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setMessageType('email');
                                setIsMessageModalOpen(true);
                              }}
                              className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 transition-all hover:text-white"
                              title="Send Email"
                            >
                              <Mail size={12} />
                            </button>
                          </div>
                        )}

                        {/* Communication Summary */}
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Recent Outreach</h4>
                            <button 
                              onClick={() => setIsMessageModalOpen(true)}
                              className="text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors"
                            >
                              View All
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 mt-0.5">
                                <MessageSquare size={10} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-white truncate">Last Text: {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : 'N/A'}</p>
                                <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-1">Start date confirmation sent to client.</p>
                              </div>
                            </div>
                            
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 opacity-60">
                              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500 mt-0.5">
                                <Mail size={10} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-white truncate">Last Email: 2 days ago</p>
                                <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-1">Project scope summary shared.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                      <Users size={14} className="text-emerald-500" /> Assignment
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{job.assignedCrewOrSubcontractor || 'Unassigned'}</p>
                      <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                        Lead: {APP_USERS.find(u => u.id === job.assignedUsers?.[0])?.name || 'None'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>


            {/* Completion & Closeout Visibility Layer (Stage 3) */}
            {(job.pipelineStage === PipelineStage.COMPLETION || job.pipelineStage === PipelineStage.PAID_CLOSED) && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-[var(--card-bg)] rounded-[2rem] p-8 shadow-2xl border border-emerald-500/20 ring-1 ring-emerald-500/10"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <ClipboardCheck size={14} /> Completion & Closeout Layer
                    </h3>
                    <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">Field-to-Office Visibility</h2>
                  </div>
                  <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest ${getStatusColor(job.completionReadinessStatus || '')}`}>
                    {job.completionReadinessStatus?.replace('_', ' ')}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                  {/* Field Status */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Field Status</p>
                    <select 
                      value={job.fieldStatus}
                      onChange={(e) => onUpdateJob(job.id, { fieldStatus: e.target.value as FieldStatus })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      {Object.values(FieldStatus).map(s => (
                        <option key={s} value={s} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sign-off */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Client Sign-off</p>
                    <select 
                      value={job.signoffStatus}
                      onChange={(e) => onUpdateJob(job.id, { signoffStatus: e.target.value as any })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      <option value="pending" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Pending</option>
                      <option value="signed" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Signed</option>
                    </select>
                  </div>

                  {/* Completion Package */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Completion Pkg</p>
                    <select 
                      value={job.completionPackageStatus}
                      onChange={(e) => onUpdateJob(job.id, { completionPackageStatus: e.target.value as CompletionPackageStatus })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      {Object.values(CompletionPackageStatus).map(s => (
                        <option key={s} value={s} className="bg-black text-white">{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Photo Confirmation */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Photo Confirmation</p>
                    <select 
                      value={job.photoCompletionStatus}
                      onChange={(e) => onUpdateJob(job.id, { photoCompletionStatus: e.target.value as PhotoCompletionStatus })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      {Object.values(PhotoCompletionStatus).map(s => (
                        <option key={s} value={s} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Invoice Support */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Invoice Support</p>
                    <select 
                      value={job.invoiceSupportStatus}
                      onChange={(e) => onUpdateJob(job.id, { invoiceSupportStatus: e.target.value as any })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      <option value="pending" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Pending</option>
                      <option value="submitted" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Submitted</option>
                      <option value="not_required" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">Not Required</option>
                    </select>
                  </div>

                  {/* Office Review */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Office Review</p>
                    <select 
                      value={job.officeReviewStatus}
                      onChange={(e) => onUpdateJob(job.id, { officeReviewStatus: e.target.value as OfficeReviewStatus })}
                      className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      {Object.values(OfficeReviewStatus).map(s => (
                        <option key={s} value={s} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  {/* Readiness Status */}
                  <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] col-span-2 md:col-span-3">
                    <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-2">Overall Readiness</p>
                    <select 
                      value={job.completionReadinessStatus}
                      onChange={(e) => onUpdateJob(job.id, { completionReadinessStatus: e.target.value as CompletionReadinessStatus })}
                      className="w-full bg-transparent text-xs font-black text-[var(--text-primary)] uppercase focus:outline-none"
                    >
                      {Object.values(CompletionReadinessStatus).map(s => (
                        <option key={s} value={s} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {job.completionReadinessStatus === CompletionReadinessStatus.NEEDS_ATTENTION && (
                  <div className="mt-6 p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-rose-700 uppercase tracking-widest mb-1">Needs Attention</p>
                      <p className="text-[11px] font-medium text-rose-600 leading-relaxed">
                        One or more completion requirements have not been met. Review field status and photo confirmation before proceeding.
                      </p>
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {/* Stage Checklist */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                    <CheckSquare size={14} className="text-emerald-500" /> Stage Checklist
                  </h3>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight italic">{currentStageInfo?.label} Readiness</h2>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Progress</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-emerald-500">
                      {(currentChecklist?.items || []).filter(i => i.completed).length}
                    </span>
                    <span className="text-xs font-black text-gray-600">/</span>
                    <span className="text-xs font-black text-gray-400">
                      {currentChecklist?.items?.length || 0}
                    </span>
                  </div>
                </div>
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
                      className={`flex-1 flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group relative overflow-hidden cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                        item.completed && !item.isNA
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : item.isNA
                            ? 'bg-amber-500/5 border-amber-500/20 text-amber-500/70 opacity-80'
                            : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:bg-white/[0.08]'
                      }`}
                    >
                      {item.completed && !item.isNA && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      )}
                      <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        item.completed && !item.isNA
                          ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                          : item.isNA
                            ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'bg-white/5 border border-white/10 group-hover:border-white/30'
                      }`}>
                        {item.completed && !item.isNA && <CheckCircle2 className="w-4 h-4" strokeWidth={3} />}
                        {item.isNA && <span className="text-[8px] font-black">N/A</span>}
                      </div>
                      <span className={`text-sm font-bold tracking-tight ${item.completed && !item.isNA ? 'opacity-90' : 'opacity-70'} ${item.isNA ? 'italic line-through' : ''}`}>
                        {item.label}
                      </span>
                      
                      {/* Communication Hook */}
                      {(item.label.toLowerCase().includes('notify') || 
                        item.label.toLowerCase().includes('send') || 
                        item.label.toLowerCase().includes('request')) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMessageType(item.label.toLowerCase().includes('email') ? 'email' : 'sms');
                            setIsMessageModalOpen(true);
                          }}
                          className="ml-auto p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                          title="Send Message"
                        >
                          <MessageSquare size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => onUpdateOfficeChecklist(job.id, job.pipelineStage, item.id, !item.isNA, !item.isNA)}
                      className={`px-4 py-5 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                        item.isNA 
                          ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' 
                          : 'bg-white/5 text-gray-500 border-white/5 hover:border-amber-500/50 hover:text-amber-500'
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                ))}
                {(!currentChecklist || !currentChecklist.items || currentChecklist.items.length === 0) && (
                  <div className="p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No checklist items for this stage.</p>
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
            </motion.section>

            {/* Financial Performance Overview - Hidden during estimate stages */}
            {!isEstimateStage && (
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                    <Activity size={14} /> Financial Performance
                  </h3>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Job Financial Overview</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Gross Profit (Est.)</p>
                    <p className={`text-2xl font-black italic tracking-tight ${((job.totalAmount || 0) - (job.materialCost || 0) - (job.labourCost || labourSummary.estimatedCost || 0)) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
                    className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Revenue</p>
                  <p className="text-xl font-black text-white tracking-tight">${(job.totalAmount || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full"></div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Paid Amount</p>
                  <p className="text-xl font-black text-emerald-400 tracking-tight">${(job.paidAmount || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${Math.min(100, ((job.paidAmount || 0) / (job.totalAmount || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Material Costs</p>
                  <p className="text-xl font-black text-white tracking-tight">${(job.materialCost || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, ((job.materialCost || 0) / (job.totalAmount || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Labour Costs (Est.)</p>
                  <p className="text-xl font-black text-white tracking-tight">${(job.labourCost || labourSummary.estimatedCost || 0).toLocaleString()}</p>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((job.labourCost || labourSummary.estimatedCost || 0) / (job.totalAmount || 1)) * 100)}%` }}></div>
                  </div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-2">
                    {labourSummary.totalHours} Total Hours
                  </p>
                </div>
              </div>
            </motion.section>
            )}

            {/* Build Specifications / Digital Work Order */}
            {job.buildDetails && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-white/[0.03] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex items-center justify-between mb-10 relative z-10">
                  <div>
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                      <Ruler size={14} /> Build Specifications
                    </h3>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Digital Work Order Summary</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setEditFormData(JSON.parse(JSON.stringify(job.buildDetails)));
                        setEditingSection('buildDetails');
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Edit2 size={12} /> Edit Build Details
                    </button>
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Handoff Ready</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                  {/* Category 1: Site & Foundation */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Construction className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Site & Foundation</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Footing Type</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.footings.type || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Bracket System</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.footings.bracketType || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {job.buildDetails.footings.attachedToHouse && (
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded border border-blue-500/20">Attached to House</span>
                      )}
                      {job.buildDetails.footings.floating && (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[8px] font-black uppercase tracking-widest rounded border border-amber-500/20">Floating Structure</span>
                      )}
                      {job.buildDetails.sitePrep.permitsRequired && (
                        <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 text-[8px] font-black uppercase tracking-widest rounded border border-purple-500/20">Permits Required</span>
                      )}
                      {job.buildDetails.sitePrep.locatesRequired && (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded border border-emerald-500/20">Locates Required</span>
                      )}
                    </div>

                    {job.buildDetails.sitePrep.notes && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Site Prep Notes</p>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{job.buildDetails.sitePrep.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Category 2: Framing */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Hammer className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Framing Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lumber Type</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.framing.type || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Joist Spec</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.framing.joistSize} @ {job.buildDetails.framing.joistSpacing}</p>
                      </div>
                    </div>

                    {job.buildDetails.framing.joistProtection && (
                      <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Joist Protection</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.framing.joistProtectionType}</p>
                      </div>
                    )}

                    {job.buildDetails.framing.notes && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Framing Notes</p>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{job.buildDetails.framing.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Category 3: Surface & Finish */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Layers className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Surface & Finish</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Decking Product</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.decking.brand} {job.buildDetails.decking.type}</p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{job.buildDetails.decking.color}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Railing System</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.railing.included ? job.buildDetails.railing.type : 'None'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Stairs & Style</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.stairs.included ? `${job.buildDetails.stairs.style} (${job.buildDetails.stairs.type})` : 'None'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Skirting</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.skirting.included ? job.buildDetails.skirting.type : 'None'}</p>
                        {job.buildDetails.skirting.trapDoor && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Incl. Trap Door</span>}
                      </div>
                    </div>

                    {job.buildDetails.decking.accentNote && (
                      <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Inlay / Accent Details</p>
                        <p className="text-[11px] text-gray-300 font-medium leading-relaxed">{job.buildDetails.decking.accentNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Category 4: Features & Electrical */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Zap className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Features & Electrical</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lighting</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.electrical.lightingIncluded ? job.buildDetails.electrical.lightingType : 'None'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Landscaping Prep</p>
                        <p className="text-sm font-bold text-white">{job.buildDetails.landscaping.prepType || 'None'}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {job.buildDetails.features.privacyWall && (
                        <div className="w-full p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Privacy Wall</p>
                          <p className="text-sm font-bold text-white">{job.buildDetails.features.privacyWallType}</p>
                        </div>
                      )}
                    </div>

                    {job.buildDetails.electrical.roughInNotes && (
                      <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Electrical Rough-In</p>
                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{job.buildDetails.electrical.roughInNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Category 5: Site/Access Highlights */}
                {(job.buildDetails.features.customNotes || job.buildDetails.sitePrep.notes) && (
                  <div className="mt-10 pt-8 border-t border-white/10 relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Info className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">Critical Site & Access Notes</h4>
                    </div>
                    <div className="bg-white/5 rounded-[1.5rem] p-6 border border-white/10">
                      <p className="text-sm text-gray-300 font-medium leading-relaxed italic">
                        {job.buildDetails.features.customNotes || "No additional site notes provided."}
                      </p>
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {/* Scope Summary */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={14} className="text-emerald-500" /> Scope Summary
                </h3>
                <button 
                  onClick={() => {
                    setEditFormData({ scopeSummary: job.scopeSummary });
                    setEditingSection('scopeSummary');
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center gap-2"
                >
                  <Edit2 size={12} /> Edit Scope
                </button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 text-gray-300 leading-relaxed font-medium min-h-[120px]">
                {job.scopeSummary || <span className="text-gray-600 italic">No scope summary provided.</span>}
              </div>
            </motion.section>

            {/* Office Notes */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare size={14} className="text-emerald-500" /> Office Notes
                </h3>
                <button className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all active:scale-95 border border-emerald-500/20">
                  Add Note
                </button>
              </div>
              <div className="space-y-4">
                {job.officeNotes && job.officeNotes.length > 0 ? (
                  job.officeNotes.map(note => (
                    <div key={note.id} className="bg-white/5 rounded-[1.5rem] p-6 border border-white/10 hover:border-white/20 transition-all group">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-500">
                            {note.author.charAt(0)}
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{note.author}</span>
                        </div>
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">{new Date(note.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-300 font-medium leading-relaxed">{note.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No office notes yet.</p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Site Notes (from Field) */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-[var(--border-color)] rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md"
            >
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                <History size={14} className="text-emerald-500" /> Site Notes (Field Logs)
              </h3>
              <div className="space-y-4">
                {job.siteNotes && job.siteNotes.length > 0 ? (
                  job.siteNotes.map(note => (
                    <div key={note.id} className="bg-emerald-500/5 rounded-[1.5rem] p-6 border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black text-emerald-500">
                            {note.author.charAt(0)}
                          </div>
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{note.author}</span>
                        </div>
                        <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest">{new Date(note.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-300 font-medium leading-relaxed italic">"{note.text}"</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No site notes received from the field yet.</p>
                  </div>
                )}
              </div>
            </motion.section>

            {/* Scheduling & Timeline Section (Visible for Ready to Start, In Field, Completion) */}
            {(job.pipelineStage === PipelineStage.READY_TO_START || 
              job.pipelineStage === PipelineStage.IN_FIELD || 
              job.pipelineStage === PipelineStage.COMPLETION) && (
              <motion.section 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-white/[0.03] border border-[var(--border-color)] rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md"
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <Calendar className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Scheduling & Timeline</h3>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Office Control & Field Forecast</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Edit2 size={12} /> Edit Schedule
                    </button>
                    {hasScheduleDiscrepancy && (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Review Required</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Official Office Schedule Summary */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Official Office Schedule</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Start Date</p>
                        <p className="text-sm font-bold text-white">{job.plannedStartDate || 'TBD'}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Duration</p>
                        <p className="text-sm font-bold text-white">{job.plannedDurationDays || 0} Working Days</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Finish Date</p>
                        <p className="text-sm font-bold text-white">{job.plannedFinishDate || 'TBD'}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Official Status</p>
                        <div className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getScheduleStatusColor(job.officialScheduleStatus)}`}>
                          {job.officialScheduleStatus?.replace('_', ' ') || 'ON SCHEDULE'}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Assigned Crew / Sub</p>
                        <Users className="w-3 h-3 text-gray-600" />
                      </div>
                      <p className="text-sm font-bold text-white">{job.assignedCrewOrSubcontractor || 'Unassigned'}</p>
                      <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1">
                        Lead: {APP_USERS.find(u => u.id === job.assignedUsers?.[0])?.name || 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Latest Field Forecast */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Latest Field Forecast</h4>
                      </div>
                      {job.fieldForecast && (
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
                          Updated: {new Date(job.fieldForecast.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {job.fieldForecast ? (
                      <div className="bg-amber-500/[0.03] border border-amber-500/20 rounded-[2rem] p-8 relative overflow-hidden">
                        {/* Discrepancy Indicator */}
                        {hasScheduleDiscrepancy && (
                          <div className="absolute top-0 right-0 w-20 h-20">
                            <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 rotate-45 bg-amber-500 w-32 h-10 flex items-center justify-center shadow-lg">
                              <span className="text-[9px] font-black text-black uppercase tracking-widest">New Info</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-8 mb-8">
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Field Status</p>
                            <div className={`inline-flex px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getScheduleStatusColor(job.fieldForecast.status)}`}>
                              {job.fieldForecast.status.replace('_', ' ')}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Est. Remaining</p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black text-white">{job.fieldForecast.estimatedDaysRemaining}</span>
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Days</span>
                            </div>
                          </div>
                        </div>

                        {job.fieldForecast.delayReason && (
                          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Delay Reason</p>
                            </div>
                            <p className="text-sm font-bold text-rose-200">{job.fieldForecast.delayReason}</p>
                          </div>
                        )}

                        {job.fieldForecast.note && (
                          <div className="mb-8">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Field Note</p>
                            <p className="text-xs text-gray-300 italic font-medium leading-relaxed">"{job.fieldForecast.note}"</p>
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
                          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(245,158,11,0.2)] active:scale-[0.98]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Apply Forecast to Official Schedule
                        </button>
                      </div>
                    ) : (
                      <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] p-16 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                          <Clock className="w-8 h-8 text-gray-700" />
                        </div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Awaiting Field Forecast</p>
                        <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">
                          Field updates will appear here once submitted by the crew.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </div>

          {/* Right Column: Execution & Status */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* AI Assistant Section - Only for Estimate Stages */}
            {isEstimateStage && (
              <OfficeAIAssistant job={job} onUpdateJob={onUpdateJob} />
            )}

            {/* Field Execution Visibility Hub - Hidden during estimate stages */}
            {!isEstimateStage && (
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                    <Play size={14} className="fill-current" /> Field Execution Hub
                  </h3>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Real-Time Status</h2>
                </div>
                {job.pipelineStage === PipelineStage.IN_FIELD && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Stage Progress */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 group hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Field Stage</span>
                      <span className="text-sm font-bold text-white">Stage {job.currentStage} of 5</span>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs font-black text-emerald-500">{Math.round((job.currentStage / 5) * 100)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${(job.currentStage / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Timeline Forecast */}
                {job.fieldForecast ? (
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Timeline Forecast</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                        job.fieldForecast.status === 'on_schedule' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        {job.fieldForecast.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-black text-white italic tracking-tighter">{job.fieldForecast.estimatedDaysRemaining} Days</p>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Estimated Remaining</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Last Update</p>
                        <p className="text-[10px] font-bold text-gray-400">{new Date(job.fieldForecast.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    {job.fieldForecast.note && (
                      <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[10px] text-gray-500 italic leading-relaxed">"{job.fieldForecast.note}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-white/5 text-center">
                    <Clock className="w-5 h-5 text-gray-700 mx-auto mb-2" />
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">No field forecast received</p>
                  </div>
                )}

                {/* Flagged Issues */}
                {job.flaggedIssues && job.flaggedIssues.length > 0 && (
                  <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Flagged Issues</span>
                      </div>
                      <span className="text-sm font-black text-rose-500">{job.flaggedIssues.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
            )}

            {/* AI Office Insights - For Pipeline Stages */}
            {!isEstimateStage && (
              <AIOfficeInsights job={job} onUpdateJob={onUpdateJob} />
            )}

            {/* Customer Experience Portal Sharing */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] -mr-16 -mt-16 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                    <Users size={14} className="fill-current" /> Customer Experience
                  </h3>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">
                    {job.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ? 'Estimate Portal' : 'Project Portal'}
                  </h2>
                </div>
                <button 
                  onClick={() => onPreviewPortal(job)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-500 transition-all flex items-center gap-2"
                >
                  <ExternalLink size={12} /> Preview Mode
                </button>
              </div>

              {/* Portal Status Summary for Admin */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Customer View Status</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">Current Phase:</span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                        {job.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ? 'Estimate Review' : 
                         job.pipelineStage === PipelineStage.ADMIN_SETUP ? 'Pre-Production' : 
                         job.pipelineStage === PipelineStage.PRE_PRODUCTION ? 'Material Delivery' :
                         job.pipelineStage === PipelineStage.READY_TO_START ? 'Construction Start' : 'Build Progress'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-400">Queue Position:</span>
                      <span className="text-[10px] font-bold text-white">
                        {(() => {
                          const queueStages = [PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION, PipelineStage.READY_TO_START];
                          const queueJobs = allJobs
                            .filter(j => queueStages.includes(j.pipelineStage))
                            .sort((a, b) => new Date(a.scheduledDate || '').getTime() - new Date(b.scheduledDate || '').getTime());
                          const pos = queueJobs.findIndex(j => j.id === job.id);
                          return pos === -1 ? 'N/A' : `#${pos + 1} (${pos} ahead)`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                {!isEstimateStage && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Weather Outlook</p>
                    <Sun size={12} className="text-amber-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <Sun size={14} className="text-amber-500 mb-1" />
                      <span className="text-[8px] text-gray-500">Mon</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Sun size={14} className="text-amber-500 mb-1" />
                      <span className="text-[8px] text-gray-500">Tue</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Cloud size={14} className="text-gray-400 mb-1" />
                      <span className="text-[8px] text-gray-500">Wed</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <CloudRain size={14} className="text-blue-400 mb-1" />
                      <span className="text-[8px] text-gray-500">Thu</span>
                    </div>
                  </div>
                </div>
                )}
              </div>

              <div className="space-y-4 relative z-10">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-3">Share Secure Link</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => sharePortalLink('sms')}
                      className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-500 transition-all group"
                    >
                      <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">SMS</span>
                    </button>
                    <button 
                      onClick={() => sharePortalLink('email')}
                      className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 transition-all group"
                    >
                      <Mail size={16} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Email</span>
                    </button>
                  </div>
                  <button 
                    onClick={copyPortalLink}
                    className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all group"
                  >
                    {copied ? (
                      <Check size={16} className="text-emerald-500" />
                    ) : (
                      <Copy size={16} className="group-hover:scale-110 transition-transform" />
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${copied ? 'text-emerald-500' : ''}`}>
                      {copied ? 'Copied!' : 'Copy Link'}
                    </span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-start gap-3">
                    <Info size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-gray-500 leading-relaxed italic">
                      Customers can view their project timeline, scope, and payment status without logging in. This link is unique to this project.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Assignment & Handoff Summary */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Users size={14} className="text-emerald-500" /> Assignment & Handoff
                </h3>
                <button 
                  onClick={() => {
                    setEditFormData({
                      assignedUsers: job.assignedUsers,
                      assignedCrewOrSubcontractor: job.assignedCrewOrSubcontractor,
                      plannedStartDate: job.plannedStartDate,
                      plannedDurationDays: job.plannedDurationDays
                    });
                    setEditingSection('schedule'); // Re-use schedule edit for assignment
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all flex items-center gap-2"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Assigned Field Lead</p>
                  <p className="text-sm font-bold text-white">
                    {APP_USERS.find(u => u.id === job.assignedUsers?.[0])?.name || 'Unassigned'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Crew / Subcontractor</p>
                  <p className="text-sm font-bold text-white">{job.assignedCrewOrSubcontractor || 'None'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Start Date</p>
                    <p className="text-sm font-bold text-white">{job.plannedStartDate || 'TBD'}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Duration</p>
                    <p className="text-sm font-bold text-white">{job.plannedDurationDays || 0} Days</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Job Files & Documents Package */}
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[60px] -mr-24 -mt-24 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                    <Paperclip size={14} className="text-emerald-500" /> Job Files & Documents
                  </h3>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Construction Package</h2>
                </div>
                <button 
                  onClick={() => {
                    // In a real app, this would open a file management modal
                    // For now, we'll just show the upload button as "Manage Files"
                    setEditingSection('files');
                  }}
                  className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                  Manage Files
                </button>
              </div>

              <div className="space-y-6 relative z-10">
                {job.files && job.files.length > 0 ? (
                  <>
                    {/* Grouped by Type */}
                    {[
                      { type: 'drawing', label: 'Technical Drawings & Plans', icon: Ruler, color: 'text-emerald-500' },
                      { type: 'permit', label: 'Permits & Legal', icon: ShieldCheck, color: 'text-blue-400' },
                      { type: 'closeout', label: 'Closeout & Warranty Packages', icon: ClipboardCheck, color: 'text-amber-400' },
                      { type: 'photo', label: 'Site & Progress Photos', icon: Camera, color: 'text-purple-400' },
                      { type: 'other', label: 'Other Documents', icon: FileText, color: 'text-gray-400' }
                    ].map(group => {
                      const groupFiles = job.files.filter(f => f.type === group.type);
                      if (groupFiles.length === 0) return null;

                      return (
                        <div key={group.type} className="space-y-3">
                          <div className="flex items-center gap-2 px-1">
                            <group.icon className={`w-3.5 h-3.5 ${group.color}`} />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{group.label}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {groupFiles.map(file => (
                              <div 
                                key={file.id}
                                className="flex items-center p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all group cursor-pointer"
                              >
                                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mr-4 group-hover:border-emerald-500/30 transition-all">
                                  <group.icon className={`h-4 w-4 ${group.color}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{file.name}</p>
                                  <p className="text-[8px] text-gray-600 uppercase font-black tracking-[0.2em] mt-0.5">
                                    {new Date(file.uploadedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-all" />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-12 rounded-[2rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-center bg-white/[0.01]">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                      <Paperclip className="w-6 h-6 text-gray-800" />
                    </div>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No files attached to this job package</p>
                    <p className="text-[11px] text-gray-700 mt-2 max-w-[200px]">Upload plans, permits, or site photos to build the work order.</p>
                  </div>
                )}
              </div>
            </motion.section>
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
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Edit2 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">
                    {editingSection === 'jobInfo' ? 'Edit Job Information' :
                     editingSection === 'schedule' ? 'Edit Schedule & Assignment' :
                     editingSection === 'buildDetails' ? 'Edit Build Specifications' :
                     editingSection === 'scopeSummary' ? 'Edit Scope Summary' :
                     editingSection === 'files' ? 'Manage Job Files' : 'Edit Section'}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Update project details for {job.jobNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSection(null)}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white border border-transparent hover:border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {editingSection === 'jobInfo' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Client Name</label>
                    <input 
                      type="text"
                      value={editFormData.clientName}
                      onChange={(e) => setEditFormData({ ...editFormData, clientName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Client Phone</label>
                    <input 
                      type="text"
                      value={editFormData.clientPhone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, clientPhone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Project Address</label>
                    <input 
                      type="text"
                      value={editFormData.projectAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, projectAddress: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Project Type</label>
                    <input 
                      type="text"
                      value={editFormData.projectType}
                      onChange={(e) => setEditFormData({ ...editFormData, projectType: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Job Total Amount ($)</label>
                    <input 
                      type="number"
                      value={editFormData.totalAmount || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, totalAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Paid Amount ($)</label>
                    <input 
                      type="number"
                      value={editFormData.paidAmount || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, paidAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Material Cost ($)</label>
                    <input 
                      type="number"
                      value={editFormData.materialCost || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, materialCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Labour Cost ($)</label>
                    <input 
                      type="number"
                      value={editFormData.labourCost || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, labourCost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {editingSection === 'schedule' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Assigned Field Lead</label>
                    <select 
                      value={editFormData.assignedUsers?.[0] || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedUsers: [e.target.value] })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 appearance-none transition-all"
                    >
                      <option value="" className="bg-black text-white">Unassigned</option>
                      {APP_USERS.filter(u => u.role === Role.FIELD_EMPLOYEE || u.role === Role.SUBCONTRACTOR).map(u => (
                        <option key={u.id} value={u.id} className="bg-black text-white">{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Crew / Subcontractor</label>
                    <input 
                      type="text"
                      value={editFormData.assignedCrewOrSubcontractor || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedCrewOrSubcontractor: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Planned Start Date</label>
                    <input 
                      type="date"
                      value={editFormData.plannedStartDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, plannedStartDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Duration (Working Days)</label>
                    <input 
                      type="number"
                      value={editFormData.plannedDurationDays || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, plannedDurationDays: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Planned Finish Date</label>
                    <input 
                      type="date"
                      value={editFormData.plannedFinishDate || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, plannedFinishDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Official Schedule Status</label>
                    <select 
                      value={editFormData.officialScheduleStatus || ScheduleStatus.ON_SCHEDULE}
                      onChange={(e) => setEditFormData({ ...editFormData, officialScheduleStatus: e.target.value as ScheduleStatus })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 appearance-none transition-all"
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
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/10 pb-2">Site & Foundation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Footing Type</label>
                        <input 
                          type="text"
                          value={editFormData.footings.type}
                          onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, type: e.target.value } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Bracket System</label>
                        <input 
                          type="text"
                          value={editFormData.footings.bracketType}
                          onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, bracketType: e.target.value } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-6 md:col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={editFormData.footings.attachedToHouse}
                            onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, attachedToHouse: e.target.checked } })}
                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Attached to House</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={editFormData.footings.floating}
                            onChange={(e) => setEditFormData({ ...editFormData, footings: { ...editFormData.footings, floating: e.target.checked } })}
                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">Floating Structure</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Framing */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/10 pb-2">Framing Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Lumber Type</label>
                        <input 
                          type="text"
                          value={editFormData.framing.type}
                          onChange={(e) => setEditFormData({ ...editFormData, framing: { ...editFormData.framing, type: e.target.value } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Joist Size</label>
                          <input 
                            type="text"
                            value={editFormData.framing.joistSize}
                            onChange={(e) => setEditFormData({ ...editFormData, framing: { ...editFormData.framing, joistSize: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Joist Spacing</label>
                          <input 
                            type="text"
                            value={editFormData.framing.joistSpacing}
                            onChange={(e) => setEditFormData({ ...editFormData, framing: { ...editFormData.framing, joistSpacing: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Surface & Finish */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/10 pb-2">Surface & Finish</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Decking Brand</label>
                        <input 
                          type="text"
                          value={editFormData.decking.brand}
                          onChange={(e) => setEditFormData({ ...editFormData, decking: { ...editFormData.decking, brand: e.target.value } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Decking Type</label>
                        <input 
                          type="text"
                          value={editFormData.decking.type}
                          onChange={(e) => setEditFormData({ ...editFormData, decking: { ...editFormData.decking, type: e.target.value } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Decking Color</label>
                        <input 
                          type="text"
                          value={editFormData.decking.color}
                          onChange={(e) => setEditFormData({ ...editFormData, decking: { ...editFormData.decking, color: e.target.value } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Railing & Skirting */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/10 pb-2">Railing & Skirting</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Railing Type</label>
                        <input 
                          type="text"
                          value={editFormData.railing.type}
                          onChange={(e) => setEditFormData({ ...editFormData, railing: { ...editFormData.railing, type: e.target.value, included: e.target.value !== '' } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                          placeholder="e.g. Glass, Aluminum, Wood"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Skirting Type</label>
                        <input 
                          type="text"
                          value={editFormData.skirting.type}
                          onChange={(e) => setEditFormData({ ...editFormData, skirting: { ...editFormData.skirting, type: e.target.value, included: e.target.value !== '' } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                          placeholder="e.g. Horizontal, Vertical, PVC"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Electrical & Features */}
                  <div className="space-y-6">
                    <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/10 pb-2">Electrical & Features</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Lighting Details</label>
                        <input 
                          type="text"
                          value={editFormData.electrical.lightingType}
                          onChange={(e) => setEditFormData({ ...editFormData, electrical: { ...editFormData.electrical, lightingType: e.target.value, lightingIncluded: e.target.value !== '' } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                          placeholder="e.g. In-deck LEDs, Post caps"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Custom Features</label>
                        <input 
                          type="text"
                          value={editFormData.features.privacyWallType}
                          onChange={(e) => setEditFormData({ ...editFormData, features: { ...editFormData.features, privacyWallType: e.target.value, privacyWall: e.target.value !== '' } })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none"
                          placeholder="e.g. Privacy Wall, Pergola"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editingSection === 'scopeSummary' && (
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Scope Summary Text</label>
                  <textarea 
                    value={editFormData.scopeSummary}
                    onChange={(e) => setEditFormData({ ...editFormData, scopeSummary: e.target.value })}
                    rows={10}
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-sm font-medium text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
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
                      <Plus className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 italic">Upload New Documents</h3>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-6">Drag and drop or click to select files</p>
                    <div className="px-8 py-4 bg-emerald-600 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl group-hover:bg-emerald-500 transition-all">
                      Select Files
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Current Files ({job.files?.length || 0})</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {job.files?.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group hover:bg-white/[0.08] transition-all">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{file.name}</p>
                              <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest">{file.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 text-gray-600 hover:text-emerald-500 transition-colors"
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button 
                              onClick={() => {
                                const updatedFiles = job.files.filter(f => f.id !== file.id);
                                onUpdateJob(job.id, { files: updatedFiles });
                              }}
                              className="p-2 text-gray-600 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!job.files || job.files.length === 0) && (
                        <div className="p-8 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No files uploaded yet.</p>
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
                className="px-8 py-4 bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all"
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
                className="px-8 py-4 bg-emerald-600 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 transition-all flex items-center gap-3 shadow-xl shadow-emerald-600/20"
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
        onClose={() => setIsMessageModalOpen(false)}
        clientName={job.clientName}
        clientPhone={job.clientPhone}
        clientEmail={job.clientEmail}
        initialType={messageType}
        job={job}
        messageType={messageType}
        onSend={(type, content) => {
          if (type === 'sms') {
            // Find or create session ID
            const sessionId = `session-${job.id}`;
            onSendMessage(sessionId, content);
          } else {
            // Handle email intent
            window.location.href = `mailto:${job.clientEmail}?subject=Luxury Decking: ${job.jobNumber}&body=${encodeURIComponent(content)}`;
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
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Live Field Status Report</h2>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Real-time progress from {job.assignedCrewOrSubcontractor || 'Assigned Crew'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLiveStatusReport(false)}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white border border-transparent hover:border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {!job.fieldProgress ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 italic">No Live Data Yet</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                    The field crew has not started the digital workflow for this job yet. Once they begin checking off items or uploading photos, they will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Progress Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Current Stage</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <span className="text-lg font-black text-emerald-500">{job.currentStage + 1}</span>
                        </div>
                        <span className="text-lg font-black text-white uppercase tracking-tight italic">{PAGE_TITLES[job.currentStage]}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Checklist Items</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          {Object.values(job.fieldProgress).reduce((acc, page) => acc + page.checklist.filter(i => i.completed || i.isNA).length, 0)}
                        </span>
                        <span className="text-lg font-black text-gray-600 uppercase tracking-tight italic">
                          / {Object.values(job.fieldProgress).reduce((acc, page) => acc + page.checklist.length, 0)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Photos Uploaded</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          {Object.values(job.fieldProgress).reduce((acc, page) => acc + page.photos.filter(p => p.url || p.cloudinaryUrl).length, 0)}
                        </span>
                        <span className="text-lg font-black text-gray-600 uppercase tracking-tight italic">Photos</span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Stage Breakdown */}
                  <div className="space-y-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] border-b border-white/5 pb-4">Detailed Progress Breakdown</h3>
                    
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
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black ${progress === 100 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'}`}>
                                  {stageNum}
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-widest italic">{PAGE_TITLES[stageNum]}</h4>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{completedItems} / {totalItems} Complete</span>
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
                              {/* Checklist */}
                              <div>
                                <div className="flex items-center gap-2 mb-6">
                                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Checklist Status</p>
                                </div>
                                <div className="space-y-3">
                                  {page.checklist.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 group">
                                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                        item.isNA 
                                          ? 'bg-amber-500/20 border-amber-500/40' 
                                          : item.completed 
                                            ? 'bg-emerald-500 border-emerald-500' 
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
                                            : 'text-gray-600'
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
                                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Field Photos</p>
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
                                          <Camera className="w-5 h-5 text-gray-500" />
                                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{photo.label}</p>
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
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Live Connection Active</p>
              </div>
              <button 
                onClick={() => setShowLiveStatusReport(false)}
                className="px-8 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-500 transition-all active:scale-[0.98]"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OfficeJobDetailView;
