import type React from "react";
import { useRef } from "react";
import * as THREE from "three";
import type { Mesh } from "three";

const CROWD_SHIRT_COLORS = [
  "#c0392b",
  "#2980b9",
  "#e67e22",
  "#27ae60",
  "#8e44ad",
  "#16a085",
  "#d35400",
  "#2c3e50",
  "#e74c3c",
  "#1abc9c",
  "#f39c12",
  "#3498db",
  "#9b59b6",
  "#1565C0",
  "#00695C",
];

const CROWD_SKIN_TONES = [
  "#8B6914",
  "#c68642",
  "#f5c5a3",
  "#b87333",
  "#8B4513",
  "#d2996e",
  "#a0522d",
  "#e0b587",
];

const SEAT_COLORS_BY_SECTION = [
  ["#c0392b", "#e74c3c"], // reds
  ["#1a3a5c", "#2471a3"], // blues
  ["#c0392b", "#1a3a5c"], // mixed
  ["#1a3a5c", "#c0392b"], // mixed reverse
];

function seededColor(seed: number, palette: string[]): string {
  return palette[Math.abs(seed) % palette.length];
}

const grassVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const grassFragmentShader = `
  varying vec2 vUv;
  
  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float noise(vec2 co) {
    vec2 i = floor(co);
    vec2 f = fract(co);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    vec2 center = vUv - vec2(0.5, 0.5);
    
    // Primary mowing stripes - diagonal for more realism
    float stripeY = step(0.5, fract(vUv.y * 20.0));
    float diag = mod(floor(vUv.y * 20.0) + floor(vUv.x * 20.0), 2.0);
    
    // Rich cricket ground greens
    vec3 lightGrass = vec3(0.18, 0.68, 0.14);
    vec3 darkGrass  = vec3(0.06, 0.42, 0.06);
    
    // Combine diagonal + longitudinal stripes
    float stripeFactor = mix(stripeY, diag, 0.4);
    vec3 color = mix(darkGrass, lightGrass, stripeFactor);
    
    // Fine blade-level micro noise
    float microNoise = noise(vUv * 120.0) * 0.06 - 0.03;
    float medNoise = noise(vUv * 30.0) * 0.04;
    color += microNoise + medNoise;
    color = clamp(color, 0.0, 1.0);
    
    // Outfield boundary darkening (circular gradient)
    float dist = length(center) * 1.8;
    float vignette = 1.0 - smoothstep(0.55, 0.95, dist);
    color *= (0.75 + 0.25 * vignette);
    
    // Oval grass pattern - slightly different shade near boundary
    float ovalDist = length(center * vec2(1.0, 1.3));
    float nearBoundary = smoothstep(0.32, 0.42, ovalDist);
    color = mix(color, color * 0.88, nearBoundary * 0.5);
    
    // Pitch strip (center clay)
    float pitchX = abs(center.x);
    float isPitch = step(pitchX, 0.028);
    
    // Rich clay pitch with crack detail
    float pitchNoise = noise(vUv * 60.0) * 0.08;
    float crackNoise = noise(vUv * 200.0);
    float crack = step(0.92, crackNoise) * isPitch * 0.3;
    vec3 pitchBase = vec3(0.78 + pitchNoise, 0.62 + pitchNoise * 0.4, 0.32);
    vec3 crackColor = vec3(0.45, 0.33, 0.18);
    pitchBase = mix(pitchBase, crackColor, crack);
    color = mix(color, pitchBase, isPitch * 0.95);
    
    // Worn scuff zones on pitch
    float scuffDist = length(center) / 0.12;
    float centerScuff = (1.0 - smoothstep(0.0, 1.0, scuffDist)) * isPitch;
    vec3 wornColor = vec3(0.52, 0.40, 0.22);
    color = mix(color, wornColor, centerScuff * 0.7);
    
    // Crease marks (white lines)
    float distFromBatsmanCrease = abs(center.y - 0.40);
    float distFromBowlerCrease = abs(center.y + 0.40);
    float crease = ((1.0 - smoothstep(0.0, 0.007, distFromBatsmanCrease)) +
                    (1.0 - smoothstep(0.0, 0.007, distFromBowlerCrease))) * isPitch;
    color = mix(color, vec3(0.95, 0.95, 0.92), clamp(crease, 0.0, 1.0) * 0.9);
    
    // Popping crease (wider)
    float pitchXOuter = abs(center.x);
    float isCreaseArea = (1.0 - step(0.045, pitchXOuter)) * step(0.028, pitchXOuter);
    float popCrease = ((1.0 - smoothstep(0.0, 0.007, distFromBatsmanCrease)) +
                       (1.0 - smoothstep(0.0, 0.007, distFromBowlerCrease))) * isCreaseArea;
    color = mix(color, vec3(0.95, 0.95, 0.92), clamp(popCrease, 0.0, 1.0) * 0.85);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Individual seat + spectator unit
function SeatFigure({
  x,
  y,
  z,
  seatColor,
  shirtColor,
  skinColor,
  hasCap,
  capColor,
}: {
  x: number;
  y: number;
  z: number;
  seatColor: string;
  shirtColor: string;
  skinColor: string;
  hasCap: boolean;
  capColor: string;
}) {
  return (
    <group position={[x, y, z]}>
      {/* Seat back */}
      <mesh position={[0, -0.05, -0.1]}>
        <boxGeometry args={[0.28, 0.38, 0.06]} />
        <meshStandardMaterial color={seatColor} roughness={0.8} metalness={0} />
      </mesh>
      {/* Seat base */}
      <mesh position={[0, -0.22, 0.05]}>
        <boxGeometry args={[0.28, 0.06, 0.28]} />
        <meshStandardMaterial color={seatColor} roughness={0.8} metalness={0} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.24, 0.32, 0.16]} />
        <meshStandardMaterial
          color={shirtColor}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial
          color={skinColor}
          roughness={0.82}
          metalness={0}
        />
      </mesh>
      {/* Arms (simplified) */}
      <mesh position={[-0.18, 0.06, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.045, 0.045, 0.22, 6]} />
        <meshStandardMaterial
          color={shirtColor}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      <mesh position={[0.18, 0.06, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.045, 0.045, 0.22, 6]} />
        <meshStandardMaterial
          color={shirtColor}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      {/* Cap */}
      {hasCap && (
        <>
          <mesh position={[0, 0.43, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.07, 10]} />
            <meshStandardMaterial
              color={capColor}
              roughness={0.8}
              metalness={0}
            />
          </mesh>
          <mesh position={[0, 0.4, 0.12]}>
            <boxGeometry args={[0.18, 0.04, 0.1]} />
            <meshStandardMaterial
              color={capColor}
              roughness={0.8}
              metalness={0}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

function StandRow({
  rowIndex,
  cols,
  width,
  sectionColors,
  seedOffset,
}: {
  rowIndex: number;
  cols: number;
  width: number;
  sectionColors: string[];
  seedOffset: number;
}) {
  const figures: React.ReactElement[] = [];
  // Tiering: each row goes back and up
  const yOffset = rowIndex * 0.82;
  const zOffset = -rowIndex * 0.85;

  for (let c = 0; c < cols; c++) {
    const x = -width / 2 + (c / Math.max(cols - 1, 1)) * width;
    const colorSeed = seedOffset + c + rowIndex * cols;
    const seatColor = sectionColors[rowIndex % sectionColors.length];
    const shirtColor = seededColor(colorSeed, CROWD_SHIRT_COLORS);
    const skinColor = seededColor((seedOffset + c) % 8, CROWD_SKIN_TONES);
    const hasCap = (c + rowIndex) % 3 === 0;
    const capColor = seededColor(colorSeed + 3, CROWD_SHIRT_COLORS);

    figures.push(
      <SeatFigure
        key={`r${rowIndex}-c${c}`}
        x={x}
        y={yOffset}
        z={zOffset}
        seatColor={seatColor}
        shirtColor={shirtColor}
        skinColor={skinColor}
        hasCap={hasCap}
        capColor={capColor}
      />,
    );
  }

  return (
    <group>
      {/* Concrete step for this row */}
      <mesh position={[0, yOffset - 0.35, zOffset]}>
        <boxGeometry args={[width + 1.5, 0.18, 0.88]} />
        <meshStandardMaterial
          color="#6b7280"
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {figures}
    </group>
  );
}

function Stand({
  position,
  rotation,
  width,
  depth,
  standIndex,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  depth: number;
  standIndex: number;
}) {
  const ref = useRef<Mesh>(null);
  const ROWS = 5;
  const cols = Math.floor(width / 2.0);
  const sectionColors =
    SEAT_COLORS_BY_SECTION[standIndex % SEAT_COLORS_BY_SECTION.length];

  return (
    <group position={position} rotation={rotation}>
      {/* Main stand backing wall */}
      <mesh ref={ref} receiveShadow position={[0, 3, 0]}>
        <boxGeometry args={[width + 4, 9, depth]} />
        <meshStandardMaterial
          color="#1a2744"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Bottom concrete base */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[width + 4, 0.35, depth]} />
        <meshStandardMaterial
          color="#374151"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Roof overhang */}
      <mesh position={[0, 9.2, -depth * 0.15]}>
        <boxGeometry args={[width + 4, 0.35, depth * 0.7]} />
        <meshStandardMaterial
          color="#9ca3af"
          roughness={0.75}
          metalness={0.1}
        />
      </mesh>
      {/* Roof support struts every 8m */}
      {Array.from({ length: Math.floor(width / 8) + 1 }, (_, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: positional struts
          key={`strut-pos-${i}`}
          position={[-width / 2 + i * 8, 5.5, -depth * 0.15]}
        >
          <cylinderGeometry args={[0.18, 0.18, 7.5, 6]} />
          <meshStandardMaterial
            color="#6b7280"
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* Advertising boards */}
      <mesh position={[0, 1.1, -depth * 0.48 + 0.05]} receiveShadow>
        <boxGeometry args={[width + 3.5, 1.8, 0.12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Tiered crowd rows */}
      {[0, 1, 2, 3, 4].map((rowIdx) => (
        <StandRow
          key={`stand-row-${standIndex}-row-${rowIdx + 1}`}
          rowIndex={rowIdx}
          cols={cols}
          width={width}
          sectionColors={sectionColors}
          seedOffset={standIndex * ROWS * cols + rowIdx * 7}
        />
      ))}
    </group>
  );
}

function Floodlight({
  x,
  z,
  nightMode,
}: { x: number; z: number; nightMode?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      {/* Pole */}
      <mesh castShadow position={[0, 13, 0]}>
        <cylinderGeometry args={[0.28, 0.42, 26, 8]} />
        <meshStandardMaterial color="#78716c" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Crossbeam */}
      <mesh position={[0, 26, 0]}>
        <boxGeometry args={[4, 0.35, 4]} />
        <meshStandardMaterial
          color="#6b7280"
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {/* 4 light heads */}
      {[
        [-1.2, -1.2],
        [-1.2, 1.2],
        [1.2, -1.2],
        [1.2, 1.2],
      ].map(([lx, lz]) => (
        <group
          key={`light-${lx}-${lz}`}
          position={[lx as number, 26.4, lz as number]}
        >
          <mesh>
            <boxGeometry args={[0.9, 0.25, 0.9]} />
            <meshStandardMaterial
              color={nightMode ? "#ffffee" : "#ddddbb"}
              emissive={nightMode ? "#ffffff" : "#ffffcc"}
              emissiveIntensity={nightMode ? 3.0 : 0.5}
              roughness={0.2}
              metalness={0.1}
            />
          </mesh>
        </group>
      ))}
      <pointLight
        position={[0, 26, 0]}
        intensity={nightMode ? 420 : 90}
        distance={nightMode ? 220 : 130}
        color={nightMode ? "#fff5e0" : "#fffef0"}
        castShadow={false}
      />
    </group>
  );
}

export default function Stadium({ nightMode }: { nightMode?: boolean }) {
  const grassMaterial = new THREE.ShaderMaterial({
    vertexShader: grassVertexShader,
    fragmentShader: grassFragmentShader,
    side: THREE.DoubleSide,
  });

  return (
    <group>
      {/* Outfield grass */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
        material={grassMaterial}
      >
        <circleGeometry args={[50, 72]} />
      </mesh>

      {/* Inner circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[29.5, 30.5, 72]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.8}
          opacity={0.85}
          transparent
        />
      </mesh>

      {/* Boundary rope */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[44.5, 45.8, 128]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.8}
          opacity={0.9}
          transparent
        />
      </mesh>

      {/* Pitch strip */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        receiveShadow
      >
        <planeGeometry args={[3.05, 20.05]} />
        <meshStandardMaterial color="#d4a96a" roughness={0.75} />
      </mesh>

      {/* Batting crease lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 8.5]}>
        <planeGeometry args={[3.6, 0.09]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, -8.5]}>
        <planeGeometry args={[3.6, 0.09]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      {/* Bowling crease */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 7.0]}>
        <planeGeometry args={[3.6, 0.05]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.7}
          opacity={0.7}
          transparent
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, -7.0]}>
        <planeGeometry args={[3.6, 0.05]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.7}
          opacity={0.7}
          transparent
        />
      </mesh>

      {/* ===== STANDS ===== */}
      <Stand
        position={[0, 0, -58]}
        rotation={[0, 0, 0]}
        width={84}
        depth={13}
        standIndex={0}
      />
      <Stand
        position={[0, 0, 58]}
        rotation={[0, Math.PI, 0]}
        width={84}
        depth={13}
        standIndex={1}
      />
      <Stand
        position={[58, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={84}
        depth={13}
        standIndex={2}
      />
      <Stand
        position={[-58, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={84}
        depth={13}
        standIndex={3}
      />

      {/* Corner stands (diagonal) */}
      <Stand
        position={[42, 0, -42]}
        rotation={[0, -Math.PI / 4, 0]}
        width={50}
        depth={10}
        standIndex={0}
      />
      <Stand
        position={[-42, 0, -42]}
        rotation={[0, Math.PI / 4, 0]}
        width={50}
        depth={10}
        standIndex={1}
      />
      <Stand
        position={[42, 0, 42]}
        rotation={[0, -Math.PI * 0.75, 0]}
        width={50}
        depth={10}
        standIndex={2}
      />
      <Stand
        position={[-42, 0, 42]}
        rotation={[0, Math.PI * 0.75, 0]}
        width={50}
        depth={10}
        standIndex={3}
      />

      {/* Floodlights */}
      <Floodlight x={44} z={44} nightMode={nightMode} />
      <Floodlight x={-44} z={44} nightMode={nightMode} />
      <Floodlight x={44} z={-44} nightMode={nightMode} />
      <Floodlight x={-44} z={-44} nightMode={nightMode} />
    </group>
  );
}
