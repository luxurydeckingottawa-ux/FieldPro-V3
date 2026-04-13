import React from 'react';
import { Job } from '../types';
import { APP_USERS } from '../constants';
import {
  Info, MapPin, Zap, Users, Phone, Mail, MessageSquare
} from 'lucide-react';


interface JobSummaryCardProps {
  job: Job;
  onOpenMessageModal: (type: 'sms' | 'email') => void;
  onEditAssignment?: () => void;
}

const JobSummaryCard: React.FC<JobSummaryCardProps> = ({ job, onOpenMessageModal, onEditAssignment }) => {
  return (
    <section 
      
      
      
      className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand-gold)]/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
          <Info size={14} className="text-[var(--brand-gold)]" /> Job Summary
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 relative z-10">
        <div className="w-full md:w-48 h-48 shrink-0 rounded-2xl overflow-hidden border border-white/10 relative bg-white/5">
          <img
            src={`https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${encodeURIComponent((job.projectAddress || '') + ', Ottawa, ON')}&key=${(import.meta as any).env?.VITE_GOOGLE_MAPS_KEY || ''}`}
            alt="Street view"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full gap-2"><div class="text-gray-700 text-[10px] font-black uppercase tracking-widest">House Preview</div><div class="text-gray-800 text-[9px] text-center px-2">' + (job.projectAddress || '') + '</div></div>';
              }
            }}
          />
          <div className="absolute bottom-2 left-2 text-[7px] font-black text-white/40 uppercase tracking-widest">Street View</div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                <MapPin size={14} className="text-[var(--brand-gold)]" /> Project Location
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] leading-tight">{job.projectAddress}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                <Zap size={14} className="text-[var(--brand-gold)]" /> Job Total
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white tracking-tight italic">
                  ${(job.totalAmount || 0).toLocaleString()}
                </p>
                <p className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Contract Value</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
              <Users size={14} className="text-[var(--brand-gold)]" /> Client Contact
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight italic">{job.clientName}</p>
              
              {job.clientPhone && (
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--brand-gold)]/10 rounded-lg text-[var(--brand-gold)]">
                      <Phone size={12} />
                    </div>
                    <p className="text-[11px] font-bold text-white">{job.clientPhone}</p>
                  </div>
                  <button 
                    onClick={() => onOpenMessageModal('sms')}
                    className="p-2 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-lg hover:bg-[var(--brand-gold)] transition-all hover:text-black"
                    title="Send SMS"
                  >
                    <MessageSquare size={12} />
                  </button>
                </div>
              )}

              {job.clientEmail && (
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <Mail size={12} />
                    </div>
                    <p className="text-[11px] font-bold text-white truncate max-w-[120px]">{job.clientEmail}</p>
                  </div>
                  <button 
                    onClick={() => onOpenMessageModal('email')}
                    className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 transition-all hover:text-white"
                    title="Send Email"
                  >
                    <Mail size={12} />
                  </button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Recent Outreach</h4>
                  <button 
                    onClick={() => onOpenMessageModal('sms')}
                    className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-widest hover:text-[var(--brand-gold-light)] transition-colors"
                  >
                    View All
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
                    <div className="p-1.5 bg-[var(--brand-gold)]/10 rounded-lg text-[var(--brand-gold)] mt-0.5">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em]">
                <Users size={14} className="text-[var(--brand-gold)]" /> Assignment
              </div>
              {onEditAssignment && (
                <button onClick={onEditAssignment} className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-widest hover:opacity-80 transition-opacity">
                  Edit
                </button>
              )}
            </div>
            <div className="space-y-1 cursor-pointer" onClick={onEditAssignment}>
              <p className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--brand-gold)] transition-colors">{job.assignedCrewOrSubcontractor || 'Tap to assign'}</p>
              <p className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                Lead: {APP_USERS.find(u => u.id === job.assignedUsers?.[0])?.name || 'None'}
              </p>
              {job.plannedStartDate && (
                <p className="text-[10px] text-gray-500">Start: {job.plannedStartDate}</p>
              )}
              {job.plannedDurationDays && (
                <p className="text-[10px] text-gray-500">Duration: {job.plannedDurationDays}d</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobSummaryCard;
