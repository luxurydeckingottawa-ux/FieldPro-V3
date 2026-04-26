/**
 * InstaQuoteReportingView
 * -----------------------
 * Per-touch metrics for the InstaQuote Nurture campaign, sourced from the
 * `instaquote_email_events` table that the SendGrid Event Webhook fills.
 *
 * Sections:
 *   1. Per-touch table (Touch 1..7): sent count, open rate, click rate,
 *      reply rate
 *   2. End-to-end summary: leads in pipeline, bookings, conversion %,
 *      avg days to booking
 *   3. "Touch that triggered the booking" sorted bar chart
 *   4. Last 7 days of inbound events as a simple log
 *
 * RLS scopes everything to the user's org via `get_user_org_id()`.
 * Reads from:
 *   - instaquote_email_events  (open/click/bounce/unsub)
 *   - jobs                      (lead pipeline state, drip_campaign metadata)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PipelineStage } from '../types';

interface InstaQuoteReportingViewProps {
  onBack: () => void;
}

interface EmailEvent {
  id: string;
  lead_id: string | null;
  touch_id: string | null;
  event_type: string;
  sg_email: string | null;
  url: string | null;
  occurred_at: string;
}

interface LeadRow {
  id: string;
  client_email: string | null;
  pipeline_stage: string;
  created_at: string;
  drip_campaign: { startedAt?: string; sentMessages?: Array<{ touchId: string; sentAt: string }> } | null;
}

const TOUCH_IDS = [
  'iq-t1-email', 'iq-t2-email', 'iq-t3-email', 'iq-t4-email',
  'iq-t5-email', 'iq-t6-email', 'iq-t7-email',
];

const INSTAQUOTE_STAGES = [
  PipelineStage.INSTAQUOTE_LEAD,
  PipelineStage.INSTAQUOTE_TOUCH_1, PipelineStage.INSTAQUOTE_TOUCH_2,
  PipelineStage.INSTAQUOTE_TOUCH_3, PipelineStage.INSTAQUOTE_TOUCH_4,
  PipelineStage.INSTAQUOTE_TOUCH_5, PipelineStage.INSTAQUOTE_TOUCH_6,
  PipelineStage.INSTAQUOTE_TOUCH_7,
  PipelineStage.INSTAQUOTE_LONG_TERM, PipelineStage.INSTAQUOTE_WON,
  PipelineStage.INSTAQUOTE_CLOSED,
];

function pct(num: number, denom: number): string {
  if (!denom) return '0%';
  return `${Math.round((num / denom) * 100)}%`;
}

const InstaQuoteReportingView: React.FC<InstaQuoteReportingViewProps> = ({ onBack }) => {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      if (!isSupabaseConfigured() || !supabase) {
        setError('Supabase is not configured. Reports require a live connection.');
        setLoading(false);
        return;
      }
      try {
        const [evRes, leadRes] = await Promise.all([
          supabase
            .from('instaquote_email_events')
            .select('id,lead_id,touch_id,event_type,sg_email,url,occurred_at')
            .order('occurred_at', { ascending: false })
            .limit(2000),
          supabase
            .from('jobs')
            .select('id,client_email,pipeline_stage,created_at,drip_campaign')
            .eq('lead_source', 'instaquote')
            .in('pipeline_stage', INSTAQUOTE_STAGES),
        ]);
        if (cancelled) return;
        if (evRes.error) throw evRes.error;
        if (leadRes.error) throw leadRes.error;
        setEvents((evRes.data || []) as EmailEvent[]);
        setLeads((leadRes.data || []) as LeadRow[]);
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || 'Failed to load reports.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Per-touch metrics
  const perTouch = useMemo(() => {
    return TOUCH_IDS.map((touchId, idx) => {
      const touchEvents = events.filter(e => e.touch_id === touchId);
      // "sent" is approximated by counting unique recipients of any event
      // (delivered/open/click/bounce). True sent count would come from the
      // outbound mail log; fall back to lead count where touch was completed.
      const completed = leads.filter(l =>
        (l.drip_campaign?.sentMessages || []).some(m => m.touchId === touchId)
      ).length;

      const opens = new Set(touchEvents.filter(e => e.event_type === 'open').map(e => e.sg_email)).size;
      const clicks = new Set(touchEvents.filter(e => e.event_type === 'click').map(e => e.sg_email)).size;
      // Replies: not yet wired (Inbound Parse out of scope). Show as -.
      return {
        touch: idx + 1,
        sent: completed,
        opens,
        clicks,
        openRate: pct(opens, completed),
        clickRate: pct(clicks, completed),
        replyRate: '-',
      };
    });
  }, [events, leads]);

  // End-to-end metrics
  const endToEnd = useMemo(() => {
    const totalLeads = leads.length;
    const wonLeads = leads.filter(l => l.pipeline_stage === PipelineStage.INSTAQUOTE_WON);
    const conversion = pct(wonLeads.length, totalLeads);

    let totalDays = 0;
    let countedForDays = 0;
    for (const l of wonLeads) {
      const start = l.drip_campaign?.startedAt || l.created_at;
      // Approximate "booked at" using the latest click event on this lead.
      const clicks = events.filter(e => e.lead_id === l.id && e.event_type === 'click');
      const lastClick = clicks[0];
      if (start && lastClick) {
        const days = (new Date(lastClick.occurred_at).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0) {
          totalDays += days;
          countedForDays += 1;
        }
      }
    }
    const avgDaysToBooking = countedForDays > 0
      ? (totalDays / countedForDays).toFixed(1)
      : '-';

    return {
      totalLeads,
      bookings: wonLeads.length,
      conversion,
      avgDaysToBooking,
    };
  }, [leads, events]);

  // Touch number that triggered each booking (heuristic: most recent click
  // touch_id before the lead landed in INSTAQUOTE_WON)
  const triggerBuckets = useMemo(() => {
    const buckets = new Array(7).fill(0);
    const wonLeads = leads.filter(l => l.pipeline_stage === PipelineStage.INSTAQUOTE_WON);
    for (const l of wonLeads) {
      const clicks = events
        .filter(e => e.lead_id === l.id && e.event_type === 'click' && e.touch_id)
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      const triggered = clicks[0]?.touch_id;
      if (!triggered) continue;
      const m = triggered.match(/^iq-t(\d+)-email$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 7) buckets[n - 1] += 1;
      }
    }
    return buckets;
  }, [leads, events]);

  // Last 7 days of inbound events
  const recentEvents = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return events
      .filter(e => new Date(e.occurred_at).getTime() >= cutoff)
      .slice(0, 100);
  }, [events]);

  const maxBucket = Math.max(1, ...triggerBuckets);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[var(--brand-gold)] hover:bg-[var(--brand-gold)]/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/10 text-[var(--brand-gold)] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">InstaQuote Reports</h1>
              <p className="text-sm text-[var(--text-secondary)]">Open, click, and conversion metrics for the 7-touch nurture sequence.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl transition-all"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm font-bold">{error}</div>
        </div>
      )}

      {loading && !error && (
        <div className="p-8 text-center text-[var(--text-secondary)]">Loading reports...</div>
      )}

      {!loading && !error && (
        <>
          {/* End-to-end KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Leads in pipeline" value={String(endToEnd.totalLeads)} />
            <KpiCard label="Consultations booked" value={String(endToEnd.bookings)} />
            <KpiCard label="Conversion rate" value={endToEnd.conversion} />
            <KpiCard label="Avg days to booking" value={String(endToEnd.avgDaysToBooking)} />
          </div>

          {/* Per-touch table */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Per-touch performance</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Reply rate requires Inbound Parse and is not yet wired.</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                  <th className="px-6 py-3 font-bold">Touch</th>
                  <th className="px-6 py-3 font-bold text-right">Sent</th>
                  <th className="px-6 py-3 font-bold text-right">Opens</th>
                  <th className="px-6 py-3 font-bold text-right">Open rate</th>
                  <th className="px-6 py-3 font-bold text-right">Clicks</th>
                  <th className="px-6 py-3 font-bold text-right">Click rate</th>
                  <th className="px-6 py-3 font-bold text-right">Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {perTouch.map(row => (
                  <tr key={row.touch} className="border-b border-[var(--border-color)] last:border-b-0">
                    <td className="px-6 py-3 font-bold text-[var(--text-primary)]">Touch {row.touch}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--text-secondary)]">{row.sent}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--text-secondary)]">{row.opens}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--text-primary)]">{row.openRate}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--text-secondary)]">{row.clicks}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--text-primary)]">{row.clickRate}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-[var(--text-tertiary)]">{row.replyRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Touch that triggered the booking */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Touch that triggered the booking</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Sorted by most recent booking-link click before each lead moved to Won.</p>
            <div className="space-y-3">
              {triggerBuckets.map((count, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-bold text-[var(--text-secondary)]">Touch {idx + 1}</div>
                  <div className="flex-1 h-6 bg-[var(--border-color)]/40 rounded-md overflow-hidden">
                    <div
                      className="h-full bg-[var(--brand-gold)] transition-all"
                      style={{ width: `${(count / maxBucket) * 100}%` }}
                    />
                  </div>
                  <div className="w-12 text-right tabular-nums text-sm font-bold text-[var(--text-primary)]">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent events log */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-color)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Last 7 days</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{recentEvents.length} inbound events from SendGrid.</p>
            </div>
            <div className="max-h-96 overflow-auto">
              {recentEvents.length === 0 && (
                <div className="px-6 py-6 text-sm text-[var(--text-secondary)]">
                  No events received in the last 7 days. Verify the SendGrid webhook is registered against
                  https://fieldprov3.netlify.app/api/sendgrid-events and that SENDGRID_WEBHOOK_PUBLIC_KEY is set in Netlify.
                </div>
              )}
              {recentEvents.length > 0 && (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-color)]">
                      <th className="px-6 py-2 font-bold">When</th>
                      <th className="px-6 py-2 font-bold">Event</th>
                      <th className="px-6 py-2 font-bold">Touch</th>
                      <th className="px-6 py-2 font-bold">Email</th>
                      <th className="px-6 py-2 font-bold">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map(ev => (
                      <tr key={ev.id} className="border-b border-[var(--border-color)] last:border-b-0">
                        <td className="px-6 py-2 text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(ev.occurred_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-2 font-bold text-[var(--text-primary)]">{ev.event_type}</td>
                        <td className="px-6 py-2 text-[var(--text-secondary)]">{ev.touch_id || '-'}</td>
                        <td className="px-6 py-2 text-[var(--text-secondary)] truncate max-w-[200px]">{ev.sg_email || '-'}</td>
                        <td className="px-6 py-2 text-[var(--text-secondary)] truncate max-w-[300px]">{ev.url || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const KpiCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5">
    <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-tertiary)] mb-1">{label}</div>
    <div className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
  </div>
);

export default InstaQuoteReportingView;
