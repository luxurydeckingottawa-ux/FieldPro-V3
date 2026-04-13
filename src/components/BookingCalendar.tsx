import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Job } from '../types';
import { BookingConfig, getAvailableTimeSlots } from '../utils/bookingConfig';

interface BookingCalendarProps {
  config: BookingConfig;
  existingJobs: Job[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ config, existingJobs, selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDaySelectable = (day: Date): boolean => {
    if (day.getMonth() !== currentMonth.getMonth()) return false;
    if (day < today) return false;
    const dateStr = format(day, 'yyyy-MM-dd');
    return getAvailableTimeSlots(dateStr, config, existingJobs).some(s => !s.booked);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-white/10 rounded-xl transition-all">
          <ChevronLeft className="w-4 h-4 text-white/60" />
        </button>
        <span className="text-sm font-black uppercase tracking-wider">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-white/10 rounded-xl transition-all">
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[9px] font-black text-white/20 uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(day => {
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === dateStr;
          const selectable = isDaySelectable(day);
          return (
            <button key={dateStr}
              onClick={() => { if (selectable) onSelectDate(dateStr); }}
              disabled={!selectable}
              className={`aspect-square rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                isSelected ? 'bg-[var(--brand-gold)] text-black font-black' :
                selectable ? 'hover:bg-white/10 text-white' :
                'text-white/15 cursor-not-allowed'
              }`}>
              {isCurrentMonth ? format(day, 'd') : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BookingCalendar;
