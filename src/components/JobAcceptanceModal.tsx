import React, { useState } from 'react';
import { Job } from '../types';
import {
  CheckCircle2,
  FileText,
  ClipboardList,
  ChevronRight,
  X,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobAcceptanceModalProps {
  job: Job;
  onComplete: (updates: Partial<Job>) => void;
  onSkip: () => void;
  onFillLater: () => void;
}

type Step = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  current: Step;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: 'Contract' },
    { n: 2, label: 'Job Details' },
    { n: 3, label: 'Confirm' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-6 px-8">
      {steps.map(({ n, label }, idx) => {
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                  done
                    ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black'
                    : active
                    ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)] text-[var(--brand-gold)]'
                    : 'bg-transparent border-[var(--border-color)] text-[var(--text-secondary)]'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : n}
              </div>
              <span
                className={`text-[9px] font-black uppercase tracking-widest ${
                  active ? 'text-[var(--brand-gold)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mb-4 ${
                  current > n ? 'bg-[var(--brand-gold)]' : 'bg-[var(--border-color)]'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-1 h-5 rounded-full bg-[var(--brand-gold)]" />
    <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">{title}</h3>
  </div>
);

// ---------------------------------------------------------------------------
// Form field helpers
// ---------------------------------------------------------------------------

const fieldClass =
  'w-full bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--brand-gold)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors';

const labelClass = 'block text-[10px] font-black uppercase tracking-widest text-[var(--brand-gold)] mb-1.5';

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Step 1 — Contract Summary
// ---------------------------------------------------------------------------

interface Step1Props {
  job: Job;
  onContinue: () => void;
  onSkip: () => void;
}

const Step1ContractSummary: React.FC<Step1Props> = ({ job, onContinue, onSkip }) => {
  const summary = job.acceptedBuildSummary;
  const totalPrice = summary?.totalPrice ?? job.totalAmount ?? 0;
  const deposit = Math.round(totalPrice * 0.3);
  const materialDelivery = Math.round(totalPrice * 0.3);
  const finalBalance = totalPrice - deposit - materialDelivery;
  const isDiamond =
    (job.acceptedOptionName?.toLowerCase().includes('diamond') ||
      summary?.optionName?.toLowerCase().includes('diamond')) ??
    false;
  const contractAlreadySigned = (job.files ?? []).some((f) => f.type === 'contract' && f.url);

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-3 px-8 pb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[var(--brand-gold)]" />
        </div>
        <div>
          <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Step 1</p>
          <h2 className="text-lg font-black text-[var(--text-primary)]">
            Project Agreement &mdash; {job.clientName || 'Client'}
          </h2>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-4 space-y-5">
        {/* Client & Project */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <p className={labelClass}>Client</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">{job.clientName || 'N/A'}</p>
          </div>
          <div>
            <p className={labelClass}>Address</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">{job.projectAddress || 'N/A'}</p>
          </div>
          <div>
            <p className={labelClass}>Package Selected</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {job.acceptedOptionName || summary?.optionName || 'N/A'}
            </p>
          </div>
          <div>
            <p className={labelClass}>Project Scope</p>
            <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">
              {summary?.scopeSummary || 'Custom deck project'}
            </p>
          </div>
          {summary?.addOns && summary.addOns.length > 0 && (
            <div className="col-span-2">
              <p className={labelClass}>Add-Ons Included</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {summary.addOns.map((a) => (
                  <span
                    key={a.name}
                    className="px-2.5 py-1 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-lg text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-wider"
                  >
                    {a.name} &mdash; {formatCurrency(a.price)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5 space-y-3">
          <SectionHeader title="Pricing & Payment Terms" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Total Project Price</span>
            <span className="font-black text-[var(--brand-gold)] text-lg">{formatCurrency(totalPrice)}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-[var(--border-color)] pt-3">
            <span className="text-[var(--text-secondary)]">Deposit at Signing (30%)</span>
            <span className="font-bold text-[var(--text-primary)]">{formatCurrency(deposit)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Upon Material Delivery (30%)</span>
            <span className="font-bold text-[var(--text-primary)]">{formatCurrency(materialDelivery)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Final Balance on Completion (40%)</span>
            <span className="font-bold text-[var(--text-primary)]">{formatCurrency(finalBalance)}</span>
          </div>
        </div>

        {/* Warranty */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
          <SectionHeader title="Warranty" />
          <p className="text-sm text-[var(--text-primary)] font-bold">
            {isDiamond ? '10-Year Diamond Workmanship Warranty' : '5-Year Standard Workmanship Warranty'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Manufacturer warranties on materials apply separately per manufacturer terms.
          </p>
        </div>

        {/* Confirmation note */}
        <div className={`rounded-2xl p-4 ${contractAlreadySigned ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-[var(--brand-gold)]/5 border border-[var(--brand-gold)]/20'}`}>
          {contractAlreadySigned ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Signed contract is already attached to the job file. Continue to fill in the job details.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              By proceeding, you confirm this project has been accepted by the client and a contract
              record will be attached to the job file.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 pt-4 pb-6 flex gap-3 border-t border-[var(--border-color)]">
        <button
          onClick={onSkip}
          className="px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-sm font-bold hover:text-[var(--text-primary)] transition-all"
        >
          Skip Setup
        </button>
        <button
          onClick={onContinue}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--brand-gold)] text-black rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--brand-gold)]/20"
        >
          <FileText className="w-4 h-4" />
          {contractAlreadySigned ? 'Continue to Job Details' : 'Attach Contract \u0026 Continue'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 2 — Job Details Form
// ---------------------------------------------------------------------------

interface FormState {
  // A — Client & Site
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  projectAddress: string;
  siteAccessNotes: string;
  parkingNotes: string;
  // B — Project Scope (core)
  packageTier: string;
  totalPrice: number;
  deckSqFt: string;
  addOns: string[];
  scopeNotes: string;
  // B1 — Site & Footings
  deckType: string;
  footingType: string;
  footingsCount: string;
  deckHeight: string;
  // B2 — Framing
  framingMaterial: string;
  joistSize: string;
  joistSpacing: string;
  joistProtection: boolean;
  // B3 — Decking
  deckingMaterial: string;
  deckingBrand: string;
  deckingColor: string;
  pictureFrame: boolean;
  pictureFrameColor: string;
  // B4 — Railing
  railingIncluded: boolean;
  railingType: string;
  railingBrand: string;
  railingLF: string;
  // B5 — Stairs & Skirting
  stairsIncluded: boolean;
  stairCount: string;
  skirtingIncluded: boolean;
  skirtingType: string;
  skirtingGate: boolean;
  // B6 — Electrical
  lightingIncluded: boolean;
  lightingType: string;
  // C — Schedule & Assignment
  estimatedStartDate: string;
  estimatedDuration: number;
  assignedTo: string;
  permitRequired: boolean;
  permitNumber: string;
}

interface Step2Props {
  job: Job;
  onSave: (form: FormState) => void;
  onBack: () => void;
}

const Step2JobDetailsForm: React.FC<Step2Props> = ({ job, onSave, onBack }) => {
  const summary = job.acceptedBuildSummary;


  const sel = job.calculatorSelections as Record<string, string> | undefined;
  const dim = job.calculatorDimensions as Record<string, number> | undefined;
  const bd  = job.buildDetails;

  const [form, setForm] = useState<FormState>({
    // A — Client & Site
    clientName: job.clientName || '',
    clientPhone: job.clientPhone || '',
    clientEmail: job.clientEmail || '',
    projectAddress: job.projectAddress || '',
    siteAccessNotes: (job.estimatorIntake as unknown as Record<string, string> | undefined)?.siteAccessNotes ?? '',
    parkingNotes: '',
    // B — Project Scope (core)
    packageTier: job.acceptedOptionName || summary?.optionName || '',
    totalPrice: summary?.totalPrice ?? job.totalAmount ?? 0,
    deckSqFt: dim?.sqft?.toString() ?? dim?.deckSqft?.toString() ?? '',
    addOns: summary?.addOns?.map((a) => a.name) ?? [],
    scopeNotes: '',
    // B1 — Site & Footings
    deckType: bd?.footings?.attachedToHouse ? 'Attached' : bd?.footings?.floating ? 'Floating' : '',
    footingType: sel?.foundation?.name ?? bd?.footings?.type ?? '',
    footingsCount: dim?.footingsCount?.toString() ?? '',
    deckHeight: '',
    // B2 — Framing
    framingMaterial: bd?.framing?.type ?? 'Pressure Treated',
    joistSize: bd?.framing?.joistSize ?? '2x8',
    joistSpacing: bd?.framing?.joistSpacing ?? '16" OC',
    joistProtection: bd?.framing?.joistProtection ?? false,
    // B3 — Decking
    deckingMaterial: sel?.decking?.name ?? bd?.decking?.type ?? '',
    deckingBrand: bd?.decking?.brand ?? '',
    deckingColor: bd?.decking?.color ?? '',
    pictureFrame: !!(dim?.borderLF > 0),
    pictureFrameColor: bd?.decking?.accentNote ?? '',
    // B4 — Railing
    railingIncluded: bd?.railing?.included ?? !!(sel?.railing),
    railingType: sel?.railing?.name ?? bd?.railing?.type ?? '',
    railingBrand: '',
    railingLF: dim?.railingLF?.toString() ?? '',
    // B5 — Stairs & Skirting
    stairsIncluded: bd?.stairs?.included ?? !!(dim?.steps > 0),
    stairCount: dim?.steps?.toString() ?? '',
    skirtingIncluded: bd?.skirting?.included ?? !!(dim?.skirtingSqFt > 0),
    skirtingType: bd?.skirting?.type ?? '',
    skirtingGate: false,
    // B6 — Electrical
    lightingIncluded: bd?.electrical?.lightingIncluded ?? !!(dim?.lightsCount > 0),
    lightingType: bd?.electrical?.lightingType ?? '',
    // C — Schedule & Assignment
    estimatedStartDate: '',
    estimatedDuration: 5,
    assignedTo: '',
    permitRequired: bd?.sitePrep?.permitsRequired ?? false,
    permitNumber: '',
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-3 px-8 pb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-[var(--brand-gold)]" />
        </div>
        <div>
          <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-widest">Step 2</p>
          <h2 className="text-lg font-black text-[var(--text-primary)]">Job Details</h2>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-4 space-y-6">

        {/* Section A — Client & Site */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
          <SectionHeader title="A — Client & Site" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client Name">
              <input className={fieldClass} value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
            </Field>
            <Field label="Client Phone">
              <input className={fieldClass} value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} />
            </Field>
            <Field label="Client Email">
              <input type="email" className={fieldClass} value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} />
            </Field>
            <Field label="Project Address">
              <input className={fieldClass} value={form.projectAddress} onChange={(e) => set('projectAddress', e.target.value)} />
            </Field>
            <Field label="Site Access Notes">
              <textarea rows={2} className={fieldClass} placeholder="Gate code, access restrictions..." value={form.siteAccessNotes} onChange={(e) => set('siteAccessNotes', e.target.value)} />
            </Field>
            <Field label="Parking / Staging Area">
              <input className={fieldClass} placeholder="Driveway, street, side yard..." value={form.parkingNotes} onChange={(e) => set('parkingNotes', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Section B — Project Scope */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 space-y-6">
          <SectionHeader title="B — Project Scope" />

          {/* Core */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Package Tier">
              <input className={fieldClass} value={form.packageTier} onChange={(e) => set('packageTier', e.target.value)} />
            </Field>
            <Field label="Total Project Price">
              <input type="number" className={fieldClass} value={form.totalPrice} onChange={(e) => set('totalPrice', Number(e.target.value))} />
            </Field>
            <Field label="Deck Square Footage">
              <input className={fieldClass} placeholder="e.g. 280" value={form.deckSqFt} onChange={(e) => set('deckSqFt', e.target.value)} />
            </Field>
          </div>

          {/* B1 — Site & Footings */}
          <div>
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-2">Site & Footings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Deck Type</p>
                <div className="flex gap-2">
                  {(['Attached', 'Floating'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('deckType', opt)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${form.deckType === opt ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Footing Type">
                <input className={fieldClass} placeholder="e.g. Helical Piles, Concrete" value={form.footingType} onChange={(e) => set('footingType', e.target.value)} />
              </Field>
              <Field label="Number of Footings">
                <input className={fieldClass} placeholder="e.g. 8" value={form.footingsCount} onChange={(e) => set('footingsCount', e.target.value)} />
              </Field>
              <Field label="Deck Height / Elevation">
                <input className={fieldClass} placeholder="e.g. Ground level, 3ft, 8ft" value={form.deckHeight} onChange={(e) => set('deckHeight', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* B2 — Framing */}
          <div>
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-2">Framing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Lumber Type</p>
                <div className="flex gap-2">
                  {(['Pressure Treated', 'Steel Frame', 'LVL'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('framingMaterial', opt)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${form.framingMaterial === opt ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelClass}>Joist Size</p>
                <div className="flex gap-2">
                  {(['2x8', '2x10', '2x12'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('joistSize', opt)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${form.joistSize === opt ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelClass}>Joist Spacing</p>
                <div className="flex gap-2">
                  {(['12" OC', '16" OC', '24" OC'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('joistSpacing', opt)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${form.joistSpacing === opt ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelClass}>Joist Protection?</p>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('joistProtection', opt === 'Yes')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.joistProtection ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* B3 — Decking */}
          <div>
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-2">Decking</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Material Type">
                <input className={fieldClass} placeholder="e.g. Trex Transcend, PT Wood" value={form.deckingMaterial} onChange={(e) => set('deckingMaterial', e.target.value)} />
              </Field>
              <Field label="Brand">
                <input className={fieldClass} placeholder="e.g. Trex, Fiberon, TimberTech" value={form.deckingBrand} onChange={(e) => set('deckingBrand', e.target.value)} />
              </Field>
              <Field label="Color">
                <input className={fieldClass} placeholder="e.g. Tiki Torch, Gravel Path" value={form.deckingColor} onChange={(e) => set('deckingColor', e.target.value)} />
              </Field>
              <div>
                <p className={labelClass}>Picture Frame / Border?</p>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('pictureFrame', opt === 'Yes')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.pictureFrame ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {form.pictureFrame && (
                <Field label="Border / Accent Color">
                  <input className={fieldClass} placeholder="e.g. Vintage Lantern" value={form.pictureFrameColor} onChange={(e) => set('pictureFrameColor', e.target.value)} />
                </Field>
              )}
            </div>
          </div>

          {/* B4 — Railing */}
          <div>
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-2">Railing</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Railing Included?</p>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('railingIncluded', opt === 'Yes')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.railingIncluded ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {form.railingIncluded && (
                <>
                  <Field label="Railing Type">
                    <input className={fieldClass} placeholder="e.g. Aluminum, Glass, Wood" value={form.railingType} onChange={(e) => set('railingType', e.target.value)} />
                  </Field>
                  <Field label="Brand / System">
                    <input className={fieldClass} placeholder="e.g. Fortress Fe26, AL13" value={form.railingBrand} onChange={(e) => set('railingBrand', e.target.value)} />
                  </Field>
                  <Field label="Linear Feet">
                    <input className={fieldClass} placeholder="e.g. 48" value={form.railingLF} onChange={(e) => set('railingLF', e.target.value)} />
                  </Field>
                </>
              )}
            </div>
          </div>

          {/* B5 — Stairs & Skirting */}
          <div>
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-2">Stairs & Skirting</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Stairs Included?</p>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('stairsIncluded', opt === 'Yes')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.stairsIncluded ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {form.stairsIncluded && (
                <Field label="Stair Count / Linear Feet">
                  <input className={fieldClass} placeholder="e.g. 3 steps / 8 LF" value={form.stairCount} onChange={(e) => set('stairCount', e.target.value)} />
                </Field>
              )}
              <div>
                <p className={labelClass}>Skirting?</p>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('skirtingIncluded', opt === 'Yes')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.skirtingIncluded ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {form.skirtingIncluded && (
                <>
                  <Field label="Skirting Type">
                    <input className={fieldClass} placeholder="e.g. Composite, Lattice, Cedar" value={form.skirtingType} onChange={(e) => set('skirtingType', e.target.value)} />
                  </Field>
                  <div>
                    <p className={labelClass}>Gate in Skirting?</p>
                    <div className="flex gap-2">
                      {(['Yes', 'No'] as const).map((opt) => (
                        <button key={opt} type="button" onClick={() => set('skirtingGate', opt === 'Yes')}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.skirtingGate ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* B6 — Electrical */}
          <div>
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-3 border-b border-[var(--border-color)] pb-2">Electrical</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={labelClass}>Lighting Included?</p>
                <div className="flex gap-2">
                  {(['Yes', 'No'] as const).map((opt) => (
                    <button key={opt} type="button" onClick={() => set('lightingIncluded', opt === 'Yes')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${(opt === 'Yes') === form.lightingIncluded ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {form.lightingIncluded && (
                <Field label="Lighting Type">
                  <input className={fieldClass} placeholder="e.g. Post caps, Step lights" value={form.lightingType} onChange={(e) => set('lightingType', e.target.value)} />
                </Field>
              )}
            </div>
          </div>

          {/* Add-Ons + Scope Notes */}
          {form.addOns.length > 0 && (
            <div>
              <p className={labelClass}>Add-Ons Selected</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.addOns.map((a) => (
                  <span key={a} className="px-2.5 py-1 bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 rounded-lg text-[9px] font-black text-[var(--brand-gold)] uppercase tracking-wider">{a}</span>
                ))}
              </div>
            </div>
          )}
          <Field label="Special Scope Notes">
            <textarea rows={2} className={fieldClass} placeholder="Any special scope items or client requests..." value={form.scopeNotes} onChange={(e) => set('scopeNotes', e.target.value)} />
          </Field>
        </div>

        {/* Section C — Schedule & Assignment */}
        <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6">
          <SectionHeader title="C — Schedule & Assignment" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Estimated Start Date">
              <input type="date" className={fieldClass} value={form.estimatedStartDate} onChange={(e) => set('estimatedStartDate', e.target.value)} />
            </Field>
            <Field label="Estimated Duration (days)">
              <input type="number" min={1} className={fieldClass} value={form.estimatedDuration} onChange={(e) => set('estimatedDuration', Number(e.target.value))} />
            </Field>
            <Field label="Assigned To">
              <input className={fieldClass} placeholder="Crew lead or sub name" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} />
            </Field>
            <div>
              <p className={labelClass}>Permit Required?</p>
              <div className="flex gap-3 mt-1">
                {(['Yes', 'No'] as const).map((opt) => {
                  const active = (opt === 'Yes') === form.permitRequired;
                  return (
                    <button key={opt} type="button" onClick={() => set('permitRequired', opt === 'Yes')}
                      className={`flex-1 py-3 rounded-xl text-sm font-black transition-all border ${active ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)] text-black' : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-gold)]/40'}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            {form.permitRequired && (
              <Field label="Permit Number">
                <input className={fieldClass} placeholder="Permit application #" value={form.permitNumber} onChange={(e) => set('permitNumber', e.target.value)} />
              </Field>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 pt-4 pb-6 flex gap-3 border-t border-[var(--border-color)]">
        <button
          onClick={onBack}
          className="px-5 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-sm font-bold hover:text-[var(--text-primary)] transition-all"
        >
          Back
        </button>
        <button
          onClick={() => onSave(form)}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--brand-gold)] text-black rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--brand-gold)]/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          Save &amp; Open Job File
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Step 3 — Confirmation
// ---------------------------------------------------------------------------

interface Step3Props {
  onOpen: () => void;
}

const Step3Confirmation: React.FC<Step3Props> = ({ onOpen }) => (
  <div className="flex flex-col items-center justify-center px-8 py-12 text-center gap-6">
    <div className="w-16 h-16 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
      <CheckCircle2 className="w-8 h-8 text-[var(--brand-gold)]" />
    </div>
    <div>
      <h2 className="text-2xl font-black text-[var(--brand-gold)] mb-2">You&apos;re All Set!</h2>
      <p className="text-sm text-[var(--text-secondary)]">The job file is ready to open.</p>
    </div>

    <div className="w-full max-w-xs space-y-3 text-left">
      {[
        'Contract attached to job file',
        'Digital Work Order populated',
        'Job file ready',
      ].map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--brand-gold)]/20"
        >
          <CheckCircle2 className="w-4 h-4 text-[var(--brand-gold)] shrink-0" />
          <span className="text-sm font-bold text-[var(--text-primary)]">{item}</span>
        </div>
      ))}
    </div>

    <button
      onClick={onOpen}
      className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-4 bg-[var(--brand-gold)] text-black rounded-xl font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--brand-gold)]/20"
    >
      Open Job File
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

const JobAcceptanceModal: React.FC<JobAcceptanceModalProps> = ({ job, onComplete, onSkip, onFillLater }) => {
  const [step, setStep] = useState<Step>(1);
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Job>>({});

  const handleContractContinue = () => {
    // The real signed contract is already attached by AcceptanceModal upstream.
    // Do NOT create a placeholder here — it would overwrite the real contract file.
    setStep(2);
  };

  const handleFormSave = (form: FormState) => {
    const now = new Date().toISOString();
    const digitalWorkOrder: Job['digitalWorkOrder'] = {
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      clientEmail: form.clientEmail,
      projectAddress: form.projectAddress,
      siteAccessNotes: form.siteAccessNotes,
      parkingNotes: form.parkingNotes,
      packageTier: form.packageTier,
      totalPrice: form.totalPrice,
      deckSqFt: form.deckSqFt,
      deckingMaterial: form.deckingMaterial,
      railingType: form.railingType,
      footingType: form.footingType,
      addOns: form.addOns,
      scopeNotes: form.scopeNotes,
      // Site & footings
      deckType: form.deckType,
      footingsCount: form.footingsCount,
      deckHeight: form.deckHeight,
      // Framing
      framingMaterial: form.framingMaterial,
      joistSize: form.joistSize,
      joistSpacing: form.joistSpacing,
      joistProtection: form.joistProtection,
      // Decking details
      deckingBrand: form.deckingBrand,
      deckingColor: form.deckingColor,
      pictureFrame: form.pictureFrame,
      pictureFrameColor: form.pictureFrameColor,
      // Railing
      railingIncluded: form.railingIncluded,
      railingBrand: form.railingBrand,
      railingLF: form.railingLF,
      // Stairs & skirting
      stairsIncluded: form.stairsIncluded,
      stairCount: form.stairCount,
      skirtingIncluded: form.skirtingIncluded,
      skirtingType: form.skirtingType,
      skirtingGate: form.skirtingGate,
      // Electrical
      lightingIncluded: form.lightingIncluded,
      lightingType: form.lightingType,
      // Schedule
      estimatedStartDate: form.estimatedStartDate,
      estimatedDuration: form.estimatedDuration,
      assignedTo: form.assignedTo,
      permitRequired: form.permitRequired,
      permitNumber: form.permitNumber,
      completedAt: now,
    };
    setPendingUpdates((prev) => ({ ...prev, digitalWorkOrder }));
    setStep(3);
  };

  const handleOpen = () => {
    onComplete(pendingUpdates);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--brand-gold)]/30 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/60 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-6">
          <p className="text-[10px] font-black text-[var(--brand-gold)] uppercase tracking-[0.3em]">
            Job Setup Wizard
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onFillLater}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-amber-500 hover:border-amber-500/30 hover:bg-amber-500/5 text-[10px] font-black uppercase tracking-wider transition-all"
              title="Save the job and fill in this form later from the office"
            >
              <Clock className="w-3 h-3" />
              Fill Later
            </button>
            <button
              onClick={onSkip}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              title="Skip setup entirely"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <StepIndicator current={step} />

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {step === 1 && (
            <Step1ContractSummary
              job={job}
              onContinue={handleContractContinue}
              onSkip={onSkip}
            />
          )}
          {step === 2 && (
            <Step2JobDetailsForm
              job={job}
              onSave={handleFormSave}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && <Step3Confirmation onOpen={handleOpen} />}
        </div>
      </div>
    </div>
  );
};

export default JobAcceptanceModal;
