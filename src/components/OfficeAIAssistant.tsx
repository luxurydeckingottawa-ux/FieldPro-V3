import React, { useState } from 'react';

import { Sparkles, MessageSquare, Send, ArrowRight, TrendingUp, AlertCircle, CheckCircle2, Copy, RefreshCw, Check } from 'lucide-react';
import { Job } from '../types';
import { geminiService } from '../services/geminiService';

interface OfficeAIAssistantProps {
  job: Job;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
}

export const OfficeAIAssistant: React.FC<OfficeAIAssistantProps> = ({ job, onUpdateJob }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'followup' | 'next-action'>('summary');
  const [copied, setCopied] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    try {
      const [staleSummary, activitySummary, nextAction] = await Promise.all([
        geminiService.generateStaleLeadSummary(job),
        geminiService.generateActivitySummary(job),
        geminiService.generateNextActionRecommendation(job)
      ]);

      onUpdateJob(job.id, {
        aiInsights: {
          ...job.aiInsights,
          staleLeadSummary: staleSummary,
          activitySummary: activitySummary,
          nextActionRecommendation: nextAction
        }
      });
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFollowUp = async () => {
    setIsLoading(true);
    try {
      const draft = await geminiService.generateFollowUpDraft(job);
      onUpdateJob(job.id, {
        aiInsights: {
          ...job.aiInsights,
          lastFollowUpDraft: draft
        }
      });
    } catch (error) {
      console.error('Failed to generate follow-up draft:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insights = job.aiInsights;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">AI Sales Assistant</h3>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Office Copilot</p>
          </div>
        </div>
        <button 
          onClick={generateInsights}
          disabled={isLoading}
          className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-400 hover:text-indigo-600 disabled:opacity-50"
          title="Refresh AI Insights"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'summary' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Insights
        </button>
        <button 
          onClick={() => setActiveTab('followup')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'followup' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Follow-up
        </button>
        <button 
          onClick={() => setActiveTab('next-action')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'next-action' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Next Step
        </button>
      </div>

      <div className="p-6 min-h-[240px]">
        
          {activeTab === 'summary' && (
            <div 
              key="summary"
              
              
              
              className="space-y-6"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-[var(--brand-gold)]" />
                  Portal Engagement
                </div>
                {insights?.activitySummary ? (
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                    "{insights.activitySummary}"
                  </p>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <button onClick={generateInsights} className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">Generate Activity Summary</button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold mb-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Lead Health
                </div>
                {insights?.staleLeadSummary ? (
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                    "{insights.staleLeadSummary}"
                  </p>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <button onClick={generateInsights} className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">Analyze Lead Health</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'followup' && (
            <div 
              key="followup"
              
              
              
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  Follow-up Draft
                </div>
                {insights?.lastFollowUpDraft && (
                  <button 
                    onClick={() => copyToClipboard(insights.lastFollowUpDraft!)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-2 py-1 rounded-md transition-all"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy Draft'}
                  </button>
                )}
              </div>

              {insights?.lastFollowUpDraft ? (
                <div className="relative group">
                  <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap italic">
                    {insights.lastFollowUpDraft}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <button 
                    onClick={generateFollowUp} 
                    disabled={isLoading}
                    className="flex flex-col items-center gap-3 mx-auto group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-all">
                      <Send className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Generate Draft Message</span>
                  </button>
                </div>
              )}
              
              <p className="text-[10px] text-slate-400 italic text-center px-4">
                "AI drafts help you start faster. Always review and personalize before sending."
              </p>
            </div>
          )}

          {activeTab === 'next-action' && (
            <div 
              key="next-action"
              
              
              
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-violet-500" />
                Recommended Next Step
              </div>

              {insights?.nextActionRecommendation ? (
                <div className="space-y-4">
                  <div className="p-6 bg-violet-50 rounded-2xl border border-violet-100">
                    <p className="text-lg font-bold text-violet-900 mb-2">{insights.nextActionRecommendation.action}</p>
                    <p className="text-sm text-violet-700 leading-relaxed italic">
                      {insights.nextActionRecommendation.reasoning}
                    </p>
                  </div>
                  
                  <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    Take Action
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <button onClick={generateInsights} className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">Get AI Recommendation</button>
                </div>
              )}
            </div>
          )}
        
      </div>
    </div>
  );
};
