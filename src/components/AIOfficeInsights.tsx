import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, History, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Job } from '../types';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';

interface AIOfficeInsightsProps {
  job: Job;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
}

export const AIOfficeInsights: React.FC<AIOfficeInsightsProps> = ({ job, onUpdateJob }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const generateHistorySummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const summary = await geminiService.generateProjectHistorySummary(job);
      onUpdateJob(job.id, {
        aiInsights: {
          ...job.aiInsights,
          projectHistorySummary: summary
        }
      });
    } catch (error) {
      console.error('Failed to generate project history summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [job, onUpdateJob]);

  const summary = job.aiInsights?.projectHistorySummary;

  React.useEffect(() => {
    if (!summary && !isLoading) {
      generateHistorySummary();
    }
  }, [summary, isLoading, generateHistorySummary]);

  return (
    <motion.section 
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">AI Office Insights</h3>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Project Summary</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={generateHistorySummary}
            disabled={isLoading}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-indigo-400 disabled:opacity-50"
            title="Refresh Summary"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden relative z-10"
          >
            {summary ? (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-white/70 leading-relaxed prose prose-invert prose-sm max-w-none">
                  <Markdown>{summary}</Markdown>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <History size={12} className="text-indigo-400" />
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                    AI-Generated from Project Correspondence & Activity
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <button 
                  onClick={generateHistorySummary}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-3 mx-auto group"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all">
                    <Sparkles className="w-5 h-5 text-white/20 group-hover:text-indigo-400" />
                  </div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Generate Project Insights</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
