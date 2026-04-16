import React, { useState, useEffect } from 'react';
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
  joistHeight: number; // visual height multiplier (1 = 2x8, 1.28 = 2x10)
  material: 'wood' | 'fiberglass';
  badge: string | null;
  priceDelta: number;
}

const FRAMING_OPTIONS: FramingOption[] = [
  {
    id: 'standard',
    pricingId: null,
    name: '2\u00d78 PT \u00b7 16" OC',
    advantage: 'Ontario Building Code standard. Included with every deck.',
    description: 'Standard pressure-treated 2\u00d78 framing at 16-inch on-centre spacing. Meets Ontario Building Code for residential decks up to 14-foot spans. Included with every project.',
    joistCount: 11,
    joistHeight: 1,
    material: 'wood',
    badge: 'INCLUDED',
    priceDelta: 0,
  },
  {
    id: '2x8_12oc',
    pricingId: 'upgrade_2x8_12',
    name: '2\u00d78 PT \u00b7 12" OC',
    advantage: '33% more joists \u2014 reduces bounce underfoot.',
    description: 'Closer joist spacing eliminates flex and bounce, especially with composite decking. Recommended for hot tubs, outdoor kitchens, or diagonal board patterns.',
    joistCount: 15,
    joistHeight: 1,
    material: 'wood',
    badge: null,
    priceDelta: 1.95,
  },
  {
    id: '2x10_16oc',
    pricingId: 'upgrade_2x10_16',
    name: '2\u00d710 PT \u00b7 16" OC',
    advantage: '28% deeper joists \u2014 longer spans, less flex.',
    description: 'Larger 2\u00d710 joists span further without mid-span support. Ideal for elevated decks or spans over 14 feet.',
    joistCount: 11,
    joistHeight: 1.28,
    material: 'wood',
    badge: null,
    priceDelta: 4.49,
  },
  {
    id: '2x10_12oc',
    pricingId: 'upgrade_2x10_12',
    name: '2\u00d710 PT \u00b7 12" OC',
    advantage: 'Maximum wood frame \u2014 zero bounce.',
    description: 'The strongest conventional wood frame. Deeper joists at tighter spacing \u2014 feels like a concrete patio underfoot.',
    joistCount: 15,
    joistHeight: 1.28,
    material: 'wood',
    badge: null,
    priceDelta: 6.49,
  },
  {
    id: 'fiberglass',
    pricingId: 'fiberglass_framing',
    name: 'Fiberglass Composite',
    advantage: 'Will not rot, warp, or split. Lifetime warranty.',
    description: 'Owens Corning fiberglass composite joists. Immune to moisture, insects, and UV. Zero maintenance for the life of the structure.',
    joistCount: 11,
    joistHeight: 1.28,
    material: 'fiberglass',
    badge: 'PREMIUM',
    priceDelta: 29.95,
  },
];

/* ------------------------------------------------------------------ */
/*  Colours                                                            */
/* ------------------------------------------------------------------ */

const WOOD_TOP = '#C4A87A';
const WOOD_FRONT = '#9B7E56';
const WOOD_SIDE = '#7D6544';
const WOOD_DARK = '#6B5740';
const FG_TOP = '#5A9E7A';
const FG_FRONT = '#3F7D5D';
const FG_SIDE = '#2E6B4A';
const POST_COLOR = '#8B7355';
const POST_SIDE = '#6B5740';
const BRACKET_COLOR = '#9BA5AF';

/* ------------------------------------------------------------------ */
/*  3D helpers — perspective-style isometric                           */
/* ------------------------------------------------------------------ */

const ANG = Math.PI / 5.5; // ~33 deg — slightly steeper for better depth
const CX = Math.cos(ANG);
const SX = Math.sin(ANG);

function iso(x: number, y: number, z: number): [number, number] {
  return [
    CX * x - CX * y,
    SX * x + SX * y - z,
  ];
}

function pt(x: number, y: number, z: number, ox: number, oy: number): string {
  const [px, py] = iso(x, y, z);
  return `${(ox + px).toFixed(1)},${(oy + py).toFixed(1)}`;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FramingVisualizerProps {
  selectedOption: PricingTier | null;
  dimensions: Dimensions;
  onSelectOption: (optionId: string) => void;
  getImpactValue: (optionId: string) => number;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const FramingVisualizer: React.FC<FramingVisualizerProps> = ({
  selectedOption,
  dimensions,
  onSelectOption,
  getImpactValue,
}) => {
  const activeId = selectedOption?.id ?? null;
  const activeOption = FRAMING_OPTIONS.find((o) => o.pricingId === activeId) ?? FRAMING_OPTIONS[0];

  // Description crossfade
  const [displayDesc, setDisplayDesc] = useState(activeOption.description);
  const [descVisible, setDescVisible] = useState(true);

  useEffect(() => {
    setDescVisible(false);
    const t = setTimeout(() => {
      setDisplayDesc(activeOption.description);
      setDescVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [activeOption.description]);

  const handleSelect = (opt: FramingOption) => {
    if (opt.pricingId === null) {
      if (activeId !== null) onSelectOption('__deselect__');
    } else {
      onSelectOption(opt.pricingId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
      {/* Split: SVG left, cards right */}
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>

        {/* LEFT: 3D Frame */}
        <div style={{
          flex: '1 1 62%',
          minWidth: 0,
          background: 'rgba(255,255,255,0.015)',
          borderRadius: 10,
          border: '1px solid rgba(212,168,83,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          overflow: 'hidden',
        }}>
          <FrameSVG
            joistCount={activeOption.joistCount}
            heightMul={activeOption.joistHeight}
            material={activeOption.material}
          />
        </div>

        {/* RIGHT: Option Cards */}
        <div style={{
          flex: '0 0 320px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
          minHeight: 0,
        }}>
          {FRAMING_OPTIONS.map((opt) => {
            const isActive = opt.pricingId === activeId || (opt.pricingId === null && activeId === null);
            const impact = opt.pricingId ? getImpactValue(opt.pricingId) : 0;

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                aria-pressed={isActive}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  borderLeft: isActive ? '3px solid #D4A853' : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  height: 68,
                  flexShrink: 0,
                  transition: 'all 200ms ease',
                  background: isActive ? 'rgba(212,168,83,0.07)' : 'rgba(255,255,255,0.02)',
                }}
              >
                {/* Name + advantage */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isActive ? '#E8E0D4' : 'rgba(232,224,212,0.6)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {opt.name}
                    </span>
                    {opt.badge && (
                      <span style={{
                        fontSize: 7,
                        fontWeight: 800,
                        letterSpacing: 1,
                        padding: '2px 6px',
                        borderRadius: 3,
                        textTransform: 'uppercase' as const,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        background: opt.badge === 'PREMIUM' ? 'rgba(74,139,107,0.3)' : 'rgba(212,168,83,0.15)',
                        color: opt.badge === 'PREMIUM' ? '#6BCB9B' : '#D4A853',
                      }}>
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 10,
                    lineHeight: '14px',
                    color: isActive ? 'rgba(212,168,83,0.65)' : 'rgba(232,224,212,0.3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {opt.advantage}
                  </div>
                </div>

                {/* Price */}
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isActive ? '#D4A853' : 'rgba(212,168,83,0.35)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  textAlign: 'right',
                }}>
                  {opt.priceDelta === 0 ? 'Included' : impact > 0 ? `+$${Math.round(impact).toLocaleString()}` : `+$${opt.priceDelta.toFixed(2)}/sf`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BELOW: Description */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 8,
        border: '1px solid rgba(212,168,83,0.05)',
        minHeight: 40,
      }}>
        <p style={{
          fontSize: 11,
          color: 'rgba(232,224,212,0.5)',
          lineHeight: 1.5,
          margin: 0,
          transition: 'opacity 150ms ease',
          opacity: descVisible ? 1 : 0,
        }}>
          {displayDesc}
        </p>
      </div>
    </div>
  );
};

export default FramingVisualizer;

/* ================================================================== */
/*  FrameSVG — Realistic isometric deck frame                         */
/* ================================================================== */

interface FrameSVGProps {
  joistCount: number;
  heightMul: number; // 1 = 2x8, 1.28 = 2x10
  material: 'wood' | 'fiberglass';
}

const FrameSVG: React.FC<FrameSVGProps> = ({ joistCount, heightMul, material }) => {
  const isGlass = material === 'fiberglass';
  const topC = isGlass ? FG_TOP : WOOD_TOP;
  const frontC = isGlass ? FG_FRONT : WOOD_FRONT;
  const sideC = isGlass ? FG_SIDE : WOOD_SIDE;

  // Frame dimensions (isometric units)
  const W = 220;    // frame width (left-right)
  const D = 160;    // frame depth (front-back)
  const JW = 3.5;   // joist width (1.5" actual but scaled for visibility)
  const JH = 14 * heightMul; // joist height — scales for 2x8 vs 2x10
  const BH = 16;    // beam height (slightly bigger than joists)
  const BW = 5;     // beam width
  const PW = 8;     // post width
  const PH = 28;    // post height below beam

  // SVG canvas
  const svgW = 600;
  const svgH = 420;
  const ox = svgW / 2 + 10;
  const oy = svgH * 0.55;

  // 15 joist slots, evenly spaced
  const MAX_J = 15;
  const jSlots: number[] = [];
  for (let i = 0; i < MAX_J; i++) {
    jSlots.push(((i + 1) / (MAX_J + 1)) * W);
  }

  // Which are visible
  const vis = new Set<number>();
  if (joistCount >= MAX_J) {
    for (let i = 0; i < MAX_J; i++) vis.add(i);
  } else {
    for (let i = 0; i < joistCount; i++) {
      vis.add(Math.round((i * (MAX_J - 1)) / (joistCount - 1)));
    }
  }

  // Beam at midspan
  const beamY = D * 0.48;

  // Posts under beam (4 posts evenly spaced)
  const postPositions = [W * 0.05, W * 0.35, W * 0.65, W * 0.95];

  // Draw an isometric box
  const box = (
    bx: number, by: number, bz: number,
    w: number, d: number, h: number,
    tc: string, fc: string, sc: string,
    op: number, k: string,
  ) => {
    const top = [
      pt(bx, by, bz + h, ox, oy), pt(bx + w, by, bz + h, ox, oy),
      pt(bx + w, by + d, bz + h, ox, oy), pt(bx, by + d, bz + h, ox, oy),
    ].join(' ');
    const front = [
      pt(bx, by, bz, ox, oy), pt(bx + w, by, bz, ox, oy),
      pt(bx + w, by, bz + h, ox, oy), pt(bx, by, bz + h, ox, oy),
    ].join(' ');
    const side = [
      pt(bx + w, by, bz, ox, oy), pt(bx + w, by + d, bz, ox, oy),
      pt(bx + w, by + d, bz + h, ox, oy), pt(bx + w, by, bz + h, ox, oy),
    ].join(' ');
    return (
      <g key={k} style={{ opacity: op, transition: 'opacity 300ms ease, fill 300ms ease' }}>
        <polygon points={front} fill={fc} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
        <polygon points={side} fill={sc} stroke="rgba(0,0,0,0.12)" strokeWidth={0.3} />
        <polygon points={top} fill={tc} stroke="rgba(0,0,0,0.08)" strokeWidth={0.3} />
      </g>
    );
  };

  // Small bracket at joist-to-beam connection
  const bracket = (jx: number, k: string, op: number) => {
    const bSize = 3;
    const bz = 0;
    const by2 = beamY - BW / 2 - 0.5;
    const pts = [
      pt(jx - bSize / 2, by2, bz, ox, oy),
      pt(jx + bSize / 2, by2, bz, ox, oy),
      pt(jx + bSize / 2, by2, bz + JH * 0.6, ox, oy),
      pt(jx - bSize / 2, by2, bz + JH * 0.6, ox, oy),
    ].join(' ');
    return <polygon key={k} points={pts} fill={BRACKET_COLOR} opacity={op * 0.5} style={{ transition: 'opacity 300ms ease' }} />;
  };

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ maxHeight: '100%' }}>
      {/* Ground shadow */}
      <ellipse
        cx={ox}
        cy={oy + 55}
        rx={200}
        ry={30}
        fill="rgba(0,0,0,0.15)"
      />

      {/* House wall silhouette */}
      {(() => {
        const wallH = JH + 80;
        const pts = [
          pt(0, D, 0, ox, oy), pt(0, D, wallH, ox, oy),
          pt(W, D, wallH, ox, oy), pt(W, D, 0, ox, oy),
        ].join(' ');
        return <polygon points={pts} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
      })()}

      {/* Posts under beam (drawn first — behind everything) */}
      {postPositions.map((px, i) =>
        box(px - PW / 2, beamY - PW / 2, -(PH + BH), PW, PW, PH, POST_COLOR, POST_SIDE, WOOD_DARK, 1, `post-${i}`)
      )}

      {/* Beam (perpendicular to joists, under them) */}
      {box(-4, beamY - BW / 2, -BH, W + 8, BW, BH, isGlass ? FG_TOP : WOOD_DARK, isGlass ? FG_FRONT : '#5A4830', isGlass ? FG_SIDE : '#4A3A25', 1, 'beam')}

      {/* Ledger board (back edge — always wood, attached to house) */}
      {box(0, D - 3, 0, W, 3, JH, '#7D6544', '#5A4A35', '#4A3B28', 1, 'ledger')}

      {/* Interior joists — all 15 slots rendered */}
      {jSlots.map((jx, i) => {
        const op = vis.has(i) ? 1 : 0;
        return (
          <React.Fragment key={`j-${i}`}>
            {box(jx - JW / 2, 0, 0, JW, D, JH, topC, frontC, sideC, op, `joist-${i}`)}
            {bracket(jx, `br-${i}`, op)}
          </React.Fragment>
        );
      })}

      {/* End joists (left + right) */}
      {box(-JW, 0, 0, JW, D, JH, topC, frontC, sideC, 1, 'end-L')}
      {box(W, 0, 0, JW, D, JH, topC, frontC, sideC, 1, 'end-R')}

      {/* Rim joist / header (front edge) */}
      {box(-JW, -3, 0, W + JW * 2, 3, JH, topC, frontC, sideC, 1, 'rim')}

      {/* Blocking between joists at beam line */}
      {jSlots.map((jx, i) => {
        if (!vis.has(i)) return null;
        // Find next visible joist
        let nextIdx = -1;
        for (let n = i + 1; n < MAX_J; n++) {
          if (vis.has(n)) { nextIdx = n; break; }
        }
        if (nextIdx < 0) return null;
        const nx = jSlots[nextIdx];
        const bx = jx + JW / 2 + 0.5;
        const bw = nx - JW / 2 - 0.5 - bx;
        if (bw <= 1) return null;
        return box(bx, beamY - 1, 0, bw, 2, JH * 0.7, topC, frontC, sideC, 0.6, `blk-${i}`);
      })}

      {/* Spacing dimension line */}
      {(() => {
        const spacing = joistCount >= 15 ? '12"' : '16"';
        // Pick two adjacent visible joists near the front for the label
        let j1 = -1, j2 = -1;
        for (let i = 0; i < MAX_J; i++) {
          if (vis.has(i)) {
            if (j1 < 0) { j1 = i; } else if (j2 < 0) { j2 = i; break; }
          }
        }
        if (j1 < 0 || j2 < 0) return null;
        const x1 = jSlots[j1];
        const x2 = jSlots[j2];
        const mid = (x1 + x2) / 2;
        const [lx, ly] = iso(mid, -16, JH + 6);
        return (
          <text
            x={ox + lx}
            y={oy + ly}
            textAnchor="middle"
            fill="rgba(212,168,83,0.4)"
            fontSize={10}
            fontWeight={600}
            fontFamily="'DM Sans', sans-serif"
            letterSpacing={0.5}
          >
            {spacing} on centre
          </text>
        );
      })()}

      {/* Joist count label */}
      {(() => {
        const [lx, ly] = iso(W / 2, -10, JH + 20);
        return (
          <text
            x={ox + lx}
            y={oy + ly}
            textAnchor="middle"
            fill="rgba(232,224,212,0.3)"
            fontSize={9}
            fontWeight={500}
            fontFamily="'DM Sans', sans-serif"
          >
            {joistCount + 2} joists total
          </text>
        );
      })()}
    </svg>
  );
};
