import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  DeckPreview3D                                                      */
/*                                                                     */
/*  Bright, architectural-quality 3D deck preview. Individual deck     */
/*  boards with wood grain, aluminium-style railing, clean stairs,     */
/*  and a simple house wall backdrop.                                  */
/*                                                                     */
/*  Units: 1 Three.js unit = 1 foot.                                   */
/* ------------------------------------------------------------------ */

/* ----- Props ----- */

export interface DeckPreview3DProps {
  deckColor: { primary: string; secondary: string };
}

/* ----- Constants ----- */

// Deck dimensions (feet)
const DECK_W = 16;
const DECK_D = 12;
const DECK_BOARD_W = 5.5 / 12;   // 5.5 inches in feet
const DECK_BOARD_T = 1 / 12;     // 1 inch thick
const DECK_GAP = (3 / 16) / 12;  // 3/16 inch gap
const DECK_HEIGHT = 3;            // deck surface 3 feet off ground

// Fascia
const FASCIA_T = 1 / 12;         // 1 inch thick

// Stairs
const STAIR_COUNT = 4;
const STAIR_RISE = 7 / 12;       // 7 inches per step
const STAIR_RUN = 10.5 / 12;     // 10.5 inches per tread
const STAIR_W = 4;               // 4 foot wide stairs

// Railing (aluminium style)
const POST_SIZE = 3.5 / 12;
const RAIL_H = 3;                // 36 inches above deck
const POST_SPACING = 6;
const BALUSTER_SIZE = 0.75 / 12; // 0.75 inch square balusters
const BALUSTER_SPACING = 4 / 12; // every 4 inches
const RAIL_BAR = 1.5 / 12;      // top/bottom rail bar thickness
const BOTTOM_RAIL_OFFSET = 3 / 12; // bottom rail 3 inches above deck
const RAIL_COLOR = '#2A2A2A';

// House wall
const WALL_W = 20;
const WALL_H = 10;
const WALL_COLOR = '#8A9A80';

// Ground
const GROUND_COLOR = '#2A2A2A';

/* ------------------------------------------------------------------ */
/*  Canvas wood texture                                                */
/* ------------------------------------------------------------------ */

function createWoodTexture(baseHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 64, 256);

  const base = new THREE.Color(baseHex);
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * 256;
    const w = 0.3 + Math.random() * 1.0;
    const lightness = (Math.random() - 0.5) * 0.08;
    const c = base.clone();
    c.offsetHSL(0, 0, lightness);
    ctx.strokeStyle = `#${c.getHexString()}`;
    ctx.lineWidth = w;
    ctx.globalAlpha = 0.2 + Math.random() * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 2);
    ctx.bezierCurveTo(
      16, y + (Math.random() - 0.5) * 3,
      48, y + (Math.random() - 0.5) * 3,
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

function makeBoardMaterial(baseHex: string, seed: number): THREE.MeshStandardMaterial {
  const base = new THREE.Color(baseHex);
  const vary = ((seed * 7919) % 100) / 100;
  base.offsetHSL(0, 0, (vary - 0.5) * 0.03); // +/- 3% lightness
  const hex = `#${base.getHexString()}`;
  const tex = createWoodTexture(hex);
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: base,
    roughness: 0.7,
    metalness: 0,
  });
}

/* ------------------------------------------------------------------ */
/*  House wall (simple flat wall with siding lines)                    */
/* ------------------------------------------------------------------ */

const HouseWall: React.FC = () => {
  const wallMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.85, metalness: 0 }),
    [],
  );

  // Siding groove material (dark lines to simulate board-and-batten / lap siding)
  const grooveMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#707D6A', roughness: 0.9, metalness: 0 }),
    [],
  );

  // Wall sits at z = 0, deck extends in -z direction
  const grooveSpacing = 7 / 12; // groove every 7 inches
  const grooveCount = Math.floor(WALL_H / grooveSpacing);
  const grooves: React.ReactNode[] = [];
  for (let i = 1; i < grooveCount; i++) {
    const y = i * grooveSpacing;
    grooves.push(
      <mesh key={`groove-${i}`} position={[0, y, -0.26]} material={grooveMat}>
        <boxGeometry args={[WALL_W, 0.5 / 12, 0.02]} />
      </mesh>,
    );
  }

  return (
    <group>
      {/* Main wall */}
      <mesh position={[0, WALL_H / 2, 0]} material={wallMat} receiveShadow>
        <boxGeometry args={[WALL_W, WALL_H, 0.5]} />
      </mesh>
      {/* Siding grooves */}
      {grooves}
    </group>
  );
};

/* ------------------------------------------------------------------ */
/*  Deck boards                                                        */
/* ------------------------------------------------------------------ */

const DeckBoards: React.FC<{ primary: string }> = ({ primary }) => {
  const stride = DECK_BOARD_W + DECK_GAP;
  const boardCount = Math.floor(DECK_D / stride); // boards run left-right, counted front-to-back

  const materials = useMemo(
    () => Array.from({ length: boardCount }, (_, i) => makeBoardMaterial(primary, i)),
    [primary, boardCount],
  );

  const boards: React.ReactNode[] = [];
  for (let i = 0; i < boardCount; i++) {
    // Boards run left-right (along x), spaced front-to-back (along z)
    const z = -(i * stride + DECK_BOARD_W / 2);
    boards.push(
      <mesh
        key={`board-${i}`}
        position={[0, DECK_HEIGHT, z]}
        material={materials[i]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[DECK_W, DECK_BOARD_T, DECK_BOARD_W]} />
      </mesh>,
    );
  }

  return <>{boards}</>;
};

/* ------------------------------------------------------------------ */
/*  Fascia                                                             */
/* ------------------------------------------------------------------ */

const Fascia: React.FC<{ secondary: string }> = ({ secondary }) => {
  const mat = useMemo(
    () => makeBoardMaterial(secondary, 200),
    [secondary],
  );
  const fasciaY = DECK_HEIGHT - DECK_BOARD_T / 2;

  return (
    <>
      {/* Front fascia */}
      <mesh position={[0, fasciaY, -DECK_D - FASCIA_T / 2]} material={mat} castShadow>
        <boxGeometry args={[DECK_W, DECK_BOARD_T, FASCIA_T]} />
      </mesh>
      {/* Left fascia */}
      <mesh position={[-DECK_W / 2 - FASCIA_T / 2, fasciaY, -DECK_D / 2]} material={mat} castShadow>
        <boxGeometry args={[FASCIA_T, DECK_BOARD_T, DECK_D]} />
      </mesh>
      {/* Right fascia */}
      <mesh position={[DECK_W / 2 + FASCIA_T / 2, fasciaY, -DECK_D / 2]} material={mat} castShadow>
        <boxGeometry args={[FASCIA_T, DECK_BOARD_T, DECK_D]} />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Stairs (4 steps, centred on front, no railing)                     */
/* ------------------------------------------------------------------ */

const Stairs: React.FC<{ primary: string; secondary: string }> = ({ primary, secondary }) => {
  const treadMats = useMemo(
    () => Array.from({ length: STAIR_COUNT }, (_, i) => makeBoardMaterial(primary, 300 + i)),
    [primary],
  );
  const stringerMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondary).offsetHSL(0, 0, -0.08),
      roughness: 0.85,
      metalness: 0,
    }),
    [secondary],
  );

  const steps: React.ReactNode[] = [];
  for (let i = 0; i < STAIR_COUNT; i++) {
    const y = DECK_HEIGHT - (i + 1) * STAIR_RISE + DECK_BOARD_T / 2;
    const z = -DECK_D - (i + 1) * STAIR_RUN + STAIR_RUN / 2;
    steps.push(
      <mesh key={`tread-${i}`} position={[0, y, z]} material={treadMats[i]} castShadow receiveShadow>
        <boxGeometry args={[STAIR_W, DECK_BOARD_T, STAIR_RUN]} />
      </mesh>,
    );
  }

  // Stringers (two side boards)
  const stringerH = DECK_HEIGHT;
  const stringerD = STAIR_COUNT * STAIR_RUN;
  const stringerZ = -DECK_D - stringerD / 2;
  const stringerX = STAIR_W / 2 + 0.05;
  const stringerThick = 1.5 / 12;

  return (
    <>
      {steps}
      <mesh position={[-stringerX, stringerH / 2, stringerZ]} material={stringerMat} castShadow>
        <boxGeometry args={[stringerThick, stringerH, stringerD]} />
      </mesh>
      <mesh position={[stringerX, stringerH / 2, stringerZ]} material={stringerMat} castShadow>
        <boxGeometry args={[stringerThick, stringerH, stringerD]} />
      </mesh>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Railing (aluminium style with balusters)                           */
/* ------------------------------------------------------------------ */

const Railing: React.FC = () => {
  const metalMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: RAIL_COLOR,
      roughness: 0.3,
      metalness: 0.7,
    }),
    [],
  );

  const postH = RAIL_H;
  const postBaseY = DECK_HEIGHT + postH / 2;
  const topRailY = DECK_HEIGHT + RAIL_H;
  const bottomRailY = DECK_HEIGHT + BOTTOM_RAIL_OFFSET;
  const balusterH = RAIL_H - BOTTOM_RAIL_OFFSET - RAIL_BAR;
  const balusterBaseY = bottomRailY + RAIL_BAR / 2 + balusterH / 2;

  const elements: React.ReactNode[] = [];
  let key = 0;

  // Helper: add a railing section between two points
  const addSection = (
    x1: number, z1: number,
    x2: number, z2: number,
    addStartPost: boolean,
    addEndPost: boolean,
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const angle = Math.atan2(dx, dz);

    // Posts at start and end
    if (addStartPost) {
      elements.push(
        <mesh key={key++} position={[x1, postBaseY, z1]} material={metalMat} castShadow>
          <boxGeometry args={[POST_SIZE, postH, POST_SIZE]} />
        </mesh>,
      );
    }
    if (addEndPost) {
      elements.push(
        <mesh key={key++} position={[x2, postBaseY, z2]} material={metalMat} castShadow>
          <boxGeometry args={[POST_SIZE, postH, POST_SIZE]} />
        </mesh>,
      );
    }

    // Intermediate posts every POST_SPACING
    const postCount = Math.floor(length / POST_SPACING);
    for (let i = 1; i < postCount + 1; i++) {
      const t = (i * POST_SPACING) / length;
      if (t >= 0.98) break;
      const px = x1 + dx * t;
      const pz = z1 + dz * t;
      elements.push(
        <mesh key={key++} position={[px, postBaseY, pz]} material={metalMat} castShadow>
          <boxGeometry args={[POST_SIZE, postH, POST_SIZE]} />
        </mesh>,
      );
    }

    // Top rail
    elements.push(
      <mesh key={key++} position={[midX, topRailY, midZ]} rotation={[0, angle, 0]} material={metalMat}>
        <boxGeometry args={[RAIL_BAR, RAIL_BAR, length]} />
      </mesh>,
    );

    // Bottom rail
    elements.push(
      <mesh key={key++} position={[midX, bottomRailY, midZ]} rotation={[0, angle, 0]} material={metalMat}>
        <boxGeometry args={[RAIL_BAR, RAIL_BAR, length]} />
      </mesh>,
    );

    // Balusters along the section
    const balusterCount = Math.floor(length / BALUSTER_SPACING);
    for (let i = 1; i < balusterCount; i++) {
      const t = i / balusterCount;
      const bx = x1 + dx * t;
      const bz = z1 + dz * t;
      elements.push(
        <mesh key={key++} position={[bx, balusterBaseY, bz]} material={metalMat}>
          <boxGeometry args={[BALUSTER_SIZE, balusterH, BALUSTER_SIZE]} />
        </mesh>,
      );
    }
  };

  const halfW = DECK_W / 2;
  const halfStair = STAIR_W / 2;

  // Front railing - left section (from left corner to stair opening)
  addSection(-halfW, -DECK_D, -halfStair - 0.1, -DECK_D, true, true);
  // Front railing - right section (from stair opening to right corner)
  addSection(halfStair + 0.1, -DECK_D, halfW, -DECK_D, true, true);
  // Left side railing
  addSection(-halfW, 0, -halfW, -DECK_D, false, false); // corner posts already placed
  // Right side railing
  addSection(halfW, 0, halfW, -DECK_D, false, false);

  // Add corner posts for left and right side (at house wall end)
  elements.push(
    <mesh key={key++} position={[-halfW, postBaseY, 0]} material={metalMat} castShadow>
      <boxGeometry args={[POST_SIZE, postH, POST_SIZE]} />
    </mesh>,
  );
  elements.push(
    <mesh key={key++} position={[halfW, postBaseY, 0]} material={metalMat} castShadow>
      <boxGeometry args={[POST_SIZE, postH, POST_SIZE]} />
    </mesh>,
  );

  return <>{elements}</>;
};

/* ------------------------------------------------------------------ */
/*  Ground plane                                                       */
/* ------------------------------------------------------------------ */

const Ground: React.FC = () => {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: GROUND_COLOR, roughness: 0.95, metalness: 0 }),
    [],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow material={mat}>
      <planeGeometry args={[80, 80]} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene assembly                                                     */
/* ------------------------------------------------------------------ */

const SceneContent: React.FC<{ primary: string; secondary: string }> = ({ primary, secondary }) => (
  <group>
    <HouseWall />
    <DeckBoards primary={primary} />
    <Fascia secondary={secondary} />
    <Stairs primary={primary} secondary={secondary} />
    <Railing />
    <Ground />
  </group>
);

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

const DeckPreview3D: React.FC<DeckPreview3DProps> = ({ deckColor }) => (
  <div style={{ width: '100%', height: '100%', background: '#0A0A0A', borderRadius: 10 }}>
    <Canvas
      shadows
      camera={{ position: [10, 9, 12], fov: 32, near: 0.1, far: 200 }}
      style={{ width: '100%', height: '100%' }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
      }}
    >
      <color attach="background" args={['#0A0A0A']} />

      {/* Bright outdoor lighting */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[10, 15, 8]}
        intensity={2.5}
        color="#FFFAF0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-5, 8, -3]} intensity={1.0} color="#E8EEF5" />
      <hemisphereLight args={['#B0C0D0', '#3A3020', 0.6]} />

      <SceneContent primary={deckColor.primary} secondary={deckColor.secondary} />

      <OrbitControls
        enableZoom
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={5}
        maxDistance={18}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.4}
        target={[0, 1.5, 0]}
      />
    </Canvas>
  </div>
);

export default DeckPreview3D;
