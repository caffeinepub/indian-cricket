import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ballPositionRef,
  fielderCaughtRef,
  fielderPositionsRef,
  lastBallRunsRef,
} from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

const FIELDER_POSITIONS: Array<[number, number, number]> = [
  [3.5, 0, 12],
  [14, 0, 4],
  [-8, 0, -5],
  [7, 0, -6],
  [-12, 0, 13],
  [12, 0, -2],
  [-12, 0, 6],
];

const FIELDER_COLORS = [
  "#1a237e",
  "#0d47a1",
  "#1565c0",
  "#1976d2",
  "#1e88e5",
  "#2196f3",
  "#42a5f5",
];

// Varied skin tones seeded by fielder index
const SKIN_TONES = ["#8B6914", "#c68642", "#f5c5a3", "#b87333", "#8B4513"];

function getFielderSkinTone(index: number): string {
  return SKIN_TONES[index % SKIN_TONES.length];
}

interface FielderState {
  pos: THREE.Vector3;
  basePos: THREE.Vector3;
  bodyRef: React.RefObject<THREE.Group | null>;
  phase: "idle" | "moving" | "diving" | "throwing" | "returning";
  phaseTimer: number;
  diveProgress: number;
  armAngle: number;
  targetArmAngle: number;
}

function FielderMesh({
  index,
  fielderState,
}: {
  index: number;
  fielderState: FielderState;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Mesh>(null);

  fielderState.bodyRef =
    groupRef as unknown as React.RefObject<THREE.Group | null>;

  const color = FIELDER_COLORS[index] ?? "#1976d2";
  const skin = getFielderSkinTone(index);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    group.position.copy(fielderState.pos);

    if (fielderState.phase === "diving") {
      const tilt = Math.min(fielderState.diveProgress * 1.5, Math.PI / 2.2);
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, tilt, 0.15);
      group.position.y = THREE.MathUtils.lerp(group.position.y, -0.25, 0.1);
    } else {
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, 0.1);
      group.position.y = THREE.MathUtils.lerp(
        group.position.y,
        fielderState.pos.y,
        0.1,
      );
    }

    if (armRRef.current) {
      armRRef.current.rotation.z = THREE.MathUtils.lerp(
        armRRef.current.rotation.z,
        fielderState.targetArmAngle,
        0.15,
      );
    }
  });

  return (
    <group ref={groupRef} position={FIELDER_POSITIONS[index]}>
      {/* Legs */}
      <mesh position={[-0.13, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.5, 12]} />
        <meshPhysicalMaterial
          color="#f5f5f5"
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      {/* Left knee joint */}
      <mesh position={[-0.13, 0.27, 0]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshPhysicalMaterial color="#f5f5f5" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[-0.13, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.44, 12]} />
        <meshPhysicalMaterial
          color="#f5f5f5"
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      {/* Left boot */}
      <mesh position={[-0.13, 0.03, 0.05]} castShadow>
        <boxGeometry args={[0.11, 0.06, 0.2]} />
        <meshPhysicalMaterial color="#1a1a1a" roughness={0.7} metalness={0.1} />
      </mesh>

      <mesh position={[0.13, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.5, 12]} />
        <meshPhysicalMaterial
          color="#f5f5f5"
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      {/* Right knee joint */}
      <mesh position={[0.13, 0.27, 0]} castShadow>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshPhysicalMaterial color="#f5f5f5" roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0.13, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.07, 0.44, 12]} />
        <meshPhysicalMaterial
          color="#f5f5f5"
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      {/* Right boot */}
      <mesh position={[0.13, 0.03, 0.05]} castShadow>
        <boxGeometry args={[0.11, 0.06, 0.2]} />
        <meshPhysicalMaterial color="#1a1a1a" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.93, 0]} castShadow>
        <boxGeometry args={[0.5, 0.68, 0.26]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <boxGeometry args={[0.58, 0.13, 0.24]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>

      {/* Left arm */}
      <mesh position={[-0.36, 1.0, 0]} rotation={[0, 0, 0.35]} castShadow>
        <cylinderGeometry args={[0.07, 0.06, 0.4, 12]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      {/* Left elbow joint */}
      <mesh position={[-0.44, 0.86, 0]} castShadow>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[-0.48, 0.83, 0]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.06, 0.05, 0.34, 12]} />
        <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
      </mesh>

      {/* Right arm (throwing) */}
      <mesh
        ref={armRRef}
        position={[0.36, 1.0, 0]}
        rotation={[0, 0, -0.4]}
        castShadow
      >
        <cylinderGeometry args={[0.07, 0.06, 0.4, 12]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.85}
          metalness={0}
          sheen={0.4}
        />
      </mesh>
      {/* Right elbow joint */}
      <mesh position={[0.44, 0.86, 0]} castShadow>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0.48, 0.83, 0]} rotation={[0, 0, -0.2]} castShadow>
        <cylinderGeometry args={[0.06, 0.05, 0.34, 12]} />
        <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.08, 0.16, 8]} />
        <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.53, 0]} castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
      </mesh>

      {/* Cricket cap top */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <cylinderGeometry args={[0.21, 0.21, 0.13, 10]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Cap brim */}
      <mesh position={[0, 1.64, 0.2]} castShadow>
        <boxGeometry args={[0.26, 0.045, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function Fielders() {
  const ballState = useGameStore((s) => s.ballState);
  const ballStateRef = useRef(ballState);

  const fielderStates = useRef<FielderState[]>(
    FIELDER_POSITIONS.map((pos) => ({
      pos: new THREE.Vector3(...pos),
      basePos: new THREE.Vector3(...pos),
      bodyRef: { current: null },
      phase: "idle",
      phaseTimer: 0,
      diveProgress: 0,
      armAngle: -0.4,
      targetArmAngle: -0.4,
    })),
  );

  const activeFielderIdx = useRef<number>(-1);
  const catchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ballStateRef.current = ballState;

    if (ballState === "idle") {
      fielderCaughtRef.current = false;
      activeFielderIdx.current = -1;
      for (const fs of fielderStates.current) {
        fs.phase = "idle";
        fs.pos.copy(fs.basePos);
        fs.diveProgress = 0;
        fs.targetArmAngle = -0.4;
      }
      if (catchTimerRef.current) clearTimeout(catchTimerRef.current);
      if (throwTimerRef.current) clearTimeout(throwTimerRef.current);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    }
  }, [ballState]);

  useFrame((_, delta) => {
    const state = ballStateRef.current;
    if (state !== "hit") return;

    const ball = ballPositionRef.current;
    const ballVec = new THREE.Vector3(ball[0], 0, ball[2]);

    for (let i = 0; i < fielderStates.current.length; i++) {
      const fs = fielderStates.current[i];

      if (fs.phase === "idle" || fs.phase === "moving") {
        const distToBall = fs.pos.distanceTo(ballVec);

        if (distToBall < 15 && activeFielderIdx.current === -1) {
          fs.phase = "moving";
          activeFielderIdx.current = i;
        }

        if (fs.phase === "moving") {
          const dir = ballVec.clone().sub(fs.pos).normalize();
          fs.pos.addScaledVector(dir, delta * 5.5);
          fs.pos.y = 0;

          const newDist = fs.pos.distanceTo(ballVec);
          if (newDist < 2.5 && !fielderCaughtRef.current) {
            fs.phase = "diving";
            fs.diveProgress = 0;

            catchTimerRef.current = setTimeout(() => {
              fielderCaughtRef.current = true;
              fs.phase = "throwing";
              fs.targetArmAngle = -2.2;

              const runsOnBall = lastBallRunsRef.current;

              throwTimerRef.current = setTimeout(() => {
                fs.targetArmAngle = -0.4;
                fs.phase = "returning";

                if (runsOnBall <= 1 && ballStateRef.current === "hit") {
                  useGameStore.getState().takeWicket("RUN OUT");
                } else {
                  useGameStore.getState().resetBall();
                }

                returnTimerRef.current = setTimeout(() => {
                  fs.phase = "idle";
                  fs.pos.copy(fs.basePos);
                  activeFielderIdx.current = -1;
                }, 2000);
              }, 1200);
            }, 900);
          }
        }
      }

      if (fs.phase === "diving") {
        fs.diveProgress = Math.min(fs.diveProgress + delta * 2.5, 1);
      }
    }
  });

  useFrame(() => {
    fielderPositionsRef.current = fielderStates.current.map(
      (fs) => [fs.pos.x, fs.pos.y, fs.pos.z] as [number, number, number],
    );
  });

  return (
    <>
      {FIELDER_POSITIONS.map((pos, i) => (
        <FielderMesh
          key={`${pos[0]},${pos[2]}`}
          index={i}
          fielderState={fielderStates.current[i]}
        />
      ))}
    </>
  );
}
