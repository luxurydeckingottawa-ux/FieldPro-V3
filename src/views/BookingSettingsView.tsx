import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Link, ExternalLink, Check, Building2, Calendar, Users, Zap, BookOpen } from 'lucide-react';
import { BookingConfig, loadBookingConfig, saveBookingConfig, getAvailableTimeSlots } from '../utils/bookingConfig';

interface BookingSettingsViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '2 hr' },
];

const DAY_LABELS = ['Sun', 'M', 'T', 'W', 'T', 'F', 'Sat'];

const LEAD_TIME_OPTIONS = [
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
];

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
}

const HOUR_OPTIONS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 to 20

const BookingSettingsView: React.FC<BookingSettingsViewProps> = ({ onBack, onNavigate }) => {
  const [config, setConfig] = useState<BookingConfig>(loadBookingConfig);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const bookingUrl = `${window.location.origin}?booking=true`;

  const updateConfig = useCallback((partial: Partial<BookingConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  // Auto-save on any config change
  useEffect(() => {
    saveBookingConfig(config);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [config]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDay = (day: number) => {
    const days = config.availableDays.includes(day)
      ? config.availableDays.filter(d => d !== day)
      : [...config.availableDays, day].sort((a, b) => a - b);
    updateConfig({ availableDays: days });
  };

  // Calculate slot preview labels from current config
  const slotPreview = (() => {
    const slots: string[] = [];
    let current = config.startHour * 60;
    const end = config.endHour * 60;
    while (current + config.durationMinutes <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h >= 12 ? 'PM' : 'AM';
      slots.push(`${hour12}:${String(m).padStart(2, '0')} ${ampm}`);
      current += config.durationMinutes;
    }
    return slots;
  })();

  const inputBase = 'bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)] transition-all appearance-none';
  const pillBase = 'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer select-none';
  const pillActive = `${pillBase} bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black`;
  const pillInactive = `${pillBase} bg-white/5 border-white/10 text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40 hover:text-[var(--text-primary)]`;
  const sectionLabel = 'text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]';
  const card = 'bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-4';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Header */}
      <header className="bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)] sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 hover:bg-[var(--text-primary)]/5 rounded-2xl transition-all active:scale-95 group">
              <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
            </button>
            <div>
              <h1 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight italic">Booking Settings</h1>
              <p className="text-[10px] text-[var(--brand-gold)] font-black uppercase tracking-[0.2em]">Configure your public booking link</p>
            </div>
          </div>
          {saved && (
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
              <Check className="w-3 h-3" /> Saved
            </div>
          )}
        </div>
      </header>

      {/* Settings sub-nav */}
      {onNavigate && (
        <div className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
          <div className="max-w-3xl mx-auto px-6 flex gap-1 py-2 overflow-x-auto">
            {[
              { view: 'booking-settings', label: 'Booking', icon: <Calendar className="w-3.5 h-3.5" /> },
              { view: 'automation-settings', label: 'Automations', icon: <Zap className="w-3.5 h-3.5" /> },
              { view: 'user-management', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
              { view: 'business-info', label: 'Business Info', icon: <Building2 className="w-3.5 h-3.5" /> },
              { view: 'price-book', label: 'Price Book', icon: <BookOpen className="w-3.5 h-3.5" /> },
            ].map(item => (
              <button key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${item.view === 'booking-settings' ? 'bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] border border-[var(--brand-gold)]/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Section 1 — Booking Link */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(196,164,50,0.15) 0%, rgba(196,164,50,0.05) 100%)', border: '1px solid rgba(196,164,50,0.3)' }}>
          <div>
            <h2 className="text-base font-black text-[var(--brand-gold)] uppercase tracking-widest">Your Public Booking Link</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Share this link anywhere — Google Business Profile, website, email signature</p>
          </div>
          <div className="bg-[var(--bg-primary)]/60 border border-[var(--brand-gold)]/20 rounded-2xl px-4 py-3 font-mono text-sm text-[var(--text-primary)] break-all">
            {bookingUrl}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCopyLink}
              className="flex items-center gap-2 bg-[var(--brand-gold)] text-black px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Link className="w-3.5 h-3.5" /> Copy Link</>}
            </button>
            <button onClick={() => window.open(bookingUrl, '_blank')}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-[var(--text-primary)] px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-[var(--brand-gold)]/40 transition-all active:scale-95">
              <ExternalLink className="w-3.5 h-3.5" /> Open Preview
            </button>
          </div>
        </div>

        {/* Section 2 — Appointment Duration */}
        <div className={card}>
          <p className={sectionLabel}>Appointment Duration</p>
          <p className="text-xs text-[var(--text-secondary)]">How long is each estimate appointment?</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => updateConfig({ durationMinutes: opt.value })}
                className={config.durationMinutes === opt.value ? pillActive : pillInactive}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3 — Available Days */}
        <div className={card}>
          <p className={sectionLabel}>Available Days</p>
          <p className="text-xs text-[var(--text-secondary)]">Which days can clients book?</p>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((label, idx) => (
              <button key={idx} onClick={() => toggleDay(idx)}
                className={config.availableDays.includes(idx) ? pillActive : pillInactive}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 4 — Available Hours */}
        <div className={card}>
          <p className={sectionLabel}>Available Hours</p>
          <p className="text-xs text-[var(--text-secondary)]">What hours are available for bookings?</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">From</label>
              <select value={config.startHour} onChange={e => updateConfig({ startHour: Number(e.target.value) })} className={`w-full ${inputBase}`}>
                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">To</label>
              <select value={config.endHour} onChange={e => updateConfig({ endHour: Number(e.target.value) })} className={`w-full ${inputBase}`}>
                {HOUR_OPTIONS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
              </select>
            </div>
          </div>
          {slotPreview.length > 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="text-[var(--brand-gold)] font-black">{slotPreview.length} slot{slotPreview.length !== 1 ? 's' : ''} per day</span>
              {' '}({slotPreview.join(', ')})
            </p>
          ) : (
            <p className="text-xs text-amber-400">No slots fit in this window. Try a wider range or shorter duration.</p>
          )}
        </div>

        {/* Section 5 — Booking Mode */}
        <div className={card}>
          <p className={sectionLabel}>Booking Mode</p>
          <p className="text-xs text-[var(--text-secondary)]">How should clients schedule?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['flexible', 'manual'] as const).map(mode => (
              <button key={mode} onClick={() => updateConfig({ mode })}
                className={`p-4 rounded-2xl border text-left transition-all ${config.mode === mode ? 'border-[var(--brand-gold)] bg-[var(--brand-gold)]/5' : 'border-[var(--border-color)] hover:border-[var(--brand-gold)]/30'}`}>
                <p className="text-sm font-black text-[var(--text-primary)] capitalize">{mode}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {mode === 'flexible' ? 'Client picks from available time slots' : 'No time picker — office will call to confirm time'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Section 6 — Advance Notice */}
        <div className={card}>
          <p className={sectionLabel}>Minimum Advance Notice</p>
          <div className="flex flex-wrap gap-2">
            {LEAD_TIME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => updateConfig({ leadTimeDays: opt.value })}
                className={config.leadTimeDays === opt.value ? pillActive : pillInactive}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BookingSettingsView;
