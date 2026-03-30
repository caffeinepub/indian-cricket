import { Toaster } from "@/components/ui/sonner";
import { Physics } from "@react-three/cannon";
import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import * as THREE from "three";
import HUD from "./components/HUD";
import BallLengthMarkers from "./components/game/BallLengthMarkers";
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
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap } as never,
        }}
        shadows
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = isNight ? 0.8 : 1.25;
        }}
      >
        <Suspense fallback={null}>
          {/* Atmospheric fog for depth */}
          <fog attach="fog" args={["#b8d4e8", 80, 220]} />

          {!isNight && (
            <Sky sunPosition={[100, 25, 50]} turbidity={6} rayleigh={1} />
          )}

          {/* Rich sky/ground hemisphere for natural colour bounce */}
          <hemisphereLight
            args={["#87CEEB", "#4a7c2f", isNight ? 0.15 : 1.2]}
          />

          {/* Main sun — HDR-style high intensity for ACES tone mapping */}
          <directionalLight
            position={[15, 30, 10]}
            intensity={isNight ? 0.15 : 3.0}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={200}
            shadow-camera-left={-60}
            shadow-camera-right={60}
            shadow-camera-top={60}
            shadow-camera-bottom={-60}
            shadow-radius={6}
            shadow-bias={-0.0005}
          />

          {/* Warm fill light from opposite side (soft shadow fill) */}
          <directionalLight
            position={[-12, 18, -8]}
            intensity={isNight ? 0.05 : 0.5}
            color="#ffeedd"
          />

          {/* Cool ambient bounce from sky */}
          <directionalLight
            position={[0, 20, -20]}
            intensity={isNight ? 0.03 : 0.25}
            color="#cce8ff"
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
          <BallLengthMarkers />
          <Umpire />
        </Suspense>
      </Canvas>

      <HUD />
      <Toaster />
    </div>
  );
}
