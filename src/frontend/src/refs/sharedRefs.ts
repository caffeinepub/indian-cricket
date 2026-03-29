// Module-level mutable refs for cross-component communication in the game loop.
// Using module-level refs (not React state) to avoid re-renders in hot useFrame paths.

/** Current ball world position [x, y, z] */
export const ballPositionRef: { current: [number, number, number] } = {
  current: [0, 1.5, -7],
};

/** Set to true when player triggers a swing; CricketBall reads and clears this */
export const swingRequestRef: { current: boolean } = { current: false };

/** Set to true when batsman-end stumps should show fall animation */
export const stumpsFallenRef: { current: boolean } = { current: false };

/** Set to true when bowler should animate throwing */
export const bowlerThrowRef: { current: boolean } = { current: false };

/** Current shot direction chosen by the player */
export const shotDirectionRef: { current: "offside" | "straight" | "legside" } =
  { current: "straight" };

/** Bowling type: pacer or spinner */
export const bowlingTypeRef: { current: "pacer" | "spinner" } = {
  current: "pacer",
};

/** Bowling variant e.g. swing_in, swing_out, yorker, bouncer, offspin, legspin */
export const bowlingVariantRef: { current: string } = { current: "swing_in" };

/** Recorded ball positions for replay playback */
export const replayPositionsRef: { current: Array<[number, number, number]> } =
  { current: [] };

/** True while slow-motion replay is active */
export const replayActiveRef: { current: boolean } = { current: false };

/** Timing quality set by player tap: null = legacy mode */
export const timingQualityRef: {
  current: "perfect" | "good" | "early" | "miss" | null;
} = { current: null };

/** True when a fielder has reached and caught/fielded the ball */
export const fielderCaughtRef: { current: boolean } = { current: false };

/** Fielder world positions — updated by Fielders component, read by CameraController */
export const fielderPositionsRef: {
  current: Array<[number, number, number]>;
} = {
  current: [
    [3.5, 0, 12], // slip
    [14, 0, 4], // point
    [-8, 0, -5], // mid-on
    [7, 0, -6], // mid-off
    [-12, 0, 13], // fine leg
    [12, 0, -2], // cover
    [-12, 0, 6], // square leg
  ],
};

/** Runs scored on the current ball delivery (for run-out logic) */
export const lastBallRunsRef: { current: number } = { current: 0 };
