import React, { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { Job, PipelineStage, JobStatus, FieldStatus, CompletionPackageStatus, PhotoCompletionStatus, CompletionReadinessStatus, OfficeReviewStatus, ScheduleStatus } from '../types';
import { loadBookingConfig, getAvailableTimeSlots } from '../utils/bookingConfig';
import { dataService } from '../services/dataService';
import { createDefaultBuildDetails, createDefaultOfficeChecklists } from '../constants';
import BookingCalendar from '../components/BookingCalendar';
import { COMPANY } from '../config/company';

interface PublicBookingViewProps {
  existingJobs: Job[];
  onBookingComplete?: (job: Job) => void;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const inputBase = 'w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white focus:outline-none focus:border-[var(--brand-gold)] transition-all placeholder:text-white/30';
const labelBase = 'block text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1.5';

// Inline checkmark icon for the progress bar
const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

const STEP_LABELS = ['Contact Info', 'Date & Time', 'Confirm'];

const PublicBookingView: React.FC<PublicBookingViewProps> = ({ existingJobs, onBookingComplete }) => {
  const config = loadBookingConfig();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '', email: '', address: '', notes: '' });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [booked, setBooked] = useState(false);
  const [bookedJob, setBookedJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof FormData, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  const validateStep1 = () => !!(formData.name.trim() && formData.phone.trim() && formData.address.trim());

  const slots = selectedDate ? getAvailableTimeSlots(selectedDate, config, existingJobs) : [];

  const formatDateTime = (dateStr: string, timeStr: string): string =>
    format(new Date(`${dateStr}T${timeStr}:00`), "EEEE, MMMM d 'at' h:mm a");

  const durationLabel = config.durationMinutes >= 60
    ? `${config.durationMinutes / 60} hour${config.durationMinutes > 60 ? 's' : ''}`
    : `${config.durationMinutes} min`;

  const handleBook = async () => {
    if (submitting) return;
    setSubmitting(true);
    const firstName = formData.name.split(' ')[0];
    const formattedDateTime = formatDateTime(selectedDate, selectedTime);
    const newJob: Job = {
      id: `j-${Date.now()}`,
      jobNumber: `EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: formData.name,
      clientPhone: formData.phone,
      clientEmail: formData.email || undefined,
      projectAddress: formData.address,
      projectType: '',
      scopeSummary: formData.notes,
      leadSource: 'Online Booking',
      pipelineStage: PipelineStage.EST_SCHEDULED,
      status: JobStatus.SCHEDULED,
      currentStage: 0,
      scheduledDate: `${selectedDate}T${selectedTime}:00`,
      plannedStartDate: undefined,
      plannedDurationDays: 5,
      assignedCrewOrSubcontractor: '',
      materialCost: 0,
      labourCost: 0,
      totalAmount: 0,
      paidAmount: 0,
      officeChecklists: createDefaultOfficeChecklists(),
      officeNotes: [],
      siteNotes: [],
      files: [],
      flaggedIssues: [],
      signoffStatus: 'pending',
      invoiceSupportStatus: 'pending',
      finalSubmissionStatus: 'pending',
      fieldStatus: FieldStatus.PENDING,
      completionPackageStatus: CompletionPackageStatus.NOT_SUBMITTED,
      photoCompletionStatus: PhotoCompletionStatus.NOT_CONFIRMED,
      completionReadinessStatus: CompletionReadinessStatus.NOT_READY,
      officeReviewStatus: OfficeReviewStatus.NOT_READY,
      officialScheduleStatus: ScheduleStatus.ON_SCHEDULE,
      updatedAt: new Date().toISOString(),
      buildDetails: createDefaultBuildDetails(),
      customerPortalToken: crypto.randomUUID(),
    };

    const saved = await dataService.createJob(newJob);
    const result = saved || newJob;

    // Confirmation SMS — non-blocking
    try {
      await fetch('/.netlify/functions/send-sms', {
        method: 'POST',
        body: JSON.stringify({
          to: formData.phone,
          message: `Hi ${firstName}, your ${COMPANY.name} estimate appointment is confirmed for ${formattedDateTime}. We'll see you then! Questions? Call or text us anytime.`,
        }),
      });
    } catch {}

    setBookedJob(result);
    setBooked(true);
    onBookingComplete?.(result);
  };

  // Success screen
  if (booked && bookedJob) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 py-16 text-white">
        <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em] mb-6">{COMPANY.legalName}</p>
        <CheckCircle2 className="w-20 h-20 text-[var(--brand-gold)] mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-tight text-center mb-2">You're Booked!</h1>
        <p className="text-white/50 text-sm text-center mb-8">Appointment Confirmed</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-3 text-sm text-center">
          <p className="font-black text-[var(--brand-gold)]">{formatDateTime(selectedDate, selectedTime)}</p>
          <p className="text-white/70">{bookedJob.projectAddress}</p>
          <p className="text-white/50 text-xs">Estimate appointment — approx. {durationLabel} on site</p>
        </div>
        <p className="mt-8 text-white/40 text-xs text-center">You'll receive a text confirmation shortly.</p>
        <p className="mt-3 text-white/40 text-xs text-center">Questions? Call us: 613-XXX-XXXX</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 py-5 px-6 text-center">
        <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em]">{COMPANY.legalName}</p>
        <h1 className="text-lg font-black uppercase tracking-tight mt-1">Book a Free Estimate</h1>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto px-6 pt-8 pb-2">
        <div className="flex items-center gap-2">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const active = step === stepNum;
            const done = step > stepNum;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${active || done ? 'bg-[var(--brand-gold)] text-black' : 'bg-white/10 text-white/30'}`}>
                    {done ? <CheckIcon /> : stepNum}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider ${active || done ? 'text-[var(--brand-gold)]' : 'text-white/20'}`}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && <div className={`h-px flex-1 transition-all mb-4 ${done ? 'bg-[var(--brand-gold)]' : 'bg-white/10'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8 space-y-5">

        {/* Step 1 — Contact Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-black uppercase tracking-tight">Your Details</h2>
            <div>
              <label className={labelBase}>Full Name *</label>
              <input className={inputBase} placeholder="e.g. Sarah Johnson" value={formData.name} onChange={e => update('name', e.target.value)} />
            </div>
            <div>
              <label className={labelBase}>Phone Number *</label>
              <input className={inputBase} placeholder="613-555-0100" type="tel" value={formData.phone} onChange={e => update('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelBase}>Email Address</label>
              <input className={inputBase} placeholder="your@email.com" type="email" value={formData.email} onChange={e => update('email', e.target.value)} />
            </div>
            <div>
              <label className={labelBase}>Project Address *</label>
              <input className={inputBase} placeholder="Street, City, Postal Code" value={formData.address} onChange={e => update('address', e.target.value)} />
              <p className="text-[10px] text-white/30 mt-1.5 ml-1">So we can confirm we service your area</p>
            </div>
            <div>
              <label className={labelBase}>Tell us about your project (optional)</label>
              <textarea className={`${inputBase} resize-none`} rows={3} placeholder="e.g. 12x16 composite deck, existing structure, two-level..." value={formData.notes} onChange={e => update('notes', e.target.value)} />
            </div>
            <button onClick={() => validateStep1() && setStep(2)} disabled={!validateStep1()}
              className="w-full bg-[var(--brand-gold)] text-black py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95">
              Next &rarr;
            </button>
          </div>
        )}

        {/* Step 2 — Date & Time */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-black uppercase tracking-tight">Choose a Date &amp; Time</h2>
            <BookingCalendar
              config={config}
              existingJobs={existingJobs}
              selectedDate={selectedDate}
              onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(''); }}
            />
            {selectedDate && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                  Available Times — {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMM d')}
                </p>
                {slots.length === 0 ? (
                  <p className="text-xs text-amber-400 italic">No slots available on this day.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map(slot => (
                      <button key={slot.time} onClick={() => !slot.booked && setSelectedTime(slot.time)} disabled={slot.booked}
                        className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                          slot.booked ? 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed line-through' :
                          selectedTime === slot.time ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' :
                          'bg-white/5 border-white/10 text-white/70 hover:border-[var(--brand-gold)]/40 hover:text-white'
                        }`}>
                        {slot.label}{slot.booked ? ' — Booked' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                &larr; Back
              </button>
              <button onClick={() => selectedDate && selectedTime && setStep(3)} disabled={!selectedDate || !selectedTime}
                className="flex-[2] bg-[var(--brand-gold)] text-black py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all active:scale-95">
                Review &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-black uppercase tracking-tight">Review &amp; Confirm</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/40 text-xs uppercase tracking-wider font-black">Name</span><span className="font-bold">{formData.name}</span></div>
                <div className="flex justify-between"><span className="text-white/40 text-xs uppercase tracking-wider font-black">Phone</span><span className="font-bold">{formData.phone}</span></div>
                {formData.email && <div className="flex justify-between"><span className="text-white/40 text-xs uppercase tracking-wider font-black">Email</span><span className="font-bold">{formData.email}</span></div>}
                <div className="flex justify-between gap-4"><span className="text-white/40 text-xs uppercase tracking-wider font-black shrink-0">Address</span><span className="font-bold text-right">{formData.address}</span></div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-[var(--brand-gold)] font-black text-sm">{formatDateTime(selectedDate, selectedTime)}</p>
                  <p className="text-white/40 text-xs mt-1">Estimate appointment — approx. {durationLabel} on site</p>
                </div>
                {formData.notes && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-white/40 text-xs uppercase tracking-wider font-black mb-1">Project Notes</p>
                    <p className="text-sm text-white/70">{formData.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                &larr; Back
              </button>
              <button onClick={handleBook} disabled={submitting}
                className="flex-[2] bg-[var(--brand-gold)] text-black py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-all active:scale-95">
                {submitting ? 'Booking...' : 'Book My Estimate'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PublicBookingView;
