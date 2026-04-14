import React, { useState, useCallback } from 'react';

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
    <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[1.5rem] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/25">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">AI Office Insights</h3>
            <p className="text-[9px] text-[var(--text-tertiary)] font-medium">Project Summary</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={generateHistorySummary}
            disabled={isLoading}
            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-all text-[var(--text-tertiary)] hover:text-indigo-400 disabled:opacity-50"
            title="Refresh Summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-all text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 py-4">
          {summary ? (
            <div className="space-y-3">
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed prose prose-sm max-w-none [&_p]:text-[var(--text-secondary)] [&_strong]:text-[var(--text-primary)] [&_li]:text-[var(--text-secondary)]">
                <Markdown>{summary}</Markdown>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <History size={10} className="text-indigo-400" />
                <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">
                  AI-Generated from Project Activity
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-[var(--border-color)] rounded-xl">
              <button
                onClick={generateHistorySummary}
                disabled={isLoading}
                className="flex flex-col items-center gap-2 mx-auto group"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-indigo-500/15 transition-all">
                  <Sparkles className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Generate Insights</span>
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
