import { Job } from '../types';

export interface BookingConfig {
  availableDays: number[]; // 0=Sun, 1=Mon ... 6=Sat
  startHour: number;       // 0-23
  endHour: number;         // 0-23 (exclusive)
  durationMinutes: number; // 30, 45, 60, 90, 120
  mode: 'flexible' | 'manual';
  leadTimeDays: number;    // min days in advance to book
}

export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  availableDays: [1, 2, 3, 4, 5],
  startHour: 12,
  endHour: 18,
  durationMinutes: 90,
  mode: 'flexible',
  leadTimeDays: 1,
};

const STORAGE_KEY = 'fieldpro_booking_config';

export function loadBookingConfig(): BookingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_BOOKING_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_BOOKING_CONFIG };
}

export function saveBookingConfig(config: BookingConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getAvailableTimeSlots(
  date: string,
  config: BookingConfig,
  existingJobs: Job[],
  estimator?: string
): { time: string; label: string; booked: boolean }[] {
  if (!date) return [];
  const d = new Date(date + 'T12:00:00');
  const dayOfWeek = d.getDay();
  if (!config.availableDays.includes(dayOfWeek)) return [];

  // Enforce lead time
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(date + 'T00:00:00');
  const leadMs = config.leadTimeDays * 24 * 60 * 60 * 1000;
  if (selected.getTime() - today.getTime() < leadMs) return [];

  const slots: { time: string; label: string; booked: boolean }[] = [];
  let current = config.startHour * 60;
  const endMinutes = config.endHour * 60;

  while (current + config.durationMinutes <= endMinutes) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;

    const isBooked = existingJobs.some(j => {
      if (!j.scheduledDate || !j.scheduledDate.startsWith(date)) return false;
      if (estimator && j.assignedCrewOrSubcontractor !== estimator) return false;
      const jd = new Date(j.scheduledDate);
      return jd.getHours() * 60 + jd.getMinutes() === current;
    });

    slots.push({ time, label, booked: isBooked });
    current += config.durationMinutes;
  }
  return slots;
}
