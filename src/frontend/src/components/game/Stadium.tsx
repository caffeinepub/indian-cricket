import { useRef } from "react";
import type { Mesh } from "three";

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
      {/* Pole */}
      <mesh castShadow position={[0, 12, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 24, 8]} />
        <meshLambertMaterial color="#888888" />
      </mesh>
      {/* Light housing */}
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

function Stand({
  position,
  rotation,
  width,
  depth,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  depth: number;
}) {
  const ref = useRef<Mesh>(null);
  return (
    <group position={position} rotation={rotation}>
      {/* Main stand structure */}
      <mesh ref={ref} receiveShadow>
        <boxGeometry args={[width, 6, depth]} />
        <meshLambertMaterial color="#1a3a5c" />
      </mesh>
      {/* Crowd tier */}
      <mesh position={[0, 3.5, -depth * 0.3]} receiveShadow>
        <boxGeometry args={[width, 0.4, depth * 0.6]} />
        <meshLambertMaterial color="#c0392b" />
      </mesh>
      {/* Roof overhang */}
      <mesh position={[0, 6.5, -depth * 0.2]}>
        <boxGeometry args={[width, 0.3, depth * 0.5]} />
        <meshLambertMaterial color="#2c3e50" />
      </mesh>
    </group>
  );
}

export default function Stadium({ nightMode }: { nightMode?: boolean }) {
  return (
    <group>
      {/* Outfield grass */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <circleGeometry args={[50, 64]} />
        <meshStandardMaterial color="#1e7a1e" roughness={0.85} />
      </mesh>

      {/* Inner circle marking */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[29, 30, 64]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Boundary rope */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[44.5, 45.5, 128]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Cricket pitch */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
        receiveShadow
      >
        <planeGeometry args={[3.05, 20.05]} />
        <meshStandardMaterial color="#d4b86a" roughness={0.7} />
      </mesh>

      {/* Pitch crease lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 8.5]}>
        <planeGeometry args={[3.5, 0.08]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, -8.5]}>
        <planeGeometry args={[3.5, 0.08]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>

      {/* Stadium Stands */}
      <Stand
        position={[0, 0, -55]}
        rotation={[0, 0, 0]}
        width={80}
        depth={12}
      />
      <Stand
        position={[0, 0, 55]}
        rotation={[0, Math.PI, 0]}
        width={80}
        depth={12}
      />
      <Stand
        position={[55, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={80}
        depth={12}
      />
      <Stand
        position={[-55, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={80}
        depth={12}
      />

      {/* Floodlight poles */}
      <Floodlight x={42} z={42} nightMode={nightMode} />
      <Floodlight x={-42} z={42} nightMode={nightMode} />
      <Floodlight x={42} z={-42} nightMode={nightMode} />
      <Floodlight x={-42} z={-42} nightMode={nightMode} />
    </group>
  );
}
