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

const SKIN_TONES = ["#b07850", "#c68642", "#c8956c", "#b87333", "#8B4513"];

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
  runCycle: number;
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

  // Running animation refs
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmSwingRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  fielderState.bodyRef =
    groupRef as unknown as React.RefObject<THREE.Group | null>;

  const color = FIELDER_COLORS[index] ?? "#1976d2";
  const skin = getFielderSkinTone(index);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    group.position.copy(fielderState.pos);

    const isRunning = fielderState.phase === "moving";
    const isDiving = fielderState.phase === "diving";

    // ── Running animation ──────────────────────────────────────
    if (isRunning) {
      fielderState.runCycle += delta * 8.5; // speed of cycle
      const cycle = fielderState.runCycle;
      const legSwing = Math.sin(cycle) * 0.72; // max ~41°
      const armSwing = Math.sin(cycle) * 0.55;

      // Legs swing in opposition
      if (leftLegRef.current) leftLegRef.current.rotation.x = legSwing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;

      // Arms swing opposite to legs
      if (leftArmRef.current) leftArmRef.current.rotation.x = -armSwing;
      if (rightArmSwingRef.current)
        rightArmSwingRef.current.rotation.x = armSwing;

      // Slight forward lean
      if (torsoRef.current) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(
          torsoRef.current.rotation.x,
          -0.22,
          0.12,
        );
      }
    } else {
      // Return to neutral
      fielderState.runCycle = 0;
      if (leftLegRef.current)
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(
          leftLegRef.current.rotation.x,
          0,
          0.15,
        );
      if (rightLegRef.current)
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(
          rightLegRef.current.rotation.x,
          0,
          0.15,
        );
      if (leftArmRef.current)
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
          leftArmRef.current.rotation.x,
          0,
          0.15,
        );
      if (rightArmSwingRef.current)
        rightArmSwingRef.current.rotation.x = THREE.MathUtils.lerp(
          rightArmSwingRef.current.rotation.x,
          0,
          0.15,
        );
      if (torsoRef.current) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(
          torsoRef.current.rotation.x,
          0,
          0.1,
        );
      }
    }

    // ── Dive tilt ─────────────────────────────────────────────
    // Fix: only bend TORSO forward, do NOT rotate entire group (which caused body to fall flat)
    if (isDiving) {
      const tilt = Math.min(fielderState.diveProgress * 1.2, Math.PI / 3);
      if (torsoRef.current) {
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(
          torsoRef.current.rotation.x,
          tilt,
          0.15,
        );
      }
      // Reach both arms forward/down to scoop the ball
      if (leftArmRef.current)
        leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
          leftArmRef.current.rotation.x,
          1.3,
          0.12,
        );
      if (rightArmSwingRef.current)
        rightArmSwingRef.current.rotation.x = THREE.MathUtils.lerp(
          rightArmSwingRef.current.rotation.x,
          1.3,
          0.12,
        );
      group.position.y = THREE.MathUtils.lerp(group.position.y, -0.08, 0.1);
    } else {
      // Straighten torso back up
      if (torsoRef.current)
        torsoRef.current.rotation.x = THREE.MathUtils.lerp(
          torsoRef.current.rotation.x,
          0,
          0.1,
        );
      group.position.y = THREE.MathUtils.lerp(
        group.position.y,
        fielderState.pos.y,
        0.1,
      );
    }

    // ── Throw arm ─────────────────────────────────────────────
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
      {/* ── TORSO GROUP (for forward lean during run) ── */}
      <group ref={torsoRef}>
        {/* ── HIP BRIDGE ── */}
        <mesh position={[0, 0.73, 0]} castShadow>
          <boxGeometry args={[0.32, 0.12, 0.23]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.8}
            metalness={0}
            sheen={0.3}
          />
        </mesh>

        {/* ── TORSO ── */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <boxGeometry args={[0.44, 0.2, 0.25]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[0, 1.03, 0]} castShadow>
          <boxGeometry args={[0.51, 0.28, 0.27]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        <mesh position={[0, 1.19, 0]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.25]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>

        {/* ── LEFT ARM (swing group) ── */}
        <group ref={leftArmRef} position={[-0.34, 1.19, 0]}>
          {/* Left shoulder cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.088, 10, 10]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Left upper arm */}
          <mesh position={[-0.04, -0.15, 0]} rotation={[0, 0, 0.35]} castShadow>
            <cylinderGeometry args={[0.07, 0.06, 0.36, 12]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Left elbow */}
          <mesh position={[-0.11, -0.32, 0]} castShadow>
            <sphereGeometry args={[0.062, 8, 8]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
          {/* Left forearm */}
          <mesh position={[-0.15, -0.36, 0]} rotation={[0, 0, 0.2]} castShadow>
            <cylinderGeometry args={[0.058, 0.05, 0.32, 12]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
          {/* Left wrist */}
          <mesh position={[-0.19, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
          {/* Left hand */}
          <mesh position={[-0.2, -0.53, 0]} castShadow>
            <boxGeometry args={[0.088, 0.075, 0.088]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
        </group>

        {/* ── RIGHT ARM (swing group, also has throw override) ── */}
        <group ref={rightArmSwingRef} position={[0.34, 1.19, 0]}>
          {/* Right shoulder cap */}
          <mesh castShadow>
            <sphereGeometry args={[0.088, 10, 10]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Right upper arm (separate ref for throw) */}
          <mesh
            ref={armRRef}
            position={[0.04, -0.15, 0]}
            rotation={[0, 0, -0.4]}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.06, 0.36, 12]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Right elbow */}
          <mesh position={[0.11, -0.32, 0]} castShadow>
            <sphereGeometry args={[0.062, 8, 8]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
          {/* Right forearm */}
          <mesh position={[0.15, -0.36, 0]} rotation={[0, 0, -0.2]} castShadow>
            <cylinderGeometry args={[0.058, 0.05, 0.32, 12]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
          {/* Right wrist */}
          <mesh position={[0.19, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
          {/* Right hand */}
          <mesh position={[0.2, -0.53, 0]} castShadow>
            <boxGeometry args={[0.088, 0.075, 0.088]} />
            <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
          </mesh>
        </group>

        {/* ── NECK ── */}
        <mesh position={[0, 1.33, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.082, 0.18, 10]} />
          <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
        </mesh>

        {/* ── HEAD ── */}
        <mesh position={[0, 1.52, 0]} castShadow>
          <sphereGeometry args={[0.205, 16, 16]} />
          <meshPhysicalMaterial color={skin} roughness={0.82} metalness={0} />
        </mesh>
        {/* Left ear */}
        <mesh position={[-0.205, 1.52, 0]} castShadow>
          <sphereGeometry args={[0.048, 8, 8]} />
          <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
        </mesh>
        {/* Right ear */}
        <mesh position={[0.205, 1.52, 0]} castShadow>
          <sphereGeometry args={[0.048, 8, 8]} />
          <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
        </mesh>
        {/* Left eye white */}
        <mesh position={[-0.068, 1.555, 0.18]}>
          <sphereGeometry args={[0.031, 10, 10]} />
          <meshStandardMaterial color="#f8f8f8" roughness={0.25} />
        </mesh>
        {/* Left iris */}
        <mesh position={[-0.068, 1.555, 0.205]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#1a0800" roughness={0.2} />
        </mesh>
        {/* Right eye white */}
        <mesh position={[0.068, 1.555, 0.18]}>
          <sphereGeometry args={[0.031, 10, 10]} />
          <meshStandardMaterial color="#f8f8f8" roughness={0.25} />
        </mesh>
        {/* Right iris */}
        <mesh position={[0.068, 1.555, 0.205]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#1a0800" roughness={0.2} />
        </mesh>
        {/* Left eyebrow */}
        <mesh position={[-0.068, 1.59, 0.178]} rotation={[0.15, 0, 0.08]}>
          <boxGeometry args={[0.06, 0.013, 0.016]} />
          <meshStandardMaterial color="#1a0800" roughness={0.8} />
        </mesh>
        {/* Right eyebrow */}
        <mesh position={[0.068, 1.59, 0.178]} rotation={[0.15, 0, -0.08]}>
          <boxGeometry args={[0.06, 0.013, 0.016]} />
          <meshStandardMaterial color="#1a0800" roughness={0.8} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, 1.518, 0.213]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.034, 0.05, 0.034]} />
          <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
        </mesh>
        <mesh position={[0, 1.5, 0.225]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshPhysicalMaterial color={skin} roughness={0.85} metalness={0} />
        </mesh>
        {/* Mouth */}
        <mesh position={[0, 1.472, 0.2]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.068, 0.014, 0.014]} />
          <meshStandardMaterial color="#5a2a1a" roughness={0.9} />
        </mesh>
        {/* ── CRICKET CAP ── */}
        <mesh position={[0, 1.66, 0]} castShadow>
          <cylinderGeometry args={[0.215, 0.215, 0.13, 10]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.62, 0.21]} castShadow>
          <boxGeometry args={[0.27, 0.046, 0.14]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      </group>

      {/* ── LEFT LEG (swing group, pivot at hip) ── */}
      <group ref={leftLegRef} position={[-0.13, 0.76, 0]}>
        {/* Left hip joint */}
        <mesh castShadow>
          <sphereGeometry args={[0.095, 10, 10]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        {/* Left thigh */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.08, 0.42, 12]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        {/* Left knee */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <sphereGeometry args={[0.085, 10, 10]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        {/* Left shin */}
        <mesh position={[0, -0.58, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.36, 12]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        {/* Left ankle */}
        <mesh position={[0, -0.72, 0.02]} castShadow>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Left boot */}
        <mesh position={[0, -0.73, 0.06]} castShadow>
          <boxGeometry args={[0.11, 0.06, 0.22]} />
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* ── RIGHT LEG (swing group, pivot at hip) ── */}
      <group ref={rightLegRef} position={[0.13, 0.76, 0]}>
        {/* Right hip joint */}
        <mesh castShadow>
          <sphereGeometry args={[0.095, 10, 10]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        {/* Right thigh */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.08, 0.42, 12]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        {/* Right knee */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <sphereGeometry args={[0.085, 10, 10]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
          />
        </mesh>
        {/* Right shin */}
        <mesh position={[0, -0.58, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.36, 12]} />
          <meshPhysicalMaterial
            color="#f5f5f5"
            roughness={0.85}
            metalness={0}
            sheen={0.4}
          />
        </mesh>
        {/* Right ankle */}
        <mesh position={[0, -0.72, 0.02]} castShadow>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
        {/* Right boot */}
        <mesh position={[0, -0.73, 0.06]} castShadow>
          <boxGeometry args={[0.11, 0.06, 0.22]} />
          <meshPhysicalMaterial
            color="#1a1a1a"
            roughness={0.7}
            metalness={0.1}
          />
        </mesh>
      </group>
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
      runCycle: 0,
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
        fs.runCycle = 0;
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

          // Face the direction of movement
          if (fs.bodyRef.current) {
            const angle = Math.atan2(dir.x, dir.z);
            fs.bodyRef.current.rotation.y = THREE.MathUtils.lerp(
              fs.bodyRef.current.rotation.y,
              angle,
              0.18,
            );
          }

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
