import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
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
/*  Material helpers                                                   */
/* ------------------------------------------------------------------ */

/** Concrete material -- rough grey */
function concreteMat(shade?: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(shade ?? '#9A9A9A'),
    roughness: 0.92,
    metalness: 0.0,
  });
}

/** Steel / galvanized metal material */
function steelMat(shade?: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(shade ?? '#B0B5B8'),
    roughness: 0.35,
    metalness: 0.7,
  });
}

/** Wood material (warm brown for beams) */
function beamMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#C8A665'),
    roughness: 0.82,
    metalness: 0.0,
  });
}

/** Earth / ground cross-section material */
function earthMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5C4A32'),
    roughness: 0.95,
    metalness: 0.0,
  });
}

/* ------------------------------------------------------------------ */
/*  Shared ground plane                                                */
/* ------------------------------------------------------------------ */

const GroundPlane: React.FC<{ cutaway?: boolean }> = ({ cutaway }) => {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#4A6B3A'),
        roughness: 0.95,
        metalness: 0.0,
        transparent: cutaway,
        opacity: cutaway ? 0.45 : 0.85,
        side: cutaway ? THREE.DoubleSide : THREE.FrontSide,
      }),
    [cutaway],
  );
  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat}>
      <planeGeometry args={[14, 10]} />
    </mesh>
  );
};

/** Earth cross-section block visible under ground for cutaway views */
const EarthSection: React.FC = () => {
  const mat = useMemo(() => earthMat(), []);
  return (
    <mesh position={[0, -2.25, 0]} material={mat}>
      <boxGeometry args={[14, 4.5, 10]} />
    </mesh>
  );
};

/** Ground-level indicator line */
const GroundLine: React.FC = () => {
  const points = useMemo(() => {
    const p: THREE.Vector3[] = [];
    p.push(new THREE.Vector3(-7, 0.005, -5));
    p.push(new THREE.Vector3(7, 0.005, -5));
    p.push(new THREE.Vector3(7, 0.005, 5));
    p.push(new THREE.Vector3(-7, 0.005, 5));
    p.push(new THREE.Vector3(-7, 0.005, -5));
    return p;
  }, []);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#D4A853" transparent opacity={0.3} />
    </line>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 1: Deck Blocks                                               */
/*  6 truncated concrete pyramids in 2x3 grid + beam on top            */
/* ------------------------------------------------------------------ */

const BlockScene: React.FC = () => {
  const cMat = useMemo(() => concreteMat('#A0A0A0'), []);
  const bMat = useMemo(() => beamMat(), []);

  // 2 rows (X) x 3 cols (Z), spacing ~3ft apart
  const positions: [number, number][] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      positions.push([row * 3 - 1.5, col * 3 - 3]);
    }
  }

  // Truncated pyramid: 12"x12" base = 1ft, 6"x6" top = 0.5ft, 8" tall ~ 0.667ft
  const blockH = 0.667;
  const blockGeo = useMemo(() => {
    // Build a simple truncated pyramid from a cylinder with 4 radial segments
    const topR = 0.25; // half of 6"
    const botR = 0.5; // half of 12"
    return new THREE.CylinderGeometry(topR, botR, blockH, 4, 1);
  }, []);

  return (
    <group>
      <GroundPlane />
      <GroundLine />
      {positions.map(([px, pz], i) => (
        <mesh
          key={i}
          geometry={blockGeo}
          position={[px, blockH / 2, pz]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
          receiveShadow
          material={cMat}
        />
      ))}
      {/* 2x beam running across the blocks (along Z) for each row */}
      {[0, 1].map((row) => (
        <mesh
          key={`beam-${row}`}
          position={[row * 3 - 1.5, blockH + 0.0625, 0]}
          castShadow
          receiveShadow
          material={bMat}
        >
          <boxGeometry args={[0.125, 0.125, 8]} />
        </mesh>
      ))}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2: Sonotube Footings (cross-section view)                    */
/*  3 sonotubes in a row, 48" deep, visible underground                */
/* ------------------------------------------------------------------ */

const SonotubeScene: React.FC = () => {
  const cMat = useMemo(() => concreteMat('#A0A0A0'), []);
  const bracketMat = useMemo(() => steelMat('#8A8A8A'), []);
  const bMat = useMemo(() => beamMat(), []);

  // 10" diameter = 0.833ft radius = 0.417ft, 48" = 4ft deep
  const tubeR = 0.417;
  const tubeH = 4;
  // Bell footing at bottom: wider radius, 6" tall
  const bellR = 0.667;
  const bellH = 0.5;
  // Post bracket on top: small metal plate
  const bracketSize = 0.3;

  const xs = [-3, 0, 3];

  return (
    <group>
      <GroundPlane cutaway />
      <EarthSection />
      <GroundLine />
      {xs.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* Sonotube cylinder going 48" below grade */}
          <mesh position={[0, -tubeH / 2, 0]} castShadow receiveShadow material={cMat}>
            <cylinderGeometry args={[tubeR, tubeR, tubeH, 16]} />
          </mesh>
          {/* Bell footing at bottom */}
          <mesh position={[0, -tubeH - bellH / 2, 0]} castShadow receiveShadow material={cMat}>
            <cylinderGeometry args={[tubeR, bellR, bellH, 16]} />
          </mesh>
          {/* Post bracket on top */}
          <mesh position={[0, 0.04, 0]} castShadow receiveShadow material={bracketMat}>
            <boxGeometry args={[bracketSize, 0.08, bracketSize]} />
          </mesh>
        </group>
      ))}
      {/* Beam across the top */}
      <mesh position={[0, 0.08 + 0.0625, 0]} castShadow receiveShadow material={bMat}>
        <boxGeometry args={[8, 0.125, 0.125]} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 3: Helical Piles                                             */
/*  Steel shaft 2.875" dia with helix plates, cross-section view       */
/* ------------------------------------------------------------------ */

/** Single helix plate (a flat disc at an angle) */
const HelixPlate: React.FC<{
  y: number;
  radius: number;
  mat: THREE.MeshStandardMaterial;
}> = ({ y, radius, mat }) => (
  <mesh position={[0, y, 0]} rotation={[0.15, 0, 0]} castShadow receiveShadow material={mat}>
    <cylinderGeometry args={[radius, radius, 0.04, 24]} />
  </mesh>
);

const HelicalScene: React.FC = () => {
  const sMat = useMemo(() => steelMat('#B0B5B8'), []);
  const capMat = useMemo(() => steelMat('#909090'), []);
  const bMat = useMemo(() => beamMat(), []);

  // 2.875" shaft = 0.24ft diameter = 0.12ft radius
  const shaftR = 0.12;
  // Total length ~7ft (84"), extends 6" above grade
  const aboveGrade = 0.5;
  const belowGrade = 6.5;
  const totalH = aboveGrade + belowGrade;
  // Helix plates 10" diameter = 0.833ft diameter = 0.417ft radius
  const helixR = 0.417;

  const xs = [-3, 0, 3];

  return (
    <group>
      <GroundPlane cutaway />
      <EarthSection />
      <GroundLine />
      {xs.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* Steel shaft */}
          <mesh
            position={[0, aboveGrade / 2 - belowGrade / 2, 0]}
            castShadow
            receiveShadow
            material={sMat}
          >
            <cylinderGeometry args={[shaftR, shaftR, totalH, 12]} />
          </mesh>
          {/* Helix plates (2 per pile, spaced along the underground portion) */}
          <HelixPlate y={-2.5} radius={helixR} mat={sMat} />
          <HelixPlate y={-4.5} radius={helixR} mat={sMat} />
          {/* Square cap plate on top */}
          <mesh position={[0, aboveGrade + 0.03, 0]} castShadow receiveShadow material={capMat}>
            <boxGeometry args={[0.4, 0.06, 0.4]} />
          </mesh>
        </group>
      ))}
      {/* Beam across the top */}
      <mesh position={[0, aboveGrade + 0.06 + 0.0625, 0]} castShadow receiveShadow material={bMat}>
        <boxGeometry args={[8, 0.125, 0.125]} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 4: Ground Screws                                             */
/*  1.5" shaft, continuous spiral thread, pointed end, 48" long        */
/* ------------------------------------------------------------------ */

/** Spiral thread wrap around a shaft */
const SpiralThread: React.FC<{
  height: number;
  shaftR: number;
  threadR: number;
  mat: THREE.MeshStandardMaterial;
}> = ({ height, shaftR, threadR, mat }) => {
  const geo = useMemo(() => {
    // Build a spiral using a series of small torus segments
    const points: THREE.Vector3[] = [];
    const turns = 12;
    const segments = turns * 16;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2;
      const y = -t * height + height / 2;
      const r = shaftR + threadR * 0.5;
      points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, segments, threadR * 0.35, 6, false);
  }, [height, shaftR, threadR]);

  return <mesh geometry={geo} castShadow receiveShadow material={mat} />;
};

const GroundScrewScene: React.FC = () => {
  const sMat = useMemo(() => steelMat('#B0B5B8'), []);
  const capMat = useMemo(() => steelMat('#909090'), []);
  const bMat = useMemo(() => beamMat(), []);

  // 1.5" shaft = 0.125ft diameter = 0.0625ft radius
  const shaftR = 0.0625;
  // 48" = 4ft long total, mostly underground
  const aboveGrade = 0.4;
  const belowGrade = 3.6;
  const totalH = aboveGrade + belowGrade;
  // Thread radius extends out ~0.15ft from shaft
  const threadR = 0.15;

  const xs = [-2.5, 0, 2.5];

  return (
    <group>
      <GroundPlane cutaway />
      <EarthSection />
      <GroundLine />
      {xs.map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          {/* Steel shaft - tapers to a point */}
          <mesh
            position={[0, aboveGrade / 2 - belowGrade / 2, 0]}
            castShadow
            receiveShadow
            material={sMat}
          >
            <cylinderGeometry args={[shaftR, shaftR * 0.15, totalH, 8]} />
          </mesh>
          {/* Continuous spiral thread */}
          <group position={[0, aboveGrade / 2 - belowGrade / 2, 0]}>
            <SpiralThread height={totalH * 0.85} shaftR={shaftR} threadR={threadR} mat={sMat} />
          </group>
          {/* Adjustable bracket on top */}
          <mesh position={[0, aboveGrade + 0.06, 0]} castShadow receiveShadow material={capMat}>
            <boxGeometry args={[0.3, 0.12, 0.3]} />
          </mesh>
          {/* Bracket uprights */}
          <mesh position={[-0.12, aboveGrade + 0.18, 0]} castShadow receiveShadow material={capMat}>
            <boxGeometry args={[0.03, 0.12, 0.2]} />
          </mesh>
          <mesh position={[0.12, aboveGrade + 0.18, 0]} castShadow receiveShadow material={capMat}>
            <boxGeometry args={[0.03, 0.12, 0.2]} />
          </mesh>
        </group>
      ))}
      {/* Beam across the top */}
      <mesh
        position={[0, aboveGrade + 0.24 + 0.0625, 0]}
        castShadow
        receiveShadow
        material={bMat}
      >
        <boxGeometry args={[7, 0.125, 0.125]} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 5: NamiFix Brackets                                          */
/*  Concrete foundation wall + L-brackets bolted to it + beam          */
/* ------------------------------------------------------------------ */

const NamiFixScene: React.FC = () => {
  const wallMat = useMemo(() => concreteMat('#888888'), []);
  const bracketMat = useMemo(() => steelMat('#A0A5A8'), []);
  const boltMat = useMemo(() => steelMat('#666666'), []);
  const bMat = useMemo(() => beamMat(), []);

  // Foundation wall: 8" thick = 0.667ft, 3ft tall, 8ft wide
  const wallThick = 0.667;
  const wallH = 3;
  const wallW = 8;
  // Bracket: L-shaped, ~20" tall = 1.667ft, 8" wide = 0.667ft, projects 4" = 0.333ft
  const brkH = 1.667;
  const brkW = 0.667;
  const brkProj = 0.333;
  const plateThick = 0.04;

  const bracketXs = [-2, 0, 2];

  return (
    <group>
      <GroundPlane />
      <GroundLine />
      {/* Concrete foundation wall */}
      <mesh position={[0, wallH / 2, -2]} castShadow receiveShadow material={wallMat}>
        <boxGeometry args={[wallW, wallH, wallThick]} />
      </mesh>
      {/* NamiFix brackets */}
      {bracketXs.map((x, i) => (
        <group key={i} position={[x, 0, -2 + wallThick / 2]}>
          {/* Vertical plate (flush against wall) */}
          <mesh
            position={[0, brkH / 2 + 0.5, 0]}
            castShadow
            receiveShadow
            material={bracketMat}
          >
            <boxGeometry args={[brkW, brkH, plateThick]} />
          </mesh>
          {/* Horizontal plate (projects outward) */}
          <mesh
            position={[0, brkH + 0.5, brkProj / 2]}
            castShadow
            receiveShadow
            material={bracketMat}
          >
            <boxGeometry args={[brkW, plateThick, brkProj]} />
          </mesh>
          {/* Bolts on vertical plate (4 dots) */}
          {[0.3, 0.8, 1.2, 1.5].map((by, bi) => (
            <mesh
              key={bi}
              position={[0, by + 0.5, plateThick / 2 + 0.01]}
              material={boltMat}
            >
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 2x beam sitting in bracket saddles */}
      <mesh
        position={[0, brkH + 0.5 + plateThick + 0.0625, -2 + wallThick / 2 + brkProj / 2]}
        castShadow
        receiveShadow
        material={bMat}
      >
        <boxGeometry args={[wallW - 0.5, 0.125, 0.125]} />
      </mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene switcher with auto-rotation                                  */
/* ------------------------------------------------------------------ */

const SCENES: Record<string, React.FC> = {
  blocks: BlockScene,
  sonotube: SonotubeScene,
  helical: HelicalScene,
  groundscrew: GroundScrewScene,
  namifix: NamiFixScene,
};

const FoundationScene: React.FC<{ activeId: string }> = ({ activeId }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.06;
  });

  const SceneComponent = SCENES[activeId] ?? BlockScene;
  return (
    <group ref={groupRef}>
      <SceneComponent />
    </group>
  );
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        {/* 3D Canvas */}
        <div
          style={{
            flex: '1 1 62%',
            minWidth: 0,
            background: '#080808',
            borderRadius: 10,
            border: '1px solid rgba(212,168,83,0.08)',
            overflow: 'hidden',
            minHeight: 360,
            position: 'relative',
          }}
        >
          <Canvas
            shadows
            camera={{ position: [10, 7.5, 12], fov: 28, near: 0.1, far: 100 }}
            style={{ width: '100%', height: '100%' }}
            gl={{
              antialias: true,
              alpha: false,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
          >
            <color attach="background" args={['#080808']} />

            {/* Lighting (same as framing) */}
            <ambientLight intensity={0.35} />
            <directionalLight
              position={[6, 10, 8]}
              intensity={1.8}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0002}
            />
            <directionalLight position={[-4, 6, -3]} intensity={0.4} color="#B0C0D0" />
            <pointLight position={[0, 5, 0]} intensity={0.3} />

            <FoundationScene activeId={active.id} />

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
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {['+', '\u2212'].map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  const el = document.querySelector('canvas');
                  if (el)
                    el.dispatchEvent(
                      new WheelEvent('wheel', { deltaY: i === 0 ? -100 : 100, bubbles: true }),
                    );
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: '1px solid rgba(212,168,83,0.2)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'rgba(212,168,83,0.7)',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  lineHeight: 1,
                  backdropFilter: 'blur(4px)',
                }}
              >
                {label}
              </button>
            ))}
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
