import React, { useState, useMemo } from 'react';
import { Job, PipelineStage, CustomerLifecycle } from '../types';
import { 
  ArrowLeft, User, MapPin, Phone, Mail, Calendar, 
  DollarSign, FileText, MessageSquare, ExternalLink,
  Copy, Check, Edit2, Save, X, ChevronRight,
  ClipboardList, Send, Clock, AlertCircle, CheckCircle2,
  Zap, Camera, Info, BarChart3, Users, PenTool
} from 'lucide-react';
import AcceptanceModal from '../components/AcceptanceModal';

interface EstimateDetailViewProps {
  job: Job;
  onBack: () => void;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
  onUpdatePipelineStage: (jobId: string, newStage: PipelineStage) => void;
  onOpenEstimator: (job: Job) => void;
  onPreviewPortal: (job: Job) => void;
}

const EstimateDetailView: React.FC<EstimateDetailViewProps> = ({
  job, onBack, onUpdateJob, onUpdatePipelineStage, onOpenEstimator, onPreviewPortal
}) => {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    clientName: job.clientName || '',
    clientPhone: job.clientPhone || '',
    clientEmail: job.clientEmail || '',
    projectAddress: job.projectAddress || '',
    scopeSummary: job.scopeSummary || '',
  });
  const [copied, setCopied] = useState(false);
  const [showAcceptance, setShowAcceptance] = useState(false);

  // Lead temperature calculation from original
  const engagementHeat = useMemo(() => {
    if (!job.portalEngagement) return 'cold';
    const { totalOpens, totalTimeSpentSeconds, lastOpenedAt } = job.portalEngagement;
    const isRecentlyOpened = lastOpenedAt && (Date.now() - new Date(lastOpenedAt).getTime()) < 24 * 60 * 60 * 1000;
    if (totalOpens > 5 || totalTimeSpentSeconds > 300 || isRecentlyOpened) return 'hot';
    if (totalOpens > 2 || totalTimeSpentSeconds > 60) return 'warm';
    return 'cold';
  }, [job.portalEngagement]);

  const getStageLabel = (stage: PipelineStage) => {
    const labels: Record<string, string> = {
      [PipelineStage.LEAD_IN]: 'New Lead',
      [PipelineStage.FIRST_CONTACT]: 'First Contact',
      [PipelineStage.SECOND_CONTACT]: 'Second Contact',
      [PipelineStage.THIRD_CONTACT]: 'Third Contact',
      [PipelineStage.LEAD_ON_HOLD]: 'On Hold',
      [PipelineStage.LEAD_WON]: 'Won',
      [PipelineStage.LEAD_LOST]: 'Lost',
      [PipelineStage.EST_UNSCHEDULED]: 'Unscheduled',
      [PipelineStage.EST_SCHEDULED]: 'Scheduled',
      [PipelineStage.EST_IN_PROGRESS]: 'In Progress',
      [PipelineStage.EST_COMPLETED]: 'Completed',
      [PipelineStage.EST_SENT]: 'Estimate Sent',
      [PipelineStage.EST_ON_HOLD]: 'On Hold',
      [PipelineStage.EST_APPROVED]: 'Approved',
      [PipelineStage.EST_REJECTED]: 'Rejected',
      // Legacy
      [PipelineStage.SITE_VISIT_SCHEDULED]: 'Site Visit',
      [PipelineStage.ESTIMATE_IN_PROGRESS]: 'Estimating',
      [PipelineStage.ESTIMATE_SENT]: 'Sent',
      [PipelineStage.FOLLOW_UP]: 'Follow Up',
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: PipelineStage) => {
    if ([PipelineStage.EST_APPROVED, PipelineStage.LEAD_WON].includes(stage)) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if ([PipelineStage.EST_REJECTED, PipelineStage.LEAD_LOST].includes(stage)) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if ([PipelineStage.EST_ON_HOLD, PipelineStage.LEAD_ON_HOLD].includes(stage)) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if ([PipelineStage.EST_SENT, PipelineStage.ESTIMATE_SENT].includes(stage)) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if ([PipelineStage.EST_IN_PROGRESS, PipelineStage.ESTIMATE_IN_PROGRESS].includes(stage)) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border-[var(--border-color)]';
  };

  const heatColor = {
    hot: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500', badge: 'bg-orange-500 text-black' },
    warm: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    cold: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  }[engagementHeat];

  const isLeadStage = [
    PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.SECOND_CONTACT,
    PipelineStage.THIRD_CONTACT, PipelineStage.LEAD_ON_HOLD, PipelineStage.LEAD_WON, PipelineStage.LEAD_LOST
  ].includes(job.pipelineStage);

  const moveOptions = isLeadStage
    ? [PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.SECOND_CONTACT, PipelineStage.THIRD_CONTACT, PipelineStage.LEAD_ON_HOLD, PipelineStage.LEAD_WON, PipelineStage.LEAD_LOST]
    : [PipelineStage.EST_UNSCHEDULED, PipelineStage.EST_SCHEDULED, PipelineStage.EST_IN_PROGRESS, PipelineStage.EST_COMPLETED, PipelineStage.EST_SENT, PipelineStage.EST_ON_HOLD, PipelineStage.EST_APPROVED, PipelineStage.EST_REJECTED];

  const handleSaveEdit = () => {
    onUpdateJob(job.id, editData);
    setEditing(false);
  };

  const copyPortalLink = () => {
    const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePortalLink = (type: 'sms' | 'email') => {
    const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;
    const message = `Hi ${job.clientName}, here is your estimate portal link for your Luxury Decking project: ${portalUrl}`;
    if (type === 'sms') {
      window.location.href = `sms:${job.clientPhone || ''}?body=${encodeURIComponent(message)}`;
    } else {
      window.location.href = `mailto:${job.clientEmail || ''}?subject=${encodeURIComponent('Your Luxury Decking Estimate')}&body=${encodeURIComponent(message)}`;
    }
  };

  const amount = job.totalAmount || job.estimateAmount || 0;

  return (
    <div className="min-h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all">
                <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{job.jobNumber}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${getStageColor(job.pipelineStage)}`}>
                    {getStageLabel(job.pipelineStage)}
                  </span>
                  {job.portalEngagement && (
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${heatColor.badge.includes('bg-orange') ? heatColor.badge : heatColor.badge}`}>
                      <Zap className="w-3 h-3" /> {engagementHeat.toUpperCase()}
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{job.clientName || 'Unnamed Lead'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={job.pipelineStage}
                onChange={(e) => onUpdatePipelineStage(job.id, e.target.value as PipelineStage)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
              >
                {moveOptions.map(stage => (
                  <option key={stage} value={stage}>{getStageLabel(stage)}</option>
                ))}
              </select>
              <button
                onClick={() => onOpenEstimator(job)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition-all"
              >
                <DollarSign className="w-4 h-4" /> Open Estimator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">

            {/* Proposal Engagement Tracking */}
            {job.portalEngagement && (
              <div className={`rounded-xl border p-6 relative overflow-hidden ${heatColor.bg} ${heatColor.border}`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${heatColor.bg} ${heatColor.border} ${heatColor.text}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-[10px] font-bold uppercase tracking-widest ${heatColor.text}`}>Proposal Engagement</h3>
                      <p className="text-sm font-bold text-[var(--text-primary)]">Customer Interest Signals</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest ${heatColor.badge}`}>
                    <Zap className="w-3 h-3 inline mr-1" />{engagementHeat} Lead
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total Opens</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{job.portalEngagement.totalOpens}</p>
                    <p className="text-[8px] text-[var(--text-secondary)]">Portal Sessions</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Time Spent</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{Math.floor(job.portalEngagement.totalTimeSpentSeconds / 60)}m {job.portalEngagement.totalTimeSpentSeconds % 60}s</p>
                    <p className="text-[8px] text-[var(--text-secondary)]">Total Attention</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Option Clicks</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {Object.values(job.portalEngagement.optionClicks || {}).reduce((a: number, b: number) => a + b, 0)}
                    </p>
                    <p className="text-[8px] text-[var(--text-secondary)]">Comparison Activity</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Last Activity</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] mt-1">
                      {job.portalEngagement.lastOpenedAt ? new Date(job.portalEngagement.lastOpenedAt).toLocaleDateString('en-CA') : 'N/A'}
                    </p>
                    <p className="text-[8px] text-[var(--text-secondary)]">Recency Signal</p>
                  </div>
                </div>

                {/* Option engagement breakdown */}
                {job.estimateData?.options && job.estimateData.options.length > 0 && (
                  <div className="mt-4 p-4 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                    <h4 className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BarChart3 className="w-3 h-3" /> Option Engagement
                    </h4>
                    <div className="space-y-2">
                      {job.estimateData.options.map((opt: any) => (
                        <div key={opt.id} className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{opt.name}</span>
                          <div className="flex-1 mx-3 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (job.portalEngagement?.optionClicks?.[opt.id] || 0) * 20)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{job.portalEngagement?.optionClicks?.[opt.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Client Information */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Client Information
                </h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-all">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400"><Save className="w-3.5 h-3.5" /> Save</button>
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X className="w-3.5 h-3.5" /> Cancel</button>
                  </div>
                )}
              </div>
              <div className="p-5">
                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Name</label>
                      <input value={editData.clientName} onChange={e => setEditData(p => ({...p, clientName: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Phone</label>
                      <input value={editData.clientPhone} onChange={e => setEditData(p => ({...p, clientPhone: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Email</label>
                      <input value={editData.clientEmail} onChange={e => setEditData(p => ({...p, clientEmail: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Address</label>
                      <input value={editData.projectAddress} onChange={e => setEditData(p => ({...p, projectAddress: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Scope / Notes</label>
                      <textarea value={editData.scopeSummary} onChange={e => setEditData(p => ({...p, scopeSummary: e.target.value}))} rows={3}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50 resize-none" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center"><User className="w-4 h-4 text-[var(--text-secondary)]" /></div>
                      <div><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Name</p><p className="text-sm font-medium text-[var(--text-primary)]">{job.clientName || 'Not provided'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center"><Phone className="w-4 h-4 text-[var(--text-secondary)]" /></div>
                      <div><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Phone</p><p className="text-sm font-medium text-[var(--text-primary)]">{job.clientPhone || 'Not provided'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center"><Mail className="w-4 h-4 text-[var(--text-secondary)]" /></div>
                      <div><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Email</p><p className="text-sm font-medium text-[var(--text-primary)]">{job.clientEmail || 'Not provided'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center"><MapPin className="w-4 h-4 text-[var(--text-secondary)]" /></div>
                      <div><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Address</p><p className="text-sm font-medium text-[var(--text-primary)]">{job.projectAddress || 'Not provided'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center"><Zap className="w-4 h-4 text-[var(--text-secondary)]" /></div>
                      <div><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Lead Source</p><p className="text-sm font-medium text-[var(--text-primary)]">{job.leadSource || 'Website'}</p></div>
                    </div>
                    {job.scopeSummary && (
                      <div className="md:col-span-2 pt-3 border-t border-[var(--border-color)]">
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Scope / Notes</p>
                        <p className="text-sm text-[var(--text-primary)]">{job.scopeSummary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Site Assessment Photos */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" /> Site Assessment Photos
                </h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {job.files?.filter((f: any) => f.type === 'photo').length > 0 ? (
                    job.files.filter((f: any) => f.type === 'photo').slice(0, 8).map((photo: any) => (
                      <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border border-[var(--border-color)] relative group cursor-pointer">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 py-8 border-2 border-dashed border-[var(--border-color)] rounded-lg flex flex-col items-center justify-center text-center">
                      <Camera className="w-8 h-8 text-[var(--text-secondary)] opacity-20 mb-2" />
                      <p className="text-xs font-bold text-[var(--text-secondary)]">No site photos yet</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1">Estimators can upload photos during the site visit</p>
                    </div>
                  )}
                </div>

                {job.siteNotes && job.siteNotes.length > 0 && (
                  <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-2">
                      <ClipboardList className="w-3 h-3" /> Estimator Site Notes
                    </p>
                    <div className="space-y-2">
                      {job.siteNotes.slice(0, 3).map((note: any) => (
                        <div key={note.id} className="text-sm text-[var(--text-primary)] italic">
                          "{note.text}"
                          <span className="block text-[10px] font-bold text-[var(--text-secondary)] mt-0.5">- {note.author} | {note.timestamp?.split('T')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Estimate Data / Proposal Options */}
            {job.estimateData && (
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Estimate Proposal
                  </h2>
                  {job.portalEngagement && (
                    <div className="flex items-center gap-3 text-[10px] font-bold text-[var(--text-secondary)]">
                      <span>Opens: <span className="text-blue-500">{job.portalEngagement.totalOpens}</span></span>
                      <span>Last: <span className="text-blue-500">{job.portalEngagement.lastOpenedAt?.split('T')[0] || 'N/A'}</span></span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {job.estimateData.options.map((option: any) => (
                      <div key={option.id} className={`p-4 rounded-lg border transition-all ${
                        job.acceptedOptionId === option.id 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{option.name}</p>
                          {job.acceptedOptionId === option.id && (
                            <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-bold uppercase rounded">Accepted</span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{option.title}</p>
                        <p className="text-lg font-bold text-[var(--text-primary)]">${option.price.toLocaleString()}</p>
                        {option.features && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {option.features.slice(0, 3).map((f: string, i: number) => (
                              <span key={i} className="text-[8px] font-bold text-[var(--text-secondary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded uppercase tracking-wider">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Accepted Build Summary */}
            {job.acceptedBuildSummary && !job.estimateData && (
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Estimate Summary</h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total</p>
                      <p className="text-lg font-bold text-emerald-500">${(job.totalAmount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Material</p>
                      <p className="text-lg font-bold text-[var(--text-primary)]">${(job.materialCost || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Labour</p>
                      <p className="text-lg font-bold text-[var(--text-primary)]">${(job.labourCost || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Sent</p>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{job.estimateSentDate ? new Date(job.estimateSentDate).toLocaleDateString('en-CA') : 'Not sent'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Status */}
          <div className="lg:col-span-4 space-y-6">

            {/* Quick Actions */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => onOpenEstimator(job)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 transition-all">
                  <DollarSign className="w-4 h-4" /> Open in Estimator
                </button>
                {amount > 0 && !job.customerSignature && (
                  <button onClick={() => setShowAcceptance(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-all">
                    <PenTool className="w-4 h-4" /> Accept & Sign (On-Site)
                  </button>
                )}
                {job.customerSignature && (
                  <div className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-bold text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" /> Signed & Accepted
                  </div>
                )}
                {amount > 0 && !job.customerSignature && job.clientEmail && (
                  <button onClick={() => {
                    sharePortalLink('email');
                    onUpdatePipelineStage(job.id, PipelineStage.EST_SENT);
                  }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-500 transition-all">
                    <Send className="w-4 h-4" /> Send Estimate to Client
                  </button>
                )}
                <button onClick={() => onPreviewPortal(job)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-emerald-500/30 transition-all">
                  <ExternalLink className="w-4 h-4" /> Preview Portal
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => sharePortalLink('sms')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" /> SMS Link
                  </button>
                  <button onClick={() => sharePortalLink('email')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-xs font-bold hover:bg-blue-500/20 transition-all">
                    <Mail className="w-3.5 h-3.5" /> Email Link
                  </button>
                </div>
                <button onClick={copyPortalLink}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-emerald-500/30 transition-all">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Portal Link'}
                </button>
                {job.clientPhone && (
                  <a href={`tel:${job.clientPhone}`}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-emerald-500/30 transition-all">
                    <Phone className="w-4 h-4" /> Call Client
                  </a>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Status</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Stage</p>
                  <span className={`inline-flex text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${getStageColor(job.pipelineStage)}`}>
                    {getStageLabel(job.pipelineStage)}
                  </span>
                </div>
                {amount > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Amount</p>
                    <p className="text-lg font-bold text-emerald-500">${amount.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Created</p>
                  <p className="text-sm text-[var(--text-primary)]">{job.updatedAt ? new Date(job.updatedAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}</p>
                </div>
                {job.estimateStatus && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Estimate Status</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] capitalize">{job.estimateStatus.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Move to Jobs (when approved) */}
            {job.pipelineStage === PipelineStage.EST_APPROVED && (
              <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-bold text-emerald-500">Estimate Approved</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Move to the Jobs pipeline to begin the project workflow.</p>
                <button onClick={() => onUpdatePipelineStage(job.id, PipelineStage.JOB_SOLD)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500 transition-all">
                  Move to Job Sold <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Notes */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Notes</h2>
              </div>
              <div className="p-4">
                {job.officeNotes && job.officeNotes.length > 0 ? (
                  <div className="space-y-2">
                    {job.officeNotes.slice(0, 5).map((note: any, i: number) => (
                      <div key={i} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-sm text-[var(--text-primary)]">{typeof note === 'string' ? note : note.text || ''}</p>
                        {typeof note === 'object' && note.date && <p className="text-[10px] text-[var(--text-secondary)] mt-1">{new Date(note.date).toLocaleDateString('en-CA')}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)] text-center py-4">No notes yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acceptance Modal */}
      <AcceptanceModal
        job={job}
        isOpen={showAcceptance}
        onClose={() => setShowAcceptance(false)}
        onAccept={(jobId, updates) => {
          onUpdateJob(jobId, updates);
          if (updates.pipelineStage) {
            onUpdatePipelineStage(jobId, updates.pipelineStage);
          }
          setShowAcceptance(false);
        }}
      />
    </div>
  );
};

export default EstimateDetailView;
