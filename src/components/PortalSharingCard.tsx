import React, { useState } from 'react';
import { Job } from '../types';
import { COMPANY } from '../config/company';
import {
  Users, ExternalLink, MessageSquare, Mail, Copy, Check
} from 'lucide-react';


interface PortalSharingCardProps {
  job: Job;
  allJobs: Job[];
  isEstimateStage: boolean;
  onPreviewPortal: (job: Job) => void;
}

const PortalSharingCard: React.FC<PortalSharingCardProps> = ({ job, allJobs, isEstimateStage, onPreviewPortal }) => {
  const [copied, setCopied] = useState(false);

  const portalUrl = `${window.location.origin}?portal=${job.customerPortalToken}`;

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sharePortalLink = (type: 'sms' | 'email') => {
    const message = `Hi ${job.clientName}, here is your project portal link for your ${COMPANY.name} project: ${portalUrl}`;
    if (type === 'sms') {
      window.location.href = `sms:${job.clientPhone || ''}?body=${encodeURIComponent(message)}`;
    } else {
      const mailLink = document.createElement('a');
      mailLink.href = `mailto:${job.clientEmail || ''}?subject=${encodeURIComponent(`Your ${COMPANY.name} Project Portal`)}&body=${encodeURIComponent(message)}`;
      mailLink.click();
    }
  };

  return (
    <section className="bg-white/[0.03] border border-white/5 rounded-[1.5rem] p-5 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Users size={13} className="text-[var(--brand-gold)]" />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            {isEstimateStage ? 'Estimate Portal' : 'Project Portal'}
          </span>
        </div>
        <button
          onClick={() => onPreviewPortal(job)}
          className="px-3 py-1.5 bg-[var(--brand-gold)]/10 hover:bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--brand-gold)] transition-all flex items-center gap-1.5"
        >
          <ExternalLink size={11} /> Preview
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 relative z-10">
        <button
          onClick={() => sharePortalLink('sms')}
          className="flex items-center justify-center gap-1.5 p-2.5 bg-[var(--brand-gold)]/10 hover:bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/20 rounded-xl text-[var(--brand-gold)] transition-all"
        >
          <MessageSquare size={13} />
          <span className="text-[9px] font-black uppercase tracking-widest">SMS</span>
        </button>
        <button
          onClick={() => sharePortalLink('email')}
          className="flex items-center justify-center gap-1.5 p-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 transition-all"
        >
          <Mail size={13} />
          <span className="text-[9px] font-black uppercase tracking-widest">Email</span>
        </button>
        <button
          onClick={copyPortalLink}
          className="flex items-center justify-center gap-1.5 p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all"
        >
          {copied ? <Check size={13} className="text-[var(--brand-gold)]" /> : <Copy size={13} />}
          <span className={`text-[9px] font-black uppercase tracking-widest ${copied ? 'text-[var(--brand-gold)]' : ''}`}>
            {copied ? 'Copied' : 'Copy'}
          </span>
        </button>
      </div>
    </section>
  );
};

export default PortalSharingCard;
