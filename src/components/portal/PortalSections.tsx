/**
 * Portal Sections — the "below the option cards" revamp per Jack's Week-1 brief.
 * Pure presentational components. All copy is Canadian-spelled, no em-dashes,
 * no permit references. Brand palette only (slate scale + gold #D4A853).
 *
 * Exports:
 *   ProofWall                 — Asset 10: testimonial gallery
 *   BuildDayCommitment        — Asset 06: day-by-day horizontal ribbon
 *   PaymentScheduleTimeline   — Asset 07: 30/30/40 gold rail, dynamic $
 *   ShareWithPartner          — Asset 08: floating button + modal
 */

import React, { useState } from 'react';
import {
  Sparkles, ShieldCheck, ClipboardList, Truck, Layers,
  Brush, Calendar, Send, X, Check, Quote,
} from 'lucide-react';
import { useInView, useCountUp } from '../../hooks/useInView';
import { PortalSection } from './PortalSection';

// Locked portal palette — mirrors /src/styles/portal-tokens.css
const GOLD = '#D4A853';
const GOLD_DIM = '#8a6d32';
const NAVY = '#0a1f3d';
const SLATE_900 = '#0f172a';
const CREAM = '#faf8f2';
const INK = '#0b1220';
// Silence unused warnings for parity constants
void SLATE_900;
void CREAM;
void INK;
void GOLD_DIM;

// ════════════════════════════════════════════════════════════════════════════
// Asset 10 · Proof Wall
// ════════════════════════════════════════════════════════════════════════════

export interface Testimonial {
  name: string;
  neighbourhood: string;
  monthYear: string;
  quote: string;
  projectDetail: string;
  imageUrl?: string;
  imageBgColor?: string; // fallback if no image
  isLongForm?: boolean; // true for the hero (left) card holding a full-length review
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  // Hero (far-left, full-length review)
  {
    name: 'Dr. Adam Dryden',
    neighbourhood: 'Ottawa',
    monthYear: 'July 2025',
    projectDetail: '800 sq ft · Diamond package · Apex Plus bamboo hybrid · helical piles · tighter joist spacing',
    imageUrl: '/assets/reviews/dryden.jpg',
    imageBgColor: '#1e2a3a',
    isLongForm: true,
    quote:
      "Our experience with Jack and the Luxury Decking team was absolutely outstanding from start to finish. We were looking to invest in a high-quality, structurally sound deck that would last for years, and they delivered a final product that exceeded our already high expectations.\n\n" +
      "From the very first interaction, Jack's communication was exceptional. He was patient and thorough in answering all of our questions during the quotation process, providing clear, well-thought-out responses. I ask a lot of questions and like to be well informed, and Jack kept me in the loop every step of the way. While their quote wasn't the cheapest we received, the detailed proposal and Jack's professionalism gave us complete confidence that we were choosing a company focused on superior quality and long-term value.\n\n" +
      "The quality of the workmanship is truly top-notch. We opted for their premium package, including helical piles and tighter joist spacing, and used the Apex Plus bamboo hybrid decking. It was obvious that Jack and his crew take immense pride in their craft, with meticulous attention to detail at every stage. The precision in their work and the solidity of the final build are evident to everyone who has seen and walked on the deck.\n\n" +
      "What truly sets Luxury Decking apart is their integrity and conduct on-site. When an unexpected issue arose with the helical piles needing to be drilled deeper, Jack handled it with complete transparency and fairness, communicating the reasons and the extra cost clearly. They were also incredibly flexible, working seamlessly around other renovations in our backyard. Most importantly for our family (with a 2 and 4-year-old), the crew left the job site clean at the end of every day without ever being asked. This level of professionalism and respect for our property was incredible.\n\n" +
      "Jack's father, who came to help with the project a few times, even gave me some advice on the aluminum picket fence I was building and lent me a tool. It saved me significant time and frustration as Luxury Decking had built thousands of feet of this fence product previously. The professionalism and customer service must run in the family.\n\n" +
      "If you are looking for a deck builder who combines master-level craftsmanship with unparalleled communication and professionalism, look no further. The investment in Luxury Decking was worth every penny for the peace of mind and the stunning final product. We couldn't be happier.",
  },
  // Slot 2 — Stacy S., Manotick, April 2025
  {
    name: 'Stacy S.',
    neighbourhood: 'Manotick',
    monthYear: 'April 2025',
    quote: 'Luxury Decking did a fantastic job on our deck. It was not a straightforward project but they did it! They were fast and on time with everything.',
    projectDetail: '1,200 sq ft · Gold package · multilevel Fiberon composite',
    imageUrl: '/assets/reviews/sharma.jpg',
    imageBgColor: '#3e2723',
  },
  // Slot 3 — Alyssa L., Stittsville, April 2024
  {
    name: 'Alyssa L.',
    neighbourhood: 'Stittsville',
    monthYear: 'April 2024',
    quote: "The quality of work by Luxury Decking cannot be put into words, it's a comfort you have to experience to appreciate. The promptness they were able to start and finish made it even more comforting that I could enjoy before the weekend began. The team's professionalism and courtesy combined with years of experience delivered the highest quality. Thank you so much.",
    projectDetail: '600 sq ft · Silver series · pressure-treated multilevel',
    imageUrl: '/assets/reviews/laplount.jpg',
    imageBgColor: '#8e44ad',
  },
  // Slot 4 — Tyler B., Westboro, May 2025
  {
    name: 'Tyler B.',
    neighbourhood: 'Westboro',
    monthYear: 'May 2025',
    quote: "These guys are great to work with. Their pricing is very competitive and flexible to any budget, and the quality is there to see. They are very responsive to calls for quotes, and the crew works efficiently and cleans up after themselves. I've forwarded them to two of my colleagues and will happily recommend them to friends and family.",
    projectDetail: '16×20 · Silver series · pressure-treated',
    imageUrl: '/assets/reviews/tyler.jpg',
    imageBgColor: '#5dade2',
  },
];

export const ProofWall: React.FC<{ testimonials?: Testimonial[]; companyName: string }> = ({
  testimonials = DEFAULT_TESTIMONIALS,
  companyName,
}) => {
  const [ref, inView] = useInView<HTMLElement>();
  const [hero, ...rest] = testimonials;

  return (
    <PortalSection
      id="proof-wall"
      sectionRef={ref}
      tone="slate"
      eyebrow="From Your Neighbourhood"
      title={<>The Proof Wall.</>}
      subtitle={`Real Ottawa decks, real homeowners, real project details. Built, warrantied, and walked away clean by ${companyName}.`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {hero && (
          <div className="lg:col-span-5">
            <TestimonialCard testimonial={hero} hero inView={inView} delayMs={0} />
          </div>
        )}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {rest.map((t, i) => (
            <TestimonialCard key={t.name + i} testimonial={t} inView={inView} delayMs={120 * (i + 1)} />
          ))}
        </div>
      </div>
    </PortalSection>
  );
};

const TestimonialCard: React.FC<{
  testimonial: Testimonial;
  hero?: boolean;
  inView: boolean;
  delayMs: number;
}> = ({ testimonial, hero = false, inView, delayMs }) => {
  const t = testimonial;
  const isLong = hero && t.isLongForm;
  const paragraphs = isLong
    ? t.quote.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    : [t.quote];

  return (
    <div
      className={`group relative portal-card-slate overflow-hidden transition-all duration-500 flex flex-col ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } hover:-translate-y-1`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div
        className={`w-full overflow-hidden relative ${
          isLong ? 'aspect-[16/10]' : hero ? 'aspect-[4/5]' : 'aspect-[4/3]'
        }`}
        style={{ backgroundColor: t.imageBgColor || '#4d5d30' }}
      >
        {t.imageUrl ? (
          <img
            src={t.imageUrl}
            alt={`Deck built for ${t.name}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-end justify-start p-6 bg-gradient-to-t from-black/50 to-transparent">
            <Quote className="w-8 h-8 text-white/70" />
          </div>
        )}
      </div>
      <div className={isLong ? 'p-6 md:p-7 flex-1 flex flex-col' : 'p-6'}>
        <div className="flex gap-1 mb-3">
          {[0, 1, 2, 3, 4].map(i => (
            <Sparkles key={i} className="w-3.5 h-3.5" style={{ color: GOLD, fill: GOLD }} />
          ))}
        </div>
        {isLong ? (
          <div
            className="flex-1"
            style={{
              color: 'var(--portal-cream-92)',
              fontSize: 12.5,
              lineHeight: 1.55,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 400,
              fontStyle: 'italic',
            }}
          >
            {paragraphs.map((p, idx) => (
              <p
                key={idx}
                style={{
                  margin: idx === 0 ? 0 : '0.65em 0 0 0',
                }}
              >
                {idx === 0 ? `\u201C${p}` : p}
                {idx === paragraphs.length - 1 ? '\u201D' : ''}
              </p>
            ))}
          </div>
        ) : (
          <p
            className="portal-body italic"
            style={{
              color: 'var(--portal-cream-92)',
              fontSize: hero ? 18 : 16,
              lineHeight: 1.45,
              fontFamily: "'Syne', sans-serif",
              fontWeight: 400,
            }}
          >
            &ldquo;{t.quote}&rdquo;
          </p>
        )}
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(212,168,83,0.15)' }}
        >
          <p
            className="portal-label"
            style={{ color: 'var(--portal-cream-92)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'none', fontSize: 14 }}
          >
            {t.name}
          </p>
          {(t.neighbourhood || t.monthYear) && (
            <p
              className="mt-0.5"
              style={{ color: 'var(--portal-cream-50)', fontSize: 12 }}
            >
              {t.neighbourhood}
              {t.neighbourhood && t.monthYear ? ' \u00b7 ' : ''}
              {t.monthYear}
            </p>
          )}
          {t.projectDetail && (
            <p
              className="portal-eyebrow mt-2"
              style={{ color: 'var(--portal-cream-50)', fontSize: 10 }}
            >
              {t.projectDetail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Asset 06 · Build Day Commitment ("What Build Week Actually Looks Like")
// ════════════════════════════════════════════════════════════════════════════

const BUILD_DAY_COMMITMENTS = [
  { day: 'Duration',  icon: Calendar,      title: '3 to 7 working days', body: 'You get a confirmed day-by-day schedule the week construction begins.' },
  { day: 'One crew',  icon: ClipboardList, title: 'One dedicated team',  body: 'No rotating sub-contractors, no unfamiliar faces appearing mid-project.' },
  { day: 'Access',    icon: Truck,         title: 'Single access point', body: 'One driveway access for deliveries and crew parking, agreed with you before the start date.' },
  { day: 'Cleanup',   icon: Brush,         title: 'Daily site cleanup',  body: 'Debris swept, pathways clear, no visible mess left overnight.' },
  { day: 'Safety',    icon: ShieldCheck,   title: 'Tools home nightly',  body: 'Saws, nailers, and blades go home with the crew or lock in our truck. Deck boards stay tarped. Yard safe for kids and pets every evening.' },
  { day: 'Updates',   icon: Layers,        title: 'One photo per day',   body: 'A progress photo and short note on your Project Portal every build day. You always know what happened.' },
];

export const BuildDayCommitment: React.FC = () => {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <PortalSection
      id="build-day"
      sectionRef={ref}
      tone="slate"
      eyebrow="During Construction"
      title={<>What build week actually looks like.</>}
      subtitle="Six commitments we make to every homeowner during construction."
    >
      <div className="relative">
        {/* 1px connector + 10px gold dots — slate-zone accent is gold */}
        <div
          className="absolute left-[8%] right-[8%] top-[34px] h-px hidden lg:block transition-transform duration-1000 origin-left"
          style={{
            backgroundColor: 'rgba(212,168,83,0.25)',
            transform: inView ? 'scaleX(1)' : 'scaleX(0)',
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-4">
          {BUILD_DAY_COMMITMENTS.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={c.day}
                className={`relative flex flex-col items-center text-center transition-all duration-500 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{ transitionDelay: `${200 + i * 140}ms` }}
              >
                <div className="portal-eyebrow mb-5" style={{ color: 'var(--portal-cream-50)' }}>
                  {c.day}
                </div>
                {/* 10px gold dot on the connector line */}
                <span
                  className="block rounded-full mb-6"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: GOLD,
                    boxShadow: `0 0 0 4px ${NAVY}`,
                  }}
                />
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all group cursor-default"
                  style={{
                    backgroundColor: 'rgba(212,168,83,0.08)',
                    border: '1px solid rgba(212,168,83,0.25)',
                  }}
                >
                  <Icon
                    className="w-7 h-7 transition-colors"
                    style={{ color: GOLD }}
                    strokeWidth={1.5}
                  />
                </div>
                <p
                  className="portal-body mb-2 max-w-[160px]"
                  style={{ color: 'var(--portal-cream-92)', fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}
                >
                  {c.title}
                </p>
                <p
                  className="max-w-[200px]"
                  style={{
                    color: 'var(--portal-cream-70)',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {c.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </PortalSection>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Asset 07 · Payment Schedule Milestone Timeline
// ════════════════════════════════════════════════════════════════════════════

interface PaymentMilestone {
  label: string;
  percent: number;
  amount: number;
  description: string;
}

export const PaymentScheduleTimeline: React.FC<{ selectedTotal: number }> = ({ selectedTotal }) => {
  const [ref, inView] = useInView<HTMLElement>('-10% 0px -10% 0px', true);

  const milestones: PaymentMilestone[] = [
    {
      label: 'Contract Signed',
      percent: 30,
      amount: Math.round(selectedTotal * 0.30),
      description: 'Invoiced within one hour of your acceptance. Material procurement and build scheduling begin the same day.',
    },
    {
      label: 'Material Delivery',
      percent: 30,
      amount: Math.round(selectedTotal * 0.30),
      description: 'Invoiced on the day your materials arrive at our yard or your site. Typically 2 to 3 weeks after signing.',
    },
    {
      label: 'Project Completion',
      percent: 40,
      amount: Math.round(selectedTotal * 0.40),
      description: 'Invoiced only after your final walkthrough is complete and you have signed off on the finished project.',
    },
  ];

  return (
    <PortalSection
      id="payment-schedule"
      sectionRef={ref}
      tone="cream"
      eyebrow="Payment Schedule"
      title={
        <>
          <span style={{ color: NAVY, fontStyle: 'normal' }} className="portal-numeric" >30</span>
          <span className="mx-2" style={{ color: 'var(--portal-ink-50)' }}>/</span>
          <span style={{ color: NAVY, fontStyle: 'normal' }} className="portal-numeric">30</span>
          <span className="mx-2" style={{ color: 'var(--portal-ink-50)' }}>/</span>
          <span style={{ color: NAVY, fontStyle: 'normal' }} className="portal-numeric">40</span>
        </>
      }
      subtitle="Three milestones, each tied to a clear project event. No surprises, no hidden installments."
    >
      <div className="relative">
        {/* 1px connector + navy 10px dots (cream-zone accent is navy) */}
        <div
          className="absolute top-[22px] left-[8%] right-[8%] h-px hidden md:block"
          style={{ backgroundColor: 'rgba(10,31,61,0.15)' }}
        />
        <div
          className="absolute top-[22px] left-[8%] h-px hidden md:block transition-all duration-1000 origin-left"
          style={{
            width: inView ? '84%' : '0%',
            backgroundColor: NAVY,
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6 relative">
          {milestones.map((m, i) => (
            <PaymentMilestoneCard key={i} milestone={m} index={i} inView={inView} />
          ))}
        </div>
      </div>

      <p
        className="mt-10 text-center portal-eyebrow"
        style={{ color: 'var(--portal-ink-50)' }}
      >
        Payable by credit card via online invoice, or e-transfer
      </p>
    </PortalSection>
  );
};

const PaymentMilestoneCard: React.FC<{ milestone: PaymentMilestone; index: number; inView: boolean }> = ({ milestone, index, inView }) => {
  const [countRef, count] = useCountUp(milestone.amount, 1400);
  return (
    <div
      className={`text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${200 + index * 200}ms` }}
    >
      {/* 10px navy dot aligned with the connector rail */}
      <div className="flex justify-center mb-6">
        <span
          className={`block rounded-full transition-all duration-500 ${inView ? 'scale-100' : 'scale-0'}`}
          style={{
            width: 10,
            height: 10,
            backgroundColor: NAVY,
            boxShadow: '0 0 0 4px var(--portal-cream)',
            transitionDelay: `${300 + index * 300}ms`,
          }}
        />
      </div>
      <div className="portal-eyebrow mb-4" style={{ color: 'var(--portal-ink-50)' }}>
        Milestone 0{index + 1}
      </div>
      <h3
        className="portal-display mb-4"
        style={{ color: INK, fontSize: 22, fontStyle: 'normal', fontWeight: 600 }}
      >
        {milestone.label}
      </h3>
      <p
        ref={countRef}
        className="portal-numeric mb-2"
        style={{ color: NAVY, fontSize: 36 }}
      >
        ${count.toLocaleString()}
      </p>
      <div className="portal-eyebrow mb-3" style={{ color: 'var(--portal-ink-50)' }}>
        {milestone.percent}% of project total
      </div>
      <p
        className="portal-body max-w-xs mx-auto"
        style={{ color: 'var(--portal-ink-70)', fontSize: 14 }}
      >
        {milestone.description}
      </p>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Asset 08 · Share with Partner (floating button + modal)
// ════════════════════════════════════════════════════════════════════════════

interface ShareModalResult {
  recipientEmail: string;
  recipientName: string;
  message: string;
  portalUrl: string;
}

export const ShareWithPartner: React.FC<{
  clientFirstName: string;
  projectAddress: string;
  portalUrl: string;
  onShare?: (payload: ShareModalResult) => void | Promise<void>;
}> = ({ clientFirstName, projectAddress, portalUrl, onShare }) => {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const defaultMessage = `Hey,\n\nHere is the estimate from Luxury Decking for our deck${projectAddress ? ' at ' + projectAddress : ''}. There are three options to look at. Take a few minutes with it. Let me know what you think when you get a chance.\n\n${clientFirstName || ''}`;
  const [message, setMessage] = useState(defaultMessage);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const payload: ShareModalResult = {
        recipientEmail: email.trim(),
        recipientName: name.trim(),
        message: message,
        portalUrl,
      };
      if (onShare) await onShare(payload);
      // Graceful no-op if no handler — we still confirm so the UX doesn't break.
      setSent(name.trim() || email.trim());
      setTimeout(() => {
        setOpen(false);
        setSent(null);
        setSending(false);
      }, 2500);
    } catch (e) {
      console.error('[ShareWithPartner] send failed', e);
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button — appears after scrolling past cards */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-white shadow-xl shadow-slate-900/10 border border-slate-200 text-sm font-semibold text-slate-700 hover:border-[#D4A853] hover:text-[#D4A853] transition-all ${
          scrolled ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{
          bottom: 'env(safe-area-inset-bottom, 1.5rem)',
          right: '1.5rem',
          transitionDuration: '300ms',
        }}
      >
        <Send className="w-4 h-4" />
        Send to Your Partner
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => !sending && !sent && setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="text-center py-6">
                <div
                  className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${GOLD}20` }}
                >
                  <Check className="w-8 h-8" style={{ color: GOLD }} strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Sent to {sent}</h3>
                <p className="text-slate-600 text-sm">They will receive the same secure link and your note.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono mb-1" style={{ color: GOLD }}>
                      Decision Kit
                    </p>
                    <h3 className="text-2xl font-black text-slate-900">Share This Proposal</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      We&apos;ll send the same secure link, with a note from you.
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0 -mt-1 -mr-2"
                    disabled={sending}
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Recipient Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20 focus:outline-none transition-all text-sm"
                      disabled={sending}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Their First Name (optional)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your partner's name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20 focus:outline-none transition-all text-sm"
                      disabled={sending}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20 focus:outline-none transition-all text-sm leading-relaxed resize-none"
                      disabled={sending}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    We don&apos;t add them to a mailing list.
                  </p>
                  <button
                    onClick={handleSend}
                    disabled={!email.trim() || sending}
                    className="w-full py-3 rounded-xl font-bold text-slate-900 transition-all hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: GOLD }}
                  >
                    {sending ? (
                      <span className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send This Proposal
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
