import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
  ballPositionRef,
  fielderPositionsRef,
  shotDirectionRef,
  shotTypeRef,
} from "../../refs/sharedRefs";
import { useGameStore } from "../../store/gameStore";

type CameraMode = "follow" | "stadium" | "fielder_zoom" | "delivery" | "loft";

export default function CameraController() {
  const { camera } = useThree();
  const targetCamPos = useRef(new THREE.Vector3(3, 3.5, 14));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.8, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.8, 0));
  const cameraMode = useRef<CameraMode>("follow");
  const prevBallY = useRef(1.5);
  const stadiumHoldTimer = useRef(0);
  const prevBallState = useRef<string>("idle");
  const deliveryHoldTimer = useRef(0);

  useFrame((_, delta) => {
    const state = useGameStore.getState().ballState;
    const replayActive = useGameStore.getState().replayActive;
    const bp = ballPositionRef.current;
    const lerpSpeed = delta * 2.5;
    const isLoft = shotTypeRef.current === "loft";

    if (replayActive) {
      targetCamPos.current.set(18, 4, 2);
      targetLookAt.current.set(0, 1.5, 7);
      camera.position.lerp(targetCamPos.current, 0.06);
      currentLookAt.current.lerp(targetLookAt.current, 0.06);
      camera.lookAt(currentLookAt.current);
      cameraMode.current = "follow";
      prevBallState.current = state;
      return;
    }

    // Trigger delivery zoom
    if (state === "bowled" && prevBallState.current === "idle") {
      cameraMode.current = "delivery";
      deliveryHoldTimer.current = 0;
    }
    // Detect loft shot
    if (state === "hit" && prevBallState.current === "bowled" && isLoft) {
      cameraMode.current = "loft";
    }
    prevBallState.current = state;

    const ballY = bp[1];
    const ballFalling = ballY < prevBallY.current;
    prevBallY.current = ballY;

    // Camera mode transitions
    if (cameraMode.current === "delivery") {
      deliveryHoldTimer.current += delta;
      if (deliveryHoldTimer.current > 2.2) cameraMode.current = "follow";
    } else if (cameraMode.current === "loft") {
      // Stay in loft mode while ball is high in air
      if (state !== "hit" || ballY < 2) {
        cameraMode.current = "follow";
      }
    } else if (state === "hit") {
      if (!isLoft && ballY > 4 && cameraMode.current !== "fielder_zoom") {
        cameraMode.current = "stadium";
        stadiumHoldTimer.current = 0;
      } else if (ballY < 3 && ballFalling && cameraMode.current === "stadium") {
        stadiumHoldTimer.current += delta;
        if (stadiumHoldTimer.current > 0.4) cameraMode.current = "fielder_zoom";
      }
    } else if (state !== "bowled") {
      cameraMode.current = "follow";
    }

    switch (cameraMode.current) {
      case "delivery": {
        targetCamPos.current.set(0.3, 1.9, 11.5);
        targetLookAt.current.set(0, 1.2, -10);
        if ("fov" in camera) {
          const fovCam = camera as THREE.PerspectiveCamera;
          fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 55, 0.08);
          fovCam.updateProjectionMatrix();
        }
        camera.position.lerp(
          targetCamPos.current,
          Math.min(lerpSpeed * 0.5, 0.15),
        );
        currentLookAt.current.lerp(
          targetLookAt.current,
          Math.min(lerpSpeed * 0.5, 0.15),
        );
        camera.lookAt(currentLookAt.current);
        break;
      }

      case "loft": {
        // High-elevation arc camera tracking the airborne ball
        const shotDir = shotDirectionRef.current;
        const xOffset =
          shotDir === "offside" ? 5 : shotDir === "legside" ? -5 : 2;
        // Position camera wide and elevated to show the arc
        targetCamPos.current.set(
          bp[0] * 0.2 + xOffset,
          Math.max(8, bp[1] * 0.7 + 4),
          bp[2] + 12,
        );
        // Look at ball position + slight lead
        targetLookAt.current.set(bp[0] * 0.6, bp[1] * 0.8, bp[2] - 2);
        if ("fov" in camera) {
          const fovCam = camera as THREE.PerspectiveCamera;
          fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 50, 0.04);
          fovCam.updateProjectionMatrix();
        }
        camera.position.lerp(targetCamPos.current, 0.04);
        currentLookAt.current.lerp(targetLookAt.current, 0.06);
        camera.lookAt(currentLookAt.current);
        break;
      }

      case "stadium": {
        targetCamPos.current.set(bp[0] * 0.2, 55, bp[2] + 18);
        targetLookAt.current.set(bp[0] * 0.5, 0, bp[2]);
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
        if (state === "idle") {
          // Behind batsman, looking toward bowler end for proper ball view
          targetCamPos.current.set(0, 2.8, 13);
          targetLookAt.current.set(0, 1.5, -8);
          if ("fov" in camera) {
            const fovCam = camera as THREE.PerspectiveCamera;
            fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 60, 0.04);
            fovCam.updateProjectionMatrix();
          }
          camera.position.lerp(
            targetCamPos.current,
            Math.min(lerpSpeed * 0.08, 0.15),
          );
          currentLookAt.current.lerp(
            targetLookAt.current,
            Math.min(lerpSpeed * 0.1, 0.18),
          );
        } else if (state === "bowled") {
          // WCC-style: low behind batsman, fast tracking of ball
          targetCamPos.current.set(0, 1.8, 13);
          targetLookAt.current.set(bp[0] * 0.4, bp[1] * 0.5 + 0.5, bp[2]);
          if ("fov" in camera) {
            const fovCam = camera as THREE.PerspectiveCamera;
            // Narrow FOV slightly for TV broadcast feel during delivery
            fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 52, 0.08);
            fovCam.updateProjectionMatrix();
          }
          // Fast snap to position, very fast lookAt to track ball
          camera.position.lerp(
            targetCamPos.current,
            Math.min(lerpSpeed * 0.08, 0.15),
          );
          currentLookAt.current.lerp(targetLookAt.current, 0.12);
        } else if (state === "hit") {
          const shotDir = shotDirectionRef.current;
          const xOffset =
            shotDir === "offside" ? 4 : shotDir === "legside" ? -4 : 2;
          targetCamPos.current.set(
            bp[0] * 0.4 + xOffset,
            Math.max(4, bp[1] + 4),
            bp[2] + 9,
          );
          targetLookAt.current.set(bp[0] * 0.6, Math.max(0, bp[1] - 1), bp[2]);
          if ("fov" in camera) {
            const fovCam = camera as THREE.PerspectiveCamera;
            fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 60, 0.04);
            fovCam.updateProjectionMatrix();
          }
          camera.position.lerp(
            targetCamPos.current,
            Math.min(lerpSpeed * 0.14, 0.2),
          );
          currentLookAt.current.lerp(targetLookAt.current, 0.12);
        } else {
          targetCamPos.current.set(0, 2.8, 13);
          targetLookAt.current.set(0, 1.5, -8);
          if ("fov" in camera) {
            const fovCam = camera as THREE.PerspectiveCamera;
            fovCam.fov = THREE.MathUtils.lerp(fovCam.fov, 60, 0.04);
            fovCam.updateProjectionMatrix();
          }
          camera.position.lerp(
            targetCamPos.current,
            Math.min(lerpSpeed * 0.08, 0.15),
          );
          currentLookAt.current.lerp(
            targetLookAt.current,
            Math.min(lerpSpeed * 0.1, 0.18),
          );
        }
        camera.lookAt(currentLookAt.current);
      }
    }
  });

  return null;
}
