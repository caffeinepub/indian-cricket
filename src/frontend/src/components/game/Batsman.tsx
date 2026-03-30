import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  ballPositionRef,
  shotDirectionRef,
  swingRequestRef,
  timingQualityRef,
} from "../../refs/sharedRefs";
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
  const upperBodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const aiSwingTriggeredRef = useRef(false);
  const headGroupRef = useRef<THREE.Group>(null);

  const primaryColor = useGameStore((s) => s.primaryColor);
  const faceTexture = useGameStore((s) => s.faceTexture);
  const helmetColor = useGameStore((s) => s.helmetColor);
  const batColor = useGameStore((s) => s.batColor);
  const padsColor = useGameStore((s) => s.padsColor);
  const glovesColor = useGameStore((s) => s.glovesColor);
  const skinTone = useGameStore((s) => s.skinTone);
  const players = useGameStore((s) => s.players);

  const batsmanPlayer = players[2] ?? { name: "V. Kohli", jerseyNumber: 18 };
  const labelText = `${batsmanPlayer.name} #${batsmanPlayer.jerseyNumber}`;

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

  const batHandleColor = (() => {
    try {
      const r = Number.parseInt(batColor.slice(1, 3), 16);
      const g = Number.parseInt(batColor.slice(3, 5), 16);
      const b = Number.parseInt(batColor.slice(5, 7), 16);
      return `#${Math.max(0, Math.floor(r * 0.6))
        .toString(16)
        .padStart(2, "0")}${Math.max(0, Math.floor(g * 0.6))
        .toString(16)
        .padStart(2, "0")}${Math.max(0, Math.floor(b * 0.6))
        .toString(16)
        .padStart(2, "0")}`;
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
        // Flash hit effect
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 250);
      }
      prev = state.ballState;
    });
    return unsub;
  }, []);

  useFrame((_, delta) => {
    bobOffset.current += delta * 1.8;
    const ballPos = ballPositionRef.current;
    const bState = useGameStore.getState().ballState;
    const uMode = useGameStore.getState().userMode;

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(bobOffset.current) * 0.025;
    }

    // Head tracking - batsman watches the ball
    if (headGroupRef.current && bState === "bowled") {
      const ballXOffset = Math.max(-0.6, Math.min(0.6, -ballPos[0] * 0.4));
      const ballYLook = Math.max(
        -0.3,
        Math.min(0.3, (1.5 - ballPos[1]) * 0.15),
      );
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        ballXOffset,
        0.12,
      );
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        ballYLook,
        0.1,
      );
    } else if (headGroupRef.current) {
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        0,
        0.08,
      );
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        0,
        0.08,
      );
    }

    // Pre-delivery lean - batsman leans forward as ball approaches
    if (upperBodyRef.current && !isSwinging.current) {
      const isBallApproaching =
        bState === "bowled" && ballPos[2] > -7 && ballPos[2] < 7;
      const targetLeanX = isBallApproaching ? 0.1 : 0.04;
      upperBodyRef.current.rotation.x = THREE.MathUtils.lerp(
        upperBodyRef.current.rotation.x,
        targetLeanX,
        0.06,
      );
      upperBodyRef.current.rotation.z = THREE.MathUtils.lerp(
        upperBodyRef.current.rotation.z,
        Math.sin(bobOffset.current * 0.5) * 0.03,
        0.1,
      );
    }

    // AI batting: auto-swing when ball is close and user is bowling
    if (
      uMode === "bowling" &&
      bState === "bowled" &&
      !aiSwingTriggeredRef.current
    ) {
      if (ballPos[2] > 5) {
        aiSwingTriggeredRef.current = true;
        swingRequestRef.current = true;
        timingQualityRef.current = "perfect";
        useGameStore.getState().swing();
      }
    }
    if (bState !== "bowled") {
      aiSwingTriggeredRef.current = false;
    }
    if (isSwinging.current && armGroupRef.current) {
      const shotType = currentShotType.current;
      // Faster swing: delta * 18 (was 9), more dramatic maxSwing
      swingAngle.current += delta * swingDir.current * 18;
      const maxSwing = Math.PI * 1.1;
      const t = Math.min(Math.max(swingAngle.current, 0), maxSwing) / maxSwing;
      const targetRx =
        shotType === "straight"
          ? -Math.min(Math.max(swingAngle.current, 0), maxSwing)
          : shotType === "offside"
            ? -Math.min(Math.max(swingAngle.current, 0), maxSwing) * 0.7
            : -Math.min(Math.max(swingAngle.current, 0), maxSwing) * 0.4;
      const targetRz =
        shotType === "offside" ? -Math.sin(t * Math.PI) * 0.8 : 0;
      const targetRy = shotType === "legside" ? Math.sin(t * Math.PI) * 1.2 : 0;
      armGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        armGroupRef.current.rotation.x,
        targetRx,
        0.3,
      );
      armGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        armGroupRef.current.rotation.z,
        targetRz,
        0.3,
      );
      armGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        armGroupRef.current.rotation.y,
        targetRy,
        0.3,
      );
      if (swingAngle.current >= maxSwing) swingDir.current = -1;
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
    <group position={[0.3, 0, 8]} rotation={[0, 0.3, 0]}>
      {/* Hit flash impact light */}
      {hitFlash && (
        <pointLight
          position={[0.5, 1.0, 0.1]}
          intensity={8}
          color="#ffaa00"
          distance={3}
        />
      )}
      {hitFlash && (
        <mesh position={[0.5, 1.0, 0.1]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.85} />
        </mesh>
      )}

      {/* Slightly larger scale for more imposing presence */}
      <group scale={1.12}>
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

          {/* ── LEGS ── */}
          {/* Left hip joint */}
          <mesh position={[-0.22, 0.78, 0.04]} castShadow>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          {/* Left thigh */}
          <mesh position={[-0.22, 0.56, 0.04]} castShadow>
            <cylinderGeometry args={[0.1, 0.09, 0.44, 12]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Left knee */}
          <mesh position={[-0.22, 0.32, 0.04]} castShadow>
            <sphereGeometry args={[0.095, 10, 10]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          {/* Left shin */}
          <mesh position={[-0.13, 0.18, 0.01]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 0.38, 12]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Left ankle */}
          <mesh position={[-0.13, 0.04, 0.03]} castShadow>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshPhysicalMaterial
              color="#1a1a1a"
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
          {/* Left boot */}
          <mesh position={[-0.13, 0.035, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.065, 0.24]} />
            <meshPhysicalMaterial
              color="#1a1a1a"
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>

          {/* Right hip joint */}
          <mesh position={[0.13, 0.78, 0]} castShadow>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          {/* Right thigh */}
          <mesh position={[0.13, 0.56, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.09, 0.44, 12]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Right knee */}
          <mesh position={[0.13, 0.32, 0]} castShadow>
            <sphereGeometry args={[0.095, 10, 10]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
            />
          </mesh>
          {/* Right shin */}
          <mesh position={[0.13, 0.18, 0.01]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 0.38, 12]} />
            <meshPhysicalMaterial
              color="#f0f0f0"
              roughness={0.85}
              metalness={0}
              sheen={0.4}
            />
          </mesh>
          {/* Right ankle */}
          <mesh position={[0.13, 0.04, 0.03]} castShadow>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshPhysicalMaterial
              color="#1a1a1a"
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
          {/* Right boot */}
          <mesh position={[0.13, 0.035, 0.06]} castShadow>
            <boxGeometry args={[0.12, 0.065, 0.24]} />
            <meshPhysicalMaterial
              color="#1a1a1a"
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>

          {/* ── HIP / SHORTS ── */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[0.34, 0.14, 0.24]} />
            <meshPhysicalMaterial
              color="#1a3a6b"
              roughness={0.8}
              metalness={0}
              sheen={0.3}
            />
          </mesh>
          <mesh position={[-0.13, 0.63, 0]} castShadow>
            <boxGeometry args={[0.2, 0.18, 0.23]} />
            <meshPhysicalMaterial
              color="#1a3a6b"
              roughness={0.8}
              metalness={0}
              sheen={0.3}
            />
          </mesh>
          <mesh position={[0.13, 0.63, 0]} castShadow>
            <boxGeometry args={[0.2, 0.18, 0.23]} />
            <meshPhysicalMaterial
              color="#1a3a6b"
              roughness={0.8}
              metalness={0}
              sheen={0.3}
            />
          </mesh>

          {/* ── PADS (upgraded: taller, with straps) ── */}
          {/* Left knee pad */}
          <mesh position={[-0.13, 0.42, 0.09]} castShadow>
            <boxGeometry args={[0.18, 0.26, 0.1]} />
            <meshPhysicalMaterial
              color={padsColor}
              roughness={0.7}
              metalness={0}
              sheen={0.7}
              sheenRoughness={0.7}
            />
          </mesh>
          {/* Left knee pad straps */}
          {[0, 1, 2].map((si) => (
            <mesh
              key={`lkp-strap-${si}`}
              position={[-0.13, 0.33 + si * 0.06, 0.142]}
              castShadow
            >
              <boxGeometry args={[0.19, 0.012, 0.005]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          ))}
          {/* Right knee pad */}
          <mesh position={[0.13, 0.42, 0.09]} castShadow>
            <boxGeometry args={[0.18, 0.26, 0.1]} />
            <meshPhysicalMaterial
              color={padsColor}
              roughness={0.7}
              metalness={0}
              sheen={0.7}
              sheenRoughness={0.7}
            />
          </mesh>
          {/* Right knee pad straps */}
          {[0, 1, 2].map((si) => (
            <mesh
              key={`rkp-strap-${si}`}
              position={[0.13, 0.33 + si * 0.06, 0.142]}
              castShadow
            >
              <boxGeometry args={[0.19, 0.012, 0.005]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          ))}
          {/* Left shin pad - taller */}
          <mesh position={[-0.13, 0.2, 0.1]} castShadow>
            <boxGeometry args={[0.17, 0.52, 0.11]} />
            <meshPhysicalMaterial
              color={padsColor}
              roughness={0.7}
              metalness={0}
              sheen={0.7}
              sheenRoughness={0.7}
            />
          </mesh>
          {/* Left shin pad straps */}
          {[0, 1, 2].map((si) => (
            <mesh
              key={`lsp-strap-${si}`}
              position={[-0.13, 0.08 + si * 0.12, 0.158]}
              castShadow
            >
              <boxGeometry args={[0.18, 0.014, 0.005]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          ))}
          {/* Right shin pad - taller */}
          <mesh position={[0.13, 0.2, 0.1]} castShadow>
            <boxGeometry args={[0.17, 0.52, 0.11]} />
            <meshPhysicalMaterial
              color={padsColor}
              roughness={0.7}
              metalness={0}
              sheen={0.7}
              sheenRoughness={0.7}
            />
          </mesh>
          {/* Right shin pad straps */}
          {[0, 1, 2].map((si) => (
            <mesh
              key={`rsp-strap-${si}`}
              position={[0.13, 0.08 + si * 0.12, 0.158]}
              castShadow
            >
              <boxGeometry args={[0.18, 0.014, 0.005]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
          ))}

          {/* ── UPPER BODY ── */}
          <group ref={upperBodyRef}>
            {/* Waist / lower torso */}
            <mesh position={[0, 0.88, 0]} castShadow>
              <boxGeometry args={[0.47, 0.22, 0.26]} />
              <meshPhysicalMaterial
                color={primaryColor}
                roughness={0.85}
                metalness={0}
                sheen={0.4}
              />
            </mesh>
            {/* Chest / upper torso — wider at top */}
            <mesh position={[0, 1.06, 0]} castShadow>
              <boxGeometry args={[0.54, 0.3, 0.28]} />
              <meshPhysicalMaterial
                color={primaryColor}
                roughness={0.85}
                metalness={0}
                sheen={0.4}
              />
            </mesh>
            {/* Shoulder yoke — broadest */}
            <mesh position={[0, 1.22, 0]} castShadow>
              <boxGeometry args={[0.62, 0.16, 0.27]} />
              <meshPhysicalMaterial
                color={primaryColor}
                roughness={0.85}
                metalness={0}
                sheen={0.4}
              />
            </mesh>
            {/* Subtle chest definition */}
            <mesh position={[0, 1.05, 0.155]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 0.04, 10]} />
              <meshPhysicalMaterial
                color={primaryColor}
                roughness={0.75}
                metalness={0}
              />
            </mesh>
            {/* ── LEFT ARM ── */}
            {/* Left shoulder cap */}
            <mesh position={[-0.36, 1.22, 0]} castShadow>
              <sphereGeometry args={[0.095, 10, 10]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Left upper arm */}
            <mesh
              position={[-0.41, 1.06, 0]}
              rotation={[0, 0, 0.35]}
              castShadow
            >
              <cylinderGeometry args={[0.075, 0.065, 0.38, 12]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Left elbow */}
            <mesh position={[-0.49, 0.88, 0]} castShadow>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Left forearm */}
            <mesh position={[-0.52, 0.81, 0]} rotation={[0, 0, 0.2]} castShadow>
              <cylinderGeometry args={[0.065, 0.055, 0.36, 12]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Left wrist */}
            <mesh position={[-0.56, 0.66, 0]} castShadow>
              <sphereGeometry args={[0.058, 8, 8]} />
              <meshPhysicalMaterial
                color={glovesColor}
                roughness={0.8}
                metalness={0}
              />
            </mesh>
            {/* Left glove - upgraded: chunkier */}
            <mesh position={[-0.56, 0.61, 0]} castShadow>
              <boxGeometry args={[0.16, 0.14, 0.15]} />
              <meshPhysicalMaterial
                color={glovesColor}
                roughness={0.75}
                metalness={0}
                sheen={0.7}
                sheenRoughness={0.7}
              />
            </mesh>
            {/* Left glove palm padding */}
            <mesh position={[-0.56, 0.61, 0.075]} castShadow>
              <boxGeometry args={[0.14, 0.12, 0.02]} />
              <meshStandardMaterial color="#ffffff" roughness={0.6} />
            </mesh>
            {[0, 1, 2, 3].map((fi) => (
              <mesh
                key={`lf-${fi}`}
                position={[-0.56 + (fi - 1.5) * 0.035, 0.57, 0.09]}
                castShadow
              >
                <boxGeometry args={[0.028, 0.08, 0.028]} />
                <meshPhysicalMaterial
                  color={glovesColor}
                  roughness={0.8}
                  metalness={0}
                />
              </mesh>
            ))}
            {/* ── RIGHT ARM + BAT ── */}
            <group ref={armGroupRef} position={[0.28, 1.2, 0]}>
              {/* Shoulder cap */}
              <mesh position={[0.1, 0, 0]} castShadow>
                <sphereGeometry args={[0.095, 10, 10]} />
                <meshPhysicalMaterial
                  color={skinTone}
                  roughness={0.85}
                  metalness={0}
                />
              </mesh>
              {/* Upper arm */}
              <mesh
                position={[0.12, -0.16, 0]}
                rotation={[0, 0, -0.2]}
                castShadow
              >
                <cylinderGeometry args={[0.075, 0.065, 0.38, 12]} />
                <meshPhysicalMaterial
                  color={skinTone}
                  roughness={0.85}
                  metalness={0}
                />
              </mesh>
              {/* Elbow */}
              <mesh position={[0.14, -0.34, 0]} castShadow>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshPhysicalMaterial
                  color={skinTone}
                  roughness={0.85}
                  metalness={0}
                />
              </mesh>
              {/* Forearm */}
              <mesh
                position={[0.15, -0.42, 0]}
                rotation={[0, 0, -0.1]}
                castShadow
              >
                <cylinderGeometry args={[0.065, 0.055, 0.36, 12]} />
                <meshPhysicalMaterial
                  color={skinTone}
                  roughness={0.85}
                  metalness={0}
                />
              </mesh>
              {/* Wrist */}
              <mesh position={[0.19, -0.59, 0]} castShadow>
                <sphereGeometry args={[0.058, 8, 8]} />
                <meshPhysicalMaterial
                  color={glovesColor}
                  roughness={0.8}
                  metalness={0}
                />
              </mesh>
              {/* Right glove - upgraded: chunkier */}
              <mesh position={[0.2, -0.64, 0]} castShadow>
                <boxGeometry args={[0.16, 0.14, 0.15]} />
                <meshPhysicalMaterial
                  color={glovesColor}
                  roughness={0.75}
                  metalness={0}
                  sheen={0.7}
                  sheenRoughness={0.7}
                />
              </mesh>
              {/* Right glove palm padding */}
              <mesh position={[0.2, -0.64, 0.076]} castShadow>
                <boxGeometry args={[0.14, 0.12, 0.02]} />
                <meshStandardMaterial color="#ffffff" roughness={0.6} />
              </mesh>
              {[0, 1, 2, 3].map((fi) => (
                <mesh
                  key={`rf-${fi}`}
                  position={[0.2 + (fi - 1.5) * 0.035, -0.68, 0.09]}
                  castShadow
                >
                  <boxGeometry args={[0.028, 0.08, 0.028]} />
                  <meshPhysicalMaterial
                    color={glovesColor}
                    roughness={0.8}
                    metalness={0}
                  />
                </mesh>
              ))}
              {/* Bat blade - wood grain with lighter tip */}
              <mesh
                position={[0.2, -0.72, 0.06]}
                rotation={[0.15, 0, 0.1]}
                castShadow
              >
                <boxGeometry args={[0.07, 0.75, 0.26]} />
                <meshStandardMaterial color={batColor} roughness={0.4} />
              </mesh>
              {/* Bat blade lighter tip */}
              <mesh
                position={[0.2, -1.08, 0.06]}
                rotation={[0.15, 0, 0.1]}
                castShadow
              >
                <boxGeometry args={[0.07, 0.08, 0.26]} />
                <meshStandardMaterial color="#e8c87a" roughness={0.35} />
              </mesh>
              {/* Bat edge guard left */}
              <mesh
                position={[0.165, -0.72, 0.06]}
                rotation={[0.15, 0, 0.1]}
                castShadow
              >
                <boxGeometry args={[0.012, 0.72, 0.28]} />
                <meshStandardMaterial color="#222222" roughness={0.5} />
              </mesh>
              {/* Bat edge guard right */}
              <mesh
                position={[0.235, -0.72, 0.06]}
                rotation={[0.15, 0, 0.1]}
                castShadow
              >
                <boxGeometry args={[0.012, 0.72, 0.28]} />
                <meshStandardMaterial color="#222222" roughness={0.5} />
              </mesh>
              {/* Bat handle */}
              <mesh
                position={[0.16, -0.38, 0.02]}
                rotation={[0.1, 0, 0.1]}
                castShadow
              >
                <cylinderGeometry args={[0.03, 0.03, 0.28, 6]} />
                <meshStandardMaterial color={batHandleColor} roughness={0.5} />
              </mesh>
            </group>
            {/* ── NECK ── */}
            <mesh position={[0, 1.38, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.095, 0.2, 10]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* ── HEAD ── */}
            <group ref={headGroupRef} position={[0, 1.6, 0]}>
              <mesh ref={headRef} position={[0, 0, 0]} castShadow>
                <sphereGeometry args={[0.215, 16, 16]} />
                <meshPhysicalMaterial
                  color={skinTone}
                  roughness={0.82}
                  metalness={0}
                />
              </mesh>
            </group>{" "}
            {/* end headGroupRef */}
            {/* Left ear */}
            <mesh position={[-0.215, 1.6, 0]} castShadow>
              <sphereGeometry args={[0.052, 8, 8]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Right ear */}
            <mesh position={[0.215, 1.6, 0]} castShadow>
              <sphereGeometry args={[0.052, 8, 8]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Left eye white */}
            <mesh position={[-0.072, 1.635, 0.188]}>
              <sphereGeometry args={[0.034, 10, 10]} />
              <meshStandardMaterial color="#f8f8f8" roughness={0.25} />
            </mesh>
            {/* Left iris */}
            <mesh position={[-0.072, 1.635, 0.215]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#1a0800" roughness={0.2} />
            </mesh>
            {/* Right eye white */}
            <mesh position={[0.072, 1.635, 0.188]}>
              <sphereGeometry args={[0.034, 10, 10]} />
              <meshStandardMaterial color="#f8f8f8" roughness={0.25} />
            </mesh>
            {/* Right iris */}
            <mesh position={[0.072, 1.635, 0.215]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#1a0800" roughness={0.2} />
            </mesh>
            {/* Left eyebrow */}
            <mesh position={[-0.072, 1.674, 0.187]} rotation={[0.15, 0, 0.08]}>
              <boxGeometry args={[0.065, 0.014, 0.018]} />
              <meshStandardMaterial color="#2a1200" roughness={0.8} />
            </mesh>
            {/* Right eyebrow */}
            <mesh position={[0.072, 1.674, 0.187]} rotation={[0.15, 0, -0.08]}>
              <boxGeometry args={[0.065, 0.014, 0.018]} />
              <meshStandardMaterial color="#2a1200" roughness={0.8} />
            </mesh>
            {/* Nose */}
            <mesh position={[0, 1.598, 0.225]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.038, 0.056, 0.038]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Nose tip */}
            <mesh position={[0, 1.578, 0.238]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshPhysicalMaterial
                color={skinTone}
                roughness={0.85}
                metalness={0}
              />
            </mesh>
            {/* Mouth */}
            <mesh position={[0, 1.552, 0.208]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.075, 0.016, 0.016]} />
              <meshStandardMaterial color="#5a2a1a" roughness={0.9} />
            </mesh>
            {/* ── HELMET ── */}
            <mesh position={[0, 1.69, 0]} castShadow>
              <sphereGeometry
                args={[0.245, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]}
              />
              <meshStandardMaterial
                color={helmetColor}
                roughness={0.55}
                metalness={0.2}
              />
            </mesh>
            {/* Helmet rear */}
            <mesh position={[0, 1.55, -0.21]} rotation={[0.3, 0, 0]} castShadow>
              <boxGeometry args={[0.26, 0.14, 0.08]} />
              <meshStandardMaterial
                color={helmetColor}
                roughness={0.55}
                metalness={0.2}
              />
            </mesh>
            {/* Helmet visor - tinted amber/bronze */}
            <mesh position={[0, 1.56, 0.25]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.26, 0.04, 0.14]} />
              <meshStandardMaterial
                color="#8B7355"
                roughness={0.2}
                metalness={0.4}
                transparent
                opacity={0.65}
              />
            </mesh>
            {/* Side ear protector left */}
            <mesh
              position={[-0.24, 1.56, 0.04]}
              rotation={[0, 0.3, 0]}
              castShadow
            >
              <boxGeometry args={[0.04, 0.18, 0.14]} />
              <meshStandardMaterial
                color={helmetColor}
                roughness={0.55}
                metalness={0.2}
              />
            </mesh>
            {/* Side ear protector right */}
            <mesh
              position={[0.24, 1.56, 0.04]}
              rotation={[0, -0.3, 0]}
              castShadow
            >
              <boxGeometry args={[0.04, 0.18, 0.14]} />
              <meshStandardMaterial
                color={helmetColor}
                roughness={0.55}
                metalness={0.2}
              />
            </mesh>
            {/* Grill bars */}
            {[0, 1, 2, 3, 4].map((gi) => (
              <mesh
                key={`gr-${gi}`}
                position={[-0.1 + gi * 0.05, 1.48, 0.24]}
                castShadow
              >
                <boxGeometry args={[0.02, 0.16, 0.025]} />
                <meshStandardMaterial
                  color="#aaaaaa"
                  roughness={0.4}
                  metalness={0.6}
                />
              </mesh>
            ))}
            <mesh position={[0, 1.47, 0.24]} castShadow>
              <boxGeometry args={[0.22, 0.02, 0.025]} />
              <meshStandardMaterial
                color="#aaaaaa"
                roughness={0.4}
                metalness={0.6}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
