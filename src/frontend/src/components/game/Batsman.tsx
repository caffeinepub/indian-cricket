import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
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

  const primaryColor = useGameStore((s) => s.primaryColor);
  const helmetColor = useGameStore((s) => s.helmetColor);
  const batColor = useGameStore((s) => s.batColor);
  const padsColor = useGameStore((s) => s.padsColor);
  const glovesColor = useGameStore((s) => s.glovesColor);
  const skinTone = useGameStore((s) => s.skinTone);

  // Compute a darker bat handle color
  const batHandleColor = (() => {
    try {
      const r = Number.parseInt(batColor.slice(1, 3), 16);
      const g = Number.parseInt(batColor.slice(3, 5), 16);
      const b = Number.parseInt(batColor.slice(5, 7), 16);
      const dr = Math.max(0, Math.floor(r * 0.6));
      const dg = Math.max(0, Math.floor(g * 0.6));
      const db = Math.max(0, Math.floor(b * 0.6));
      return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
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

    if (isSwinging.current && armGroupRef.current) {
      const shotType = currentShotType.current;
      swingAngle.current += delta * swingDir.current * 9;
      const maxSwing = Math.PI * 0.85;
      const t = Math.min(Math.max(swingAngle.current, 0), maxSwing) / maxSwing;

      if (shotType === "straight") {
        armGroupRef.current.rotation.x = -Math.min(
          Math.max(swingAngle.current, 0),
          maxSwing,
        );
        armGroupRef.current.rotation.z = 0;
        armGroupRef.current.rotation.y = 0;
      } else if (shotType === "offside") {
        armGroupRef.current.rotation.x =
          -Math.min(Math.max(swingAngle.current, 0), maxSwing) * 0.7;
        armGroupRef.current.rotation.z = -Math.sin(t * Math.PI) * 0.8;
        armGroupRef.current.rotation.y = 0;
      } else if (shotType === "legside") {
        armGroupRef.current.rotation.x =
          -Math.min(Math.max(swingAngle.current, 0), maxSwing) * 0.4;
        armGroupRef.current.rotation.y = Math.sin(t * Math.PI) * 1.2;
        armGroupRef.current.rotation.z = 0;
      }

      if (swingAngle.current >= maxSwing) {
        swingDir.current = -1;
      }
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
        {/* Legs */}
        <mesh position={[-0.13, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.65, 8]} />
          <meshLambertMaterial color="#f0f0f0" />
        </mesh>
        <mesh position={[0.13, 0.32, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.65, 8]} />
          <meshLambertMaterial color="#f0f0f0" />
        </mesh>

        {/* Pads */}
        <mesh position={[-0.13, 0.42, 0.06]} castShadow>
          <boxGeometry args={[0.18, 0.55, 0.12]} />
          <meshLambertMaterial color={padsColor} />
        </mesh>
        <mesh position={[0.13, 0.42, 0.06]} castShadow>
          <boxGeometry args={[0.18, 0.55, 0.12]} />
          <meshLambertMaterial color={padsColor} />
        </mesh>

        {/* Torso (jersey) */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.72, 8]} />
          <meshLambertMaterial color={primaryColor} />
        </mesh>

        {/* Left arm */}
        <mesh position={[-0.35, 0.95, 0]} rotation={[0, 0, 0.4]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 6]} />
          <meshLambertMaterial color={skinTone} />
        </mesh>

        {/* Left glove */}
        <mesh position={[-0.5, 0.78, 0]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.1]} />
          <meshLambertMaterial color={glovesColor} />
        </mesh>

        {/* Right arm + bat */}
        <group ref={armGroupRef} position={[0.28, 1.12, 0]}>
          <mesh position={[0.1, -0.22, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.45, 6]} />
            <meshLambertMaterial color={skinTone} />
          </mesh>
          {/* Right glove */}
          <mesh position={[0.18, -0.48, 0]} castShadow>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshLambertMaterial color={glovesColor} />
          </mesh>
          {/* Cricket bat */}
          <mesh
            position={[0.18, -0.55, 0.05]}
            rotation={[0.15, 0, 0.1]}
            castShadow
          >
            <boxGeometry args={[0.07, 0.75, 0.26]} />
            <meshLambertMaterial color={batColor} />
          </mesh>
          {/* Bat handle */}
          <mesh
            position={[0.14, -0.18, 0.02]}
            rotation={[0.1, 0, 0.1]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.03, 0.28, 6]} />
            <meshLambertMaterial color={batHandleColor} />
          </mesh>
        </group>

        {/* Head */}
        <mesh position={[0, 1.48, 0]} castShadow>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshLambertMaterial color={skinTone} />
        </mesh>

        {/* Helmet */}
        <mesh position={[0, 1.56, 0]} castShadow>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshLambertMaterial color={helmetColor} />
        </mesh>

        {/* Helmet grille */}
        <mesh position={[0, 1.44, 0.2]} castShadow>
          <boxGeometry args={[0.22, 0.15, 0.04]} />
          <meshLambertMaterial color="#888" />
        </mesh>
      </group>
    </group>
  );
}
