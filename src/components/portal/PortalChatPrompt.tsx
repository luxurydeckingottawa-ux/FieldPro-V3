import React from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { ChatSession, Job } from '../../types';
import { COMPANY } from '../../config/company';
import { format } from 'date-fns';

/**
 * PortalChatPrompt
 * ─────────────────────────────────────────────────────────────────────────
 * Lives on the customer's production portal (Status tab) where the old
 * AIObjectionHelper used to sit. Looks like a chat-interface preview —
 * the same thread the office sees in their Chat view, so when the
 * customer sends a message here it lands directly in Jack's inbox.
 *
 * Composition:
 *   • Avatar + "we're online" status
 *   • Last office reply preview (if any) — otherwise a welcome bubble
 *   • Suggested quick-question chips (click → pre-fills modal input)
 *   • Primary CTA → opens the existing Chat modal
 *
 * Props are fully optional for safety — if no session exists yet the
 * panel still renders and the chat modal seeds one on first open
 * (see App.tsx:184 ensure-session effect).
 */

interface PortalChatPromptProps {
  job: Job;
  currentSession?: ChatSession;
  /** Opens the existing Chat modal in CustomerPortalView. */
  onOpenChat: () => void;
  /** Optional — if provided, lets us pre-seed the input box with a preset
   *  question before opening the modal. */
  onPrefillMessage?: (text: string) => void;
}

/** Preset questions a homeowner would ask during the build/production
 *  phase. Kept short (chip-friendly) and actionable. Jack can rename
 *  these later via a settings surface — for now they're hardcoded. */
const SUGGESTED_QUESTIONS: string[] = [
  'When will my project start?',
  "What's the plan if it rains?",
  'Do I need to be home during the build?',
  'Who will be on-site?',
  'Can I change a material selection?',
];

const PortalChatPrompt: React.FC<PortalChatPromptProps> = ({
  job,
  currentSession,
  onOpenChat,
  onPrefillMessage,
}) => {
  // Find the most recent message FROM the office (not from the client)
  // so we can show a reply preview in the bubble. Falls back to a
  // welcome bubble when the thread is empty.
  const lastOfficeMessage = React.useMemo(() => {
    if (!currentSession?.messages?.length) return null;
    for (let i = currentSession.messages.length - 1; i >= 0; i -= 1) {
      const m = currentSession.messages[i];
      if (!m.isFromClient) return m;
    }
    return null;
  }, [currentSession]);

  const firstName = (job.clientName || '').split(' ')[0] || 'there';

  const handleChipClick = (text: string) => {
    if (onPrefillMessage) onPrefillMessage(text);
    onOpenChat();
  };

  return (
    <div className="bg-[#1A1A1A] text-white rounded-3xl overflow-hidden shadow-xl border border-white/5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-[var(--brand-gold)]/10 flex items-center justify-center border border-[var(--brand-gold)]/20">
            <MessageSquare className="w-5 h-5 text-[var(--brand-gold)]" />
            {/* online pulse dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 ring-2 ring-[#1A1A1A]" />
            </span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-gold)] mb-0.5">
              Have a Question?
            </p>
            <h3 className="text-base font-bold tracking-tight">
              Chat with our team
            </h3>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Online
        </div>
      </div>

      {/* ── Chat Bubble Preview ────────────────────────────────────── */}
      <div className="px-6 py-5 bg-[#121212]/60 space-y-3">
        {/* Office bubble (welcome or latest reply) */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--brand-gold)]/15 border border-[var(--brand-gold)]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand-gold)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
              {COMPANY.name} Team
              {lastOfficeMessage && (
                <span className="ml-2 text-white/30 normal-case tracking-normal font-semibold">
                  {format(new Date(lastOfficeMessage.timestamp), 'MMM d · h:mm a')}
                </span>
              )}
            </p>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="text-sm leading-relaxed text-white/90">
                {lastOfficeMessage
                  ? lastOfficeMessage.text
                  : `Hi ${firstName}! We're here to help. Ask us anything about your project — we reply fast.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Suggested Questions ────────────────────────────────────── */}
      <div className="px-6 py-5 border-t border-white/10">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-3">
          Quick Questions
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleChipClick(q)}
              className="group text-left text-xs font-semibold text-white/85 bg-white/5 hover:bg-[var(--brand-gold)]/15 border border-white/10 hover:border-[var(--brand-gold)]/40 transition-all rounded-full px-3.5 py-2 active:scale-[0.98]"
            >
              <span className="opacity-60 group-hover:opacity-100 transition-opacity mr-1.5">
                +
              </span>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Primary CTA ────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-t border-white/10 bg-black/30">
        <button
          type="button"
          onClick={onOpenChat}
          className="w-full flex items-center justify-center gap-2 bg-[var(--brand-gold)] hover:bg-[var(--brand-gold-dark)] text-[#0a0a0a] font-bold text-sm py-3.5 rounded-2xl shadow-lg shadow-[var(--brand-gold)]/20 transition-all active:scale-[0.99]"
        >
          <Send className="w-4 h-4" />
          Open Chat
        </button>
        <p className="text-[10px] text-white/40 text-center mt-2 font-medium">
          Replies usually within the business day
        </p>
      </div>
    </div>
  );
};

export default PortalChatPrompt;
