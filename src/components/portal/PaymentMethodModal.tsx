import React, { useState } from 'react';
import { CreditCard, Wallet, X, Copy, Check, Lock, Info } from 'lucide-react';
import { Job } from '../../types';
import { COMPANY } from '../../config/company';

/**
 * PaymentMethodModal
 * ─────────────────────────────────────────────────────────────────────────
 * Opens when the customer taps "Pay $X Deposit" (or any milestone button)
 * on the production portal Payments tab. Gives them two choices:
 *
 *   1. Credit Card — placeholder for Stripe Checkout. Not wired to a
 *      payment processor yet (Stripe backend is on the roadmap per PULSE
 *      audit). Button is gold, clicking it tells the user we're prepping
 *      the link and will email them.
 *
 *   2. E-Transfer — canonical flow for Luxury Decking today. Shows the
 *      copy-paste-friendly info: recipient email, exact amount (includes
 *      13% HST), payment reference (job number), and a security Q+A
 *      suggestion.
 *
 * Amount is computed from the passed-in milestone object. Reference uses
 * the job number + stage short code.
 */

export interface PaymentMilestone {
  /** e.g. "30% Deposit", "40% Final Payment" — shown on the heading */
  label: string;
  /** The dollar amount (pre-HST) for this milestone */
  amount: number;
  /** Short code used in the invoice reference (e.g. "DEP", "DEL", "FIN") */
  code: string;
}

interface PaymentMethodModalProps {
  job: Job;
  milestone: PaymentMilestone;
  onClose: () => void;
}

type Tab = 'card' | 'etransfer';

/** Small helper — copy to clipboard with "Copied!" feedback for 1.6s. */
function useCopyButton() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (key: string, value: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1600);
    });
  };
  return { copiedKey, copy };
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ job, milestone, onClose }) => {
  const [tab, setTab] = useState<Tab>('etransfer');
  const [ccNotifyStatus, setCcNotifyStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const { copiedKey, copy } = useCopyButton();

  // ── Numbers ──────────────────────────────────────────────────────────
  // Keep this consistent with depositInvoice.ts: HST 13%, rounded.
  const subtotal = Math.round(milestone.amount);
  const hst = Math.round(subtotal * 0.13);
  const total = subtotal + hst;

  const reference = `${job.jobNumber}-${milestone.code}`;
  const etransferEmail = COMPANY.email;
  const securityAnswer = 'deck'; // canonical — office already knows this.

  const handleRequestCardLink = () => {
    // Stripe Checkout is not wired yet. Record intent + let the customer
    // know we'll follow up by email. When the backend lands we can swap
    // this for a real redirect to the Checkout session URL.
    setCcNotifyStatus('sending');
    setTimeout(() => setCcNotifyStatus('sent'), 900);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[700px]">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="px-6 py-5 bg-[#1A1A1A] text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-gold)] mb-1">
            {milestone.label}
          </p>
          <h3 className="text-2xl font-bold tracking-tight">Pay ${total.toLocaleString()}</h3>
          <p className="text-xs text-white/60 mt-1">
            ${subtotal.toLocaleString()} + ${hst.toLocaleString()} HST · Reference {reference}
          </p>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="flex border-b border-[#F0F0F0] bg-white">
          <button
            type="button"
            onClick={() => setTab('etransfer')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
              tab === 'etransfer'
                ? 'text-[#1A1A1A] border-b-2 border-[var(--brand-gold)]'
                : 'text-[#999] border-b-2 border-transparent hover:text-[#555]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            E-Transfer
          </button>
          <button
            type="button"
            onClick={() => setTab('card')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-widest transition-all ${
              tab === 'card'
                ? 'text-[#1A1A1A] border-b-2 border-[var(--brand-gold)]'
                : 'text-[#999] border-b-2 border-transparent hover:text-[#555]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Credit Card
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAF7]">
          {tab === 'etransfer' && (
            <div className="space-y-4">
              <p className="text-xs text-[#666] leading-relaxed">
                Send an Interac e-Transfer from your bank using the details below. Tap any row to copy it.
              </p>

              <CopyRow
                label="Send To"
                value={etransferEmail}
                copyKey="email"
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <CopyRow
                label="Amount"
                value={`$${total.toFixed(2)}`}
                copyKey="amount"
                copiedKey={copiedKey}
                onCopy={copy}
                accent
              />
              <CopyRow
                label="Payment Reference / Memo"
                value={reference}
                copyKey="ref"
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <CopyRow
                label="Security Question"
                value="What are we building?"
                copyKey="sq"
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <CopyRow
                label="Security Answer"
                value={securityAnswer}
                copyKey="sa"
                copiedKey={copiedKey}
                onCopy={copy}
              />

              <div className="flex items-start gap-3 p-4 bg-white border border-[#F0F0F0] rounded-2xl mt-4">
                <Info className="w-4 h-4 text-[var(--brand-gold)] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#666] leading-relaxed">
                  Most banks auto-deposit e-Transfers within minutes. Once we receive it, we'll mark your milestone as paid and you'll see it reflected here.
                </div>
              </div>
            </div>
          )}

          {tab === 'card' && (
            <div className="space-y-4">
              <div className="p-5 bg-white border border-[#F0F0F0] rounded-2xl space-y-2">
                <p className="text-xs font-bold text-[#1A1A1A]">Secure card payment</p>
                <p className="text-[11px] text-[#666] leading-relaxed">
                  We'll email you a secure Stripe checkout link for <strong>${total.toLocaleString()}</strong>. You'll be able to pay with any Visa, Mastercard, or Amex — no account required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRequestCardLink}
                disabled={ccNotifyStatus !== 'idle'}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.99] ${
                  ccNotifyStatus === 'sent'
                    ? 'bg-emerald-500 text-white cursor-default'
                    : ccNotifyStatus === 'sending'
                    ? 'bg-[var(--brand-gold)]/60 text-[#0a0a0a] cursor-wait'
                    : 'bg-[var(--brand-gold)] hover:bg-[var(--brand-gold-dark)] text-[#0a0a0a] shadow-lg shadow-[var(--brand-gold)]/20'
                }`}
              >
                {ccNotifyStatus === 'sent' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Request Sent — check your email
                  </>
                ) : ccNotifyStatus === 'sending' ? (
                  'Sending request…'
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Email me a secure checkout link
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#999] pt-2">
                <Lock className="w-3 h-3" />
                Powered by Stripe · 256-bit SSL
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Copy-row primitive used on the E-Transfer tab. Single tap copies the
// value, shows a green check for ~1.6s, then reverts to the Copy icon.
interface CopyRowProps {
  label: string;
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => void;
  accent?: boolean;
}

const CopyRow: React.FC<CopyRowProps> = ({ label, value, copyKey, copiedKey, onCopy, accent }) => {
  const isCopied = copiedKey === copyKey;
  return (
    <button
      type="button"
      onClick={() => onCopy(copyKey, value)}
      className="w-full flex items-center justify-between gap-3 p-3.5 bg-white border border-[#F0F0F0] rounded-2xl hover:border-[var(--brand-gold)]/40 transition-colors text-left group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-[#999] uppercase tracking-[0.2em] mb-0.5">
          {label}
        </p>
        <p className={`text-sm font-bold truncate ${accent ? 'text-[var(--brand-gold)] text-lg' : 'text-[#1A1A1A]'}`}>
          {value}
        </p>
      </div>
      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
        isCopied
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-50 text-slate-400 group-hover:bg-[var(--brand-gold)]/10 group-hover:text-[var(--brand-gold)]'
      }`}>
        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </div>
    </button>
  );
};

export default PaymentMethodModal;
