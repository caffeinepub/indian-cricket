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

// Fielder positions: avoid pitch area (x: -1.5 to 1.5, z: -10 to 10)
const FIELDER_POSITIONS: Array<[number, number, number]> = [
  [3.5, 0, 12], // slip (behind batsman, off side)
  [14, 0, 4], // point
  [-8, 0, -5], // mid-on
  [7, 0, -6], // mid-off
  [-12, 0, 13], // fine leg
  [12, 0, -2], // cover
  [-12, 0, 6], // square leg
];

const FIELDER_COLORS = [
  "#1a237e", // slip - deep navy
  "#0d47a1", // point
  "#1565c0", // mid-on
  "#1976d2", // mid-off
  "#1e88e5", // fine leg
  "#2196f3", // cover
  "#42a5f5", // square leg
];

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
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const armLRef = useRef<THREE.Mesh>(null);
  const armRRef = useRef<THREE.Mesh>(null);

  fielderState.bodyRef =
    groupRef as unknown as React.RefObject<THREE.Group | null>;

  const color = FIELDER_COLORS[index] ?? "#1976d2";

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    // Update group position from state
    group.position.copy(fielderState.pos);

    // Dive tilt
    if (fielderState.phase === "diving") {
      const tilt = Math.min(fielderState.diveProgress * 1.5, Math.PI / 2.2);
      group.rotation.x = tilt;
    } else {
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, 0.1);
    }

    // Arm throw animation
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
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.9, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh ref={headRef} position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#c68642" roughness={0.7} />
      </mesh>
      {/* Left arm */}
      <mesh ref={armLRef} position={[-0.38, 0.85, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.07, 0.07, 0.55, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Right arm (throwing) */}
      <mesh ref={armRRef} position={[0.38, 0.85, 0]} rotation={[0, 0, -0.4]}>
        <cylinderGeometry args={[0.07, 0.07, 0.55, 6]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.12, 0.18, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
      </mesh>
      <mesh position={[0.12, 0.18, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
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

  // Track which fielder is active
  const activeFielderIdx = useRef<number>(-1);
  const catchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    ballStateRef.current = ballState;

    if (ballState === "idle") {
      // Reset all fielders to base positions
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
          // Move toward ball
          const dir = ballVec.clone().sub(fs.pos).normalize();
          fs.pos.addScaledVector(dir, delta * 5.5);
          fs.pos.y = 0;

          const newDist = fs.pos.distanceTo(ballVec);
          if (newDist < 2.5 && !fielderCaughtRef.current) {
            // Start dive
            fs.phase = "diving";
            fs.diveProgress = 0;

            catchTimerRef.current = setTimeout(() => {
              fielderCaughtRef.current = true;
              fs.phase = "throwing";
              fs.targetArmAngle = -2.2; // raise arm for throw

              const runsOnBall = lastBallRunsRef.current;

              throwTimerRef.current = setTimeout(() => {
                fs.targetArmAngle = -0.4;
                fs.phase = "returning";

                // Run-out: if 0 or 1 run scored (batsman still running)
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

  // Update fielderPositionsRef for camera controller
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
