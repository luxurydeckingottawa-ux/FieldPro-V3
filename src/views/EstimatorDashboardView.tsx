import React, { useState } from 'react';
import { Job, PipelineStage } from '../types';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Search, 
  ClipboardList,
  Camera,
  PenTool,
  Plus,
  Phone
} from 'lucide-react';

interface EstimatorDashboardViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onOpenCalendar: () => void;
  onNewEstimate: () => void;
}

const EstimatorDashboardView: React.FC<EstimatorDashboardViewProps> = ({ jobs, onSelectJob, onOpenCalendar, onNewEstimate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  
  const estimatorJobs = jobs.filter(job => {
    const estimateStages = [
      PipelineStage.LEAD_IN,
      PipelineStage.FIRST_CONTACT,
      PipelineStage.SECOND_CONTACT,
      PipelineStage.THIRD_CONTACT,
      PipelineStage.EST_UNSCHEDULED,
      PipelineStage.EST_SCHEDULED,
      PipelineStage.EST_IN_PROGRESS,
      PipelineStage.EST_COMPLETED,
      PipelineStage.EST_SENT,
      // Legacy
      PipelineStage.SITE_VISIT_SCHEDULED,
      PipelineStage.ESTIMATE_IN_PROGRESS,
      PipelineStage.ESTIMATE_SENT,
      PipelineStage.FOLLOW_UP
    ];
    return estimateStages.includes(job.pipelineStage);
  });

  const filteredJobs = estimatorJobs.filter(job => {
    const clientName = job.clientName || '';
    const projectAddress = job.projectAddress || '';
    const jobNumber = job.jobNumber || '';
    
    const matchesSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         projectAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         jobNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'active') {
      return matchesSearch && job.pipelineStage !== PipelineStage.FOLLOW_UP;
    }
    if (filter === 'completed') {
      return matchesSearch && job.pipelineStage === PipelineStage.FOLLOW_UP;
    }
    return matchesSearch;
  });

  const getStageLabel = (stage: PipelineStage) => {
    switch (stage) {
      case PipelineStage.LEAD_IN: return 'New Lead';
      case PipelineStage.SITE_VISIT_SCHEDULED: return 'Site Visit';
      case PipelineStage.ESTIMATE_IN_PROGRESS: return 'Estimating';
      case PipelineStage.ESTIMATE_SENT: return 'Sent';
      case PipelineStage.FOLLOW_UP: return 'Follow Up';
      default: return stage;
    }
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage) {
      case PipelineStage.LEAD_IN: return 'bg-blue-500/10 text-blue-500';
      case PipelineStage.SITE_VISIT_SCHEDULED: return 'bg-purple-500/10 text-purple-500';
      case PipelineStage.ESTIMATE_IN_PROGRESS: return 'bg-amber-500/10 text-amber-500';
      case PipelineStage.ESTIMATE_SENT: return 'bg-emerald-500/10 text-emerald-500';
      case PipelineStage.FOLLOW_UP: return 'bg-rose-500/10 text-rose-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] p-6 border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Estimator Portal</h1>
            <p className="text-[var(--text-secondary)] text-sm">{estimatorJobs.length} active estimate{estimatorJobs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onNewEstimate}
              className="h-12 px-5 bg-emerald-600 text-white rounded-xl flex items-center gap-2 hover:bg-emerald-500 transition-all active:scale-[0.97] font-bold text-sm shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-5 h-5" />
              New Estimate
            </button>
            <button 
              onClick={onOpenCalendar}
              className="w-12 h-12 bg-emerald-600/10 rounded-xl flex items-center justify-center hover:bg-emerald-600/20 transition-all"
              title="View Schedule"
            >
              <Calendar className="text-emerald-600 w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-[var(--text-primary)]"
            />
          </div>

          <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            {(['active', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                  filter === f 
                    ? 'bg-[var(--bg-primary)] text-emerald-600 shadow-sm' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job)}
              className="w-full text-left bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-emerald-600/50 transition-all group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600/10 text-emerald-600 rounded-full uppercase tracking-wider">
                      {job.jobNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStageColor(job.pipelineStage)}`}>
                      {getStageLabel(job.pipelineStage)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors">
                    {job.clientName || 'Unnamed'}
                  </h3>
                </div>
                {job.estimateAmount && job.estimateAmount > 0 && (
                  <span className="text-sm font-bold text-emerald-600">${job.estimateAmount.toLocaleString()}</span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {job.projectAddress && (
                  <div className="flex items-start gap-2 text-[var(--text-secondary)] text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{job.projectAddress}</span>
                  </div>
                )}
                {job.clientPhone && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{job.clientPhone}</span>
                  </div>
                )}
                {job.scheduledDate && (
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{job.scheduledDate}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/10 border-2 border-[var(--bg-primary)] flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600/10 border-2 border-[var(--bg-primary)] flex items-center justify-center">
                    <Camera className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-purple-600/10 border-2 border-[var(--bg-primary)] flex items-center justify-center">
                    <PenTool className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="flex items-center text-emerald-600 font-bold text-sm">
                  Open <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <ClipboardList className="text-emerald-500 w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">No estimates yet</h3>
            <p className="text-[var(--text-secondary)] text-sm max-w-[250px] mb-6">
              Start a new estimate to capture client information and site measurements.
            </p>
            <button 
              onClick={onNewEstimate}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all active:scale-[0.97] shadow-lg shadow-emerald-600/20"
            >
              <Plus className="w-5 h-5" />
              New Estimate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimatorDashboardView;
