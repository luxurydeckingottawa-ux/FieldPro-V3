import React from 'react';
import { Job, User, Role, JobStatus, PipelineStage } from '../types';
import { MapPin, Calendar, ClipboardCheck, Clock, AlertTriangle, BookOpen, ArrowRight } from 'lucide-react';
import TimeClockControls from '../components/TimeClockControls';

interface JobsListViewProps {
  user: User;
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onViewResources: () => void;
}

const JobsListView: React.FC<JobsListViewProps> = ({ user, jobs, onSelectJob, onViewResources }) => {
  const isAdminOrManager = user.role === Role.ADMIN;
  const isEmployee = user.role === Role.FIELD_EMPLOYEE || user.role === Role.SUBCONTRACTOR;
  
  const filteredJobs = isAdminOrManager 
    ? jobs 
    : jobs.filter(job => 
        (job.assignedUsers || []).includes(user.id) && 
        [PipelineStage.READY_TO_START, PipelineStage.IN_FIELD, PipelineStage.COMPLETION].includes(job.pipelineStage)
      );

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.SCHEDULED: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case JobStatus.IN_PROGRESS: return 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] dark:text-[var(--brand-gold-light)] border border-[var(--brand-gold)]/20';
      case JobStatus.QC_PENDING: return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case JobStatus.COMPLETED: return 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border border-[var(--border-color)]';
      default: return 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)] border border-[var(--border-color)]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 pb-32 transition-colors duration-300">
      <header className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--brand-gold)] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em]">Live Operations</span>
          </div>
          {isEmployee && (
            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] bg-[var(--text-primary)]/5 px-3 py-1 rounded-full border border-[var(--border-color)]">
              Employee Portal
            </span>
          )}
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-none text-[var(--text-primary)] italic">
          {isAdminOrManager ? 'Pipeline Overview' : 'Assigned Jobs'}
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em] bg-[var(--text-primary)]/5 px-3 py-1 rounded-full border border-[var(--border-color)]">
            {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} in queue
          </p>
        </div>
      </header>

      {/* Global Time Clock for Employees */}
      {isEmployee && (
        <div className="mb-12">
          <TimeClockControls user={user} allJobs={jobs} />
        </div>
      )}

      {/* Field Resources Quick Access */}
      <button 
        onClick={onViewResources}
        className="w-full mb-12 bg-[var(--brand-gold)] rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(5,150,105,0.2)] flex items-center justify-between group hover:bg-[var(--brand-gold)] transition-all active:scale-[0.98] border border-white/10"
      >
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner backdrop-blur-sm">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight leading-none mb-2">Field Resources Hub</h2>
            <p className="text-[var(--brand-gold)]/10 text-[10px] font-black uppercase tracking-[0.2em] opacity-70">SOPs • Build Standards • Handbooks</p>
          </div>
        </div>
        <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all border border-white/10">
          <ArrowRight className="text-white w-6 h-6 group-hover:translate-x-1 transition-all" />
        </div>
      </button>

      <div className="space-y-6">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onSelectJob(job)}
              className="w-full text-left bg-[var(--card-bg)] rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-[var(--card-border)] hover:border-[var(--brand-gold)]/30 transition-all active:scale-[0.98] group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand-gold)]/5 blur-[100px] -mr-48 -mt-48 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8 relative z-10">
                <div className="space-y-6 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-3 py-1 rounded-lg border border-[var(--brand-gold)]/20">
                      {job.jobNumber}
                    </span>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(job.status)}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] uppercase tracking-tight group-hover:text-[var(--brand-gold)] transition-colors leading-none italic">
                      {job.clientName}
                    </h3>
                    <div className="flex items-center gap-2 mt-3 text-[var(--muted-text)]">
                      <MapPin size={14} className="text-[var(--brand-gold)]" />
                      <span className="text-xs font-bold uppercase tracking-wider truncate max-w-[300px]">
                        {job.projectAddress}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                      <Calendar size={14} className="text-[var(--brand-gold)]" />
                      <span>{job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                      <ClipboardCheck size={14} className="text-[var(--brand-gold)]" />
                      <span>Stage {job.currentStage}/5</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end justify-between gap-6 sm:min-w-[160px]">
                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[9px] font-black text-[var(--muted-text)] uppercase tracking-[0.2em] mb-2">Progress</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 bg-[var(--bg-primary)]/10 rounded-full overflow-hidden border border-[var(--card-border)]">
                        <div 
                          style={{ width: `${(job.currentStage / 5) * 100}%` }}
                          className="h-full bg-[var(--brand-gold)] shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        />
                      </div>
                      <span className="text-xs font-black text-[var(--text-primary)] italic">
                        {Math.round((job.currentStage / 5) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto">
                    <div className="flex items-center justify-center gap-3 px-8 py-4 bg-[var(--brand-gold)] text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] group-hover:bg-[var(--brand-gold)] transition-all shadow-xl shadow-[var(--brand-gold)]/10 active:scale-95">
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      <span>View Job</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Overlay */}
              <div className="mt-8 pt-8 border-t border-[var(--card-border)] flex items-center gap-8 relative z-10">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-[var(--muted-text)] uppercase tracking-widest">
                    {(job.files || []).length} Files
                  </span>
                </div>
                {(job.flaggedIssues || []).length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-500" />
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                      {job.flaggedIssues.length} Issues
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-32 bg-[var(--text-primary)]/5 rounded-[3rem] border border-dashed border-[var(--border-color)]">
            <div className="w-16 h-16 bg-[var(--text-primary)]/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardCheck className="w-8 h-8 text-[var(--text-secondary)]" />
            </div>
            <p className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">No jobs assigned in queue</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobsListView;
