import React, { useState, useEffect } from 'react';
import type { PricingTier, Dimensions } from '../EstimatorCalculatorView';

/* ------------------------------------------------------------------ */
/*  Foundation options                                                  */
/*                                                                     */
/*  pricingId maps to the id in PRICING_DATA['foundation'].options.    */
/*  'blocks' is the base (included), so pricingId = null.              */
/*  The visualizer handles selection via __deselect__ sentinel         */
/*  (same pattern as FramingVisualizer).                               */
/* ------------------------------------------------------------------ */

interface FoundationOption {
  id: string;
  pricingId: string | null;
  name: string;
  advantage: string;
  description: string;
  badge: string | null;
  priceDelta: number;
  unit: string;
}

const OPTIONS: FoundationOption[] = [
  {
    id: 'blocks',
    pricingId: null,
    name: 'Concrete Deck Blocks',
    advantage: 'No digging required. Ready in an afternoon.',
    description:
      'Precast concrete blocks sitting on grade. Standard for floating decks under 24" off the ground. Not code-compliant for attached decks -- subject to seasonal frost heave in Ottawa.',
    badge: 'INCLUDED',
    priceDelta: 0,
    unit: 'included',
  },
  {
    id: 'sonotube',
    pricingId: 'sonotube',
    name: 'Concrete Footings (48")',
    advantage: 'Below frost line -- rock-solid, code-compliant.',
    description:
      '10" sonotube poured 48" below grade with concrete bell footing. Full frost heave protection. Required by Ontario Building Code for any attached deck. The proven standard.',
    badge: null,
    priceDelta: 279,
    unit: 'per footing',
  },
  {
    id: 'helical',
    pricingId: 'helical',
    name: 'Helical Piles',
    advantage: 'Engineered steel -- instant load, zero concrete.',
    description:
      'Steel shaft with helix plates driven by hydraulic machine. No excavation, no concrete curing time. Load-bearing immediately. Superior frost heave resistance. Engineer-certified.',
    badge: null,
    priceDelta: 469,
    unit: 'per pile',
  },
  {
    id: 'groundscrew',
    pricingId: 'pylex_screws',
    name: 'Ground Screws',
    advantage: 'Quick install -- light-duty helical for smaller decks.',
    description:
      'Light-duty screw foundation for landings, stairs, small platforms. 1.5" shaft with continuous spiral thread. Faster and cheaper than full helical piles but lower load capacity.',
    badge: null,
    priceDelta: 129.95,
    unit: 'per screw',
  },
  {
    id: 'namifix',
    pricingId: 'nami_fix',
    name: 'NamiFix Brackets',
    advantage: 'No holes in your house -- bolts to foundation wall.',
    description:
      'Steel L-bracket that bolts directly to your concrete foundation wall. Eliminates ledger board -- no penetrating the building envelope, no water infiltration risk. Still requires footings at the outer edge.',
    badge: 'SPECIALTY',
    priceDelta: 189,
    unit: 'per bracket',
  },
];

/* ------------------------------------------------------------------ */
/*  SVG colour tokens                                                  */
/* ------------------------------------------------------------------ */

const C = {
  bg: '#0A0A0A',
  line: 'rgba(232,224,212,0.7)',
  lineFaint: 'rgba(232,224,212,0.4)',
  dimLine: 'rgba(212,168,83,0.5)',
  dimText: 'rgba(212,168,83,0.7)',
  label: 'rgba(232,224,212,0.5)',
  leader: 'rgba(232,224,212,0.2)',
  concrete: 'rgba(160,160,160,0.15)',
  concreteStroke: 'rgba(160,160,160,0.35)',
  steel: 'rgba(180,190,200,0.25)',
  steelStroke: 'rgba(180,190,200,0.55)',
  wood: 'rgba(200,160,100,0.2)',
  woodStroke: 'rgba(200,160,100,0.55)',
  frost: 'rgba(100,150,255,0.4)',
  grade: 'rgba(232,224,212,0.4)',
  earthTop: 'rgba(60,40,20,0.3)',
  earthBot: 'rgba(40,25,15,0.5)',
} as const;

/* ------------------------------------------------------------------ */
/*  Shared SVG primitives                                              */
/* ------------------------------------------------------------------ */

/** Dimension callout: horizontal or vertical line with serif marks + text */
const DimH: React.FC<{
  x1: number; x2: number; y: number; label: string; above?: boolean;
}> = ({ x1, x2, y, label, above }) => {
  const mid = (x1 + x2) / 2;
  const ty = above ? y - 8 : y + 12;
  const s = 4; // serif half-length
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.dimLine} strokeWidth={0.75} />
      <line x1={x1} y1={y - s} x2={x1} y2={y + s} stroke={C.dimLine} strokeWidth={0.75} />
      <line x1={x2} y1={y - s} x2={x2} y2={y + s} stroke={C.dimLine} strokeWidth={0.75} />
      <text x={mid} y={ty} textAnchor="middle" fill={C.dimText}
        style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
        {label}
      </text>
    </g>
  );
};

const DimV: React.FC<{
  x: number; y1: number; y2: number; label: string; right?: boolean;
}> = ({ x, y1, y2, label, right }) => {
  const mid = (y1 + y2) / 2;
  const tx = right ? x + 8 : x - 8;
  const anchor = right ? 'start' : 'end';
  const s = 4;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={C.dimLine} strokeWidth={0.75} />
      <line x1={x - s} y1={y1} x2={x + s} y2={y1} stroke={C.dimLine} strokeWidth={0.75} />
      <line x1={x - s} y1={y2} x2={x + s} y2={y2} stroke={C.dimLine} strokeWidth={0.75} />
      <text x={tx} y={mid + 3} textAnchor={anchor} fill={C.dimText}
        style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
        {label}
      </text>
    </g>
  );
};

/** Label with leader line */
const Label: React.FC<{
  x: number; y: number; tx: number; ty: number; text: string; anchor?: string;
}> = ({ x, y, tx, ty, text, anchor = 'start' }) => (
  <g>
    <line x1={x} y1={y} x2={tx} y2={ty} stroke={C.leader} strokeWidth={0.75} />
    <circle cx={x} cy={y} r={1.5} fill={C.leader} />
    <text x={anchor === 'start' ? tx + 4 : tx - 4} y={ty + 3} textAnchor={anchor} fill={C.label}
      style={{ fontSize: 9, fontFamily: "'DM Sans', sans-serif" }}>
      {text}
    </text>
  </g>
);

/** Grade line */
const GradeLine: React.FC<{ y: number }> = ({ y }) => (
  <g>
    <line x1={20} y1={y} x2={680} y2={y} stroke={C.grade} strokeWidth={1.5} />
    <text x={24} y={y - 5} fill={C.grade}
      style={{ fontSize: 9, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: 2 }}>
      GRADE
    </text>
  </g>
);

/** Frost line dashed */
const FrostLine: React.FC<{ y: number; label?: string }> = ({ y, label }) => (
  <g>
    <line x1={20} y1={y} x2={680} y2={y}
      stroke={C.frost} strokeWidth={1} strokeDasharray="6 4" />
    <text x={680} y={y - 4} textAnchor="end" fill={C.frost}
      style={{ fontSize: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: 1 }}>
      {label ?? 'FROST LINE (48")'}
    </text>
    {/* snowflake */}
    <text x={655} y={y - 3} textAnchor="end" fill={C.frost}
      style={{ fontSize: 9 }}>
      {'*'}
    </text>
  </g>
);

/** Earth underground gradient */
const EarthGradient: React.FC<{ gradeY: number; depth: number }> = ({ gradeY, depth }) => (
  <g>
    <defs>
      <linearGradient id="earthGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgb(60,40,20)" stopOpacity={0.3} />
        <stop offset="100%" stopColor="rgb(40,25,15)" stopOpacity={0.5} />
      </linearGradient>
    </defs>
    <rect x={20} y={gradeY} width={660} height={depth} fill="url(#earthGrad)" />
  </g>
);

/* ------------------------------------------------------------------ */
/*  Scene 1: Deck Blocks                                               */
/* ------------------------------------------------------------------ */

const BlocksSchematic: React.FC = () => {
  // Scale: 1px = ~0.5"  =>  8" block = 16px, 12" base = 24px, 6" top = 12px
  const gradeY = 150;
  const blockH = 16;
  const baseW = 24;
  const topW = 12;
  const beamW = 3; // 1.5" = 3px
  const beamH = 14; // 7.25" ~ 14px

  // 3 blocks spaced across
  const blockXs = [180, 350, 520];

  // Frost line at 48" below grade = 96px
  const frostY = gradeY + 96;

  return (
    <svg viewBox="0 0 700 450" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={700} height={450} fill={C.bg} />

      {/* Earth below grade */}
      <EarthGradient gradeY={gradeY} depth={300} />

      {/* Grade line */}
      <GradeLine y={gradeY} />

      {/* Frost line */}
      <FrostLine y={frostY} />

      {/* Blocks */}
      {blockXs.map((cx, i) => {
        const bx1 = cx - baseW / 2;
        const bx2 = cx + baseW / 2;
        const tx1 = cx - topW / 2;
        const tx2 = cx + topW / 2;
        const by = gradeY; // sits ON grade
        const ty = by - blockH;

        return (
          <g key={i}>
            {/* Truncated pyramid cross-section (trapezoid) */}
            <polygon
              points={`${bx1},${by} ${bx2},${by} ${tx2},${ty} ${tx1},${ty}`}
              fill={C.concrete}
              stroke={C.concreteStroke}
              strokeWidth={1.2}
            />
            {/* Subtle concrete texture: small speckle dots */}
            {[...Array(6)].map((_, si) => (
              <circle key={si}
                cx={cx + (si % 3 - 1) * 5}
                cy={by - 4 - Math.floor(si / 3) * 5}
                r={0.7}
                fill="rgba(160,160,160,0.12)"
              />
            ))}
          </g>
        );
      })}

      {/* Beam across blocks */}
      <rect
        x={blockXs[0] - beamW / 2}
        y={gradeY - blockH - beamH}
        width={blockXs[2] - blockXs[0] + beamW}
        height={beamH}
        fill={C.wood}
        stroke={C.woodStroke}
        strokeWidth={1}
        rx={1}
      />

      {/* Dimension: block height */}
      <DimV x={blockXs[0] - 40} y1={gradeY - blockH} y2={gradeY} label={'8"'} />

      {/* Dimension: block base width */}
      <DimH x1={blockXs[0] - baseW / 2} x2={blockXs[0] + baseW / 2} y={gradeY + 16} label={'12"'} />

      {/* Labels */}
      <Label x={blockXs[1]} y={gradeY - blockH / 2} tx={blockXs[1] + 60} ty={gradeY - 60}
        text="Precast Concrete Block" />
      <Label x={(blockXs[0] + blockXs[2]) / 2} y={gradeY - blockH - beamH / 2}
        tx={(blockXs[0] + blockXs[2]) / 2 + 80} ty={gradeY - blockH - beamH - 30}
        text="2x Beam" />

      {/* Frost line is clearly BELOW the block (the problem) */}
      <Label x={350} y={frostY} tx={90} ty={frostY + 35}
        text="Block sits ABOVE frost line" anchor="start" />

      {/* Note: no frost protection */}
      <text x={350} y={410} textAnchor="middle" fill="rgba(232,224,212,0.25)"
        style={{ fontSize: 9, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' }}>
        Subject to seasonal frost heave - not code-compliant for attached decks
      </text>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2: Sonotube Footings (48")                                   */
/* ------------------------------------------------------------------ */

const SonotubeSchematic: React.FC = () => {
  const gradeY = 120;
  // 48" below grade = 96px
  const tubeDepth = 96;
  const tubeW = 20; // 10" diameter = 20px
  const bellW = 48; // 24" bell = 48px
  const bellH = 16; // 8" thick = 16px
  const bracketH = 8;
  const bracketW = 14;
  const postW = 8; // 4x4 post = ~8px (3.5" actual)
  const postH = 30;
  const beamW = 3;
  const beamH = 14;

  const frostY = gradeY + tubeDepth;

  const tubeXs = [200, 370, 540];

  return (
    <svg viewBox="0 0 700 450" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={700} height={450} fill={C.bg} />

      <EarthGradient gradeY={gradeY} depth={tubeDepth + bellH + 40} />
      <GradeLine y={gradeY} />
      <FrostLine y={frostY} />

      {tubeXs.map((cx, i) => {
        const tubeX = cx - tubeW / 2;
        const bellX = cx - bellW / 2;
        const tubeBot = gradeY + tubeDepth;

        return (
          <g key={i}>
            {/* Sonotube (rectangle in cross-section) */}
            <rect x={tubeX} y={gradeY} width={tubeW} height={tubeDepth}
              fill={C.concrete} stroke={C.concreteStroke} strokeWidth={1.2} />
            {/* Concrete speckle */}
            {[...Array(8)].map((_, si) => (
              <circle key={si}
                cx={cx + (si % 2 - 0.5) * 6}
                cy={gradeY + 12 + si * 10}
                r={0.7} fill="rgba(160,160,160,0.1)" />
            ))}

            {/* Bell footing at bottom */}
            <rect x={bellX} y={tubeBot} width={bellW} height={bellH}
              fill={C.concrete} stroke={C.concreteStroke} strokeWidth={1.2} rx={2} />

            {/* Post bracket on top */}
            <rect x={cx - bracketW / 2} y={gradeY - bracketH} width={bracketW} height={bracketH}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={1} />
            {/* Bracket saddle uprights */}
            <rect x={cx - bracketW / 2} y={gradeY - bracketH - 6} width={2} height={6}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={0.75} />
            <rect x={cx + bracketW / 2 - 2} y={gradeY - bracketH - 6} width={2} height={6}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={0.75} />

            {/* 4x4 post */}
            <rect x={cx - postW / 2} y={gradeY - bracketH - 6 - postH} width={postW} height={postH}
              fill={C.wood} stroke={C.woodStroke} strokeWidth={1} />
          </g>
        );
      })}

      {/* Beam across posts */}
      <rect
        x={tubeXs[0] - beamW / 2 - postW / 2}
        y={gradeY - bracketH - 6 - postH - beamH}
        width={tubeXs[2] - tubeXs[0] + postW + beamW}
        height={beamH}
        fill={C.wood} stroke={C.woodStroke} strokeWidth={1} rx={1}
      />

      {/* Dimensions */}
      <DimV x={tubeXs[0] - 48} y1={gradeY} y2={gradeY + tubeDepth} label={'48"'} />
      <DimH x1={tubeXs[0] - tubeW / 2} x2={tubeXs[0] + tubeW / 2}
        y={gradeY + tubeDepth + bellH + 22} label={'10" DIA'} />
      <DimH x1={tubeXs[0] - bellW / 2} x2={tubeXs[0] + bellW / 2}
        y={gradeY + tubeDepth + bellH + 38} label={'24" BELL'} />

      {/* Labels */}
      <Label x={tubeXs[1]} y={gradeY + tubeDepth / 2}
        tx={tubeXs[1] + 50} ty={gradeY + 20} text="Sonotube Form" />
      <Label x={tubeXs[1]} y={gradeY + tubeDepth + bellH / 2}
        tx={tubeXs[1] + 65} ty={gradeY + tubeDepth + bellH + 10} text="Concrete Bell Footing" />
      <Label x={tubeXs[2]} y={gradeY - bracketH / 2}
        tx={tubeXs[2] + 30} ty={gradeY - bracketH - 20} text="Post Bracket" />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 3: Helical Piles                                             */
/* ------------------------------------------------------------------ */

const HelicalSchematic: React.FC = () => {
  const gradeY = 100;
  // 7'+ = 84"+ = 168px
  const pileDepth = 168;
  const shaftW = 6; // 2.875" = ~6px (slightly exaggerated for visibility)
  const helixW = 20; // 10" helix = 20px
  const capW = 16;
  const capH = 6;
  const aboveGrade = 12; // 6" above = 12px
  const beamW = 3;
  const beamH = 14;

  const frostY = gradeY + 96; // 48" frost line

  const pileXs = [200, 370, 540];

  // Helix plates spaced ~30" = 60px apart, starting ~24" from bottom
  const helixY1Offset = pileDepth - 48; // first helix from top of underground section
  const helixY2Offset = pileDepth - 108; // second helix

  return (
    <svg viewBox="0 0 700 450" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={700} height={450} fill={C.bg} />

      <EarthGradient gradeY={gradeY} depth={pileDepth + 30} />
      <GradeLine y={gradeY} />
      <FrostLine y={frostY} />

      {pileXs.map((cx, i) => (
        <g key={i}>
          {/* Steel shaft */}
          <rect x={cx - shaftW / 2} y={gradeY - aboveGrade}
            width={shaftW} height={pileDepth + aboveGrade}
            fill={C.steel} stroke={C.steelStroke} strokeWidth={1} />

          {/* Helix plates (angled ellipses in side view) */}
          {[helixY1Offset, helixY2Offset].map((offset, hi) => {
            const py = gradeY + offset;
            return (
              <g key={hi}>
                {/* Draw helix as angled ellipse: line from left to right with thickness */}
                <ellipse cx={cx} cy={py} rx={helixW / 2} ry={3}
                  fill={C.steel} stroke={C.steelStroke} strokeWidth={1}
                  transform={`rotate(-8, ${cx}, ${py})`} />
              </g>
            );
          })}

          {/* Square cap plate on top */}
          <rect x={cx - capW / 2} y={gradeY - aboveGrade - capH}
            width={capW} height={capH}
            fill={C.steel} stroke={C.steelStroke} strokeWidth={1} />
        </g>
      ))}

      {/* Beam across cap plates */}
      <rect
        x={pileXs[0] - capW / 2 - 2}
        y={gradeY - aboveGrade - capH - beamH}
        width={pileXs[2] - pileXs[0] + capW + 4}
        height={beamH}
        fill={C.wood} stroke={C.woodStroke} strokeWidth={1} rx={1}
      />

      {/* Dimensions */}
      <DimV x={pileXs[0] - 48} y1={gradeY} y2={gradeY + pileDepth} label={"7'+"} />
      <DimH x1={pileXs[0] - shaftW / 2} x2={pileXs[0] + shaftW / 2}
        y={gradeY + pileDepth + 18} label={'2.875" SHAFT'} />
      <DimH x1={pileXs[0] - helixW / 2} x2={pileXs[0] + helixW / 2}
        y={gradeY + pileDepth + 34} label={'10" HELIX'} />

      {/* Labels */}
      <Label x={pileXs[1] + shaftW / 2} y={gradeY + pileDepth / 3}
        tx={pileXs[1] + 55} ty={gradeY + 30} text='Steel Shaft (Sch 40)' />
      <Label x={pileXs[1] + helixW / 2} y={gradeY + helixY1Offset}
        tx={pileXs[1] + 65} ty={gradeY + helixY1Offset + 15} text="Helix Plates" />
      <Label x={pileXs[2]} y={gradeY - aboveGrade - capH / 2}
        tx={pileXs[2] + 35} ty={gradeY - aboveGrade - capH - 15} text="Cap Plate" />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 4: Ground Screws                                             */
/* ------------------------------------------------------------------ */

const GroundScrewSchematic: React.FC = () => {
  const gradeY = 120;
  // 48" deep = 96px
  const screwDepth = 96;
  const shaftW = 3; // 1.5" = 3px
  const bracketW = 14;
  const bracketH = 10;
  const beamW = 3;
  const beamH = 14;

  const frostY = gradeY + screwDepth; // 48" frost line - just reaches

  const screwXs = [200, 370, 540];

  return (
    <svg viewBox="0 0 700 450" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={700} height={450} fill={C.bg} />

      <EarthGradient gradeY={gradeY} depth={screwDepth + 40} />
      <GradeLine y={gradeY} />
      <FrostLine y={frostY} />

      {screwXs.map((cx, i) => {
        const topY = gradeY - 6; // slight above grade
        const botY = gradeY + screwDepth;
        const tipY = botY + 8; // pointed end

        return (
          <g key={i}>
            {/* Shaft - tapers to point */}
            <polygon
              points={`${cx - shaftW / 2},${topY} ${cx + shaftW / 2},${topY} ${cx + shaftW / 2},${botY} ${cx},${tipY} ${cx - shaftW / 2},${botY}`}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={1}
            />

            {/* Continuous spiral thread (zigzag pattern along shaft) */}
            {(() => {
              const segments = 16;
              const segH = (botY - topY - 10) / segments;
              const threadW = 8; // thread extends 8px from shaft
              let d = `M ${cx - threadW / 2} ${topY + 10}`;
              for (let s = 0; s < segments; s++) {
                const sy = topY + 10 + s * segH;
                const dir = s % 2 === 0 ? 1 : -1;
                d += ` L ${cx + dir * threadW / 2} ${sy + segH / 2}`;
                d += ` L ${cx - dir * threadW / 2} ${sy + segH}`;
              }
              return (
                <path d={d} fill="none" stroke={C.steelStroke} strokeWidth={0.75} />
              );
            })()}

            {/* Adjustable bracket on top */}
            <rect x={cx - bracketW / 2} y={topY - bracketH} width={bracketW} height={bracketH}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={1} />
            {/* Bracket saddle uprights */}
            <rect x={cx - bracketW / 2} y={topY - bracketH - 8} width={2} height={8}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={0.75} />
            <rect x={cx + bracketW / 2 - 2} y={topY - bracketH - 8} width={2} height={8}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={0.75} />
          </g>
        );
      })}

      {/* Beam across brackets */}
      <rect
        x={screwXs[0] - bracketW / 2 - 2}
        y={gradeY - 6 - bracketH - 8 - beamH}
        width={screwXs[2] - screwXs[0] + bracketW + 4}
        height={beamH}
        fill={C.wood} stroke={C.woodStroke} strokeWidth={1} rx={1}
      />

      {/* Dimensions */}
      <DimV x={screwXs[0] - 48} y1={gradeY} y2={gradeY + screwDepth} label={'48"'} />
      <DimH x1={screwXs[0] - shaftW / 2} x2={screwXs[0] + shaftW / 2}
        y={gradeY + screwDepth + 24} label={'1.5" SHAFT'} />

      {/* Labels */}
      <Label x={screwXs[1] + 8} y={gradeY + screwDepth / 2}
        tx={screwXs[1] + 55} ty={gradeY + 25} text="Continuous Thread" />
      <Label x={screwXs[2]} y={gradeY - 6 - bracketH / 2}
        tx={screwXs[2] + 35} ty={gradeY - 6 - bracketH - 22} text="Adjustable Bracket" />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 5: NamiFix Brackets                                          */
/* ------------------------------------------------------------------ */

const NamiFixSchematic: React.FC = () => {
  const gradeY = 240;
  // Foundation wall: 8" thick = 16px, 36" visible above grade = 72px
  const wallThick = 16;
  const wallAbove = 72;
  const wallBelow = 60; // extends below grade

  // Wall is placed at left-centre of viewport
  const wallLeft = 180;
  const wallRight = wallLeft + wallThick;

  // Bracket: 20.5" tall = 41px, 4.5" projection = 9px
  const brkH = 41;
  const brkProj = 9;
  const airGap = 6; // 3" gap = 6px
  const boltDia = 3;
  const beamW = 3;
  const beamH = 14;

  const bracketYs = [gradeY - wallAbove + 15, gradeY - wallAbove + 15 + 55];

  return (
    <svg viewBox="0 0 700 450" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width={700} height={450} fill={C.bg} />

      <EarthGradient gradeY={gradeY} depth={wallBelow + 20} />
      <GradeLine y={gradeY} />

      {/* Foundation wall */}
      <rect x={wallLeft} y={gradeY - wallAbove} width={wallThick} height={wallAbove + wallBelow}
        fill={C.concrete} stroke={C.concreteStroke} strokeWidth={1.5} />
      {/* Wall concrete texture */}
      {[...Array(12)].map((_, si) => (
        <circle key={si}
          cx={wallLeft + wallThick / 2 + (si % 2 - 0.5) * 4}
          cy={gradeY - wallAbove + 10 + si * 10}
          r={0.7} fill="rgba(160,160,160,0.1)" />
      ))}

      {/* Brackets */}
      {bracketYs.map((by, i) => {
        const brkLeft = wallRight + airGap;
        const brkVertTop = by;
        const brkVertBot = by + brkH;
        const horizY = brkVertTop;

        return (
          <g key={i}>
            {/* Vertical plate against wall (with air gap) */}
            <rect x={brkLeft} y={brkVertTop} width={2} height={brkH}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={1} />

            {/* Horizontal plate (projects outward) */}
            <rect x={brkLeft} y={horizY} width={brkProj} height={2}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={1} />

            {/* Beam saddle on top */}
            <rect x={brkLeft + brkProj - 2} y={horizY - beamH} width={2} height={beamH}
              fill={C.steel} stroke={C.steelStroke} strokeWidth={0.75} />

            {/* Anchor bolts through wall */}
            <circle cx={brkLeft + 1} cy={brkVertTop + brkH * 0.25}
              r={boltDia / 2} fill={C.steelStroke} stroke={C.steelStroke} strokeWidth={0.5} />
            <line x1={brkLeft + 1} y1={brkVertTop + brkH * 0.25}
              x2={wallLeft} y2={brkVertTop + brkH * 0.25}
              stroke={C.steelStroke} strokeWidth={1} strokeDasharray="2 2" />

            <circle cx={brkLeft + 1} cy={brkVertTop + brkH * 0.75}
              r={boltDia / 2} fill={C.steelStroke} stroke={C.steelStroke} strokeWidth={0.5} />
            <line x1={brkLeft + 1} y1={brkVertTop + brkH * 0.75}
              x2={wallLeft} y2={brkVertTop + brkH * 0.75}
              stroke={C.steelStroke} strokeWidth={1} strokeDasharray="2 2" />
          </g>
        );
      })}

      {/* 2x beam sitting in bracket saddles */}
      {bracketYs.map((by, i) => {
        const brkLeft = wallRight + airGap;
        return (
          <rect key={`beam-${i}`}
            x={brkLeft + brkProj - 2}
            y={by - beamH}
            width={beamW}
            height={beamH}
            fill={C.wood} stroke={C.woodStroke} strokeWidth={1} rx={1}
          />
        );
      })}

      {/* Extended beam connecting top bracket to outer space */}
      <rect
        x={wallRight + airGap + brkProj - 2}
        y={bracketYs[0] - beamH}
        width={180}
        height={beamH}
        fill={C.wood} stroke={C.woodStroke} strokeWidth={1} rx={1}
      />

      {/* Dimensions */}
      <DimV x={wallRight + airGap + brkProj + 30}
        y1={bracketYs[0]} y2={bracketYs[0] + brkH} label={'20.5" TALL'} right />
      <DimH x1={wallRight} x2={wallRight + airGap + brkProj}
        y={bracketYs[1] + brkH + 16} label={'4.5" PROJ.'} />
      <DimH x1={wallRight} x2={wallRight + airGap}
        y={bracketYs[1] + brkH + 32} label={'3" GAP'} />

      {/* Labels */}
      <Label x={wallLeft + wallThick / 2} y={gradeY - wallAbove / 2}
        tx={60} ty={gradeY - wallAbove / 2 - 15}
        text='Foundation Wall (min 6" poured concrete)' anchor="start" />
      <Label x={wallRight + airGap + 1} y={bracketYs[0] + brkH / 2}
        tx={wallRight + airGap + 60} ty={bracketYs[0] + brkH / 2 + 25}
        text="NamiFix NP4 Bracket" />
      <Label x={wallRight + airGap + 1} y={bracketYs[0] + brkH * 0.25}
        tx={wallRight + airGap + 75} ty={bracketYs[0] - 15}
        text='5/8" x 5.5" Concrete Anchors' />
      <Label x={wallRight + airGap + brkProj + 20} y={bracketYs[0] - beamH / 2}
        tx={wallRight + airGap + brkProj + 100} ty={bracketYs[0] - beamH - 20}
        text="2x Beam" />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene map                                                          */
/* ------------------------------------------------------------------ */

const SCHEMATICS: Record<string, React.FC> = {
  blocks: BlocksSchematic,
  sonotube: SonotubeSchematic,
  helical: HelicalSchematic,
  groundscrew: GroundScrewSchematic,
  namifix: NamiFixSchematic,
};

/* ------------------------------------------------------------------ */
/*  Props (same interface as FramingVisualizer)                         */
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

const FoundationVisualizer: React.FC<Props> = ({
  selectedOption,
  dimensions,
  onSelectOption,
  getImpactValue,
}) => {
  const activeId = selectedOption?.id ?? null;
  const active = OPTIONS.find((o) => o.pricingId === activeId) ?? OPTIONS[0];

  const [desc, setDesc] = useState(active.description);
  const [vis, setVis] = useState(true);

  // Crossfade SVG on option change
  const [svgVis, setSvgVis] = useState(true);
  const [displayedId, setDisplayedId] = useState(active.id);

  useEffect(() => {
    if (active.id !== displayedId) {
      setSvgVis(false);
      const t = setTimeout(() => {
        setDisplayedId(active.id);
        setSvgVis(true);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [active.id, displayedId]);

  useEffect(() => {
    setVis(false);
    const t = setTimeout(() => {
      setDesc(active.description);
      setVis(true);
    }, 140);
    return () => clearTimeout(t);
  }, [active.description]);

  const select = (o: FoundationOption) => {
    if (o.pricingId === null) {
      if (activeId !== null) onSelectOption('__deselect__');
    } else {
      onSelectOption(o.pricingId);
    }
  };

  const SchematicComponent = SCHEMATICS[displayedId] ?? BlocksSchematic;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* SVG Schematic */}
        <div
          style={{
            flex: '1 1 62%',
            minWidth: 0,
            background: C.bg,
            borderRadius: 10,
            border: '1px solid rgba(212,168,83,0.08)',
            overflow: 'hidden',
            minHeight: 360,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              transition: 'opacity 300ms ease',
              opacity: svgVis ? 1 : 0,
            }}
          >
            <SchematicComponent />
          </div>

          {/* Overlay label */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 0,
              right: 0,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
                color: 'rgba(212,168,83,0.5)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {active.id === 'namifix'
                ? `${active.name} \u00b7 ${dimensions.namiFixCount || 0} bracket${dimensions.namiFixCount === 1 ? '' : 's'} selected`
                : `${active.name} \u00b7 ${dimensions.footingsCount || 0} footing${dimensions.footingsCount === 1 ? '' : 's'} \u00b7 ${active.unit}`}
            </span>
          </div>
        </div>

        {/* Option cards */}
        <div
          style={{
            flex: '0 0 310px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {OPTIONS.map((o) => {
            const on =
              o.pricingId === activeId || (o.pricingId === null && activeId === null);
            const imp = o.pricingId ? getImpactValue(o.pricingId) : 0;
            return (
              <button
                key={o.id}
                onClick={() => select(o)}
                aria-pressed={on}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: 'none',
                  borderLeft: on ? '3px solid #D4A853' : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  height: 72,
                  flexShrink: 0,
                  transition: 'all 200ms ease',
                  background: on ? 'rgba(212,168,83,0.07)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: on ? '#E8E0D4' : 'rgba(232,224,212,0.6)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {o.name}
                    </span>
                    {o.badge && (
                      <span
                        style={{
                          fontSize: 7,
                          fontWeight: 800,
                          letterSpacing: 1,
                          padding: '2px 6px',
                          borderRadius: 3,
                          textTransform: 'uppercase' as const,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          background:
                            o.badge === 'SPECIALTY'
                              ? 'rgba(74,139,107,0.3)'
                              : 'rgba(212,168,83,0.15)',
                          color: o.badge === 'SPECIALTY' ? '#6BCB9B' : '#D4A853',
                        }}
                      >
                        {o.badge}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      lineHeight: '13px',
                      color: on ? 'rgba(212,168,83,0.6)' : 'rgba(232,224,212,0.28)',
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {o.advantage}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(232,224,212,0.2)' }}>
                    {o.unit === 'included'
                      ? 'Standard with every deck'
                      : o.id === 'namifix'
                        ? `${dimensions.namiFixCount || 0} installed \u00b7 ${o.unit}`
                        : `${dimensions.footingsCount || 0} footings \u00b7 ${o.unit}`}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: on ? '#D4A853' : 'rgba(212,168,83,0.35)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textAlign: 'right',
                  }}
                >
                  {o.priceDelta === 0
                    ? 'Included'
                    : imp > 0
                      ? `+$${Math.round(imp).toLocaleString()}`
                      : `+$${o.priceDelta}/unit`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          border: '1px solid rgba(212,168,83,0.05)',
          minHeight: 40,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: 'rgba(232,224,212,0.5)',
            lineHeight: 1.5,
            margin: 0,
            transition: 'opacity 140ms ease',
            opacity: vis ? 1 : 0,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
};

export default FoundationVisualizer;
