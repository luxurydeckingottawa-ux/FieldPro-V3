/**
 * CustomerActionPanel
 *
 * Office-controlled widget that drives the "Customer Action Required" banner
 * on the customer portal. Preset checkboxes cover the common prompts (clear
 * the laneway, clear the yard for material delivery, deposit due, etc.); the
 * custom field lets the office type a one-off ask that instantly surfaces on
 * the portal.
 *
 * Data model: job.customerActionsRequired is an array of { id, label,
 * createdAt, preset?, completedAt? }. Toggling a preset on adds an entry;
 * toggling off removes it. Custom entries are added to the same array with
 * preset = 'custom'.
 */

import React, { useState, useCallback } from 'react';
import { BellRing, Plus, X } from 'lucide-react';
import { Job } from '../types';

interface CustomerActionPanelProps {
  job: Job;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => void;
}

// Presets Jack confirmed + a few extras that are obvious for deck jobs.
// Keep the list short — if the office wants something unusual they use the
// custom input. Each preset id is stable so toggling the same one twice
// doesn't create duplicates.
const PRESETS: { id: string; label: string }[] = [
  { id: 'laneway_clear', label: 'Ensure laneway is clear for material delivery' },
  { id: 'backyard_clear', label: 'Clear backyard for material delivery' },
  { id: 'pets_secured', label: 'Please keep pets secured during work hours' },
  { id: 'gate_access', label: 'Confirm gate / side-access code' },
  { id: 'payment_due', label: 'Payment required — please action invoice' },
  { id: 'select_colour', label: 'Final colour / material selection required' },
  { id: 'sign_contract', label: 'Please review and sign the agreement' },
  { id: 'confirm_schedule', label: 'Confirm start date for upcoming install' },
];

const CustomerActionPanel: React.FC<CustomerActionPanelProps> = ({ job, onUpdateJob }) => {
  const [customText, setCustomText] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  const active = job.customerActionsRequired || [];
  const activePresetIds = new Set(active.filter(a => a.preset && a.preset !== 'custom').map(a => a.preset!));

  const togglePreset = useCallback((presetId: string, label: string) => {
    const isOn = activePresetIds.has(presetId);
    const next = isOn
      ? active.filter(a => a.preset !== presetId)
      : [...active, {
          id: `act-${Date.now()}`,
          label,
          createdAt: new Date().toISOString(),
          preset: presetId,
        }];
    onUpdateJob(job.id, { customerActionsRequired: next });
  }, [active, activePresetIds, onUpdateJob, job.id]);

  const addCustom = useCallback(() => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const next = [...active, {
      id: `act-${Date.now()}`,
      label: trimmed,
      createdAt: new Date().toISOString(),
      preset: 'custom',
    }];
    onUpdateJob(job.id, { customerActionsRequired: next });
    setCustomText('');
    setIsAddingCustom(false);
  }, [customText, active, onUpdateJob, job.id]);

  const removeEntry = useCallback((id: string) => {
    const next = active.filter(a => a.id !== id);
    onUpdateJob(job.id, { customerActionsRequired: next });
  }, [active, onUpdateJob, job.id]);

  const customEntries = active.filter(a => a.preset === 'custom');

  return (
    <section className="bg-[var(--bg-primary)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden">
      <div className="px-6 py-5 border-b border-[var(--border-color)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
          <BellRing className="w-4 h-4 text-[var(--brand-gold)]" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Customer Action Required</h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
            Check a preset to push it to the customer's portal
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Preset grid */}
        <div className="space-y-1.5">
          {PRESETS.map(preset => {
            const on = activePresetIds.has(preset.id);
            return (
              <label
                key={preset.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                  on
                    ? 'bg-[var(--brand-gold)]/10 border-[var(--brand-gold)]/30'
                    : 'bg-[var(--bg-secondary)]/40 border-[var(--border-color)] hover:border-[var(--brand-gold)]/20'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                    on ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)]' : 'border-[var(--border-color)]'
                  }`}
                >
                  {on && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => togglePreset(preset.id, preset.label)}
                  className="sr-only"
                />
                <span className={`text-xs leading-snug ${on ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                  {preset.label}
                </span>
              </label>
            );
          })}
        </div>

        {/* Custom entries (already added) */}
        {customEntries.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[var(--border-color)]">
            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Custom</span>
            {customEntries.map(entry => (
              <div
                key={entry.id}
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/30"
              >
                <span className="text-xs leading-snug text-[var(--text-primary)] font-bold flex-1">{entry.label}</span>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="shrink-0 p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-rose-400 transition-all"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Custom input */}
        {isAddingCustom ? (
          <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              autoFocus
              placeholder="Type a custom action required for the customer…"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:border-[var(--brand-gold)]/40 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none"
              rows={2}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addCustom();
                }
                if (e.key === 'Escape') {
                  setIsAddingCustom(false);
                  setCustomText('');
                }
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={addCustom}
                disabled={!customText.trim()}
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--brand-gold)] text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Push to Portal
              </button>
              <button
                onClick={() => { setIsAddingCustom(false); setCustomText(''); }}
                className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingCustom(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--brand-gold)]/30 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--brand-gold)] transition-all"
          >
            <Plus className="w-3 h-3" />
            Add Custom Action
          </button>
        )}

        {active.length === 0 && !isAddingCustom && (
          <p className="text-[10px] text-[var(--text-tertiary)] text-center pt-2">
            No actions pushed — customer portal shows <strong>no action required</strong>
          </p>
        )}
      </div>
    </section>
  );
};

export default CustomerActionPanel;
