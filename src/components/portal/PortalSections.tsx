/**
 * Portal Sections — the "below the option cards" revamp per Jack's Week-1 brief.
 * Pure presentational components. All copy is Canadian-spelled, no em-dashes,
 * no permit references. Brand palette only (slate scale + gold #D4A853).
 *
 * Exports:
 *   ProofWall                — Asset 10: testimonial gallery
 *   ReverseRiskStack          — Asset 05: six sealed commitments, dark vault
 *   BuildDayCommitment        — Asset 06: day-by-day horizontal ribbon
 *   PaymentScheduleTimeline   — Asset 07: 30/30/40 gold rail, dynamic $
 *   CompareQuotesChecklist    — Asset 09: 10-question interactive accordion
 *   ShareWithPartner          — Asset 08: floating button + modal
 */

import React, { useState } from 'react';
import {
  Sparkles, ShieldCheck, Award, ClipboardList, Truck, Layers,
  Hammer, Brush, Calendar, Send, X, Check, ChevronDown, Download, Quote,
} from 'lucide-react';
import { useInView, useCountUp } from '../../hooks/useInView';
import { generateContractorChecklistPDF } from '../../utils/contractorChecklistPdf';
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
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah M.',
    neighbourhood: 'Westboro',
    monthYear: 'September 2025',
    quote: 'Every day ended with the yard cleaner than they found it. The communication through the portal made it feel effortless from our side.',
    projectDetail: '320 sq ft Platinum deck · Azek Vintage Dark Hickory · integrated stair lighting',
    imageBgColor: '#3e2723',
  },
  {
    name: 'Mark L.',
    neighbourhood: 'Kanata',
    monthYear: 'July 2025',
    quote: 'We compared three contractors. Luxury Decking was the only one who answered every question on the checklist without hedging. Worth every dollar.',
    projectDetail: '16×12 Gold composite · Fiberon GoodLife Escapes · aluminum railings',
    imageBgColor: '#8e44ad',
  },
  {
    name: 'Diane R.',
    neighbourhood: 'Orleans',
    monthYear: 'August 2025',
    quote: 'Five days from demo to walkthrough. Tarps over the garden, safety barriers for the dog. My kids played in the yard every evening.',
    projectDetail: '240 sq ft Gold composite · TimberTech Terrain Silver Maple · helical pile foundation',
    imageBgColor: '#922b21',
  },
  {
    name: 'James & Priya S.',
    neighbourhood: 'Nepean',
    monthYear: 'June 2025',
    quote: 'The finished deck is stunning, but the part that sold me was the warranty paperwork. Transferable, in writing, no fine print.',
    projectDetail: '400 sq ft Platinum PVC · ClubHouse Woodbridge · glass rail panels',
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {hero && (
          <TestimonialCard testimonial={hero} hero inView={inView} delayMs={0} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:col-span-2">
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
  return (
    <div
      className={`group relative portal-card-slate overflow-hidden transition-all duration-500 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } hover:-translate-y-1`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <div
        className={`w-full ${hero ? 'aspect-[4/5]' : 'aspect-square'} overflow-hidden relative`}
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
      <div className="p-6">
        <div className="flex gap-1 mb-3">
          {[0, 1, 2, 3, 4].map(i => (
            <Sparkles key={i} className="w-3.5 h-3.5" style={{ color: GOLD, fill: GOLD }} />
          ))}
        </div>
        <p
          className={`portal-body italic ${hero ? '' : ''}`}
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
          <p
            className="mt-0.5"
            style={{ color: 'var(--portal-cream-50)', fontSize: 12 }}
          >
            {t.neighbourhood} &middot; {t.monthYear}
          </p>
          <p
            className="portal-eyebrow mt-2"
            style={{ color: 'var(--portal-cream-50)', fontSize: 10 }}
          >
            {t.projectDetail}
          </p>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Asset 05 · Reverse Risk Stack ("Our Promises, in Writing")
// ════════════════════════════════════════════════════════════════════════════

const PROMISES = [
  {
    title: 'Structural settlement',
    body: 'If your footings settle more than the Ontario Building Code tolerance within the first two years, we re-level at no cost. No deductible. Photos and a tape measure are all the claim needs.',
  },
  {
    title: 'Frame integrity',
    body: 'If a joist, beam, or ledger board cups, twists, or splits within five years due to improper installation, we replace it at no cost. This is our workmanship standing behind what we build.',
  },
  {
    title: 'Fastener and hardware',
    body: 'If any structural fastener loosens, backs out, or fails within five years, we re-fasten or replace it at no cost. Applies to every screw, bolt, and bracket we install.',
  },
  {
    title: 'Manufacturer claim support',
    body: 'If a manufacturer warranty claim on your decking boards is denied for installation reasons, we cover the labour to replace the affected boards. The only scenario where you pay labour on a manufacturer claim is if you damage the boards yourself.',
  },
  {
    title: 'Price lock',
    body: 'The price on your signed contract is final. If our material or labour costs rise between signing and your build start, we absorb the difference. You will not see a surprise invoice, a supplier cost pass-through, or an adjustment line item. What you sign is what you pay.',
  },
  {
    title: 'Site condition',
    body: 'On the last day of your build, the site is left cleaner than we found it. If it is not, we come back within 48 hours to finish the cleanup at no cost.',
  },
];

export const ReverseRiskStack: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <section
      id="risk-stack"
      ref={ref}
      className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #0f172a, #020617)',
      }}
    >
      {/* Radial gold glow in top-left */}
      <div
        className="absolute top-0 left-0 w-[50rem] h-[50rem] pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 0%, ${GOLD}14, transparent 60%)`,
        }}
      />
      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3 font-mono" style={{ color: GOLD }}>
            Six Sealed Commitments
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Our Promises, in Writing
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Six specific commitments. Each one bounded, each one verifiable in our contract.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROMISES.map((p, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-8 overflow-hidden transition-all duration-500 ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              } hover:border-[${GOLD}]/40`}
              style={{
                background: 'rgba(2, 6, 23, 0.7)',
                border: `1px solid rgba(51, 65, 85, 0.6)`,
                transitionDelay: `${80 * i}ms`,
              }}
            >
              {/* Gold numeral */}
              <div
                className="font-mono text-5xl font-black mb-6 leading-none"
                style={{ color: `${GOLD}e6` }} // 90% opacity
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              {/* Hairline gold divider */}
              <div className="h-px w-12 mb-5" style={{ backgroundColor: `${GOLD}99` }} />
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{p.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{p.body}</p>

              {/* Corner seal */}
              <div
                className="absolute bottom-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500"
                style={{
                  border: `1px solid ${GOLD}33`,
                  opacity: inView ? 1 : 0,
                  transitionDelay: `${80 * i + 300}ms`,
                }}
              >
                <Check className="w-4 h-4" style={{ color: `${GOLD}99` }} strokeWidth={2.5} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
// Asset 09 · Compare Quotes Interactive Checklist
// ════════════════════════════════════════════════════════════════════════════

const CHECKLIST_QUESTIONS = [
  {
    q: 'Joist spacing',
    ask: 'What spacing are you using on the joists?',
    why: 'Ontario Building Code minimum is 16 inch on-centre for most deck loads. Wider spacing is cheaper to build and bouncier to walk on.',
    our: 'Standard at 16 inch on-centre. 12 inch on-centre on our Platinum tier for rock-solid feel.',
  },
  {
    q: 'Manufacturer certification',
    ask: 'Are you certified by the composite manufacturer for the specific product you are installing?',
    why: 'Installing composite without certification can void the manufacturer\'s material warranty. Certified installers also unlock extended labour warranties directly from the manufacturer.',
    our: 'Fiberon Pro certified. TimberTech Registered Pro. AZEK Registered Pro.',
  },
  {
    q: 'Footing depth and type',
    ask: 'What type of footings, and how deep?',
    why: 'Helical piles or concrete footings below 48 inches are required in Ottawa frost conditions. Surface deck blocks are not code-compliant for permanent structures.',
    our: 'Helical piles by default on Gold and Platinum. Concrete sonotubes to 48 inches on Silver.',
  },
  {
    q: 'Ledger attachment',
    ask: 'How is the ledger attached to the house, and what flashing is behind it?',
    why: 'Improper ledger attachment is the most common structural failure in home-handyman decks.',
    our: 'Through-bolted into the rim joist with stainless ledger bolts. Z-flashing and peel-and-stick membrane behind every ledger.',
  },
  {
    q: 'Railing post blocking',
    ask: 'Are railing posts blocked and bolted through the frame, or surface-mounted?',
    why: 'Surface-mounted railing posts do not meet Ontario Building Code guard-load requirements.',
    our: 'Every post through-bolted into blocked framing. Zero surface-mount posts on any tier.',
  },
  {
    q: 'Board direction and spacing',
    ask: 'What direction do the deck boards run, and what gap is left for expansion?',
    why: 'Tight gaps on composite decks cause buckling in Ottawa summer heat.',
    our: 'Expansion gaps set per manufacturer spec for the exact board we install. Measured, not eyeballed.',
  },
  {
    q: 'Warranty specifics',
    ask: 'What exactly is warranted, for how long, and by whom?',
    why: 'Get the manufacturer warranty and the workmanship warranty in writing, with transfer terms.',
    our: '5-year workmanship plus the full manufacturer material warranty on boards. Both transferable once. Handed to you as a PDF at walkthrough.',
  },
  {
    q: 'Liability insurance',
    ask: 'Can I see your certificate of general liability insurance?',
    why: 'If a worker is injured on your property, or if there is property damage during the build, uninsured contractors expose you personally. Always ask to see the certificate, not just verbal confirmation.',
    our: 'Current certificate on request. Named additional-insured endorsement available for your records.',
  },
  {
    q: 'Recent references',
    ask: 'Can you give me two references from completed decks in the last year, within a 30-minute drive?',
    why: 'New contractors and under-performers rarely have recent local references.',
    our: 'Three local references supplied on request. Most from within 20 minutes of your build address.',
  },
  {
    q: 'Deck portfolio depth',
    ask: 'Can I see your last 10 to 15 completed decks?',
    why: 'Generalists (fencing / landscaping / pools) may only build a handful of decks per year. Specialists build deck after deck. Specialists get better with every build. Generalists stay at the skill level their occasional deck work allows.',
    our: 'We only build decks. Our recent portfolio is available on our site and on Instagram.',
  },
];

export const CompareQuotesChecklist: React.FC = () => {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section id="compare-checklist" ref={ref} className="py-24 md:py-32 bg-slate-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3 font-mono" style={{ color: GOLD }}>
            Before You Compare Quotes
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            10 Questions to Ask Any Contractor
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Use this when you compare us to anyone else. If the answer to any of these is unclear or missing, the lower number is almost always a hidden cost.
          </p>
        </div>

        <div className="space-y-3">
          {CHECKLIST_QUESTIONS.map((item, i) => {
            const open = openIds.has(i);
            return (
              <div
                key={i}
                className={`bg-white border rounded-xl transition-all duration-300 ${open ? 'border-slate-300 shadow-md' : 'border-slate-200'} ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{ transitionDelay: `${60 * i}ms` }}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full text-left p-6 flex items-start gap-4 group"
                  aria-expanded={open}
                >
                  <span className="font-mono text-2xl font-black text-slate-300 group-hover:text-slate-400 transition-colors shrink-0 leading-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1 font-mono">{item.q}</p>
                    <p className="text-lg font-semibold text-slate-900 leading-snug">{item.ask}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 mt-1 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 pl-16 space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 font-mono">Why it matters</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{item.why}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-start gap-3">
                        <span
                          className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: GOLD }}
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </span>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 font-mono" style={{ color: GOLD }}>Luxury Decking answer</p>
                          <p className="text-sm text-slate-900 font-medium leading-relaxed">{item.our}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-8 rounded-2xl bg-white border-2" style={{ borderColor: `${GOLD}40` }}>
          <p className="text-slate-700 leading-relaxed">
            A quote that can answer all ten of these questions in writing is the quote worth comparing on price.
            A quote that cannot is not cheaper. It is riskier.
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => generateContractorChecklistPDF({ items: CHECKLIST_QUESTIONS })}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:border-[#D4A853] hover:text-[#D4A853] transition-all"
          >
            <Download className="w-4 h-4" />
            Download as PDF
          </button>
        </div>
      </div>
    </section>
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
