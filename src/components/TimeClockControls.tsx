import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, AlertCircle, CheckCircle2, LogOut, Navigation, Store, RotateCcw, CheckSquare, ArrowRight } from 'lucide-react';
import { Job, PunchType, TimeEntry, LeaveSiteAction, Role, User } from '../types';
import { timeClockService } from '../services/TimeClockService';
import { GEOFENCE_RADIUS_METERS } from '../constants';

interface TimeClockControlsProps {
  user: User;
  job?: Job;
  allJobs?: Job[];
}

const TimeClockControls: React.FC<TimeClockControlsProps> = ({ user, job, allJobs = [] }) => {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | undefined>(
    timeClockService.getActiveEntry(user.id)
  );
  const [isPunching, setIsPunching] = useState(false);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const [showJobSelection, setShowJobSelection] = useState(false);
  const [distanceFromSite, setDistanceFromSite] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulate geofence monitoring
  useEffect(() => {
    if (!activeEntry || !job || activeEntry.jobId !== job.id) return;

    const interval = setInterval(async () => {
      try {
        const position = await timeClockService.getCurrentPosition();
        const { latitude, longitude } = position.coords;

        if (job.latitude && job.longitude) {
          // Calculate distance (simplified for UI)
          const R = 6371e3;
          const φ1 = latitude * Math.PI / 180;
          const φ2 = job.latitude * Math.PI / 180;
          const Δφ = (job.latitude - latitude) * Math.PI / 180;
          const Δλ = (job.longitude - longitude) * Math.PI / 180;
          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          
          setDistanceFromSite(distance);

          // If they leave the geofence and haven't been prompted yet
          if (distance > GEOFENCE_RADIUS_METERS && !showLeavePrompt) {
            setShowLeavePrompt(true);
          }
        }
      } catch (error) {
        console.error('Error monitoring location:', error);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [activeEntry, job, showLeavePrompt]);

  const handlePunch = async (type: PunchType, selectedJob?: Job | null, note?: string) => {
    setIsPunching(true);
    setError(null);
    try {
      const targetJob = selectedJob !== undefined ? selectedJob : (job || null);
      const entry = await timeClockService.punch(user.id, user.name, targetJob, type, note);
      setActiveEntry(type === PunchType.CHECK_IN ? entry : undefined);
      if (type === PunchType.CHECK_OUT) {
        setShowLeavePrompt(false);
      }
      setShowJobSelection(false);
    } catch (err) {
      setError('Failed to capture location. Please ensure GPS is enabled.');
    } finally {
      setIsPunching(false);
    }
  };

  const handleLeaveAction = async (action: LeaveSiteAction) => {
    if (!job) return;
    await timeClockService.logGeofenceExit(user.id, job.id, action);
    setShowLeavePrompt(false);
    // If they are done for the day, we might want to suggest checking out
    if (action === LeaveSiteAction.DONE_FOR_DAY) {
      // For now just keep the prompt closed, they can manually check out
    }
  };

  const isEmployee = user.role === Role.FIELD_EMPLOYEE || user.role === Role.SUBCONTRACTOR;
  if (!isEmployee) return null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={16} />
          <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${activeEntry ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Time Clock</h3>
              <p className="text-xs text-white/40">
                {activeEntry 
                  ? `${activeEntry.jobNumber === 'GENERAL' ? (activeEntry.note || 'General Work') : activeEntry.jobNumber} • ${new Date(activeEntry.timestamp).toLocaleTimeString()}` 
                  : 'Not checked in'}
              </p>
            </div>
          </div>
          
          {activeEntry && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              distanceFromSite !== null && distanceFromSite <= GEOFENCE_RADIUS_METERS 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              <MapPin size={10} />
              {distanceFromSite !== null && distanceFromSite <= GEOFENCE_RADIUS_METERS ? 'On Site' : 'Off Site'}
            </div>
          )}
        </div>

        {!activeEntry ? (
          <button
            onClick={() => setShowJobSelection(true)}
            disabled={isPunching}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20"
          >
            {isPunching ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} />
                Check In
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => handlePunch(PunchType.CHECK_OUT)}
            disabled={isPunching}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-600/20"
          >
            {isPunching ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <LogOut size={18} />
                Check Out
              </>
            )}
          </button>
        )}

        {activeEntry && activeEntry.isException && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              Your check-in was recorded outside the jobsite geofence. This has been flagged for office review.
            </p>
          </div>
        )}
      </div>

      {/* Job Selection Modal */}
      <AnimatePresence>
        {showJobSelection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[2.5rem] p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Select Activity</h3>
                <button 
                  onClick={() => setShowJobSelection(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <RotateCcw size={20} className="text-white/40" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">Active Jobs</div>
                {allJobs.length > 0 ? (
                  allJobs.map(j => (
                    <button
                      key={j.id}
                      onClick={() => handlePunch(PunchType.CHECK_IN, j)}
                      className="w-full p-4 bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-2xl text-left transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">{j.jobNumber}</span>
                          <span className="block text-sm font-bold text-white uppercase tracking-wider">{j.clientName}</span>
                        </div>
                        <ArrowRight size={16} className="text-white/20 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-white/40 italic py-2">No active jobs found</p>
                )}

                <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-8 mb-4">Other Activities</div>
                <button
                  onClick={() => handlePunch(PunchType.CHECK_IN, null, 'Gathering material and tools')}
                  className="w-full p-4 bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-2xl text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Store size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Gathering Materials/Tools</span>
                  </div>
                </button>
                <button
                  onClick={() => handlePunch(PunchType.CHECK_IN, null, 'Runs')}
                  className="w-full p-4 bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-2xl text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Navigation size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Runs</span>
                  </div>
                </button>
                <button
                  onClick={() => handlePunch(PunchType.CHECK_IN, null, 'Other')}
                  className="w-full p-4 bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-2xl text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Other</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Geofence Reminder Prompt */}
      <AnimatePresence>
        {showLeavePrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-indigo-600 rounded-3xl p-6 shadow-2xl shadow-indigo-600/30 border border-white/20"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-2xl text-white">
                <Navigation size={24} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white leading-tight">Leaving the site?</h4>
                <p className="text-sm text-white/70 mt-1">You're still checked in. What's your next move?</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleLeaveAction(LeaveSiteAction.ANOTHER_JOB)}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition-colors group"
              >
                <Navigation size={18} className="text-white/40 group-hover:text-white mb-2" />
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Another Job</span>
              </button>
              <button
                onClick={() => handleLeaveAction(LeaveSiteAction.SHOP_SUPPLIER)}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition-colors group"
              >
                <Store size={18} className="text-white/40 group-hover:text-white mb-2" />
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Shop / Supplier</span>
              </button>
              <button
                onClick={() => handleLeaveAction(LeaveSiteAction.RETURNING_SHORTLY)}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition-colors group"
              >
                <RotateCcw size={18} className="text-white/40 group-hover:text-white mb-2" />
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Returning</span>
              </button>
              <button
                onClick={() => handleLeaveAction(LeaveSiteAction.DONE_FOR_DAY)}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition-colors group"
              >
                <CheckSquare size={18} className="text-white/40 group-hover:text-white mb-2" />
                <span className="block text-xs font-bold text-white uppercase tracking-wider">Done for Day</span>
              </button>
            </div>
            
            <button 
              onClick={() => setShowLeavePrompt(false)}
              className="w-full mt-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimeClockControls;
