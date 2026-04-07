import React, { useState, useMemo } from 'react';
import { Job, PipelineStage } from '../types';
import { PIPELINE_STAGES } from '../constants';
import { getJobIssues } from '../utils/issueLogic';
import { 
  Search, Plus, ChevronRight, AlertTriangle,
  MapPin, User, DollarSign, Calendar, FileText, 
  CircleDot, Phone, Mail, LayoutGrid, List
} from 'lucide-react';

interface UnifiedPipelineViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onNewJob: () => void;
  onOpenEstimator: () => void;
}

const LEAD_STAGES = [
  { id: PipelineStage.LEAD_IN, label: 'New Leads', icon: CircleDot },
  { id: PipelineStage.SITE_VISIT_SCHEDULED, label: 'Site Visit', icon: MapPin },
  { id: PipelineStage.ESTIMATE_IN_PROGRESS, label: 'Estimating', icon: FileText },
  { id: PipelineStage.ESTIMATE_SENT, label: 'Estimate Sent', icon: Mail },
  { id: PipelineStage.FOLLOW_UP, label: 'Follow Up', icon: Phone },
];

const JOB_STAGES = PIPELINE_STAGES;
type ViewMode = 'cards' | 'list';

const UnifiedPipelineView: React.FC<UnifiedPipelineViewProps> = ({ jobs, onSelectJob, onNewJob, onOpenEstimator }) => {
  const [activeStage, setActiveStage] = useState<PipelineStage>(PipelineStage.LEAD_IN);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => job.pipelineStage === activeStage)
      .filter(job => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          (job.clientName || '').toLowerCase().includes(term) ||
          (job.jobNumber || '').toLowerCase().includes(term) ||
          (job.projectAddress || '').toLowerCase().includes(term)
        );
      });
  }, [jobs, activeStage, searchTerm]);

  const getStageCount = (stageId: PipelineStage) => jobs.filter(j => j.pipelineStage === stageId).length;

  const getStageValue = (stageId: PipelineStage) => {
    return jobs.filter(j => j.pipelineStage === stageId).reduce((sum, j) => sum + (j.totalAmount || j.estimateAmount || 0), 0);
  };

  const totalLeads = LEAD_STAGES.reduce((sum, s) => sum + getStageCount(s.id), 0);
  const totalJobs = JOB_STAGES.reduce((sum, s) => sum + getStageCount(s.id), 0);
  const totalPipelineValue = jobs.reduce((sum, j) => sum + (j.totalAmount || j.estimateAmount || 0), 0);
  const isLeadStage = LEAD_STAGES.some(s => s.id === activeStage);

  const getActiveStageLabel = () => {
    const s = [...LEAD_STAGES, ...JOB_STAGES.map(js => ({ ...js, icon: CircleDot }))].find(s => s.id === activeStage);
    return s?.label || '';
  };

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${n.toLocaleString()}`;

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col shrink-0">
        <div className="p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Pipeline</h2>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">{fmt(totalPipelineValue)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onNewJob} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-emerald-500 transition-all active:scale-[0.97]">
              <Plus className="w-3.5 h-3.5" /> New Job
            </button>
            <button onClick={onOpenEstimator} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg text-[11px] font-bold uppercase tracking-wider hover:border-emerald-500/50 transition-all active:scale-[0.97]">
              <DollarSign className="w-3.5 h-3.5" /> Estimate
            </button>
          </div>
        </div>

        {/* Leads Section */}
        <div className="px-3 pt-4 pb-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Leads & Estimates</span>
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">{totalLeads}</span>
          </div>
          {LEAD_STAGES.map(stage => {
            const count = getStageCount(stage.id);
            const isActive = activeStage === stage.id;
            const Icon = stage.icon;
            return (
              <button key={stage.id} onClick={() => setActiveStage(stage.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 group ${isActive ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50 hover:text-[var(--text-primary)] border border-transparent'}`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-500' : 'opacity-40 group-hover:opacity-70'}`} />
                <span className="text-[12px] font-semibold flex-1 truncate">{stage.label}</span>
                {count > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="mx-5 my-2 border-t border-[var(--border-color)]" />

        {/* Jobs Section */}
        <div className="px-3 pb-1 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Active Jobs</span>
            <span className="text-[10px] font-bold text-[var(--text-secondary)]">{totalJobs}</span>
          </div>
          {JOB_STAGES.map(stage => {
            const count = getStageCount(stage.id);
            const isActive = activeStage === stage.id;
            const value = getStageValue(stage.id);
            return (
              <button key={stage.id} onClick={() => setActiveStage(stage.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 group ${isActive ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]/50 hover:text-[var(--text-primary)] border border-transparent'}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-[var(--text-secondary)]/20 group-hover:bg-[var(--text-secondary)]/40'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold truncate block">{stage.label}</span>
                  {value > 0 && <span className={`text-[9px] font-bold ${isActive ? 'text-emerald-500/70' : 'text-[var(--text-secondary)]/50'}`}>{fmt(value)}</span>}
                </div>
                {count > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center ${isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/30">
          <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            <span>{jobs.length} Total</span>
            <span>{fmt(totalPipelineValue)}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">{getActiveStageLabel()}</h1>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'item' : 'items'}
              {getStageValue(activeStage) > 0 && ` / ${fmt(getStageValue(activeStage))}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input type="text" placeholder="Search..." className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 w-56 transition-all text-[var(--text-primary)]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-color)]">
              <button onClick={() => setViewMode('cards')} className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}><LayoutGrid className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4 border border-[var(--border-color)]">
                <FileText className="w-7 h-7 text-[var(--text-secondary)] opacity-30" />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] mb-1">No items in {getActiveStageLabel()}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-6 max-w-xs">
                {isLeadStage ? 'Create a new job or lead to get started.' : 'Jobs appear here as they advance through the pipeline.'}
              </p>
              {isLeadStage && (
                <button onClick={onNewJob} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-all">
                  <Plus className="w-4 h-4" /> Add {activeStage === PipelineStage.LEAD_IN ? 'Lead' : 'Job'}
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredJobs.map(job => <JobCard key={job.id} job={job} onClick={() => onSelectJob(job)} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredJobs.map(job => <JobListRow key={job.id} job={job} onClick={() => onSelectJob(job)} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JobCard: React.FC<{ job: Job; onClick: () => void }> = ({ job, onClick }) => {
  const issues = getJobIssues(job);
  const hasWarnings = issues.some(i => i.type === 'error' || i.type === 'warning');
  const amount = job.totalAmount || job.estimateAmount || 0;
  const cl = job.officeChecklists?.find(c => c.stage === job.pipelineStage);
  const total = cl?.items?.length || 0;
  const done = cl?.items?.filter(i => i.completed || i.isNA).length || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button onClick={onClick} className="w-full text-left bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-5 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group active:scale-[0.99]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">{job.jobNumber}</p>
          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{job.clientName || 'Unnamed'}</h3>
        </div>
        {hasWarnings && <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 ml-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></div>}
      </div>
      {job.projectAddress && <div className="flex items-center gap-2 mb-3"><MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 opacity-40" /><p className="text-xs text-[var(--text-secondary)] truncate">{job.projectAddress}</p></div>}
      <div className="flex items-center gap-4 mb-4">
        {amount > 0 && <div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3 text-emerald-500 opacity-60" /><span className="text-xs font-bold text-[var(--text-primary)]">${amount.toLocaleString()}</span></div>}
        {job.scheduledDate && <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-[var(--text-secondary)] opacity-40" /><span className="text-xs text-[var(--text-secondary)]">{job.scheduledDate}</span></div>}
        {job.assignedCrewOrSubcontractor && <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-[var(--text-secondary)] opacity-40" /><span className="text-xs text-[var(--text-secondary)] truncate">{job.assignedCrewOrSubcontractor}</span></div>}
      </div>
      {issues.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{issues.slice(0, 2).map((issue, i) => <span key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${issue.type === 'error' ? 'bg-rose-500/10 text-rose-500' : issue.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>{issue.label}</span>)}</div>}
      {total > 0 && <div className="pt-3 border-t border-[var(--border-color)]"><div className="flex items-center justify-between mb-1.5"><span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Stage Progress</span><span className="text-[10px] font-bold text-[var(--text-secondary)]">{done}/{total}</span></div><div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-emerald-500/60'}`} style={{ width: `${pct}%` }} /></div></div>}
    </button>
  );
};

const JobListRow: React.FC<{ job: Job; onClick: () => void }> = ({ job, onClick }) => {
  const issues = getJobIssues(job);
  const hasWarnings = issues.some(i => i.type === 'error' || i.type === 'warning');
  const amount = job.totalAmount || job.estimateAmount || 0;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] px-5 py-3.5 hover:border-emerald-500/30 transition-all group text-left">
      {hasWarnings && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">{job.clientName || 'Unnamed'}</span>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest shrink-0">{job.jobNumber}</span>
        </div>
        {job.projectAddress && <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{job.projectAddress}</p>}
      </div>
      {amount > 0 && <span className="text-sm font-bold text-[var(--text-primary)] shrink-0">${amount.toLocaleString()}</span>}
      {issues.length > 0 && <div className="flex gap-1 shrink-0">{issues.slice(0, 2).map((issue, i) => <span key={i} className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${issue.type === 'error' ? 'bg-rose-500/10 text-rose-500' : issue.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>{issue.label}</span>)}</div>}
      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
};

export default UnifiedPipelineView;
