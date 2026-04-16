import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { APP_USERS } from '../constants';
import {
  MapPin, Phone, Mail, MessageSquare, Pencil, Check, X,
  Users, Calendar, DollarSign, Home
} from 'lucide-react';

interface JobSummaryCardProps {
  job: Job;
  onOpenMessageModal: (type: 'sms' | 'email') => void;
  onEditAssignment?: () => void;
  onUpdateJob?: (jobId: string, updates: Partial<Job>) => void;
}

interface EditData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  projectAddress: string;
  totalAmount: string;
}

const JobSummaryCard: React.FC<JobSummaryCardProps> = ({
  job,
  onOpenMessageModal,
  onEditAssignment,
  onUpdateJob,
}) => {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    clientName: job.clientName || '',
    clientPhone: job.clientPhone || '',
    clientEmail: job.clientEmail || '',
    projectAddress: job.projectAddress || '',
    totalAmount: String(job.totalAmount || ''),
  });

  useEffect(() => {
    if (!editing) {
      setEditData({
        clientName: job.clientName || '',
        clientPhone: job.clientPhone || '',
        clientEmail: job.clientEmail || '',
        projectAddress: job.projectAddress || '',
        totalAmount: String(job.totalAmount || ''),
      });
    }
  }, [job, editing]);

  const handleSave = () => {
    if (!onUpdateJob) return;
    onUpdateJob(job.id, {
      clientName: editData.clientName.trim(),
      clientPhone: editData.clientPhone.trim(),
      clientEmail: editData.clientEmail.trim(),
      projectAddress: editData.projectAddress.trim(),
      totalAmount: parseFloat(editData.totalAmount) || job.totalAmount || 0,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      clientName: job.clientName || '',
      clientPhone: job.clientPhone || '',
      clientEmail: job.clientEmail || '',
      projectAddress: job.projectAddress || '',
      totalAmount: String(job.totalAmount || ''),
    });
    setEditing(false);
  };

  const set = (key: keyof EditData) => (v: string) =>
    setEditData(prev => ({ ...prev, [key]: v }));

  const leadUser = APP_USERS.find(u => u.id === job.assignedUsers?.[0]);

  const inputCls =
    'w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-colors';
  const labelCls =
    'text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-1 block';

  // ── Edit Mode ────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <label className={labelCls}>Client Name</label>
          <input className={inputCls} value={editData.clientName} onChange={e => set('clientName')(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Project Address</label>
          <input className={inputCls} value={editData.projectAddress} onChange={e => set('projectAddress')(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Phone Number</label>
          <input className={inputCls} type="tel" value={editData.clientPhone} onChange={e => set('clientPhone')(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Email Address</label>
          <input className={inputCls} type="email" value={editData.clientEmail} onChange={e => set('clientEmail')(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Contract Value ($)</label>
          <input className={inputCls} type="number" value={editData.totalAmount} onChange={e => set('totalAmount')(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-xs font-bold hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <X size={11} /> Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--brand-gold)] text-black rounded-xl text-xs font-black hover:bg-[var(--brand-gold-light)] transition-all"
          >
            <Check size={11} /> Save
          </button>
        </div>
      </div>
    );
  }

  // ── View Mode ────────────────────────────────────────────────────
  return (
    <div>
      {/* House Photo — full width at top */}
      <div className="w-full h-[160px] bg-[var(--bg-secondary)] relative overflow-hidden">
        <img
          src={`https://maps.googleapis.com/maps/api/streetview?size=600x320&location=${encodeURIComponent((job.projectAddress || '') + ', Ottawa, ON')}&key=${(import.meta as any).env?.VITE_GOOGLE_MAPS_KEY || ''}`}
          alt="Street view"
          className="w-full h-full object-cover"
          onError={e => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const parent = img.parentElement;
            if (parent && !parent.querySelector('.fallback-icon')) {
              const div = document.createElement('div');
              div.className = 'fallback-icon flex flex-col items-center justify-center h-full gap-2';
              // SECURITY: Use DOM API (not innerHTML) to avoid XSS from user-sourced address
              const iconWrap = document.createElement('div');
              iconWrap.style.color = '#9ca3af';
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('width', '28');
              svg.setAttribute('height', '28');
              svg.setAttribute('viewBox', '0 0 24 24');
              svg.setAttribute('fill', 'none');
              svg.setAttribute('stroke', 'currentColor');
              svg.setAttribute('stroke-width', '1.5');
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
              const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
              poly.setAttribute('points', '9 22 9 12 15 12 15 22');
              svg.appendChild(path);
              svg.appendChild(poly);
              iconWrap.appendChild(svg);
              const label = document.createElement('p');
              Object.assign(label.style, { fontSize: '9px', fontWeight: '700', color: '#9ca3af', textAlign: 'center', lineHeight: '1.3', padding: '0 12px' });
              label.textContent = job.projectAddress || 'No address';
              div.appendChild(iconWrap);
              div.appendChild(label);
              parent.appendChild(div);
            }
          }}
        />
        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-2 left-2.5 text-[7px] font-black text-white/60 uppercase tracking-widest">Street View</div>
      </div>

      {/* Info panel */}
      <div className="p-4 space-y-3">

        {/* Name + Contract value */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-black text-[var(--text-primary)] uppercase tracking-tight italic leading-tight truncate">
              {job.clientName || 'Unknown Client'}
            </h3>
            <div className="flex items-start gap-1 mt-0.5">
              <MapPin size={10} className="text-[var(--brand-gold)] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                {job.projectAddress || 'No address'}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[8px] font-black text-[var(--muted-text)] uppercase tracking-widest leading-none mb-0.5">Total</p>
            <p className="text-sm font-black text-[var(--brand-gold)] font-mono leading-tight">
              ${(job.totalAmount || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-color)]" />

        {/* Contact rows */}
        <div className="space-y-2">
          {job.clientPhone && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Phone size={12} className="text-[var(--text-tertiary)] shrink-0" />
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{job.clientPhone}</span>
              </div>
              <button
                onClick={() => onOpenMessageModal('sms')}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 text-[var(--brand-gold)] hover:bg-[var(--brand-gold)] hover:text-black transition-all text-[9px] font-black uppercase tracking-widest"
                title="Send SMS"
              >
                <MessageSquare size={9} /> SMS
              </button>
            </div>
          )}
          {job.clientEmail && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={12} className="text-[var(--text-tertiary)] shrink-0" />
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">{job.clientEmail}</span>
              </div>
              <button
                onClick={() => onOpenMessageModal('email')}
                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest"
                title="Send Email"
              >
                <Mail size={9} /> Email
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-color)]" />

        {/* Assignment + schedule */}
        <div className="space-y-1.5">
          {(job.assignedCrewOrSubcontractor || leadUser) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users size={11} className="text-[var(--muted-text)]" />
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {job.assignedCrewOrSubcontractor || leadUser?.name || 'Unassigned'}
                </span>
              </div>
              {onEditAssignment && (
                <button
                  onClick={onEditAssignment}
                  className="text-[9px] font-black text-[var(--brand-gold)] hover:opacity-80 transition-opacity uppercase tracking-widest"
                >
                  Edit
                </button>
              )}
            </div>
          )}
          {job.plannedStartDate && (
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-[var(--muted-text)]" />
              <span className="text-[11px] text-[var(--text-secondary)]">
                Start: <span className="font-semibold text-[var(--text-primary)]">{job.plannedStartDate}</span>
              </span>
            </div>
          )}
        </div>

        {/* View Details button */}
        {onUpdateJob && (
          <button
            onClick={() => setEditing(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-[var(--brand-gold)]/30 text-[var(--text-secondary)] hover:text-[var(--brand-gold)] text-xs font-black uppercase tracking-widest transition-all"
          >
            <Pencil size={11} /> View Details
          </button>
        )}
      </div>
    </div>
  );
};

export default JobSummaryCard;
