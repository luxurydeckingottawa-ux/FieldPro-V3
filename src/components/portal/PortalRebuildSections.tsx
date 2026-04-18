/**
 * Portal Rebuild Sections — five interactive components from Jack's
 * portalpagerebuild brief, refactored in Phase 2 (ARIA cohesion spec,
 * April 2026) to share the PortalSection chrome and the locked palette
 * defined in /src/styles/portal-tokens.css.
 *
 * Locked palette:
 *   --portal-gold       #D4A853
 *   --portal-gold-dim   #8a6d32   (slate-bg hover/border)
 *   --portal-navy       #0a1f3d
 *   --portal-slate-900  #0f172a
 *   --portal-cream      #faf8f2
 *   --portal-cream-deep #f0ebdf
 *   --portal-ink        #0b1220
 *
 * Rule: cream zones accent navy, slate zones accent gold. Never swap.
 * Single radius across portal: rounded-2xl (16px).
 *
 * Exports:
 *   ComparisonMeters     — animated bars, cream-deep band, navy track / gold fill
 *   PromiseShield        — full-bleed navy, hexagonal SVG shield, gold logo centre
 *   CostSlider           — cream band, interactive TCO line chart
 *   DeckAnatomy          — cream band, exploded cross-section with five hotspots
 *   ContractorQuestions  — cream-deep band, 10 flip cards (cream face / navy back)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useInView } from '../../hooks/useInView';
import { PortalSection } from './PortalSection';

// Locked palette constants (mirror /src/styles/portal-tokens.css)
const GOLD = '#D4A853';
const GOLD_DIM = '#8a6d32';
const NAVY = '#0a1f3d';
const SLATE_900 = '#0f172a';
const CREAM = '#faf8f2';
const CREAM_DEEP = '#f0ebdf';
const INK = '#0b1220';

// Neutrals used inside cards only (no band-level drift)
const GREY_MID = '#64748b';
const GREY_LIGHT = '#cbd5e1';
const RED = '#b23a3a';
const GREEN = '#3a7a3a';

// ═══════════════════════════════════════════════════════════════════════════
// Component 02 · ComparisonMeters
// ═══════════════════════════════════════════════════════════════════════════

interface MeterCell {
  value: string;
  sub?: string;
  big?: string;
  bar: number;
}
interface MeterRow {
  label: string;
  direction: 'lower-is-better' | 'higher-is-better';
  silver: MeterCell;
  gold: MeterCell;
  platinum: MeterCell;
}

const METRICS: MeterRow[] = [
  {
    label: 'Annual maintenance',
    direction: 'lower-is-better',
    silver: { value: '2 to 4 hrs', sub: 'oil and stain', bar: 95 },
    gold: { value: '30 min', sub: 'soap and water', bar: 15 },
    platinum: { value: 'Nearly zero', sub: 'debris sweep', bar: 2 },
  },
  {
    label: 'Expected longevity',
    direction: 'higher-is-better',
    silver: { value: 'years', big: '10-15', bar: 45 },
    gold: { value: 'years', big: '25-30', bar: 85 },
    platinum: { value: 'years', big: '30-50', bar: 100 },
  },
  {
    label: 'Material warranty',
    direction: 'higher-is-better',
    silver: { value: 'No material warranty', big: '0', bar: 0 },
    gold: { value: 'yrs full', big: '25', bar: 70 },
    platinum: { value: 'yrs full', big: '50', bar: 100 },
  },
  {
    label: 'Heat retention',
    direction: 'lower-is-better',
    silver: { value: 'Cool', sub: 'natural wood', bar: 35 },
    gold: { value: 'Warm', sub: 'colour-dependent', bar: 65 },
    platinum: { value: 'Cool', sub: 'heat-resistant PVC', bar: 40 },
  },
];

function barColour(direction: 'lower-is-better' | 'higher-is-better', value: number): string {
  if (direction === 'lower-is-better') {
    if (value <= 30) return GREEN;
    if (value <= 65) return GOLD;
    return RED;
  }
  if (value <= 30) return RED;
  if (value <= 65) return GOLD;
  return GREEN;
}

export const ComparisonMeters: React.FC<{
  silverPrice?: number;
  goldPrice?: number;
  platinumPrice?: number;
}> = ({ silverPrice, goldPrice, platinumPrice }) => {
  const [ref, inView] = useInView<HTMLElement>();
  const [revealedBars, setRevealedBars] = useState<boolean[]>(() => Array(METRICS.length * 3).fill(false));

  useEffect(() => {
    if (!inView) return;
    METRICS.forEach((_, rowIdx) => {
      (['silver', 'gold', 'platinum'] as const).forEach((_, colIdx) => {
        const i = rowIdx * 3 + colIdx;
        setTimeout(() => {
          setRevealedBars(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * 80);
      });
    });
  }, [inView]);

  return (
    <PortalSection
      id="comparison"
      sectionRef={ref}
      tone="cream-deep"
      logo="black"
      eyebrow="Material Comparison"
      title={<>Comparison meters, at a glance.</>}
      subtitle="The four things homeowners ask us most, rendered as visual ratios. Maintenance, expected lifespan, warranty coverage, and surface temperature, compared so you can see the trade-offs at a glance."
    >
      <div className="portal-card-cream p-8 md:p-12">
        {/* Tier headers */}
        <div
          className="hidden md:grid gap-10 pb-5 mb-6 border-b"
          style={{ borderColor: 'rgba(10,31,61,0.08)', gridTemplateColumns: '200px 1fr' }}
        >
          <div />
          <div className="grid grid-cols-3 gap-7">
            {[
              { tier: 'Silver', sub: 'Wood', dot: GREY_MID },
              { tier: 'Gold', sub: 'Composite', dot: GOLD },
              { tier: 'Platinum', sub: 'PVC', dot: NAVY },
            ].map(h => (
              <div
                key={h.tier}
                className="portal-display flex items-center gap-2.5"
                style={{ color: INK, fontSize: 20, fontStyle: 'normal', fontWeight: 600 }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.dot }} />
                {h.tier}
                <small className="portal-label" style={{ color: 'var(--portal-ink-50)' }}>
                  {h.sub}
                </small>
              </div>
            ))}
          </div>
        </div>

        {/* Meter rows */}
        <div className="flex flex-col gap-8">
          {METRICS.map((row, rIdx) => (
            <div key={rIdx} className="grid gap-10 items-center" style={{ gridTemplateColumns: '200px 1fr' }}>
              <div className="portal-label" style={{ color: INK }}>
                {row.label}
                <small
                  className="block mt-1"
                  style={{ color: 'var(--portal-ink-50)', fontSize: 10, letterSpacing: '0.08em' }}
                >
                  {row.direction === 'lower-is-better' ? 'LOWER IS BETTER' : 'HIGHER IS BETTER'}
                </small>
              </div>
              <div className="grid grid-cols-3 gap-7">
                {(['silver', 'gold', 'platinum'] as const).map((tier, cIdx) => {
                  const cell = row[tier];
                  const color = barColour(row.direction, cell.bar);
                  const shown = revealedBars[rIdx * 3 + cIdx];
                  return (
                    <div key={tier}>
                      {/* Track = navy (cream-zone accent); fill = tier colour */}
                      <div
                        className="relative h-2 overflow-hidden rounded-full"
                        style={{ backgroundColor: 'rgba(10,31,61,0.10)' }}
                      >
                        <div
                          className="absolute top-0 left-0 h-full transition-[width] duration-[1400ms] rounded-full"
                          style={{
                            backgroundColor: color,
                            width: shown ? `${cell.bar}%` : '0%',
                            transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                          }}
                        />
                      </div>
                      <div
                        className="mt-2.5"
                        style={{
                          color: INK,
                          fontFamily: 'Outfit, sans-serif',
                          fontSize: 15,
                          fontWeight: 500,
                          lineHeight: 1.25,
                        }}
                      >
                        {cell.big && (
                          <span className="portal-numeric mr-1" style={{ color: GOLD_DIM, fontSize: 22 }}>
                            {cell.big}
                          </span>
                        )}
                        {cell.value}
                        {cell.sub && (
                          <span className="ml-1.5" style={{ color: 'var(--portal-ink-50)', fontSize: 12 }}>
                            {cell.sub}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Investment row */}
          {(silverPrice || goldPrice || platinumPrice) && (
            <div
              className="grid gap-10 items-start pt-6 mt-2 border-t"
              style={{ gridTemplateColumns: '200px 1fr', borderColor: 'rgba(10,31,61,0.08)' }}
            >
              <div className="portal-label" style={{ color: INK }}>
                Investment
                <small
                  className="block mt-1"
                  style={{ color: 'var(--portal-ink-50)', fontSize: 10, letterSpacing: '0.08em' }}
                >
                  Your quoted price
                </small>
              </div>
              <div className="grid grid-cols-3 gap-7">
                {[
                  { key: 'silver', price: silverPrice, color: GREY_MID },
                  { key: 'gold', price: goldPrice, color: GOLD },
                  { key: 'platinum', price: platinumPrice, color: NAVY },
                ].map((t) => (
                  <div key={t.key}>
                    {t.price ? (
                      <div className="portal-numeric" style={{ color: t.color, fontSize: 28 }}>
                        ${t.price.toLocaleString()}
                      </div>
                    ) : (
                      <div className="portal-label" style={{ color: 'var(--portal-ink-50)' }}>
                        See card above
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalSection>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Component 03 · PromiseShield  (full-bleed navy)
// ═══════════════════════════════════════════════════════════════════════════

interface Guarantee {
  title: string;
  body: string;
  label: string;
}

const GUARANTEES: Guarantee[] = [
  { title: 'Structural settlement', body: 'If your footings settle more than the Ontario Building Code tolerance within the first two years, we re-level at no cost. No deductible. Photos and a tape measure are all the claim needs.', label: 'Settlement' },
  { title: 'Frame integrity', body: 'If a joist, beam, or ledger board cups, twists, or splits within five years due to improper installation, we replace it at no cost. This is our workmanship standing behind what we build.', label: 'Frame' },
  { title: 'Fastener and hardware', body: 'If any structural fastener loosens, backs out, or fails within five years, we re-fasten or replace it at no cost. Every screw, bolt, and bracket we install.', label: 'Hardware' },
  { title: 'Manufacturer claim support', body: 'If a manufacturer warranty claim on your decking boards is denied for installation reasons, we cover the labour to replace them. The only way you ever pay labour on a manufacturer claim is if you damaged the boards yourself.', label: 'Warranty' },
  { title: 'Price lock', body: 'The price on your signed contract is final. If our material or labour costs rise between signing and your build, we absorb the difference. No surprise invoice, no pass-through, no adjustment line. What you sign is what you pay.', label: 'Price Lock' },
  { title: 'Site condition', body: 'On the last day of your build, the site is left cleaner than we found it. If it is not, we come back within 48 hours to finish the cleanup at no cost.', label: 'Cleanup' },
];

interface ShieldSegment {
  idx: number;
  points: string;
  labelX: number;
  labelY: number;
  dotX: number;
  dotY: number;
}

function buildShieldGeometry(): { segments: ShieldSegment[]; centerHex: string } {
  const cx = 200, cy = 200, r = 160, labelR = 188, dotR = 215;
  const startAngle = -Math.PI / 2 - Math.PI / 6;
  const segments: ShieldSegment[] = [];
  for (let i = 0; i < 6; i++) {
    const a1 = startAngle + (i * Math.PI * 2) / 6;
    const a2 = startAngle + ((i + 1) * Math.PI * 2) / 6;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const mid = (a1 + a2) / 2;
    segments.push({
      idx: i,
      points: `${cx},${cy} ${x1},${y1} ${x2},${y2}`,
      labelX: cx + labelR * Math.cos(mid),
      labelY: cy + labelR * Math.sin(mid) + 4,
      dotX: cx + dotR * Math.cos(mid),
      dotY: cy + dotR * Math.sin(mid),
    });
  }
  const hR = 44;
  let hexPts = '';
  for (let i = 0; i < 6; i++) {
    const a = startAngle + (i * Math.PI * 2) / 6;
    hexPts += `${cx + hR * Math.cos(a)},${cy + hR * Math.sin(a)} `;
  }
  return { segments, centerHex: hexPts.trim() };
}

export const PromiseShield: React.FC = () => {
  const [active, setActive] = useState(0);
  const [viewed, setViewed] = useState<Set<number>>(() => new Set([0]));
  const { segments, centerHex } = useMemo(buildShieldGeometry, []);

  const activate = (idx: number) => {
    setActive(idx);
    setViewed(prev => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const current = GUARANTEES[active];
  const progressPct = (viewed.size / 6) * 100;

  return (
    <section
      id="risk-stack"
      className="portal-band-navy py-20 md:py-32 px-6 sm:px-8 relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 w-[50rem] h-[50rem] pointer-events-none"
        style={{ background: `radial-gradient(circle at 20% 0%, ${GOLD}14, transparent 60%)` }}
      />
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center">
          <span className="portal-hairline" />
          <div className="portal-eyebrow" style={{ color: GOLD_DIM }}>Our Guarantees</div>
          <h2 className="portal-display mt-3" style={{ color: 'var(--portal-cream-92)' }}>
            Our promises, as a shield.
          </h2>
          <p className="portal-subtitle mx-auto mt-4" style={{ color: 'var(--portal-cream-70)' }}>
            A numbered list of six guarantees reads as legal fine print. A shield with six segments reads as protection. The information is identical. The emotional weight is not.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mt-12" style={{ minHeight: '460px' }}>
          <div className="flex items-center justify-center">
            <svg
              viewBox="0 0 400 400"
              className="w-full max-w-[420px] h-auto"
              style={{ overflow: 'visible' }}
              aria-label="Six guarantees shield. Hover a segment to read it."
            >
              {segments.map(seg => (
                <polygon
                  key={`seg-${seg.idx}`}
                  points={seg.points}
                  style={{
                    fill: active === seg.idx ? GOLD : '#132748',
                    stroke: NAVY,
                    strokeWidth: 1.5,
                    cursor: 'pointer',
                    transition: 'fill .3s ease',
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View guarantee: ${GUARANTEES[seg.idx].title}`}
                  onMouseEnter={() => activate(seg.idx)}
                  onClick={() => activate(seg.idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      activate(seg.idx);
                    }
                  }}
                />
              ))}
              {segments.map(seg => (
                <text
                  key={`lbl-${seg.idx}`}
                  x={seg.labelX}
                  y={seg.labelY}
                  textAnchor="middle"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    fill: active === seg.idx ? GOLD : GREY_LIGHT,
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  {GUARANTEES[seg.idx].label}
                </text>
              ))}
              {segments.map(seg => (
                <circle
                  key={`dot-${seg.idx}`}
                  cx={seg.dotX}
                  cy={seg.dotY}
                  r={3}
                  style={{
                    fill: viewed.has(seg.idx) ? GOLD : GOLD_DIM,
                    opacity: viewed.has(seg.idx) ? 1 : 0.3,
                    transition: 'opacity .3s',
                  }}
                />
              ))}
              <polygon points={centerHex} style={{ fill: NAVY, stroke: GOLD, strokeWidth: 1.5 }} />
              {/* Gold logo — kept at hex centre per spec (single gold logo inside shield) */}
              <image
                href="/assets/logo-luxury-gold.png"
                x={154}
                y={178}
                width={92}
                height={44}
                preserveAspectRatio="xMidYMid meet"
                style={{ pointerEvents: 'none' }}
              />
              <title>Luxury Decking</title>
            </svg>
          </div>

          {/* Warranty detail panel — slate card spec (gold hairline top, no shadow) */}
          <div
            className="portal-card-slate p-8"
            style={{ minHeight: '280px' }}
          >
            <div
              className="portal-eyebrow flex items-center gap-3 mb-4"
              style={{ color: GOLD }}
            >
              GUARANTEE {String(active + 1).padStart(2, '0')} OF 06
              <span className="h-px w-10 inline-block" style={{ backgroundColor: GOLD }} />
            </div>
            <h3
              className="portal-display mb-4"
              style={{ color: 'var(--portal-cream-92)', fontSize: 30 }}
            >
              {current.title}
            </h3>
            <p className="portal-body" style={{ color: 'var(--portal-cream-70)' }}>
              {current.body}
            </p>
            <div
              className="mt-8 flex items-center gap-3 portal-eyebrow"
              style={{ color: GOLD }}
            >
              <span>{viewed.size} of 6</span>
              <span
                className="flex-1 max-w-[120px] h-px relative"
                style={{ backgroundColor: `${GOLD}4d` }}
              >
                <span
                  className="absolute top-0 left-0 h-full transition-[width] duration-300"
                  style={{ backgroundColor: GOLD, width: `${progressPct}%` }}
                />
              </span>
              <span>Explored</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Component 01 · CostSlider
// ═══════════════════════════════════════════════════════════════════════════

interface CostSliderConfig {
  silverBasePrice: number;
  goldBasePrice: number;
  platinumBasePrice: number;
}

export const CostSlider: React.FC<{ config?: Partial<CostSliderConfig> }> = ({ config = {} }) => {
  const C = {
    silverBasePrice: 4218,
    goldBasePrice: 8795,
    platinumBasePrice: 10541,
    silverAnnual: 180,
    silverRefinishYear: 10, silverRefinishCost: 1200,
    silverRepairYear: 15, silverRepairCost: 1800,
    silverReplaceYear: 20, silverReplaceCost: 4000,
    goldAnnual: 60,
    platinumAnnual: 25,
    maxYears: 25,
    maxY: 18000,
    ...config,
  };

  const silverCost = (y: number) => {
    let c = C.silverBasePrice + y * C.silverAnnual;
    if (y >= C.silverRefinishYear) c += C.silverRefinishCost;
    if (y >= C.silverRepairYear) c += C.silverRepairCost;
    if (y >= C.silverReplaceYear) c += C.silverReplaceCost;
    return c;
  };
  const goldCost = (y: number) => C.goldBasePrice + y * C.goldAnnual;
  const platinumCost = (y: number) => C.platinumBasePrice + y * C.platinumAnnual;

  const [year, setYear] = useState(15);
  const fmt = (n: number) => n.toLocaleString('en-CA');

  const W = 900, H = 340;
  const pad = { top: 40, right: 40, bottom: 60, left: 70 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const xFor = (y: number) => pad.left + (y / C.maxYears) * cw;
  const yFor = (v: number) => pad.top + ch - (v / C.maxY) * ch;

  const pathStr = (fn: (y: number) => number, upTo: number) => {
    let d = '';
    for (let y = 0; y <= upTo; y++) d += (y === 0 ? 'M' : 'L') + xFor(y) + ' ' + yFor(fn(y)) + ' ';
    return d;
  };

  const crossoverYear = useMemo(() => {
    for (let y = 1; y <= C.maxYears; y++) {
      if (silverCost(y) > goldCost(y) && silverCost(y - 1) <= goldCost(y - 1)) return y;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [C.silverBasePrice, C.goldBasePrice, C.silverAnnual, C.goldAnnual]);

  const slx = xFor(year);

  return (
    <PortalSection
      id="cost-slider"
      tone="cream"
      eyebrow="Cumulative Cost of Ownership"
      title={<>The cost-over-time slider.</>}
      subtitle="Drag the handle. Watch the pressure-treated wood line cross above both composite and PVC somewhere around year 16. The math that proposals try to describe in paragraphs, rendered as something you feel in your hand."
    >
      <div className="portal-card-cream p-8 md:p-12">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 340 }}>
          {[0, 1, 2, 3, 4].map(i => {
            const yy = pad.top + (i / 4) * ch;
            const v = C.maxY - (i / 4) * C.maxY;
            return (
              <g key={`grid-y-${i}`}>
                <line x1={pad.left} y1={yy} x2={pad.left + cw} y2={yy} stroke="rgba(10,31,61,0.08)" strokeWidth={0.5} />
                <text
                  x={pad.left - 12}
                  y={yy + 4}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize={10}
                  fill="rgba(11,18,32,0.5)"
                >
                  ${Math.round(v / 1000)}k
                </text>
              </g>
            );
          })}
          {[5, 10, 15, 20, 25].map(y => {
            const x = xFor(y);
            return (
              <g key={`grid-x-${y}`}>
                <line x1={x} y1={pad.top + ch} x2={x} y2={pad.top + ch + 4} stroke="rgba(11,18,32,0.4)" strokeWidth={0.6} />
                <text
                  x={x}
                  y={pad.top + ch + 20}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize={10}
                  fill="rgba(11,18,32,0.5)"
                >
                  Year {y}
                </text>
              </g>
            );
          })}
          <line x1={pad.left} y1={pad.top + ch} x2={pad.left + cw} y2={pad.top + ch} stroke="rgba(10,31,61,0.15)" strokeWidth={1} />
          <text
            x={pad.left}
            y={pad.top - 14}
            fontFamily="JetBrains Mono, monospace"
            fontSize={10}
            fill="rgba(11,18,32,0.5)"
            letterSpacing="1"
          >
            CUMULATIVE COST $
          </text>

          <line x1={slx} y1={pad.top} x2={slx} y2={pad.top + ch} stroke={GOLD} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />

          <path d={pathStr(silverCost, C.maxYears)} fill="none" stroke={GREY_MID} strokeWidth={1} opacity={0.2} strokeDasharray="2 4" />
          <path d={pathStr(goldCost, C.maxYears)} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.2} strokeDasharray="2 4" />
          <path d={pathStr(platinumCost, C.maxYears)} fill="none" stroke={NAVY} strokeWidth={1} opacity={0.2} strokeDasharray="2 4" />

          <path d={pathStr(silverCost, year)} fill="none" stroke={GREY_MID} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathStr(goldCost, year)} fill="none" stroke={GOLD} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathStr(platinumCost, year)} fill="none" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          <circle cx={xFor(year)} cy={yFor(silverCost(year))} r={4} fill={GREY_MID} />
          <circle cx={xFor(year)} cy={yFor(goldCost(year))} r={5} fill={GOLD} stroke="#fff" strokeWidth={1} />
          <circle cx={xFor(year)} cy={yFor(platinumCost(year))} r={4} fill={NAVY} />

          {crossoverYear && year >= crossoverYear && (
            <g>
              <circle cx={xFor(crossoverYear)} cy={yFor(silverCost(crossoverYear))} r={5} fill={RED} stroke="#fff" strokeWidth={2} />
              <text
                x={xFor(crossoverYear) - 10}
                y={yFor(silverCost(crossoverYear)) - 14}
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
                fontSize={10}
                fill={RED}
                fontWeight={700}
                letterSpacing="1"
              >
                CROSSOVER · YEAR {crossoverYear}
              </text>
            </g>
          )}
        </svg>

        <div
          className="mt-6 py-5 px-6 flex items-center gap-6 flex-wrap md:flex-nowrap rounded-2xl"
          style={{ backgroundColor: CREAM_DEEP }}
        >
          <span className="portal-eyebrow whitespace-nowrap" style={{ color: 'var(--portal-ink-50)' }}>
            Years of ownership
          </span>
          <input
            type="range"
            min={1}
            max={C.maxYears}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="flex-1 min-w-[200px]"
            style={{ accentColor: GOLD }}
            aria-label="Years of ownership"
          />
          <span className="portal-numeric whitespace-nowrap min-w-[90px]" style={{ color: INK, fontSize: 22 }}>
            {year} <span className="portal-label" style={{ color: 'var(--portal-ink-50)' }}>yrs</span>
          </span>
        </div>

        <div className="flex gap-7 mt-5 flex-wrap">
          {[
            { color: GREY_MID, label: 'SILVER · Pressure-treated wood' },
            { color: GOLD, label: 'GOLD · Composite (Fiberon)' },
            { color: NAVY, label: 'PLATINUM · PVC (Woodbridge)' },
          ].map(l => (
            <div
              key={l.label}
              className="flex items-center gap-2.5 portal-eyebrow"
              style={{ color: INK, letterSpacing: '0.04em' }}
            >
              <span className="inline-block w-3.5 h-0.5" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        <div
          className="grid md:grid-cols-3 gap-0.5 mt-8 p-0.5 rounded-2xl"
          style={{ backgroundColor: CREAM_DEEP }}
        >
          {[
            { tier: 'Silver · Wood', total: silverCost(year), color: RED, border: GREY_MID },
            { tier: 'Gold · Composite', total: goldCost(year), color: GOLD_DIM, border: GOLD },
            { tier: 'Platinum · PVC', total: platinumCost(year), color: NAVY, border: NAVY },
          ].map(t => (
            <div
              key={t.tier}
              className="bg-white p-6 rounded-xl"
              style={{ borderTop: `3px solid ${t.border}` }}
            >
              <div className="portal-eyebrow mb-2" style={{ color: 'var(--portal-ink-50)' }}>{t.tier}</div>
              <div className="portal-body mb-3.5" style={{ color: INK, fontSize: 13 }}>
                Cumulative cost of ownership
              </div>
              <div className="portal-numeric" style={{ color: t.color, fontSize: 30 }}>
                ${fmt(Math.round(t.total))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalSection>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Component 05 · DeckAnatomy
// ═══════════════════════════════════════════════════════════════════════════

interface AnatomyLayer {
  title: string;
  sub: string;
  spec: string;
  why: string;
}

const LAYERS: AnatomyLayer[] = [
  {
    title: 'Decking boards',
    sub: 'The surface you walk on',
    spec: 'Fiberon Goodlife · hidden fastener · 3/8" gap',
    why: "Hidden fasteners mean no screws to back out and no black rust stains bleeding through in year three. The 3/8 inch expansion gap is set for Ottawa's temperature swing, not rule-of-thumb. Most competitors tighten this gap to make the deck look cleaner on day one. We hold the spec for what happens on day 3,000.",
  },
  {
    title: 'Joists',
    sub: 'The structural base of your walking surface',
    spec: '2×8 PT · 16" on-centre · joist tape on tier upgrades',
    why: 'We space joists at 16 inches on-centre as a hard rule, which is 20 percent tighter than the code minimum some contractors use. The result is a deck that feels solid under foot, not bouncy. On upgraded tiers, joist tops are sealed with butyl tape so rot never starts at the fastener holes.',
  },
  {
    title: 'Beam',
    sub: 'The horizontal load-bearing member',
    spec: 'Triple-ply 2×10 PT · through-bolted to posts',
    why: 'The beam carries the entire deck to its posts. We triple-ply for redundancy and through-bolt (not toe-nail) to posts so the connection is rated for structural load and lateral shift. The difference shows up in year 15 when other decks start to tilt.',
  },
  {
    title: 'Posts',
    sub: 'The vertical load-bearing columns',
    spec: '6×6 PT · post-base bracket to footing · wind-rated',
    why: 'Six-by-six is deliberate overkill for typical residential spans. We over-spec so your posts have capacity for everything from snow load to the wind shift on an Ottawa January night. Each post meets its footing in a galvanized post-base bracket, not buried in concrete, so water can drain and the post does not rot from the base up.',
  },
  {
    title: 'Footings',
    sub: 'The anchor below frost line',
    spec: 'Helical piles or concrete to 48"+ · engineered',
    why: 'In Ottawa, the frost line is 48 inches. Any footing shallower than that will heave and lower with every freeze-thaw cycle, and your deck will tilt. We install helicals below frost or pour concrete footings to frost depth, with engineered drawings for every build. This is why our structural settlement guarantee is something we can actually stand behind.',
  },
];

const HOTSPOT_POSITIONS = [
  { cx: 280, cy: 85 },
  { cx: 280, cy: 180 },
  { cx: 280, cy: 234 },
  { cx: 288, cy: 300 },
  { cx: 288, cy: 350 },
];

export const DeckAnatomy: React.FC = () => {
  const [active, setActive] = useState(0);
  const L = LAYERS[active];

  return (
    <PortalSection
      id="deck-anatomy"
      tone="cream"
      eyebrow="Structural Standards"
      title={<>Deck anatomy, explored.</>}
      subtitle="The strongest differentiator is the structural spec. Hidden in text it goes unread. Clickable as an exploded diagram, each layer earns its own moment. Explore at your own pace."
    >
      <div className="portal-card-cream p-8 md:p-12 relative">
        <div className="portal-eyebrow mb-5" style={{ color: NAVY }}>
          Click any navy pin
        </div>
        <div
          className="grid lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16 items-center"
          style={{ minHeight: '480px' }}
        >
          <div className="flex items-center justify-center">
            <svg
              viewBox="0 0 560 400"
              className="w-full max-w-[560px] h-auto"
              style={{ overflow: 'visible' }}
              aria-label="Exploded deck cross-section. Click any navy pin to explore a layer."
            >
              {/* Decking boards */}
              <g>
                {[60, 76, 92, 108].map(y => (
                  <rect key={y} x={80} y={y} width={400} height={14} fill={CREAM_DEEP} stroke={GOLD_DIM} strokeWidth={0.5} />
                ))}
              </g>
              {/* Joists */}
              <g>
                {[100, 170, 240, 310, 380, 450].map(x => (
                  <rect key={x} x={x} y={150} width={14} height={60} fill={GREY_MID} />
                ))}
              </g>
              {/* Beam */}
              <rect x={80} y={225} width={400} height={18} fill="#334155" />
              {/* Posts */}
              {[115, 280, 430].map(x => (
                <rect key={x} x={x} y={265} width={16} height={70} fill={INK} />
              ))}
              {/* Footings */}
              {[103, 268, 418].map(x => (
                <rect key={x} x={x} y={340} width={40} height={20} fill={GOLD_DIM} />
              ))}
              {/* Hotspots (navy callout pins on cream — spec rule) */}
              {HOTSPOT_POSITIONS.map((p, idx) => {
                const isActive = active === idx;
                return (
                  <g key={idx}>
                    {isActive && (
                      <circle cx={p.cx} cy={p.cy} r={5} fill="none" stroke={NAVY} strokeWidth={1}>
                        <animate attributeName="r" from={5} to={16} dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from={0.8} to={0} dur="2.4s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle
                      cx={p.cx}
                      cy={p.cy}
                      r={isActive ? 8 : 6}
                      fill={NAVY}
                      stroke="#fff"
                      strokeWidth={2}
                      style={{
                        cursor: 'pointer',
                        filter: isActive ? `drop-shadow(0 0 12px ${NAVY}99)` : undefined,
                        transition: 'all .3s',
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View ${LAYERS[idx].title.toLowerCase()} layer`}
                      onClick={() => setActive(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActive(idx);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Detail panel — cream card spec */}
          <div
            className="bg-white p-8 rounded-2xl"
            style={{ borderLeft: `3px solid ${NAVY}`, minHeight: '340px' }}
          >
            <div className="portal-eyebrow mb-3.5" style={{ color: NAVY }}>
              Layer {String(active + 1).padStart(2, '0')} of 05
            </div>
            <h3
              className="portal-display mb-2"
              style={{ color: INK, fontSize: 30 }}
            >
              {L.title}
            </h3>
            <div
              className="mb-5"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontStyle: 'italic',
                fontSize: 18,
                color: 'var(--portal-ink-70)',
                lineHeight: 1.3,
              }}
            >
              {L.sub}
            </div>
            <div className="py-3.5 border-t border-b mb-5" style={{ borderColor: 'rgba(10,31,61,0.08)' }}>
              <div className="portal-eyebrow mb-1" style={{ color: 'var(--portal-ink-50)' }}>
                Our spec
              </div>
              <div
                className="portal-body"
                style={{ color: GOLD_DIM, fontWeight: 500, fontSize: 16 }}
              >
                {L.spec}
              </div>
            </div>
            <p className="portal-body" style={{ color: 'var(--portal-ink-70)' }}>
              {L.why}
            </p>
          </div>
        </div>
      </div>
    </PortalSection>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Component 04 · ContractorQuestions  (flip cards: cream-deep face, navy back)
// ═══════════════════════════════════════════════════════════════════════════

interface FlipQ {
  num: string;
  title: string;
  why: string;
  ans: string;
}

const QUESTIONS: FlipQ[] = [
  { num: '01', title: 'Joist spacing', why: 'Ontario Building Code minimum is 16 inch on-centre. Wider spacing is cheaper to build and bouncier to walk on.', ans: '16" on-centre, always' },
  { num: '02', title: 'Manufacturer certification', why: 'Installing composite without certification can void the manufacturer warranty on your deck, and forfeit any extended labour coverage.', ans: 'Fiberon Pro, TimberTech Registered Pro, AZEK Registered Pro, TrexPro' },
  { num: '03', title: 'Footing depth', why: 'Helicals below 48" or concrete to frost-depth are code in Ottawa. Surface deck blocks are not.', ans: 'Helicals to 48" or concrete, frost-depth compliant' },
  { num: '04', title: 'Ledger attachment', why: 'The most common structural failure in home-handyman decks. Improper flashing creates hidden rot.', ans: 'Through-bolted, flashed, inspected' },
  { num: '05', title: 'Railing post blocking', why: 'Surface-mounted railing posts do not meet Ontario guard-load requirements.', ans: 'Bolted through the frame, blocked for guard-load' },
  { num: '06', title: 'Board spacing', why: 'Tight gaps on composite cause buckling in Ottawa summer heat. Too loose looks sloppy.', ans: '3/8" gap, set for Ottawa temperature swing' },
  { num: '07', title: 'Warranty specifics', why: 'Get the manufacturer warranty and the workmanship warranty in writing, with transfer terms clearly stated.', ans: '25-50 yr material + 5 yr workmanship, transferable' },
  { num: '08', title: 'Liability insurance', why: 'If a worker is hurt on your property without insurance, you are personally exposed.', ans: '$5M general liability, certificate on file' },
  { num: '09', title: 'Recent references', why: 'New or underperforming contractors rarely have recent local references within 30 minutes.', ans: '180+ Ottawa builds, references by neighbourhood' },
  { num: '10', title: 'Portfolio depth', why: 'Most Ottawa contractors mix decks with fences, pools, or landscaping. Specialists build deck after deck.', ans: 'Specialists · we build decks only, year-round' },
];

export const ContractorQuestions: React.FC<{ onDownloadPDF?: () => void }> = ({ onDownloadPDF }) => {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggleFlip = (i: number) => {
    setFlipped(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <PortalSection
      id="compare-checklist"
      tone="cream-deep"
      eyebrow="Questions to Ask Every Contractor"
      title={<>Comparison, as a deck.</>}
      subtitle="Ten questions every homeowner should ask every contractor. Each card flips to reveal why the question matters and how Luxury Decking answers it. Bring these to your other quotes."
    >
      <div className="portal-card-cream p-8 md:p-10">
        <div className="portal-eyebrow mb-5" style={{ color: NAVY }}>
          Click any card to flip
        </div>

        <div
          className="overflow-x-auto -mx-8 px-8 pb-6 snap-x snap-mandatory"
          style={{ scrollbarColor: `${GOLD} #eceae4` }}
        >
          <div className="flex gap-5 pt-1">
            {QUESTIONS.map((q, i) => {
              const isFlipped = flipped.has(i);
              return (
                <div
                  key={q.num}
                  className="flex-[0_0_260px] snap-start cursor-pointer"
                  style={{ height: 340, perspective: '1200px' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Question ${q.num}: ${q.title}. Click to reveal answer.`}
                  onClick={() => toggleFlip(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleFlip(i);
                    }
                  }}
                >
                  <div
                    className="relative w-full h-full transition-transform duration-700"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Front — cream-deep face with gold hairline edge */}
                    <div
                      className="absolute inset-0 p-8 flex flex-col rounded-2xl"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        backgroundColor: CREAM_DEEP,
                        borderTop: `1px solid ${GOLD}`,
                        border: `1px solid rgba(10,31,61,0.08)`,
                        borderTopColor: GOLD,
                      }}
                    >
                      <div
                        className="portal-numeric mb-auto"
                        style={{ color: GOLD, fontSize: 48 }}
                      >
                        {q.num}
                      </div>
                      <div
                        className="portal-display mb-3"
                        style={{
                          color: INK,
                          fontSize: 22,
                          fontStyle: 'normal',
                          fontWeight: 600,
                          lineHeight: 1.2,
                        }}
                      >
                        {q.title}
                      </div>
                      <div
                        className="portal-eyebrow flex items-center gap-2"
                        style={{ color: 'var(--portal-ink-50)' }}
                      >
                        Tap to reveal
                        <span style={{ color: NAVY }}>↻</span>
                      </div>
                    </div>

                    {/* Back — navy, gold hairline edge */}
                    <div
                      className="absolute inset-0 p-8 flex flex-col rounded-2xl"
                      style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        backgroundColor: NAVY,
                        border: `1px solid rgba(212,168,83,0.25)`,
                        borderTop: `1px solid ${GOLD}`,
                      }}
                    >
                      <div className="portal-eyebrow mb-4" style={{ color: GOLD }}>
                        Why it matters
                      </div>
                      <div
                        className="portal-display mb-3"
                        style={{
                          color: 'var(--portal-cream-92)',
                          fontSize: 18,
                          fontStyle: 'normal',
                          fontWeight: 600,
                          lineHeight: 1.25,
                        }}
                      >
                        {q.title}
                      </div>
                      <p
                        className="portal-body mb-auto"
                        style={{
                          color: 'var(--portal-cream-70)',
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {q.why}
                      </p>
                      <div
                        className="pt-4 flex items-start gap-2 portal-eyebrow"
                        style={{ borderTop: `1px solid ${GOLD}33`, color: GOLD }}
                      >
                        <span>✓</span>
                        <span>{q.ans}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {onDownloadPDF && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onDownloadPDF}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold border transition-all"
              style={{
                borderColor: 'rgba(10,31,61,0.15)',
                backgroundColor: '#fff',
                color: NAVY,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = GOLD;
                e.currentTarget.style.color = GOLD;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(10,31,61,0.15)';
                e.currentTarget.style.color = NAVY;
              }}
            >
              Download as PDF
            </button>
          </div>
        )}
      </div>
    </PortalSection>
  );
};

// Silence unused-import warnings for the slate constant — kept for palette parity
void SLATE_900;
void CREAM;
