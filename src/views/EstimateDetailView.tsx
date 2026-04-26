import React, { useState, useMemo, useEffect } from 'react';
import { Job, PipelineStage, CustomerLifecycle, LiveEstimateItem, LiveEstimate, EstimateOption, EstimateAddOn, JobFile, JobNote, SiteIntakeChecklist } from '../types';
import {
  ArrowLeft, ArrowRight, User, MapPin, Phone, Mail, Calendar,
  DollarSign, FileText, MessageSquare, ExternalLink,
  Copy, Check, Edit2, Save, X, ChevronRight,
  ClipboardList, Send, Clock, AlertCircle, CheckCircle2,
  Zap, Camera, Info, BarChart3, Users, PenTool, CalendarPlus, ChevronDown, ChevronUp,
  Plus, Trash2, Calculator, Download, RefreshCw
} from 'lucide-react';
import AcceptanceModal from '../components/AcceptanceModal';
import CustomerChatThread from '../components/CustomerChatThread';
import { calculateEngagementTier } from '../utils/engagementScoring';
import { COMPANY } from '../config/company';
import { getCampaignTouches } from '../utils/dripCampaign';

interface EstimateDetailViewProps {
  job: Job;
  onBack: () => void;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
  onUpdatePipelineStage: (jobId: string, newStage: PipelineStage) => void;
  onOpenEstimator: (job: Job) => void;
  onPreviewPortal: (job: Job) => void;
  onDeleteJob?: (jobId: string) => void;
  onJobAccepted?: (jobId: string) => void;
  onBookAppointment?: (job: Job) => void;
}

const EstimateDetailView: React.FC<EstimateDetailViewProps> = ({
  job, onBack, onUpdateJob, onUpdatePipelineStage, onOpenEstimator, onPreviewPortal, onDeleteJob, onJobAccepted, onBookAppointment
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
  const [sendingTouchId, setSendingTouchId] = useState<string | null>(null);
  const [expandedTouchId, setExpandedTouchId] = useState<string | null>(null);
  const [touchSentFeedback, setTouchSentFeedback] = useState<string | null>(null);
  // Tracks which channel (sms vs email) is being previewed inside the expanded
  // touch row, so the user can toggle when a touch sends both.
  const [activePreviewChannel, setActivePreviewChannel] = useState<Record<string, 'sms' | 'email'>>({});

  // ── Multi-option switcher ─────────────────────────────────────────────────
  // When the estimate has multiple options (A, B, C…) the user can switch
  // between them and the itemized breakdown updates to match.
  const estimateOptions = job.estimateData?.options ?? [];
  const hasMultipleOptions = estimateOptions.length > 1;
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);
  const selectedOption = estimateOptions[selectedOptionIdx] ?? null;

  // Resolve the items to show: prefer per-option itemizedItems (richer data),
  // fall back to liveEstimate.items for legacy single-option estimates.
  const resolvedItems: LiveEstimateItem[] = useMemo(() => {
    if (selectedOption?.itemizedItems && selectedOption.itemizedItems.length > 0) {
      return selectedOption.itemizedItems;
    }
    return job.liveEstimate?.items ?? [];
  }, [selectedOption, job.liveEstimate]);

  // Live Itemized Estimate state
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [liveItems, setLiveItems] = useState<LiveEstimateItem[]>(() => resolvedItems);
  const [liveDiscount, setLiveDiscount] = useState<number>(
    () => job.liveEstimate?.discount ?? 0
  );
  const [discountNote, setDiscountNote] = useState<string>(
    () => job.liveEstimate?.discountNote ?? ''
  );

  // Sync live estimate state when job or selected option changes
  useEffect(() => {
    setLiveItems(resolvedItems);
    setLiveDiscount(job.liveEstimate?.discount ?? 0);
    setDiscountNote(job.liveEstimate?.discountNote ?? '');
    setEditingEstimate(false);
  }, [job.id, job.liveEstimate, selectedOptionIdx]);

  // Campaign queue: get engagement-adapted touches for this job
  const campaignTouches = useMemo(() => {
    if (!job.dripCampaign) return [];
    return getCampaignTouches(job.dripCampaign.campaignType, job, job.portalEngagement);
  }, [job]);

  const handleSendTouch = async (touchId: string, channel: 'sms' | 'email' | 'sms+email', smsBody: string, emailBody: string, subject?: string) => {
    if (!job.clientPhone && !job.clientEmail) return;
    setSendingTouchId(touchId);
    try {
      const sends: Promise<Response>[] = [];
      if ((channel === 'sms' || channel === 'sms+email') && job.clientPhone) {
        sends.push(fetch('/.netlify/functions/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: job.clientPhone, message: smsBody }),
        }));
      }
      if ((channel === 'email' || channel === 'sms+email') && job.clientEmail) {
        const htmlBody = emailBody.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>');
        sends.push(fetch('/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: job.clientEmail, subject: subject || `${COMPANY.name} Follow-Up`, htmlBody }),
        }));
      }
      await Promise.all(sends);
      const tier = calculateEngagementTier(job.portalEngagement).tier;
      const updatedCampaign = {
        ...job.dripCampaign!,
        completedTouches: [...(job.dripCampaign!.completedTouches || []), touchId],
        sentMessages: [...(job.dripCampaign!.sentMessages || []), {
          touchId,
          channel: (channel === 'sms+email' ? 'email' : channel) as 'sms' | 'email',
          sentAt: new Date().toISOString(),
          engagementTier: tier,
        }],
      };
      onUpdateJob(job.id, { dripCampaign: updatedCampaign });
      setTouchSentFeedback(touchId);
      setTimeout(() => setTouchSentFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to send touch:', err);
    } finally {
      setSendingTouchId(null);
    }
  };

  // Lead temperature calculation from original
  const engagementScore = useMemo(() => {
    return calculateEngagementTier(job.portalEngagement);
  }, [job.portalEngagement]);

  const engagementHeat = engagementScore.tier.toLowerCase();

  const getStageLabel = (stage: PipelineStage) => {
    const labels: Record<string, string> = {
      [PipelineStage.LEAD_IN]: 'New Lead · D0',
      [PipelineStage.FIRST_CONTACT]: '1st Contact · D1',
      [PipelineStage.SECOND_CONTACT]: '2nd Contact · D3',
      [PipelineStage.THIRD_CONTACT]: '3rd Contact · D7',
      [PipelineStage.LEAD_ON_HOLD]: 'Re-Engage · D30',
      [PipelineStage.LEAD_WON]: 'Won',
      [PipelineStage.LEAD_LOST]: 'Lead Lost',
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
    if ([PipelineStage.EST_APPROVED, PipelineStage.LEAD_WON].includes(stage)) return 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20';
    if ([PipelineStage.EST_REJECTED, PipelineStage.LEAD_LOST].includes(stage)) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if ([PipelineStage.EST_ON_HOLD, PipelineStage.LEAD_ON_HOLD].includes(stage)) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if ([PipelineStage.EST_SENT, PipelineStage.ESTIMATE_SENT].includes(stage)) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if ([PipelineStage.EST_IN_PROGRESS, PipelineStage.ESTIMATE_IN_PROGRESS].includes(stage)) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border-[var(--border-color)]';
  };

  const heatColor = ({
    hot: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', badge: 'bg-amber-500 text-white' },
    warm: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    cool: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    cold: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-500', badge: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  } as Record<string, { bg: string; border: string; text: string; badge: string }>)[engagementHeat] || { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-500', badge: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };

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
    const message = `Hi ${job.clientName}, here is your estimate portal link for your ${COMPANY.name} project: ${portalUrl}`;
    if (type === 'sms') {
      window.location.href = `sms:${job.clientPhone || ''}?body=${encodeURIComponent(message)}`;
    } else {
      const mailLink = document.createElement('a'); mailLink.href = `mailto:${job.clientEmail || ''}?subject=${encodeURIComponent(`Your ${COMPANY.name} Estimate`)}&body=${encodeURIComponent(message)}`; mailLink.click();
    }
  };

  const amount = job.totalAmount || job.estimateAmount || 0;

  const liveSubtotal = liveItems.reduce((sum, item) => sum + item.value, 0) - liveDiscount;
  const liveHst = Math.round(liveSubtotal * 0.13);
  const liveTotal = liveSubtotal + liveHst;

  const handleSaveLiveEstimate = () => {
    const updated: LiveEstimate = {
      items: liveItems,
      discount: liveDiscount,
      discountNote,
      lastUpdated: new Date().toISOString(),
    };
    onUpdateJob(job.id, {
      liveEstimate: updated,
      estimateAmount: liveSubtotal,
      totalAmount: liveTotal,
    });
    setEditingEstimate(false);
  };

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
                  <span className="text-[10px] font-bold text-[var(--brand-gold)] uppercase tracking-widest">{job.jobNumber}</span>
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
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50"
              >
                {moveOptions.map(stage => (
                  <option key={stage} value={stage}>{getStageLabel(stage)}</option>
                ))}
              </select>
              <button
                onClick={() => onOpenEstimator(job)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-white rounded-lg text-xs font-bold hover:bg-[var(--brand-gold)] transition-all"
              >
                <DollarSign className="w-4 h-4" /> Open Estimator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Customer-Requested Material Swap Banner — unreconciled */}
        {job.customerRequestedSwaps && job.customerRequestedSwaps.some(s => !s.reconciledAt) && (
          <div className="mb-6 rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Customer-Requested Material Swap</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-white">Needs Reconciliation</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  The customer swapped materials on their accepted quote via the portal.
                  Confirm availability, verify pricing, and update the quoted option before production kickoff.
                </p>
                <div className="space-y-2">
                  {job.customerRequestedSwaps.filter(s => !s.reconciledAt).map((swap, i) => (
                    <div key={i} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Option {swap.optionId.replace(/^opt-/i, '').split('-')[0].toUpperCase()}</span>
                          <span className="text-[var(--text-secondary)]">Decking:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{swap.fromName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                          <span className="font-semibold text-amber-600">{swap.toBrand ? `${swap.toBrand} ${swap.toName}` : swap.toName}</span>
                        </div>
                        <span className={`text-sm font-black ${swap.priceImpact >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {swap.priceImpact >= 0 ? '+' : '−'}${Math.abs(swap.priceImpact).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1.5">
                        Requested {new Date(swap.timestamp).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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

                {/* Share-with-partner activity (Asset 08 telemetry).
                    Shows each recipient the customer shared the proposal to,
                    how many times the partner-tagged link was opened, AND any
                    downloads of the Contractor Comparison Checklist PDF. */}
                {(job.portalEngagement.sharesSent && job.portalEngagement.sharesSent.length > 0) ||
                 (job.portalEngagement.partnerOpens && job.portalEngagement.partnerOpens > 0) ||
                 (job.portalEngagement.pdfDownloads && job.portalEngagement.pdfDownloads.length > 0) ? (
                  <div className="mt-4 p-4 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                    <h4 className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Send className="w-3 h-3 text-[var(--brand-gold)]" /> Share & Intent Signals
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Sent to Partner</p>
                        <p className="text-xl font-bold text-[var(--text-primary)]">
                          {job.portalEngagement.sharesSent?.length || 0}
                          <span className="text-[9px] text-[var(--text-secondary)] uppercase ml-2 tracking-widest font-medium">recipients</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Partner Opens</p>
                        <p className="text-xl font-bold text-[var(--brand-gold)]">
                          {job.portalEngagement.partnerOpens || 0}
                          <span className="text-[9px] text-[var(--text-secondary)] uppercase ml-2 tracking-widest font-medium">
                            {job.portalEngagement.lastPartnerOpenAt ? `last: ${new Date(job.portalEngagement.lastPartnerOpenAt).toLocaleDateString('en-CA')}` : 'not yet'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Checklist PDF</p>
                        <p className="text-xl font-bold text-[var(--brand-gold)]">
                          {job.portalEngagement.pdfDownloads?.length || 0}
                          <span className="text-[9px] text-[var(--text-secondary)] uppercase ml-2 tracking-widest font-medium">downloads</span>
                        </p>
                      </div>
                    </div>
                    {job.portalEngagement.sharesSent && job.portalEngagement.sharesSent.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-color)] space-y-1.5">
                        {job.portalEngagement.sharesSent.slice(-5).reverse().map((s, i) => (
                          <div key={i} className="flex items-baseline justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <ArrowRight className="w-3 h-3 text-[var(--brand-gold)] shrink-0" />
                              <span className="text-[var(--text-primary)] font-medium truncate">
                                {s.recipientName ? `${s.recipientName} ` : ''}&lt;{s.recipientEmail}&gt;
                              </span>
                            </div>
                            <span className="text-[var(--text-secondary)] shrink-0 ml-2 text-[10px] uppercase tracking-widest">
                              {new Date(s.sentAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>
                        ))}
                        {job.portalEngagement.sharesSent.length > 5 && (
                          <p className="text-[10px] text-[var(--text-secondary)] italic mt-2">
                            + {job.portalEngagement.sharesSent.length - 5} more earlier shares
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Option engagement breakdown */}
                {job.estimateData?.options && job.estimateData.options.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                      <h4 className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-blue-500" /> Option Engagement
                      </h4>
                      <div className="space-y-2">
                        {job.estimateData.options.map((opt: EstimateOption) => (
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
                    <div className="p-4 bg-[var(--bg-primary)]/50 rounded-lg border border-[var(--border-color)]">
                      <h4 className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-amber-500" /> Upgrade Interest
                      </h4>
                      <div className="space-y-2">
                        {job.estimateData?.addOns && job.estimateData.addOns.length > 0 ? (
                          job.estimateData.addOns.slice(0, 4).map((addon: EstimateAddOn) => (
                            <div key={addon.id} className="flex items-center justify-between">
                              <span className="text-xs font-medium text-[var(--text-secondary)]">{addon.name}</span>
                              <div className="flex-1 mx-3 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (job.portalEngagement?.addOnInteractions?.[addon.id] || 0) * 25)}%` }} />
                              </div>
                              <span className="text-xs font-bold text-[var(--text-primary)]">{job.portalEngagement?.addOnInteractions?.[addon.id] || 0}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--text-secondary)]">No add-on interactions yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Scheduled Appointment Banner */}
            {job.pipelineStage === PipelineStage.EST_SCHEDULED && job.scheduledDate && (() => {
              const appt = new Date(job.scheduledDate);
              const hasTime = job.scheduledDate.includes('T');
              const dateStr = appt.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
              const timeStr = hasTime ? appt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true }) : null;
              const isToday = appt.toDateString() === new Date().toDateString();
              const isTomorrow = appt.toDateString() === new Date(Date.now() + 86400000).toDateString();
              const urgencyLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : null;
              return (
                <div className={`rounded-xl border overflow-hidden ${isToday ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/40' : 'bg-blue-500/5 border-blue-500/20'}`}>
                  <div className={`px-5 py-3 border-b ${isToday ? 'border-[var(--brand-gold)]/20' : 'border-blue-500/10'} flex items-center gap-2`}>
                    <Calendar className={`w-3.5 h-3.5 ${isToday ? 'text-[var(--brand-gold)]' : 'text-blue-400'}`} />
                    <span className={`text-xs font-black uppercase tracking-widest ${isToday ? 'text-[var(--brand-gold)]' : 'text-blue-400'}`}>
                      Scheduled Appointment{urgencyLabel ? ` — ${urgencyLabel}` : ''}
                    </span>
                  </div>
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{dateStr}</p>
                      {timeStr && <p className={`text-2xl font-black mt-1 ${isToday ? 'text-[var(--brand-gold)]' : 'text-[var(--text-primary)]'}`}>{timeStr}</p>}
                    </div>
                    {job.projectAddress && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.projectAddress)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--brand-gold)] hover:border-[var(--brand-gold)]/30 transition-all">
                        <MapPin className="w-3.5 h-3.5" /> Directions
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Client Information */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Client Information
                </h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-[var(--brand-gold)] hover:text-[var(--brand-gold-light)] transition-all">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex items-center gap-1 text-xs font-bold text-[var(--brand-gold)] hover:text-[var(--brand-gold-light)]"><Save className="w-3.5 h-3.5" /> Save</button>
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
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Phone</label>
                      <input value={editData.clientPhone} onChange={e => setEditData(p => ({...p, clientPhone: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Email</label>
                      <input value={editData.clientEmail} onChange={e => setEditData(p => ({...p, clientEmail: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Address</label>
                      <input value={editData.projectAddress} onChange={e => setEditData(p => ({...p, projectAddress: e.target.value}))}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Scope / Notes</label>
                      <textarea value={editData.scopeSummary} onChange={e => setEditData(p => ({...p, scopeSummary: e.target.value}))} rows={3}
                        className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 resize-none" />
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
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Address</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text-primary)]">{job.projectAddress || 'Not provided'}</p>
                          {job.projectAddress && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.projectAddress)}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-[var(--brand-gold)] bg-[var(--brand-gold)]/5 rounded border border-[var(--brand-gold)]/10 hover:bg-[var(--brand-gold)]/10 transition-colors">
                              <ExternalLink className="w-3 h-3" /> Map
                            </a>
                          )}
                        </div>
                      </div>
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

            {/* ── INSTAQUOTE BLUEPRINT (only for InstaQuote-source leads) ──
                Shows the office exactly what the customer was quoted on the
                website calculator: their dimensions, the three tier prices
                they saw, and a download link to the actual PDF that was
                emailed to them. Lets the office answer customer questions
                with the same numbers the customer is looking at. */}
            {job.leadSource === 'instaquote' && job.sourceMetadata && (() => {
              const sm = job.sourceMetadata as {
                config?: {
                  width_ft?: number; length_ft?: number; sqft?: number;
                  perimeter_lin_ft?: number; steps?: number;
                  railing_material?: string; railing_sides?: number; railing_lin_ft?: number;
                };
                estimates?: {
                  silver?: { low: number; high: number };
                  gold?: { low: number; high: number };
                  platinum?: { low: number; high: number };
                };
                meta?: { page_url?: string; user_agent?: string; submitted_at_utc?: string };
                cross_pipeline_duplicate?: { existing_lead_id: string; existing_stage: string; existing_client_name?: string | null };
              };
              const cfg = sm.config || {};
              const est = sm.estimates || {};
              const meta = sm.meta || {};
              const dup = sm.cross_pipeline_duplicate;
              const fmt = (n?: number) => n != null ? '$' + Math.round(n).toLocaleString('en-CA') : '—';
              const range = (t?: { low: number; high: number }) => t ? `${fmt(t.low)} – ${fmt(t.high)}` : '—';
              const submittedAt = meta.submitted_at_utc
                ? new Date(meta.submitted_at_utc).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
                : '—';
              const railingLabel = (m?: string) =>
                m === 'pressure_treated' ? 'Pressure-treated wood'
                : m === 'aluminum' ? 'Aluminum'
                : m === 'glass' ? 'Glass'
                : m === 'none' ? 'No railings'
                : m || '—';
              return (
                <div className="bg-[var(--card-bg)] border border-[var(--brand-gold)]/30 rounded-2xl overflow-hidden shadow-lg">
                  {/* Header */}
                  <div className="px-5 py-4 bg-[var(--brand-gold)]/10 border-b border-[var(--brand-gold)]/20 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/30 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-[var(--brand-gold)]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.25em]">InstaQuote Submission</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">What the customer saw on the website</p>
                      </div>
                    </div>
                    {job.pdfUrl && (
                      <a
                        href={job.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-gold)] text-black rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md"
                        title="Open the branded PDF blueprint that was emailed to the customer"
                      >
                        <Download className="w-3.5 h-3.5" /> View Blueprint PDF
                      </a>
                    )}
                  </div>

                  {/* Returning-customer banner */}
                  {dup && (
                    <div className="px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <span className="font-bold">Returning customer.</span>{' '}
                        Already in your pipeline as{' '}
                        <span className="font-bold">{dup.existing_client_name || 'unnamed lead'}</span>{' '}
                        ({dup.existing_stage}). Multi-touch nurture suppressed to avoid double-touching — customer received the PDF as a transactional email.
                      </p>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-5 space-y-5">
                    {/* The 3 tier prices, exactly as the customer saw them */}
                    <div>
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3">Pricing The Customer Was Quoted</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                          <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Silver</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{range(est.silver)}</p>
                        </div>
                        <div className="p-4 bg-[var(--brand-gold)]/10 rounded-xl border border-[var(--brand-gold)]/30">
                          <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            Gold <span className="text-[8px] opacity-70">· Most chosen</span>
                          </p>
                          <p className="text-base font-bold text-[var(--brand-gold)]">{range(est.gold)}</p>
                        </div>
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                          <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-1">Platinum</p>
                          <p className="text-base font-bold text-[var(--text-primary)]">{range(est.platinum)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Configuration grid */}
                    <div>
                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3">Configuration</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                          <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Footprint</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {cfg.width_ft != null && cfg.length_ft != null ? `${cfg.width_ft} × ${cfg.length_ft} ft` : '—'}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{cfg.sqft ? `${cfg.sqft} sq ft` : ''}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                          <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Perimeter</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{cfg.perimeter_lin_ft ? `${cfg.perimeter_lin_ft} lin ft` : '—'}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                          <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Steps</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{cfg.steps != null ? cfg.steps : '—'}</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                          <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Railing</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{railingLabel(cfg.railing_material)}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                            {cfg.railing_sides != null ? `${cfg.railing_sides} side${cfg.railing_sides === 1 ? '' : 's'}` : ''}
                            {cfg.railing_lin_ft ? ` · ${cfg.railing_lin_ft} lin ft` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Submission metadata */}
                    <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <Calendar className="w-3 h-3" /> Submitted: {submittedAt}
                      </div>
                      {meta.page_url && (
                        <a
                          href={meta.page_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[var(--brand-gold)] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Source page
                        </a>
                      )}
                      {job.pdfGeneratedAt && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <FileText className="w-3 h-3" /> PDF generated: {new Date(job.pdfGeneratedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>

                    {!job.pdfUrl && (
                      <p className="text-[10px] text-[var(--text-tertiary)] italic">
                        PDF link not available on this lead (may have been created before PDF auto-attach went live, or the 30-day signed URL has expired).
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── CUSTOMER TEXT THREAD ──────────────────────────────────────
                Unified SMS history: inbound + outbound combined. Visible at
                every lifecycle stage (lead, estimate, sold, production) so
                anyone on the team can see the full conversation. */}
            <CustomerChatThread
              clientName={job.clientName}
              clientPhone={job.clientPhone}
              jobId={job.id}
            />

            {/* (Removed standalone Options Summary card — duplicated info that
                already appears as the option-switcher tabs inside the Itemized
                Estimate block below. Per Jack: too many repeated views.) */}

            {/* ── LIVE ITEMIZED ESTIMATE ────────────────────────────────────── */}
            {(job.liveEstimate || estimateOptions.length > 0 || (job.acceptedBuildSummary?.addOns && job.acceptedBuildSummary.addOns.length > 0)) && (
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">

                {/* Option switcher tabs — only shown when there are 2+ options */}
                {hasMultipleOptions && (
                  <div className="px-5 pt-4 pb-0">
                    <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Options</p>
                    <div className="flex gap-2 flex-wrap">
                      {estimateOptions.map((opt, idx) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOptionIdx(idx)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                            selectedOptionIdx === idx
                              ? 'bg-[var(--brand-gold)] text-black border-[var(--brand-gold)]'
                              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--brand-gold)]/40'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[9px] font-black">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {opt.name}
                          {opt.price > 0 && (
                            <span className={`ml-1 ${selectedOptionIdx === idx ? 'text-black/70' : 'text-[var(--brand-gold)]'}`}>
                              ${opt.price.toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)] mt-3">
                  <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
                    {hasMultipleOptions
                      ? `Itemized Estimate — ${selectedOption?.name ?? `Option ${String.fromCharCode(65 + selectedOptionIdx)}`}`
                      : 'Itemized Estimate'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {!editingEstimate ? (
                      <button
                        onClick={() => setEditingEstimate(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--brand-gold)]/40 transition-all text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingEstimate(false); setLiveItems(resolvedItems); setLiveDiscount(job.liveEstimate?.discount ?? 0); setDiscountNote(job.liveEstimate?.discountNote ?? ''); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-red-500/40 transition-all text-[10px] font-bold text-red-400 uppercase tracking-widest"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button
                          onClick={handleSaveLiveEstimate}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-gold)] hover:opacity-90 transition-all text-[10px] font-bold text-black uppercase tracking-widest"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 mb-2 px-2">
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Description</p>
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Qty</p>
                    <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest text-right">Amount</p>
                    <div />
                  </div>

                  {/* Line items */}
                  <div className="space-y-1">
                    {liveItems.map((item, idx) => (
                      <div key={item.id} className={`grid grid-cols-[1fr_80px_100px_32px] gap-2 px-2 py-2 rounded-lg ${idx % 2 === 0 ? 'bg-[var(--bg-secondary)]' : ''}`}>
                        {editingEstimate ? (
                          <>
                            <input
                              value={item.label}
                              onChange={e => setLiveItems(prev => prev.map((it, i) => i === idx ? { ...it, label: e.target.value } : it))}
                              className="text-xs text-[var(--text-primary)] bg-transparent border-b border-[var(--brand-gold)]/30 focus:outline-none focus:border-[var(--brand-gold)] px-1"
                            />
                            <input
                              value={item.quantity}
                              onChange={e => setLiveItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))}
                              className="text-xs text-[var(--text-secondary)] bg-transparent border-b border-[var(--brand-gold)]/30 focus:outline-none focus:border-[var(--brand-gold)] px-1"
                              placeholder="--"
                            />
                            <input
                              type="number"
                              value={item.value}
                              onChange={e => setLiveItems(prev => prev.map((it, i) => i === idx ? { ...it, value: Number(e.target.value) } : it))}
                              className="text-xs font-bold text-[var(--text-primary)] bg-transparent border-b border-[var(--brand-gold)]/30 focus:outline-none focus:border-[var(--brand-gold)] text-right px-1"
                            />
                            <button onClick={() => setLiveItems(prev => prev.filter((_, i) => i !== idx))} className="flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-[var(--text-primary)]">{item.label}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{item.quantity || '--'}</p>
                            <p className="text-xs font-bold text-[var(--text-primary)] text-right">
                              {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(item.value)}
                            </p>
                            <div />
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add row button (edit mode only) */}
                  {editingEstimate && (
                    <button
                      onClick={() => setLiveItems(prev => [...prev, { id: `item-${Date.now()}`, label: '', quantity: '', value: 0 }])}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--brand-gold)]/30 hover:border-[var(--brand-gold)]/60 transition-all text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest w-full justify-center"
                    >
                      <Plus className="w-3 h-3" /> Add Line Item
                    </button>
                  )}

                  {/* Discount row */}
                  {(editingEstimate || liveDiscount > 0) && (
                    <div className="mt-3 grid grid-cols-[1fr_80px_100px_32px] gap-2 px-2 py-2 rounded-lg border border-dashed border-[var(--brand-gold)]/20">
                      {editingEstimate ? (
                        <>
                          <input
                            value={discountNote}
                            onChange={e => setDiscountNote(e.target.value)}
                            placeholder="Discount note (optional)"
                            className="text-xs text-[var(--brand-gold)] bg-transparent border-b border-[var(--brand-gold)]/30 focus:outline-none focus:border-[var(--brand-gold)] px-1"
                          />
                          <p className="text-xs text-[var(--text-secondary)]">Discount</p>
                          <input
                            type="number"
                            value={liveDiscount}
                            onChange={e => setLiveDiscount(Number(e.target.value))}
                            className="text-xs font-bold text-[var(--brand-gold)] bg-transparent border-b border-[var(--brand-gold)]/30 focus:outline-none focus:border-[var(--brand-gold)] text-right px-1"
                            min={0}
                          />
                          <div />
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-[var(--brand-gold)]">{discountNote || 'Discount'}</p>
                          <div /><div /><div />
                          <p className="text-xs font-bold text-[var(--brand-gold)] text-right col-start-3">
                            -{new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(liveDiscount)}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="mt-4 border-t border-[var(--border-color)] pt-4 space-y-2">
                    <div className="flex justify-between px-2">
                      <span className="text-xs text-[var(--text-secondary)]">Subtotal</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(liveSubtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between px-2">
                      <span className="text-xs text-[var(--text-secondary)]">HST (13%)</span>
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(liveHst)}
                      </span>
                    </div>
                    <div className="flex justify-between px-2 pt-2 border-t border-[var(--border-color)]">
                      <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Total</span>
                      <span className="text-sm font-black text-[var(--brand-gold)]">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(liveTotal)}
                      </span>
                    </div>
                    {job.liveEstimate?.lastUpdated && !editingEstimate && (
                      <p className="text-[9px] text-[var(--text-secondary)] text-right px-2 pt-1">
                        Last updated {new Date(job.liveEstimate.lastUpdated).toLocaleDateString('en-CA')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Estimate Documents */}
            {job.files?.some((f: JobFile) => f.type === 'estimate' || f.type === 'contract') && (
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[var(--brand-gold)]" /> Estimate Documents
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {job.files
                    .filter((f: JobFile) => f.type === 'estimate' || f.type === 'contract')
                    .map((file: JobFile) => (
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
                        className={`flex items-center gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] transition-all group ${file.url ? 'cursor-pointer hover:border-[var(--brand-gold)]/40 hover:bg-[var(--bg-tertiary)]' : 'opacity-50 cursor-default'}`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-[var(--brand-gold)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-gold)] transition-colors">{file.name}</p>
                          <p className="text-[9px] text-[var(--text-secondary)] uppercase font-black tracking-widest mt-0.5">
                            {file.type === 'estimate' ? 'Itemized Estimate PDF' : 'Signed Contract'}
                            {!file.url && ' · Pending'}
                          </p>
                        </div>
                        {file.url && <ExternalLink className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-[var(--brand-gold)] transition-colors shrink-0" />}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Site Assessment Photos */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5" /> Site Assessment Photos
                </h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {job.files?.filter((f: JobFile) => f.type === 'photo').length > 0 ? (
                    job.files.filter((f: JobFile) => f.type === 'photo').slice(0, 8).map((photo: JobFile) => (
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
                      {job.siteNotes.slice(0, 3).map((note: JobNote) => (
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

            {/* Site Dimensions & Measurements */}
            {(job.estimatorIntake?.measureSheet || job.calculatorDimensions || job.acceptedBuildSummary) && (
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Site Dimensions & Measurements
                  </h2>
                </div>
                <div className="p-5">
                  {job.estimatorIntake?.measureSheet ? (() => {
                    const ms = job.estimatorIntake!.measureSheet;
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ms.deckSqft > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Deck Area</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.deckSqft} sqft</p></div>}
                        {ms.footingCount > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Footings</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.footingCount} ({ms.footingType})</p></div>}
                        {ms.ledgerLength > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Ledger</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.ledgerLength} LF</p></div>}
                        {ms.fasciaLf > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Fascia</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.fasciaLf} LF</p></div>}
                        {ms.stairLf > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Stairs</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.stairLf} LF</p></div>}
                        {ms.woodRailingLf > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Wood Railing</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.woodRailingLf} LF</p></div>}
                        {ms.aluminumPostCount > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Alum. Posts</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.aluminumPostCount}</p></div>}
                        {ms.aluminum6ftSections > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Alum. 6ft Sections</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.aluminum6ftSections}</p></div>}
                        {ms.skirtingSqft > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Skirting</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.skirtingSqft} sqft</p></div>}
                        {ms.privacyWallLf > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Privacy Wall</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.privacyWallLf} LF</p></div>}
                        {ms.demoSqft > 0 && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Demo</p><p className="text-lg font-bold text-[var(--text-primary)]">{ms.demoSqft} sqft</p></div>}
                        {ms.elevationNote && <div className="p-3 bg-[var(--bg-secondary)] rounded-lg col-span-2"><p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Elevation Notes</p><p className="text-sm text-[var(--text-primary)]">{ms.elevationNote}</p></div>}
                      </div>
                    );
                  })() : job.calculatorDimensions ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(job.calculatorDimensions).filter(([_, v]) => v > 0).map(([key, val]) => {
                        const labels: Record<string, string> = {
                          sqft: 'Deck Area', footingsCount: 'Footings', steps: 'Stairs', fasciaLF: 'Fascia',
                          railingLF: 'Railing', alumPosts: 'Alum. Posts', alumSection6: 'Alum. 6ft', alumSection8: 'Alum. 8ft',
                          skirtingSqFt: 'Skirting', privacyLF: 'Privacy Wall', demoSqFt: 'Demo', borderLF: 'Picture Frame'
                        };
                        const units: Record<string, string> = {
                          sqft: 'sqft', footingsCount: '', steps: 'LF', fasciaLF: 'LF',
                          railingLF: 'LF', skirtingSqFt: 'sqft', privacyLF: 'LF', demoSqFt: 'sqft', borderLF: 'LF'
                        };
                        return (
                          <div key={key} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                            <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">{labels[key] || key}</p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">{val} {units[key] || ''}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : job.acceptedBuildSummary && (
                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                      <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase mb-1">Build Summary</p>
                      <p className="text-sm text-[var(--text-primary)]">{job.acceptedBuildSummary.scopeSummary}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* (Removed Estimate Proposal A/B/C card — duplicated info already
                shown in the Live Itemized Estimate (with full pricing) and the
                portal engagement metrics already live in the engagement tile
                at the top of this column. Per Jack: same info three times.) */}

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
                      <p className="text-lg font-bold text-[var(--brand-gold)]">${(job.totalAmount || 0).toLocaleString()}</p>
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

            {/* Estimator Field Notes */}
            {job.estimatorIntake && (
              <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-color)]">
                  <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Estimator Field Notes</h2>
                </div>
                <div className="p-5 space-y-6">
                  {/* Site Checklist */}
                  <div>
                    <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Site Checklist</p>
                    <div className="grid grid-cols-2 gap-2">
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
                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${val ? 'bg-[var(--brand-gold)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}>
                              {val && <Check className="w-2.5 h-2.5 text-black" />}
                            </div>
                            <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    {job.estimatorIntake.checklist.elevationMeasurement && (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">Elevation: <span className="text-[var(--text-primary)]">{job.estimatorIntake.checklist.elevationMeasurement}</span></p>
                    )}
                    {job.estimatorIntake.checklist.gateOpeningMeasurement && (
                      <p className="text-xs text-[var(--text-secondary)]">Gate Opening: <span className="text-[var(--text-primary)]">{job.estimatorIntake.checklist.gateOpeningMeasurement}</span></p>
                    )}
                  </div>

                  {/* Site Measurements */}
                  {job.estimatorIntake.measureSheet && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Site Measurements</p>
                      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden divide-y divide-[var(--border-color)]">
                        {/* Deck Structure */}
                        {(job.estimatorIntake.measureSheet.deckSqft > 0 || job.estimatorIntake.measureSheet.fasciaLf > 0 || job.estimatorIntake.measureSheet.joistProtection) && (
                          <div className="px-4 py-3">
                            <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-2">Deck Structure</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {job.estimatorIntake.measureSheet.deckSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Deck Area</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.deckSqft} sqft</span></div>}
                              {job.estimatorIntake.measureSheet.fasciaLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Fascia</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.fasciaLf} lf</span></div>}
                              {job.estimatorIntake.measureSheet.pictureFrameLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Picture Frame</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.pictureFrameLf} lf</span></div>}
                              {job.estimatorIntake.measureSheet.joistProtection && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Joist Protection</span><span className="text-[10px] font-semibold text-[var(--brand-gold)]">Yes</span></div>}
                            </div>
                          </div>
                        )}
                        {/* Footings */}
                        {job.estimatorIntake.measureSheet.footingCount > 0 && (
                          <div className="px-4 py-3">
                            <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-2">Footings</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Type</span><span className="text-[10px] font-semibold text-[var(--text-primary)] capitalize">{job.estimatorIntake.measureSheet.footingType}</span></div>
                              <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Count</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.footingCount} pcs</span></div>
                              {job.estimatorIntake.measureSheet.namiFixCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Namifix Brackets</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.namiFixCount} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.ledgerLength > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Ledger</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.ledgerLength} lf</span></div>}
                            </div>
                          </div>
                        )}
                        {/* Stairs & Railing */}
                        {(job.estimatorIntake.measureSheet.stairLf > 0 || job.estimatorIntake.measureSheet.woodRailingLf > 0 || job.estimatorIntake.measureSheet.aluminumPostCount > 0 || job.estimatorIntake.measureSheet.glassSection6Count > 0 || job.estimatorIntake.measureSheet.framelessSectionCount > 0) && (
                          <div className="px-4 py-3">
                            <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-2">Stairs & Railing</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {job.estimatorIntake.measureSheet.stairLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Stairs</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.stairLf} steps</span></div>}
                              {job.estimatorIntake.measureSheet.woodRailingLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Wood Railing</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.woodRailingLf} lf</span></div>}
                              {job.estimatorIntake.measureSheet.drinkRailLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Drink Rail</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.drinkRailLf} lf</span></div>}
                              {job.estimatorIntake.measureSheet.aluminumPostCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Alum Posts</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.aluminumPostCount} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.aluminum6ftSections > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Alum 6ft Sections</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.aluminum6ftSections} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.aluminum8ftSections > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Alum 8ft Sections</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.aluminum8ftSections} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.aluminumStairSections > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Alum Stair Sections</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.aluminumStairSections} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.glassSection6Count > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Glass 6ft Sections</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.glassSection6Count} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.glassPanelsLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Glass Panels</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.glassPanelsLf} lf</span></div>}
                              {job.estimatorIntake.measureSheet.framelessSectionCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Frameless Glass</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.framelessSectionCount} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.framelessLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Frameless LF</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.framelessLf} lf</span></div>}
                            </div>
                          </div>
                        )}
                        {/* Skirting & Privacy */}
                        {(job.estimatorIntake.measureSheet.skirtingSqft > 0 || job.estimatorIntake.measureSheet.privacyWallLf > 0) && (
                          <div className="px-4 py-3">
                            <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-2">Skirting & Privacy</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {job.estimatorIntake.measureSheet.skirtingSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Skirting</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.skirtingSqft} sqft</span></div>}
                              {job.estimatorIntake.measureSheet.privacyWallLf > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Privacy Wall</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.privacyWallLf} lf</span></div>}
                              {job.estimatorIntake.measureSheet.privacyPostCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Privacy Posts</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.privacyPostCount} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.privacyScreenCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Privacy Screens</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.privacyScreenCount} pcs</span></div>}
                            </div>
                          </div>
                        )}
                        {/* Site Prep & Landscaping */}
                        {(job.estimatorIntake.measureSheet.removeDispose || job.estimatorIntake.measureSheet.fabricStoneSqft > 0 || job.estimatorIntake.measureSheet.riverWashSqft > 0 || job.estimatorIntake.measureSheet.mulchSqft > 0 || job.estimatorIntake.measureSheet.steppingStonesCount > 0) && (
                          <div className="px-4 py-3">
                            <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-2">Site Prep & Landscaping</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {job.estimatorIntake.measureSheet.removeDispose && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Demo/Removal</span><span className="text-[10px] font-semibold text-[var(--brand-gold)]">Yes{job.estimatorIntake.measureSheet.demoSqft > 0 ? ` (${job.estimatorIntake.measureSheet.demoSqft} sqft)` : ''}</span></div>}
                              {job.estimatorIntake.measureSheet.fabricStoneSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Fabric Stone</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.fabricStoneSqft} sqft</span></div>}
                              {job.estimatorIntake.measureSheet.riverWashSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">River Wash</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.riverWashSqft} sqft</span></div>}
                              {job.estimatorIntake.measureSheet.mulchSqft > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Mulch</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.mulchSqft} sqft</span></div>}
                              {job.estimatorIntake.measureSheet.steppingStonesCount > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Stepping Stones</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.steppingStonesCount} pcs</span></div>}
                            </div>
                          </div>
                        )}
                        {/* Extras & Flags */}
                        {(job.estimatorIntake.measureSheet.lightingFixtures > 0 || job.estimatorIntake.measureSheet.pergolaRequired || job.estimatorIntake.measureSheet.permitRequired || job.estimatorIntake.measureSheet.elevationNote) && (
                          <div className="px-4 py-3">
                            <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest mb-2">Extras & Flags</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {job.estimatorIntake.measureSheet.lightingFixtures > 0 && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Lighting</span><span className="text-[10px] font-semibold text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.lightingFixtures} pcs</span></div>}
                              {job.estimatorIntake.measureSheet.pergolaRequired && <div className="flex justify-between"><span className="text-[10px] text-[var(--text-tertiary)]">Pergola</span><span className="text-[10px] font-semibold text-[var(--brand-gold)]">Yes{job.estimatorIntake.measureSheet.pergolaSize ? ` (${job.estimatorIntake.measureSheet.pergolaSize})` : ''}</span></div>}
                              {job.estimatorIntake.measureSheet.permitRequired && <div className="flex justify-between col-span-2"><span className="text-[10px] text-[var(--text-tertiary)]">Permit Required</span><span className="text-[10px] font-semibold text-amber-400">Yes -- Flag for scheduling</span></div>}
                            </div>
                            {job.estimatorIntake.measureSheet.elevationNote && <p className="mt-2 text-xs text-[var(--text-secondary)]">Elevation Note: <span className="text-[var(--text-primary)]">{job.estimatorIntake.measureSheet.elevationNote}</span></p>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Marketing Source */}
                  {job.estimatorIntake.checklist.marketingSource && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Lead Source (confirmed on site)</p>
                      <p className="text-sm text-[var(--text-secondary)] capitalize">{job.estimatorIntake.checklist.marketingSource}{job.estimatorIntake.checklist.marketingDetail ? ` -- ${job.estimatorIntake.checklist.marketingDetail}` : ''}</p>
                    </div>
                  )}

                  {/* Site Photos */}
                  {job.estimatorIntake.photos && job.estimatorIntake.photos.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Site Photos ({job.estimatorIntake.photos.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {job.estimatorIntake.photos.map(photo => (
                          <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer">
                            <img src={photo.url} alt={photo.category} className="w-full h-24 object-cover rounded-lg border border-[var(--border-color)] hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Site Sketch */}
                  {job.estimatorIntake.sketch && job.estimatorIntake.sketch.strokes && job.estimatorIntake.sketch.strokes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Site Sketch</p>
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

                  {/* Field Notes */}
                  {job.estimatorIntake.notes && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Field Notes</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{job.estimatorIntake.notes}</p>
                    </div>
                  )}
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
                {onBookAppointment && (
                  <button onClick={() => onBookAppointment(job)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-500/20 transition-all">
                    <CalendarPlus className="w-4 h-4" /> Book Appointment
                  </button>
                )}
                <button onClick={() => onOpenEstimator(job)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--brand-gold)] text-white rounded-lg text-sm font-bold hover:bg-[var(--brand-gold)] transition-all">
                  <DollarSign className="w-4 h-4" /> Open in Estimator
                </button>
                {amount > 0 && !job.customerSignature && (
                  <button onClick={() => setShowAcceptance(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--brand-gold)] text-white rounded-lg text-sm font-bold hover:opacity-90 transition-all">
                    <PenTool className="w-4 h-4" /> Accept & Sign (On-Site)
                  </button>
                )}
                {job.customerSignature && (
                  <div className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-lg text-sm font-bold text-[var(--brand-gold)]">
                    <CheckCircle2 className="w-4 h-4" /> Signed & Accepted
                  </div>
                )}
                {/* "Send Estimate to Client" removed — use Re-send Estimate below */}
                <button onClick={() => onPreviewPortal(job)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-[var(--brand-gold)]/30 transition-all">
                  <ExternalLink className="w-4 h-4" /> Preview Portal
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => sharePortalLink('sms')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-lg text-[var(--brand-gold)] text-xs font-bold hover:bg-[var(--brand-gold)]/20 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" /> SMS Link
                  </button>
                  <button onClick={() => sharePortalLink('email')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-xs font-bold hover:bg-blue-500/20 transition-all">
                    <Mail className="w-3.5 h-3.5" /> Email Link
                  </button>
                </div>
                <button onClick={copyPortalLink}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-[var(--brand-gold)]/30 transition-all">
                  {copied ? <Check className="w-4 h-4 text-[var(--brand-gold)]" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Portal Link'}
                </button>
                {job.clientPhone && (
                  <a href={`tel:${job.clientPhone}`}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-[var(--brand-gold)]/30 transition-all">
                    <Phone className="w-4 h-4" /> Call Client
                  </a>
                )}
                {job.pipelineStage === PipelineStage.EST_SENT && (
                  <button onClick={() => sharePortalLink('email')}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] hover:border-amber-500/30 transition-all">
                    <Send className="w-4 h-4" /> Re-send Estimate
                  </button>
                )}
                {onDeleteJob && (
                  <button onClick={() => {
                    if (confirm(`Are you sure you want to delete ${job.clientName || 'this job'}? This cannot be undone.`)) {
                      onDeleteJob(job.id);
                    }
                  }}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm font-bold text-rose-500 hover:bg-rose-500/20 transition-all">
                    <X className="w-4 h-4" /> Cancel / Delete Job
                  </button>
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
                    <p className="text-lg font-bold text-[var(--brand-gold)]">${amount.toLocaleString()}</p>
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
                {/* Campaign Queue - full drip follow-up panel */}
                {job.dripCampaign && (() => {
                  const tierInfo = calculateEngagementTier(job.portalEngagement);
                  const { tier } = tierInfo;
                  const tierStyles: Record<string, string> = {
                    HOT: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
                    WARM: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
                    COOL: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
                    COLD: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
                  };
                  const sentDate = job.estimateSentDate ? new Date(job.estimateSentDate) : new Date(job.dripCampaign.startedAt);
                  const daysSinceSent = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                  const completedIds = new Set(job.dripCampaign.completedTouches || []);

                  const touchDayMap: Record<string, number> = {
                    'est-fu1-day0': 0,
                    [`est-fu2-day3-${tier.toLowerCase()}`]: 3,
                    [`est-fu3-day7-${tier.toLowerCase()}`]: 7,
                    [`est-fu4-day14-${tier === 'HOT' || tier === 'WARM' ? 'hot-warm' : 'cool-cold'}`]: 14,
                    'est-fu5-day30': 30,
                  };

                  // Compute summary stamps: most-recent sent touch + next-scheduled touch.
                  // Drives the "Last sent" / "Next scheduled" header strip so Jack can
                  // see the cadence at a glance without expanding individual touches.
                  const sentMessages = job.dripCampaign.sentMessages || [];
                  const lastSent = sentMessages.length
                    ? [...sentMessages].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0]
                    : null;
                  const nextTouch = campaignTouches.find((t) => {
                    const prefix = t.id.split('-').slice(0, 3).join('-');
                    return !(completedIds.has(t.id) || [...completedIds].some((id) => id.startsWith(prefix)));
                  });
                  const nextTouchDay = nextTouch ? (touchDayMap[nextTouch.id] ?? nextTouch.delayDays) : null;
                  const nextTouchDate = nextTouch && nextTouchDay !== null
                    ? new Date(sentDate.getTime() + nextTouchDay * 24 * 60 * 60 * 1000)
                    : null;
                  const fmtDateTime = (d: Date) => d.toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                  const fmtDate = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
                  const daysUntilNext = nextTouchDate
                    ? Math.ceil((nextTouchDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Follow-Up Campaign</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${job.dripCampaign.status === 'active' ? 'bg-[var(--brand-gold)] animate-pulse' : 'bg-gray-500'}`} />
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${tierStyles[tier]}`}>
                            {tier}
                          </span>
                        </div>
                      </div>

                      {/* Cadence summary — shows the last touch that fired and the next
                          one scheduled, so the rep can see the rhythm at a glance without
                          expanding individual touches. */}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 p-2">
                          <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Last Sent
                          </p>
                          {lastSent ? (
                            <>
                              <p className="text-[10px] font-bold text-[var(--text-primary)] leading-tight">
                                {fmtDateTime(new Date(lastSent.sentAt))}
                              </p>
                              <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider">
                                {lastSent.channel === 'sms' ? 'SMS' : 'Email'}
                              </p>
                            </>
                          ) : (
                            <p className="text-[10px] text-[var(--text-secondary)] italic">None yet</p>
                          )}
                        </div>
                        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 p-2">
                          <p className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Next Scheduled
                          </p>
                          {nextTouchDate && nextTouch ? (
                            <>
                              <p className="text-[10px] font-bold text-[var(--text-primary)] leading-tight">
                                {fmtDate(nextTouchDate)}
                              </p>
                              <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider">
                                {daysUntilNext !== null && daysUntilNext <= 0
                                  ? 'Due now'
                                  : daysUntilNext === 1
                                    ? 'In 1 day'
                                    : `In ${daysUntilNext} days`}
                                {' · '}
                                {nextTouch.channel === 'sms+email' ? 'SMS + Email' : nextTouch.channel === 'sms' ? 'SMS' : 'Email'}
                              </p>
                            </>
                          ) : (
                            <p className="text-[10px] text-[var(--text-secondary)] italic">Campaign complete</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 mt-2">
                        {campaignTouches.map((touch) => {
                          const touchPrefix = touch.id.split('-').slice(0, 3).join('-');
                          const isDone = completedIds.has(touch.id) ||
                            [...completedIds].some(id => id.startsWith(touchPrefix));
                          const touchDay = touchDayMap[touch.id] ?? touch.delayDays;
                          const isDue = !isDone && daysSinceSent >= touchDay;
                          const isExpanded = expandedTouchId === touch.id;
                          const isSending = sendingTouchId === touch.id;
                          const justSent = touchSentFeedback === touch.id;

                          const touchLabel: Record<number, string> = { 0: 'Day 0', 3: 'Day 3', 7: 'Day 7', 14: 'Day 14', 30: 'Day 30' };
                          const dueDate = new Date(sentDate.getTime() + touchDay * 24 * 60 * 60 * 1000);
                          const dueDateStr = dueDate.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

                          return (
                            <div key={touch.id} className={`rounded-lg border transition-all ${
                              isDone ? 'border-[var(--border-color)] bg-[var(--bg-secondary)]/40' :
                              isDue ? 'border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/5' :
                              'border-[var(--border-color)] bg-transparent'
                            }`}>
                              <button
                                onClick={() => setExpandedTouchId(isExpanded ? null : touch.id)}
                                className="w-full flex items-center justify-between p-2.5 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  {isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-gold)] shrink-0" />
                                  ) : isDue ? (
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--brand-gold)] shrink-0" />
                                  ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)] shrink-0" />
                                  )}
                                  <span className="text-[10px] font-bold text-[var(--text-primary)]">{touchLabel[touchDay] || `Day ${touchDay}`}</span>
                                  {isDue && !isDone && <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Due</span>}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {isDone ? (
                                    <span className="text-[9px] text-[var(--text-secondary)]">Sent</span>
                                  ) : (
                                    <span className="text-[9px] text-[var(--text-secondary)]">{dueDateStr}</span>
                                  )}
                                  {isExpanded ? <ChevronUp className="w-3 h-3 text-[var(--text-secondary)]" /> : <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />}
                                </div>
                              </button>

                              {isExpanded && (() => {
                                // When a touch ships both channels, show a small toggle and let
                                // the user view either the SMS or the email body in full. Default
                                // to email if present (more content to scan), else SMS.
                                const hasEmail = !!touch.emailTemplate;
                                const hasSms = !!touch.smsTemplate;
                                const hasBoth = hasEmail && hasSms;
                                const activeChannel = activePreviewChannel[touch.id]
                                  ?? (hasEmail ? 'email' : 'sms');
                                return (
                                <div className="px-2.5 pb-2.5 space-y-2 border-t border-[var(--border-color)]">
                                  {hasBoth && (
                                    <div className="mt-2 inline-flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setActivePreviewChannel((prev) => ({ ...prev, [touch.id]: 'sms' })); }}
                                        className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md flex items-center gap-1 transition-colors ${
                                          activeChannel === 'sms'
                                            ? 'bg-[var(--brand-gold)] text-black'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        <MessageSquare className="w-2.5 h-2.5" /> SMS
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setActivePreviewChannel((prev) => ({ ...prev, [touch.id]: 'email' })); }}
                                        className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-md flex items-center gap-1 transition-colors ${
                                          activeChannel === 'email'
                                            ? 'bg-[var(--brand-gold)] text-black'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                      >
                                        <Mail className="w-2.5 h-2.5" /> Email
                                      </button>
                                    </div>
                                  )}
                                  {hasEmail && (!hasBoth || activeChannel === 'email') && (
                                    <div className="mt-2 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Mail className="w-2.5 h-2.5" /> Email
                                      </p>
                                      {touch.subject && (
                                        <p className="text-[10px] font-bold text-[var(--text-primary)] mb-1.5 leading-snug">
                                          Subject: {touch.subject}
                                        </p>
                                      )}
                                      <p className="text-[10px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                                        {touch.emailTemplate}
                                      </p>
                                    </div>
                                  )}
                                  {hasSms && (!hasBoth || activeChannel === 'sms') && (
                                    <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                      <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <MessageSquare className="w-2.5 h-2.5" /> SMS
                                      </p>
                                      <p className="text-[10px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                                        {touch.smsTemplate}
                                      </p>
                                    </div>
                                  )}
                                  {!isDone && (
                                    <button
                                      onClick={() => handleSendTouch(touch.id, touch.channel, touch.smsTemplate, touch.emailTemplate, touch.subject)}
                                      disabled={isSending || !!sendingTouchId}
                                      className={`w-full py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                                        justSent ? 'bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] border border-[var(--brand-gold)]/30' :
                                        isDue ? 'bg-[var(--brand-gold)] text-black hover:opacity-90' :
                                        'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--brand-gold)]/30'
                                      } disabled:opacity-50`}
                                    >
                                      {isSending ? (
                                        <><Clock className="w-3 h-3 animate-spin" /> Sending...</>
                                      ) : justSent ? (
                                        <><CheckCircle2 className="w-3 h-3" /> Sent!</>
                                      ) : (
                                        <><Send className="w-3 h-3" /> Send Now</>
                                      )}
                                    </button>
                                  )}
                                </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Move to Jobs (when approved) */}
            {job.pipelineStage === PipelineStage.EST_APPROVED && (
              <div className="bg-[var(--brand-gold)]/10 rounded-xl border border-[var(--brand-gold)]/20 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--brand-gold)]" />
                  <h3 className="text-sm font-bold text-[var(--brand-gold)]">Estimate Approved</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4">Move to the Jobs pipeline to begin the project workflow.</p>
                <button onClick={() => onUpdatePipelineStage(job.id, PipelineStage.JOB_SOLD)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--brand-gold)] text-white rounded-lg text-sm font-bold hover:bg-[var(--brand-gold)] transition-all">
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
                    {job.officeNotes.slice(0, 5).map((note: JobNote, i: number) => (
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

            {/* AI Conversation Summary */}
            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-color)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> AI Summary
                </h2>
              </div>
              <div className="p-4">
                {job.aiInsights?.activitySummary || job.aiInsights?.projectHistorySummary ? (
                  <div className="space-y-3">
                    {job.aiInsights.activitySummary && (
                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1">Activity Summary</p>
                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">{job.aiInsights.activitySummary}</p>
                      </div>
                    )}
                    {job.aiInsights.nextActionRecommendation && (
                      <div className="p-3 bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10 rounded-lg">
                        <p className="text-[9px] font-bold text-[var(--brand-gold)] uppercase tracking-widest mb-1">Recommended Next Step</p>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{job.aiInsights.nextActionRecommendation.action}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">{job.aiInsights.nextActionRecommendation.reasoning}</p>
                      </div>
                    )}
                    {job.aiInsights.projectHistorySummary && (
                      <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Conversation History</p>
                        <p className="text-xs text-[var(--text-primary)] leading-relaxed">{job.aiInsights.projectHistorySummary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Zap className="w-6 h-6 text-[var(--text-secondary)] opacity-20 mx-auto mb-2" />
                    <p className="text-xs text-[var(--text-secondary)]">AI summary will appear once there are client interactions to analyse</p>
                  </div>
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
          if (onJobAccepted) onJobAccepted(jobId);
        }}
      />
    </div>
  );
};

export default EstimateDetailView;
