import { Html, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { shotDirectionRef } from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

export default function Batsman() {
  const groupRef = useRef<THREE.Group>(null);
  const armGroupRef = useRef<THREE.Group>(null);
  const bobOffset = useRef(0);
  const swingAngle = useRef(0);
  const isSwinging = useRef(false);
  const swingDir = useRef(1);
  const currentShotType = useRef<"offside" | "straight" | "legside">(
    "straight",
  );
  const upperBodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);

  const primaryColor = useGameStore((s) => s.primaryColor);
  const faceTexture = useGameStore((s) => s.faceTexture);
  const helmetColor = useGameStore((s) => s.helmetColor);
  const batColor = useGameStore((s) => s.batColor);
  const padsColor = useGameStore((s) => s.padsColor);
  const glovesColor = useGameStore((s) => s.glovesColor);
  const skinTone = useGameStore((s) => s.skinTone);
  const players = useGameStore((s) => s.players);

  const batsmanPlayer = players[2] ?? { name: "V. Kohli", jerseyNumber: 18 };
  const labelText = `${batsmanPlayer.name} #${batsmanPlayer.jerseyNumber}`;

  useEffect(() => {
    if (!headRef.current) return;
    if (faceTexture) {
      const loader = new THREE.TextureLoader();
      loader.load(faceTexture, (tex) => {
        if (headRef.current) {
          (headRef.current.material as THREE.MeshPhysicalMaterial).map = tex;
          (headRef.current.material as THREE.MeshPhysicalMaterial).needsUpdate =
            true;
        }
      });
    } else {
      (headRef.current.material as THREE.MeshPhysicalMaterial).map = null;
      (headRef.current.material as THREE.MeshPhysicalMaterial).needsUpdate =
        true;
    }
  }, [faceTexture]);

  const batHandleColor = (() => {
    try {
      const r = Number.parseInt(batColor.slice(1, 3), 16);
      const g = Number.parseInt(batColor.slice(3, 5), 16);
      const b = Number.parseInt(batColor.slice(5, 7), 16);
      return `#${Math.max(0, Math.floor(r * 0.6))
        .toString(16)
        .padStart(2, "0")}${Math.max(0, Math.floor(g * 0.6))
        .toString(16)
        .padStart(2, "0")}${Math.max(0, Math.floor(b * 0.6))
        .toString(16)
        .padStart(2, "0")}`;
    } catch {
      return "#5c3d1e";
    }
  })();

  useEffect(() => {
    let prev = useGameStore.getState().ballState;
    const unsub = useGameStore.subscribe((state) => {
      if (state.ballState === "hit" && prev !== "hit") {
        isSwinging.current = true;
        swingAngle.current = 0;
        swingDir.current = 1;
        currentShotType.current = shotDirectionRef.current;
      }
      prev = state.ballState;
    });
    return unsub;
  }, []);

  useFrame((_, delta) => {
    bobOffset.current += delta * 1.8;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(bobOffset.current) * 0.025;
    }
    if (upperBodyRef.current && !isSwinging.current) {
      upperBodyRef.current.rotation.z = THREE.MathUtils.lerp(
        upperBodyRef.current.rotation.z,
        Math.sin(bobOffset.current * 0.5) * 0.03,
        0.1,
      );
    }
    if (isSwinging.current && armGroupRef.current) {
      const shotType = currentShotType.current;
      swingAngle.current += delta * swingDir.current * 9;
      const maxSwing = Math.PI * 0.85;
      const t = Math.min(Math.max(swingAngle.current, 0), maxSwing) / maxSwing;
      const targetRx =
        shotType === "straight"
          ? -Math.min(Math.max(swingAngle.current, 0), maxSwing)
          : shotType === "offside"
            ? -Math.min(Math.max(swingAngle.current, 0), maxSwing) * 0.7
            : -Math.min(Math.max(swingAngle.current, 0), maxSwing) * 0.4;
      const targetRz =
        shotType === "offside" ? -Math.sin(t * Math.PI) * 0.8 : 0;
      const targetRy = shotType === "legside" ? Math.sin(t * Math.PI) * 1.2 : 0;
      armGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        armGroupRef.current.rotation.x,
        targetRx,
        0.3,
      );
      armGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        armGroupRef.current.rotation.z,
        targetRz,
        0.3,
      );
      armGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        armGroupRef.current.rotation.y,
        targetRy,
        0.3,
      );
      if (swingAngle.current >= maxSwing) swingDir.current = -1;
      if (swingDir.current === -1 && swingAngle.current <= 0) {
        isSwinging.current = false;
        armGroupRef.current.rotation.x = 0;
        armGroupRef.current.rotation.y = 0;
        armGroupRef.current.rotation.z = 0;
        swingAngle.current = 0;
        swingDir.current = 1;
      }
    }
  });

  return (
    <group position={[0.3, 0, 8]}>
      <group ref={groupRef}>
        {/* Floating name tag using Text */}
        <Text
          position={[0, 2.3, 0]}
          fontSize={0.13}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {labelText}
        </Text>

        {/* LEGS */}
        <mesh position={[-0.13, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.09, 0.52, 12]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[-0.13, 0.29, 0]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        <mesh position={[-0.13, 0.22, 0.01]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.45, 12]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[-0.13, 0.035, 0.05]} castShadow>
          <boxGeometry args={[0.12, 0.06, 0.22]} />
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        <mesh position={[0.13, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.09, 0.52, 12]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[0.13, 0.29, 0]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        <mesh position={[0.13, 0.22, 0.01]} castShadow>
          <cylinderGeometry args={[0.08, 0.07, 0.45, 12]} />
          <meshPhysicalMaterial
            color="#f0f0f0"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[0.13, 0.035, 0.05]} castShadow>
          <boxGeometry args={[0.12, 0.06, 0.22]} />
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>

        {/* SHORTS */}
        <mesh position={[-0.13, 0.62, 0]} castShadow>
          <boxGeometry args={[0.18, 0.16, 0.22]} />
          <meshPhysicalMaterial
            color="#1a3a6b"
            roughness={0.8}
            metalness={0}
            sheen={0.3}
          />
        </mesh>
        <mesh position={[0.13, 0.62, 0]} castShadow>
          <boxGeometry args={[0.18, 0.16, 0.22]} />
          <meshPhysicalMaterial
            color="#1a3a6b"
            roughness={0.8}
            metalness={0}
            sheen={0.3}
          />
        </mesh>

        {/* PADS */}
        <mesh position={[-0.13, 0.42, 0.09]} castShadow>
          <boxGeometry args={[0.17, 0.18, 0.09]} />
          <meshPhysicalMaterial
            color={padsColor}
            roughness={0.8}
            metalness={0}
            sheen={0.6}
            sheenRoughness={0.8}
          />
        </mesh>
        <mesh position={[0.13, 0.42, 0.09]} castShadow>
          <boxGeometry args={[0.17, 0.18, 0.09]} />
          <meshPhysicalMaterial
            color={padsColor}
            roughness={0.8}
            metalness={0}
            sheen={0.6}
            sheenRoughness={0.8}
          />
        </mesh>
        <mesh position={[-0.13, 0.22, 0.1]} castShadow>
          <boxGeometry args={[0.16, 0.38, 0.1]} />
          <meshPhysicalMaterial
            color={padsColor}
            roughness={0.8}
            metalness={0}
            sheen={0.6}
            sheenRoughness={0.8}
          />
        </mesh>
        <mesh position={[0.13, 0.22, 0.1]} castShadow>
          <boxGeometry args={[0.16, 0.38, 0.1]} />
          <meshPhysicalMaterial
            color={padsColor}
            roughness={0.8}
            metalness={0}
            sheen={0.6}
            sheenRoughness={0.8}
          />
        </mesh>

        {/* UPPER BODY */}
        <group ref={upperBodyRef}>
          <mesh position={[0, 0.95, 0]} castShadow>
            <boxGeometry args={[0.52, 0.72, 0.28]} />
            <meshPhysicalMaterial
              color={primaryColor}
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          <mesh position={[0, 1.25, 0]} castShadow>
            <boxGeometry args={[0.6, 0.14, 0.25]} />
            <meshPhysicalMaterial
              color={primaryColor}
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>

          {/* Left arm */}
          <mesh position={[-0.36, 1.0, 0]} rotation={[0, 0, 0.35]} castShadow>
            <cylinderGeometry args={[0.075, 0.065, 0.42, 12]} />
            <meshPhysicalMaterial
              color={skinTone}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          <mesh position={[-0.46, 0.86, 0]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshPhysicalMaterial
              color={skinTone}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          <mesh position={[-0.5, 0.82, 0]} rotation={[0, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.065, 0.055, 0.38, 12]} />
            <meshPhysicalMaterial
              color={skinTone}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          <mesh position={[-0.56, 0.65, 0]} castShadow>
            <boxGeometry args={[0.13, 0.1, 0.13]} />
            <meshPhysicalMaterial
              color={glovesColor}
              roughness={0.8}
              metalness={0}
              sheen={0.6}
              sheenRoughness={0.8}
            />
          </mesh>
          {[0, 1, 2, 3].map((fi) => (
            <mesh
              key={`lf-${fi}`}
              position={[-0.56 + (fi - 1.5) * 0.03, 0.62, 0.085]}
              castShadow
            >
              <boxGeometry args={[0.025, 0.07, 0.025]} />
              <meshPhysicalMaterial
                color={glovesColor}
                roughness={0.8}
                metalness={0}
                sheen={0.6}
                sheenRoughness={0.8}
              />
            </mesh>
          ))}

          {/* Right arm + bat */}
          <group ref={armGroupRef} position={[0.28, 1.2, 0]}>
            <mesh position={[0.1, -0.18, 0]} rotation={[0, 0, -0.2]} castShadow>
              <cylinderGeometry args={[0.075, 0.065, 0.42, 12]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            <mesh position={[0.13, -0.36, 0]} castShadow>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            <mesh
              position={[0.15, -0.42, 0]}
              rotation={[0, 0, -0.1]}
              castShadow
            >
              <cylinderGeometry args={[0.065, 0.055, 0.38, 12]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            <mesh position={[0.2, -0.62, 0]} castShadow>
              <boxGeometry args={[0.13, 0.1, 0.13]} />
              <meshPhysicalMaterial
                color={glovesColor}
                roughness={0.8}
                metalness={0}
                sheen={0.6}
                sheenRoughness={0.8}
              />
            </mesh>
            {[0, 1, 2, 3].map((fi) => (
              <mesh
                key={`rf-${fi}`}
                position={[0.2 + (fi - 1.5) * 0.03, -0.65, 0.085]}
                castShadow
              >
                <boxGeometry args={[0.025, 0.07, 0.025]} />
                <meshPhysicalMaterial
                  color={glovesColor}
                  roughness={0.8}
                  metalness={0}
                  sheen={0.6}
                  sheenRoughness={0.8}
                />
              </mesh>
            ))}
            <mesh
              position={[0.2, -0.72, 0.06]}
              rotation={[0.15, 0, 0.1]}
              castShadow
            >
              <boxGeometry args={[0.07, 0.75, 0.26]} />
              <meshStandardMaterial color={batColor} roughness={0.5} />
            </mesh>
            <mesh
              position={[0.16, -0.38, 0.02]}
              rotation={[0.1, 0, 0.1]}
              castShadow
            >
              <cylinderGeometry args={[0.03, 0.03, 0.28, 6]} />
              <meshStandardMaterial color={batHandleColor} roughness={0.5} />
            </mesh>
          </group>

          {/* Neck */}
          <mesh position={[0, 1.38, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.18, 8]} />
            <meshPhysicalMaterial
              color={skinTone}
              roughness={0.85}
              metalness={0}
            />
          </mesh>

          {/* Head */}
          <mesh ref={headRef} position={[0, 1.58, 0]} castShadow>
            <sphereGeometry args={[0.21, 14, 14]} />
            <meshPhysicalMaterial
              color={skinTone}
              roughness={0.85}
              metalness={0}
            />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.07, 1.62, 0.19]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0.07, 1.62, 0.19]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>

          {/* Helmet */}
          <mesh position={[0, 1.66, 0]} castShadow>
            <sphereGeometry
              args={[0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]}
            />
            <meshStandardMaterial
              color={helmetColor}
              roughness={0.55}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0, 1.54, -0.2]} rotation={[0.3, 0, 0]} castShadow>
            <boxGeometry args={[0.26, 0.14, 0.08]} />
            <meshStandardMaterial
              color={helmetColor}
              roughness={0.55}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0, 1.55, 0.24]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.26, 0.04, 0.14]} />
            <meshStandardMaterial
              color={helmetColor}
              roughness={0.55}
              metalness={0.2}
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Grill bars */}
          {[0, 1, 2, 3, 4].map((gi) => (
            <mesh
              key={`gr-${gi}`}
              position={[-0.1 + gi * 0.05, 1.47, 0.23]}
              castShadow
            >
              <boxGeometry args={[0.02, 0.16, 0.025]} />
              <meshStandardMaterial
                color="#aaaaaa"
                roughness={0.4}
                metalness={0.6}
              />
            </mesh>
          ))}
          {/* Grill horizontal bar */}
          <mesh position={[0, 1.46, 0.23]} castShadow>
            <boxGeometry args={[0.22, 0.02, 0.025]} />
            <meshStandardMaterial
              color="#aaaaaa"
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
