import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import type { UmpireSignal } from "../../store/gameStore";

const UMPIRE_POS: [number, number, number] = [-5, 0, 5];
const SKIN = "#c68642";

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
      {/* ── LEGS ── */}
      {/* Left hip joint */}
      <mesh position={[-0.12, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Left trouser (upper) */}
      <mesh position={[-0.12, 0.54, 0]} castShadow>
        <cylinderGeometry args={[0.088, 0.078, 0.4, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Left knee */}
      <mesh position={[-0.12, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.082, 10, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Left trouser (lower) */}
      <mesh position={[-0.12, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.34, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Left ankle */}
      <mesh position={[-0.12, 0.04, 0.02]} castShadow>
        <sphereGeometry args={[0.058, 8, 8]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Left shoe */}
      <mesh position={[-0.12, 0.03, 0.06]} castShadow>
        <boxGeometry args={[0.12, 0.065, 0.24]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Right hip joint */}
      <mesh position={[0.12, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Right trouser (upper) */}
      <mesh position={[0.12, 0.54, 0]} castShadow>
        <cylinderGeometry args={[0.088, 0.078, 0.4, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Right knee */}
      <mesh position={[0.12, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.082, 10, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Right trouser (lower) */}
      <mesh position={[0.12, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.34, 10]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>
      {/* Right ankle */}
      <mesh position={[0.12, 0.04, 0.02]} castShadow>
        <sphereGeometry args={[0.058, 8, 8]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Right shoe */}
      <mesh position={[0.12, 0.03, 0.06]} castShadow>
        <boxGeometry args={[0.12, 0.065, 0.24]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* ── HIP BRIDGE ── */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[0.3, 0.12, 0.22]} />
        <meshStandardMaterial color="#2c2c2c" roughness={0.7} />
      </mesh>

      {/* ── WHITE COAT / TORSO ── */}
      {/* Waist */}
      <mesh position={[0, 0.86, 0]} castShadow>
        <boxGeometry args={[0.44, 0.2, 0.26]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>
      {/* Chest */}
      <mesh position={[0, 1.04, 0]} castShadow>
        <boxGeometry args={[0.52, 0.3, 0.28]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>
      {/* Shoulder yoke */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[0.6, 0.16, 0.27]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>

      {/* ── LEFT ARM (animated) ── */}
      {/* Left shoulder cap */}
      <mesh position={[-0.36, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
        />
      </mesh>
      <mesh ref={armLRef} position={[-0.44, 0.9, 0]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.08, 0.075, 0.52, 8]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>
      {/* Left elbow */}
      <mesh position={[-0.5, 0.64, 0]} castShadow>
        <sphereGeometry args={[0.075, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      {/* Left forearm */}
      <mesh position={[-0.53, 0.56, 0]} rotation={[0, 0, 0.15]} castShadow>
        <cylinderGeometry args={[0.065, 0.058, 0.28, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      {/* Left wrist + hand */}
      <mesh position={[-0.55, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[-0.56, 0.38, 0]} castShadow>
        <boxGeometry args={[0.09, 0.08, 0.09]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>

      {/* ── RIGHT ARM (animated) ── */}
      {/* Right shoulder cap */}
      <mesh position={[0.36, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
        />
      </mesh>
      <mesh ref={armRRef} position={[0.44, 0.9, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.08, 0.075, 0.52, 8]} />
        <meshPhysicalMaterial
          color="#f5f5f0"
          roughness={0.55}
          metalness={0}
          sheen={0.5}
          sheenRoughness={0.7}
        />
      </mesh>
      {/* Right elbow */}
      <mesh position={[0.5, 0.64, 0]} castShadow>
        <sphereGeometry args={[0.075, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      {/* Right forearm */}
      <mesh position={[0.53, 0.56, 0]} rotation={[0, 0, -0.15]} castShadow>
        <cylinderGeometry args={[0.065, 0.058, 0.28, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      {/* Right wrist + hand */}
      <mesh position={[0.55, 0.42, 0]} castShadow>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0.56, 0.38, 0]} castShadow>
        <boxGeometry args={[0.09, 0.08, 0.09]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>

      {/* ── NECK ── */}
      <mesh position={[0, 1.37, 0]} castShadow>
        <cylinderGeometry args={[0.072, 0.09, 0.19, 10]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>

      {/* ── HEAD ── */}
      <mesh position={[0, 1.57, 0]} castShadow>
        <sphereGeometry args={[0.225, 16, 16]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.82} metalness={0} />
      </mesh>

      {/* Left ear */}
      <mesh position={[-0.225, 1.57, 0]} castShadow>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      {/* Right ear */}
      <mesh position={[0.225, 1.57, 0]} castShadow>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>

      {/* Left eye white */}
      <mesh position={[-0.075, 1.605, 0.195]}>
        <sphereGeometry args={[0.033, 10, 10]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.25} />
      </mesh>
      {/* Left iris */}
      <mesh position={[-0.075, 1.605, 0.222]}>
        <sphereGeometry args={[0.021, 8, 8]} />
        <meshStandardMaterial color="#1a0800" roughness={0.2} />
      </mesh>

      {/* Right eye white */}
      <mesh position={[0.075, 1.605, 0.195]}>
        <sphereGeometry args={[0.033, 10, 10]} />
        <meshStandardMaterial color="#f8f8f8" roughness={0.25} />
      </mesh>
      {/* Right iris */}
      <mesh position={[0.075, 1.605, 0.222]}>
        <sphereGeometry args={[0.021, 8, 8]} />
        <meshStandardMaterial color="#1a0800" roughness={0.2} />
      </mesh>

      {/* Left eyebrow */}
      <mesh position={[-0.075, 1.645, 0.193]} rotation={[0.15, 0, 0.08]}>
        <boxGeometry args={[0.065, 0.014, 0.018]} />
        <meshStandardMaterial color="#2a1200" roughness={0.8} />
      </mesh>
      {/* Right eyebrow */}
      <mesh position={[0.075, 1.645, 0.193]} rotation={[0.15, 0, -0.08]}>
        <boxGeometry args={[0.065, 0.014, 0.018]} />
        <meshStandardMaterial color="#2a1200" roughness={0.8} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 1.567, 0.232]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.04, 0.058, 0.04]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>
      {/* Nose tip */}
      <mesh position={[0, 1.546, 0.246]}>
        <sphereGeometry args={[0.023, 8, 8]} />
        <meshPhysicalMaterial color={SKIN} roughness={0.85} metalness={0} />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, 1.518, 0.217]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.078, 0.016, 0.016]} />
        <meshStandardMaterial color="#5a2a1a" roughness={0.9} />
      </mesh>

      {/* ── HAT ── */}
      {/* Hat brim */}
      <mesh position={[0, 1.79, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Hat crown */}
      <mesh position={[0, 1.87, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.19, 0.2, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
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
