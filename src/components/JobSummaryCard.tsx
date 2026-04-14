import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { APP_USERS } from '../constants';
import { MapPin, Phone, Mail, MessageSquare, Pencil, Check, X, Users, Calendar } from 'lucide-react';

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

const JobSummaryCard: React.FC<JobSummaryCardProps> = ({ job, onOpenMessageModal, onEditAssignment, onUpdateJob }) => {
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

  const set = (key: keyof EditData) => (v: string) => setEditData(prev => ({ ...prev, [key]: v }));

  const leadUser = APP_USERS.find(u => u.id === job.assignedUsers?.[0]);

  const inputCls = "w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-colors";
  const labelCls = "text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest mb-1 block";

  if (editing) {
    return (
      <div className="p-6 border-t border-[var(--border-color)]">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelCls}>Client Name</label>
            <input className={inputCls} value={editData.clientName} onChange={e => set('clientName')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input className={inputCls} type="tel" value={editData.clientPhone} onChange={e => set('clientPhone')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Email Address</label>
            <input className={inputCls} type="email" value={editData.clientEmail} onChange={e => set('clientEmail')(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Contract Value ($)</label>
            <input className={inputCls} type="number" value={editData.totalAmount} onChange={e => set('totalAmount')(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Project Address</label>
            <input className={inputCls} value={editData.projectAddress} onChange={e => set('projectAddress')(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-xs font-bold hover:bg-[var(--bg-tertiary)] transition-all">
            <X size={12} /> Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-[var(--brand-gold)] text-black rounded-xl text-xs font-black hover:bg-[var(--brand-gold-light)] transition-all">
            <Check size={12} /> Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Main info row */}
      <div className="flex gap-4 items-start">
        {/* Street View Photo */}
        <div className="w-[140px] h-[96px] shrink-0 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] relative">
          <img
            src={`https://maps.googleapis.com/maps/api/streetview?size=280x192&location=${encodeURIComponent((job.projectAddress || '') + ', Ottawa, ON')}&key=${(import.meta as any).env?.VITE_GOOGLE_MAPS_KEY || ''}`}
            alt="Street view"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                const wrapper = document.createElement('div');
                wrapper.className = 'flex flex-col items-center justify-center h-full gap-1 p-2';
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('width', '20');
                svg.setAttribute('height', '20');
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', '2');
                svg.style.color = '#6b7280';
                const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path1.setAttribute('d', 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z');
                const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                path2.setAttribute('points', '9 22 9 12 15 12 15 22');
                svg.appendChild(path1);
                svg.appendChild(path2);
                const p = document.createElement('p');
                p.style.cssText = 'font-size:8px;font-weight:700;color:#6b7280;text-align:center;line-height:1.2';
                p.textContent = job.projectAddress || '';
                wrapper.appendChild(svg);
                wrapper.appendChild(p);
                parent.appendChild(wrapper);
              }
            }}
          />
          <div className="absolute bottom-1 left-1.5 text-[7px] font-black text-white/50 uppercase tracking-widest bg-black/30 px-1 rounded">Street View</div>
        </div>

        {/* Client details */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name + contract value */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight italic leading-tight">{job.clientName || 'Unknown Client'}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={11} className="text-[var(--brand-gold)] shrink-0" />
                <p className="text-xs text-[var(--text-secondary)] leading-tight truncate max-w-[280px]">{job.projectAddress || 'No address'}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-widest">Contract</p>
              <p className="text-xl font-black text-[var(--brand-gold)] font-mono leading-tight">${(job.totalAmount || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap items-center gap-2">
            {job.clientPhone && (
              <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5">
                <Phone size={11} className="text-[var(--text-tertiary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">{job.clientPhone}</span>
                <button
                  onClick={() => onOpenMessageModal('sms')}
                  className="ml-1 p-1 rounded bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] hover:bg-[var(--brand-gold)] hover:text-black transition-all"
                  title="Send SMS"
                >
                  <MessageSquare size={10} />
                </button>
              </div>
            )}
            {job.clientEmail && (
              <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 max-w-[220px]">
                <Mail size={11} className="text-[var(--text-tertiary)]" />
                <span className="text-xs font-medium text-[var(--text-secondary)] truncate">{job.clientEmail}</span>
                <button
                  onClick={() => onOpenMessageModal('email')}
                  className="ml-1 p-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                  title="Send Email"
                >
                  <Mail size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom strip: outreach + assignment + edit */}
      <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
        {/* Recent outreach */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={11} className="text-[var(--brand-gold)]" />
            <span className="text-[10px] text-[var(--text-secondary)]">
              Last contact: <span className="font-semibold text-[var(--text-primary)]">{job.updatedAt ? new Date(job.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
            </span>
          </div>
          {(leadUser || job.assignedCrewOrSubcontractor) && (
            <div className="flex items-center gap-1.5">
              <Users size={11} className="text-[var(--muted-text)]" />
              <span className="text-[10px] text-[var(--text-secondary)]">
                {job.assignedCrewOrSubcontractor || leadUser?.name || 'Unassigned'}
              </span>
              {onEditAssignment && (
                <button onClick={onEditAssignment} className="text-[9px] font-black text-[var(--brand-gold)] hover:text-[var(--brand-gold-light)] transition-colors">Edit</button>
              )}
            </div>
          )}
          {job.plannedStartDate && (
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-[var(--muted-text)]" />
              <span className="text-[10px] text-[var(--text-secondary)]">Start: <span className="font-semibold text-[var(--text-primary)]">{job.plannedStartDate}</span></span>
            </div>
          )}
        </div>

        {/* Edit button */}
        {onUpdateJob && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--brand-gold)]/30 text-[var(--brand-gold)] text-xs font-black uppercase tracking-widest hover:bg-[var(--brand-gold)] hover:text-black transition-all"
          >
            <Pencil size={11} /> Edit Details
          </button>
        )}
      </div>
    </div>
  );
};

export default JobSummaryCard;
