import { useBox, usePlane, useSphere } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import {
  ballPositionRef,
  bowlingVariantRef,
  lastBallRunsRef,
  replayActiveRef,
  replayPositionsRef,
  shotDirectionRef,
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

  useEffect(() => {
    ballStateRef.current = ballState;
    if (ballState === "bowled") {
      replayPositionsRef.current = [];
      swingAppliedRef.current = false;
      wideHandledRef.current = false;
      stumpingHandledRef.current = false;
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
      replayActiveRef.current = false;
      api.position.set(0, 1.5, -7);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    } else if (ballState === "bowled") {
      wicketHandledRef.current = false;
      boundaryHandledRef.current = false;
      wideHandledRef.current = false;
      stumpingHandledRef.current = false;
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

        // Speed multiplier: 0-100 maps to 0.7-1.3
        const speedMult = 0.7 + (bowlingSpeed / 100) * 0.6;

        // Length multipliers for vy and vz
        let vyBase = 2.8;
        let vzMult = 1.0;
        if (bowlingLength === "full") {
          vyBase = 1.5;
          vzMult = 1.15;
        } else if (bowlingLength === "short") {
          vyBase = 5.0;
          vzMult = 0.9;
        }

        if (variant === "swing_in") {
          api.velocity.set(0.8, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(0, 2, 0);
        } else if (variant === "swing_out") {
          api.velocity.set(-0.8, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(0, -2, 0);
        } else if (variant === "yorker") {
          api.velocity.set(randomX, 0.8, 13 * vzMult * speedMult);
        } else if (variant === "bouncer") {
          api.velocity.set(randomX, 5.5, 9 * vzMult * speedMult);
        } else if (variant === "offspin") {
          api.velocity.set(0.4, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(3, 0, 0);
        } else if (variant === "legspin") {
          api.velocity.set(-0.4, vyBase, 10 * vzMult * speedMult);
          api.angularVelocity.set(-3, 0, 0);
        } else {
          api.velocity.set(randomX, vyBase, 10 * vzMult * speedMult);
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

  useFrame(() => {
    const state = ballStateRef.current;
    const pos = posRef.current;

    // Record replay positions
    if ((state === "hit" || state === "bowled") && !replayActiveRef.current) {
      if (replayPositionsRef.current.length < 300) {
        replayPositionsRef.current.push([pos[0], pos[1], pos[2]]);
      }
    }

    // Process swing request
    if (
      swingRequestRef.current &&
      state === "bowled" &&
      !swingAppliedRef.current
    ) {
      swingRequestRef.current = false;
      swingAppliedRef.current = true;

      const quality = timingQualityRef.current;

      // MISS: player tapped too late/early – let ball continue to stumps
      if (quality === "miss") {
        // Don't apply any velocity, don't change ballState
        // The z > 9.5 check below will trigger STUMPED wicket
        stumpingHandledRef.current = false; // allow stumping detection
        return;
      }

      // For all other qualities, process the shot
      ballStateRef.current = "hit";
      useGameStore.getState().swing();

      const dist = Math.hypot(pos[0], pos[2] - 8);
      const direction = shotDirectionRef.current;
      const shotName = getShotName(direction);

      if (quality === "early") {
        // Edge to slip region
        const edgeX = 3.5 + Math.random() * 2;
        api.velocity.set(edgeX, 3 + Math.random(), -(5 + Math.random() * 3));
        lastBallRunsRef.current = 0;
        useGameStore.getState().addRuns(0, "Edge");
        return;
      }

      // perfect or good (or null legacy)
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
          // Perfect shot guarantees at least 4, often 6
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

    // Boundary detection
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

    // Wide ball detection: ball passes batsman wide without being hit
    if (
      state === "bowled" &&
      !wideHandledRef.current &&
      !swingAppliedRef.current &&
      pos[2] > 9.5 &&
      Math.abs(pos[0]) > 2.5
    ) {
      wideHandledRef.current = true;
      wicketHandledRef.current = true; // prevent wicket
      ballStateRef.current = "dead";
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      useGameStore.getState().setUmpireSignal("wide");
      useGameStore.getState().addRuns(1, "Wide");
      setTimeout(() => useGameStore.getState().resetBall(), 1800);
    }

    // Wicket: ball passes batsman crease
    if (state === "bowled" && pos[2] > 9.5 && !wicketHandledRef.current) {
      wicketHandledRef.current = true;
      ballStateRef.current = "dead";
      stumpsFallenRef.current = true;
      if (deadTimerRef.current) {
        clearTimeout(deadTimerRef.current);
        deadTimerRef.current = null;
      }
      // Detect if it was a stumping (player tapped but missed)
      const wasStumping =
        swingAppliedRef.current && timingQualityRef.current === "miss";
      useGameStore.getState().takeWicket(wasStumping ? "STUMPED" : undefined);
      setTimeout(() => {
        stumpsFallenRef.current = false;
        useGameStore.getState().resetBall();
      }, 2500);
    }

    // Ball fell out of world
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
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.15, 20, 20]} />
      <meshStandardMaterial color="#cc1100" roughness={0.35} metalness={0.15} />
    </mesh>
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
