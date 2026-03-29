import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { ballPositionRef, fielderPositionsRef } from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

type CameraMode = "follow" | "stadium" | "fielder_zoom";

export default function CameraController() {
  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(0, 4, 16));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.2, 8));
  const currentLookAt = useRef(new THREE.Vector3(0, 1.2, 8));
  const cameraMode = useRef<CameraMode>("follow");
  const prevBallY = useRef(1.5);
  const stadiumHoldTimer = useRef(0);

  useFrame((_, delta) => {
    const state = useGameStore.getState().ballState;
    const replayActive = useGameStore.getState().replayActive;
    const bp = ballPositionRef.current;

    if (replayActive) {
      // Side-angle replay camera
      targetCamPos.current.set(18, 4, 2);
      targetLookAt.current.set(0, 1.5, 7);
      camera.position.lerp(targetCamPos.current, 0.06);
      currentLookAt.current.lerp(targetLookAt.current, 0.06);
      camera.lookAt(currentLookAt.current);
      cameraMode.current = "follow";
      return;
    }

    const ballY = bp[1];
    const ballFalling = ballY < prevBallY.current;
    prevBallY.current = ballY;

    // Decide camera mode based on ball state and position
    if (state === "hit") {
      if (ballY > 4 && cameraMode.current !== "fielder_zoom") {
        cameraMode.current = "stadium";
        stadiumHoldTimer.current = 0;
      } else if (ballY < 3 && ballFalling && cameraMode.current === "stadium") {
        // Transition to fielder zoom as ball descends
        stadiumHoldTimer.current += delta;
        if (stadiumHoldTimer.current > 0.4) {
          cameraMode.current = "fielder_zoom";
        }
      }
    } else {
      cameraMode.current = "follow";
    }

    switch (cameraMode.current) {
      case "stadium": {
        // High wide shot showing ball trajectory
        targetCamPos.current.set(bp[0] * 0.2, 55, bp[2] + 18);
        targetLookAt.current.set(bp[0] * 0.5, 0, bp[2]);
        // Widen FOV
        if ("fov" in camera) {
          const fovCam = camera as THREE.PerspectiveCamera;
          fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 80, 0.04);
          fovCam.updateProjectionMatrix();
        }
        camera.position.lerp(targetCamPos.current, 0.025);
        currentLookAt.current.lerp(targetLookAt.current, 0.035);
        camera.lookAt(currentLookAt.current);
        break;
      }

      case "fielder_zoom": {
        // Find nearest fielder to ball
        const positions = fielderPositionsRef.current;
        let nearestPos: [number, number, number] = [0, 0, 0];
        let nearestDist = Number.POSITIVE_INFINITY;
        for (const fPos of positions) {
          const d = Math.hypot(fPos[0] - bp[0], fPos[2] - bp[2]);
          if (d < nearestDist) {
            nearestDist = d;
            nearestPos = fPos;
          }
        }
        targetCamPos.current.set(
          nearestPos[0] * 0.6,
          nearestPos[1] + 6,
          nearestPos[2] + 8,
        );
        targetLookAt.current.set(
          nearestPos[0],
          nearestPos[1] + 0.5,
          nearestPos[2],
        );
        // Narrow FOV for zoom-in
        if ("fov" in camera) {
          const fovCam = camera as THREE.PerspectiveCamera;
          fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 48, 0.04);
          fovCam.updateProjectionMatrix();
        }
        camera.position.lerp(targetCamPos.current, 0.04);
        currentLookAt.current.lerp(targetLookAt.current, 0.05);
        camera.lookAt(currentLookAt.current);
        break;
      }

      default: {
        // follow mode
        if (state === "bowled") {
          targetCamPos.current.set(bp[0] * 0.3, 3.5 + bp[1] * 0.1, 14);
          targetLookAt.current.set(bp[0] * 0.5, bp[1] * 0.5, bp[2]);
        } else if (state === "hit") {
          targetCamPos.current.set(
            bp[0] * 0.4,
            Math.max(3, bp[1] + 5),
            bp[2] + 9,
          );
          targetLookAt.current.set(bp[0] * 0.6, Math.max(0, bp[1] - 1), bp[2]);
        } else {
          targetCamPos.current.set(0, 4, 16);
          targetLookAt.current.set(0, 1.2, 8);
        }
        // Restore default FOV
        if ("fov" in camera) {
          const fovCam = camera as THREE.PerspectiveCamera;
          fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 60, 0.04);
          fovCam.updateProjectionMatrix();
        }
        camera.position.lerp(targetCamPos.current, 0.04);
        currentLookAt.current.lerp(targetLookAt.current, 0.06);
        camera.lookAt(currentLookAt.current);
      }
    }
  });

  return null;
}
