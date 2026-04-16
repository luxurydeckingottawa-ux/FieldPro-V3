import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, MessageSquare, Mail, Zap, ChevronDown, ChevronRight,
  Edit2, Save, X, ToggleLeft, ToggleRight, Clock, Send, Eye, EyeOff,
  Flame, Thermometer, Wind, Snowflake, AlertCircle, CheckCircle2, BarChart3
} from 'lucide-react';
import { getLeadTouches, getCampaignTouches, CampaignTouch } from '../utils/dripCampaign';
import type { EngagementTier } from '../utils/engagementScoring';
import { Job, PipelineStage, JobStatus, FieldStatus, CompletionPackageStatus, PhotoCompletionStatus, CompletionReadinessStatus, OfficeReviewStatus, ScheduleStatus, OfficeChecklist } from '../types';
import { COMPANY } from '../config/company';

// ── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fieldpro_automation_overrides';

interface TouchOverride {
  disabled?: boolean;
  delayDays?: number;
  smsTemplate?: string;
  emailTemplate?: string;
  subject?: string;
}

type Overrides = Record<string, TouchOverride>;

function loadOverrides(): Overrides {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveOverrides(o: Overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(o));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<EngagementTier, { label: string; color: string; icon: React.ReactNode }> = {
  HOT:  { label: 'Hot',  color: 'text-red-400',    icon: <Flame className="w-3 h-3" /> },
  WARM: { label: 'Warm', color: 'text-amber-400',  icon: <Thermometer className="w-3 h-3" /> },
  COOL: { label: 'Cool', color: 'text-blue-400',   icon: <Wind className="w-3 h-3" /> },
  COLD: { label: 'Cold', color: 'text-slate-400',  icon: <Snowflake className="w-3 h-3" /> },
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
  email: <Mail className="w-3.5 h-3.5 text-blue-400" />,
  'sms+email': <Zap className="w-3.5 h-3.5 text-amber-400" />,
};

const CHANNEL_LABEL: Record<string, string> = {
  sms: 'SMS',
  email: 'Email',
  'sms+email': 'SMS + Email',
};

function dayLabel(d: number, mins?: number): string {
  if (d === 0 && mins !== undefined) return `${mins}min after trigger`;
  if (d === 0) return 'Immediately';
  if (d === 1) return 'Day 1';
  return `Day ${d}`;
}

// Dummy job used to render templates (previews with placeholder name)
const PREVIEW_JOB: Job = {
  id: 'preview',
  jobNumber: 'LD-2026-0001',
  clientName: 'Sarah',
  clientPhone: '613-555-0100',
  clientEmail: 'sarah@example.com',
  projectAddress: '123 Maple St, Ottawa, ON',
  projectType: 'deck',
  scopeSummary: '',
  assignedCrewOrSubcontractor: '',
  scheduledDate: '',
  materialCost: 0,
  labourCost: 0,
  totalAmount: 0,
  paidAmount: 0,
  plannedDurationDays: 5,
  pipelineStage: PipelineStage.LEAD_IN,
  currentStage: 0,
  status: JobStatus.SCHEDULED,
  fieldStatus: FieldStatus.PENDING,
  completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
  photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
  completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
  officeReviewStatus: OfficeReviewStatus.NOT_READY,
  signoffStatus: 'pending',
  invoiceSupportStatus: 'pending',
  finalSubmissionStatus: 'pending',
  officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
  officeChecklists: [] as OfficeChecklist[],
  officeNotes: [],
  siteNotes: [],
  files: [],
  flaggedIssues: [],
  updatedAt: new Date().toISOString(),
  customerPortalToken: 'preview-token',
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface TouchCardProps {
  touch: CampaignTouch;
  overrides: Overrides;
  onSave: (id: string, patch: TouchOverride) => void;
  tier?: EngagementTier;
}

const TouchCard: React.FC<TouchCardProps> = ({ touch, overrides, onSave, tier }) => {
  const override = overrides[touch.id] || {};
  const isDisabled = override.disabled ?? false;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDelay, setEditDelay] = useState(String(override.delayDays ?? touch.delayDays));
  const [editSms, setEditSms] = useState(override.smsTemplate ?? touch.smsTemplate);
  const [editEmail, setEditEmail] = useState(override.emailTemplate ?? touch.emailTemplate);
  const [editSubject, setEditSubject] = useState(override.subject ?? touch.subject ?? '');
  const [preview, setPreview] = useState<'sms' | 'email'>('sms');

  const handleSave = () => {
    onSave(touch.id, {
      delayDays: Number(editDelay),
      smsTemplate: editSms,
      emailTemplate: editEmail,
      subject: editSubject,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditDelay(String(override.delayDays ?? touch.delayDays));
    setEditSms(override.smsTemplate ?? touch.smsTemplate);
    setEditEmail(override.emailTemplate ?? touch.emailTemplate);
    setEditSubject(override.subject ?? touch.subject ?? '');
    setEditing(false);
  };

  const activeSms = override.smsTemplate ?? touch.smsTemplate;
  const activeEmail = override.emailTemplate ?? touch.emailTemplate;
  const activeSubject = override.subject ?? touch.subject ?? '';
  const activeDelay = override.delayDays ?? touch.delayDays;

  return (
    <div className={`rounded-xl border transition-all ${isDisabled ? 'opacity-50 border-[var(--border-color)] bg-[var(--bg-secondary)]/30' : 'border-[var(--border-color)] bg-[var(--bg-primary)]'}`}>
      {/* Touch Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Toggle */}
        <button
          onClick={() => onSave(touch.id, { ...override, disabled: !isDisabled })}
          className={`shrink-0 transition-colors ${isDisabled ? 'text-[var(--text-secondary)]/40' : 'text-[var(--brand-gold)]'}`}
          title={isDisabled ? 'Enable touch' : 'Disable touch'}
        >
          {isDisabled ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
        </button>

        {/* Touch number */}
        <div className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-[var(--text-secondary)]">T{touch.touchNumber}</span>
        </div>

        {/* Channel */}
        <div className="flex items-center gap-1.5">
          {CHANNEL_ICON[touch.channel]}
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{CHANNEL_LABEL[touch.channel]}</span>
        </div>

        {/* Delay badge */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
          <span className="text-[10px] font-bold text-[var(--text-secondary)]">{dayLabel(activeDelay, touch.delayMinutes)}</span>
        </div>

        {/* Tier badge */}
        {tier && (
          <div className={`flex items-center gap-1 ${TIER_LABELS[tier].color}`}>
            {TIER_LABELS[tier].icon}
            <span className="text-[10px] font-bold uppercase tracking-wider">{TIER_LABELS[tier].label}</span>
          </div>
        )}

        {/* Override indicator */}
        {Object.keys(override).filter(k => k !== 'disabled').length > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-full">Edited</span>
        )}

        <div className="flex-1" />

        {/* Edit button */}
        {!isDisabled && (
          <button
            onClick={() => { setEditing(!editing); setExpanded(true); }}
            className="text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand-gold)] transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}

        {/* Expand */}
        <button onClick={() => setExpanded(!expanded)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && !isDisabled && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-4 space-y-4">
          {editing ? (
            <>
              {/* Delay editor */}
              <div>
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Send After (days)</label>
                <input
                  type="number" min={0} max={90} value={editDelay}
                  onChange={e => setEditDelay(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50"
                />
              </div>

              {/* SMS editor */}
              {touch.channel !== 'email' && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">SMS Message</label>
                  <textarea
                    value={editSms}
                    onChange={e => setEditSms(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 resize-y font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-secondary)] mt-1">{editSms.length} characters</p>
                </div>
              )}

              {/* Email editor */}
              {touch.channel !== 'sms' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Email Subject</label>
                    <input
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">Email Body</label>
                    <textarea
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50 resize-y font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-gold)] text-white rounded-lg text-xs font-bold hover:bg-[var(--brand-gold-light)] transition-all">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
                <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-bold hover:text-[var(--text-primary)] transition-all">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Preview tabs */}
              {touch.channel === 'sms+email' && (
                <div className="flex gap-1">
                  <button onClick={() => setPreview('sms')} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${preview === 'sms' ? 'bg-[var(--brand-gold)] text-white' : 'text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                    <MessageSquare className="w-3 h-3" /> SMS
                  </button>
                  <button onClick={() => setPreview('email')} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${preview === 'email' ? 'bg-[var(--brand-gold)] text-white' : 'text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
                    <Mail className="w-3 h-3" /> Email
                  </button>
                </div>
              )}

              {/* Message preview */}
              {(touch.channel === 'sms' || (touch.channel === 'sms+email' && preview === 'sms')) && activeSms && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border-color)]">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-emerald-400" /> SMS Preview
                  </p>
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{activeSms}</p>
                </div>
              )}

              {(touch.channel === 'email' || (touch.channel === 'sms+email' && preview === 'email')) && activeEmail && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 border border-[var(--border-color)]">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-400" /> Email Preview
                  </p>
                  {activeSubject && <p className="text-xs font-bold text-[var(--text-primary)] mb-1">Subject: {activeSubject}</p>}
                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{activeEmail}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main View ─────────────────────────────────────────────────────────────────

interface AutomationSettingsViewProps {
  onBack: () => void;
}

type TabType = 'lead' | 'estimate' | 'jobs';
type EstimateTier = EngagementTier;

const ESTIMATE_TIERS: EstimateTier[] = ['HOT', 'WARM', 'COOL', 'COLD'];

const JOB_AUTOMATIONS = [
  {
    id: 'job-deposit-reminder',
    trigger: 'Job sold (deposit pending)',
    channel: 'sms+email' as const,
    delayDays: 0,
    description: 'Sent when estimate is accepted, requesting deposit to secure build date',
    sms: `Hi {name}, congratulations! Your deck project with ${COMPANY.name} is moving forward. To secure your build date, please submit your deposit through your portal: {portal_link}. Questions? Call or text ${COMPANY.phone}. \u2014 Angela`,
    email: `Hi {name},\n\nExciting news \u2014 your deck project is officially moving forward!\n\nTo secure your spot in our build schedule, we ask that you submit your deposit at your earliest convenience. You can do so through your project portal:\n\n{portal_link}\n\nOnce we receive your deposit, we will confirm your official build start date and send you a detailed project timeline.\n\nWe are looking forward to building something great together.`,
  },
  {
    id: 'job-week-before',
    trigger: '7 days before build start',
    channel: 'sms' as const,
    delayDays: -7,
    description: 'Reminder sent 1 week before the scheduled build start',
    sms: `Hi {name}, this is Angela from ${COMPANY.name}. Your deck build is scheduled to begin in 7 days! Our crew will arrive at {address} at the confirmed time. If anything has changed, please reach out at ${COMPANY.phone}.`,
    email: '',
  },
  {
    id: 'job-day-before',
    trigger: '1 day before build start',
    channel: 'sms' as const,
    delayDays: -1,
    description: 'Final reminder the day before build start',
    sms: `Hi {name}, just a reminder that your ${COMPANY.name} crew arrives tomorrow to begin your deck project. If you have any last-minute questions, call or text ${COMPANY.phone}. See you tomorrow!`,
    email: '',
  },
  {
    id: 'job-complete-review',
    trigger: 'Job marked complete',
    channel: 'sms+email' as const,
    delayDays: 0,
    description: 'Sent immediately when the job is marked complete — requests Google review',
    sms: `Hi {name}, your deck is complete! Thank you for trusting ${COMPANY.name} with your project. We would really appreciate a quick Google review \u2014 it makes a huge difference for a small local business: {review_link}. Enjoy your new outdoor space! \u2014 Angela`,
    email: `Hi {name},\n\nYour deck project is officially complete \u2014 congratulations!\n\nIt was a pleasure working with you and your family on this build. We hope you love your new outdoor space for many years to come.\n\nIf you have a moment, leaving us a Google review would mean the world to our team. It helps other homeowners find us and supports a local ${COMPANY.city} business:\n\n{review_link}\n\nAlso, keep an eye out for your 5-year warranty package arriving by email shortly. If you ever have questions about your deck, we are always here.\n\nThank you again for choosing ${COMPANY.name}.`,
  },
  {
    id: 'job-complete-warranty',
    trigger: 'Job marked complete + 24h',
    channel: 'email' as const,
    delayDays: 1,
    description: 'Warranty certificate + build passport sent 24h after completion',
    sms: '',
    email: `Hi {name},\n\nAttached is your ${COMPANY.name} Build Passport and 5-Year Structural Warranty.\n\nInside you will find:\n- A complete record of your build stages and materials\n- Site photos from your project\n- Your official 5-year structural warranty card\n- Maintenance tips to keep your deck looking great\n\nPlease save this document \u2014 it may be valuable for home insurance and future resale.\n\nThank you for being a ${COMPANY.name} client.`,
  },
];

const AutomationSettingsView: React.FC<AutomationSettingsViewProps> = ({ onBack }) => {
  const [tab, setTab] = useState<TabType>('lead');
  const [estimateTier, setEstimateTier] = useState<EstimateTier>('HOT');
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);
  const [saved, setSaved] = useState(false);

  const handleSaveTouch = (id: string, patch: TouchOverride) => {
    const next = { ...overrides, [id]: { ...overrides[id], ...patch } };
    setOverrides(next);
    saveOverrides(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const leadTouches = getLeadTouches(PREVIEW_JOB);
  const estimateTouches = getCampaignTouches('ESTIMATE_FOLLOW_UP', PREVIEW_JOB, {
    portalViews: estimateTier === 'HOT' ? 10 : estimateTier === 'WARM' ? 4 : estimateTier === 'COOL' ? 1 : 0,
    timeOnPortal: 0,
    addOnInteractions: {},
    lastViewed: '',
  });

  const enabledLeadCount = leadTouches.filter(t => !overrides[t.id]?.disabled).length;
  const enabledEstCount = estimateTouches.filter(t => !overrides[t.id]?.disabled).length;
  const enabledJobCount = JOB_AUTOMATIONS.filter(t => !overrides[t.id]?.disabled).length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Header */}
      <header className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-secondary)]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-black text-[var(--text-primary)]">Automation Settings</h1>
              <p className="text-[10px] text-[var(--text-secondary)]">Edit drip campaigns, job triggers, and messaging</p>
            </div>
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Lead Touches Active', value: enabledLeadCount, total: leadTouches.length, color: 'text-blue-400' },
            { label: 'Estimate Touches Active', value: enabledEstCount, total: estimateTouches.length, color: 'text-amber-400' },
            { label: 'Job Triggers Active', value: enabledJobCount, total: JOB_AUTOMATIONS.length, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-4">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}<span className="text-sm text-[var(--text-secondary)] font-normal">/{s.total}</span></p>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)] w-fit gap-1">
          {([
            { id: 'lead', label: 'Lead Follow-Up', icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: 'estimate', label: 'Estimate Follow-Up', icon: <Mail className="w-3.5 h-3.5" /> },
            { id: 'jobs', label: 'Job Triggers', icon: <Zap className="w-3.5 h-3.5" /> },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-[var(--bg-primary)] text-[var(--brand-gold)] shadow border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Lead Follow-Up */}
        {tab === 'lead' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-[var(--text-primary)]">Lead Follow-Up Sequence</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Triggers when a new lead enters the pipeline. Pauses automatically if the lead replies or books an appointment.</p>
              </div>
            </div>
            {leadTouches.map(touch => (
              <TouchCard key={touch.id} touch={touch} overrides={overrides} onSave={handleSaveTouch} />
            ))}
          </div>
        )}

        {/* Estimate Follow-Up */}
        {tab === 'estimate' && (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-black text-[var(--text-primary)]">Estimate Follow-Up Sequence</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Triggers when an estimate is sent. Message content adapts based on the lead's engagement meter.</p>
            </div>

            {/* Tier selector */}
            <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-4">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Preview Engagement Tier</p>
              <div className="flex gap-2">
                {ESTIMATE_TIERS.map(tier => {
                  const t = TIER_LABELS[tier];
                  return (
                    <button key={tier} onClick={() => setEstimateTier(tier)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${estimateTier === tier ? 'bg-[var(--bg-primary)] border-[var(--brand-gold)]/40 text-[var(--brand-gold)]' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                      <span className={t.color}>{t.icon}</span> {t.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mt-2">
                Showing messages that would send to a <strong className={TIER_LABELS[estimateTier].color}>{estimateTier}</strong> lead — one who {estimateTier === 'HOT' ? 'opens the portal frequently and explores add-ons' : estimateTier === 'WARM' ? 'opened the portal a few times' : estimateTier === 'COOL' ? 'opened once but hasn\'t engaged much' : 'hasn\'t opened the portal at all'}.
              </p>
            </div>

            {estimateTouches.map(touch => (
              <TouchCard key={touch.id} touch={touch} overrides={overrides} onSave={handleSaveTouch} tier={touch.engagementAdaptive ? estimateTier : undefined} />
            ))}
          </div>
        )}

        {/* Job Triggers */}
        {tab === 'jobs' && (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-black text-[var(--text-primary)]">Job Stage Triggers</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Automated messages sent at specific job milestones — deposit requests, build reminders, completion review requests, and warranty delivery.</p>
            </div>

            {JOB_AUTOMATIONS.map(automation => {
              const fakeTouch: CampaignTouch = {
                id: automation.id,
                touchNumber: JOB_AUTOMATIONS.indexOf(automation) + 1,
                channel: automation.channel,
                delayDays: automation.delayDays >= 0 ? automation.delayDays : 0,
                smsTemplate: automation.sms,
                emailTemplate: automation.email,
              };
              return (
                <div key={automation.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {CHANNEL_ICON[automation.channel]}
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{CHANNEL_LABEL[automation.channel]}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <Zap className="w-3 h-3 text-[var(--brand-gold)]" />
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">{automation.trigger}</span>
                    </div>
                    <div className="flex-1" />
                    <button
                      onClick={() => handleSaveTouch(automation.id, { ...overrides[automation.id], disabled: !overrides[automation.id]?.disabled })}
                      className={`transition-colors ${overrides[automation.id]?.disabled ? 'text-[var(--text-secondary)]/40' : 'text-[var(--brand-gold)]'}`}
                    >
                      {overrides[automation.id]?.disabled ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                    </button>
                  </div>
                  {!overrides[automation.id]?.disabled && (
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-xs text-[var(--text-secondary)]">{automation.description}</p>
                      {automation.sms && (
                        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">SMS</p>
                          <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{automation.sms}</p>
                        </div>
                      )}
                      {automation.email && (
                        <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-color)]">
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Email</p>
                          <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{automation.email}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationSettingsView;
