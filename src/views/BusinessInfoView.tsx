import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, CheckCircle2, Building2, Phone, Globe, Mail, Palette, Image } from 'lucide-react';

// ── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fieldpro_business_info';

export interface BusinessInfo {
  companyName: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logoDataUrl?: string;  // base64 data URL
  primaryColor: string;  // hex
  accentColor: string;   // hex
}

const DEFAULTS: BusinessInfo = {
  companyName: 'Luxury Decking',
  tagline: 'Field Pro',
  phone: '613-707-3060',
  email: 'info@luxurydecking.ca',
  website: 'luxurydecking.ca',
  address: 'Ottawa, ON',
  primaryColor: '#B8892A',
  accentColor: '#1a1a1a',
};

export function loadBusinessInfo(): BusinessInfo {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function saveBusinessInfo(info: BusinessInfo) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

// ── Preset brand colors ───────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: 'Gold',    value: '#B8892A' },
  { label: 'Navy',    value: '#1B2A4A' },
  { label: 'Forest',  value: '#2D5A27' },
  { label: 'Slate',   value: '#4A5568' },
  { label: 'Crimson', value: '#9B1C1C' },
  { label: 'Sky',     value: '#0369A1' },
  { label: 'Teal',    value: '#0F766E' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface BusinessInfoViewProps {
  onBack: () => void;
}

const BusinessInfoView: React.FC<BusinessInfoViewProps> = ({ onBack }) => {
  const [info, setInfo] = useState<BusinessInfo>(loadBusinessInfo);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(info.logoDataUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof BusinessInfo, value: string) => {
    setInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveBusinessInfo({ ...info, logoDataUrl: logoPreview });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Header */}
      <header className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-secondary)]">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-black text-[var(--text-primary)]">Business Information</h1>
              <p className="text-[10px] text-[var(--text-secondary)]">Logo, colors, contact details</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--brand-gold)] text-white rounded-lg text-xs font-bold hover:bg-[var(--brand-gold-light)] transition-all"
          >
            {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : 'Save Changes'}
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Logo */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-4 h-4 text-[var(--brand-gold)]" />
            <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Company Logo</h2>
          </div>
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="shrink-0">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Preview</p>
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-[var(--text-secondary)]/30" />
                )}
              </div>
              {/* NavBar preview */}
              <div className="mt-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-2 flex items-center gap-2 w-fit">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: info.accentColor }}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="w-6 h-6 object-contain" />
                  ) : (
                    <Building2 className="w-4 h-4 text-white/50" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black leading-none">{info.companyName || 'Company Name'}</p>
                  <p className="text-[9px] leading-none mt-0.5" style={{ color: info.primaryColor }}>{info.tagline || 'Tagline'}</p>
                </div>
              </div>
              <p className="text-[9px] text-[var(--text-secondary)] mt-1">NavBar preview</p>
            </div>

            {/* Upload */}
            <div className="flex-1">
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Upload Logo</p>
              <p className="text-xs text-[var(--text-secondary)] mb-3">PNG or SVG recommended. Will display as a square. White or transparent background works best on dark themes.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg text-xs font-bold hover:text-[var(--brand-gold)] hover:border-[var(--brand-gold)]/30 transition-all"
              >
                <Upload className="w-3.5 h-3.5" /> Choose File
              </button>
              {logoPreview && (
                <button onClick={() => setLogoPreview(undefined)} className="mt-2 text-[10px] text-rose-400 hover:underline block">
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-[var(--brand-gold)]" />
            <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Brand Colors</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Primary / accent color */}
            {[
              { field: 'primaryColor' as const, label: 'Primary / Gold Color', desc: 'Used for highlights, links, active states' },
              { field: 'accentColor' as const, label: 'App Background / Accent', desc: 'Used for logo background, dark elements' },
            ].map(({ field, label, desc }) => (
              <div key={field}>
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 block">{label}</label>
                <p className="text-[10px] text-[var(--text-secondary)] mb-3">{desc}</p>
                {/* Preset swatches */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => handleChange(field, c.value)}
                      title={c.label}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${info[field] === c.value ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                {/* Custom hex input */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-[var(--border-color)]" style={{ backgroundColor: info[field] }} />
                  <input
                    type="text"
                    value={info[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder="#B8892A"
                    className="w-28 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-gold)]/50"
                  />
                  <input
                    type="color"
                    value={info[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    title="Color picker"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[var(--brand-gold)]" />
            <h2 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Company Details</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { field: 'companyName' as const, label: 'Company Name', icon: <Building2 className="w-3.5 h-3.5" />, placeholder: 'Luxury Decking' },
              { field: 'tagline' as const, label: 'App Tagline', icon: <Building2 className="w-3.5 h-3.5" />, placeholder: 'Field Pro' },
              { field: 'phone' as const, label: 'Phone Number', icon: <Phone className="w-3.5 h-3.5" />, placeholder: '613-555-0000' },
              { field: 'email' as const, label: 'Email', icon: <Mail className="w-3.5 h-3.5" />, placeholder: 'info@company.com' },
              { field: 'website' as const, label: 'Website', icon: <Globe className="w-3.5 h-3.5" />, placeholder: 'company.com' },
              { field: 'address' as const, label: 'City / Region', icon: <Building2 className="w-3.5 h-3.5" />, placeholder: 'Ottawa, ON' },
            ].map(({ field, label, icon, placeholder }) => (
              <div key={field}>
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <span className="text-[var(--brand-gold)]">{icon}</span> {label}
                </label>
                <input
                  value={info[field] || ''}
                  onChange={e => handleChange(field, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-gold)]/50"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save button (bottom) */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--brand-gold)] text-white hover:bg-[var(--brand-gold-light)]'}`}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Business Info'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoView;
