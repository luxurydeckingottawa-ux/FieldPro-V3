import React, { useState } from 'react';
import { Job, CustomerLifecycle, PipelineStage } from '../types';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Search, 
  ClipboardList,
  Camera,
  PenTool,
  Navigation
} from 'lucide-react';
import { motion } from 'motion/react';

interface EstimatorDashboardViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onOpenCalendar: () => void;
}

const EstimatorDashboardView: React.FC<EstimatorDashboardViewProps> = ({ jobs, onSelectJob, onOpenCalendar }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('today');
  
  // Filter jobs that are in the estimation stage or need site visits
  const estimatorJobs = jobs.filter(job => 
    job.lifecycleStage === CustomerLifecycle.ESTIMATE_IN_PROGRESS ||
    job.lifecycleStage === CustomerLifecycle.NEW_LEAD ||
    job.pipelineStage === PipelineStage.SITE_VISIT_SCHEDULED ||
    job.pipelineStage === PipelineStage.ESTIMATE_IN_PROGRESS
  );

  const filteredJobs = estimatorJobs.filter(job => {
    const clientName = job.clientName || '';
    const projectAddress = job.projectAddress || '';
    const jobNumber = job.jobNumber || '';
    
    const matchesSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         projectAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         jobNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'today') {
      // For mock purposes, let's assume jobs with specific IDs are for today
      return matchesSearch && ['j10', 'j8'].includes(job.id);
    }
    if (filter === 'upcoming') {
      return matchesSearch && !['j10', 'j8'].includes(job.id);
    }
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="bg-[var(--bg-primary)] p-6 border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Estimator Portal</h1>
            <p className="text-[var(--text-secondary)] text-sm">Site Intake & Measurements</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onOpenCalendar}
              className="w-12 h-12 bg-emerald-600/10 rounded-xl flex items-center justify-center hover:bg-emerald-600/20 transition-all"
              title="View Schedule"
            >
              <Calendar className="text-emerald-600 w-6 h-6" />
            </button>
            <div className="w-12 h-12 bg-emerald-600/10 rounded-xl flex items-center justify-center">
              <ClipboardList className="text-emerald-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all text-[var(--text-primary)]"
            />
          </div>

          <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            {(['today', 'upcoming', 'all'] as const).map((f) => (
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

      {/* Appointments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <motion.button
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelectJob(job)}
              className="w-full text-left bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-emerald-600/50 transition-all group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600/10 text-emerald-600 rounded-full uppercase tracking-wider">
                      {job.jobNumber}
                    </span>
                    {filter === 'today' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors">
                    {job.clientName}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Clock className="w-4 h-4" />
                    <span>10:30 AM</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2 text-[var(--text-secondary)] text-sm">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{job.projectAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                  <Navigation className="w-4 h-4" />
                  <span>15 mins away</span>
                </div>
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
                  Start Intake <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-4">
              <Calendar className="text-[var(--text-secondary)] w-8 h-8 opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">No appointments found</h3>
            <p className="text-[var(--text-secondary)] text-sm max-w-[200px]">
              Try adjusting your filters or search query.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstimatorDashboardView;
