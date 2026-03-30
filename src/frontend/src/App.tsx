import { Toaster } from "@/components/ui/sonner";
import { Physics } from "@react-three/cannon";
import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import HUD from "./components/HUD";
import Batsman from "./components/game/Batsman";
import Bowler from "./components/game/Bowler";
import CameraController from "./components/game/CameraController";
import Fielders from "./components/game/Fielders";
import PhysicsWorld from "./components/game/PhysicsWorld";
import Stadium from "./components/game/Stadium";
import Stumps from "./components/game/Stumps";
import Umpire from "./components/game/Umpire";
import { swingRequestRef, timingQualityRef } from "./refs/sharedRefs";
import { useGameStore } from "./store/gameStore";

export default function App() {
  const ballState = useGameStore((s) => s.ballState);
  const lightingMode = useGameStore((s) => s.lightingMode);
  const isNight = lightingMode === "night";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && ballState === "bowled") {
        e.preventDefault();
        timingQualityRef.current = null;
        swingRequestRef.current = true;
        useGameStore.getState().swing();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ballState]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        background: isNight ? "#020510" : "#0B2E4E",
      }}
    >
      <Canvas
        camera={{ position: [0, 4, 16], fov: 68, near: 0.1, far: 500 }}
        style={{ width: "100%", height: "100%" }}
        gl={{
          antialias: true,
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap } as never,
        }}
        shadows
      >
        <Suspense fallback={null}>
          {!isNight && (
            <Sky sunPosition={[100, 25, 50]} turbidity={6} rayleigh={1} />
          )}

          {/* Hemisphere light for natural daylight feel */}
          <hemisphereLight
            args={["#87CEEB", "#3a7d2a", isNight ? 0.15 : 0.8]}
          />

          {/* Main sun directional light */}
          <directionalLight
            position={[15, 30, 10]}
            intensity={isNight ? 0.15 : 1.6}
            castShadow
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-near={0.5}
            shadow-camera-far={200}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-radius={8}
          />

          {/* Fill light for softer shadows */}
          <directionalLight
            position={[-10, 15, -5]}
            intensity={isNight ? 0.05 : 0.35}
          />

          <CameraController />

          <Physics
            gravity={[0, -9.81, 0]}
            defaultContactMaterial={{ restitution: 0.5 }}
          >
            <PhysicsWorld />
          </Physics>

          <Stadium nightMode={isNight} />
          <Stumps stumpEnd="batsman" />
          <Stumps stumpEnd="bowler" />
          <Batsman />
          <Bowler />
          <Fielders />
          <Umpire />
        </Suspense>
      </Canvas>

      <HUD />
      <Toaster />
    </div>
  );
}
