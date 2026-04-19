import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, Loader2, Phone, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * iPhone-style SMS thread that lives on the office-side customer job file.
 * Shows the full message history (both directions) with this customer's phone
 * number and lets an admin send a fresh text straight from the job file.
 *
 * Thread source = `incoming_messages` table. Inbound rows are inserted by the
 * Twilio webhook (incoming-sms.js). Outbound rows are inserted by
 * send-sms.js after a successful Twilio send (direction='outbound').
 */

interface ThreadRow {
  id: string;
  from_number: string | null;
  to_number: string | null;
  message_body: string;
  received_at: string;
  direction: 'inbound' | 'outbound';
  read?: boolean;
}

interface CustomerChatThreadProps {
  clientName?: string;
  clientPhone?: string;
  /** Job ID is not required for functionality — but we pass it so the header
   *  can show a tiny context line if desired. */
  jobId?: string;
}

const normalizePhone = (p?: string | null) => (p || '').replace(/\D/g, '').slice(-10);

const formatTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) {
      return `Yesterday ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;

const CustomerChatThread: React.FC<CustomerChatThreadProps> = ({ clientName, clientPhone }) => {
  const [messages, setMessages] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const phoneKey = useMemo(() => normalizePhone(clientPhone), [clientPhone]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Fetch thread whenever the customer phone changes
  useEffect(() => {
    if (!phoneKey || phoneKey.length < 10 || !isSupabaseConfigured() || !supabase) {
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      // We look up by the 10-digit tail because stored numbers vary between
      // E.164 (+1613...) and 10-digit or 11-digit formats. PostgREST doesn't
      // support regex on two columns cheaply, so we do a like match on both.
      const likePattern = `%${phoneKey}%`;
      const { data, error: queryErr } = await supabase!
        .from('incoming_messages')
        .select('id, from_number, to_number, message_body, received_at, direction, read')
        .or(`from_number.ilike.${likePattern},to_number.ilike.${likePattern}`)
        .order('received_at', { ascending: true })
        .limit(300);

      if (cancelled) return;
      if (queryErr) {
        console.warn('[CustomerChatThread] load error:', queryErr);
        setError('Could not load messages');
        setMessages([]);
      } else {
        setMessages((data as ThreadRow[]) || []);
      }
      setLoading(false);
      scrollToBottom();
    })();

    // Realtime subscription so new inbound/outbound rows show instantly.
    if (!supabase) return;
    const channel = supabase
      .channel(`chat-thread-${phoneKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incoming_messages' },
        (payload) => {
          const row = payload.new as ThreadRow;
          const from = normalizePhone(row.from_number);
          const to = normalizePhone(row.to_number);
          if (from !== phoneKey && to !== phoneKey) return;
          setMessages(prev => {
            if (prev.find(m => m.id === row.id)) return prev;
            return [...prev, row];
          });
          scrollToBottom();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
    };
  }, [phoneKey, scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [expanded, scrollToBottom]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !clientPhone || sending) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch('/.netlify/functions/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INTERNAL_SECRET ? { 'X-Internal-Secret': INTERNAL_SECRET } : {}),
        },
        body: JSON.stringify({ to: clientPhone, message: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || `Send failed (${res.status})`);
      }
      setDraft('');
      // Optimistic append — realtime subscription will dedupe by id if the
      // server row arrives before this component unmounts.
      setMessages(prev => [...prev, {
        id: `optimistic-${Date.now()}`,
        from_number: null,
        to_number: clientPhone,
        message_body: body,
        received_at: new Date().toISOString(),
        direction: 'outbound',
        read: true,
      }]);
      scrollToBottom();
    } catch (err) {
      console.warn('[CustomerChatThread] send failed:', err);
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter(m => m.direction === 'inbound' && !m.read).length;

  if (!clientPhone) {
    return (
      <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] p-6">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <Phone className="w-4 h-4" />
          <p className="text-[11px] font-bold uppercase tracking-widest">
            No phone on file — add one to start a text conversation.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[2rem] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/30 flex items-center justify-center text-[var(--brand-gold)]">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-gold)] mb-0.5">
              Text Thread
            </h3>
            <p className="text-sm font-black text-[var(--text-primary)] tracking-tight">
              {clientName || 'Customer'} <span className="text-[var(--text-secondary)] font-bold">· {clientPhone}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest">
              {unreadCount} New
            </span>
          )}
          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
            {expanded ? 'Collapse' : `${messages.length} msg${messages.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-color)]">
          {/* Message list — iMessage styling */}
          <div
            ref={listRef}
            className="max-h-[420px] overflow-y-auto px-6 py-5 space-y-2 bg-[var(--bg-primary)]/40"
          >
            {loading ? (
              <div className="flex items-center justify-center py-10 text-[var(--text-secondary)]">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-secondary)]">
                <MessageCircle className="w-7 h-7 mx-auto mb-2 opacity-50" />
                <p className="text-[11px] font-bold uppercase tracking-widest">No messages yet</p>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Start the conversation below.</p>
              </div>
            ) : (
              messages.map((m, idx) => {
                const outbound = m.direction === 'outbound';
                const prev = messages[idx - 1];
                const showTimestamp = !prev ||
                  (new Date(m.received_at).getTime() - new Date(prev.received_at).getTime()) > 10 * 60 * 1000;
                return (
                  <div key={m.id}>
                    {showTimestamp && (
                      <div className="text-center my-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">
                          {formatTime(m.received_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-3xl text-sm leading-snug whitespace-pre-wrap break-words shadow-lg ${
                          outbound
                            ? 'bg-[var(--brand-gold)] text-black rounded-br-md font-medium'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-color)]'
                        }`}
                      >
                        {m.message_body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          <div className="px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/60">
            {error && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Text ${clientName?.split(' ')[0] || 'customer'}…`}
                className="flex-1 resize-none bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-gold)]/50 max-h-32"
                style={{ minHeight: '42px' }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="h-[42px] px-4 rounded-2xl bg-[var(--brand-gold)] text-black font-black text-[10px] uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
            <p className="mt-2 text-[9px] text-[var(--text-tertiary)] uppercase tracking-widest font-black">
              Sent from your Twilio line — customer sees it as a regular text.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CustomerChatThread;
