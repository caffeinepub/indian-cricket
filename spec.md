# Indian Cricket - Professional Gameplay Refinements

## Current State
- 3D cricket game with batsman, bowler, stumps, stadium, physics world
- Batting: tap zones (legside/straight/offside) trigger shot animations; ball velocity set immediately on swingRequest
- Bowling: pacer/spinner type + variant selection panel; ball launched with preset velocities
- Camera: CameraController follows ball; cinematic replay after boundaries/wickets
- HUD: score overlay, shot name toast, replay overlay
- No timing meter, no bowling speed meter, no length selection, no fielder AI, no umpire model, no dynamic camera transitions

## Requested Changes (Diff)

### Add
1. **Batting Timing Meter** - Animated oscillating bar next to the batsman on screen. When ball is bowled and in flight, meter fills/depletes in a cycle. Player taps at peak = "Perfect Shot" (extra velocity multiplier). Too early/late = edge (ball deflects weakly to slip/fine leg) or miss (no contact, wicket logic).
2. **Bowling Length Selector** - Before each delivery, let bowler pick 'Full', 'Good', or 'Short' length. Full = yorker-style pitch, Good = mid-pitch, Short = bouncer-style. Affects ball physics on launch.
3. **Bowling Speed Meter** - Oscillating speed bar (fluctuates 60-150 kph range) visible during bowling phase. Player must tap "Bowl!" at highest point to unlock maximum pace. Speed multiplier applied to ball velocity.
4. **Fielder AI** - Place 6-8 fielder meshes around the outfield/infield. When ball is hit, nearest fielder runs toward ball position, plays a dive/lunge animation when close, then throws ball back (ball resets after throw animation). Add run-out logic: if batsman attempts run and fielder throws before batsman crosses crease, it's a run-out wicket. Add stumping logic: if ball passes batsman and wicketkeeper catches it quickly, stumping out.
5. **Umpire Model** - 3D umpire figure standing at square leg. After each delivery outcome, plays arm-signal animation: arms wide for 4, both arms up for 6, finger raised for Out, one arm extended for Wide.
6. **Dynamic Camera Transitions** - When ball is hit and airborne (y > 3), switch to a high wide "stadium" camera showing full trajectory. When ball descends near a fielder or boundary, zoom back to close-up of that position. Use smooth lerp transitions between camera modes.

### Modify
- `PhysicsWorld.tsx`: Integrate timing quality (perfect/early/late) from timing meter into ball velocity on hit. Edge shots go to slip region, misses don't apply swing.
- `CameraController.tsx`: Add stadium-view and fielder-zoom camera modes with lerp transitions.
- `HUD.tsx`: Add timing meter UI, speed meter UI, length selector buttons, umpire signal overlay.
- `gameStore.ts`: Add `timingQuality` state, `bowlingLength` state, `bowlingSpeed` state, fielder positions, umpire signal state.
- `App.tsx`: Add fielder components and umpire component to the 3D scene.

### Remove
- Nothing removed; features are additive.

## Implementation Plan
1. Update `gameStore.ts` with new state: timingQuality, bowlingLength, bowlingSpeed, umpireSignal, fielderStates
2. Add `sharedRefs` for timing meter value and speed meter value
3. Create `Fielders.tsx` - 6 fielder meshes with run/dive/throw AI logic using useFrame
4. Create `Umpire.tsx` - 3D umpire with arm signal animations triggered by game events
5. Update `HUD.tsx` - timing meter bar, speed meter bar, length selector (Full/Good/Short buttons)
6. Update `PhysicsWorld.tsx` - use timingQuality to modify hit velocity; use bowlingLength to adjust ball launch angle/speed
7. Update `CameraController.tsx` - stadium-view when ball y > 3, fielder-zoom when descending
8. Update `App.tsx` - add Fielders and Umpire to scene
