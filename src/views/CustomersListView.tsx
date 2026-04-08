import React, { useState, useMemo } from 'react';
import { Job, CustomerLifecycle, NurtureSequence, PostProjectStatus, ActivityItem } from '../types';
import { 
  Users, MapPin, ExternalLink, ChevronRight, Search, Filter, 
  MessageSquare, User, TrendingUp, 
  AlertCircle, Sparkles, BarChart3, ArrowUpRight,
  History, CalendarClock, Zap, Hourglass,
  PhoneCall, MailCheck, Send, FileText,
  Repeat, Star,
  XCircle, BrainCircuit, Copy, Check, RefreshCw,
  Lightbulb, Wand2, MessageCircle, Info, Kanban, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { crmAiService } from '../services/crmAiService';

interface CustomersListViewProps {
  jobs: Job[];
  onOpenJob: (job: Job) => void;
  onPreviewPortal: (job: Job) => void;
}

const CustomersListView: React.FC<CustomersListViewProps> = ({ jobs, onOpenJob, onPreviewPortal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CustomerLifecycle | 'ALL' | 'STUCK' | 'HOT'>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('pipeline');

  const calculateLeadHeat = (job: Job): 'cold' | 'warm' | 'hot' => {
    if (!job.portalEngagement) return 'cold';
    
    const { totalOpens, totalTimeSpentSeconds, lastOpenedAt } = job.portalEngagement;
    
    // Hot criteria: Opened > 5 times OR spent > 5 mins OR opened in last 24h
    const lastOpenedDate = lastOpenedAt ? new Date(lastOpenedAt) : null;
    const isRecentlyOpened = lastOpenedDate && (new Date().getTime() - lastOpenedDate.getTime()) < 24 * 60 * 60 * 1000;
    
    if (totalOpens > 5 || totalTimeSpentSeconds > 300 || isRecentlyOpened) return 'hot';
    
    // Warm criteria: Opened > 2 times OR spent > 1 min
    if (totalOpens > 2 || totalTimeSpentSeconds > 60) return 'warm';
    
    return 'cold';
  };

  const LIFECYCLE_STAGES = useMemo(() => [
    { id: CustomerLifecycle.NEW_LEAD, label: 'New Leads', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: CustomerLifecycle.CONTACTED, label: 'Contacted', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { id: CustomerLifecycle.ESTIMATE_IN_PROGRESS, label: 'Estimating', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: CustomerLifecycle.ESTIMATE_SENT, label: 'Estimate Sent', color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: CustomerLifecycle.FOLLOW_UP_NEEDED, label: 'Follow Up', color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { id: CustomerLifecycle.WON_SOLD, label: 'Won / Sold', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: CustomerLifecycle.ACTIVE_JOB, label: 'Active Jobs', color: 'text-[var(--brand-gold)]', bg: 'bg-[var(--brand-gold)]/10' },
    { id: CustomerLifecycle.COMPLETED, label: 'Completed', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  ], []);

  // AI State
  const [aiLoading, setAiLoading] = useState<string | null>(null); // 'draft' | 'summary' | 'nextStep' | 'reactivation'
  const [aiDraft, setAiDraft] = useState<{ type: string; content: string } | null>(null);
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const [aiNextStep, setAiNextStep] = useState<Record<string, { action: string; reasoning: string }>>({});
  const [aiInsight, setAiInsight] = useState<Record<string, string>>({});
  const [aiReactivation, setAiReactivation] = useState<Record<string, { angle: string; draft: string }>>({});
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerateDraft = async (customer: any, type: string) => {
    if (!customer.jobs[0]) return;
    setAiLoading('draft');
    const draft = await crmAiService.generateFollowUpDraft(customer.jobs[0], type);
    setAiDraft({ type, content: draft });
    setAiLoading(null);
  };

  const handleGetSummary = async (customer: any) => {
    if (!customer.jobs[0]) return;
    setAiLoading('summary');
    const summary = await crmAiService.getCustomerSummary(customer.jobs[0]);
    setAiSummary(prev => ({ ...prev, [customer.name]: summary }));
    setAiLoading(null);
  };

  const handleGetNextStep = async (customer: any) => {
    if (!customer.jobs[0]) return;
    setAiLoading('nextStep');
    const nextStep = await crmAiService.getRecommendedNextStep(customer.jobs[0]);
    setAiNextStep(prev => ({ ...prev, [customer.name]: nextStep }));
    setAiLoading(null);
  };

  const handleGetInsight = async (customer: any) => {
    if (!customer.jobs[0]) return;
    setAiLoading('insight');
    const insight = await crmAiService.getStaleLeadInsight(customer.jobs[0]);
    setAiInsight(prev => ({ ...prev, [customer.name]: insight }));
    setAiLoading(null);
  };

  const handleGetReactivation = async (customer: any) => {
    if (!customer.jobs[0]) return;
    setAiLoading('reactivation');
    const reactivation = await crmAiService.getReactivationIdea(customer.jobs[0]);
    setAiReactivation(prev => ({ ...prev, [customer.name]: reactivation }));
    setAiLoading(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const AiDraftModal = () => (
    <AnimatePresence>
      {aiDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--brand-gold)]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-xl flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">AI Follow-Up Draft</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-gold)]">{aiDraft.type.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <button 
                onClick={() => setAiDraft(null)}
                className="p-2 hover:bg-[var(--text-primary)]/5 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="relative">
                <textarea 
                  value={aiDraft.content}
                  onChange={(e) => setAiDraft({ ...aiDraft, content: e.target.value })}
                  className="w-full h-48 p-4 bg-[var(--text-primary)]/5 border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/50 resize-none font-sans leading-relaxed"
                />
                <button 
                  onClick={() => copyToClipboard(aiDraft.content)}
                  className="absolute bottom-4 right-4 p-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4 text-[var(--brand-gold)]" />
                      <span className="text-[10px] font-bold text-[var(--brand-gold)] uppercase tracking-widest">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--brand-gold)]" />
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--brand-gold)] uppercase tracking-widest">Copy Draft</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  <strong>Copilot Note:</strong> This is a draft generated based on the customer's history. Please review and edit as needed before sending manually via SMS or Email.
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-[var(--text-primary)]/5 flex items-center justify-end gap-3">
              <button 
                onClick={() => setAiDraft(null)}
                className="px-6 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  copyToClipboard(aiDraft.content);
                  setAiDraft(null);
                }}
                className="px-6 py-2.5 bg-[var(--brand-gold)] text-white rounded-xl text-sm font-bold shadow-lg shadow-[var(--brand-gold)]/20 hover:bg-[var(--brand-gold)] transition-all flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const AiCopilotCard = ({ customer }: { customer: any }) => {
    const summary = aiSummary[customer.name];
    const nextStep = aiNextStep[customer.name];
    const insight = aiInsight[customer.name];
    const reactivation = aiReactivation[customer.name];
    const isStale = customer.jobs[0]?.followUpStatus === 'overdue';

    return (
      <div className="bg-[var(--brand-gold)]/[0.03] border border-[var(--brand-gold)]/10 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[var(--brand-gold)]" />
            <h4 className="text-xs font-black uppercase tracking-widest text-[var(--brand-gold)]">AI CRM Copilot</h4>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleGetSummary(customer)}
              disabled={aiLoading === 'summary'}
              className="p-1.5 hover:bg-[var(--brand-gold)]/10 rounded-lg text-[var(--brand-gold)] transition-colors disabled:opacity-50"
              title="Summarize Record"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiLoading === 'summary' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {summary ? (
          <div className="bg-white/50 border border-[var(--brand-gold)]/5 p-3 rounded-xl">
            <p className="text-xs text-[var(--text-primary)] leading-relaxed italic">"{summary}"</p>
          </div>
        ) : (
          <button 
            onClick={() => handleGetSummary(customer)}
            className="w-full py-2 border border-dashed border-[var(--brand-gold)]/20 rounded-xl text-[10px] font-bold text-[var(--brand-gold)] uppercase tracking-widest hover:bg-[var(--brand-gold)]/5 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3 h-3" />
            Generate Record Summary
          </button>
        )}

        <div className="grid grid-cols-2 gap-3">
          {nextStep ? (
            <div className="bg-white/50 border border-[var(--brand-gold)]/5 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Next Step</span>
              </div>
              <p className="text-[11px] font-bold text-[var(--text-primary)]">{nextStep.action}</p>
              <p className="text-[9px] text-[var(--text-secondary)] leading-tight">{nextStep.reasoning}</p>
            </div>
          ) : (
            <button 
              onClick={() => handleGetNextStep(customer)}
              className="h-full py-3 border border-dashed border-[var(--brand-gold)]/20 rounded-xl text-[9px] font-bold text-[var(--brand-gold)] uppercase tracking-widest hover:bg-[var(--brand-gold)]/5 transition-all flex flex-col items-center justify-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              Next Step
            </button>
          )}

          {isStale && (
            insight ? (
              <div className="bg-white/50 border border-amber-500/5 p-3 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Hourglass className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Stale Insight</span>
                </div>
                <p className="text-[9px] text-[var(--text-secondary)] leading-tight italic">"{insight}"</p>
              </div>
            ) : (
              <button 
                onClick={() => handleGetInsight(customer)}
                className="h-full py-3 border border-dashed border-amber-500/20 rounded-xl text-[9px] font-bold text-amber-600 uppercase tracking-widest hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center gap-1"
              >
                <Hourglass className="w-3 h-3" />
                Why Stuck?
              </button>
            )
          )}

          {!isStale && customer.lifecycleStage === CustomerLifecycle.COMPLETED && (
            reactivation ? (
              <div className="bg-white/50 border border-indigo-500/5 p-3 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Reactivate</span>
                </div>
                <p className="text-[11px] font-bold text-[var(--text-primary)]">{reactivation.angle}</p>
                <button 
                  onClick={() => setAiDraft({ type: 'Reactivation', content: reactivation.draft })}
                  className="text-[9px] text-indigo-600 font-bold hover:underline"
                >
                  View Draft
                </button>
              </div>
            ) : (
              <button 
                onClick={() => handleGetReactivation(customer)}
                className="h-full py-3 border border-dashed border-indigo-500/20 rounded-xl text-[9px] font-bold text-indigo-600 uppercase tracking-widest hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Reactivate
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button 
            onClick={() => handleGenerateDraft(customer, 'Estimate Follow-up')}
            className="flex-1 py-2 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[var(--brand-gold)]/20 transition-all flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3 h-3" />
            Draft Follow-up
          </button>
        </div>
      </div>
    );
  };

  // Group jobs by customer and derive CRM context
  const customers = useMemo(() => {
    const grouped = jobs.reduce((acc, job) => {
      const clientKey = job.clientName;
      if (!acc[clientKey]) {
        acc[clientKey] = {
          id: job.id,
          name: job.clientName,
          email: job.clientEmail || 'No email provided',
          phone: job.clientPhone || 'No phone provided',
          address: job.projectAddress,
          jobs: [],
          lifecycleStage: job.lifecycleStage || (job.status === 'COMPLETED' ? CustomerLifecycle.COMPLETED : CustomerLifecycle.ACTIVE_JOB),
          leadSource: job.leadSource || 'Website',
          assignedSalesperson: job.assignedSalesperson || 'Jack (Office)',
          lastContactDate: job.lastContactDate || 'Mar 22',
          nextFollowUpDate: job.nextFollowUpDate || 'Mar 25',
          followUpStatus: job.followUpStatus || 'needed',
          followUpReason: job.followUpReason || (job.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ? 'Estimate sent, no reply' : 'Initial lead follow-up'),
          nextAction: job.nextAction || { type: 'call', label: 'Follow up' },
          agingDays: 5,
          activities: job.activities || [
            { id: `act-${job.id}`, type: 'lead_created', description: 'Lead created', timestamp: job.scheduledDate }
          ],
          estimateStatus: job.estimateStatus || (job.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ? 'sent' : 'pending'),
          estimateAmount: job.estimateAmount || (Math.floor(Math.random() * 15000) + 5000),
          estimateSentDate: job.estimateSentDate || 'Mar 20',
          estimateVersion: job.estimateVersion || 'v1.2',
          projectedSaleDate: job.projectedSaleDate || 'Apr 10',
          nurtureSequence: job.nurtureSequence || NurtureSequence.NONE,
          nurtureStep: job.nurtureStep || 0,
          nurtureStatus: job.nurtureStatus || 'none',
          postProjectStatus: job.postProjectStatus || PostProjectStatus.NONE
        };
      }
      acc[clientKey].jobs.push(job);
      return acc;
    }, {} as Record<string, any>);

    const merged = { ...grouped };

    // Add lifetime jobs count and portal status
    Object.keys(merged).forEach(key => {
      const customer = merged[key];
      customer.lifetimeJobs = customer.jobs.length;
      // Get most advanced portal status from jobs
      if (customer.jobs.length > 0) {
        const statuses = ['viewed', 'shared', 'ready', 'not_set'];
        customer.portalStatus = customer.jobs.reduce((acc: string, job: Job) => {
          const currentIdx = statuses.indexOf(job.portalStatus || 'not_set');
          const accIdx = statuses.indexOf(acc);
          return currentIdx < accIdx ? job.portalStatus || 'not_set' : acc;
        }, 'not_set');

        // Calculate aging based on stageUpdatedAt
        const latestJob = customer.jobs[0];
        if (latestJob.stageUpdatedAt) {
          const diff = Date.now() - new Date(latestJob.stageUpdatedAt).getTime();
          customer.agingDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        // Calculate heat
        customer.heat = calculateLeadHeat(latestJob);
      }
    });

    return merged;
  }, [jobs]);

  const customerList = Object.values(customers);

  // Filter logic
  const filteredCustomers = useMemo(() => {
    return customerList.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFilter = activeFilter === 'ALL' || customer.lifecycleStage === activeFilter;
      
      if (activeFilter === 'STUCK') {
        // A deal is "stuck" if it's in a pre-won stage and aging > 14 days
        const preWonStages = [
          CustomerLifecycle.NEW_LEAD,
          CustomerLifecycle.CONTACTED,
          CustomerLifecycle.ESTIMATE_IN_PROGRESS,
          CustomerLifecycle.ESTIMATE_SENT,
          CustomerLifecycle.FOLLOW_UP_NEEDED
        ];
        matchesFilter = preWonStages.includes(customer.lifecycleStage) && customer.agingDays > 14;
      } else if (activeFilter === 'HOT') {
        matchesFilter = customer.heat === 'hot';
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [customerList, searchQuery, activeFilter]);

  // Summary stats refined for sales pipeline
  const stats = useMemo(() => {
    const pipelineValue = customerList.reduce((acc, c) => {
      if ([CustomerLifecycle.ESTIMATE_IN_PROGRESS, CustomerLifecycle.ESTIMATE_SENT, CustomerLifecycle.FOLLOW_UP_NEEDED].includes(c.lifecycleStage)) {
        acc += c.estimateAmount || 0;
      }
      return acc;
    }, 0);

    return {
      newLeads: customerList.filter(c => c.lifecycleStage === CustomerLifecycle.NEW_LEAD).length,
      estimatesInProgress: customerList.filter(c => c.lifecycleStage === CustomerLifecycle.ESTIMATE_IN_PROGRESS).length,
      estimatesSent: customerList.filter(c => c.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT).length,
      followUpDue: customerList.filter(c => c.followUpStatus === 'due_today').length,
      overdue: customerList.filter(c => c.followUpStatus === 'overdue').length,
      wonSold: customerList.filter(c => c.lifecycleStage === CustomerLifecycle.WON_SOLD).length,
      pipelineValue,
      stuckDeals: customerList.filter(c => {
        const preWonStages = [
          CustomerLifecycle.NEW_LEAD,
          CustomerLifecycle.CONTACTED,
          CustomerLifecycle.ESTIMATE_IN_PROGRESS,
          CustomerLifecycle.ESTIMATE_SENT,
          CustomerLifecycle.FOLLOW_UP_NEEDED
        ];
        return preWonStages.includes(c.lifecycleStage) && c.agingDays > 14;
      }).length,
      reviewReferral: customerList.filter(c => 
        c.postProjectStatus === PostProjectStatus.REVIEW_REQUESTED || 
        c.postProjectStatus === PostProjectStatus.REFERRAL_OPPORTUNITY
      ).length
    };
  }, [customerList]);

  const renderCustomerCard = (customer: any, isPipelineView: boolean = false) => {
    const isExpanded = expandedCustomer === customer.name;
    return (
      <motion.div
        key={customer.name}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={() => setExpandedCustomer(isExpanded ? null : customer.name)}
        className={`bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--brand-gold)]/30 transition-all group flex flex-col relative cursor-pointer ${
          isExpanded 
            ? 'col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 row-span-2 ring-2 ring-[var(--brand-gold)]/20 z-20' 
            : 'z-10'
        } ${isPipelineView && isExpanded ? 'shadow-2xl' : ''}`}
      >
        {/* Follow-up Indicator */}
        {(customer.followUpStatus === 'overdue' || customer.followUpStatus === 'due_today') && !isExpanded && (
          <div className="absolute top-2 right-2 z-10">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              customer.followUpStatus === 'overdue' ? 'bg-red-600' : 'bg-rose-500'
            }`} />
          </div>
        )}

        <div className={`p-3 flex-1 flex flex-col ${isExpanded ? 'space-y-4' : 'space-y-2'}`}>
          {/* Card Header: Identity & Stage */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center border shrink-0 ${isExpanded ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/20' : 'bg-gray-50 border-gray-100'}`}>
                <User className={`w-3.5 h-3.5 ${isExpanded ? 'text-[var(--brand-gold)]' : 'text-gray-400'}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold tracking-tight text-[var(--text-primary)] truncate group-hover:text-[var(--brand-gold)] transition-colors">
                  {customer.name}
                </h3>
                {customer.heat === 'hot' && (
                  <span className="px-1.5 py-0.5 bg-orange-500 text-black text-[8px] font-black uppercase rounded flex items-center gap-0.5 shadow-lg shadow-orange-500/20">
                    <Zap size={8} /> Hot
                  </span>
                )}
                {customer.heat === 'warm' && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase rounded">
                    Warm
                  </span>
                )}
                {!isExpanded && (
                  <div className="flex items-center gap-1.5 text-[8px] font-bold text-[var(--text-secondary)]">
                    <span className={`flex items-center gap-0.5 ${customer.agingDays > 14 ? 'text-red-500' : 'text-amber-600'}`}>
                      <Hourglass className="w-2 h-2" /> {customer.agingDays}d
                    </span>
                    {customer.estimateAmount > 0 && (
                      <span className="text-[var(--brand-gold)] font-black">
                        ${customer.estimateAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className={`shrink-0 px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest ${getStageColor(customer.lifecycleStage)}`}>
                {customer.lifecycleStage.replace(/_/g, ' ')}
              </div>
            )}
          </div>

          {/* Compact Quick Actions */}
          {!isExpanded && (
            <div className="flex items-center gap-1 pt-1 border-t border-[var(--border-color)]/50">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewPortal(customer.jobs[0]);
                }}
                className="flex-1 py-1 bg-[var(--brand-gold)]/5 text-[var(--brand-gold)] rounded-md text-[7px] font-black uppercase tracking-widest hover:bg-[var(--brand-gold)]/10 transition-all"
              >
                {customer.jobs[0]?.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ? 'Estimate' : 'Portal'}
              </button>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex-1 py-1 bg-blue-500/5 text-blue-500 rounded-md text-[7px] font-black uppercase tracking-widest hover:bg-blue-500/10 transition-all"
              >
                Chat
              </button>
            </div>
          )}

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Contact & Status Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <MailCheck className="w-3 h-3 shrink-0" />
                      <span className="text-[10px] truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <PhoneCall className="w-3 h-3 shrink-0" />
                      <span className="text-[10px] truncate">{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="text-[10px] truncate">{customer.address}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {customer.nurtureStatus === 'active' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                          <Repeat className="w-2.5 h-2.5 text-indigo-500" />
                          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Nurture</span>
                        </div>
                      )}
                      {customer.postProjectStatus === PostProjectStatus.REVIEW_REQUESTED && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                          <Star className="w-2.5 h-2.5 text-amber-600" />
                          <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Review</span>
                        </div>
                      )}
                      {customer.followUpStatus === 'overdue' && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md">
                          <AlertCircle className="w-2.5 h-2.5 text-red-600" />
                          <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Overdue</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-1">Lead Source</p>
                      <p className="text-[10px] font-bold text-[var(--text-primary)]">{customer.leadSource}</p>
                    </div>
                  </div>
                </div>

                {/* Next Action & Estimate Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[8px] font-black uppercase tracking-widest text-[var(--brand-gold)] flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Next Action
                      </p>
                      <span className="text-[7px] font-bold text-[var(--brand-gold)]/60 uppercase">{customer.nextFollowUpDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[var(--brand-gold)]/10 rounded flex items-center justify-center text-[var(--brand-gold)]">
                        {customer.nextAction.type === 'call' && <PhoneCall className="w-3 h-3" />}
                        {customer.nextAction.type === 'email' && <MailCheck className="w-3 h-3" />}
                        {customer.nextAction.type === 'consultation' && <Users className="w-3 h-3" />}
                        {customer.nextAction.type === 'estimate' && <FileText className="w-3 h-3" />}
                      </div>
                      <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">{customer.nextAction.label}</p>
                    </div>
                  </div>

                  {(customer.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT || customer.lifecycleStage === CustomerLifecycle.WON_SOLD || customer.estimateAmount > 0) && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <p className="text-[8px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1">
                          <BarChart3 className="w-2.5 h-2.5" /> Estimate
                        </p>
                        <span className="text-[7px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full uppercase">
                          {customer.estimateStatus}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-sm font-display italic text-amber-700 font-bold">${customer.estimateAmount.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-amber-700/60">{customer.projectedSaleDate}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Activity & AI Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1">
                        <History className="w-2.5 h-2.5" /> Recent Activity
                      </p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(selectedCustomer === customer.name ? null : customer.name);
                        }}
                        className="text-[8px] font-bold text-[var(--brand-gold)] hover:underline"
                      >
                        {selectedCustomer === customer.name ? 'Hide' : 'View All'}
                      </button>
                    </div>
                    <div className="space-y-2 relative before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-[var(--border-color)]">
                      {customer.activities.slice(0, selectedCustomer === customer.name ? 5 : 2).map((activity: ActivityItem) => (
                        <div key={activity.id} className="flex gap-2 relative z-10">
                          <div className="w-[15px] h-[15px] rounded-full flex items-center justify-center border bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)]">
                            {activity.type === 'estimate_sent' && <ArrowUpRight className="w-2 h-2" />}
                            {activity.type === 'client_replied' && <MessageSquare className="w-2 h-2" />}
                            {activity.type === 'stage_changed' && <TrendingUp className="w-2 h-2" />}
                            {activity.type === 'lead_created' && <Sparkles className="w-2 h-2" />}
                            {activity.type === 'message_sent' && <Send className="w-2 h-2" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-medium text-[var(--text-primary)] leading-tight">{activity.description}</p>
                            <p className="text-[7px] text-[var(--text-secondary)]">{activity.timestamp.split('T')[0]}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <AiCopilotCard customer={customer} />
                </div>

                {/* Expanded Actions */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenJob(customer.jobs[0]);
                    }}
                    className="py-2 bg-gray-100 hover:bg-gray-200 text-[8px] font-black uppercase tracking-widest text-gray-600 rounded-xl transition-all flex flex-col items-center gap-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                    Details
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewPortal(customer.jobs[0]);
                    }}
                    className="py-2 bg-[var(--brand-gold)]/10 hover:bg-[var(--brand-gold)]/20 text-[8px] font-black uppercase tracking-widest text-[var(--brand-gold)] rounded-xl transition-all flex flex-col items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {customer.jobs[0]?.lifecycleStage === CustomerLifecycle.ESTIMATE_SENT ? 'Estimate' : 'Portal'}
                  </button>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 bg-blue-500/10 hover:bg-blue-500/20 text-[8px] font-black uppercase tracking-widest text-blue-600 rounded-xl transition-all flex flex-col items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Chat
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setLostReasonCustomer(customer.name);
                    }}
                    className="py-2 bg-red-500/10 hover:bg-red-500/20 text-[8px] font-black uppercase tracking-widest text-red-600 rounded-xl transition-all flex flex-col items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    Lost
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  const PipelineBoard = () => (
    <div className="flex gap-4 pb-8 min-h-[600px] overflow-x-auto no-scrollbar w-full justify-start">
      {LIFECYCLE_STAGES.map((stage) => {
        const stageCustomers = customerList.filter(c => c.lifecycleStage === stage.id);
        const stageTotal = stageCustomers.reduce((sum, c) => sum + (c.estimateAmount || 0), 0);
        
        return (
          <div key={stage.id} className="flex flex-col w-[300px] shrink-0 snap-start bg-gray-50/30 rounded-3xl border border-[var(--border-color)]/50 p-2">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-2 pt-2">
              <div className="flex flex-col">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  {stage.label}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black text-[var(--text-primary)]">
                    {stageCustomers.length}
                  </span>
                  {stageTotal > 0 && (
                    <span className="text-[10px] font-black text-[var(--brand-gold)]">
                      ${(stageTotal / 1000).toFixed(1)}k
                    </span>
                  )}
                </div>
              </div>
              <div className={`w-1.5 h-6 rounded-full ${stage.bg.replace('/10', '/100').replace('bg-', 'bg-')}`} style={{ backgroundColor: stage.bg.includes('emerald') ? '#C4A432' : stage.bg.includes('blue') ? '#3b82f6' : stage.bg.includes('cyan') ? '#06b6d4' : stage.bg.includes('amber') ? '#f59e0b' : stage.bg.includes('orange') ? '#f97316' : stage.bg.includes('rose') ? '#f43f5e' : stage.bg.includes('purple') ? '#a855f7' : '#64748b' }} />
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-2 relative">
              {stageCustomers.map((customer) => renderCustomerCard(customer, true))}
              {stageCustomers.length === 0 && (
                <div className="border-2 border-dashed border-[var(--border-color)]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-20">
                  <p className="text-[8px] font-bold uppercase tracking-widest">No Leads</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const followUpQueue = useMemo(() => {
    return customerList.filter(c => 
      c.followUpStatus === 'due_today' || 
      c.followUpStatus === 'overdue' || 
      c.followUpStatus === 'waiting'
    ).sort((a, b) => {
      if (a.followUpStatus === 'overdue') return -1;
      if (b.followUpStatus === 'overdue') return 1;
      return 0;
    });
  }, [customerList]);

  const getStageColor = (stage: CustomerLifecycle) => {
    switch (stage) {
      case CustomerLifecycle.NEW_LEAD: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case CustomerLifecycle.CONTACTED: return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case CustomerLifecycle.ESTIMATE_IN_PROGRESS: return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case CustomerLifecycle.ESTIMATE_SENT: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case CustomerLifecycle.FOLLOW_UP_NEEDED: return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case CustomerLifecycle.WON_SOLD: return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case CustomerLifecycle.ACTIVE_JOB: return 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border-[var(--brand-gold)]/20';
      case CustomerLifecycle.COMPLETED: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case CustomerLifecycle.WARRANTY_FOLLOW_UP: return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className={`p-4 md:p-8 ${viewMode === 'pipeline' ? 'max-w-full' : 'max-w-full'} space-y-10`}>
      {/* CRM Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-display italic text-[var(--text-primary)]">Sales & Lead Pipeline</h2>
          <p className="text-[var(--text-secondary)] font-label mt-1">Track estimates, manage follow-ups, and convert leads to jobs</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input 
              type="text" 
              placeholder="Search leads & customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-[var(--text-primary)]/5 border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-gold)]/50 w-64 transition-all"
            />
          </div>
          <button className="p-2.5 bg-[var(--text-primary)]/5 border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CRM Summary Cards - Refined for Sales Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Pipeline Value', value: `$${(stats.pipelineValue / 1000).toFixed(1)}k`, icon: BarChart3, color: 'text-[var(--brand-gold)]', bg: 'bg-[var(--brand-gold)]/5' },
          { label: 'Estimates Sent', value: stats.estimatesSent, icon: ArrowUpRight, color: 'text-orange-500', bg: 'bg-orange-500/5' },
          { label: 'Stuck Deals', value: stats.stuckDeals, icon: Hourglass, color: 'text-amber-600', bg: 'bg-amber-600/5' },
          { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-600/5' },
          { label: 'Won / Sold', value: stats.wonSold, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/5' },
          { label: 'Review / Referral', value: stats.reviewReferral, icon: Star, color: 'text-indigo-500', bg: 'bg-indigo-500/5' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"
          >
            <div className={`w-8 h-8 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{stat.label}</p>
            <p className="text-2xl font-display italic text-[var(--text-primary)] mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Follow-Up & Nurture Queue Section */}
      {followUpQueue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Follow-Up & Nurture Queue</h3>
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-widest">Active Nurture</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {followUpQueue.slice(0, 3).map((customer) => (
              <div key={`queue-${customer.name}`} className="bg-[var(--bg-primary)] border border-[var(--border-color)] p-4 rounded-2xl flex items-center justify-between group hover:border-amber-500/30 transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    customer.followUpStatus === 'overdue' ? 'bg-red-500/10 text-red-500' : 
                    customer.followUpStatus === 'due_today' ? 'bg-rose-500/10 text-rose-500' : 
                    customer.nurtureStatus === 'active' ? 'bg-indigo-500/10 text-indigo-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>
                    {customer.nurtureStatus === 'active' ? <Repeat className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{customer.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">{customer.nextAction.label}</p>
                      {customer.nurtureSequence !== NurtureSequence.NONE && (
                        <span className="text-[8px] font-black text-indigo-500 uppercase px-1.5 py-0.5 bg-indigo-500/5 rounded border border-indigo-500/10">Step {customer.nurtureStep}</span>
                      )}
                      <button 
                        onClick={() => handleGenerateDraft(customer, 'follow_up')}
                        className="p-1 bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] rounded-md hover:bg-[var(--brand-gold)]/20 transition-colors"
                        title="AI Draft Follow-up"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${
                    customer.followUpStatus === 'overdue' ? 'text-red-500' : 
                    customer.followUpStatus === 'due_today' ? 'text-rose-500' : 
                    'text-amber-500'
                  }`}>
                    {customer.followUpStatus.replace('_', ' ')}
                  </p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">{customer.nextFollowUpDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lifecycle Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
          <button 
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
              activeFilter === 'ALL' 
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg' 
                : 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)]/30'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveFilter('HOT')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${
              activeFilter === 'HOT' 
                ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20' 
                : 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:border-orange-500/30'
            }`}
          >
            <Zap className="w-3 h-3" /> Hot Leads
          </button>
          <button 
            onClick={() => setActiveFilter('STUCK')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${
              activeFilter === 'STUCK' 
                ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20' 
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:border-amber-600/30'
            }`}
          >
            <Hourglass className="w-3 h-3" /> Stuck Deals
          </button>
          {Object.values(CustomerLifecycle).map((stage) => (
            <button 
              key={stage}
              onClick={() => setActiveFilter(stage)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeFilter === stage 
                  ? 'bg-[var(--brand-gold)] text-white border-[var(--brand-gold)] shadow-lg shadow-[var(--brand-gold)]/20' 
                  : 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--brand-gold)]/30'
              }`}
            >
              {stage.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-[var(--text-primary)]/5 p-1 rounded-xl border border-[var(--border-color)] shrink-0">
          <button 
            onClick={() => setViewMode('pipeline')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'pipeline' ? 'bg-[var(--bg-primary)] text-[var(--brand-gold)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            title="Pipeline View"
          >
            <Kanban className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-primary)] text-[var(--brand-gold)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Display */}
      {activeFilter === 'ALL' && viewMode === 'pipeline' ? (
        <PipelineBoard />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCustomers.map((customer) => renderCustomerCard(customer))}
          </AnimatePresence>
        </div>
      )}

      {filteredCustomers.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-[var(--text-primary)]/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">No customers found</h3>
          <p className="text-[var(--text-secondary)]">Try adjusting your search or filters</p>
        </div>
      )}

      <AiDraftModal />
    </div>
  );
};

export default CustomersListView;
