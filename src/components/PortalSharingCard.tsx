import React, { useState } from 'react';
import { Job, PipelineStage, CustomerLifecycle } from '../types';
import { 
  Users, ExternalLink, MessageSquare, Mail, Copy, Check, Info, Sun, Cloud, CloudRain
} from 'lucide-react';
import { motion } from 'motion/react';

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
    const message = `Hi ${job.clientName}, here is your project portal link for your Luxury Decking project: ${portalUrl}`;
    if (type === 'sms') {
      window.location.href = `sms:${job.clientPhone || ''}?body=${encodeURIComponent(message)}`;
    } else {
      const mailLink = document.createElement('a');
      mailLink.href = `mailto:${job.clientEmail || ''}?subject=${encodeURIComponent('Your Luxury Decking Project Portal')}&body=${encodeURIComponent(message)}`;
      mailLink.click();
    }
  };

  return (
    <motion.section 
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-gold)]/5 blur-[40px] -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
            <Users size={14} className="fill-current" /> Customer Experience
          </h3>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">
            {isEstimateStage ? 'Estimate Portal' : 'Project Portal'}
          </h2>
        </div>
        <button 
          onClick={() => onPreviewPortal(job)}
          className="px-3 py-1.5 bg-[var(--brand-gold)]/10 hover:bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--brand-gold)] transition-all flex items-center gap-2"
        >
          <ExternalLink size={12} /> Preview Mode
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Customer View Status</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-gold)] animate-pulse" />
              <span className="text-[8px] font-bold text-[var(--brand-gold)] uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-400">Current Phase:</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                {isEstimateStage ? 'Estimate Review' : 
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
            <div className="flex flex-col items-center"><Sun size={14} className="text-amber-500 mb-1" /><span className="text-[8px] text-gray-500">Mon</span></div>
            <div className="flex flex-col items-center"><Sun size={14} className="text-amber-500 mb-1" /><span className="text-[8px] text-gray-500">Tue</span></div>
            <div className="flex flex-col items-center"><Cloud size={14} className="text-gray-400 mb-1" /><span className="text-[8px] text-gray-500">Wed</span></div>
            <div className="flex flex-col items-center"><CloudRain size={14} className="text-blue-400 mb-1" /><span className="text-[8px] text-gray-500">Thu</span></div>
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
              className="flex items-center justify-center gap-2 p-3 bg-[var(--brand-gold)]/10 hover:bg-[var(--brand-gold)]/20 border border-[var(--brand-gold)]/20 rounded-xl text-[var(--brand-gold)] transition-all group"
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
            {copied ? <Check size={16} className="text-[var(--brand-gold)]" /> : <Copy size={16} className="group-hover:scale-110 transition-transform" />}
            <span className={`text-[10px] font-black uppercase tracking-widest ${copied ? 'text-[var(--brand-gold)]' : ''}`}>
              {copied ? 'Copied!' : 'Copy Link'}
            </span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10">
          <div className="flex items-start gap-3">
            <Info size={14} className="text-[var(--brand-gold)] mt-0.5 shrink-0" />
            <p className="text-[9px] text-gray-500 leading-relaxed italic">
              Customers can view their project timeline, scope, and payment status without logging in. This link is unique to this project.
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default PortalSharingCard;
