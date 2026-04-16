import React, { useState, useEffect, useMemo } from 'react';
import type { PricingTier, Dimensions } from '../EstimatorCalculatorView';

/* ------------------------------------------------------------------ */
/*  Framing option data                                                */
/* ------------------------------------------------------------------ */

interface FramingOption {
  id: string;
  pricingId: string | null;
  name: string;
  advantage: string;
  description: string;
  joistCount: number;
  heightMul: number;
  material: 'wood' | 'fiberglass';
  badge: string | null;
  priceDelta: number;
}

const OPTIONS: FramingOption[] = [
  { id: 'std', pricingId: null, name: '2\u00d78 PT \u00b7 16" OC', advantage: 'Ontario Building Code standard. Included with every deck.', description: 'Standard pressure-treated 2\u00d78 framing at 16-inch on-centre spacing. Meets Ontario Building Code for residential decks up to 14-foot spans. Included with every project.', joistCount: 11, heightMul: 1, material: 'wood', badge: 'INCLUDED', priceDelta: 0 },
  { id: '8-12', pricingId: 'upgrade_2x8_12', name: '2\u00d78 PT \u00b7 12" OC', advantage: '33% more joists \u2014 reduces bounce underfoot.', description: 'Closer joist spacing eliminates flex and bounce, especially with composite decking. Recommended for hot tubs, outdoor kitchens, or diagonal board patterns.', joistCount: 15, heightMul: 1, material: 'wood', badge: null, priceDelta: 1.95 },
  { id: '10-16', pricingId: 'upgrade_2x10_16', name: '2\u00d710 PT \u00b7 16" OC', advantage: '28% deeper joists \u2014 longer spans, less flex.', description: 'Larger 2\u00d710 joists span further without mid-span support. Ideal for elevated decks or spans over 14 feet.', joistCount: 11, heightMul: 1.3, material: 'wood', badge: null, priceDelta: 4.49 },
  { id: '10-12', pricingId: 'upgrade_2x10_12', name: '2\u00d710 PT \u00b7 12" OC', advantage: 'Maximum wood frame \u2014 zero bounce.', description: 'The strongest conventional wood frame. Deeper joists at tighter spacing \u2014 feels like a concrete patio underfoot.', joistCount: 15, heightMul: 1.3, material: 'wood', badge: null, priceDelta: 6.49 },
  { id: 'fg', pricingId: 'fiberglass_framing', name: 'Fiberglass Composite', advantage: 'Will not rot, warp, or split. Lifetime warranty.', description: 'Owens Corning fiberglass composite joists. Immune to moisture, insects, and UV. Zero maintenance for the life of the structure.', joistCount: 11, heightMul: 1.3, material: 'fiberglass', badge: 'PREMIUM', priceDelta: 29.95 },
];

/* ------------------------------------------------------------------ */
/*  Wood grain CSS gradient (repeating pattern)                        */
/* ------------------------------------------------------------------ */

const woodGrain = (base: string, light: string, dark: string) =>
  `repeating-linear-gradient(
    90deg,
    ${base} 0px, ${base} 3px,
    ${light} 3px, ${light} 5px,
    ${base} 5px, ${base} 11px,
    ${dark} 11px, ${dark} 12px,
    ${base} 12px, ${base} 18px,
    ${light} 18px, ${light} 19px,
    ${base} 19px, ${base} 24px
  )`;

const WOOD_TOP_BG = woodGrain('#C9A96E', '#D4B87A', '#B89858');
const WOOD_FRONT_BG = woodGrain('#9B7E52', '#A68A5E', '#8B6E42');
const WOOD_SIDE_BG = '#7D6544';
const FG_TOP_BG = woodGrain('#4FA87A', '#5AB888', '#3F9868');
const FG_FRONT_BG = woodGrain('#3A7D5D', '#448D6A', '#306D4D');
const FG_SIDE_BG = '#2E6B4A';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  selectedOption: PricingTier | null;
  dimensions: Dimensions;
  onSelectOption: (id: string) => void;
  getImpactValue: (id: string) => number;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const FramingVisualizer: React.FC<Props> = ({ selectedOption, dimensions, onSelectOption, getImpactValue }) => {
  const activeId = selectedOption?.id ?? null;
  const active = OPTIONS.find(o => o.pricingId === activeId) ?? OPTIONS[0];

  const [desc, setDesc] = useState(active.description);
  const [vis, setVis] = useState(true);
  useEffect(() => {
    setVis(false);
    const t = setTimeout(() => { setDesc(active.description); setVis(true); }, 140);
    return () => clearTimeout(t);
  }, [active.description]);

  const select = (o: FramingOption) => {
    if (o.pricingId === null) { if (activeId !== null) onSelectOption('__deselect__'); }
    else onSelectOption(o.pricingId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* 3D Frame */}
        <div style={{
          flex: '1 1 62%', minWidth: 0, background: 'rgba(255,255,255,0.015)',
          borderRadius: 10, border: '1px solid rgba(212,168,83,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflow: 'hidden', perspective: 900,
        }}>
          <Frame3D count={active.joistCount} hMul={active.heightMul} mat={active.material} />
        </div>

        {/* Cards */}
        <div style={{ flex: '0 0 310px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', minHeight: 0 }}>
          {OPTIONS.map(o => {
            const on = o.pricingId === activeId || (o.pricingId === null && activeId === null);
            const imp = o.pricingId ? getImpactValue(o.pricingId) : 0;
            return (
              <button key={o.id} onClick={() => select(o)} aria-pressed={on} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 8, border: 'none', borderLeft: on ? '3px solid #D4A853' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', height: 68, flexShrink: 0,
                transition: 'all 200ms ease',
                background: on ? 'rgba(212,168,83,0.07)' : 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: on ? '#E8E0D4' : 'rgba(232,224,212,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
                    {o.badge && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase' as const, whiteSpace: 'nowrap', flexShrink: 0, background: o.badge === 'PREMIUM' ? 'rgba(74,139,107,0.3)' : 'rgba(212,168,83,0.15)', color: o.badge === 'PREMIUM' ? '#6BCB9B' : '#D4A853' }}>{o.badge}</span>}
                  </div>
                  <div style={{ fontSize: 10, lineHeight: '14px', color: on ? 'rgba(212,168,83,0.65)' : 'rgba(232,224,212,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{o.advantage}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: on ? '#D4A853' : 'rgba(212,168,83,0.35)', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
                  {o.priceDelta === 0 ? 'Included' : imp > 0 ? `+$${Math.round(imp).toLocaleString()}` : `+$${o.priceDelta.toFixed(2)}/sf`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(212,168,83,0.05)', minHeight: 40 }}>
        <p style={{ fontSize: 11, color: 'rgba(232,224,212,0.5)', lineHeight: 1.5, margin: 0, transition: 'opacity 140ms ease', opacity: vis ? 1 : 0 }}>{desc}</p>
      </div>
    </div>
  );
};

export default FramingVisualizer;

/* ================================================================== */
/*  Frame3D — CSS 3D transformed deck frame                           */
/* ================================================================== */

interface Frame3DProps { count: number; hMul: number; mat: 'wood' | 'fiberglass'; }

const Frame3D: React.FC<Frame3DProps> = ({ count, hMul, mat }) => {
  const isG = mat === 'fiberglass';
  const topBg = isG ? FG_TOP_BG : WOOD_TOP_BG;
  const frontBg = isG ? FG_FRONT_BG : WOOD_FRONT_BG;
  const sideBg = isG ? FG_SIDE_BG : WOOD_SIDE_BG;

  // Dimensions in px (the whole thing is inside a CSS 3D perspective container)
  const W = 400;   // frame width
  const D = 280;   // frame depth
  const jW = 8;    // joist width
  const jH = Math.round(18 * hMul); // joist height — scales for 2x8 vs 2x10
  const beamH = 22;
  const beamW = 12;
  const postW = 14;
  const postH = 40;

  // 15 joist positions
  const MAX = 15;
  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < MAX; i++) arr.push(((i + 1) / (MAX + 1)) * W);
    return arr;
  }, []);

  const visible = useMemo(() => {
    const s = new Set<number>();
    if (count >= MAX) { for (let i = 0; i < MAX; i++) s.add(i); }
    else { for (let i = 0; i < count; i++) s.add(Math.round((i * (MAX - 1)) / (count - 1))); }
    return s;
  }, [count]);

  const beamY = D * 0.48;
  const posts = [W * 0.05, W * 0.35, W * 0.65, W * 0.95];

  // Lumber piece component — a 3D box using CSS transforms
  const Lumber: React.FC<{
    x: number; y: number; z: number;
    w: number; d: number; h: number;
    top: string; front: string; side: string;
    op?: number; k: string;
  }> = ({ x, y, z, w, d, h, top, front, side, op = 1, k }) => (
    <div key={k} style={{
      position: 'absolute',
      left: x, top: y - z - h,
      width: w, height: h,
      opacity: op,
      transition: 'opacity 300ms ease, height 300ms ease, top 300ms ease',
      transformStyle: 'preserve-3d' as const,
    }}>
      {/* Front face */}
      <div style={{
        position: 'absolute', width: w, height: h,
        background: front,
        borderBottom: '1px solid rgba(0,0,0,0.2)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.15)',
      }} />
      {/* Top face — skewed to create 3D depth illusion */}
      <div style={{
        position: 'absolute', width: w, height: Math.round(d * 0.35),
        background: top,
        transform: 'skewX(-40deg)',
        transformOrigin: 'bottom left',
        top: -Math.round(d * 0.35) + 1,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.08)',
      }} />
      {/* Right side face */}
      <div style={{
        position: 'absolute',
        right: -Math.round(d * 0.18),
        top: -Math.round(d * 0.35) + 1,
        width: Math.round(d * 0.18),
        height: h + Math.round(d * 0.35) - 1,
        background: side,
        transform: 'skewY(-50deg)',
        transformOrigin: 'top left',
        borderRight: '1px solid rgba(0,0,0,0.15)',
      }} />
    </div>
  );

  return (
    <div style={{
      position: 'relative',
      width: W + 100,
      height: D * 0.5 + jH + postH + beamH + 60,
      margin: '0 auto',
      transform: 'scale(0.85)',
      transformOrigin: 'center center',
    }}>
      {/* Ground shadow */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '10%',
        width: '80%',
        height: 20,
        background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* Posts (behind everything) */}
      {posts.map((px, i) => (
        <Lumber key={`p${i}`} k={`p${i}`}
          x={px + 20} y={D * 0.5 + jH + beamH + postH} z={0}
          w={postW} d={postW} h={postH}
          top={WOOD_TOP_BG} front={WOOD_FRONT_BG} side={WOOD_SIDE_BG}
        />
      ))}

      {/* Beam */}
      <Lumber k="beam"
        x={10} y={D * 0.5 + jH + beamH} z={0}
        w={W + 40} d={beamW} h={beamH}
        top={isG ? FG_TOP_BG : woodGrain('#8B7355', '#9B8365', '#7B6545')}
        front={isG ? FG_FRONT_BG : woodGrain('#6B5740', '#7B6750', '#5B4730')}
        side={isG ? FG_SIDE_BG : '#5A4830'}
      />

      {/* Ledger (back) */}
      <Lumber k="ledger"
        x={20} y={D * 0.5 + jH - 8} z={0}
        w={W} d={10} h={jH}
        top={woodGrain('#8B7A5A', '#9B8A6A', '#7B6A4A')}
        front={woodGrain('#6B5A3A', '#7B6A4A', '#5B4A2A')}
        side="#5A4835"
      />

      {/* Joists — all 15 slots */}
      {slots.map((jx, i) => (
        <Lumber key={`j${i}`} k={`j${i}`}
          x={jx + 20 - jW / 2}
          y={D * 0.5 + jH}
          z={0}
          w={jW} d={D} h={jH}
          top={topBg} front={frontBg} side={sideBg}
          op={visible.has(i) ? 1 : 0}
        />
      ))}

      {/* End joists */}
      <Lumber k="eL" x={20 - jW} y={D * 0.5 + jH} z={0} w={jW} d={D} h={jH} top={topBg} front={frontBg} side={sideBg} />
      <Lumber k="eR" x={W + 20} y={D * 0.5 + jH} z={0} w={jW} d={D} h={jH} top={topBg} front={frontBg} side={sideBg} />

      {/* Rim joist (front) */}
      <Lumber k="rim"
        x={20 - jW} y={D * 0.5 + jH + 8} z={0}
        w={W + jW * 2} d={10} h={jH}
        top={topBg} front={frontBg} side={sideBg}
      />

      {/* Spacing label */}
      <div style={{
        position: 'absolute',
        bottom: -4,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 10,
        fontWeight: 600,
        color: 'rgba(212,168,83,0.4)',
        letterSpacing: 0.5,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: 'nowrap',
      }}>
        {count >= 15 ? '12"' : '16"'} on centre \u00b7 {count + 2} joists
      </div>
    </div>
  );
};
