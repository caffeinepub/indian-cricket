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

  // Target rotations for arms [z rotation]
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

    // Gentle wave for FOUR signal
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
        <meshStandardMaterial color="#f5f5f0" roughness={0.55} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.23, 12, 12]} />
        <meshStandardMaterial color="#c68642" roughness={0.7} />
      </mesh>
      {/* Hat */}
      <mesh position={[0, 1.75, 0]}>
        <cylinderGeometry args={[0.15, 0.24, 0.18, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Left arm */}
      <mesh ref={armLRef} position={[-0.42, 0.88, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.08, 0.08, 0.58, 6]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.55} />
      </mesh>
      {/* Right arm */}
      <mesh ref={armRRef} position={[0.42, 0.88, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.08, 0.08, 0.58, 6]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.55} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.13, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.5} />
      </mesh>
      <mesh position={[0.13, 0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.5} />
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
      // Both arms horizontal, waving
      leftArm.current.set(0, 0, Math.PI / 2);
      rightArm.current.set(0, 0, -Math.PI / 2);
      break;
    case "six":
      // Both arms straight up
      leftArm.current.set(0, 0, Math.PI);
      rightArm.current.set(0, 0, -Math.PI);
      break;
    case "out":
      // Right arm / finger raised
      leftArm.current.set(0, 0, 0.35);
      rightArm.current.set(0, 0, -Math.PI * 0.9);
      break;
    case "wide":
      // One arm extended to side
      leftArm.current.set(0, 0, 0.35);
      rightArm.current.set(0, 0, -Math.PI / 2);
      break;
    default:
      // Rest position
      leftArm.current.set(0, 0, 0.35);
      rightArm.current.set(0, 0, -0.35);
  }
}
