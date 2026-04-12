import React, { useState, useMemo } from 'react';

import { Clock, MapPin, AlertCircle, CheckCircle2, Search, Calendar, User as UserIcon, Navigation, Store, RotateCcw, CheckSquare, LogOut } from 'lucide-react';
import { PunchType, LeaveSiteAction } from '../types';
import { timeClockService } from '../services/TimeClockService';
import { GEOFENCE_RADIUS_METERS } from '../constants';

interface TimeAttendanceViewProps {
  jobs: Job[];
}

const TimeAttendanceView: React.FC<TimeAttendanceViewProps> = ({ jobs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'exceptions' | 'active' | 'summary'>('all');
  
  const entries = useMemo(() => timeClockService.getTimeEntries(), []);
  const reminders = useMemo(() => timeClockService.getReminders(), []);

  const jobSummaries = useMemo(() => {
    return jobs.map(job => ({
      ...job,
      summary: timeClockService.getLabourSummary(job.id)
    })).filter(j => j.summary.totalHours > 0);
  }, [jobs]);

  const filteredEntries = useMemo(() => {
    let result = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.userName.toLowerCase().includes(term) || 
        e.jobNumber.toLowerCase().includes(term)
      );
    }

    if (filter === 'exceptions') {
      result = result.filter(e => e.isException);
    } else if (filter === 'active') {
      // This is a bit complex with flat entries, but we can find entries without a corresponding checkout
      const checkIns = result.filter(e => e.type === PunchType.CHECK_IN);
      const checkOuts = result.filter(e => e.type === PunchType.CHECK_OUT);
      
      return checkIns.filter(ci => {
        const hasCheckOut = checkOuts.some(co => co.userId === ci.userId && co.jobId === ci.jobId && new Date(co.timestamp) > new Date(ci.timestamp));
        return !hasCheckOut;
      });
    }

    return result;
  }, [entries, searchTerm, filter]);

  const getActionIcon = (action?: LeaveSiteAction) => {
    switch (action) {
      case LeaveSiteAction.ANOTHER_JOB: return <Navigation size={14} />;
      case LeaveSiteAction.SHOP_SUPPLIER: return <Store size={14} />;
      case LeaveSiteAction.RETURNING_SHORTLY: return <RotateCcw size={14} />;
      case LeaveSiteAction.DONE_FOR_DAY: return <CheckSquare size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const getActionLabel = (action?: LeaveSiteAction) => {
    switch (action) {
      case LeaveSiteAction.ANOTHER_JOB: return 'Another Job';
      case LeaveSiteAction.SHOP_SUPPLIER: return 'Shop / Supplier';
      case LeaveSiteAction.RETURNING_SHORTLY: return 'Returning Shortly';
      case LeaveSiteAction.DONE_FOR_DAY: return 'Done for Day';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base p-6 bg-[var(--brand-gold)]/5 border-[var(--brand-gold)]/10">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-[var(--brand-gold)]" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-gold)]/60">Total Entries</span>
          </div>
          <p className="text-3xl font-black italic uppercase italic leading-none">{entries.length}</p>
        </div>
        <div className="card-base p-6 bg-amber-500/5 border-amber-500/10">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-amber-500" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Exceptions</span>
          </div>
          <p className="text-3xl font-black italic uppercase italic leading-none">{entries.filter(e => e.isException).length}</p>
        </div>
        <div className="card-base p-6 bg-indigo-500/5 border-indigo-500/10">
          <div className="flex items-center gap-3 mb-2">
            <Navigation className="text-indigo-500" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60">Site Exit Events</span>
          </div>
          <p className="text-3xl font-black italic uppercase italic leading-none">{reminders.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input
            type="text"
            placeholder="Search employee or job..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[var(--brand-gold)]/50 transition-colors"
          />
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('exceptions')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'exceptions' ? 'bg-amber-500/20 text-amber-400 shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            Exceptions
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-[var(--brand-gold)]/20 text-[var(--brand-gold-light)] shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('summary')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'summary' ? 'bg-blue-500/20 text-blue-400 shadow-lg' : 'text-white/40 hover:text-white/60'}`}
          >
            Labour Summary
          </button>
        </div>
      </div>

      {filter === 'summary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {jobSummaries.map(job => (
            <div
              key={job.id}
              
              
              className="card-base p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-2 py-0.5 rounded border border-[var(--brand-gold)]/20">
                  {job.jobNumber}
                </span>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  {job.projectType}
                </span>
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight italic truncate">
                {job.clientName}
              </h4>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Total Hours</p>
                  <p className="text-xl font-black text-white italic">{job.summary.totalHours}h</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Estimated Cost</p>
                  <p className="text-xl font-black text-[var(--brand-gold)] italic">${job.summary.estimatedCost.toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Budget Utilization</span>
                  <span className="text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-widest">
                    {Math.round((job.summary.estimatedCost / (job.totalAmount || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--brand-gold)] shadow-[0_0_10px_rgba(196,164,50,0.5)]"
                    style={{ width: `${Math.min(100, (job.summary.estimatedCost / (job.totalAmount || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {jobSummaries.length === 0 && (
            <div className="col-span-full py-20 text-center card-base border-dashed">
              <Clock size={40} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm text-white/40 font-bold uppercase tracking-widest">No labour data recorded yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Entries List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 px-2">Recent Punches</h3>
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              
              
              className="card-base p-5 flex items-center justify-between group hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-5">
                <div className={`p-3 rounded-2xl ${entry.type === PunchType.CHECK_IN ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]' : 'bg-amber-500/10 text-amber-500'}`}>
                  {entry.type === PunchType.CHECK_IN ? <CheckCircle2 size={20} /> : <LogOut size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-bold text-white">{entry.userName}</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{entry.jobNumber}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-white/40">
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(entry.timestamp).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${entry.location.inBounds ? 'text-[var(--brand-gold)]/60' : 'text-amber-500'}`}>
                    {entry.location.inBounds ? 'In Bounds' : 'Out of Bounds'}
                  </div>
                  <div className="text-[9px] font-bold text-white/20">
                    {entry.location.distanceFromSite ? `${Math.round(entry.location.distanceFromSite)}m from site` : 'No GPS data'}
                  </div>
                </div>
                <div className={`p-2 rounded-lg border transition-colors ${entry.isException ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/10 text-white/20'}`}>
                  <MapPin size={14} />
                </div>
              </div>
            </div>
          ))}
          {filteredEntries.length === 0 && (
            <div className="py-20 text-center card-base border-dashed">
              <Clock size={40} className="mx-auto text-white/10 mb-4" />
              <p className="text-sm text-white/40 font-bold uppercase tracking-widest">No entries found</p>
            </div>
          )}
        </div>

        {/* Site Exit Events */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 px-2">Geofence Reminders</h3>
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                
                
                className="card-base p-4 border-indigo-500/10 bg-indigo-500/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                      {getActionIcon(reminder.actionTaken)}
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      {getActionLabel(reminder.actionTaken)}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-white/20">
                    {new Date(reminder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserIcon size={12} className="text-white/20" />
                    <span className="text-[11px] font-bold text-white/60">
                      {entries.find(e => e.userId === reminder.userId)?.userName || 'Employee'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                    <Navigation size={10} /> Exit Event
                  </div>
                </div>
              </div>
            ))}
            {reminders.length === 0 && (
              <div className="py-12 text-center card-base border-dashed border-indigo-500/10 bg-indigo-500/5">
                <Navigation size={24} className="mx-auto text-indigo-500/20 mb-3" />
                <p className="text-[10px] text-indigo-500/40 font-bold uppercase tracking-widest leading-relaxed px-4">
                  No geofence exit events recorded today
                </p>
              </div>
            )}
          </div>

          {/* Exception Summary */}
          <div className="mt-10 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-amber-500" size={18} />
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Exception Guide</h4>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-[10px] text-amber-200/50 leading-relaxed">
                  <strong className="text-amber-200/80">Out of Bounds:</strong> Punch occurred more than {GEOFENCE_RADIUS_METERS}m from jobsite.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-[10px] text-amber-200/50 leading-relaxed">
                  <strong className="text-amber-200/80">Missing Checkout:</strong> Employee checked in but no checkout recorded by end of day.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <p className="text-[10px] text-amber-200/50 leading-relaxed">
                  <strong className="text-amber-200/80">Exit without Checkout:</strong> Geofence exit detected while still checked in.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default TimeAttendanceView;
