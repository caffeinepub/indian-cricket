import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { bowlerThrowRef } from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

export default function Bowler() {
  const groupRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);
  const lowerArmRef = useRef<THREE.Mesh>(null);
  const rearLegRef = useRef<THREE.Mesh>(null);
  const bobOffset = useRef(0);
  const throwAngle = useRef(0);
  const isThrowing = useRef(false);
  const phase = useRef<0 | 1 | 2>(0);
  const phaseTimer = useRef(0);

  const headRef = useRef<THREE.Mesh>(null);
  const faceTexture = useGameStore((s) => s.faceTexture);
  const players = useGameStore((s) => s.players);

  const bowlerPlayer = players[8] ?? { name: "J. Bumrah", jerseyNumber: 93 };
  const labelText = `${bowlerPlayer.name} #${bowlerPlayer.jerseyNumber}`;

  const jerseyColor = "#1a6b1a";
  const skinColor = "#f5c5a3";

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

  useEffect(() => {
    let prev = useGameStore.getState().ballState;
    const unsub = useGameStore.subscribe((state) => {
      if (state.ballState === "bowled" && prev !== "bowled") {
        isThrowing.current = true;
        throwAngle.current = 0;
        phase.current = 1;
        phaseTimer.current = 0;
        bowlerThrowRef.current = true;
      }
      if (state.ballState === "idle") {
        isThrowing.current = false;
        throwAngle.current = 0;
        phase.current = 0;
      }
      prev = state.ballState;
    });
    return unsub;
  }, []);

  useFrame((_, delta) => {
    bobOffset.current += delta * 1.4;
    if (!isThrowing.current && groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        Math.sin(bobOffset.current) * 0.02,
        0.1,
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        0,
        0.08,
      );
    }
    if (isThrowing.current) {
      phaseTimer.current += delta;
      if (phase.current === 1) {
        if (groupRef.current)
          groupRef.current.rotation.x = THREE.MathUtils.lerp(
            groupRef.current.rotation.x,
            -0.15,
            0.08,
          );
        if (rearLegRef.current)
          rearLegRef.current.rotation.x = THREE.MathUtils.lerp(
            rearLegRef.current.rotation.x,
            -0.45,
            0.1,
          );
        if (phaseTimer.current > 0.35) phase.current = 2;
      }
      if (phase.current === 2) {
        throwAngle.current += delta * 6;
        if (armRef.current)
          armRef.current.rotation.x = THREE.MathUtils.lerp(
            armRef.current.rotation.x,
            -throwAngle.current,
            0.35,
          );
        if (groupRef.current) {
          const bodyTarget = throwAngle.current < Math.PI ? -0.3 : 0;
          groupRef.current.rotation.x = THREE.MathUtils.lerp(
            groupRef.current.rotation.x,
            bodyTarget,
            0.12,
          );
        }
        if (lowerArmRef.current && throwAngle.current > Math.PI) {
          lowerArmRef.current.rotation.x = THREE.MathUtils.lerp(
            lowerArmRef.current.rotation.x,
            0.65,
            0.2,
          );
        }
        if (throwAngle.current > Math.PI * 0.85) bowlerThrowRef.current = true;
        if (throwAngle.current >= Math.PI * 1.1) {
          isThrowing.current = false;
          throwAngle.current = 0;
          phase.current = 0;
          bowlerThrowRef.current = false;
          if (armRef.current) armRef.current.rotation.x = 0;
          if (lowerArmRef.current) lowerArmRef.current.rotation.x = 0;
          if (rearLegRef.current) rearLegRef.current.rotation.x = 0;
        }
      }
    }
  });

  return (
    <group position={[0, 0, -8]} rotation={[0, Math.PI, 0]}>
      <group ref={groupRef}>
        {/* Floating name tag */}
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
        <mesh position={[-0.13, 0.22, 0]} castShadow>
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
        <mesh ref={rearLegRef} position={[0.13, 0.55, 0]} castShadow>
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
        <mesh position={[0.13, 0.22, 0]} castShadow>
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

        {/* TORSO */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[0.52, 0.72, 0.28]} />
          <meshPhysicalMaterial
            color={jerseyColor}
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.25]} />
          <meshPhysicalMaterial
            color={jerseyColor}
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>

        {/* Left arm */}
        <mesh position={[-0.36, 1.0, 0]} rotation={[0, 0, 0.35]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.42, 12]} />
          <meshPhysicalMaterial
            color={skinColor}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        <mesh position={[-0.46, 0.86, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshPhysicalMaterial
            color={skinColor}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        <mesh position={[-0.5, 0.82, 0]} rotation={[0, 0, 0.2]} castShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.38, 12]} />
          <meshPhysicalMaterial
            color={skinColor}
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        <mesh position={[-0.56, 0.66, 0]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.1]} />
          <meshPhysicalMaterial
            color={skinColor}
            roughness={0.85}
            metalness={0}
          />
        </mesh>

        {/* Right bowling arm */}
        <group ref={armRef} position={[0.32, 1.22, 0]}>
          <mesh position={[0.08, -0.18, 0]} rotation={[0, 0, -0.2]} castShadow>
            <cylinderGeometry args={[0.075, 0.065, 0.44, 12]} />
            <meshPhysicalMaterial
              color={skinColor}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          <mesh position={[0.11, -0.36, 0]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshPhysicalMaterial
              color={skinColor}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          <mesh
            ref={lowerArmRef}
            position={[0.12, -0.44, 0]}
            rotation={[0, 0, -0.1]}
            castShadow
          >
            <cylinderGeometry args={[0.065, 0.055, 0.4, 12]} />
            <meshPhysicalMaterial
              color={skinColor}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          <mesh position={[0.14, -0.62, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.5} />
          </mesh>
          <mesh position={[0.15, -0.66, 0]} castShadow>
            <boxGeometry args={[0.1, 0.08, 0.1]} />
            <meshPhysicalMaterial
              color={skinColor}
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          {[0, 1, 2, 3].map((fi) => (
            <mesh
              key={`bf-${fi}`}
              position={[0.15 + (fi - 1.5) * 0.025, -0.69, 0.06]}
              castShadow
            >
              <boxGeometry args={[0.022, 0.06, 0.022]} />
              <meshPhysicalMaterial
                color={skinColor}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
          ))}
        </group>

        {/* Neck */}
        <mesh position={[0, 1.38, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.18, 8]} />
          <meshPhysicalMaterial
            color={skinColor}
            roughness={0.85}
            metalness={0}
          />
        </mesh>

        {/* Head */}
        <mesh ref={headRef} position={[0, 1.58, 0]} castShadow>
          <sphereGeometry args={[0.21, 14, 14]} />
          <meshPhysicalMaterial
            color={skinColor}
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

        {/* Cap */}
        <mesh position={[0, 1.72, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.15, 10]} />
          <meshStandardMaterial color={jerseyColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.68, 0.22]} castShadow>
          <boxGeometry args={[0.28, 0.05, 0.16]} />
          <meshStandardMaterial color={jerseyColor} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
