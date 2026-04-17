import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  DeckPreview3D                                                      */
/*                                                                     */
/*  A React Three Fiber 3D scene showing a house with an attached      */
/*  composite/wood deck. The deck board colour updates live based on    */
/*  the active decking material selected in the Estimator Showroom.    */
/*                                                                     */
/*  Units: 1 Three.js unit = 1 foot.                                   */
/* ------------------------------------------------------------------ */

/* ----- Props ----- */

export interface DeckPreview3DProps {
  deckColor: { primary: string; secondary: string };
}

/* ----- Constants ----- */

// House dimensions (feet)
const HOUSE_W = 20;
const HOUSE_D = 15;
const HOUSE_WALL_H = 12;
const ROOF_PEAK = 5;

// Deck dimensions (feet)
const DECK_W = 16;
const DECK_D = 12;
const DECK_BOARD_W = 5.5 / 12;   // 5.5 inches in feet
const DECK_BOARD_T = 1 / 12;     // 1 inch thick
const DECK_GAP = (3 / 16) / 12;  // 3/16 inch gap
const DECK_HEIGHT = 3;            // deck surface 3 feet off ground

// Fascia
const FASCIA_T = 1 / 12;         // 1 inch thick
const FASCIA_H = 7.25 / 12;      // matches joist height visually

// Stairs
const STAIR_COUNT = 4;
const STAIR_DEPTH = 11 / 12;     // 11 inch tread run
const STAIR_RISE = DECK_HEIGHT / STAIR_COUNT;
const STAIR_W = 4;               // 4 foot wide stairs

// Railing
const POST_SIZE = 3.5 / 12;      // 4x4 actual = 3.5"
const RAIL_H = 3;                 // 36 inch railing
const POST_SPACING = 6;           // post every 6 feet

// Colours
const HOUSE_WALL = '#2A2520';
const HOUSE_ROOF = '#1E1A16';
const GLASS_COL = '#3A4A5A';
const GROUND_COL = '#1A2A1A';
const WINDOW_COL = '#2A3A4A';

/* ------------------------------------------------------------------ */
/*  Canvas wood texture (reused pattern from FramingVisualizer)        */
/* ------------------------------------------------------------------ */

function createWoodTexture(baseHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 64, 256);

  const base = new THREE.Color(baseHex);
  for (let i = 0; i < 50; i++) {
    const y = Math.random() * 256;
    const w = 0.4 + Math.random() * 1.2;
    const lightness = (Math.random() - 0.5) * 0.10;
    const c = base.clone();
    c.offsetHSL(0, 0, lightness);
    ctx.strokeStyle = `#${c.getHexString()}`;
    ctx.lineWidth = w;
    ctx.globalAlpha = 0.25 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 2);
    ctx.bezierCurveTo(
      16, y + (Math.random() - 0.5) * 4,
      48, y + (Math.random() - 0.5) * 4,
      64, y + (Math.random() - 0.5) * 2,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

function makeBoardMaterial(
  baseHex: string,
  seed: number,
  roughness = 0.7,
): THREE.MeshStandardMaterial {
  const base = new THREE.Color(baseHex);
  const vary = ((seed * 7919) % 100) / 100;
  base.offsetHSL(0, 0, (vary - 0.5) * 0.05);
  const hex = `#${base.getHexString()}`;
  const tex = createWoodTexture(hex);
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: base,
    roughness,
    metalness: 0,
  });
}

/* ------------------------------------------------------------------ */
/*  House                                                              */
/* ------------------------------------------------------------------ */

const House: React.FC = () => {
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: HOUSE_WALL, roughness: 0.95, metalness: 0 }),
    [],
  );
  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: HOUSE_ROOF, roughness: 0.92, metalness: 0 }),
    [],
  );
  const glassMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: GLASS_COL,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.45,
    }),
    [],
  );
  const windowMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: WINDOW_COL,
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
    }),
    [],
  );

  // House sits with its back wall at z = 0, extending forward (positive z)
  // Deck attaches at the back (z=0, extending into negative z)
  const cx = 0;
  const wallCz = HOUSE_D / 2;

  // Roof: two angled planes forming a peaked roof
  const roofOverhang = 1;
  const roofD = HOUSE_D + roofOverhang * 2;
  const roofSlope = Math.atan2(ROOF_PEAK, HOUSE_W / 2);
  const roofPanelW = (HOUSE_W / 2) / Math.cos(roofSlope) + roofOverhang;
  const roofThickness = 0.3;

  return (
    <group position={[cx, 0, wallCz]}>
      {/* Walls */}
      <mesh position={[0, HOUSE_WALL_H / 2, 0]} material={wallMat} castShadow receiveShadow>
        <boxGeometry args={[HOUSE_W, HOUSE_WALL_H, HOUSE_D]} />
      </mesh>

      {/* Roof - left panel */}
      <mesh
        position={[-HOUSE_W / 4, HOUSE_WALL_H + ROOF_PEAK / 2, 0]}
        rotation={[0, 0, roofSlope]}
        material={roofMat}
        castShadow
      >
        <boxGeometry args={[roofPanelW, roofThickness, roofD]} />
      </mesh>
      {/* Roof - right panel */}
      <mesh
        position={[HOUSE_W / 4, HOUSE_WALL_H + ROOF_PEAK / 2, 0]}
        rotation={[0, 0, -roofSlope]}
        material={roofMat}
        castShadow
      >
        <boxGeometry args={[roofPanelW, roofThickness, roofD]} />
      </mesh>

      {/* Sliding glass door on back wall (z = -HOUSE_D/2, facing deck) */}
      <mesh position={[0, 3.5, -HOUSE_D / 2 - 0.01]} material={glassMat}>
        <boxGeometry args={[6, 6.5, 0.15]} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, 3.5, -HOUSE_D / 2 - 0.02]}>
        <boxGeometry args={[6.3, 6.8, 0.05]} />
        <meshStandardMaterial color="#1A1510" roughness={0.9} />
      </mesh>

      {/* Window on right side wall (+x face) */}
      <mesh position={[HOUSE_W / 2 + 0.01, 7, 0]} material={windowMat}>
        <boxGeometry args={[0.15, 3, 4]} />
      </mesh>
      {/* Window frame */}
      <mesh position={[HOUSE_W / 2 + 0.02, 7, 0]}>
        <boxGeometry args={[0.05, 3.3, 4.3]} />
        <meshStandardMaterial color="#1A1510" roughness={0.9} />
      </mesh>
    </group>
  );
};



/* ------------------------------------------------------------------ */
/*  Deck boards                                                        */
/* ------------------------------------------------------------------ */

interface DeckBoardsProps {
  primary: string;
}

const DeckBoards: React.FC<DeckBoardsProps> = ({ primary }) => {
  const stride = DECK_BOARD_W + DECK_GAP;
  const boardCount = Math.floor(DECK_W / stride);

  const materials = useMemo(
    () => Array.from({ length: boardCount }, (_, i) => makeBoardMaterial(primary, i)),
    [primary, boardCount],
  );

  const boards: React.ReactNode[] = [];
  for (let i = 0; i < boardCount; i++) {
    const x = -DECK_W / 2 + DECK_BOARD_W / 2 + i * stride;
    boards.push(
      <mesh
        key={`board-${i}`}
        position={[x, DECK_HEIGHT, -DECK_D / 2]}
        material={materials[i]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[DECK_BOARD_W, DECK_BOARD_T, DECK_D]} />
      </mesh>,
    );
  }

  return <>{boards}</>;
};

/* ------------------------------------------------------------------ */
/*  Fascia                                                             */
/* ------------------------------------------------------------------ */

interface FasciaProps {
  secondary: string;
}

const Fascia: React.FC<FasciaProps> = ({ secondary }) => {
  const mat = useMemo(
    () => makeBoardMaterial(secondary, 200, 0.75),
    [secondary],
  );
  const fasciaY = DECK_HEIGHT - FASCIA_H / 2;

  return (
    <>
      {/* Front fascia */}
      <mesh position={[0, fasciaY, -DECK_D - FASCIA_T / 2]} material={mat} castShadow>
        <boxGeometry args={[DECK_W, FASCIA_H, FASCIA_T]} />
      </mesh>
      {/* Left fascia */}
      <mesh position={[-DECK_W / 2 - FASCIA_T / 2, fasciaY, -DECK_D / 2]} material={mat} castShadow>
        <boxGeometry args={[FASCIA_T, FASCIA_H, DECK_D]} />
      </mesh>
      {/* Right fascia */}
      <mesh position={[DECK_W / 2 + FASCIA_T / 2, fasciaY, -DECK_D / 2]} material={mat} castShadow>
        <boxGeometry args={[FASCIA_T, FASCIA_H, DECK_D]} />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Stairs                                                             */
/* ------------------------------------------------------------------ */

interface StairsProps {
  primary: string;
  secondary: string;
}

const Stairs: React.FC<StairsProps> = ({ primary, secondary }) => {
  const treadMats = useMemo(
    () => Array.from({ length: STAIR_COUNT }, (_, i) => makeBoardMaterial(primary, 300 + i)),
    [primary],
  );
  const stringerMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color(secondary).offsetHSL(0, 0, -0.08), roughness: 0.85 }),
    [secondary],
  );

  const steps: React.ReactNode[] = [];
  for (let i = 0; i < STAIR_COUNT; i++) {
    const y = DECK_HEIGHT - (i + 1) * STAIR_RISE + DECK_BOARD_T / 2;
    const z = -DECK_D - FASCIA_T - i * STAIR_DEPTH - STAIR_DEPTH / 2;
    steps.push(
      <mesh key={`tread-${i}`} position={[0, y, z]} material={treadMats[i]} castShadow receiveShadow>
        <boxGeometry args={[STAIR_W, DECK_BOARD_T, STAIR_DEPTH]} />
      </mesh>,
    );
  }

  // Stringers (sides of stairs)
  const stringerH = DECK_HEIGHT;
  const stringerD = STAIR_COUNT * STAIR_DEPTH;
  const stringerZ = -DECK_D - FASCIA_T - stringerD / 2;
  const stringerX = STAIR_W / 2 + 0.05;

  return (
    <>
      {steps}
      {/* Left stringer */}
      <mesh position={[-stringerX, stringerH / 2, stringerZ]} material={stringerMat} castShadow>
        <boxGeometry args={[FASCIA_T * 2, stringerH, stringerD]} />
      </mesh>
      {/* Right stringer */}
      <mesh position={[stringerX, stringerH / 2, stringerZ]} material={stringerMat} castShadow>
        <boxGeometry args={[FASCIA_T * 2, stringerH, stringerD]} />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Railing                                                            */
/* ------------------------------------------------------------------ */

interface RailingProps {
  secondary: string;
}

const Railing: React.FC<RailingProps> = ({ secondary }) => {
  const postMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary).offsetHSL(0, 0, -0.12),
      roughness: 0.8,
    }),
    [secondary],
  );
  const railMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary).offsetHSL(0, 0, -0.06),
      roughness: 0.75,
    }),
    [secondary],
  );

  const railTopY = DECK_HEIGHT + RAIL_H;
  const postTopY = DECK_HEIGHT + RAIL_H / 2;

  // Front railing (along z = -DECK_D)
  const frontZ = -DECK_D;
  const frontPostCount = Math.floor(DECK_W / POST_SPACING) + 1;
  const frontPosts: React.ReactNode[] = [];
  for (let i = 0; i < frontPostCount; i++) {
    const x = -DECK_W / 2 + i * (DECK_W / (frontPostCount - 1));
    // Skip posts in the stair opening area
    if (Math.abs(x) < STAIR_W / 2 + 0.3) continue;
    frontPosts.push(
      <mesh key={`fp-${i}`} position={[x, postTopY, frontZ]} material={postMat} castShadow>
        <boxGeometry args={[POST_SIZE, RAIL_H, POST_SIZE]} />
      </mesh>,
    );
  }

  // Right side railing (along x = DECK_W/2)
  const sideX = DECK_W / 2;
  const sidePostCount = Math.floor(DECK_D / POST_SPACING) + 1;
  const sidePosts: React.ReactNode[] = [];
  for (let i = 0; i < sidePostCount; i++) {
    const z = -i * (DECK_D / (sidePostCount - 1));
    sidePosts.push(
      <mesh key={`sp-${i}`} position={[sideX, postTopY, z]} material={postMat} castShadow>
        <boxGeometry args={[POST_SIZE, RAIL_H, POST_SIZE]} />
      </mesh>,
    );
  }

  // Top rail bar thickness
  const railBarSize = 1.5 / 12; // 1.5 inch

  return (
    <>
      {frontPosts}
      {sidePosts}

      {/* Front top rail (with gap for stairs) */}
      {/* Left section */}
      <mesh position={[-(DECK_W / 2 + STAIR_W / 2) / 2, railTopY, frontZ]} material={railMat}>
        <boxGeometry args={[(DECK_W / 2 - STAIR_W / 2), railBarSize, railBarSize]} />
      </mesh>
      {/* Right section */}
      <mesh position={[(DECK_W / 2 + STAIR_W / 2) / 2, railTopY, frontZ]} material={railMat}>
        <boxGeometry args={[(DECK_W / 2 - STAIR_W / 2), railBarSize, railBarSize]} />
      </mesh>

      {/* Right side top rail */}
      <mesh position={[sideX, railTopY, -DECK_D / 2]} material={railMat}>
        <boxGeometry args={[railBarSize, railBarSize, DECK_D]} />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Ground plane                                                       */
/* ------------------------------------------------------------------ */

const Ground: React.FC = () => {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: GROUND_COL, roughness: 0.95, metalness: 0 }),
    [],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow material={mat}>
      <planeGeometry args={[60, 60]} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene (assembled)                                                  */
/* ------------------------------------------------------------------ */

interface SceneContentProps {
  primary: string;
  secondary: string;
}

const SceneContent: React.FC<SceneContentProps> = ({ primary, secondary }) => {
  return (
    <group>
      <House />
      <DeckBoards primary={primary} />
      <Fascia secondary={secondary} />
      <Stairs primary={primary} secondary={secondary} />
      <Railing secondary={secondary} />
      <Ground />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

const DeckPreview3D: React.FC<DeckPreview3DProps> = ({ deckColor }) => {
  return (
    <div style={{ width: '100%', height: '100%', background: '#080808', borderRadius: 10 }}>
      <Canvas
        shadows
        camera={{ position: [12, 8, 14], fov: 35, near: 0.1, far: 200 }}
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <color attach="background" args={['#080808']} />

        {/* Lighting -- matches FramingVisualizer */}
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[8, 12, 10]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-6, 8, -4]} intensity={0.4} color="#B0C0D0" />

        <SceneContent primary={deckColor.primary} secondary={deckColor.secondary} />

        <OrbitControls
          enableZoom
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={6}
          maxDistance={20}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.4}
          target={[0, DECK_HEIGHT, -DECK_D / 2]}
        />
      </Canvas>
    </div>
  );
};

export default DeckPreview3D;
