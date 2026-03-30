import type React from "react";
import { useRef } from "react";
import * as THREE from "three";
import type { Mesh } from "three";

const CROWD_COLORS = [
  "#e74c3c",
  "#3498db",
  "#f39c12",
  "#2ecc71",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
];

const CROWD_SKIN_TONES = [
  "#8B6914",
  "#c68642",
  "#f5c5a3",
  "#b87333",
  "#8B4513",
];

const CROWD_ROWS = [0, 1, 2, 3] as const;

function seededColor(seed: number): string {
  return CROWD_COLORS[seed % CROWD_COLORS.length];
}

function seededSkin(seed: number): string {
  return CROWD_SKIN_TONES[seed % CROWD_SKIN_TONES.length];
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
  void main() {
    vec2 center = vUv - vec2(0.5, 0.5);
    
    // Base stripes
    float stripe = step(0.5, fract(vUv.y * 20.0));
    vec3 light = vec3(0.18, 0.55, 0.18);
    vec3 dark  = vec3(0.10, 0.42, 0.10);
    vec3 color = mix(dark, light, stripe);
    
    // Pitch strip (center 6% width along Y axis)
    float pitchX = abs(center.x);
    float isPitch = step(pitchX, 0.03);
    vec3 pitchColor = vec3(0.72, 0.58, 0.32);
    color = mix(color, pitchColor, isPitch * 0.9);
    
    // Wear marks near both creases
    float distFromBatsmanCrease = abs(center.y - 0.4);
    float distFromBowlerCrease = abs(center.y + 0.4);
    float nearCrease = (1.0 - smoothstep(0.0, 0.05, distFromBatsmanCrease)) + 
                       (1.0 - smoothstep(0.0, 0.05, distFromBowlerCrease));
    nearCrease = clamp(nearCrease, 0.0, 1.0) * isPitch;
    vec3 wornColor = vec3(0.52, 0.40, 0.22);
    color = mix(color, wornColor, nearCrease * 0.7);
    
    // Scuff in center of pitch
    float centerScuff = (1.0 - smoothstep(0.0, 0.12, length(center))) * isPitch;
    color = mix(color, wornColor * 0.85, centerScuff * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

function CrowdRow({
  row,
  cols,
  width,
  seedOffset,
}: {
  row: number;
  cols: number;
  width: number;
  seedOffset: number;
}) {
  const figures: React.ReactElement[] = [];
  for (let c = 0; c < cols; c++) {
    const x = -width / 2 + (c / Math.max(cols - 1, 1)) * width;
    const y = 1.5 + row * 0.75;
    const z = -1.0 - row * 0.75;
    const colorSeed = seedOffset + c + row * cols;
    const color = seededColor(colorSeed);
    const skin = seededSkin((seedOffset + c) % 5);
    const hasCap = (c + row) % 2 === 0;
    figures.push(
      <group key={`col-${seedOffset}-${c}`} position={[x, y, z]}>
        {/* Torso */}
        <mesh castShadow={false}>
          <boxGeometry args={[0.22, 0.3, 0.15]} />
          <meshLambertMaterial color={color} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.28, 0]} castShadow={false}>
          <sphereGeometry args={[0.14, 6, 6]} />
          <meshLambertMaterial color={skin} />
        </mesh>
        {/* Cap (every other figure) */}
        {hasCap && (
          <mesh position={[0, 0.38, 0]} castShadow={false}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 8]} />
            <meshLambertMaterial color={color} />
          </mesh>
        )}
      </group>,
    );
  }
  return <>{figures}</>;
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
  const cols = Math.floor(width / 2.2);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={ref} receiveShadow>
        <boxGeometry args={[width, 6, depth]} />
        <meshLambertMaterial color="#1a3a5c" />
      </mesh>
      <mesh position={[0, 3.5, -depth * 0.3]} receiveShadow>
        <boxGeometry args={[width, 0.4, depth * 0.6]} />
        <meshLambertMaterial color="#c0392b" />
      </mesh>
      <mesh position={[0, 6.5, -depth * 0.2]}>
        <boxGeometry args={[width, 0.3, depth * 0.5]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>

      {/* 3D Crowd: 4 rows */}
      {CROWD_ROWS.map((rowNum) => (
        <CrowdRow
          key={`stand-${standIndex}-row-${rowNum}`}
          row={rowNum}
          cols={cols}
          width={width - 2}
          seedOffset={standIndex * CROWD_ROWS.length * cols + rowNum}
        />
      ))}
    </group>
  );
}

function Floodlight({
  x,
  z,
  nightMode,
}: {
  x: number;
  z: number;
  nightMode?: boolean;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 12, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 24, 8]} />
        <meshLambertMaterial color="#888888" />
      </mesh>
      <mesh position={[0, 24.5, 0]}>
        <boxGeometry args={[2, 0.5, 2]} />
        <meshLambertMaterial
          color={nightMode ? "#ffffff" : "#eeeecc"}
          emissive={nightMode ? "#ffffff" : "#ffffcc"}
          emissiveIntensity={nightMode ? 2.5 : 0.5}
        />
      </mesh>
      <pointLight
        position={[0, 24, 0]}
        intensity={nightMode ? 350 : 80}
        distance={nightMode ? 200 : 120}
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
      {/* Striped outfield grass with pitch wear shader */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
        material={grassMaterial}
      >
        <circleGeometry args={[50, 64]} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[29, 30, 64]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[44.5, 45.5, 128]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        receiveShadow
      >
        <planeGeometry args={[3.05, 20.05]} />
        <meshStandardMaterial color="#d4b86a" roughness={0.7} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 8.5]}>
        <planeGeometry args={[3.5, 0.08]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, -8.5]}>
        <planeGeometry args={[3.5, 0.08]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      <Stand
        position={[0, 0, -55]}
        rotation={[0, 0, 0]}
        width={80}
        depth={12}
        standIndex={0}
      />
      <Stand
        position={[0, 0, 55]}
        rotation={[0, Math.PI, 0]}
        width={80}
        depth={12}
        standIndex={1}
      />
      <Stand
        position={[55, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={80}
        depth={12}
        standIndex={2}
      />
      <Stand
        position={[-55, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={80}
        depth={12}
        standIndex={3}
      />

      <Floodlight x={42} z={42} nightMode={nightMode} />
      <Floodlight x={-42} z={42} nightMode={nightMode} />
      <Floodlight x={42} z={-42} nightMode={nightMode} />
      <Floodlight x={-42} z={-42} nightMode={nightMode} />
    </group>
  );
}
