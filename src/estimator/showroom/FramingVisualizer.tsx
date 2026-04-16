import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
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
  { id: 'std', pricingId: null, name: '2\u00d78 PT \u00b7 16" OC', advantage: 'Ontario Building Code standard. Included with every deck.', description: 'Standard pressure-treated 2\u00d78 framing at 16" on-centre spacing. Meets Ontario Building Code for residential decks up to 14-foot spans. Included with every project.', joistCount: 11, heightMul: 1, material: 'wood', badge: 'INCLUDED', priceDelta: 0 },
  { id: '8-12', pricingId: 'upgrade_2x8_12', name: '2\u00d78 PT \u00b7 12" OC', advantage: '33% more joists \u2014 reduces bounce underfoot.', description: 'Closer joist spacing eliminates flex and bounce, especially with composite decking. Recommended for hot tubs, outdoor kitchens, or diagonal board patterns.', joistCount: 15, heightMul: 1, material: 'wood', badge: null, priceDelta: 1.95 },
  { id: '10-16', pricingId: 'upgrade_2x10_16', name: '2\u00d710 PT \u00b7 16" OC', advantage: '28% deeper joists \u2014 longer spans, less flex.', description: 'Larger 2\u00d710 joists span further without mid-span support. Ideal for elevated decks or spans over 14 feet.', joistCount: 11, heightMul: 1.28, material: 'wood', badge: null, priceDelta: 4.49 },
  { id: '10-12', pricingId: 'upgrade_2x10_12', name: '2\u00d710 PT \u00b7 12" OC', advantage: 'Maximum wood frame \u2014 zero bounce.', description: 'The strongest conventional wood frame. Deeper joists at tighter spacing \u2014 feels like a concrete patio underfoot.', joistCount: 15, heightMul: 1.28, material: 'wood', badge: null, priceDelta: 6.49 },
  { id: 'fg', pricingId: 'fiberglass_framing', name: 'Fiberglass Composite', advantage: 'Will not rot, warp, or split. Lifetime warranty.', description: 'Owens Corning fiberglass composite joists. Immune to moisture, insects, and UV. Zero maintenance for the life of the structure.', joistCount: 11, heightMul: 1.28, material: 'fiberglass', badge: 'PREMIUM', priceDelta: 29.95 },
];

/* ------------------------------------------------------------------ */
/*  Materials                                                          */
/* ------------------------------------------------------------------ */

const WOOD_COLOR = new THREE.Color('#C4A060');
const WOOD_DARK = new THREE.Color('#8B7040');
const FG_COLOR = new THREE.Color('#4A8B6B');
const FG_DARK = new THREE.Color('#2E6B4A');
const POST_COLOR = new THREE.Color('#9B8050');
const BRACKET_COLOR = new THREE.Color('#A0A8B0');

/* ------------------------------------------------------------------ */
/*  3D Scene                                                           */
/* ------------------------------------------------------------------ */

interface SceneProps {
  joistCount: number;
  heightMul: number;
  material: 'wood' | 'fiberglass';
}

/** Single lumber piece */
const Lumber: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: THREE.Color;
  opacity?: number;
  visible?: boolean;
}> = ({ position, size, color, opacity = 1, visible = true }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const target = visible ? opacity : 0;
    const current = (ref.current.material as THREE.MeshStandardMaterial).opacity;
    if (Math.abs(current - target) > 0.01) {
      (ref.current.material as THREE.MeshStandardMaterial).opacity += (target - current) * 0.12;
      (ref.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  });

  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        metalness={0.02}
        transparent
        opacity={visible ? opacity : 0}
      />
    </mesh>
  );
};

/** Metal bracket */
const Bracket: React.FC<{
  position: [number, number, number];
  visible?: boolean;
}> = ({ position, visible = true }) => {
  if (!visible) return null;
  return (
    <mesh position={position}>
      <boxGeometry args={[0.08, 0.12, 0.04]} />
      <meshStandardMaterial color={BRACKET_COLOR} roughness={0.4} metalness={0.6} />
    </mesh>
  );
};

const DeckFrame: React.FC<SceneProps> = ({ joistCount, heightMul, material }) => {
  const isG = material === 'fiberglass';
  const jColor = isG ? FG_COLOR : WOOD_COLOR;
  const beamColor = isG ? FG_DARK : WOOD_DARK;

  // Frame dimensions (Three.js units ≈ feet)
  const W = 5;        // width
  const D = 3.5;      // depth
  const jW = 0.125;   // joist width (1.5" = 0.125ft)
  const jH = 0.6 * heightMul; // joist height
  const beamH = 0.7;
  const beamW = 0.25;
  const postW = 0.3;
  const postH = 1.2;
  const rimW = 0.125;

  // 15 joist slots
  const MAX = 15;
  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < MAX; i++) arr.push(-W / 2 + ((i + 1) / (MAX + 1)) * W);
    return arr;
  }, []);

  const vis = useMemo(() => {
    const s = new Set<number>();
    if (joistCount >= MAX) for (let i = 0; i < MAX; i++) s.add(i);
    else for (let i = 0; i < joistCount; i++) s.add(Math.round((i * (MAX - 1)) / (joistCount - 1)));
    return s;
  }, [joistCount]);

  const beamY = -postH / 2 - beamH / 2;
  const joistY = beamY - beamH / 2 - jH / 2 + 0.02;
  const postY = -postH / 2;

  const posts = [-W * 0.42, -W * 0.14, W * 0.14, W * 0.42];

  // Slow auto-rotation
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Posts */}
      {posts.map((px, i) => (
        <Lumber key={`post-${i}`}
          position={[px, postY, 0]}
          size={[postW, postH, postW]}
          color={POST_COLOR}
        />
      ))}

      {/* Beam (perpendicular to joists) */}
      <Lumber
        position={[0, beamY, 0]}
        size={[W + 0.3, beamH, beamW]}
        color={beamColor}
      />

      {/* Joists — all 15 slots */}
      {slots.map((jx, i) => (
        <React.Fragment key={`j-${i}`}>
          <Lumber
            position={[jx, joistY, 0]}
            size={[jW, jH, D]}
            color={jColor}
            visible={vis.has(i)}
          />
          <Bracket
            position={[jx, beamY + beamH / 2 + 0.02, 0]}
            visible={vis.has(i)}
          />
        </React.Fragment>
      ))}

      {/* End joists */}
      <Lumber position={[-W / 2 - jW / 2, joistY, 0]} size={[jW, jH, D]} color={jColor} />
      <Lumber position={[W / 2 + jW / 2, joistY, 0]} size={[jW, jH, D]} color={jColor} />

      {/* Rim joist (front) */}
      <Lumber
        position={[0, joistY, D / 2 + rimW / 2]}
        size={[W + jW * 4, jH, rimW]}
        color={jColor}
      />

      {/* Ledger (back — always wood) */}
      <Lumber
        position={[0, joistY, -D / 2 - rimW / 2]}
        size={[W + jW * 2, jH, rimW]}
        color={WOOD_DARK}
      />

      {/* Blocking at beam line (between visible joists) */}
      {slots.map((jx, i) => {
        if (!vis.has(i)) return null;
        let nextIdx = -1;
        for (let n = i + 1; n < MAX; n++) { if (vis.has(n)) { nextIdx = n; break; } }
        if (nextIdx < 0) return null;
        const nx = slots[nextIdx];
        const mid = (jx + nx) / 2;
        const gap = nx - jx - jW;
        if (gap < 0.05) return null;
        return (
          <Lumber key={`blk-${i}`}
            position={[mid, joistY + jH * 0.1, 0]}
            size={[gap, jH * 0.75, jW]}
            color={jColor}
            opacity={0.8}
          />
        );
      })}

      {/* Ground plane (subtle shadow catcher) */}
      <mesh position={[0, postY - postH / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>
    </group>
  );
};

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
/*  Main Component                                                     */
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
        {/* 3D Canvas */}
        <div style={{
          flex: '1 1 62%', minWidth: 0, background: 'rgba(255,255,255,0.015)',
          borderRadius: 10, border: '1px solid rgba(212,168,83,0.08)',
          overflow: 'hidden', minHeight: 340,
        }}>
          <Canvas
            shadows
            camera={{ position: [4, 3, 4], fov: 35 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true, alpha: true }}
          >
            <color attach="background" args={['#0A0A0A']} />
            <ambientLight intensity={0.4} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            <directionalLight position={[-3, 4, -2]} intensity={0.3} />
            <DeckFrame
              joistCount={active.joistCount}
              heightMul={active.heightMul}
              material={active.material}
            />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.5}
              autoRotate
              autoRotateSpeed={0.3}
            />
          </Canvas>
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
