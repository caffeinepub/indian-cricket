import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { bowlerThrowRef } from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

export default function Bowler() {
  const groupRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const bobOffset = useRef(0);
  const throwAngle = useRef(0);
  const isThrowing = useRef(false);

  useEffect(() => {
    let prev = useGameStore.getState().ballState;
    const unsub = useGameStore.subscribe((state) => {
      if (state.ballState === "bowled" && prev !== "bowled") {
        isThrowing.current = true;
        throwAngle.current = 0;
        bowlerThrowRef.current = true;
      }
      if (state.ballState === "idle") {
        isThrowing.current = false;
        throwAngle.current = 0;
      }
      prev = state.ballState;
    });
    return unsub;
  }, []);

  useFrame((_, delta) => {
    bobOffset.current += delta * 1.4;
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(bobOffset.current) * 0.02;
    }

    if (isThrowing.current && armRef.current) {
      throwAngle.current += delta * 6;
      // Full overarm bowling motion
      armRef.current.rotation.x = -throwAngle.current;
      if (throwAngle.current >= Math.PI * 1.4) {
        isThrowing.current = false;
        throwAngle.current = 0;
        armRef.current.rotation.x = 0;
        bowlerThrowRef.current = false;
      }
    }
  });

  return (
    <group position={[0, 0, -8]} rotation={[0, Math.PI, 0]}>
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

        {/* Torso */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.72, 8]} />
          <meshLambertMaterial color="#1a6b1a" />
        </mesh>

        {/* Left arm */}
        <mesh position={[-0.35, 0.95, 0]} rotation={[0, 0, 0.4]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.5, 6]} />
          <meshLambertMaterial color="#f5c5a3" />
        </mesh>

        {/* Right bowling arm */}
        <group ref={armRef} position={[0.3, 1.15, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.5, 6]} />
            <meshLambertMaterial color="#f5c5a3" />
          </mesh>
        </group>

        {/* Head */}
        <mesh position={[0, 1.48, 0]} castShadow>
          <sphereGeometry args={[0.19, 10, 10]} />
          <meshLambertMaterial color="#f5c5a3" />
        </mesh>

        {/* Cap */}
        <mesh position={[0, 1.62, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 10]} />
          <meshLambertMaterial color="#1a6b1a" />
        </mesh>
        <mesh position={[0, 1.59, 0.22]} castShadow>
          <boxGeometry args={[0.25, 0.06, 0.15]} />
          <meshLambertMaterial color="#1a6b1a" />
        </mesh>
      </group>
    </group>
  );
}
