import React, { useState, useMemo, useCallback } from 'react';
import { Job, ScheduleStatus } from '../types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  AlertCircle,
  ChevronRight as ChevronRightIcon,
  Hammer,
  Truck,
  AlertTriangle,
  Zap,
  CalendarDays,
  ClipboardList,
  MapPin,
  MessageSquare,
  GripVertical
} from 'lucide-react';
import { ForecastReviewStatus, PipelineStage } from '../types';

interface SchedulingCalendarViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onUpdateSchedule: (jobId: string, updates: Partial<Job>) => void;
  onNewAppointment?: (date: string) => void;  // date in YYYY-MM-DD
  onSendMessage?: (phone: string, name: string) => void;
}

const CREW_COLORS: Record<string, string> = {
  'Luxury Crew A': 'bg-[var(--brand-gold)]',
  'Luxury Crew B': 'bg-sky-500',
  'Luxury Crew C': 'bg-indigo-500',
  'Sub: Elite Decking': 'bg-amber-500',
  'Sub: Pro Framers': 'bg-orange-500',
  'default': 'bg-gray-500'
};

const SchedulingCalendarView: React.FC<SchedulingCalendarViewProps> = ({ jobs, onSelectJob, onUpdateSchedule, onNewAppointment, onSendMessage }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCrew, setSelectedCrew] = useState<string>('all');
  const [calendarMode, setCalendarMode] = useState<'crew' | 'appointments'>('crew');
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Appointment jobs (estimate stages with scheduled dates)
  const appointmentJobs = useMemo(() => {
    const estimateStages = [
      PipelineStage.LEAD_IN, PipelineStage.FIRST_CONTACT, PipelineStage.SECOND_CONTACT,
      PipelineStage.THIRD_CONTACT, PipelineStage.EST_UNSCHEDULED, PipelineStage.EST_SCHEDULED,
      PipelineStage.EST_IN_PROGRESS, PipelineStage.EST_COMPLETED, PipelineStage.EST_SENT
    ];
    return jobs.filter(j => {
      if (!estimateStages.includes(j.pipelineStage)) return false;
      if (!j.scheduledDate) return false;
      const d = new Date(j.scheduledDate);
      return d >= calendarStart && d <= calendarEnd;
    });
  }, [jobs, calendarStart, calendarEnd]);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const crews = useMemo(() => {
    const uniqueCrews = new Set(jobs.map(j => j.assignedCrewOrSubcontractor).filter(Boolean));
    return ['all', ...Array.from(uniqueCrews)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesCrew = selectedCrew === 'all' || job.assignedCrewOrSubcontractor === selectedCrew;
      const hasDates = job.plannedStartDate && job.plannedFinishDate;
      if (!hasDates) return false;
      
      const jobStart = parseISO(job.plannedStartDate!);
      const jobEnd = parseISO(job.plannedFinishDate!);
      
      // Check if job overlaps with current calendar view
      const overlaps = isWithinInterval(jobStart, { start: calendarStart, end: calendarEnd }) ||
                       isWithinInterval(jobEnd, { start: calendarStart, end: calendarEnd }) ||
                       (jobStart < calendarStart && jobEnd > calendarEnd);
      
      return matchesCrew && overlaps;
    });
  }, [jobs, selectedCrew, calendarStart, calendarEnd]);

  const getCrewColor = (crewName: string) => {
    return CREW_COLORS[crewName] || CREW_COLORS['default'];
  };

  const getStatusIndicator = (status?: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.ON_SCHEDULE: return 'bg-[var(--brand-gold)]';
      case ScheduleStatus.AHEAD: return 'bg-sky-400';
      case ScheduleStatus.BEHIND: return 'bg-orange-400';
      case ScheduleStatus.DELAYED: return 'bg-rose-400';
      default: return 'bg-gray-400';
    }
  };

  const planningAlerts = useMemo(() => {
    const alerts = [];
    
    // Review Needed
    const reviewNeeded = jobs.filter(j => j.forecastReviewStatus === ForecastReviewStatus.REVIEW_NEEDED);
    if (reviewNeeded.length > 0) {
      alerts.push({
        type: 'review',
        title: 'Schedule Review Needed',
        count: reviewNeeded.length,
        icon: <Clock className="w-4 h-4 text-amber-500" />,
        color: 'border-amber-500/20 bg-amber-500/5'
      });
    }

    // Behind Schedule
    const behind = jobs.filter(j => j.officialScheduleStatus === ScheduleStatus.BEHIND || j.officialScheduleStatus === ScheduleStatus.DELAYED);
    if (behind.length > 0) {
      alerts.push({
        type: 'delay',
        title: 'Behind Schedule',
        count: behind.length,
        icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
        color: 'border-rose-500/20 bg-rose-500/5'
      });
    }

    return alerts;
  }, [jobs]);

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    setDraggedJobId(jobId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', jobId);
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.4';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    setDraggedJobId(null);
    setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!draggedJobId) return;

    const droppedJob = jobs.find(j => j.id === draggedJobId);
    if (!droppedJob) { setDraggedJobId(null); return; }

    if (calendarMode === 'crew') {
      // Crew Planner: move the plannedStartDate to the drop target day.
      // handleUpdateSchedule in App.tsx auto-computes plannedFinishDate from
      // start + duration, so we only need to send plannedStartDate.
      const oldStart = droppedJob.plannedStartDate;
      if (oldStart && format(parseISO(oldStart), 'yyyy-MM-dd') === dateStr) {
        // Dropped on same day, no-op
        setDraggedJobId(null);
        return;
      }
      onUpdateSchedule(draggedJobId, { plannedStartDate: dateStr });
    } else {
      // Appointments: move the scheduledDate to the drop target day,
      // preserving the original time portion if one exists.
      const oldDate = droppedJob.scheduledDate;
      if (oldDate) {
        const oldD = new Date(oldDate);
        if (isSameDay(oldD, parseISO(dateStr))) {
          setDraggedJobId(null);
          return;
        }
        // Preserve time if the original had a time component
        if (oldDate.includes('T')) {
          const timePart = oldDate.split('T')[1];
          onUpdateSchedule(draggedJobId, { scheduledDate: `${dateStr}T${timePart}` });
        } else {
          onUpdateSchedule(draggedJobId, { scheduledDate: dateStr });
        }
      } else {
        onUpdateSchedule(draggedJobId, { scheduledDate: dateStr });
      }
    }
    setDraggedJobId(null);
  }, [draggedJobId, jobs, calendarMode, onUpdateSchedule]);

  return (
    <div className="flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen">
      {/* Header */}
      <div className="p-8 border-b border-[var(--border-color)] bg-[var(--text-primary)]/[0.01]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-1">
                <button
                  onClick={() => setCalendarMode('crew')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    calendarMode === 'crew' ? 'bg-[var(--brand-gold)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Hammer className="w-3.5 h-3.5 inline mr-1.5" /> Crew Planner
                </button>
                <button
                  onClick={() => setCalendarMode('appointments')}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    calendarMode === 'appointments' ? 'bg-[var(--brand-gold)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" /> Appointments
                </button>
              </div>
            </div>
            <p className="font-label mt-2">{calendarMode === 'crew' ? 'Logistics & Resource Distribution' : 'Estimate Appointments & Site Visits'}</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-1.5">
              <button 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2.5 hover:bg-[var(--bg-primary)]/10 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-6 flex items-center justify-center min-w-[180px]">
                <span className="text-sm font-display tracking-[0.2em]">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
              </div>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2.5 hover:bg-[var(--bg-primary)]/10 rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="h-10 w-px bg-[var(--border-color)]" />

            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-[var(--text-secondary)]" />
              <select 
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[var(--brand-gold)]/50 transition-all cursor-pointer"
              >
                {crews.map(crew => (
                  <option key={crew} value={crew} className="bg-[var(--bg-primary)]">{crew === 'all' ? 'All Crews' : crew}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Planning Intelligence & Legend Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[var(--brand-gold)]" />
              <p className="font-label tracking-widest uppercase text-[10px] font-black">Planning Intelligence</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {planningAlerts.map((alert, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${alert.color} flex items-center justify-between group cursor-pointer transition-all hover:scale-[1.02]`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-xl">
                      {alert.icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{alert.title}</p>
                      <p className="text-lg font-black leading-none mt-1">{alert.count} Jobs</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 opacity-20 group-hover:opacity-100 transition-all" />
                </div>
              ))}
              {planningAlerts.length === 0 && (
                <div className="col-span-full p-4 rounded-2xl border border-dashed border-[var(--border-color)] flex items-center justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No critical planning alerts</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="font-label opacity-60 mb-3 uppercase text-[9px] font-black tracking-widest">Crew Assignments</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CREW_COLORS).map(([crew, color]) => (
                  <div key={crew} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{crew === 'default' ? 'Other' : crew}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {calendarMode === 'crew' ? (
      <>
      <div className="flex-1 overflow-auto p-8">
        <div className="min-w-[1000px]">
          {/* Days Header */}
          <div className="grid grid-cols-7 mb-4">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="text-center py-2 font-label opacity-60 tracking-[0.3em]">
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 border-t border-l border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
              const dayStr = format(day, 'yyyy-MM-dd');
              const isDragOver = dragOverDate === dayStr;
              const dayJobs = filteredJobs.filter(job => {
                const start = parseISO(job.plannedStartDate!);
                const end = parseISO(job.plannedFinishDate!);
                return isWithinInterval(day, { start, end });
              });

              return (
                <div
                  key={i}
                  onDragOver={(e) => handleDragOver(e, dayStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dayStr)}
                  className={`min-h-[160px] p-3 border-r border-b border-[var(--border-color)] transition-all ${
                    isCurrentMonth ? 'bg-transparent' : 'bg-[var(--text-primary)]/[0.01] opacity-20'
                  } ${isSameDay(day, new Date()) ? 'bg-[var(--brand-gold)]/[0.02]' : ''} ${
                    isDragOver ? 'bg-[var(--brand-gold)]/[0.08] border-[var(--brand-gold)]/40 ring-2 ring-inset ring-[var(--brand-gold)]/30' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs font-black ${isSameDay(day, new Date()) ? 'text-[var(--brand-gold)]' : 'text-[var(--text-secondary)]'}`}>
                        {format(day, 'd')}
                      </span>
                      {isSameDay(day, new Date()) && (
                        <span className="text-[8px] font-black text-[var(--brand-gold)] uppercase tracking-widest bg-[var(--brand-gold)]/10 px-1.5 py-0.5 rounded">Today</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dayJobs.map(job => {
                      const isStart = isSameDay(day, parseISO(job.plannedStartDate!));
                      const isSub = job.assignedCrewOrSubcontractor?.toLowerCase().includes('sub');
                      const isDragging = draggedJobId === job.id;

                      return (
                        <div
                          key={job.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, job.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectJob(job)}
                          className={`group relative p-2 rounded-xl cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] active:scale-95 ${getCrewColor(job.assignedCrewOrSubcontractor)} text-black shadow-xl border border-black/10 ${
                            isDragging ? 'opacity-40 ring-2 ring-[var(--brand-gold)]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <GripVertical className="w-3 h-3 opacity-30 group-hover:opacity-70 shrink-0 transition-opacity" />
                            <div className="text-[10px] font-black uppercase leading-tight truncate flex-1 flex items-center gap-1.5">
                              {isSub ? <Truck className="w-3 h-3 opacity-70" /> : <Hammer className="w-3 h-3 opacity-70" />}
                              {job.clientName}
                              {job.forecastReviewStatus === ForecastReviewStatus.REVIEW_NEEDED && (
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              )}
                            </div>
                            <div className={`w-2 h-2 rounded-full border border-black/20 ${getStatusIndicator(job.officialScheduleStatus)}`} />
                          </div>
                          
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="text-[8px] font-black opacity-60 truncate uppercase tracking-widest">
                              {job.assignedCrewOrSubcontractor}
                            </div>
                            {isStart && (
                              <div className="text-[8px] font-black bg-black/20 px-1.5 py-0.5 rounded uppercase">
                                Start
                              </div>
                            )}
                          </div>
                          
                          {/* Tooltip-like info on hover */}
                          <div className="absolute bottom-full left-0 mb-3 w-64 card-base p-5 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-all translate-y-2 group-hover:translate-y-0">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-label text-[var(--brand-gold)]">{job.jobNumber}</span>
                              <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getStatusIndicator(job.officialScheduleStatus)} text-black`}>
                                {job.officialScheduleStatus?.replace('_', ' ')}
                              </div>
                            </div>
                            <p className="text-sm font-display mb-4">{job.clientName}</p>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 font-label">
                                <Users className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
                                <span>{job.assignedCrewOrSubcontractor}</span>
                              </div>
                              <div className="flex items-center gap-3 font-label">
                                <Clock className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
                                <span>{job.plannedDurationDays} Days Planned</span>
                              </div>
                              <div className="flex items-center gap-3 font-label">
                                <MapPin className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
                                <span className="truncate">{job.projectAddress}</span>
                              </div>
                            </div>

                            {job.fieldForecast && (
                              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 text-amber-500">
                                    <AlertCircle className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Field Forecast</span>
                                  </div>
                                  {job.forecastReviewStatus === ForecastReviewStatus.REVIEW_NEEDED && (
                                    <span className="text-[8px] font-black bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase tracking-widest">Review Needed</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[var(--text-secondary)] italic">"{job.fieldForecast.note || 'Status update submitted'}"</p>
                                <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-[var(--text-primary)]">
                                  <span>Est. Finish:</span>
                                  <span className="text-amber-500">{job.fieldForecast.status.replace('_', ' ')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled / Pending Jobs Sidebar - crew planner only */}
      <div className="p-8 border-t border-[var(--border-color)] bg-[var(--text-primary)]/[0.01]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-label tracking-[0.3em]">Unscheduled or Pending Review</h3>
          <span className="font-label opacity-60">
            {jobs.filter(j => !j.plannedStartDate || j.fieldForecast).length} Jobs Need Attention
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {jobs.filter(j => !j.plannedStartDate || j.fieldForecast).slice(0, 3).map(job => (
            <div 
              key={job.id}
              onClick={() => onSelectJob(job)}
              className="card-base p-6 flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-label text-[var(--brand-gold)]">{job.jobNumber}</span>
                  {!job.plannedStartDate && (
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded">Unscheduled</span>
                  )}
                </div>
                <p className="text-sm font-display mb-2">{job.clientName}</p>
                {job.fieldForecast && (
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span className="font-label text-amber-500">Field Update Pending</span>
                  </div>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-primary)]/5 flex items-center justify-center group-hover:bg-[var(--brand-gold)] group-hover:text-black transition-all">
                <ChevronRightIcon className="w-5 h-5" />
              </div>
            </div>
          ))}
          {jobs.filter(j => !j.plannedStartDate || j.fieldForecast).length === 0 && (
            <div className="col-span-full text-center py-8 border border-dashed border-[var(--border-color)] rounded-3xl">
              <p className="font-label opacity-60">All schedules up to date</p>
            </div>
          )}
        </div>
      </div>
      </>
      ) : (
        /* Appointments Calendar */
        <div className="flex-1 overflow-auto p-8">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center py-2 font-label opacity-60 tracking-[0.3em]">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-t border-l border-[var(--border-color)] rounded-2xl overflow-hidden shadow-lg">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
                const apptDayStr = format(day, 'yyyy-MM-dd');
                const isApptDragOver = dragOverDate === apptDayStr;
                const dayAppointments = appointmentJobs.filter(j => {
                  if (!j.scheduledDate) return false;
                  return isSameDay(new Date(j.scheduledDate), day);
                });
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={i}
                    onDragOver={(e) => handleDragOver(e, apptDayStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, apptDayStr)}
                    className={`group border-r border-b border-[var(--border-color)] min-h-[110px] p-2 transition-colors ${
                      !isCurrentMonth ? 'bg-[var(--bg-secondary)]/30 opacity-40' : isToday ? 'bg-[var(--brand-gold)]/5' : 'bg-[var(--bg-primary)]'
                    } ${isApptDragOver ? 'bg-[var(--brand-gold)]/[0.08] ring-2 ring-inset ring-[var(--brand-gold)]/30' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isToday ? 'text-[var(--brand-gold)]' : 'text-[var(--text-secondary)]'}`}>{format(day, 'd')}</span>
                      {isToday && <span className="text-[7px] font-bold text-[var(--brand-gold)] uppercase">Today</span>}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.map(appt => {
                        const isApptDragging = draggedJobId === appt.id;
                        return (
                          <div
                            key={appt.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, appt.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onSelectJob(appt)}
                            className={`w-full text-left p-1.5 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-lg hover:bg-[var(--brand-gold)]/20 transition-colors cursor-grab active:cursor-grabbing ${
                              isApptDragging ? 'opacity-40 ring-2 ring-[var(--brand-gold)]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <GripVertical className="w-2.5 h-2.5 opacity-30 hover:opacity-70 shrink-0 transition-opacity" />
                              <p className="text-[10px] font-bold text-[var(--text-primary)] truncate hover:text-[var(--brand-gold)]">{appt.clientName}</p>
                            </div>
                            {appt.scheduledDate && appt.scheduledDate.includes('T') && (
                              <p className="text-[9px] text-[var(--brand-gold)]/70 ml-3.5">
                                {(() => {
                                  const d = new Date(appt.scheduledDate);
                                  const h = d.getHours(); const m = d.getMinutes();
                                  return `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                                })()}
                                {appt.assignedCrewOrSubcontractor ? ` · ${appt.assignedCrewOrSubcontractor.split(' ')[0]}` : ''}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {onNewAppointment && (
                        <button onClick={() => onNewAppointment(format(day, 'yyyy-MM-dd'))}
                          className="w-full mt-1 text-center text-[9px] font-black text-[var(--text-tertiary)] hover:text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/5 rounded py-0.5 transition-colors opacity-0 group-hover:opacity-100">
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Upcoming list */}
            <div className="mt-8">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[var(--brand-gold)]" /> Upcoming Appointments
              </h3>
              <div className="space-y-2">
                {appointmentJobs
                  .filter(j => j.scheduledDate && new Date(j.scheduledDate) >= new Date())
                  .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
                  .map(appt => (
                    <div key={appt.id} className="w-full flex items-center gap-4 p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl hover:border-[var(--brand-gold)]/30 transition-all">
                      <button onClick={() => onSelectJob(appt)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                        <div className="w-12 h-12 rounded-xl bg-[var(--brand-gold)]/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-[var(--brand-gold)] uppercase">{format(new Date(appt.scheduledDate!), 'MMM')}</span>
                          <span className="text-lg font-black text-[var(--text-primary)] leading-none">{format(new Date(appt.scheduledDate!), 'd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{appt.clientName || 'Unnamed'}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">{appt.projectAddress || 'No address'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0">{format(new Date(appt.scheduledDate!), 'EEE, MMM d')}</span>
                      </button>
                      {onSendMessage && appt.clientPhone && (
                        <button onClick={(e) => { e.stopPropagation(); onSendMessage(appt.clientPhone!, appt.clientName || ''); }}
                          className="p-2 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl transition-all shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                      )}
                    </div>
                  ))
                }
                {appointmentJobs.filter(j => j.scheduledDate && new Date(j.scheduledDate) >= new Date()).length === 0 && (
                  <div className="text-center py-8 border border-dashed border-[var(--border-color)] rounded-xl">
                    <CalendarDays className="w-8 h-8 text-[var(--text-secondary)] opacity-20 mx-auto mb-2" />
                    <p className="text-xs text-[var(--text-secondary)]">No upcoming estimate appointments</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingCalendarView;
