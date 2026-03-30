import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import type { UmpireSignal } from "../../store/gameStore";

const UMPIRE_POS: [number, number, number] = [-5, 0, 5];

export default function Umpire() {
  const umpireSignal = useGameStore((s) => s.umpireSignal);

  const groupRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);

  const targetArmL = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0.35));
  const targetArmR = useRef<THREE.Euler>(new THREE.Euler(0, 0, -0.35));

  useEffect(() => {
    applySignalPose(umpireSignal, targetArmL, targetArmR);
  }, [umpireSignal]);

  useFrame(() => {
    if (!armLRef.current || !armRRef.current) return;
    armLRef.current.rotation.z = THREE.MathUtils.lerp(
      armLRef.current.rotation.z,
      targetArmL.current.z,
      0.1,
    );
    armLRef.current.rotation.x = THREE.MathUtils.lerp(
      armLRef.current.rotation.x,
      targetArmL.current.x,
      0.1,
    );
    armRRef.current.rotation.z = THREE.MathUtils.lerp(
      armRRef.current.rotation.z,
      targetArmR.current.z,
      0.1,
    );
    armRRef.current.rotation.x = THREE.MathUtils.lerp(
      armRRef.current.rotation.x,
      targetArmR.current.x,
      0.1,
    );

    if (umpireSignal === "four" && groupRef.current) {
      groupRef.current.rotation.y = Math.sin(Date.now() / 200) * 0.25;
    } else if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        0,
        0.05,
      );
    }
  });

  return (
    <group ref={groupRef} position={UMPIRE_POS}>
      {/* White coat body */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.28, 0.95, 8]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>

      {/* Left trouser leg (dark) */}
      <mesh position={[-0.13, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Right trouser leg */}
      <mesh position={[0.13, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.5, 8]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Left black shoe */}
      <mesh position={[-0.13, 0.03, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.22]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Right black shoe */}
      <mesh position={[0.13, 0.03, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.22]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.23, 12, 12]} />
        <meshPhysicalMaterial color="#c68642" roughness={0.85} metalness={0} />
      </mesh>
      {/* Hat */}
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.15, 0.24, 0.18, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Left arm */}
      <mesh ref={armLRef} position={[-0.42, 0.88, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.08, 0.08, 0.58, 6]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>
      {/* Right arm */}
      <mesh ref={armRRef} position={[0.42, 0.88, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.08, 0.08, 0.58, 6]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>
    </group>
  );
}

function applySignalPose(
  signal: UmpireSignal,
  leftArm: React.MutableRefObject<THREE.Euler>,
  rightArm: React.MutableRefObject<THREE.Euler>,
) {
  switch (signal) {
    case "four":
      leftArm.current.set(0, 0, Math.PI / 2);
      rightArm.current.set(0, 0, -Math.PI / 2);
      break;
    case "six":
      leftArm.current.set(0, 0, Math.PI);
      rightArm.current.set(0, 0, -Math.PI);
      break;
    case "out":
      leftArm.current.set(0, 0, 0.35);
      rightArm.current.set(0, 0, -Math.PI * 0.9);
      break;
    case "wide":
      leftArm.current.set(0, 0, 0.35);
      rightArm.current.set(0, 0, -Math.PI / 2);
      break;
    default:
      leftArm.current.set(0, 0, 0.35);
      rightArm.current.set(0, 0, -0.35);
  }
}
