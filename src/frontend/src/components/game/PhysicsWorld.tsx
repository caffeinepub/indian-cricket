import { useBox, usePlane, useSphere } from "@react-three/cannon";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ballPositionRef,
  bowlingVariantRef,
  lastBallRunsRef,
  replayActiveRef,
  replayPositionsRef,
  shotDirectionRef,
  shotTypeRef,
  stumpsFallenRef,
  swingRequestRef,
  timingQualityRef,
} from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

function Ground() {
  const [ref] = usePlane<THREE.Mesh>(() => ({
    rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
    position: [0, 0, 0] as [number, number, number],
    material: { friction: 0.5, restitution: 0.3 },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshLambertMaterial color="#166016" />
    </mesh>
  );
}

function Pitch() {
  const [ref] = useBox<THREE.Mesh>(() => ({
    args: [3, 0.06, 20] as [number, number, number],
    position: [0, 0.03, 0] as [number, number, number],
    mass: 0,
    material: { friction: 0.6, restitution: 0.65 },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[3, 0.06, 20]} />
      <meshLambertMaterial color="#c8a85a" />
    </mesh>
  );
}

function getShotName(direction: string): string {
  if (direction === "offside") return "Cover Drive";
  if (direction === "legside") return "Sweep Shot";
  return "Straight Drive";
}

// Dust particle for bounce impact
interface DustParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

const DUST_KEYS = ["d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7"] as const;

function DustEffect({
  particles,
}: { particles: React.MutableRefObject<DustParticle[]> }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      if (p.life <= 0) continue;
      p.life -= delta;
      p.pos.addScaledVector(p.vel, delta);
      p.vel.y -= delta * 3;
      const m = meshRefs.current[i];
      if (m) {
        const t = Math.max(0, p.life / p.maxLife);
        m.position.copy(p.pos);
        m.scale.setScalar(p.scale * t);
        (m.material as THREE.MeshBasicMaterial).opacity = t * 0.7;
      }
    }
  });

  return (
    <>
      {DUST_KEYS.map((k, i) => (
        <mesh
          key={k}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.06, 4, 4]} />
          <meshBasicMaterial color="#d4b483" transparent opacity={0} />
        </mesh>
      ))}
    </>
  );
}

// Ball trail effect
function BallTrail({
  trailPoints,
}: { trailPoints: React.MutableRefObject<THREE.Vector3[]> }) {
  const lineRef = useRef<any>(null);

  useFrame(() => {
    const pts = trailPoints.current;
    if (pts.length < 2 || !lineRef.current) return;
    // Line component re-renders via points prop; we just need parent to update
  });

  const pts = trailPoints.current;
  if (pts.length < 2) return null;

  return (
    <Line
      ref={lineRef}
      points={pts}
      color="#ffdd88"
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
}

function CricketBall() {
  const ballState = useGameStore((s) => s.ballState);

  const ballStateRef = useRef(ballState);
  const posRef = useRef<[number, number, number]>([0, 1.5, -7]);
  const deadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wicketHandledRef = useRef(false);
  const boundaryHandledRef = useRef(false);
  const swingAppliedRef = useRef(false);
  const wideHandledRef = useRef(false);
  const stumpingHandledRef = useRef(false);
  const midSwingAppliedRef = useRef(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const prevBallY = useRef(1.5);
  const bounceHandledRef = useRef(false);

  // Ball trail positions
  const trailPoints = useRef<THREE.Vector3[]>([]);
  const trailUpdateCounter = useRef(0);
  // Dust particles
  const dustParticles = useRef<DustParticle[]>(
    Array.from({ length: 8 }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.4,
      scale: 1,
    })),
  );

  const spawnDust = (x: number, y: number, z: number) => {
    for (const p of dustParticles.current) {
      p.pos.set(
        x + (Math.random() - 0.5) * 0.3,
        y + 0.05,
        z + (Math.random() - 0.5) * 0.3,
      );
      p.vel.set(
        (Math.random() - 0.5) * 2.5,
        1.0 + Math.random() * 1.5,
        (Math.random() - 0.5) * 2.5,
      );
      p.life = 0.4;
      p.maxLife = 0.4;
      p.scale = 0.8 + Math.random() * 0.8;
    }
  };

  useEffect(() => {
    ballStateRef.current = ballState;
    if (ballState === "bowled") {
      replayPositionsRef.current = [];
      swingAppliedRef.current = false;
      wideHandledRef.current = false;
      stumpingHandledRef.current = false;
      midSwingAppliedRef.current = false;
      bounceHandledRef.current = false;
      trailPoints.current = [];
    }
    if (ballState === "idle") {
      trailPoints.current = [];
    }
  }, [ballState]);

  const [ref, api] = useSphere<THREE.Mesh>(() => ({
    mass: 0.15,
    position: [0, 1.5, -7] as [number, number, number],
    args: [0.15],
    linearDamping: 0.28,
    angularDamping: 0.35,
    material: { friction: 0.4, restitution: 0.65 },
  }));

  const combinedRef = (node: THREE.Mesh | null) => {
    (ref as React.MutableRefObject<THREE.Mesh | null>).current = node;
    meshRef.current = node;
  };

  useEffect(() => {
    const unsub = api.position.subscribe((pos) => {
      const p = pos as [number, number, number];
      posRef.current = p;
      ballPositionRef.current = p;
    });
    return unsub;
  }, [api]);

  useEffect(() => {
    if (ballState === "idle") {
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      wicketHandledRef.current = false;
      boundaryHandledRef.current = false;
      wideHandledRef.current = false;
      stumpingHandledRef.current = false;
      midSwingAppliedRef.current = false;
      bounceHandledRef.current = false;
      replayActiveRef.current = false;
      api.position.set(0, 1.5, -7);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    } else if (ballState === "bowled") {
      wicketHandledRef.current = false;
      boundaryHandledRef.current = false;
      wideHandledRef.current = false;
      stumpingHandledRef.current = false;
      midSwingAppliedRef.current = false;
      bounceHandledRef.current = false;
      replayPositionsRef.current = [];
      api.position.set(0, 1.9, -7);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);

      const throwTimer = setTimeout(() => {
        const store = useGameStore.getState();
        const variant = bowlingVariantRef.current;
        const randomX = (Math.random() - 0.5) * 0.7;
        const bowlingLength = store.bowlingLength;
        const bowlingSpeed = store.bowlingSpeed;
        const diff = store.difficulty;

        // Difficulty affects speed multiplier
        const diffMult = diff === "easy" ? 0.75 : diff === "hard" ? 1.2 : 1.0;
        const speedMult = (0.7 + (bowlingSpeed / 100) * 0.6) * diffMult;

        let vyBase = 2.8;
        let vzMult = 1.0;
        // Vary bounce height based on length
        if (bowlingLength === "full") {
          vyBase = 1.5;
          vzMult = 1.15;
        } else if (bowlingLength === "short") {
          vyBase = 5.0;
          vzMult = 0.9;
        } else if (variant === "yorker") {
          vyBase = 0.5;
          vzMult = 1.2;
        }

        // Seam movement: random horizontal drift on first bounce
        const seamDrift = (Math.random() - 0.5) * 0.4;

        if (variant === "swing_in") {
          api.velocity.set(0.8 + seamDrift, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(0, 2, 0);
        } else if (variant === "swing_out") {
          api.velocity.set(-0.8 + seamDrift, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(0, -2, 0);
        } else if (variant === "yorker") {
          api.velocity.set(randomX, 0.8, 13 * vzMult * speedMult);
        } else if (variant === "bouncer") {
          api.velocity.set(randomX + seamDrift, 6.5, 9 * vzMult * speedMult);
        } else if (variant === "offspin") {
          api.velocity.set(0.4 + seamDrift, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(3, 0, 0);
        } else if (variant === "legspin") {
          api.velocity.set(-0.4 + seamDrift, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(-3, 0, 0);
        } else {
          api.velocity.set(
            randomX + seamDrift,
            vyBase,
            10 * vzMult * speedMult,
          );
        }
      }, 450);

      deadTimerRef.current = setTimeout(() => {
        if (ballStateRef.current === "bowled" && !wicketHandledRef.current) {
          wicketHandledRef.current = true;
          stumpsFallenRef.current = true;
          useGameStore.getState().takeWicket();
          ballStateRef.current = "dead";
          setTimeout(() => {
            stumpsFallenRef.current = false;
            useGameStore.getState().resetBall();
          }, 2500);
        }
      }, 4500);

      return () => clearTimeout(throwTimer);
    } else if (ballState === "hit") {
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      deadTimerRef.current = setTimeout(() => {
        if (ballStateRef.current === "hit") {
          ballStateRef.current = "dead";
          useGameStore.getState().resetBall();
        }
      }, 6000);
    }

    return () => {
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
      }
    };
  }, [ballState, api]);

  useFrame((_, delta) => {
    const state = ballStateRef.current;
    const pos = posRef.current;

    // Seam spin: rotate ball mesh visually
    if (meshRef.current && (state === "bowled" || state === "hit")) {
      meshRef.current.rotation.x += delta * 15;
    }

    // Ball trail: update positions
    if (state === "bowled" || state === "hit") {
      trailUpdateCounter.current++;
      if (trailUpdateCounter.current % 2 === 0) {
        trailPoints.current.push(new THREE.Vector3(pos[0], pos[1], pos[2]));
        if (trailPoints.current.length > 12) {
          trailPoints.current.shift();
        }
      }
    } else {
      trailPoints.current = [];
    }

    // Bounce detection: spawn dust when ball hits pitch
    const ballY = pos[1];
    if (state === "bowled" && !bounceHandledRef.current) {
      if (prevBallY.current > ballY + 0.05 && ballY < 0.25 && ballY > 0) {
        // Ball just hit the ground
        bounceHandledRef.current = true;
        spawnDust(pos[0], pos[1], pos[2]);
        setTimeout(() => {
          bounceHandledRef.current = false;
        }, 600);
      }
    }
    prevBallY.current = ballY;

    if ((state === "hit" || state === "bowled") && !replayActiveRef.current) {
      if (replayPositionsRef.current.length < 300) {
        replayPositionsRef.current.push([pos[0], pos[1], pos[2]]);
      }
    }

    // Mid-flight swing impulse
    if (
      state === "bowled" &&
      !midSwingAppliedRef.current &&
      !swingAppliedRef.current &&
      pos[2] > -1 &&
      pos[2] < 1
    ) {
      const variant = bowlingVariantRef.current;
      if (variant === "swing_in") {
        api.applyImpulse([0.08, 0, 0], [0, 0, 0]);
        midSwingAppliedRef.current = true;
      } else if (variant === "swing_out") {
        api.applyImpulse([-0.08, 0, 0], [0, 0, 0]);
        midSwingAppliedRef.current = true;
      } else if (variant === "yorker") {
        api.applyImpulse([0, -0.05, 0], [0, 0, 0]);
        midSwingAppliedRef.current = true;
      } else {
        midSwingAppliedRef.current = true;
      }
    }

    if (
      swingRequestRef.current &&
      state === "bowled" &&
      !swingAppliedRef.current
    ) {
      swingRequestRef.current = false;
      swingAppliedRef.current = true;

      // LOFT SHOT: high arc for six, four, or out
      if (shotTypeRef.current === "loft") {
        ballStateRef.current = "hit";
        useGameStore.getState().swing();
        const direction = shotDirectionRef.current;
        const dirX =
          direction === "offside" ? 6 : direction === "legside" ? -6 : 0;
        api.velocity.set(
          dirX,
          18 + Math.random() * 4,
          -(14 + Math.random() * 4),
        );
        const roll = Math.random();
        if (roll < 0.7) {
          lastBallRunsRef.current = 6;
          useGameStore.getState().addRuns(6, "Lofted Six");
        } else if (roll < 0.9) {
          lastBallRunsRef.current = 4;
          useGameStore.getState().addRuns(4, "Lofted Boundary");
        } else {
          useGameStore.getState().takeWicket("Caught Out");
        }
        return;
      }

      const quality = timingQualityRef.current;

      if (quality === "miss") {
        stumpingHandledRef.current = false;
        return;
      }

      ballStateRef.current = "hit";
      useGameStore.getState().swing();

      const dist = Math.hypot(pos[0], pos[2] - 8);
      const direction = shotDirectionRef.current;
      const shotName = getShotName(direction);

      if (quality === "early") {
        const edgeX = 3.5 + Math.random() * 2;
        api.velocity.set(edgeX, 3 + Math.random(), -(5 + Math.random() * 3));
        lastBallRunsRef.current = 0;
        useGameStore.getState().addRuns(0, "Edge");
        return;
      }

      const isPerfect = quality === "perfect";
      const velMult = isPerfect ? 1.4 : 1.0;

      if (dist < 6) {
        if (direction === "legside") {
          api.velocity.set(
            (-8 - Math.random() * 4) * velMult,
            (7 + Math.random() * 3) * velMult,
            -(12 + Math.random() * 6) * velMult,
          );
        } else if (direction === "offside") {
          api.velocity.set(
            (8 + Math.random() * 4) * velMult,
            (7 + Math.random() * 3) * velMult,
            -(12 + Math.random() * 6) * velMult,
          );
        } else {
          api.velocity.set(
            (Math.random() - 0.5) * 2 * velMult,
            (9 + Math.random() * 3) * velMult,
            -(16 + Math.random() * 6) * velMult,
          );
        }

        let runs: number;
        const roll = Math.random();

        if (isPerfect) {
          runs =
            direction === "straight"
              ? roll < 0.55
                ? 6
                : 4
              : roll < 0.45
                ? 6
                : 4;
        } else if (direction === "straight") {
          runs = roll < 0.35 ? 6 : roll < 0.65 ? 4 : roll < 0.85 ? 2 : 1;
        } else {
          runs = roll < 0.25 ? 6 : roll < 0.55 ? 4 : roll < 0.75 ? 2 : 1;
        }

        lastBallRunsRef.current = runs;
        useGameStore.getState().addRuns(runs, shotName);
      } else {
        const edgeX = (Math.random() - 0.5) * 4;
        api.velocity.set(edgeX, 4, -8);
        lastBallRunsRef.current = 0;
        useGameStore.getState().addRuns(0, shotName);
      }
    }

    if (state === "hit" && !boundaryHandledRef.current) {
      if (Math.abs(pos[0]) > 43 || pos[2] < -43 || pos[2] > 43) {
        boundaryHandledRef.current = true;
        ballStateRef.current = "dead";
        if (deadTimerRef.current) {
          clearTimeout(deadTimerRef.current);
          deadTimerRef.current = null;
        }
        useGameStore.getState().resetBall();
      }
    }

    if (
      state === "bowled" &&
      !wideHandledRef.current &&
      !swingAppliedRef.current &&
      pos[2] > 9.5 &&
      Math.abs(pos[0]) > 2.5
    ) {
      wideHandledRef.current = true;
      wicketHandledRef.current = true;
      ballStateRef.current = "dead";
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      useGameStore.getState().setUmpireSignal("wide");
      useGameStore.getState().addRuns(1, "Wide");
      setTimeout(() => useGameStore.getState().resetBall(), 1800);
    }

    if (state === "bowled" && pos[2] > 9.5 && !wicketHandledRef.current) {
      wicketHandledRef.current = true;
      ballStateRef.current = "dead";
      stumpsFallenRef.current = true;
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      const wasStumping =
        swingAppliedRef.current && timingQualityRef.current === "miss";
      useGameStore.getState().takeWicket(wasStumping ? "STUMPED" : undefined);
      setTimeout(() => {
        stumpsFallenRef.current = false;
        useGameStore.getState().resetBall();
      }, 2500);
    }

    if ((state === "bowled" || state === "hit") && pos[1] < -4) {
      ballStateRef.current = "dead";
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      useGameStore.getState().resetBall();
    }
  });

  return (
    <group>
      {/* Cricket red ball with seam */}
      <mesh ref={combinedRef} castShadow>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshStandardMaterial color="#B22222" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Seam line */}
      <mesh>
        <torusGeometry args={[0.15, 0.012, 8, 24]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      {/* Ball trail */}
      {trailPoints.current.length >= 2 && (
        <BallTrail trailPoints={trailPoints} />
      )}
      {/* Dust particles */}
      <DustEffect particles={dustParticles} />
    </group>
  );
}

export default function PhysicsWorld() {
  return (
    <>
      <Ground />
      <Pitch />
      <CricketBall />
    </>
  );
}
