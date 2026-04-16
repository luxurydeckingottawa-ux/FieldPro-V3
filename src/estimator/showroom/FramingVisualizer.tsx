import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PricingTier, Dimensions } from '../EstimatorCalculatorView';

/* ------------------------------------------------------------------ */
/*  Real-world dimensions (in feet). 1 Three.js unit = 1 foot.        */
/*                                                                     */
/*  Deck frame: 8' wide x 12' deep (common residential size)          */
/*  Joists run front-to-back (12' span).                               */
/*  Rim joists run left-to-right (8' width).                           */
/*                                                                     */
/*  2x8 actual: 1.5" wide x 7.25" tall = 0.125' x 0.604'             */
/*  2x10 actual: 1.5" wide x 9.25" tall = 0.125' x 0.771'            */
/*                                                                     */
/*  At 16" OC on 8' deck: joists at 0, 16, 32, 48, 64, 80, 96"       */
/*    = 7 total (5 interior + 2 end joists)                            */
/*  At 12" OC on 8' deck: joists at 0, 12, 24, 36, 48, 60, 72, 84, 96" */
/*    = 9 total (7 interior + 2 end joists)                            */
/* ------------------------------------------------------------------ */

const DECK_W = 8;     // 8 feet wide
const DECK_D = 12;    // 12 feet deep
const JOIST_W = 0.125; // 1.5 inches
const H_2x8 = 0.604;  // 7.25 inches
const H_2x10 = 0.771; // 9.25 inches
const RIM_W = 0.125;   // rim joist thickness (same as joists)

function joistPositions(oc: number): number[] {
  // oc in inches, deck width in feet
  const widthInches = DECK_W * 12;
  const positions: number[] = [];
  for (let pos = 0; pos <= widthInches; pos += oc) {
    positions.push(pos / 12); // convert back to feet
  }
  // Ensure the last joist is at the end
  if (positions[positions.length - 1] < DECK_W - 0.01) {
    positions.push(DECK_W);
  }
  return positions;
}

/* ------------------------------------------------------------------ */
/*  Framing options                                                    */
/* ------------------------------------------------------------------ */

interface FramingOption {
  id: string;
  pricingId: string | null;
  name: string;
  advantage: string;
  description: string;
  oc: number; // on-center inches
  joistH: number;
  material: 'wood' | 'fiberglass';
  badge: string | null;
  priceDelta: number;
}

const OPTIONS: FramingOption[] = [
  { id: 'std', pricingId: null, name: '2\u00d78 PT \u00b7 16" OC', advantage: 'Ontario Building Code standard. Included with every deck.', description: 'Standard pressure-treated 2\u00d78 framing at 16" on-centre spacing. Meets Ontario Building Code for residential decks up to 14-foot spans. Included with every project.', oc: 16, joistH: H_2x8, material: 'wood', badge: 'INCLUDED', priceDelta: 0 },
  { id: '8-12', pricingId: 'upgrade_2x8_12', name: '2\u00d78 PT \u00b7 12" OC', advantage: '33% more joists \u2014 reduces bounce underfoot.', description: 'Closer joist spacing eliminates flex and bounce, especially with composite decking. Recommended for hot tubs, outdoor kitchens, or diagonal board patterns.', oc: 12, joistH: H_2x8, material: 'wood', badge: null, priceDelta: 1.95 },
  { id: '10-16', pricingId: 'upgrade_2x10_16', name: '2\u00d710 PT \u00b7 16" OC', advantage: '28% deeper joists \u2014 longer spans, less flex.', description: 'Larger 2\u00d710 joists span further without mid-span support. Ideal for elevated decks or spans over 14 feet.', oc: 16, joistH: H_2x10, material: 'wood', badge: null, priceDelta: 4.49 },
  { id: '10-12', pricingId: 'upgrade_2x10_12', name: '2\u00d710 PT \u00b7 12" OC', advantage: 'Maximum wood frame \u2014 zero bounce.', description: 'The strongest conventional wood frame. Deeper joists at tighter spacing \u2014 feels like a concrete patio underfoot.', oc: 12, joistH: H_2x10, material: 'wood', badge: null, priceDelta: 6.49 },
  { id: 'fg', pricingId: 'fiberglass_framing', name: 'Fiberglass Composite', advantage: 'Will not rot, warp, or split. Lifetime warranty.', description: 'Owens Corning fiberglass composite joists. Immune to moisture, insects, and UV. Zero maintenance for the life of the structure.', oc: 16, joistH: H_2x10, material: 'fiberglass', badge: 'PREMIUM', priceDelta: 29.95 },
];

/* ------------------------------------------------------------------ */
/*  Wood material with slight colour variation per piece               */
/* ------------------------------------------------------------------ */

/** Create a small canvas texture simulating wood grain */
function createWoodTexture(baseHex: string, isGlass: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 64, 256);

  // Grain lines (run along the length of the board)
  const base = new THREE.Color(baseHex);
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 256;
    const w = 0.5 + Math.random() * 1.5;
    const lightness = (Math.random() - 0.5) * 0.12;
    const c = base.clone();
    c.offsetHSL(0, 0, lightness);
    ctx.strokeStyle = `#${c.getHexString()}`;
    ctx.lineWidth = w;
    ctx.globalAlpha = 0.3 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 3);
    ctx.bezierCurveTo(16, y + (Math.random() - 0.5) * 5, 48, y + (Math.random() - 0.5) * 5, 64, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Occasional knot (subtle dark spot)
  if (!isGlass && Math.random() > 0.5) {
    const kx = 10 + Math.random() * 44;
    const ky = 40 + Math.random() * 176;
    const kr = 2 + Math.random() * 3;
    const kc = base.clone();
    kc.offsetHSL(0, -0.1, -0.15);
    ctx.fillStyle = `#${kc.getHexString()}`;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(kx, ky, kr, kr * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

function woodMat(base: THREE.Color, seed: number, isGlass: boolean): THREE.MeshStandardMaterial {
  const c = base.clone();
  const vary = ((seed * 7919) % 100) / 100;
  c.offsetHSL(0, 0, (vary - 0.5) * 0.05);
  const tex = createWoodTexture(`#${c.getHexString()}`, isGlass);
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: c,
    roughness: isGlass ? 0.55 : 0.85,
    metalness: isGlass ? 0.05 : 0.0,
  });
}

/* ------------------------------------------------------------------ */
/*  3D Scene                                                           */
/* ------------------------------------------------------------------ */

interface SceneProps {
  oc: number;
  joistH: number;
  material: 'wood' | 'fiberglass';
}

const DeckFrame: React.FC<SceneProps> = ({ oc, joistH, material }) => {
  const isG = material === 'fiberglass';
  const baseColor = isG ? new THREE.Color('#4E9070') : new THREE.Color('#C8A665');
  const rimColor = isG ? new THREE.Color('#3D7558') : new THREE.Color('#B89555');

  const positions = useMemo(() => joistPositions(oc), [oc]);

  // Centre the frame at origin
  const cx = DECK_W / 2;
  const cz = DECK_D / 2;

  // Slow auto-rotation around Y
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.06;
  });

  // Create materials with slight variation
  const joistMats = useMemo(
    () => positions.map((_, i) => woodMat(baseColor, i, isG)),
    [oc, isG] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const rimMat = useMemo(() => woodMat(rimColor, 99, isG), [isG]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={groupRef}>
      {/* Interior joists — run front to back (along Z axis) */}
      {positions.map((px, i) => (
        <mesh key={`j-${i}-${oc}`} position={[px - cx, joistH / 2, 0]} castShadow receiveShadow material={joistMats[i]}>
          <boxGeometry args={[JOIST_W, joistH, DECK_D - RIM_W * 2]} />
        </mesh>
      ))}

      {/* Front rim joist — runs across the width */}
      <mesh position={[0, joistH / 2, cz - RIM_W / 2]} castShadow receiveShadow material={rimMat}>
        <boxGeometry args={[DECK_W, joistH, RIM_W]} />
      </mesh>

      {/* Back rim joist (ledger) — runs across the width */}
      <mesh position={[0, joistH / 2, -(cz - RIM_W / 2)]} castShadow receiveShadow material={rimMat}>
        <boxGeometry args={[DECK_W, joistH, RIM_W]} />
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
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const FramingVisualizer: React.FC<Props> = ({ selectedOption, dimensions, onSelectOption, getImpactValue }) => {
  const activeId = selectedOption?.id ?? null;
  const active = OPTIONS.find(o => o.pricingId === activeId) ?? OPTIONS[0];
  const jPositions = joistPositions(active.oc);

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
          flex: '1 1 62%', minWidth: 0, background: '#080808',
          borderRadius: 10, border: '1px solid rgba(212,168,83,0.08)',
          overflow: 'hidden', minHeight: 360, position: 'relative',
        }}>
          <Canvas
            shadows
            camera={{ position: [10, 7.5, 12], fov: 28, near: 0.1, far: 100 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          >
            <color attach="background" args={['#080808']} />

            {/* Lighting */}
            <ambientLight intensity={0.35} />
            <directionalLight position={[6, 10, 8]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
            <directionalLight position={[-4, 6, -3]} intensity={0.4} color="#B0C0D0" />
            <pointLight position={[0, 5, 0]} intensity={0.3} />

            <DeckFrame oc={active.oc} joistH={active.joistH} material={active.material} />

            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={8}
              maxDistance={22}
              minPolarAngle={Math.PI / 8}
              maxPolarAngle={Math.PI / 2.8}
              target={[0, 0.3, 0]}
              autoRotate
              autoRotateSpeed={0.4}
            />
          </Canvas>

          {/* Zoom buttons */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {['+', '\u2212'].map((label, i) => (
              <button key={label} onClick={() => {
                // Dispatch wheel event to trigger OrbitControls zoom
                const el = document.querySelector('canvas');
                if (el) el.dispatchEvent(new WheelEvent('wheel', { deltaY: i === 0 ? -100 : 100, bubbles: true }));
              }} style={{
                width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(212,168,83,0.2)',
                background: 'rgba(0,0,0,0.5)', color: 'rgba(212,168,83,0.7)', fontSize: 16,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, lineHeight: 1, backdropFilter: 'blur(4px)',
              }}>{label}</button>
            ))}
          </div>

          {/* Overlay label */}
          <div style={{
            position: 'absolute', bottom: 12, left: 0, right: 0,
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
              color: 'rgba(212,168,83,0.5)', fontFamily: "'DM Sans', sans-serif",
            }}>
              {`${active.oc}" on centre \u00b7 ${jPositions.length} joists \u00b7 ${active.joistH === H_2x8 ? '2\u00d78' : '2\u00d710'} frame \u00b7 8\u2032 \u00d7 12\u2032 deck`}
            </span>
          </div>
        </div>

        {/* Option cards */}
        <div style={{ flex: '0 0 310px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', minHeight: 0 }}>
          {OPTIONS.map(o => {
            const on = o.pricingId === activeId || (o.pricingId === null && activeId === null);
            const imp = o.pricingId ? getImpactValue(o.pricingId) : 0;
            const jCount = joistPositions(o.oc).length;
            return (
              <button key={o.id} onClick={() => select(o)} aria-pressed={on} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 8, border: 'none', borderLeft: on ? '3px solid #D4A853' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', height: 72, flexShrink: 0,
                transition: 'all 200ms ease',
                background: on ? 'rgba(212,168,83,0.07)' : 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: on ? '#E8E0D4' : 'rgba(232,224,212,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</span>
                    {o.badge && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase' as const, whiteSpace: 'nowrap', flexShrink: 0, background: o.badge === 'PREMIUM' ? 'rgba(74,139,107,0.3)' : 'rgba(212,168,83,0.15)', color: o.badge === 'PREMIUM' ? '#6BCB9B' : '#D4A853' }}>{o.badge}</span>}
                  </div>
                  <div style={{ fontSize: 10, lineHeight: '13px', color: on ? 'rgba(212,168,83,0.6)' : 'rgba(232,224,212,0.28)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.advantage}</div>
                  <div style={{ fontSize: 9, color: 'rgba(232,224,212,0.2)' }}>{jCount} joists &middot; {o.joistH === H_2x8 ? '7.25"' : '9.25"'} deep</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: on ? '#D4A853' : 'rgba(212,168,83,0.35)', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'right' }}>
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
