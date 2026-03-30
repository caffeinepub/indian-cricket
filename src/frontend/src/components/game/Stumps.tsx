import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { stumpsFallenRef } from "../../refs/sharedRefs";

interface StumpsProps {
  /** "batsman" = z+9 end, "bowler" = z-9 end */
  stumpEnd: "batsman" | "bowler";
}

const STUMP_POSITIONS: [number, number, number][] = [
  [-0.11, 0.35, 0],
  [0, 0.35, 0],
  [0.11, 0.35, 0],
];

const STUMP_KEYS = ["left", "center", "right"] as const;

export default function Stumps({ stumpEnd }: StumpsProps) {
  const z = stumpEnd === "batsman" ? 9 : -9;
  const groupRef = useRef<THREE.Group>(null);
  const isFalling = useRef(false);
  const fallAngle = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Only batsman stumps fall on wicket
    if (
      stumpEnd === "batsman" &&
      stumpsFallenRef.current &&
      !isFalling.current
    ) {
      isFalling.current = true;
      fallAngle.current = 0;
    }

    if (isFalling.current) {
      fallAngle.current = Math.min(fallAngle.current + delta * 4, Math.PI / 2);
      groupRef.current.rotation.z = fallAngle.current;
      groupRef.current.position.y = Math.sin(fallAngle.current) * 0.5;

      if (fallAngle.current >= Math.PI / 2 && !resetTimer.current) {
        resetTimer.current = setTimeout(() => {
          if (groupRef.current) {
            groupRef.current.rotation.z = 0;
            groupRef.current.position.y = 0;
          }
          isFalling.current = false;
          fallAngle.current = 0;
          resetTimer.current = null;
        }, 1800);
      }
    } else if (!stumpsFallenRef.current && fallAngle.current > 0) {
      groupRef.current.rotation.z = 0;
      groupRef.current.position.y = 0;
      fallAngle.current = 0;
      isFalling.current = false;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, z]}>
      {/* Three stumps — upgraded to MeshStandardMaterial for PBR quality */}
      {STUMP_POSITIONS.map((pos, idx) => (
        <mesh key={STUMP_KEYS[idx]} position={pos} castShadow receiveShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.72, 10]} />
          <meshStandardMaterial
            color="#f0e0b0"
            roughness={0.4}
            metalness={0.05}
          />
        </mesh>
      ))}
      {/* Bail 1 */}
      <mesh position={[-0.055, 0.73, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial
          color="#f0e0b0"
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>
      {/* Bail 2 */}
      <mesh position={[0.055, 0.73, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, 0.04, 0.04]} />
        <meshStandardMaterial
          color="#f0e0b0"
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}
