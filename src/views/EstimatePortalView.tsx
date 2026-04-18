import React, { useState, useEffect, useMemo } from 'react';
import { Job, EstimateOption, PortalEngagement, CustomerLifecycle, DepositStatus, SoldWorkflowStatus } from '../types';
import { COMPANY } from '../config/company';
import { 
  Check, Info, Shield, 
  Award, Zap, MessageSquare, Phone,
  ArrowRight, CheckCircle2, AlertCircle, Sparkles,
  ShieldCheck, Calendar, Wallet, Edit2, X,
  Clock, FileText, Receipt, Camera
} from 'lucide-react';

import { AISalesAssistant } from '../components/AISalesAssistant';
import { AIObjectionHelper } from '../components/AIObjectionHelper';

interface EstimatePortalViewProps {
  job: Job;
  onAcceptOption: (optionId: string, selectedAddOns: string[]) => void;
  onSignContract?: (jobId: string, signature: string) => void;
  onTrackEngagement?: (engagement: Partial<PortalEngagement>) => void;
  onClose?: () => void;
}

const EstimatePortalView: React.FC<EstimatePortalViewProps> = ({ 
  job, 
  onAcceptOption,
  onSignContract,
  onTrackEngagement,
  onClose
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(job.acceptedOptionId || null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(job.selectedAddOnIds || []);
  const [activeTab, setActiveTab] = useState<'proposal' | 'why-us' | 'process'>('proposal');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showContractSigning, setShowContractSigning] = useState(false);
  const [startTime] = useState(Date.now());
  const [viewDetailsOption, setViewDetailsOption] = useState<EstimateOption | null>(null);
  // Per-option enhancement selections: optionId -> Set of enhancement keys
  const [selectedEnhancements, setSelectedEnhancements] = useState<Record<string, Set<string>>>({});

  const toggleEnhancement = (optionId: string, key: string, name: string, price: number) => {
    setSelectedEnhancements(prev => {
      const current = prev[optionId] || new Set<string>();
      const next = new Set(current);
      const wasChecked = next.has(key);
      if (wasChecked) next.delete(key);
      else next.add(key);
      // Engagement tracking — enhancement interaction
      try {
        onTrackEngagement?.({
          lastInteraction: new Date().toISOString(),
          // Append to interactions log if the shape supports it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(((): any => {
            const interaction = { optionId, key, name, price, action: wasChecked ? 'removed' : 'added', timestamp: new Date().toISOString() };
            const existing = (job.portalEngagement as unknown as Record<string, unknown>)?.enhancementInteractions as Array<Record<string, unknown>> | undefined;
            return { enhancementInteractions: [...(existing || []), interaction] };
          })()),
        });
      } catch {
        // Tracking is best-effort — never break the UI
      }
      return { ...prev, [optionId]: next };
    });
  };

  const isAccepted = job.lifecycleStage === CustomerLifecycle.WON_SOLD;
  const acceptedSummary = job.acceptedBuildSummary;
  const acceptedOption = job.estimateData?.options.find(o => o.id === job.acceptedOptionId);
  const acceptedAddOns = job.estimateData?.addOns.filter(a => job.selectedAddOnIds?.includes(a.id)) || [];

  const getSoldWorkflowStatusLabel = (status?: SoldWorkflowStatus) => {
    switch (status) {
      case SoldWorkflowStatus.ACCEPTED: return 'Accepted & Initial Review';
      case SoldWorkflowStatus.AWAITING_DEPOSIT: return 'Awaiting Deposit';
      case SoldWorkflowStatus.DEPOSIT_RECEIVED: return 'Deposit Received';
      case SoldWorkflowStatus.READY_FOR_SETUP: return 'Ready for Project Setup';
      case SoldWorkflowStatus.MOVED_TO_ADMIN: return 'Moved to Production';
      default: return 'Planning & Admin';
    }
  };

  const getDepositStatusLabel = (status?: DepositStatus) => {
    switch (status) {
      case DepositStatus.NOT_SENT: return 'Preparing Invoice';
      case DepositStatus.REQUESTED: return 'Invoice Sent';
      case DepositStatus.RECEIVED: return 'Payment Received';
      default: return 'Pending';
    }
  };

  // Derive a single honest estimate option from job data when no options are stored
  const estimateData = useMemo(() => {
    if (job.estimateData) return job.estimateData;

    // If we have an actual estimate amount, show it as a single honest option
    const totalAmount = job.totalAmount || job.estimateAmount || 0;
    if (totalAmount > 0 && job.acceptedBuildSummary) {
      const summary = job.acceptedBuildSummary;
      return {
        options: [
          {
            id: 'opt-quoted',
            name: summary.packageName || 'Your Custom Deck',
            title: summary.packageName || 'Custom Deck Package',
            description: summary.description || 'Your personalized deck design, built to your exact specifications.',
            price: totalAmount,
            features: summary.features || ['Custom design to your specifications', 'Professional installation', 'Full warranty coverage'],
            differences: [],
            isRecommended: true,
            valueInsight: 'This quote was customized for your property and preferences.',
            specs: summary.specs || {}
          }
        ],
        addOns: [],
        paymentStructure: { deposit: 30, milestone: 30, final: 40 },
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Default placeholder options
    return {
    options: [
      {
        id: 'opt-1',
        name: 'Essential',
        title: 'Premium Pressure Treated Deck',
        description: 'A high-quality, cost-effective solution using premium brown pressure treated lumber. Perfect for those who want a beautiful deck with a classic look.',
        price: 12500,
        features: ['Premium Brown PT Lumber', 'Standard Railing System', 'Hidden Fasteners', '2-Year Workmanship Warranty'],
        differences: ['Requires regular staining/sealing', 'Natural wood characteristics (checking/cracking)'],
        isRecommended: false,
        valueInsight: 'Best for budget-conscious homeowners who don\'t mind annual maintenance.',
        specs: { maintenance: 'High', longevity: '10-15 Years', warranty: '2 Years', heat: 'Low' }
      },
      {
        id: 'opt-2',
        name: 'Signature',
        title: 'Luxury Composite Decking',
        description: 'Our most popular choice. Low-maintenance composite decking that looks like real wood but lasts much longer without the maintenance.',
        price: 18900,
        features: ['Trex Enhance Composite', 'Aluminum Railing System', 'Hidden Fasteners', '25-Year Material Warranty', '5-Year Workmanship Warranty'],
        differences: ['Low maintenance (soap & water only)', 'No splintering or rotting', 'Higher upfront cost, lower lifetime cost'],
        isRecommended: true,
        valueInsight: 'The "Sweet Spot" - eliminates 90% of maintenance while providing a 25-year warranty.',
        specs: { maintenance: 'Ultra-Low', longevity: '25+ Years', warranty: '25 Years', heat: 'Moderate' }
      },
      {
        id: 'opt-3',
        name: 'Elite',
        title: 'Ultra-Low Maintenance PVC',
        description: 'The pinnacle of outdoor living. Ultra-low maintenance PVC decking with superior heat dissipation and scratch resistance.',
        price: 24500,
        features: ['TimberTech AZEK PVC', 'Premium Glass Railing', 'Integrated Lighting Package', '50-Year Material Warranty', '10-Year Workmanship Warranty'],
        differences: ['Stays cooler in the sun', 'Best scratch & stain resistance', 'Most durable option available'],
        isRecommended: false,
        valueInsight: 'Maximum longevity and comfort. Stays cool on bare feet and offers the best warranty in the industry.',
        specs: { maintenance: 'Zero', longevity: '50+ Years', warranty: '50 Years', heat: 'Coolest' }
      }
    ],
    addOns: [
      { id: 'add-1', name: 'Integrated LED Lighting', description: 'Stair lights and post cap lights for ambiance and safety.', price: 1200 },
      { id: 'add-2', name: 'Privacy Screen (8ft)', description: 'Custom cedar privacy screen for one side of the deck.', price: 1850 },
      { id: 'add-3', name: 'Under-Deck Drainage', description: 'Keep the area below your deck dry for storage or living space.', price: 3200 }
    ],
    paymentStructure: [
      '10% Deposit to secure your spot in our production queue',
      '40% Material payment 2 weeks before start date',
      '40% Progress payment upon framing completion',
      '10% Final payment upon project completion and QC sign-off'
    ],
    whatHappensNext: [
      { title: 'Accept & Deposit', desc: 'Choose your option and pay the 10% deposit to lock in your spot in our queue.' },
      { title: 'Project Kickoff', desc: 'We assign your dedicated Project Manager and start permit/HOA applications.' },
      { title: 'Design Finalization', desc: 'A final site visit to confirm measurements and finalize material colors.' },
      { title: 'Build & Track', desc: 'Construction begins! Track daily progress and photos right here in your portal.' }
    ]
  };
  }, [job]);

  useEffect(() => {
    // Initial tracking for portal open
    if (onTrackEngagement) {
      onTrackEngagement({
        firstOpenedAt: new Date().toISOString(),
        totalOpens: 1
      });
    }

    return () => {
      // Track time spent on close
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      if (onTrackEngagement) {
        onTrackEngagement({
          totalTimeSpentSeconds: timeSpent
        });
      }
    };
  }, [onTrackEngagement, startTime]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => {
      const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      try {
        if (onTrackEngagement) {
          onTrackEngagement({
            addOnInteractions: { [id]: 1 }
          });
        }
      } catch (e) {
        console.error("Tracking error:", e);
      }
      return next;
    });
  };

  const handleOptionClick = (id: string) => {
    setSelectedOptionId(id);
    try {
      if (onTrackEngagement) {
        onTrackEngagement({
          optionClicks: { [id]: 1 }
        });
      }
    } catch (e) {
      console.error("Tracking error:", e);
    }
  };

  const calculateMonthlyEstimate = (total: number) => Math.round(total * 0.018);

  const calculateTotal = () => {
    const option = estimateData.options.find(o => o.id === (isAccepted ? job.acceptedOptionId : selectedOptionId));
    if (!option) return 0;
    
    const addOnsToUse = isAccepted ? job.selectedAddOnIds || [] : selectedAddOns;
    const addOnsTotal = addOnsToUse.reduce((sum, id) => {
      const addOn = estimateData.addOns.find(a => a.id === id);
      return sum + (addOn?.price || 0);
    }, 0);

    return option.price + addOnsTotal;
  };

  const handleAccept = () => {
    if (selectedOptionId) {
      // Merge per-option enhancement selections (keyed by e.g. 'helical', 'fabric_stone')
      // into the accepted add-ons list so they are captured on the job record.
      const enhancementKeys = Array.from(selectedEnhancements[selectedOptionId] || []);
      const mergedAddOns = Array.from(new Set([...selectedAddOns, ...enhancementKeys]));
      onAcceptOption(selectedOptionId, mergedAddOns);
      setShowContractSigning(true);
    }
  };

  const handleSignComplete = (signature: string) => {
    if (onSignContract) {
      onSignContract(job.id, signature);
    }
    setShowContractSigning(false);
    setShowConfirmation(true);
  };

  // Contract Signing Screen
  if (showContractSigning) {
    const amount = job.totalAmount || job.estimateAmount || 0;
    const deposit = Math.round(amount * 0.3);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Review & Sign Agreement</h2>
            <p className="text-slate-500">Please review the project details and sign below to confirm.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Project Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Client</p><p className="text-sm font-bold text-slate-900">{job.clientName}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Address</p><p className="text-sm text-slate-900">{job.projectAddress}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Total</p><p className="text-xl font-bold text-green-600">${amount.toLocaleString()}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Deposit (30%)</p><p className="text-xl font-bold text-slate-900">${deposit.toLocaleString()}</p></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Schedule</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Deposit (30%)</span><span className="font-bold">${deposit.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Material Delivery (30%)</span><span className="font-bold">${Math.round(amount * 0.3).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Final Handover (40%)</span><span className="font-bold">${Math.round(amount * 0.4).toLocaleString()}</span></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Terms</h3>
            <div className="text-xs text-slate-500 space-y-2 max-h-32 overflow-y-auto">
              <p>By signing below, you agree to the project scope, pricing, and payment schedule as outlined above.</p>
              <p>Any changes to the scope after acceptance will require a written change order with adjusted pricing.</p>
              <p>{COMPANY.name} provides a workmanship warranty on all installations. Material warranties are provided by the respective manufacturers.</p>
              <p>This agreement is governed by the laws of the Province of Ontario.</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Sign Below</p>
            <div className="relative bg-white border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden" style={{ height: '120px' }}>
              <canvas
                id="portal-signature-canvas"
                width={600}
                height={120}
                className="w-full h-full touch-none cursor-crosshair"
                style={{ display: 'block' }}
                ref={(canvas) => {
                  if (!canvas) return;
                  let isDrawing = false;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) return;
                  ctx.lineWidth = 2;
                  ctx.lineCap = 'round';
                  ctx.strokeStyle = '#1a1a1a';

                  const getPos = (e: MouseEvent | TouchEvent) => {
                    const rect = canvas.getBoundingClientRect();
                    if ('touches' in e) {
                      const t = e.touches[0];
                      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
                    }
                    return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
                  };

                  canvas.onmousedown = canvas.ontouchstart = (e: MouseEvent | TouchEvent) => { isDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x * (600 / canvas.offsetWidth), p.y * (120 / canvas.offsetHeight)); };
                  canvas.onmousemove = canvas.ontouchmove = (e: MouseEvent | TouchEvent) => { if (!isDrawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x * (600 / canvas.offsetWidth), p.y * (120 / canvas.offsetHeight)); ctx.stroke(); };
                  canvas.onmouseup = canvas.ontouchend = canvas.onmouseleave = () => { isDrawing = false; };
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">Sign Here</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowContractSigning(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => {
                const canvas = document.getElementById('portal-signature-canvas') as HTMLCanvasElement;
                if (canvas) {
                  const sig = canvas.toDataURL();
                  handleSignComplete(sig);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm & Sign
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div 
          
          
          className="max-w-xl w-full bg-white rounded-[3rem] p-12 text-center shadow-2xl border border-slate-100"
        >
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4">Project Accepted!</h2>
          <p className="text-slate-600 text-lg mb-10 leading-relaxed">
            Thank you for choosing {COMPANY.name}. We've received your selection and your project is now moving into our planning and scheduling phase.
          </p>
          
          <div className="bg-slate-50 rounded-3xl p-8 mb-10 text-left border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              What Happens Next:
            </h4>
            <ul className="space-y-4">
              {[
                "You will receive a deposit invoice via email shortly.",
                "Your Project Manager will reach out within 48 hours.",
                "We will begin permit and HOA applications immediately.",
                "Track your project's progress right here in this portal."
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">
                    {i + 1}
                  </div>
                  {step}
                </li>
              ))}
            </ul>
          </div>
          
          <button 
            onClick={() => setShowConfirmation(false)}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            Go to Project Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <Award className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">LUXURY DECKING</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                {isAccepted ? 'Project Portal' : 'Estimate Portal'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('proposal')}
              className={`text-sm font-semibold transition-colors ${activeTab === 'proposal' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {isAccepted ? 'Project Summary' : 'Your Proposal'}
            </button>
            <button 
              onClick={() => setActiveTab('why-us')}
              className={`text-sm font-semibold transition-colors ${activeTab === 'why-us' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Why Choose Us
            </button>
            <button 
              onClick={() => setActiveTab('process')}
              className={`text-sm font-semibold transition-colors ${activeTab === 'process' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Our Process
            </button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4" />
              <span className="text-sm font-medium">613-707-3060</span>
            </div>
            {onClose && (
              <>
                <div className="h-6 w-px bg-slate-200" />
                <button 
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all border border-rose-100"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Preview
                </button>
              </>
            )}
          </div>
          {/* Mobile Close Button */}
          {onClose && (
            <button 
              onClick={onClose}
              className="md:hidden p-2 text-slate-400 hover:text-rose-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-3xl flex-1 min-w-[260px]">
              {job.jobNumber && (
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-3">
                  Estimate {job.jobNumber}
                </p>
              )}
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                {job.clientName ? `Hello, ${job.clientName.split(' ')[0]}` : 'Welcome to Your Project'}
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Thank you for the opportunity to quote your outdoor project{job.projectAddress ? <> at <span className="font-semibold text-slate-900">{job.projectAddress}</span></> : ''}.
                {' '}
                {(() => {
                  const count = estimateData.options.length;
                  if (count === 0) return `We've prepared your personalized quote below.`;
                  if (count === 1) return `We've prepared your personalized quote to help you find the perfect balance of aesthetics, maintenance, and value.`;
                  const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
                  const wordCount = count <= 10 ? words[count - 1] : count.toString();
                  return `We've prepared ${wordCount} tailored options to help you find the perfect balance of aesthetics, maintenance, and value.`;
                })()}
              </p>
            </div>
            {/* Luxury Decking brand badge */}
            <div className="shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-center w-[96px] h-[96px]">
              <img
                src="/assets/logo-black.png"
                alt="Luxury Decking"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {activeTab === 'proposal' && (
          <div className="space-y-16">
            {isAccepted && (
              <div 
                
                
                className="bg-green-50 border border-green-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Project Accepted</h3>
                    <p className="text-slate-600 text-sm">Accepted on {new Date(job.acceptedDate || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 bg-white rounded-xl border border-green-200 text-green-700 text-xs font-bold uppercase tracking-widest">
                    Status: {getSoldWorkflowStatusLabel(job.soldWorkflowStatus)}
                  </div>
                  {job.depositStatus === DepositStatus.RECEIVED && (
                    <div className="px-4 py-2 bg-[var(--brand-gold)] text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Deposit Secured
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project Accepted Banner */}
            {isAccepted && (
              <div 
                
                
                className="mb-12 bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[var(--brand-gold)] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--brand-gold)]/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Project Accepted!</h3>
                    <p className="text-[#8B7520] font-medium">Your estimate was accepted on {job.acceptedDate ? new Date(job.acceptedDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Project Status</p>
                    <p className="text-sm font-bold text-slate-900">Pre-Production / Queue</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-xl border border-[var(--brand-gold)]/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[var(--brand-gold)]" />
                  </div>
                </div>
              </div>
            )}

            {/* Option Comparison */}
            {!isAccepted ? (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    Select Your Base Option
                  </h3>
                  <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
                    <Info className="w-4 h-4" />
                    <span>Click an option to select it</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {estimateData.options.map((option, idx) => {
                    const isPreferred = estimateData.options.length >= 2 && idx === 1;
                    const isSelected = selectedOptionId === option.id;

                    // Compute sqft and footings from job calculator data
                    const calOpt = (job.calculatorOptions?.find(o => o.id === option.id) as unknown as Record<string, Record<string, number>> | undefined);
                    const sqft: number = calOpt?.dimensions?.sqft || (job.calculatorDimensions as unknown as Record<string, number> | undefined)?.sqft || 0;
                    const footings: number = calOpt?.dimensions?.footingCount || (job.calculatorDimensions as unknown as Record<string, number> | undefined)?.footingCount || 0;

                    // Build optional enhancements list
                    const kf = option.keyFeatures;
                    const allFeatureText = [...(option.features || []), ...(kf ? Object.values(kf).filter(v => typeof v === 'string') : [])].join(' ').toLowerCase();
                    const enhancements: Array<{ key: string; name: string; price: number; description: string }> = [];

                    if (footings > 0 && !(kf?.foundation?.toLowerCase().includes('helical') || kf?.foundation?.toLowerCase().includes('screw pile'))) {
                      enhancements.push({ key: 'helical', name: 'Helical Pile Upgrade', price: footings * 469, description: 'Permanent steel screw-pile foundation' });
                    }
                    if (sqft > 0 && !allFeatureText.includes('fabric') && !allFeatureText.includes('stone')) {
                      enhancements.push({ key: 'fabric_stone', name: 'Landscape Fabric & Stone', price: Math.round(sqft * 5.49), description: 'Under-deck weed barrier and decorative stone' });
                    }
                    if (sqft > 0 && !allFeatureText.includes('joist')) {
                      enhancements.push({ key: 'joist_guard', name: 'JoistGuard Protection', price: Math.round(sqft * 2.49), description: 'Butyl joist tape on all framing members' });
                    }
                    if (sqft > 0 && !(kf?.framing?.includes('2\u00d710') && kf?.framing?.includes('12'))) {
                      enhancements.push({ key: 'framing_2x10_12', name: '2\u00d710 PT @ 12" OC Framing', price: Math.round(sqft * 6.49), description: 'Upgraded oversized joist framing package' });
                    }
                    if (!allFeatureText.includes('light')) {
                      enhancements.push({ key: 'inlight_6', name: 'InLight 6-Light Package', price: 1249, description: 'Low-voltage LED stair and post cap lights' });
                    }
                    if (!allFeatureText.includes('10-year') && !allFeatureText.includes('extended')) {
                      enhancements.push({ key: 'warranty_10', name: '10-Year Extended Warranty', price: Math.round(option.price * 0.05), description: 'Extended workmanship coverage for a decade of peace of mind' });
                    }

                    // Live price calculation — add selected enhancement prices to option base
                    const optionSelections = selectedEnhancements[option.id] || new Set<string>();
                    const enhancementTotal = enhancements
                      .filter(e => optionSelections.has(e.key))
                      .reduce((s, e) => s + e.price, 0);
                    const displayPrice = option.price + enhancementTotal;

                    return (
                      <div
                        key={option.id}
                        onClick={() => handleOptionClick(option.id)}
                        className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col ${
                          isPreferred
                            ? isSelected
                              ? 'border-[#D4A853] bg-white shadow-2xl scale-[1.03] z-10'
                              : 'border-[#D4A853] bg-white shadow-xl scale-[1.03] z-10'
                            : isSelected
                              ? 'border-slate-900 bg-white shadow-2xl scale-[1.02] z-10'
                              : 'border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        {/* Most Popular banner */}
                        {isPreferred ? (
                          <div className="bg-[#D4A853] text-white text-[10px] font-bold uppercase tracking-widest py-2 text-center">
                            &#9733; Most Popular Choice
                          </div>
                        ) : null}

                        <div className={`p-8 flex-grow ${isPreferred ? 'pt-6' : ''}`}>
                          <div className="flex justify-between items-start mb-6">
                            <div className="min-w-0">
                              <h4 className="text-2xl font-black text-slate-900 leading-tight">
                                {option.name}
                              </h4>
                              {option.title && option.title.trim() && option.title.trim().toLowerCase() !== option.name.trim().toLowerCase() && (
                                <p className="text-sm text-slate-500 mt-1 font-medium">{option.title}</p>
                              )}
                            </div>
                            {isSelected && (
                              <div className={`rounded-full p-1 shrink-0 ml-2 ${isPreferred ? 'bg-[#D4A853]' : 'bg-slate-900'}`}>
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-slate-900">
                                ${displayPrice.toLocaleString()}
                              </span>
                              <span className="text-slate-400 text-sm font-medium">inc. tax</span>
                            </div>
                            {enhancementTotal > 0 && (
                              <p className="text-[11px] text-slate-400 font-medium mt-1">
                                Base ${option.price.toLocaleString()} + ${enhancementTotal.toLocaleString()} upgrades
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-blue-600 bg-blue-50/50 w-fit px-3 py-1 rounded-lg border border-blue-100/50">
                              <Wallet size={12} className="shrink-0" />
                              <span className="text-[11px] font-bold tracking-tight uppercase">
                                Estimated ${calculateMonthlyEstimate(displayPrice).toLocaleString()}/mo
                              </span>
                            </div>
                          </div>

                          {/* Structured spec table */}
                          {kf ? (
                            <div className="space-y-3 mb-6">
                              <p className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-2">Specifications</p>
                              {kf.foundation && (
                                <div className="flex gap-2 text-sm">
                                  <span className="text-slate-400 font-medium w-24 shrink-0">Foundation</span>
                                  <span className="text-slate-700 font-medium">{kf.foundation}</span>
                                </div>
                              )}
                              {kf.framing && (
                                <div className="flex gap-2 text-sm">
                                  <span className="text-slate-400 font-medium w-24 shrink-0">Framing</span>
                                  <span className="text-slate-700 font-medium">{kf.framing}</span>
                                </div>
                              )}
                              {kf.decking && (
                                <div className="flex gap-2 text-sm">
                                  <span className="text-slate-400 font-medium w-24 shrink-0">Decking</span>
                                  <span className="text-slate-700 font-medium">{kf.decking}</span>
                                </div>
                              )}
                              {kf.railing && kf.railing.trim() && !/^no\s+railing/i.test(kf.railing.trim()) && (
                                <div className="flex gap-2 text-sm">
                                  <span className="text-slate-400 font-medium w-24 shrink-0">Railing</span>
                                  <span className="text-slate-700 font-medium">{kf.railing}</span>
                                </div>
                              )}
                              {kf.materialWarranty && (
                                <div className="flex gap-2 text-sm">
                                  <span className="text-slate-400 font-medium w-24 shrink-0">Mat. Warranty</span>
                                  <span className="text-slate-700 font-medium">{kf.materialWarranty}</span>
                                </div>
                              )}
                              <div className="flex gap-2 text-sm">
                                <span className="text-slate-400 font-medium w-24 shrink-0">Workmanship</span>
                                <span className="text-slate-700 font-medium">{kf.workmanshipWarranty || '5-Year Workmanship Warranty'}</span>
                              </div>
                              {kf.addOns && kf.addOns.length > 0 && (
                                <div className="pt-2 border-t border-slate-100">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Included Add-Ons</p>
                                  <ul className="space-y-1">
                                    {kf.addOns.map((ao, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A853] mt-0.5 shrink-0" />
                                        <span>{ao}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4 mb-6">
                              <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Key Features</p>
                              <ul className="space-y-3">
                                {option.features.map((feature, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                    <CheckCircle2 className="w-4 h-4 text-[var(--brand-gold)] mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Optional Enhancements — clickable checkboxes */}
                          {enhancements.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Optional Enhancements</p>
                              <div className="space-y-1">
                                {enhancements.map((enh) => {
                                  const isChecked = optionSelections.has(enh.key);
                                  return (
                                    <label
                                      key={enh.key}
                                      onClick={(e) => { e.stopPropagation(); toggleEnhancement(option.id, enh.key, enh.name, enh.price); }}
                                      className="flex items-center justify-between text-sm cursor-pointer select-none py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                          isChecked ? 'bg-[#D4A853] border-[#D4A853]' : 'border-slate-300 bg-white'
                                        }`}>
                                          {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </div>
                                        <span className={`truncate ${isChecked ? 'text-slate-900 font-semibold' : 'text-slate-600'}`}>{enh.name}</span>
                                      </div>
                                      <span className={`font-bold shrink-0 ml-2 ${isChecked ? 'text-[#D4A853]' : 'text-slate-400'}`}>+${enh.price.toLocaleString()}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* View Details button */}
                          {option.itemizedItems && option.itemizedItems.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewDetailsOption(option); }}
                              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Details
                            </button>
                          )}
                        </div>

                        <div className={`p-6 border-t ${isPreferred ? (isSelected ? 'bg-[#D4A853]' : 'border-[#D4A853]/30 bg-[#D4A853]/5') : (isSelected ? 'bg-slate-900' : 'bg-slate-50')}`}>
                          <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                            isPreferred
                              ? isSelected
                                ? 'bg-white text-[#D4A853]'
                                : 'bg-[#D4A853] text-white'
                              : isSelected
                                ? 'bg-white text-slate-900'
                                : 'bg-white border border-slate-200 text-slate-600'
                          }`}>
                            {isSelected ? 'Option Selected' : 'Select This Option'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* View Details Modal */}
                {viewDetailsOption && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                    onClick={() => setViewDetailsOption(null)}
                  >
                    <div
                      className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Sticky header */}
                      <div className="sticky top-0 bg-white border-b border-slate-100 rounded-t-2xl px-6 py-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{viewDetailsOption.name}</p>
                          <h4 className="text-lg font-black text-slate-900">{viewDetailsOption.title}</h4>
                        </div>
                        <button
                          onClick={() => setViewDetailsOption(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Scrollable itemized list */}
                      <div className="overflow-y-auto px-6 py-4 flex-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Cost Breakdown</p>
                        <ul className="space-y-3">
                          {(viewDetailsOption.itemizedItems || []).map((item) => (
                            <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
                              <span className="text-slate-600">
                                {item.label}
                                {item.quantity ? <span className="text-slate-400 text-xs ml-1">({item.quantity})</span> : null}
                              </span>
                              <span className="font-medium text-slate-900 shrink-0">${item.value.toLocaleString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Total footer */}
                      <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50 rounded-b-2xl">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="text-2xl font-black text-slate-900">${viewDetailsOption.price.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              /* Accepted Option Summary */
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Accepted Build Summary</span>
                        <h3 className="text-3xl font-black text-slate-900">{acceptedSummary?.optionName || acceptedOption?.title}</h3>
                      </div>
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <Award className="w-8 h-8 text-slate-900" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div>
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-slate-900" />
                          Included Features
                        </h4>
                        <ul className="space-y-3">
                          {(acceptedSummary ? acceptedOption?.features : acceptedOption?.features)?.map((f, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-slate-900" />
                          Selected Upgrades
                        </h4>
                        <ul className="space-y-3">
                          {acceptedSummary ? (
                            acceptedSummary.addOns.map((a, i) => (
                              <li key={i} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">{a.name}</span>
                                <span className="font-bold text-slate-900">+${a.price.toLocaleString()}</span>
                              </li>
                            ))
                          ) : acceptedAddOns.length > 0 ? acceptedAddOns.map((a, i) => (
                            <li key={i} className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">{a.name}</span>
                              <span className="font-bold text-slate-900">+${a.price.toLocaleString()}</span>
                            </li>
                          )) : (
                            <li className="text-sm text-slate-400 italic">No upgrades selected</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Contract Value</p>
                        <div className="flex items-baseline gap-3">
                          <p className="text-3xl font-black text-slate-900">${(acceptedSummary?.totalPrice || calculateTotal()).toLocaleString()}</p>
                          <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm">
                            <Wallet size={14} />
                            <span>${calculateMonthlyEstimate(acceptedSummary?.totalPrice || calculateTotal()).toLocaleString()}/mo</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button className="px-6 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          View Contract
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-8 border border-slate-200">
                      <Clock className="w-8 h-8 text-blue-500 mb-4" />
                      <h4 className="font-bold text-lg mb-2">Next Steps</h4>
                      <div className="space-y-3">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {job.soldWorkflowStatus === SoldWorkflowStatus.ACCEPTED && "Our admin team is reviewing your project details to prepare your deposit invoice."}
                          {job.soldWorkflowStatus === SoldWorkflowStatus.AWAITING_DEPOSIT && "Please review and pay the deposit invoice to secure your spot in our production queue."}
                          {job.soldWorkflowStatus === SoldWorkflowStatus.DEPOSIT_RECEIVED && "Deposit received! We are now moving into permit applications and material procurement."}
                          {job.soldWorkflowStatus === SoldWorkflowStatus.READY_FOR_SETUP && "Your project is fully approved and ready for site setup. We'll confirm your start date shortly."}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-3xl p-8 border border-slate-200">
                      <Receipt className="w-8 h-8 text-amber-500 mb-4" />
                      <h4 className="font-bold text-lg mb-2">Payment Summary</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">Deposit Status</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            job.depositStatus === DepositStatus.RECEIVED ? 'bg-green-100 text-green-700' : 
                            job.depositStatus === DepositStatus.REQUESTED ? 'bg-amber-100 text-amber-700' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {getDepositStatusLabel(job.depositStatus)}
                          </span>
                        </div>
                        {job.depositAmount && (
                          <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                            <span className="text-sm text-slate-500">Deposit Amount</span>
                            <span className="font-bold text-slate-900">${job.depositAmount.toLocaleString()}</span>
                          </div>
                        )}
                        {job.depositReceivedDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">Paid On</span>
                            <span className="text-sm font-medium text-slate-900">{new Date(job.depositReceivedDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                    <h4 className="text-xl font-bold mb-6">Your Project Team</h4>
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold">MA</div>
                        <div>
                          <p className="font-bold">Marcus Aurelius</p>
                          <p className="text-xs text-slate-500">Project Manager</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">LD</div>
                        <div>
                          <p className="font-bold">Office Support</p>
                          <p className="text-xs text-slate-500">Permits & Admin</p>
                        </div>
                      </div>
                    </div>
                    <button className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message Team
                    </button>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-6 flex items-center justify-between">
                      Recent Photos
                      <Camera className="w-4 h-4 text-slate-400" />
                    </h4>
                    <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-xs italic">
                      Photos will appear here once site prep begins
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Financing Badge */}
            {!isAccepted && (
              <div 
                
                
                
                className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                    <Wallet className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Flexible Financing Available</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                      <p className="text-blue-700 font-medium max-w-md">
                        Build your dream deck now and pay over time with affordable monthly plans through iFinance Canada.
                      </p>
                      <div className="flex items-center gap-2 bg-blue-600/10 px-3 py-1.5 rounded-xl border border-blue-600/20 w-fit">
                        <Wallet size={14} className="text-blue-600" />
                        <span className="text-sm font-black text-blue-700">
                          ~${calculateMonthlyEstimate(calculateTotal()).toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <a 
                  href="https://apply.ifinancecanada.com/22121" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="relative z-10 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 group/btn"
                >
                  Apply for Financing 
                  <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                </a>
              </div>
            )}

            {/* Comparison Table Section */}
            {!isAccepted && (
              <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-2xl font-bold mb-2">Side-by-Side Comparison</h3>
                  <p className="text-slate-600">A clear look at the technical differences and long-term value of each option.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="p-6 text-xs font-bold uppercase tracking-widest text-slate-400">Feature</th>
                        {estimateData.options.map(opt => (
                          <th key={opt.id} className={`p-6 text-sm font-bold ${selectedOptionId === opt.id ? 'bg-slate-900 text-white' : 'text-slate-900'}`}>
                            {opt.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: 'Annual Maintenance', key: 'maintenance' },
                        { label: 'Expected Longevity', key: 'longevity' },
                        { label: 'Material Warranty', key: 'warranty' },
                        { label: 'Surface Temperature', key: 'heat' }
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6 text-sm font-semibold text-slate-600">{row.label}</td>
                          {estimateData.options.map(opt => (
                            <td key={opt.id} className={`p-6 text-sm font-medium ${selectedOptionId === opt.id ? 'bg-slate-50 font-bold' : 'text-slate-900'}`}>
                              {(opt as unknown as Record<string, Record<string, string>>).specs?.[row.key]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr>
                        <td className="p-6 text-sm font-semibold text-slate-600">Investment</td>
                        {estimateData.options.map(opt => (
                          <td key={opt.id} className={`p-6 ${selectedOptionId === opt.id ? 'bg-slate-50' : ''}`}>
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-slate-900">${opt.price.toLocaleString()}</span>
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                                ~${calculateMonthlyEstimate(opt.price).toLocaleString()}/mo
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* "Enhance Your Outdoor Living" section removed — per-option enhancements inside each card replace it */}

            {/* FAQ & AI Support Section */}
            <section className="mt-20">
              <AIObjectionHelper job={job} />
            </section>

            {/* Trust & Warranty Section */}
            <section className="bg-slate-900 rounded-[2.5rem] p-8 md:p-16 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] -mr-48 -mt-48" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h3 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">Built for Life, <br/><span className="text-blue-400">Guaranteed for Decades.</span></h3>
                  <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                    We don't just build decks; we engineer outdoor living spaces that withstand the elements. Every project is backed by our industry-leading dual-layer protection.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <ShieldCheck className="w-8 h-8 text-blue-400 mb-4" />
                      <h4 className="font-bold text-lg mb-2">Workmanship</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">Up to 10 years of coverage on every structural detail and fastener.</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <Award className="w-8 h-8 text-amber-400 mb-4" />
                      <h4 className="font-bold text-lg mb-2">Materials</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">Manufacturer warranties up to 50 years on fading, staining, and rot.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                    <div className="flex gap-1 mb-4">
                      {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                    </div>
                    <p className="text-lg font-medium italic mb-6 leading-relaxed">
                      "The level of professionalism was unlike any contractor we've ever worked with. The portal kept us updated daily, and the final deck is absolutely flawless."
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold">JD</div>
                      <div>
                        <p className="font-bold">James & Diane R.</p>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">Ottawa, ON</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-8 py-4 opacity-50 grayscale">
                    <div className="text-xl font-black tracking-tighter">TREX SELECT</div>
                    <div className="text-xl font-black tracking-tighter">TIMBERTECH</div>
                    <div className="text-xl font-black tracking-tighter">AZEK</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Objection Handling / FAQ Center */}
            <section className="space-y-12">
              <div className="text-center max-w-2xl mx-auto">
                <h3 className="text-3xl font-black mb-4">The Objection Center</h3>
                <p className="text-slate-600">We know you have choices. Here is why homeowners choose {COMPANY.name} over the competition.</p>
              </div>
 
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    q: "I found a cheaper quote. Why are you more?",
                    a: "We often aren't the cheapest, and that's intentional. Most 'cheap' quotes skip joist tape, use undersized framing, or don't include proper permitting. We build to a standard that prevents rot and structural failure 10 years down the road.",
                    icon: AlertCircle
                  },
                  {
                    q: "What happens after I accept?",
                    a: "Immediately after acceptance, you'll receive your deposit invoice. Once paid, we begin permit applications and material procurement. You'll also get full access to your Project Portal to track every milestone.",
                    icon: ArrowRight
                  },
                  {
                    q: "Why do prices vary so much between options?",
                    a: "The primary driver is material longevity. Pressure treated wood is affordable but requires annual maintenance. Composite and PVC eliminate maintenance and offer 25-50 year warranties, saving you money over time.",
                    icon: Wallet
                  },
                  {
                    q: "How does scheduling work?",
                    a: "We provide a tentative start window upon deposit. As your date approaches, we finalize the schedule. Weather can impact dates, but we communicate every shift in real-time through the portal.",
                    icon: Calendar
                  },
                  {
                    q: "Can I make changes later?",
                    a: "Yes! While it's best to finalize the main structure now, we can handle change orders for lighting, add-ons, or minor details up until construction begins.",
                    icon: Edit2
                  },
                  {
                    q: "Is the warranty actually transferable?",
                    a: "Yes. Our workmanship warranty and most manufacturer material warranties are transferable to the next homeowner, which adds significant resale value to your home.",
                    icon: ShieldCheck
                  }
                ].map((faq, i) => (
                  <div key={i} className="group bg-white p-8 rounded-3xl border border-slate-200 hover:border-slate-900 transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <faq.icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-bold mb-3">{faq.q}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Educational Snippets */}
            <section className="bg-blue-50 rounded-[2.5rem] p-8 md:p-12 border border-blue-100">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="md:w-1/3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                    <Info className="w-3 h-3" /> Expert Advice
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4">Composite vs. PVC: <br/>Which is right for you?</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    While both are low-maintenance, PVC (Elite) stays cooler in direct sunlight and has superior scratch resistance—ideal for pets and high-traffic areas. Composite (Signature) offers the most realistic wood grain at a mid-range price point.
                  </p>
                </div>
                <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-blue-100">
                    <h4 className="font-bold text-slate-900 mb-2">Why Framing Matters</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">A deck is only as good as what's underneath. We use oversized joists and specialized flashing tape to prevent rot and ensure your structure lasts as long as your decking.</p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl shadow-sm border border-blue-100">
                    <h4 className="font-bold text-slate-900 mb-2">The Value of Lighting</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">Integrated LED lighting doesn't just add ambiance; it extends your deck's usability into the evening and significantly increases safety on stairs and transitions.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* What Happens Next */}
            <section className="py-16 bg-slate-50/50 rounded-[2.5rem] px-8 md:px-12 border border-slate-100">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-900 text-[10px] font-bold uppercase tracking-widest mb-4">
                  <Sparkles className="w-3 h-3" />
                  The Road Ahead
                </div>
                <h3 className="text-3xl md:text-4xl font-black mb-4">Your Journey After Acceptance</h3>
                <p className="text-slate-600 max-w-2xl mx-auto">We've refined our process to be as smooth as the finish on our decks. Here is exactly what you can expect once you join the {COMPANY.name} family.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 hidden lg:block -translate-y-1/2 z-0" />
                {estimateData.whatHappensNext?.map((step, i: number) => {
                  const isObject = typeof step === 'object' && step !== null;
                  const title = isObject ? step.title : `Step ${i + 1}`;
                  const desc = isObject ? step.desc : step;
                  const iconName = isObject ? step.icon : 'CheckCircle2';

                  // Map icon names to components
                  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                    'CheckCircle2': CheckCircle2,
                    'ShieldCheck': ShieldCheck,
                    'Calendar': Calendar,
                    'Zap': Zap,
                    'Sparkles': Sparkles,
                    'Award': Award,
                    'Info': Info,
                    'Shield': Shield
                  };
                  const StepIcon = iconMap[iconName] || CheckCircle2;
                  
                  return (
                    <div 
                      key={i} 
                      
                      
                      
                      
                      className="relative z-10 flex flex-col items-center text-center group"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center font-black text-xl text-slate-900 mb-6 group-hover:border-slate-900 group-hover:scale-110 transition-all duration-300 shadow-sm bg-white relative">
                        <StepIcon className="w-6 h-6 text-slate-900" />
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-transparent group-hover:border-slate-100 group-hover:shadow-sm transition-all">
                        <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Our Commitment */}
            <section className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-slate-900" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Our Commitment to You</h3>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  At {COMPANY.name}, we don't just build structures; we build relationships. We promise to respect your property, communicate transparently, and deliver a finished product that exceeds your expectations.
                </p>
                <div className="pt-8 border-t border-slate-100 flex flex-col items-center">
                  <div className="font-serif italic text-3xl text-slate-400 mb-2">The {COMPANY.name} Team</div>
                  <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Quality Without Compromise</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'why-us' && (
          <div className="space-y-24 py-12">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-black mb-6">The {COMPANY.name} Difference</h2>
              <p className="text-xl text-slate-600">We've spent years refining our process to ensure every project is a masterpiece of durability and design.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: 'Master Craftsmanship', desc: 'Our crews are specialized deck builders, not general contractors. We know every nuance of outdoor structures.', icon: Award },
                { title: 'Premium Materials', desc: 'We only source the highest grade lumber and composite materials that meet our strict quality standards.', icon: Shield },
                { title: 'Digital Experience', desc: 'From this estimate to your final walkthrough, our portal keeps you informed and in control.', icon: Zap }
              ].map((item, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                    <item.icon className="w-7 h-7 text-slate-900" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">{item.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Build Standards Section */}
            <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white">
              <div className="max-w-4xl">
                <h3 className="text-3xl font-black mb-12">Our "Invisible" Build Standards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {[
                    { title: 'Joist Tape Protection', desc: 'We apply butyl tape to the top of every joist. This prevents water from sitting between the deck board and the frame, doubling the life of your structure.' },
                    { title: 'Helical Pile Foundations', desc: 'No more concrete frost heaves. We use engineered steel helical piles that go deep into the earth for a foundation that never moves.' },
                    { title: 'Oversized Framing', desc: 'While code allows for 2x8 joists, we default to 2x10 or 2x12 to ensure a rock-solid feel with zero "bounce" when you walk.' },
                    { title: 'Hidden Fastener Systems', desc: 'We believe screws should be invisible. Our systems ensure a clean, barefoot-friendly surface with no exposed screw heads.' }
                  ].map((std, i) => (
                    <div key={i} className="space-y-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                        {i + 1}
                      </div>
                      <h4 className="text-xl font-bold">{std.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{std.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'process' && (
          <div className="space-y-16 py-12">
             <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-black mb-6">Our 5-Step Build Journey</h2>
              <p className="text-xl text-slate-600">A seamless transition from vision to reality, managed with precision at every stage.</p>
            </div>

            <div className="space-y-8">
              {[
                { title: 'Design & Permitting', desc: 'We handle all the paperwork and finalize your 3D design to ensure everything is perfect before we break ground.' },
                { title: 'Material Logistics', desc: 'Materials are ordered and delivered to your site. We perform a quality check on every board that arrives.' },
                { title: 'The Build Phase', desc: 'Our expert crew arrives and transforms your yard. We maintain a clean, safe, and professional job site.' },
                { title: 'Quality Control', desc: 'Your Project Manager performs a 50-point inspection to ensure every detail meets our Luxury standards.' },
                { title: 'Final Walkthrough', desc: 'We walk the project with you, explain maintenance, and hand over your warranty package.' }
              ].map((step, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {i + 1}
                    </div>
                    {i < 4 && <div className="w-0.5 h-full bg-slate-200 my-2" />}
                  </div>
                  <div className="pb-12">
                    <h4 className="text-2xl font-bold mb-2 group-hover:text-slate-900 transition-colors">{step.title}</h4>
                    <p className="text-slate-600 text-lg leading-relaxed max-w-2xl">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Footer for Acceptance */}
      
        {selectedOptionId && !isAccepted && (
          <footer 
            
            
            
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 py-4 px-4 sm:px-6 lg:px-8"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Selected Total</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">${calculateTotal().toLocaleString()}</span>
                    <span className="text-xs text-slate-500 font-medium">inc. tax</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-100" />
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Estimate</p>
                  <div className="flex items-center gap-1.5 text-blue-600 font-bold">
                    <Wallet size={14} />
                    <span>${calculateMonthlyEstimate(calculateTotal()).toLocaleString()}/mo</span>
                  </div>
                </div>
                <div className="hidden md:block h-10 w-px bg-slate-100" />
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Choice</p>
                  <p className="text-sm font-bold text-slate-900">
                    {estimateData.options.find(o => o.id === selectedOptionId)?.name} Option 
                    {selectedAddOns.length > 0 && ` + ${selectedAddOns.length} Add-on${selectedAddOns.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setSelectedOptionId(null)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Change Option
                </button>
                <div className="flex items-center gap-4">
                  <AISalesAssistant job={job} />
                  <div className="relative group/tip">
                    <button
                      disabled
                      className="flex-1 sm:flex-none px-8 py-3 bg-slate-300 text-slate-500 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                    >
                      Accept & Secure Your Spot
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none">
                      Coming Soon — Stripe integration pending
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        )}
      

      {/* Confirmation Modal */}
      
        {showConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
              
              
              
              onClick={() => setShowConfirmation(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <div
              
              
              
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-10 sm:p-16 text-center">
                <div className="w-20 h-20 bg-[var(--brand-gold)]/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-[var(--brand-gold)]" />
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">You're Officially in the Queue!</h2>
                <p className="text-slate-600 text-lg mb-12 max-w-md mx-auto">
                  Congratulations! You've taken the first step toward your dream outdoor space. We've received your acceptance for the <span className="font-bold text-slate-900">{acceptedOption?.title}</span>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Receipt className="w-5 h-5 text-slate-900" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Next Step</p>
                    <p className="text-sm font-bold text-slate-900">Deposit Invoice</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Calendar className="w-5 h-5 text-slate-900" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Timeline</p>
                    <p className="text-sm font-bold text-slate-900">Site Visit Set</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Sparkles className="w-5 h-5 text-slate-900" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-sm font-bold text-slate-900">Project Active</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowConfirmation(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Go to My Project Portal
                </button>
              </div>
            </div>
          </div>
        )}
      

      {/* Floating Support Button */}
      <button className="fixed bottom-24 right-8 w-14 h-14 bg-white border border-slate-200 rounded-full shadow-xl flex items-center justify-center text-slate-900 hover:scale-110 transition-transform z-40">
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
};

export default EstimatePortalView;
