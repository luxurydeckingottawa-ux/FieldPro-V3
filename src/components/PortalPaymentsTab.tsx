import React from 'react';
import { Job } from '../types';
import { Receipt, Clock, Wallet, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface PortalPaymentsTabProps {
  job: Job;
}

const PortalPaymentsTab: React.FC<PortalPaymentsTabProps> = ({ job }) => {
  return (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold tracking-tight">Investment Summary</h3>
                <div className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/5 px-3 py-1 rounded-full border border-[var(--brand-gold)]/10">
                  <Receipt size={12} className="inline mr-1" /> Secure Billing
                </div>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border border-[#F0F0F0] shadow-sm">
                {/* Header: Total Contract Value */}
                <div className="p-8 bg-[#1A1A1A] text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-gold)]/5 blur-3xl -mr-32 -mt-32" />
                  <div className="relative z-10">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-2">Total Contract Value</p>
                    <h4 className="text-4xl font-bold tracking-tight">${(job.totalAmount || 0).toLocaleString()}</h4>
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  {/* Payment Schedule: White Background Style */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1A1A1A]">Payment Schedule</h4>
                        <p className="text-[10px] text-[#999] uppercase font-bold tracking-wider">Milestone Progress</p>
                      </div>
                    </div>

                    <div className="relative space-y-10 pl-2">
                      {/* Vertical Progress Line */}
                      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[#F0F0F0]" />
                      
                      {[
                        { label: '30% Deposit', percentage: 0.3, desc: 'Project initialization' },
                        { label: '30% Delivery', percentage: 0.3, desc: 'Material delivery' },
                        { label: '40% Final Payment', percentage: 0.4, desc: 'Project completion' }
                      ].map((milestone, idx, arr) => {
                        const total = job.totalAmount || 0;
                        const paid = job.paidAmount || 0;
                        const cumulativePercentage = arr.slice(0, idx + 1).reduce((sum, m) => sum + m.percentage, 0);
                        const amount = total * milestone.percentage;
                        const isPaid = paid >= (total * cumulativePercentage) - 10;
                        const isNext = !isPaid && (idx === 0 || (paid >= (total * arr.slice(0, idx).reduce((sum, m) => sum + m.percentage, 0)) - 10));

                        return (
                          <div key={idx} className="relative flex items-start gap-6 group">
                            <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                              isPaid 
                                ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] shadow-lg shadow-[var(--brand-gold)]/20' 
                                : isNext 
                                  ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/10' 
                                  : 'bg-white border-[#EEE]'
                            }`}>
                              {isPaid ? (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              ) : isNext ? (
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                              ) : null}
                            </div>
                            
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className={`text-sm font-bold ${isPaid ? 'text-[#1A1A1A]' : isNext ? 'text-blue-600' : 'text-[#999]'}`}>
                                    {milestone.label}
                                  </h5>
                                  {isNext && (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#999] font-medium mt-0.5">{milestone.desc}</p>
                              </div>
                              
                              <div className="text-left sm:text-right">
                                <p className={`text-sm font-black ${isPaid ? 'text-[var(--brand-gold)]' : 'text-[#1A1A1A]'}`}>
                                  ${amount.toLocaleString()}
                                </p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-[#BBB] mt-0.5">
                                  {isPaid ? 'Completed' : 'Upcoming'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-[#F0F0F0]" />

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/5 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-[var(--brand-gold)]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Payments Received</p>
                          <p className="text-[10px] text-[#999] uppercase font-bold tracking-wider">Thank you for your business</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-[var(--brand-gold)]">-${(job.paidAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="h-px bg-[#F0F0F0]" />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Remaining Balance</p>
                          <p className="text-[10px] text-[#999] uppercase font-bold tracking-wider">Due upon completion</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-[#1A1A1A]">${((job.totalAmount || 0) - (job.paidAmount || 0)).toLocaleString()}</p>
                    </div>

                    {/* Financing Option */}
                    <div className="mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                          <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Flexible Financing</h4>
                          <p className="text-[11px] text-blue-700 font-medium">Estimated ~${Math.round((job.totalAmount || 0) * 0.012).toLocaleString()}/mo</p>
                        </div>
                      </div>
                      <a 
                        href="https://apply.ifinancecanada.com/22121" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                      >
                        Apply Now <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#F9F9F9] border-t border-[#F0F0F0]">
                  {(() => {
                    const milestones = [
                      { label: '30% Deposit', percentage: 0.3 },
                      { label: '30% Delivery', percentage: 0.3 },
                      { label: '40% Final Payment', percentage: 0.4 }
                    ];
                    const total = job.totalAmount || 0;
                    const paid = job.paidAmount || 0;
                    const next = milestones.find((m, idx) => {
                      const cumulative = milestones.slice(0, idx + 1).reduce((sum, item) => sum + item.percentage, 0);
                      return paid < (total * cumulative) - 10;
                    });

                    return (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button className="flex-1 py-4 bg-[var(--brand-gold)] text-white rounded-2xl font-bold hover:bg-[var(--brand-gold-dark)] transition-all shadow-lg shadow-[var(--brand-gold)]/20 flex items-center justify-center gap-2">
                          <CreditCard size={18} />
                          <span>{next ? `Pay ${next.label}` : 'Make a Payment'}</span>
                        </button>
                        <button 
                          onClick={() => setShowChat(true)}
                          className="flex-1 py-4 bg-white text-[#1A1A1A] border border-[#F0F0F0] rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          <FileText size={18} className="text-slate-400" />
                          <span>Request Invoice</span>
                        </button>
                      </div>
                    );
                  })()}
                  <p className="text-center text-[10px] text-[#999] mt-4 font-medium uppercase tracking-wider">
                    Secure checkout powered by Stripe
                  </p>
                </div>
              </div>
            </motion.div>

  );
};

export default PortalPaymentsTab;
