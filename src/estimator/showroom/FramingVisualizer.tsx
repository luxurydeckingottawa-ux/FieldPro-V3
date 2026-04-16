import React, { useState, useEffect } from 'react';
import type { PricingTier, Dimensions } from '../EstimatorCalculatorView';

/* ------------------------------------------------------------------ */
/*  Framing option data — maps to PRICING_DATA framing IDs.           */
/*  'standard' = null selection (included in every project).          */
/* ------------------------------------------------------------------ */

interface FramingOption {
  id: string;
  /** Matches PricingTier.id in PRICING_DATA framing, or 'standard' for null */
  pricingId: string | null;
  name: string;
  label: string;
  advantage: string;
  description: string;
  joistCount: number;
  joistHeight: number;
  material: 'wood' | 'fiberglass';
  badge: string | null;
  priceDelta: number;
}

const FRAMING_OPTIONS: FramingOption[] = [
  {
    id: 'standard',
    pricingId: null,
    name: '2\u00d78 PT @ 16" OC',
    label: 'Standard',
    advantage: 'Ontario Building Code standard. Included with every deck.',
    description:
      'Standard pressure-treated 2\u00d78 framing at 16-inch on-centre spacing. Meets Ontario Building Code for residential decks up to 14-foot spans. Included with every project.',
    joistCount: 11,
    joistHeight: 7.25,
    material: 'wood',
    badge: 'STANDARD',
    priceDelta: 0,
  },
  {
    id: '2x8_12oc',
    pricingId: 'upgrade_2x8_12',
    name: '2\u00d78 PT @ 12" OC',
    label: 'Closer Spacing',
    advantage: '33% more joists. Reduces bounce underfoot.',
    description:
      'Closer joist spacing eliminates flex and bounce, especially noticeable with composite decking. Recommended for hot tubs, outdoor kitchens, or diagonal board patterns.',
    joistCount: 15,
    joistHeight: 7.25,
    material: 'wood',
    badge: null,
    priceDelta: 1.95,
  },
  {
    id: '2x10_16oc',
    pricingId: 'upgrade_2x10_16',
    name: '2\u00d710 PT @ 16" OC',
    label: 'Deeper Joists',
    advantage: '28% deeper joists. Handles longer spans with less flex.',
    description:
      'Larger 2\u00d710 joists span further without mid-span support, reducing the number of beams and footings needed. Ideal for elevated decks or spans over 14 feet.',
    joistCount: 11,
    joistHeight: 9.25,
    material: 'wood',
    badge: null,
    priceDelta: 4.49,
  },
  {
    id: '2x10_12oc',
    pricingId: 'upgrade_2x10_12',
    name: '2\u00d710 PT @ 12" OC',
    label: 'Maximum Wood',
    advantage: 'Strongest wood frame we build. Zero bounce, zero compromise.',
    description:
      'The strongest conventional wood frame available. Deeper joists at tighter spacing for a rock-solid substructure. Feels like a concrete patio underfoot.',
    joistCount: 15,
    joistHeight: 9.25,
    material: 'wood',
    badge: null,
    priceDelta: 6.49,
  },
  {
    id: 'fiberglass',
    pricingId: 'fiberglass_framing',
    name: 'Fiberglass Composite',
    label: 'Lifetime Frame',
    advantage: 'Will not rot, warp, or split. Ever. Lifetime warranty.',
    description:
      'Owens Corning fiberglass composite joists. Immune to moisture, insects, and UV. Zero maintenance for the life of the structure. The only framing we guarantee will never need replacement.',
    joistCount: 11,
    joistHeight: 9.25,
    material: 'fiberglass',
    badge: 'PREMIUM',
    priceDelta: 29.95,
  },
];

/* ------------------------------------------------------------------ */
/*  Colour palette                                                     */
/* ------------------------------------------------------------------ */

const WOOD = { top: '#B8A080', front: '#8B7355', side: '#7A6347' };
const FGLASS = { top: '#4A8B6B', front: '#3A7A5A', side: '#2E6B4A' };
const BEAM_WOOD = '#6B5740';
const BEAM_FGLASS = '#2A5F42';
const LEDGER_COLOR = '#5A4A35';
const WALL_FILL = 'rgba(255,255,255,0.03)';
const WALL_STROKE = 'rgba(255,255,255,0.06)';

/* ------------------------------------------------------------------ */
/*  Isometric projection helpers                                       */
/* ------------------------------------------------------------------ */

// Isometric transform: x-right, y-into-screen, z-up
// Viewing from front-right, 30-degree downward angle
const ISO_ANGLE = Math.PI / 6; // 30 degrees
const COS = Math.cos(ISO_ANGLE);
const SIN = Math.sin(ISO_ANGLE);

function isoProject(x: number, y: number, z: number): [number, number] {
  const px = COS * x - COS * y;
  const py = SIN * x + SIN * y - z;
  return [px, py];
}

function toSvg(x: number, y: number, z: number, ox: number, oy: number): string {
  const [px, py] = isoProject(x, y, z);
  return `${ox + px},${oy + py}`;
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const FramingVisualizer: React.FC<FramingVisualizerProps> = ({
  selectedOption,
  dimensions,
  onSelectOption,
  getImpactValue,
}) => {
  // Map current selection to our internal option
  const activeId = selectedOption?.id ?? null;
  const activeOption =
    FRAMING_OPTIONS.find((o) => o.pricingId === activeId) ?? FRAMING_OPTIONS[0];

  // Description crossfade
  const [displayDesc, setDisplayDesc] = useState(activeOption.description);
  const [descOpacity, setDescOpacity] = useState(1);

  useEffect(() => {
    setDescOpacity(0);
    const t = window.setTimeout(() => {
      setDisplayDesc(activeOption.description);
      setDescOpacity(1);
    }, 160);
    return () => window.clearTimeout(t);
  }, [activeOption.description]);

  // Handle card click -- dispatch to parent
  const handleSelect = (opt: FramingOption) => {
    if (opt.pricingId === null) {
      // Clicking standard when something else is selected => deselect
      // Clicking standard when already standard => no-op
      if (activeId !== null) onSelectOption('__deselect__');
    } else {
      onSelectOption(opt.pricingId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 8 }}>
      {/* Split view: SVG left, cards right */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>
        {/* LEFT: Isometric SVG */}
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.015)',
            borderRadius: 8,
            border: '1px solid rgba(212,168,83,0.08)',
            overflow: 'hidden',
          }}
        >
          <IsometricFrame
            joistCount={activeOption.joistCount}
            joistHeight={activeOption.joistHeight}
            material={activeOption.material}
          />
        </div>

        {/* RIGHT: Option cards */}
        <div
          style={{
            flex: '0 0 36%',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflowY: 'auto',
            minHeight: 0,
            paddingRight: 2,
          }}
        >
          {FRAMING_OPTIONS.map((opt) => {
            const isActive =
              opt.pricingId === activeId ||
              (opt.pricingId === null && activeId === null);
            const impact =
              opt.pricingId !== null
                ? getImpactValue(opt.pricingId)
                : 0;

            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  minHeight: 64,
                  transition: 'background 300ms ease, border-color 300ms ease',
                  background: isActive
                    ? 'rgba(212,168,83,0.08)'
                    : 'rgba(255,255,255,0.025)',
                  borderLeft: isActive
                    ? '3px solid #D4A853'
                    : '3px solid transparent',
                  position: 'relative',
                }}
              >
                {/* Cross-section SVG */}
                <CrossSection
                  height={opt.joistHeight}
                  material={opt.material}
                />

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isActive ? '#E8E0D4' : 'rgba(232,224,212,0.7)',
                        transition: 'color 300ms ease',
                      }}
                    >
                      {opt.name}
                    </span>
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: 1.2,
                          padding: '2px 6px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                          background:
                            opt.badge === 'PREMIUM'
                              ? 'rgba(74,139,107,0.25)'
                              : 'rgba(255,255,255,0.1)',
                          color:
                            opt.badge === 'PREMIUM'
                              ? '#6BCB9B'
                              : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: isActive
                        ? 'rgba(212,168,83,0.7)'
                        : 'rgba(232,224,212,0.35)',
                      lineHeight: 1.3,
                      transition: 'color 300ms ease',
                    }}
                  >
                    {opt.advantage}
                  </div>
                </div>

                {/* Price delta */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isActive ? '#D4A853' : 'rgba(212,168,83,0.4)',
                    whiteSpace: 'nowrap',
                    transition: 'color 300ms ease',
                    textAlign: 'right',
                    minWidth: 70,
                  }}
                >
                  {opt.priceDelta === 0 ? (
                    'Included'
                  ) : impact > 0 ? (
                    <>+${Math.round(impact).toLocaleString()}</>
                  ) : (
                    <>+${opt.priceDelta.toFixed(2)}/sqft</>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BELOW: Description bar */}
      <div
        style={{
          height: 48,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 6,
          border: '1px solid rgba(212,168,83,0.06)',
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: 'rgba(232,224,212,0.55)',
            lineHeight: 1.5,
            margin: 0,
            transition: 'opacity 160ms ease',
            opacity: descOpacity,
          }}
        >
          {displayDesc}
        </p>
      </div>
    </div>
  );
};

export default FramingVisualizer;

/* ------------------------------------------------------------------ */
/*  IsometricFrame SVG                                                 */
/* ------------------------------------------------------------------ */

interface IsometricFrameProps {
  joistCount: number;
  joistHeight: number;
  material: 'wood' | 'fiberglass';
}

const IsometricFrame: React.FC<IsometricFrameProps> = ({
  joistCount,
  joistHeight,
  material,
}) => {
  const palette = material === 'fiberglass' ? FGLASS : WOOD;
  const beamColor = material === 'fiberglass' ? BEAM_FGLASS : BEAM_WOOD;

  // Frame geometry (isometric units)
  const frameW = 200; // width (x-axis, left-right)
  const frameD = 140; // depth (y-axis, into screen)
  const joistW = 1.5; // joist thickness
  const joistH = joistHeight * 1.2; // scale for visibility
  const beamH = joistH * 0.8;
  const beamW = 3;
  const blockH = joistH * 0.6;

  // SVG canvas
  const svgW = 520;
  const svgH = 340;
  const ox = svgW / 2 + 20; // origin x
  const oy = svgH * 0.62; // origin y

  // All 15 joist positions (evenly spaced). Show joistCount, hide the rest.
  const maxJoists = 15;
  const joistPositions: number[] = [];
  for (let i = 0; i < maxJoists; i++) {
    const t = (i + 1) / (maxJoists + 1);
    joistPositions.push(t * frameW);
  }

  // Beam sits at midspan
  const beamY = frameD * 0.5;

  // Which joists are visible (for 11-count, hide 4 evenly)
  const visibleSet = new Set<number>();
  if (joistCount >= maxJoists) {
    for (let i = 0; i < maxJoists; i++) visibleSet.add(i);
  } else {
    // Pick joistCount indices evenly spread
    for (let i = 0; i < joistCount; i++) {
      const idx = Math.round((i * (maxJoists - 1)) / (joistCount - 1));
      visibleSet.add(idx);
    }
  }

  // Helper: draw an isometric box (top + front + right side)
  const isoBox = (
    bx: number,
    by: number,
    bz: number,
    w: number,
    d: number,
    h: number,
    topCol: string,
    frontCol: string,
    sideCol: string,
    opacity: number,
    key: string,
  ) => {
    // Top face: (bx,by,bz+h) -> (bx+w,by,bz+h) -> (bx+w,by+d,bz+h) -> (bx,by+d,bz+h)
    const topPts = [
      toSvg(bx, by, bz + h, ox, oy),
      toSvg(bx + w, by, bz + h, ox, oy),
      toSvg(bx + w, by + d, bz + h, ox, oy),
      toSvg(bx, by + d, bz + h, ox, oy),
    ].join(' ');

    // Front face: (bx,by,bz) -> (bx+w,by,bz) -> (bx+w,by,bz+h) -> (bx,by,bz+h)
    const frontPts = [
      toSvg(bx, by, bz, ox, oy),
      toSvg(bx + w, by, bz, ox, oy),
      toSvg(bx + w, by, bz + h, ox, oy),
      toSvg(bx, by, bz + h, ox, oy),
    ].join(' ');

    // Right side: (bx+w,by,bz) -> (bx+w,by+d,bz) -> (bx+w,by+d,bz+h) -> (bx+w,by,bz+h)
    const sidePts = [
      toSvg(bx + w, by, bz, ox, oy),
      toSvg(bx + w, by + d, bz, ox, oy),
      toSvg(bx + w, by + d, bz + h, ox, oy),
      toSvg(bx + w, by, bz + h, ox, oy),
    ].join(' ');

    return (
      <g
        key={key}
        style={{
          opacity,
          transition: 'opacity 300ms ease',
        }}
      >
        <polygon points={frontPts} fill={frontCol} />
        <polygon points={topPts} fill={topCol} />
        <polygon points={sidePts} fill={sideCol} />
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height="100%"
      style={{ maxHeight: '100%' }}
    >
      {/* House wall silhouette */}
      <polygon
        points={[
          toSvg(0, frameD, 0, ox, oy),
          toSvg(0, frameD, joistH + 60, ox, oy),
          toSvg(frameW, frameD, joistH + 60, ox, oy),
          toSvg(frameW, frameD, 0, ox, oy),
        ].join(' ')}
        fill={WALL_FILL}
        stroke={WALL_STROKE}
        strokeWidth={0.5}
      />

      {/* Ledger board (back, always wood) */}
      {isoBox(
        0, frameD - 2, 0,
        frameW, 2, joistH,
        LEDGER_COLOR, LEDGER_COLOR, '#4A3B28',
        1,
        'ledger',
      )}

      {/* Mid-span beam (under joists) */}
      {isoBox(
        -2, beamY - beamW / 2, -beamH,
        frameW + 4, beamW, beamH,
        beamColor, beamColor, material === 'fiberglass' ? '#1E5038' : '#5A4830',
        1,
        'beam',
      )}

      {/* Interior joists */}
      {joistPositions.map((jx, i) => {
        const visible = visibleSet.has(i);
        return (
          <g key={`joist-${i}`}>
            {/* Joist */}
            {isoBox(
              jx - joistW / 2, 0, 0,
              joistW, frameD, joistH,
              palette.top, palette.front, palette.side,
              visible ? 1 : 0,
              `joist-box-${i}`,
            )}
            {/* Blocking at beam line */}
            {visible && i < joistPositions.length - 1 && visibleSet.has(i + 1) && (() => {
              const nextX = joistPositions[i + 1];
              const bx = jx + joistW / 2;
              const bw = nextX - joistW / 2 - bx;
              if (bw <= 0) return null;
              return isoBox(
                bx, beamY - 0.75, 0,
                bw, 1.5, blockH,
                palette.top, palette.front, palette.side,
                0.7,
                `block-${i}`,
              );
            })()}
          </g>
        );
      })}

      {/* Left end joist */}
      {isoBox(
        -joistW, 0, 0,
        joistW, frameD, joistH,
        palette.top, palette.front, palette.side,
        1,
        'end-left',
      )}

      {/* Right end joist */}
      {isoBox(
        frameW, 0, 0,
        joistW, frameD, joistH,
        palette.top, palette.front, palette.side,
        1,
        'end-right',
      )}

      {/* Rim joist / header (front) */}
      {isoBox(
        -joistW, -2, 0,
        frameW + joistW * 2, 2, joistH,
        palette.top, palette.front, palette.side,
        1,
        'rim',
      )}

      {/* Joist count label */}
      {(() => {
        const [lx, ly] = isoProject(frameW / 2, -12, joistH + 4);
        return (
          <text
            x={ox + lx}
            y={oy + ly}
            textAnchor="middle"
            fill="rgba(232,224,212,0.35)"
            fontSize={11}
            fontWeight={600}
            fontFamily="inherit"
          >
            {joistCount + 2} joists total
          </text>
        );
      })()}

      {/* Joist depth label */}
      {(() => {
        const depthLabel =
          joistHeight === 7.25 ? '2\u00d78 (7.25")' : '2\u00d710 (9.25")';
        const [lx, ly] = isoProject(frameW + 16, frameD / 2, joistH / 2);
        return (
          <text
            x={ox + lx}
            y={oy + ly}
            textAnchor="start"
            fill="rgba(232,224,212,0.25)"
            fontSize={9}
            fontWeight={500}
            fontFamily="inherit"
          >
            {depthLabel}
          </text>
        );
      })()}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  CrossSection SVG (option card thumbnail)                           */
/* ------------------------------------------------------------------ */

interface CrossSectionProps {
  height: number;
  material: 'wood' | 'fiberglass';
}

const CrossSection: React.FC<CrossSectionProps> = ({ height, material }) => {
  const w = 24;
  const maxH = 32;
  // Scale: 9.25" -> maxH, 7.25" -> proportional
  const h = (height / 9.25) * maxH;
  const topY = maxH - h;
  const fill = material === 'fiberglass' ? FGLASS.front : WOOD.front;
  const stroke = material === 'fiberglass' ? FGLASS.side : WOOD.side;

  return (
    <svg
      width={32}
      height={36}
      viewBox={`0 0 32 36`}
      style={{ flexShrink: 0 }}
    >
      <rect
        x={(32 - w) / 2}
        y={topY + 2}
        width={w}
        height={h}
        rx={1.5}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        style={{ transition: 'all 300ms ease' }}
      />
    </svg>
  );
};
