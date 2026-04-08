import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';
import { EstimatorAppointment, InstallBlock } from '../types';

interface EstimatorCalendarProps {
  appointments: EstimatorAppointment[];
  installSchedule: InstallBlock[];
}

export const EstimatorCalendar: React.FC<EstimatorCalendarProps> = ({ appointments, installSchedule }) => {
  const [view, setView] = useState<'appointments' | 'install'>('appointments');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Simple calendar logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      <div className="bg-[var(--bg-primary)] p-4 border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[var(--brand-gold)]" />
            Estimator Schedule
          </h2>
          <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setView('appointments')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                view === 'appointments'
                  ? 'bg-[var(--brand-gold)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Estimates
            </button>
            <button
              onClick={() => setView('install')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                view === 'install'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Install Schedule
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg min-w-[140px] text-center">
              {monthName} {currentDate.getFullYear()}
            </h3>
            <button onClick={nextMonth} className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-bold text-[var(--brand-gold)] hover:underline"
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {view === 'appointments' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['S', 'M', 'T', 'W', 'T2', 'F', 'S2'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-[var(--text-secondary)] uppercase py-2">
                  {d.replace(/\d/, '')}
                </div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth();
                return (
                  <div 
                    key={day} 
                    className={`aspect-square flex items-center justify-center text-sm font-medium rounded-lg border border-transparent hover:border-[var(--brand-gold)]/30 transition-all cursor-pointer ${
                      isToday ? 'bg-[var(--brand-gold)] text-white font-bold' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Upcoming Appointments</h4>
            <div className="space-y-3">
              {appointments.length > 0 ? appointments.map((apt) => (
                <div key={apt.id} className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm hover:border-[var(--brand-gold)]/50 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-gold)] transition-colors">{apt.clientName}</h5>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{apt.jobNumber}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      apt.status === 'confirmed' ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)]' : 'bg-amber-600/10 text-amber-600'
                    }`}>
                      {apt.status}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(apt.startTime).toLocaleDateString()} @ {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <MapPin className="w-3.5 h-3.5" />
                      {apt.address}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 bg-[var(--bg-primary)] rounded-2xl border border-dashed border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)]">No upcoming appointments found.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-600/10 mb-6">
              <p className="text-xs text-blue-600 font-medium leading-relaxed">
                <span className="font-bold uppercase tracking-widest block mb-1">Install Visibility</span>
                This view shows the current installation schedule. Use this to coordinate estimate appointments around active job sites or to see when crews are available for new starts.
              </p>
            </div>

            <div className="space-y-6">
              {installSchedule.length > 0 ? installSchedule.map((block) => (
                <div key={block.id} className="relative pl-4 border-l-2 border-blue-600">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                      {new Date(block.startDate).toLocaleDateString()} - {new Date(block.endDate).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                      {block.crewName}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <h5 className="font-bold text-[var(--text-primary)] mb-1">{block.jobName}</h5>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <User className="w-3.5 h-3.5" />
                      Lead: {block.leadName}
                    </div>
                    <div className="mt-3 w-full bg-[var(--bg-secondary)] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full" 
                        style={{ width: `${block.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 bg-[var(--bg-primary)] rounded-2xl border border-dashed border-[var(--border-color)]">
                  <p className="text-sm text-[var(--text-secondary)]">No active installs found.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
