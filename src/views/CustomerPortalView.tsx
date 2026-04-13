import React, { useState } from 'react';
import { Job, JobStatus, PipelineStage, ChatSession } from '../types';
import { 
  Clock, MapPin, CheckCircle2, Phone, MessageSquare, 
  ChevronRight, Sun, Cloud, CloudRain, CalendarDays, Truck, 
  Wallet, AlertCircle, Zap, ShieldCheck, FileText, Receipt, 
  Camera, History, Image, X, Send, Sparkles, Star, HelpCircle,
  Archive, Shield, Award, FileCheck
} from 'lucide-react';
import { AIObjectionHelper } from '../components/AIObjectionHelper';
import PortalPaymentsTab from '../components/PortalPaymentsTab';

import { format } from 'date-fns';

interface CustomerPortalViewProps {
  job: Job;
  allJobs?: Job[];
  chatSessions?: ChatSession[];
  onSendMessage?: (sessionId: string, text: string) => void;
  onBack?: () => void;
}

const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({ 
  job, 
  allJobs = [], 
  chatSessions = [], 
  onSendMessage, 
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'schedule' | 'scope' | 'payments' | 'documents' | 'archive'>('status');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const currentSession = chatSessions.find(s => s.jobId === job.id);


  // Calculate queue position
  const getQueuePosition = () => {
    if (!allJobs.length) return null;
    
    const queueStages = [PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION, PipelineStage.READY_TO_START];
    const queueJobs = allJobs
      .filter(j => queueStages.includes(j.pipelineStage))
      .sort((a, b) => {
        const aTime = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity;
        const bTime = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity;
        return aTime - bTime;
      });
    
    const position = queueJobs.findIndex(j => j.id === job.id);
    if (position === -1) return null;
    
    return {
      position: position + 1,
      ahead: position,
      total: queueJobs.length,
      jobsAhead: queueJobs.slice(0, position)
    };
  };

  const queueInfo = getQueuePosition();

  // 1. What Changed Since Last Update
  const getRecentChanges = () => {
    const lastUpdate = job.lastScheduleUpdateAt || job.updatedAt || new Date().toISOString();
    const timeAgo = format(new Date(lastUpdate), 'MMM d');
    
    switch (job.pipelineStage) {
      case PipelineStage.JOB_SOLD:
        return { text: "Project file initialized and design phase started.", date: timeAgo };
      case PipelineStage.ADMIN_SETUP:
        return { text: "Permit applications submitted and site prep initiated.", date: timeAgo };
      case PipelineStage.PRE_PRODUCTION:
        return { text: "Materials confirmed and delivery window scheduled.", date: timeAgo };
      case PipelineStage.READY_TO_START:
        return { text: "Crew assigned and start window confirmed.", date: timeAgo };
      case PipelineStage.IN_FIELD:
        return { text: "Construction is active. Framing is currently underway.", date: timeAgo };
      case PipelineStage.COMPLETION:
        return { text: "Main build finished. Final detailing and cleanup started.", date: timeAgo };
      case PipelineStage.PAID_CLOSED:
        return { text: "Project officially closed and warranty period active.", date: timeAgo };
      default:
        return { text: "Project status updated to the next phase.", date: timeAgo };
    }
  };

  // 2. Customer Action Required
  const getCustomerAction = () => {
    switch (job.pipelineStage) {
      case PipelineStage.JOB_SOLD:
        return { action: "Review Design Plan", icon: <FileText className="w-4 h-4" />, status: "pending" };
      case PipelineStage.ADMIN_SETUP:
        return { action: "Confirm Gate Access", icon: <ShieldCheck className="w-4 h-4" />, status: "pending" };
      case PipelineStage.PRE_PRODUCTION:
        return { action: "Clear the Yard", icon: <Zap className="w-4 h-4" />, status: "pending" };
      case PipelineStage.READY_TO_START:
        return { action: "Payment is Due", icon: <FileText className="w-4 h-4" />, status: "pending" };
      case PipelineStage.IN_FIELD:
        return { action: "No Action Required", icon: <CheckCircle2 className="w-4 h-4" />, status: "complete" };
      case PipelineStage.COMPLETION:
        return { action: "Schedule Walkthrough", icon: <CalendarDays className="w-4 h-4" />, status: "pending" };
      case PipelineStage.PAID_CLOSED:
        return { action: "Leave a Review", icon: <Star className="w-4 h-4" />, status: "info" };
      default:
        return { action: "No Action Required", icon: <CheckCircle2 className="w-4 h-4" />, status: "complete" };
    }
  };

  // 4. Latest Field Update
  const getLatestFieldUpdate = () => {
    if (job.fieldForecast?.note) return job.fieldForecast.note;
    
    switch (job.pipelineStage) {
      case PipelineStage.IN_FIELD:
        return "Crew is on site. Framing is progressing well and on schedule.";
      case PipelineStage.PRE_PRODUCTION:
        return "Materials are being staged at the shop for delivery this week.";
      case PipelineStage.READY_TO_START:
        return "Final site check completed. Ready for crew arrival.";
      default:
        return "Project is moving through the scheduled phases as planned.";
    }
  };

  // 5. Milestone Photo Story
  const getMilestonePhotoStory = () => {
    const milestoneConfigs = [
      { id: 1, label: 'Site Prep & Demolition', page: 1 },
      { id: 2, label: 'Foundation & Footings', page: 2 },
      { id: 3, label: 'Structural Framing', page: 3 },
      { id: 4, label: 'Decking Installation', page: 4 },
      { id: 5, label: 'Railings & Finishing', page: 5 },
    ];

    const story = milestoneConfigs.map(m => {
      const pageData = job.fieldProgress?.[m.page];
      const photos = pageData?.photos
        ?.filter(p => p.cloudinaryUrl || p.url)
        .map(p => p.cloudinaryUrl || p.url) || [];
      return { ...m, photos };
    }).filter(m => m.photos.length > 0);

    // Add "Before" photos if they exist in general files but not in field progress
    const generalPhotos = job.files?.filter(f => f.type === 'photo' && f.name.toLowerCase().includes('before')) || [];
    if (generalPhotos.length > 0) {
      story.unshift({
        id: 0,
        label: 'Before the Build',
        page: 0,
        photos: generalPhotos.map(f => f.url)
      });
    }

    return story;
  };

  // 6. Proactive FAQ
  const getProactiveFAQs = () => {
    const allFaqs = [
      {
        question: "Why can my date move even if the weather looks good this week?",
        answer: "Our schedule is a 'rolling' queue. If it rains on a job before yours, that crew is delayed finishing their current build, which shifts the start dates for everyone following in that queue. We build in sequence to ensure our best crews are on every project.",
        stages: [PipelineStage.ADMIN_SETUP, PipelineStage.PRE_PRODUCTION, PipelineStage.READY_TO_START]
      },
      {
        question: "What happens after materials are delivered?",
        answer: "Once materials are staged, our crew typically arrives within 24-48 hours to begin mobilization. We stage materials early to ensure no delays once the build starts.",
        stages: [PipelineStage.READY_TO_START]
      },
      {
        question: "What should I expect during active construction?",
        answer: "Expect some noise and activity between 8 AM and 5 PM. Our crews are respectful of your property and will maintain a clean workspace. You don't need to be home, but we appreciate clear access to the work area.",
        stages: [PipelineStage.IN_FIELD]
      },
      {
        question: "How will I know when the next payment is due?",
        answer: "Our system automatically updates your portal when a milestone is reached that triggers a payment (e.g., material delivery or project completion). You'll see a 'Payment is Due' notice in your Action Required panel.",
        stages: [PipelineStage.PRE_PRODUCTION, PipelineStage.READY_TO_START, PipelineStage.IN_FIELD]
      },
      {
        question: "When will I get my final warranty package?",
        answer: "Once the final walkthrough is complete and the project is closed, your digital 'Build Passport' containing all warranties and care instructions will be available right here in your portal.",
        stages: [PipelineStage.COMPLETION, PipelineStage.PAID_CLOSED]
      },
      {
        question: "When do I leave my final review?",
        answer: "We love hearing your feedback! Once the project is marked 'Complete', a review link will appear at the top of your portal. We strive for 5-star service and appreciate your support.",
        stages: [PipelineStage.COMPLETION, PipelineStage.PAID_CLOSED]
      }
    ];

    // Filter for current stage, or show general ones if none match
    const stageFaqs = allFaqs.filter(f => f.stages.includes(job.pipelineStage));
    return stageFaqs.length > 0 ? stageFaqs : allFaqs.slice(0, 3);
  };

  const recentChange = getRecentChanges();
  const customerAction = getCustomerAction();
  const latestFieldUpdate = getLatestFieldUpdate();
  const photoStory = getMilestonePhotoStory();
  const proactiveFaqs = getProactiveFAQs();

  const getNextMilestone = (stage: PipelineStage) => {
    switch (stage) {
      case PipelineStage.JOB_SOLD:
        return { title: 'Design & Planning', desc: 'We are preparing your official project file and finalizing the design details.' };
      case PipelineStage.ADMIN_SETUP:
        return { title: 'Site Preparation', desc: 'Securing necessary approvals and preparing for site protection.' };
      case PipelineStage.PRE_PRODUCTION:
        return { title: 'Material Delivery', desc: 'Your premium materials are being sourced and scheduled for delivery.' };
      case PipelineStage.READY_TO_START:
        return { title: 'Construction Start', desc: 'Our expert crew is confirmed and ready to begin your transformation.' };
      case PipelineStage.IN_FIELD:
        return { title: 'Build Progress', desc: 'Framing and decking are underway. Watch your dream space take shape.' };
      case PipelineStage.COMPLETION:
        return { title: 'Final Walkthrough', desc: 'We will review every detail with you to ensure absolute perfection.' };
      case PipelineStage.PAID_CLOSED:
        return { title: 'Project Complete', desc: 'Your dream space is finished. Thank you for choosing Luxury Decking!' };
      default:
        return { title: 'Next Steps', desc: 'We are moving your project forward to the next phase.' };
    }
  };

  const nextMilestone = getNextMilestone(job.pipelineStage);

  const getCalendarDays = () => {
    const today = new Date('2026-03-29');
    const projectStart = job.plannedStartDate ? new Date(job.plannedStartDate) : today;
    
    // Use the project start month if it's in the future, otherwise use current month
    const displayDate = projectStart > today ? projectStart : today;
    
    const startOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1);
    const endOfMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0);
    
    const days = [];
    const startDay = startOfMonth.getDay();
    
    // Padding from previous month
    const prevMonthEnd = new Date(displayDate.getFullYear(), displayDate.getMonth(), 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, prevMonthEnd - i),
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      const d = new Date(displayDate.getFullYear(), displayDate.getMonth(), i);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: d.toDateString() === today.toDateString()
      });
    }
    
    // Padding for next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, i),
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return { days, displayDate };
  };

  const { days: calendarDays, displayDate } = getCalendarDays();

  const isDateInRange = (date: Date, startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return false;
    const d = new Date(date.setHours(0,0,0,0));
    const start = new Date(new Date(startStr).setHours(0,0,0,0));
    const end = new Date(new Date(endStr).setHours(0,0,0,0));
    return d >= start && d <= end;
  };

  const getJobAtDate = (date: Date) => {
    // Check current job
    if (isDateInRange(date, job.plannedStartDate, job.plannedFinishDate)) {
      return { type: 'current', label: 'Your Project' };
    }
    
    // Check jobs ahead
    if (queueInfo?.jobsAhead) {
      for (const aheadJob of queueInfo.jobsAhead) {
        if (isDateInRange(date, aheadJob.plannedStartDate, aheadJob.plannedFinishDate)) {
          return { type: 'ahead', label: 'Scheduled Project' };
        }
      }
    }
    
    return null;
  };

  const getCustomerFriendlyStatus = (status: JobStatus, stage: PipelineStage) => {
    if (status === JobStatus.COMPLETED || stage === PipelineStage.PAID_CLOSED) return 'Project Completed';
    
    switch (stage) {
      case PipelineStage.JOB_SOLD:
      case PipelineStage.ADMIN_SETUP:
        return 'Planning & Design';
      case PipelineStage.PRE_PRODUCTION:
        return 'Site Preparation';
      case PipelineStage.READY_TO_START:
        return 'Scheduled & Ready';
      case PipelineStage.IN_FIELD:
        return 'Construction Phase';
      case PipelineStage.COMPLETION:
        return 'Final Touches';
      default:
        return 'Project Active';
    }
  };

  const getProgressPercentage = (stage: PipelineStage) => {
    const stages = Object.values(PipelineStage);
    const index = stages.indexOf(stage);
    return Math.round(((index + 1) / stages.length) * 100);
  };

  const getConstructionProgressPercentage = () => {
    if (job.pipelineStage === PipelineStage.PAID_CLOSED || job.pipelineStage === PipelineStage.COMPLETION) return 100;
    
    const stages = Object.values(PipelineStage);
    const inFieldIndex = stages.indexOf(PipelineStage.IN_FIELD);
    const currentIndex = stages.indexOf(job.pipelineStage);
    
    if (currentIndex < inFieldIndex) return 0;
    
    if (!job.fieldProgress) return 0;
    
    let totalItems = 0;
    let completedItems = 0;
    
    // Pages 0-5 are the core construction pages
    for (let i = 0; i <= 5; i++) {
      const page = job.fieldProgress[i];
      if (page && page.checklist) {
        page.checklist.forEach(item => {
          if (!item.isNA) {
            totalItems++;
            if (item.completed) completedItems++;
          }
        });
      }
    }
    
    if (totalItems === 0) return 0;
    return Math.round((completedItems / totalItems) * 100);
  };

  const getBuildMilestones = () => {
    const milestones = [
      { id: 'site_prep', label: 'Site Preparation', page: 0 },
      { id: 'demolition', label: 'Demolition', page: 0, condition: job.buildDetails?.sitePrep?.demolitionRequired },
      { id: 'footings', label: 'Footings', page: 0 },
      { id: 'framing', label: 'Framing', page: 1 },
      { id: 'decking', label: 'Decking', page: 2 },
      { id: 'stairs', label: 'Stairs', page: 3, condition: job.buildDetails?.stairs?.included },
      { id: 'railings', label: 'Railings', page: 3, condition: job.buildDetails?.railing?.included },
      { id: 'walkthrough', label: 'Final Walkthrough', page: 5 },
      { id: 'closeout', label: 'Closeout & Warranty', stage: PipelineStage.PAID_CLOSED }
    ];

    return milestones.filter(m => m.condition !== false).map((m, idx, filtered) => {
      let status: 'Not Started' | 'In Progress' | 'Complete' = 'Not Started';
      
      if (m.stage) {
        const stages = Object.values(PipelineStage);
        if (stages.indexOf(job.pipelineStage) >= stages.indexOf(m.stage)) {
          status = 'Complete';
        } else if (job.pipelineStage === PipelineStage.COMPLETION && m.id === 'walkthrough') {
           status = 'In Progress';
        }
      } else if (m.page !== undefined) {
        const isComplete = job.fieldProgress?.[m.page]?.completed;
        if (isComplete) {
          status = 'Complete';
        } else {
          // It's in progress if it's the current page or if the previous one is complete
          const isCurrentPage = job.currentStage === m.page;
          const prevPageComplete = idx === 0 ? (job.pipelineStage === PipelineStage.IN_FIELD) : 
            (job.fieldProgress?.[filtered[idx-1].page ?? -1]?.completed);
          
          if ((isCurrentPage || prevPageComplete) && job.pipelineStage === PipelineStage.IN_FIELD) {
            status = 'In Progress';
          }
        }
      }

      return { ...m, status };
    });
  };

  const buildMilestones = getBuildMilestones();

  const getConstructionCurrentStage = () => {
    const stages = Object.values(PipelineStage);
    const currentIndex = stages.indexOf(job.pipelineStage);
    const inFieldIndex = stages.indexOf(PipelineStage.IN_FIELD);
    const completionIndex = stages.indexOf(PipelineStage.COMPLETION);

    if (currentIndex < inFieldIndex) return "Awaiting Construction";
    if (currentIndex === completionIndex) return "Final Walkthrough";
    if (job.pipelineStage === PipelineStage.PAID_CLOSED) return "Project Complete";

    const inProgress = buildMilestones.find(m => m.status === 'In Progress');
    if (inProgress) return inProgress.label;

    const lastComplete = [...buildMilestones].reverse().find(m => m.status === 'Complete');
    return lastComplete ? lastComplete.label : "Site Preparation";
  };

  const getConstructionNextStep = () => {
    if (job.pipelineStage === PipelineStage.PAID_CLOSED) return "Warranty & Support";
    
    const next = buildMilestones.find(m => m.status === 'Not Started');
    if (next) return next.label;
    
    return "Project Completion";
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-[#F5F5F5] rounded-xl transition-colors text-[#666]"
                title="Back to Admin"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <div className="h-10 w-10 bg-[var(--brand-gold)] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-sm tracking-tighter">LD</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Project Portal</h1>
              <p className="text-xs text-[#666] font-medium uppercase tracking-wider">Luxury Decking Field Pro</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-[#F5F5F5] rounded-full hover:bg-[#EEEEEE] transition-colors">
              <Phone className="w-5 h-5 text-[#333]" />
            </button>
            <button 
              onClick={() => setShowChat(true)}
              className="px-4 py-2 bg-[var(--brand-gold)] text-white rounded-full font-bold text-sm shadow-md hover:bg-[var(--brand-gold-dark)] transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Project Summary Card */}
        <div 
          
          
          className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#F0F0F0] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/5 blur-3xl -mr-32 -mt-32 pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">{job.clientName}</h2>
                <div className="flex items-center text-[#666] gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">{job.projectAddress}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="bg-[var(--brand-gold)]/5 text-[#8B7520] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-[var(--brand-gold)]/10">
                  {getCustomerFriendlyStatus(job.status, job.pipelineStage)}
                </div>
                {job.officialScheduleStatus && (
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    job.officialScheduleStatus === 'ON_SCHEDULE' ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20' :
                    job.officialScheduleStatus === 'AHEAD' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                    'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}>
                    {job.officialScheduleStatus.replace('_', ' ')}
                  </div>
                )}
              </div>
            </div>

            {/* Next Milestone Panel */}
            {job.pipelineStage === PipelineStage.PAID_CLOSED ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-[#C4A432] to-[#6B5A18] text-white rounded-3xl p-8 flex items-center justify-between shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center shrink-0 shadow-2xl transform group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-12 h-12 text-[var(--brand-gold)]" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#E8D88A] mb-2">Project Officially Complete</p>
                      <h4 className="text-4xl font-black tracking-tight">Job Complete</h4>
                      <p className="text-sm text-[var(--brand-gold)]/5 leading-relaxed opacity-90 mt-2 max-w-sm">
                        Congratulations! Your dream outdoor space is now ready for years of enjoyment. Thank you for trusting Luxury Decking.
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block relative z-10">
                    <div className="h-16 w-16 rounded-full border-2 border-white/20 flex items-center justify-center">
                      <Award className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Google Review Card - Refined */}
                <div 
                  
                  
                  
                  className="bg-white rounded-3xl p-8 border border-[var(--brand-gold)]/10 shadow-xl relative overflow-hidden group text-center space-y-6"
                >
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-8 h-8 fill-amber-400 text-amber-400 animate-bounce" style={{ animationDelay: `${s * 0.1}s` }} />
                      ))}
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-[#1A1A1A]">Are you happy with your new deck?</h3>
                    <p className="text-sm text-[#666] max-w-md mx-auto leading-relaxed">
                      Your feedback means everything to us. If you enjoyed our service and love your new deck, we'd be honored if you left us a Google 5-star review.
                    </p>
                  </div>

                  <a 
                    href={import.meta.env.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/luxury-decking/review'}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-4 px-10 py-5 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm shadow-2xl hover:bg-[var(--brand-gold)] transition-all active:scale-95 group/btn"
                  >
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center p-1.5">
                      <svg viewBox="0 0 24 24" className="w-full h-full">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c3.11 0 5.72-1.03 7.63-2.81l-3.57-2.77c-.99.66-2.23 1.06-4.06 1.06-3.12 0-5.76-2.11-6.71-4.94H1.71v2.86C3.6 20.12 7.51 23 12 23z" fill="#34A853"/>
                        <path d="M5.29 13.55c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.09H1.71C.91 7.69.45 9.5.45 11.41c0 1.91.46 3.72 1.26 5.32l3.58-3.18z" fill="#FBBC05"/>
                        <path d="M12 4.75c1.69 0 3.21.58 4.41 1.72l3.31-3.31C17.71 1.21 15.11 0 12 0 7.51 0 3.6 2.88 1.71 6.09l3.58 3.18c.95-2.83 3.59-4.94 6.71-4.94z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <span className="tracking-wide">Leave a Google 5-Star Review</span>
                  </a>

                  <div className="pt-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#BBB]">It only takes 30 seconds to support our team</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#1A1A1A] text-white rounded-2xl p-5 flex items-start gap-4 shadow-xl">
                <div className="h-10 w-10 rounded-xl bg-[var(--brand-gold)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--brand-gold)]/20">
                  <Zap className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-gold)] mb-1">What Happens Next</p>
                  <h4 className="text-base font-bold mb-1">{nextMilestone.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{nextMilestone.desc}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between text-sm font-bold">
                <span>Overall Progress</span>
                <span>{getProgressPercentage(job.pipelineStage)}%</span>
              </div>
              <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div 
                  
                  style={{ width: `${getProgressPercentage(job.pipelineStage)}%` }}
                  
                  className="h-full bg-[var(--brand-gold)] rounded-full"
                />
              </div>
            </div>

            {/* Important Dates Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#F9F9F9] p-3 rounded-xl border border-[#F0F0F0]">
                <div className="flex items-center gap-2 text-[#999] mb-1">
                  <CalendarDays className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Start Date</span>
                </div>
                <p className="text-xs font-bold">{job.plannedStartDate || 'TBD'}</p>
              </div>
              <div className="bg-[#F9F9F9] p-3 rounded-xl border border-[#F0F0F0]">
                <div className="flex items-center gap-2 text-[#999] mb-1">
                  <Truck className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Delivery</span>
                </div>
                <p className="text-xs font-bold">{job.materialDeliveryDate || 'TBD'}</p>
              </div>
              <div className="bg-[#F9F9F9] p-3 rounded-xl border border-[#F0F0F0]">
                <div className="flex items-center gap-2 text-[#999] mb-1">
                  <Wallet className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Next Payment</span>
                </div>
                <p className="text-xs font-bold">
                  {job.pipelineStage === PipelineStage.PRE_PRODUCTION ? 'Upon Delivery' : 
                   job.pipelineStage === PipelineStage.IN_FIELD ? 'Upon Completion' : 'TBD'}
                </p>
              </div>
              <div className="bg-[#F9F9F9] p-3 rounded-xl border border-[#F0F0F0]">
                <div className="flex items-center gap-2 text-[#999] mb-1">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Completion</span>
                </div>
                <p className="text-xs font-bold">{job.plannedFinishDate || 'TBD'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Team Section */}
        <div 
          
          
          
          className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--brand-gold)]/5 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[var(--brand-gold)]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A1A1A]">Your Project Team</h4>
              <p className="text-[10px] text-[#999] uppercase font-black tracking-wider">Expert Support & Build</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border border-white shadow-sm">
                JD
              </div>
              <div>
                <p className="text-[9px] text-[#999] uppercase font-black tracking-widest">Project Manager</p>
                <p className="text-xs font-bold">Jason Davis</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-gold)]/10 flex items-center justify-center text-[10px] font-bold text-[#8B7520] border border-white shadow-sm">
                {job.assignedCrewOrSubcontractor?.split(' ').map(n => n[0]).join('') || 'CL'}
              </div>
              <div>
                <p className="text-[9px] text-[#999] uppercase font-black tracking-widest">Crew Lead</p>
                <p className="text-xs font-bold">{job.assignedCrewOrSubcontractor || 'Assigned Soon'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-[#F0F0F0] rounded-2xl overflow-x-auto no-scrollbar">
          {(['status', 'schedule', 'scope', 'payments', 'documents', ...(job.pipelineStage === PipelineStage.PAID_CLOSED ? ['archive'] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-3 text-sm font-bold rounded-xl transition-all ${
                activeTab === tab 
                  ? 'bg-white text-[var(--brand-gold)] shadow-sm' 
                  : 'text-[#666] hover:text-[#333]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'status' && (
            <div 
              
              
              className="space-y-6"
            >
              {/* Progress Overview */}
              <div className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Deck Construction Progress</h3>
                  <span className="text-2xl font-black text-[var(--brand-gold)]">{getConstructionProgressPercentage()}%</span>
                </div>
                
                <div className="space-y-2">
                  <div className="h-4 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div 
                      
                      style={{ width: `${getConstructionProgressPercentage()}%` }}
                      
                      className="h-full bg-[var(--brand-gold)] rounded-full shadow-[0_0_15px_rgba(196,164,50,0.3)]"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-[#BBB] uppercase tracking-widest">
                    <span>Not Started</span>
                    <span>In Progress</span>
                    <span>Complete</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#F0F0F0]">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[#999] uppercase tracking-widest">Current Stage</p>
                    <p className="text-sm font-bold text-[#8B7520]">{getConstructionCurrentStage()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[#999] uppercase tracking-widest">Next Step</p>
                    <p className="text-sm font-bold text-[#333]">{getConstructionNextStep()}</p>
                  </div>
                </div>
              </div>

              {/* What Changed Since Last Update */}
              <div 
                
                
                
                className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3">
                  <span className="text-[10px] font-black text-[var(--brand-gold)] bg-[var(--brand-gold)]/5 px-2 py-1 rounded-lg uppercase tracking-widest">
                    {recentChange.date}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[var(--brand-gold)] mb-1">
                  <History className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">What Changed Since Last Update</h3>
                </div>
                <p className="text-sm text-[#333] font-medium leading-relaxed">
                  {recentChange.text}
                </p>
              </div>

              {/* Customer Action Required */}
              <div 
                
                
                
                className={`rounded-3xl p-6 border shadow-sm flex items-center justify-between gap-4 ${
                  customerAction.status === 'pending' 
                    ? 'bg-amber-50 border-amber-100' 
                    : customerAction.status === 'info'
                    ? 'bg-blue-50 border-blue-100'
                    : 'bg-[var(--brand-gold)]/5 border-[var(--brand-gold)]/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    customerAction.status === 'pending' 
                      ? 'bg-white text-amber-600' 
                      : customerAction.status === 'info'
                      ? 'bg-white text-blue-600'
                      : 'bg-white text-[var(--brand-gold)]'
                  }`}>
                    {customerAction.icon}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                      customerAction.status === 'pending' 
                        ? 'text-amber-600' 
                        : customerAction.status === 'info'
                        ? 'text-blue-600'
                        : 'text-[var(--brand-gold)]'
                    }`}>Customer Action Required</p>
                    <h4 className="text-base font-bold text-[#1A1A1A]">{customerAction.action}</h4>
                  </div>
                </div>
                {customerAction.status === 'pending' && (
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                )}
              </div>

              {/* AI Support Section */}
              <section className="mt-8">
                <AIObjectionHelper job={job} />
              </section>

              {/* Milestone List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold px-2">Project Journey</h3>
                <div className="bg-white rounded-3xl border border-[#F0F0F0] overflow-hidden shadow-sm">
                  <div className="divide-y divide-[#F0F0F0]">
                    {[
                      { stage: PipelineStage.JOB_SOLD, label: 'Project Confirmed', desc: 'Your project is officially in our system.' },
                      { stage: PipelineStage.ADMIN_SETUP, label: 'Design & Planning', desc: 'Finalizing blueprints and project details.' },
                      { stage: PipelineStage.PRE_PRODUCTION, label: 'Site Preparation', desc: 'Securing approvals and site protection.' },
                      { stage: PipelineStage.READY_TO_START, label: 'Mobilization', desc: 'Materials delivered and crew assigned.' },
                      { stage: PipelineStage.IN_FIELD, label: 'Construction', desc: 'Our expert team is on-site building.' },
                      { stage: PipelineStage.COMPLETION, label: 'Final Walkthrough', desc: 'Ensuring every detail is perfect.' },
                    ].map((item, idx) => {
                      const stages = Object.values(PipelineStage);
                      const isCompleted = stages.indexOf(job.pipelineStage) >= stages.indexOf(item.stage);
                      const isCurrent = job.pipelineStage === item.stage;

                      return (
                        <div key={item.stage} className={`p-4 flex items-center gap-4 transition-colors ${isCurrent ? 'bg-[var(--brand-gold)]/5/30' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                            isCompleted ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-white' : 'border-[#E5E5E5] text-[#CCC]'
                          }`}>
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-sm font-bold ${isCurrent ? 'text-[#8B7520]' : isCompleted ? 'text-[#333]' : 'text-[#999]'}`}>
                              {item.label}
                            </h4>
                            {isCurrent && <p className="text-xs text-[var(--brand-gold)]/70 mt-0.5">{item.desc}</p>}
                          </div>
                          {isCurrent && (
                            <div className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-gold)] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-gold)]"></span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Latest Field Update */}
              <div 
                
                
                
                className="bg-[#1A1A1A] text-white rounded-3xl p-6 shadow-xl space-y-3"
              >
                <div className="flex items-center gap-3 text-[var(--brand-gold)] mb-1">
                  <Zap className="w-5 h-5" />
                  <h3 className="text-sm font-black uppercase tracking-widest">Latest Field Update</h3>
                </div>
                <p className="text-sm text-gray-300 font-medium leading-relaxed">
                  {latestFieldUpdate}
                </p>
              </div>

              {/* Schedule / Timing Explanation */}
              <div className="px-2">
                <div className="flex items-start gap-3 p-4 bg-[#F9F9F9] rounded-2xl border border-[#F0F0F0]">
                  <CloudRain className="w-5 h-5 text-[#999] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[#666] uppercase tracking-widest">Understanding Our Schedule</p>
                    <p className="text-xs text-[#888] leading-relaxed">
                      Weather impacts the full production schedule, not only your job week. Rain days before your start window may push timing forward as we catch up on active builds. We appreciate your patience as we ensure every deck is built to our high standards.
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Build Progress (Only if in field or later) */}
              {(job.pipelineStage === PipelineStage.IN_FIELD || job.pipelineStage === PipelineStage.COMPLETION || job.pipelineStage === PipelineStage.PAID_CLOSED) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-bold">Build Tracker</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-gold)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-gold)]"></span>
                      </div>
                      <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Live Updates</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl border border-[#F0F0F0] overflow-hidden shadow-sm">
                    <div className="p-6 grid grid-cols-1 gap-6">
                      {buildMilestones.map((m) => (
                        <div key={m.id} className="flex items-start gap-4">
                          <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            m.status === 'Complete' ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]' : 
                            m.status === 'In Progress' ? 'bg-amber-100 text-amber-600' : 
                            'bg-slate-50 text-slate-300 border border-slate-200'
                          }`}>
                            {m.status === 'Complete' ? <CheckCircle2 className="w-3 h-3" /> : 
                             m.status === 'In Progress' ? <Clock className="w-3 h-3 animate-pulse" /> : 
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm font-bold ${
                                m.status === 'Complete' ? 'text-[#333]' : 
                                m.status === 'In Progress' ? 'text-[#8B7520]' : 
                                'text-[#999]'
                              }`}>
                                {m.label}
                              </h4>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                m.status === 'Complete' ? 'bg-[var(--brand-gold)]/5 text-[var(--brand-gold)]' : 
                                m.status === 'In Progress' ? 'bg-amber-50 text-amber-600' : 
                                'bg-slate-50 text-slate-400'
                              }`}>
                                {m.status}
                              </span>
                            </div>
                            {m.status === 'In Progress' && (
                              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  
                                  
                                  
                                  className="h-full bg-[var(--brand-gold)] rounded-full"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Updates & Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Team */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <ShieldCheck className="w-4 h-4 text-[#999]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#999]">Your Project Team</h3>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-[#F0F0F0] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                          JS
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1A1A1A]">Jordan Smith</p>
                          <p className="text-[10px] text-[var(--brand-gold)] font-bold uppercase tracking-wider">Project Manager</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowChat(true)}
                        className="p-2 text-[#999] hover:text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/5 rounded-xl transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                        MC
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1A1A1A]">Mike Chen</p>
                        <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Lead Carpenter</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Milestone Photo Story */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Camera className="w-4 h-4 text-[#999]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#999]">Milestone Photo Story</h3>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-[#F0F0F0] shadow-sm space-y-6">
                    {photoStory.length > 0 ? (
                      <div className="space-y-8">
                        {photoStory.map((milestone) => (
                          <div key={milestone.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-gold)]" />
                              <h4 className="text-xs font-black uppercase tracking-widest text-[#333]">{milestone.label}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {milestone.photos.slice(0, 2).map((url, i) => (
                                <div 
                                  key={i} 
                                  onClick={() => setSelectedPhoto(url)}
                                  className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-[#F0F0F0] group relative cursor-pointer"
                                >
                                  <img 
                                    src={url} 
                                    alt={milestone.label} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                    referrerPolicy="no-referrer" 
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Image className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-32 rounded-2xl border-2 border-dashed border-[#F0F0F0] flex flex-col items-center justify-center text-[#CCC] gap-2">
                        <Image className="w-8 h-8 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">No milestone photos yet</p>
                      </div>
                    )}
                    
                    {job.files?.filter(f => f.type === 'photo').length > 0 && (
                      <button 
                        onClick={() => setShowAllPhotos(true)}
                        className="w-full mt-2 py-2 text-[10px] font-black uppercase tracking-widest text-[#999] hover:text-[var(--brand-gold)] transition-colors border-t border-[#F0F0F0] pt-4"
                      >
                        View Full Project Gallery ({job.files.filter(f => f.type === 'photo').length})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Proactive FAQ Section */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 px-2">
                  <HelpCircle className="w-4 h-4 text-[#999]" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#999]">Questions Answered Before They're Asked</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proactiveFaqs.map((faq, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-[#F0F0F0] shadow-sm space-y-2 hover:border-[var(--brand-gold)]/10 transition-colors group">
                      <h4 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#8B7520] transition-colors">{faq.question}</h4>
                      <p className="text-xs text-[#666] leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-[var(--brand-gold)]/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-[var(--brand-gold)] shadow-sm">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#4A3E10]">Still have questions?</p>
                      <p className="text-[10px] text-[#8B7520]">Our team is here to help you every step of the way.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowChat(true)}
                    className="px-4 py-2 bg-[var(--brand-gold)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-[var(--brand-gold-dark)] transition-colors"
                  >
                    Message Us
                  </button>
                </div>
              </div>

              {/* Closeout & Warranty Section (Visible when complete) */}
              {job.pipelineStage === PipelineStage.PAID_CLOSED && (
                <div className="space-y-6 pt-8 border-t border-[#F0F0F0]">
                  <div className="flex items-center gap-2 px-2">
                    <Shield className="w-4 h-4 text-[#999]" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#999]">Closeout & Warranty Archive</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Warranty Card */}
                    <div className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-[var(--brand-gold)]/5 flex items-center justify-center text-[var(--brand-gold)]">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1A1A1A]">5-Year Workmanship Warranty</h4>
                          <p className="text-[10px] text-[var(--brand-gold)] font-bold uppercase tracking-wider">Active & Verified</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#666] leading-relaxed">
                        Your project is backed by our industry-leading 5-year workmanship warranty. We stand behind every board, screw, and structural element we install.
                      </p>
                      <div className="space-y-2">
                        {['Structural integrity', 'Decking installation', 'Railing stability'].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] text-[#666]">
                            <CheckCircle2 className="w-3 h-3 text-[var(--brand-gold)]" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Archive Documents */}
                    <div className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                          <Archive className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1A1A1A]">Project Archive</h4>
                          <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Permanent Reference</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#F0F0F0] hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <FileCheck className="w-4 h-4 text-[var(--brand-gold)]" />
                            <span className="text-xs font-bold">Verified Build Passport</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#CCC] group-hover:text-[var(--brand-gold)] transition-colors" />
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-xl border border-[#F0F0F0] hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold">Warranty & Care Guide</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#CCC] group-hover:text-slate-600 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Final Build Summary */}
                  <div className="bg-slate-50 rounded-3xl p-6 border border-[#F0F0F0]">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#999] mb-4">Final Build Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div>
                        <p className="text-[9px] font-black text-[#BBB] uppercase tracking-wider mb-1">Material</p>
                        <p className="text-xs font-bold">{job.buildDetails?.decking?.material || 'Premium Composite'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[#BBB] uppercase tracking-wider mb-1">Color</p>
                        <p className="text-xs font-bold">{job.buildDetails?.decking?.color || 'TBD'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[#BBB] uppercase tracking-wider mb-1">Railing</p>
                        <p className="text-xs font-bold">{job.buildDetails?.railing?.type || 'Aluminum'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[#BBB] uppercase tracking-wider mb-1">Project Size</p>
                        <p className="text-xs font-bold">{job.buildDetails?.size || 'TBD sq ft'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div 
              
              
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight">Production Schedule</h3>
                <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  {queueInfo?.ahead || 0} Jobs Ahead
                </div>
              </div>

              {/* 7-Day Forecast & Queue Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Sun className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1A1A1A]">7-Day Forecast</h4>
                        <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Local Build Conditions</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/5 px-3 py-1 rounded-full border border-[var(--brand-gold)]/10">
                      Optimal
                    </div>
                  </div>

                </div>

                <div className="bg-white rounded-3xl p-6 border border-[#F0F0F0] shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1A1A1A]">Queue Position</h4>
                      <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Live Production Order</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#666]">Current Position</span>
                      <span className="text-sm font-bold text-[#1A1A1A]">#{queueInfo?.position || 0} of {queueInfo?.total || 0}</span>
                    </div>
                    <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${((queueInfo?.total || 1) - (queueInfo?.position || 0)) / (queueInfo?.total || 1) * 100}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-[#999] leading-relaxed italic">
                      "We are currently working on {queueInfo?.ahead || 0} projects ahead of yours. Your start date is confirmed for {job.plannedStartDate}."
                    </p>
                  </div>
                </div>
              </div>

              {/* Traditional Calendar View */}
              <div className="bg-white rounded-3xl border border-[#F0F0F0] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-[#F0F0F0] bg-[#F9F9F9] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#1A1A1A]">
                      {displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h4>
                    <p className="text-[10px] font-bold text-[#999] uppercase tracking-widest mt-1">Live Production Calendar</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-gold)]" />
                      <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Your Build</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      <span className="text-[10px] font-bold text-[#999] uppercase tracking-wider">Queue</span>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-[10px] font-black text-[#BBB] uppercase tracking-widest py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-px bg-[#F0F0F0] border border-[#F0F0F0] rounded-2xl overflow-hidden">
                    {calendarDays.map((day, i) => {
                      const jobInfo = getJobAtDate(day.date);
                      
                      return (
                        <div 
                          key={i} 
                          className={`min-h-[80px] bg-white p-2 relative group transition-colors ${
                            !day.isCurrentMonth ? 'bg-slate-50/50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-bold ${
                              day.isToday ? 'bg-[var(--brand-gold)] text-white w-5 h-5 rounded-full flex items-center justify-center' : 
                              day.isCurrentMonth ? 'text-[#333]' : 'text-[#CCC]'
                            }`}>
                              {day.date.getDate()}
                            </span>

                          </div>

                          {jobInfo && (
                            <div 
                              
                              
                              className={`absolute inset-x-1 bottom-1 py-1 px-1.5 rounded-md text-[8px] font-black uppercase tracking-tighter truncate ${
                                jobInfo.type === 'current' 
                                  ? 'bg-[var(--brand-gold)] text-black shadow-sm' 
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              {jobInfo.label}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 bg-[#F9F9F9] border-t border-[#F0F0F0] space-y-4">
                  {/* Schedule / Timing Explanation */}
                  <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-[#F0F0F0] mb-4">
                    <CloudRain className="w-5 h-5 text-[#999] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-[#666] uppercase tracking-widest">Understanding Our Schedule</p>
                      <p className="text-xs text-[#888] leading-relaxed">
                        Weather impacts the full production schedule, not only your job week. Rain days before your start window may push timing forward as we catch up on active builds. We appreciate your patience as we ensure every deck is built to our high standards.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <CloudRain className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold mb-1">Weather Impact Notice</h4>
                      <p className="text-xs text-[#666] leading-relaxed">
                        We monitor local weather daily. Minor rain delays are factored into our "On Schedule" status. Significant weather events will trigger an automatic update to your estimated start date. Weather impacts the full production schedule, not only your job week. Rain days before your start window may push timing forward.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-[var(--brand-gold)]/5 rounded-2xl border border-[var(--brand-gold)]/10">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="w-4 h-4 text-[var(--brand-gold)]" />
                      <p className="text-xs font-bold text-[#8B7520] uppercase tracking-wider">Queue Transparency</p>
                    </div>
                    <p className="text-xs text-[var(--brand-gold)]/80 leading-relaxed">
                      To protect client privacy, we show other projects as anonymous blocks. Your position is updated in real-time as jobs complete.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scope' && (
            <div 
              
              
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight">Project Scope & Selections</h3>
                <div className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/5 px-3 py-1 rounded-full border border-[var(--brand-gold)]/10">
                  <ShieldCheck size={12} className="inline mr-1" /> Verified Specs
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {job.buildDetails ? (
                  <>
                    {/* Main Selections */}
                    <div className="bg-white rounded-3xl border border-[#F0F0F0] shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-[#F0F0F0] bg-[#F9F9F9]">
                        <h4 className="text-xs font-black text-[#999] uppercase tracking-[0.2em]">Primary Selections</h4>
                      </div>
                      <div className="p-0 divide-y divide-[#F0F0F0]">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                              <Zap className="w-5 h-5 text-[var(--brand-gold)]" />
                            </div>
                            <div>
                              <p className="text-[10px] text-[#999] uppercase font-black tracking-wider mb-1">Decking</p>
                              <p className="text-sm font-bold text-[#1A1A1A]">{job.buildDetails.decking?.brand} {job.buildDetails.decking?.type}</p>
                              <p className="text-xs text-[#666] mt-0.5">Color: <span className="text-[var(--brand-gold)] font-bold">{job.buildDetails.decking?.color}</span></p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5 text-[var(--brand-gold)]" />
                            </div>
                            <div>
                              <p className="text-[10px] text-[#999] uppercase font-black tracking-wider mb-1">Framing</p>
                              <p className="text-sm font-bold text-[#1A1A1A]">{job.buildDetails.framing?.type}</p>
                              <p className="text-xs text-[#666] mt-0.5">{job.buildDetails.framing?.joistSize} @ {job.buildDetails.framing?.joistSpacing}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-[var(--brand-gold)]" />
                            </div>
                            <div>
                              <p className="text-[10px] text-[#999] uppercase font-black tracking-wider mb-1">Railing</p>
                              <p className="text-sm font-bold text-[#1A1A1A]">
                                {job.buildDetails.railing?.included ? job.buildDetails.railing.type : 'None Included'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                              <History className="w-5 h-5 text-[var(--brand-gold)]" />
                            </div>
                            <div>
                              <p className="text-[10px] text-[#999] uppercase font-black tracking-wider mb-1">Stairs & Skirting</p>
                              <p className="text-sm font-bold text-[#1A1A1A]">
                                {job.buildDetails.stairs?.included ? `${job.buildDetails.stairs.style} Stairs` : 'No Stairs'}
                              </p>
                              <p className="text-xs text-[#666] mt-0.5">
                                {job.buildDetails.skirting?.included ? `Skirting: ${job.buildDetails.skirting.type}` : 'No Skirting'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Build Summary */}
                    <div className="bg-white rounded-3xl border border-[#F0F0F0] shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-[#F0F0F0] bg-[#F9F9F9]">
                        <h4 className="text-xs font-black text-[#999] uppercase tracking-[0.2em]">Build Summary</h4>
                      </div>
                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#999] uppercase font-black tracking-wider">Project Type</p>
                            <p className="text-sm font-bold">{job.projectType}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#999] uppercase font-black tracking-wider">Permits</p>
                            <p className="text-sm font-bold">{job.buildDetails.sitePrep?.permitsRequired ? 'Required & Secured' : 'Not Required'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-[#999] uppercase font-black tracking-wider">Lighting</p>
                            <p className="text-sm font-bold">{job.buildDetails.electrical?.lightingIncluded ? job.buildDetails.electrical.lightingType : 'None'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-[10px] text-[#999] uppercase font-black tracking-wider">Scope Details</p>
                          <div className="bg-[#F9F9F9] p-5 rounded-2xl border border-[#F0F0F0] text-sm text-[#444] leading-relaxed italic">
                            "{job.scopeSummary || 'No special instructions noted.'}"
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white rounded-3xl border border-dashed border-[#E5E5E5] p-12 text-center text-[#999]">
                    <p className="text-sm font-medium">Scope details are being finalized by our design team.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div 
              
              
              className="space-y-8"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight">Project Documents</h3>
                <div className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/5 px-3 py-1 rounded-full border border-[var(--brand-gold)]/10">
                  <FileText size={12} className="inline mr-1" /> Customer Access
                </div>
              </div>

              {/* Active Project Documents */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#999] px-2">Contract & Summaries</h4>
                <div className="grid grid-cols-1 gap-3">
                  {/* Real files from job.files */}
                  {job.files?.filter(f => f.type !== 'photo' && f.type !== 'closeout').map((file) => (
                    <a 
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white p-5 rounded-3xl border border-[#F0F0F0] shadow-sm flex items-center justify-between group hover:border-[var(--brand-gold)]/20 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-slate-400 group-hover:text-[var(--brand-gold)] transition-colors" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-[#1A1A1A]">{file.name}</h5>
                          <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">
                            {file.type.charAt(0).toUpperCase() + file.type.slice(1)} Document
                          </p>
                        </div>
                      </div>
                      <div className="p-2 text-[#999] group-hover:text-[var(--brand-gold)] transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </a>
                  ))}

                  {/* Standard placeholders if no specific files found */}
                  {(!job.files || job.files.filter(f => f.type !== 'photo' && f.type !== 'closeout').length === 0) && (
                    <>
                      <div className="bg-white p-5 rounded-3xl border border-[#F0F0F0] shadow-sm flex items-center justify-between group opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-gold)]/5 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-[var(--brand-gold)]" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-[#1A1A1A]">Project Contract</h5>
                            <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Signed & Verified</p>
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-[#999] uppercase tracking-widest">Available Soon</div>
                      </div>

                      <div className="bg-white p-5 rounded-3xl border border-[#F0F0F0] shadow-sm flex items-center justify-between group opacity-60">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                            <Receipt className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-[#1A1A1A]">Scope Summary</h5>
                            <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Detailed Build Specs</p>
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-[#999] uppercase tracking-widest">Available Soon</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Closeout & Warranty Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-[#999] px-2">Closeout & Warranty</h4>
                <div className="bg-white rounded-3xl border border-[#F0F0F0] shadow-sm overflow-hidden">
                  {job.pipelineStage === PipelineStage.PAID_CLOSED || job.verifiedBuildPassportUrl ? (
                    <div className="divide-y divide-[#F0F0F0]">
                      {(job.verifiedBuildPassportUrl || job.files?.find(f => f.type === 'closeout')) && (
                        <a 
                          href={job.verifiedBuildPassportUrl || job.files?.find(f => f.type === 'closeout')?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-5 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-gold)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--brand-gold)]/20">
                              <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-[#1A1A1A]">Verified Build Passport</h5>
                              <p className="text-[10px] text-[var(--brand-gold)] font-bold uppercase tracking-wider">Final Quality Certification</p>
                            </div>
                          </div>
                          <div className="px-4 py-2 bg-[var(--brand-gold)]/5 text-[#8B7520] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--brand-gold)]/10 transition-colors">
                            Download
                          </div>
                        </a>
                      )}
                      <div className="p-5 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-[#1A1A1A]">Warranty Information</h5>
                            <p className="text-[10px] text-[#999] font-bold uppercase tracking-wider">Care & Maintenance Guide</p>
                          </div>
                        </div>
                        <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                          View
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-8 h-8 text-slate-200" />
                      </div>
                      <div className="max-w-xs mx-auto">
                        <h5 className="text-sm font-bold text-[#333]">Closeout Materials</h5>
                        <p className="text-xs text-[#999] mt-2 leading-relaxed">
                          Your Verified Build Passport and warranty documents will be available here once the project is completed and closed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Support Notice */}
              <div 
                
                
                className="bg-[var(--brand-gold)]/5 rounded-3xl p-6 border border-[var(--brand-gold)]/10 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                    <HelpCircle className="w-6 h-6 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#6B5A18] mb-1">Need a specific document?</h4>
                    <p className="text-xs text-[#8B7520]/70 leading-relaxed">
                      If you require a specific permit copy or drawing that isn't listed here, please message us and we'll upload it to your portal immediately.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChat(true)}
                  className="px-6 py-3 bg-[var(--brand-gold)] text-white rounded-2xl font-bold text-xs shadow-lg shadow-[var(--brand-gold)]/20 hover:bg-[var(--brand-gold-dark)] transition-all active:scale-95 whitespace-nowrap"
                >
                  Request Document
                </button>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <PortalPaymentsTab job={job} />
          )}

          {activeTab === 'archive' && (
            <div 
              
              
              className="space-y-8"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight">Project Archive</h3>
                <div className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/5 px-3 py-1 rounded-full border border-[var(--brand-gold)]/10">
                  Permanent Reference
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#F0F0F0] overflow-hidden shadow-sm">
                <div className="p-8 bg-[#1A1A1A] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-gold)]/10 blur-2xl -mr-16 -mt-16" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-2 relative z-10">Final Project Summary</p>
                  <h4 className="text-3xl font-bold tracking-tight relative z-10">{job.clientName}'s Dream Deck</h4>
                </div>
                
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[#999]">Build Specifications</h5>
                      <div className="space-y-3">
                        {[
                          { label: 'Decking Material', value: job.buildDetails?.decking?.material || 'Premium Composite' },
                          { label: 'Color Selection', value: job.buildDetails?.decking?.color || 'TBD' },
                          { label: 'Railing System', value: job.buildDetails?.railing?.type || 'Aluminum' },
                          { label: 'Total Square Footage', value: job.buildDetails?.size || 'TBD sq ft' },
                          { label: 'Completion Date', value: job.plannedFinishDate || 'TBD' }
                        ].map((spec, i) => (
                          <div key={i} className="flex justify-between items-center py-2 border-b border-[#F9F9F9]">
                            <span className="text-xs text-[#666]">{spec.label}</span>
                            <span className="text-xs font-bold text-[#1A1A1A]">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-[#999]">Warranty Coverage</h5>
                      <div className="bg-[var(--brand-gold)]/5 rounded-2xl p-5 border border-[var(--brand-gold)]/10 space-y-4">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="w-5 h-5 text-[var(--brand-gold)]" />
                          <span className="text-sm font-bold text-[#4A3E10]">5-Year Workmanship</span>
                        </div>
                        <p className="text-xs text-[#8B7520] leading-relaxed">
                          Your project is covered for structural integrity and installation quality until {
                            job.plannedFinishDate ? format(new Date(new Date(job.plannedFinishDate).setFullYear(new Date(job.plannedFinishDate).getFullYear() + 5)), 'MMMM yyyy') : '5 years after completion'
                          }.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[#999] mb-4">Final Project Photos</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {job.files?.filter(f => f.type === 'photo').slice(-4).map((photo, i) => (
                        <div 
                          key={i} 
                          onClick={() => setSelectedPhoto(photo.url)}
                          className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-[#F0F0F0] cursor-pointer group"
                        >
                          <img 
                            src={photo.url} 
                            alt="Final Build" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 rounded-3xl p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <MessageSquare className="w-6 h-6 text-[var(--brand-gold)]" />
                </div>
                <div className="max-w-xs mx-auto">
                  <h4 className="text-sm font-bold text-[#1A1A1A]">Need assistance with your deck?</h4>
                  <p className="text-xs text-[#666] mt-2 leading-relaxed">
                    Even though your project is complete, we're still here for you. Message us anytime for care tips or warranty questions.
                  </p>
                </div>
                <button 
                  onClick={() => setShowChat(true)}
                  className="px-6 py-2 bg-white text-[#1A1A1A] text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-[var(--brand-gold)] hover:text-white transition-all"
                >
                  Contact Support
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto px-6 py-12 border-t border-[#F0F0F0] text-center space-y-4">
        <p className="text-xs text-[#999] font-medium uppercase tracking-widest">Luxury Decking Field Pro</p>
        <p className="text-[10px] text-[#BBB]">© 2026 Luxury Decking. All rights reserved. Built for quality and transparency.</p>
      </footer>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <ChevronRight className="w-8 h-8 rotate-90" />
          </button>
          <img 
            
            
            src={selectedPhoto} 
            alt="Project Progress" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* All Photos Gallery Modal */}
      {showAllPhotos && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <header className="px-6 py-4 border-b border-[#F0F0F0] flex items-center justify-between bg-white sticky top-0">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-[var(--brand-gold)]" />
              <h3 className="text-lg font-bold">Project Gallery</h3>
            </div>
            <button 
              onClick={() => setShowAllPhotos(false)}
              className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-90" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {job.files?.filter(f => f.type === 'photo').map((photo, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedPhoto(photo.url)}
                  className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-[#F0F0F0] group relative cursor-pointer"
                >
                  <img 
                    src={photo.url} 
                    alt={photo.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Image className="w-6 h-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Chat Modal */}
      
        {showChat && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              
              
              
              onClick={() => setShowChat(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <div
              
              
              
              className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[600px]"
            >
              {/* Chat Header */}
              <div className="px-6 py-5 border-bottom border-[#F0F0F0] flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--brand-gold)]/5 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[var(--brand-gold)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A1A1A]">Project Chat</h3>
                    <p className="text-[10px] text-[var(--brand-gold)] font-bold uppercase tracking-wider">Direct with Luxury Decking</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-[#999]" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FDFCFB]">
                {currentSession ? (
                  currentSession.messages.map((msg, idx) => {
                    const isLastFromSender = idx === currentSession.messages.length - 1 || 
                      currentSession.messages[idx + 1].senderId !== msg.senderId;
                    
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${msg.isFromClient ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                          msg.isFromClient 
                            ? 'bg-[var(--brand-gold)] text-white rounded-tr-none' 
                            : 'bg-white border border-[#F0F0F0] text-[#333] rounded-tl-none shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                        {isLastFromSender && (
                          <span className="text-[10px] text-[#999] mt-1 px-1 font-medium">
                            {format(new Date(msg.timestamp), 'h:mm a')}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A]">Start a Conversation</h4>
                      <p className="text-sm text-[#999] mt-1">Have a question about your project? Message us directly here.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-top border-[#F0F0F0]">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (chatMessage.trim() && onSendMessage && currentSession) {
                      onSendMessage(currentSession.id, chatMessage);
                      setChatMessage('');
                    }
                  }}
                  className="relative flex items-center gap-2"
                >
                  <input 
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-[var(--brand-gold)]/20 transition-all"
                  />
                  <button 
                    disabled={!chatMessage.trim() || !currentSession}
                    className="p-3 bg-[var(--brand-gold)] text-white rounded-2xl shadow-lg shadow-[var(--brand-gold)]/20 disabled:opacity-50 disabled:shadow-none hover:bg-[var(--brand-gold-dark)] transition-all active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
};

export default CustomerPortalView;
