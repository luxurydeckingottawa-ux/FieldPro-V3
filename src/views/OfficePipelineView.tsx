import React, { useState, useMemo } from 'react';
import { Job, PipelineStage } from '../types';
import { PIPELINE_STAGES } from '../constants';
import PipelineCard from '../components/PipelineCard';
import { 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  MoreHorizontal,
  Kanban
} from 'lucide-react';

interface OfficePipelineViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onNewJob: () => void;
}

const OfficePipelineView: React.FC<OfficePipelineViewProps> = ({ jobs, onSelectJob, onNewJob }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => 
      (job.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.jobNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.projectAddress || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm]);

  const totalPipelineValue = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  }, [filteredJobs]);

  const getJobsByStage = (stage: PipelineStage) => {
    return filteredJobs.filter(job => job.pipelineStage === stage);
  };

  const getStageTotal = (stage: PipelineStage) => {
    const preSoldStages = [
      PipelineStage.LEAD_IN,
      PipelineStage.SITE_VISIT_SCHEDULED,
      PipelineStage.ESTIMATE_IN_PROGRESS,
      PipelineStage.ESTIMATE_SENT,
      PipelineStage.FOLLOW_UP
    ];
    
    return getJobsByStage(stage).reduce((sum, job) => {
      const amount = preSoldStages.includes(stage) ? (job.estimateAmount || 0) : (job.totalAmount || 0);
      return sum + amount;
    }, 0);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('pipeline-container');
    if (container) {
      const scrollAmount = 350;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] p-6 flex items-center justify-between shrink-0 bg-gradient-to-b from-[var(--text-primary)]/[0.02] to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[var(--brand-gold)]/10 rounded-xl flex items-center justify-center">
            <Kanban className="w-5 h-5 text-[var(--brand-gold)]" />
          </div>
          <div>
            <h1 className="text-2xl font-display leading-none">Office Pipeline</h1>
            <p className="font-label mt-1">Management & Staging Layer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input 
              type="text"
              placeholder="Search pipeline..."
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--brand-gold)]/50 w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
            <button 
              onClick={() => handleScroll('left')}
              className="p-2 hover:bg-[var(--bg-primary)]/10 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleScroll('right')}
              className="p-2 hover:bg-[var(--bg-primary)]/10 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onNewJob}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-gold)] text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[var(--brand-gold)] transition-all shadow-lg shadow-[var(--brand-gold)]/10"
          >
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div 
        id="pipeline-container"
        className="flex-1 overflow-x-auto overflow-y-hidden p-8 flex gap-8 no-scrollbar"
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
      >
        {PIPELINE_STAGES.map((stage) => {
          const stageJobs = getJobsByStage(stage.id);
          
          return (
            <div key={stage.id} className="flex flex-col w-[320px] shrink-0">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-label tracking-[0.2em]">
                    {stage.label}
                  </h3>
                  <div className="flex flex-col items-end">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--brand-gold)] text-[10px] font-black border border-[var(--border-color)] mb-1">
                      {stageJobs.length}
                    </span>
                    <span className="text-[11px] font-black text-[var(--brand-gold)]/80 tracking-tight">
                      ${getStageTotal(stage.id).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button className="p-1 hover:bg-[var(--bg-secondary)] rounded-md transition-all text-[var(--text-secondary)]">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Column Content */}
              <div className="flex-1 overflow-y-auto space-y-4 pb-12 pr-2 custom-scrollbar">
                {stageJobs.map((job) => (
                  <PipelineCard 
                    key={job.id} 
                    job={job} 
                    onClick={() => onSelectJob(job)} 
                  />
                ))}
                
                {stageJobs.length === 0 && (
                  <div className="border-2 border-dashed border-[var(--border-color)] rounded-2xl p-10 flex flex-col items-center justify-center text-center opacity-40">
                    <p className="font-label">Empty Stage</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Status Bar */}
      <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)] p-4 px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--brand-gold)] shadow-[0_0_8px_rgba(196,164,50,0.5)]" />
            <span className="font-label">Healthy Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span className="font-label">Flagged Issues</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6 font-label">
          <div className="flex items-center gap-2">
            <span className="opacity-60">Pipeline Value</span>
            <span className="text-[var(--text-primary)]">${totalPipelineValue.toLocaleString()}</span>
          </div>
          <div className="w-px h-3 bg-[var(--border-color)]" />
          <div className="flex items-center gap-2">
            <span className="opacity-60">Active Field</span>
            <span className="text-[var(--text-primary)]">{jobs.filter(j => j.pipelineStage === PipelineStage.IN_FIELD).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficePipelineView;
