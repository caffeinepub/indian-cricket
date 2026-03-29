import { Moon, Settings, Sun, Users, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import {
  bowlingTypeRef,
  bowlingVariantRef,
  shotDirectionRef,
  swingRequestRef,
  timingQualityRef,
} from "../refs/sharedRefs";
import { useGameStore } from "../store/gameStore";
import OnlineLobbyModal from "./OnlineLobbyModal";
import TeamEditorModal from "./TeamEditorModal";

type TimingQuality = "perfect" | "good" | "early" | "miss";

// Compute timing quality from oscillating meter value (0–1)
function getTimingQuality(meterValue: number): TimingQuality {
  if (meterValue >= 0.42 && meterValue <= 0.58) return "perfect";
  if (
    (meterValue >= 0.28 && meterValue < 0.42) ||
    (meterValue > 0.58 && meterValue <= 0.72)
  )
    return "good";
  if (
    (meterValue >= 0.12 && meterValue < 0.28) ||
    (meterValue > 0.72 && meterValue <= 0.88)
  )
    return "early";
  return "miss";
}

// Oscillating value 0–1 using Date.now(), period ~2s
function getMeterValue(): number {
  return (Math.sin((Date.now() / 1000) * Math.PI) + 1) / 2;
}

// Speed meter oscillates 0–1 with period ~1.8s (slightly different from timing)
function getSpeedMeterValue(): number {
  return (Math.sin((Date.now() / 900) * Math.PI) + 1) / 2;
}

// Map 0-1 speed value to kph
function speedToKph(v: number): number {
  return Math.round(60 + v * 90);
}

const TIMING_QUALITY_STYLES: Record<
  TimingQuality,
  { label: string; color: string; glow: string }
> = {
  perfect: {
    label: "PERFECT SHOT! ⚡",
    color: "#FFD700",
    glow: "rgba(255,215,0,0.7)",
  },
  good: { label: "Good Shot", color: "#4ade80", glow: "rgba(74,222,128,0.5)" },
  early: { label: "Edge!", color: "#fbbf24", glow: "rgba(251,191,36,0.5)" },
  miss: { label: "MISS!", color: "#f87171", glow: "rgba(248,113,113,0.6)" },
};

const UMPIRE_SIGNAL_STYLES: Record<
  string,
  { text: string; color: string; glow: string }
> = {
  four: {
    text: "FOUR!",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.7)",
  },
  six: {
    text: "SIX!",
    color: "#FFD700",
    glow: "rgba(255,215,0,0.8)",
  },
  out: {
    text: "OUT!",
    color: "#f87171",
    glow: "rgba(248,113,113,0.8)",
  },
  wide: {
    text: "WIDE!",
    color: "#c084fc",
    glow: "rgba(192,132,252,0.7)",
  },
};

export default function HUD() {
  const {
    runs,
    wickets,
    balls,
    overs,
    ballState,
    lastEvent,
    bowl,
    bowlingType,
    bowlingVariant,
    setBowlingType,
    setBowlingVariant,
    replayActive,
    replayEvent,
    teamName,
    opponentName,
    primaryColor,
    secondaryColor,
    multiplayerEnabled,
    currentInnings,
    currentBattingPlayer,
    innings1Score,
    innings2Score,
    inningsBreak,
    gameOver,
    maxOvers,
    startMultiplayer,
    startInnings2,
    resetMultiplayer,
    lightingMode,
    setLightingMode,
    onlineConnected,
    onlinePlayerRole,
    onlineRoomCode,
    setOnlineConnected,
    bowlingLength,
    setBowlingLength,
    setBowlingSpeed,
    umpireSignal,
  } = useGameStore();

  const { actor } = useActor();

  const [eventKey, setEventKey] = useState(0);
  const [lastShot, setLastShot] = useState("");
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);
  const [onlineLobbyOpen, setOnlineLobbyOpen] = useState(false);
  const [mpPanelOpen, setMpPanelOpen] = useState(false);
  const [mpOvers, setMpOvers] = useState(maxOvers);
  const [timingFlash, setTimingFlash] = useState<TimingQuality | null>(null);
  const [timingFlashKey, setTimingFlashKey] = useState(0);
  const [speedDisplay, setSpeedDisplay] = useState(90);
  const [speedLocked, setSpeedLocked] = useState(false);

  const prevRuns = useRef(runs);
  const prevWickets = useRef(wickets);
  const touchStartX = useRef<number | null>(null);
  const shotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timingFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speedRafRef = useRef<number | null>(null);
  const speedLockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const canBowl = ballState === "idle" && !inningsBreak && !gameOver;
  const canSwing = ballState === "bowled";

  const oversDisplay = `${overs}.${balls}`;
  const pc = primaryColor;
  const sc = secondaryColor;

  // Animate speed display when bowling phase
  useEffect(() => {
    if (canBowl && !speedLocked) {
      const tick = () => {
        const v = getSpeedMeterValue();
        setSpeedDisplay(speedToKph(v));
        speedRafRef.current = requestAnimationFrame(tick);
      };
      speedRafRef.current = requestAnimationFrame(tick);
      return () => {
        if (speedRafRef.current !== null)
          cancelAnimationFrame(speedRafRef.current);
      };
    }
    return () => {
      if (speedRafRef.current !== null)
        cancelAnimationFrame(speedRafRef.current);
    };
  }, [canBowl, speedLocked]);

  // Reset speed lock when bowl button fires
  useEffect(() => {
    if (ballState === "bowled" || ballState === "idle") {
      setSpeedLocked(false);
    }
  }, [ballState]);

  useEffect(() => {
    if (runs !== prevRuns.current || wickets !== prevWickets.current) {
      setEventKey((k) => k + 1);
      prevRuns.current = runs;
      prevWickets.current = wickets;
    }
  }, [runs, wickets]);

  // Online sync polling
  useEffect(() => {
    if (!onlineConnected || !onlineRoomCode || !actor) return;

    const interval = setInterval(async () => {
      try {
        if (onlinePlayerRole === "host") {
          const state = useGameStore.getState();
          await actor.updateRoomState(onlineRoomCode, {
            inningsBreak: state.inningsBreak,
            wickets1: BigInt(state.innings1Score.wickets),
            wickets2: BigInt(state.innings2Score.wickets),
            ballState: state.ballState,
            balls1: BigInt(state.innings1Score.balls),
            balls2: BigInt(state.innings2Score.balls),
            overs1: BigInt(state.innings1Score.overs),
            overs2: BigInt(state.innings2Score.overs),
            currentInnings: BigInt(state.currentInnings),
            gameOver: state.gameOver,
            lastEvent: state.lastEvent,
            runs1: BigInt(state.innings1Score.runs),
            runs2: BigInt(state.innings2Score.runs),
          });
        } else if (onlinePlayerRole === "guest") {
          const room = await actor.getRoom(onlineRoomCode);
          if (room) {
            const rs = room.state;
            useGameStore.setState({
              inningsBreak: rs.inningsBreak,
              gameOver: rs.gameOver,
              lastEvent: rs.lastEvent,
              currentInnings: Number(rs.currentInnings) as 1 | 2,
              innings1Score: {
                runs: Number(rs.runs1),
                wickets: Number(rs.wickets1),
                overs: Number(rs.overs1),
                balls: Number(rs.balls1),
              },
              innings2Score: {
                runs: Number(rs.runs2),
                wickets: Number(rs.wickets2),
                overs: Number(rs.overs2),
                balls: Number(rs.balls2),
              },
            });
          }
        }
      } catch {
        // silent retry
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [onlineConnected, onlineRoomCode, onlinePlayerRole, actor]);

  const lockSpeed = () => {
    if (speedLocked) return;
    const v = getSpeedMeterValue();
    const kph = speedToKph(v);
    setBowlingSpeed(Math.round(((kph - 60) / 90) * 100));
    setSpeedDisplay(kph);
    setSpeedLocked(true);
    if (speedLockedTimerRef.current) clearTimeout(speedLockedTimerRef.current);
  };

  const handleBowl = () => {
    if (!canBowl) return;
    lockSpeed();
    bowl();
  };

  const triggerShot = (direction: "offside" | "straight" | "legside") => {
    if (!canSwing) return;

    // Compute timing quality from oscillating meter
    const meterValue = getMeterValue();
    const quality = getTimingQuality(meterValue);

    // Set timing quality ref for PhysicsWorld to read
    timingQualityRef.current = quality;

    // Show timing flash
    setTimingFlash(quality);
    setTimingFlashKey((k) => k + 1);
    if (timingFlashTimer.current) clearTimeout(timingFlashTimer.current);
    timingFlashTimer.current = setTimeout(() => setTimingFlash(null), 1600);

    // Set shot direction
    shotDirectionRef.current = direction;
    useGameStore.getState().setShotDirection(direction);

    const shotNames: Record<string, string> = {
      offside: "Cover Drive",
      straight: "Straight Drive",
      legside: "Sweep Shot",
    };
    const name = shotNames[direction];
    setLastShot(name);
    if (shotTimerRef.current) clearTimeout(shotTimerRef.current);
    shotTimerRef.current = setTimeout(() => setLastShot(""), 2000);

    // Signal the swing
    swingRequestRef.current = true;

    // Only change ballState to 'hit' for non-miss shots
    // (miss keeps ballState as 'bowled' so ball continues to stumps)
    if (quality !== "miss") {
      useGameStore.getState().swing();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !canSwing) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 40) triggerShot("offside");
    else if (delta < -40) triggerShot("legside");
    else triggerShot("straight");
  };

  const handleBowlingTypeSelect = (type: "pacer" | "spinner") => {
    setBowlingType(type);
    bowlingTypeRef.current = type;
    const defaultVariant = type === "pacer" ? "swing_in" : "offspin";
    setBowlingVariant(defaultVariant);
    bowlingVariantRef.current = defaultVariant;
  };

  const handleVariantSelect = (variant: string) => {
    setBowlingVariant(variant);
    bowlingVariantRef.current = variant;
  };

  const pacerVariants = [
    { id: "swing_in", label: "Swing In" },
    { id: "swing_out", label: "Swing Out" },
    { id: "yorker", label: "Yorker" },
    { id: "bouncer", label: "Bouncer" },
  ];

  const spinnerVariants = [
    { id: "offspin", label: "Off-Spin" },
    { id: "legspin", label: "Leg-Spin" },
  ];

  const currentVariants =
    bowlingType === "pacer" ? pacerVariants : spinnerVariants;

  const bowlBtnLabel = multiplayerEnabled
    ? currentInnings === 1
      ? "Bowl (P1)"
      : "Bowl (P2)"
    : "Bowl!";

  const matchLabel = multiplayerEnabled
    ? `INNINGS ${currentInnings} · P${currentBattingPlayer} BATS`
    : "DAY 3 — SESSION 2";

  const p1Innings = innings2Score;
  const p2Innings = innings1Score;
  let winnerText = "";
  if (gameOver) {
    if (innings2Score.runs > innings1Score.runs)
      winnerText = "🏆 Player 1 WINS!";
    else if (innings1Score.runs > innings2Score.runs)
      winnerText = "🏆 Player 2 WINS!";
    else winnerText = "🤝 It's a TIE!";
  }

  // Speed fill percentage (0-100)
  const speedFill = ((speedDisplay - 60) / 90) * 100;
  const speedColor =
    speedFill > 80 ? "#f87171" : speedFill > 55 ? "#fbbf24" : "#4ade80";

  return (
    <div
      style={{ pointerEvents: "none" }}
      className="fixed inset-0 flex flex-col justify-between"
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2"
        style={{
          background: "rgba(11,46,78,0.88)",
          borderBottom: `1px solid ${pc}55`,
          pointerEvents: "auto",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-1 flex-col overflow-hidden rounded-full">
            <div className="flex-1" style={{ background: "#FF9933" }} />
            <div className="flex-1 bg-white" />
            <div className="flex-1" style={{ background: sc }} />
          </div>
          <span
            className="font-display text-sm font-bold tracking-widest uppercase"
            style={{ color: pc }}
          >
            {teamName} vs {opponentName}
          </span>
          <span className="font-body text-xs text-white/50">• TEST MATCH</span>
        </div>
        <div className="flex items-center gap-2">
          {onlineConnected && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{
                background: "rgba(0,200,80,0.15)",
                border: "1px solid rgba(0,200,80,0.35)",
              }}
              data-ocid="game.panel"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-body text-xs text-green-400 uppercase tracking-wider">
                ONLINE · {onlinePlayerRole === "host" ? "HOST" : "GUEST"}
              </span>
              <button
                type="button"
                onClick={() => setOnlineConnected(false)}
                className="text-white/30 hover:text-white/60 transition-colors text-xs ml-1"
                title="Disconnect"
              >
                ✕
              </button>
            </div>
          )}
          <div
            className="font-body text-xs font-medium tracking-wider uppercase"
            style={{ color: pc }}
          >
            {matchLabel}
          </div>
          <button
            type="button"
            data-ocid="game.toggle"
            onClick={() =>
              setLightingMode(lightingMode === "day" ? "night" : "day")
            }
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110"
            style={{
              background:
                lightingMode === "night"
                  ? "rgba(30,10,80,0.7)"
                  : "rgba(255,200,50,0.15)",
              border: `1px solid ${
                lightingMode === "night"
                  ? "rgba(120,80,255,0.5)"
                  : "rgba(255,200,50,0.45)"
              }`,
              color: lightingMode === "night" ? "#a78bfa" : "#fbbf24",
              cursor: "pointer",
            }}
            title={lightingMode === "day" ? "Switch to Night" : "Switch to Day"}
          >
            {lightingMode === "day" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button
            type="button"
            data-ocid="team_editor.open_modal_button"
            onClick={() => setTeamEditorOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110"
            style={{
              background: `${pc}22`,
              border: `1px solid ${pc}44`,
              color: pc,
              cursor: "pointer",
            }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Event notification */}
      <div className="flex items-start justify-center pt-6">
        <AnimatePresence mode="popLayout">
          {lastEvent && (
            <motion.div
              key={eventKey}
              initial={{ opacity: 0, y: -24, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="font-display px-5 py-2 text-2xl font-extrabold tracking-wide rounded-full"
              style={{
                background: `${pc}2e`,
                border: `1.5px solid ${pc}8c`,
                color: pc,
                textShadow: `0 0 12px ${pc}b3`,
              }}
              data-ocid="game.toast"
            >
              {lastEvent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Umpire Signal Overlay */}
      <AnimatePresence>
        {umpireSignal !== "none" && UMPIRE_SIGNAL_STYLES[umpireSignal] && (
          <motion.div
            key={umpireSignal}
            initial={{ opacity: 0, scale: 0.6, y: -30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ zIndex: 55 }}
          >
            <div
              className="font-display text-5xl font-extrabold tracking-[0.2em] uppercase px-8 py-4 rounded-2xl"
              style={{
                color: UMPIRE_SIGNAL_STYLES[umpireSignal].color,
                textShadow: `0 0 32px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}, 0 0 64px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}`,
                background: "rgba(5,10,25,0.72)",
                border: `2px solid ${UMPIRE_SIGNAL_STYLES[umpireSignal].color}55`,
                boxShadow: `0 0 40px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}`,
              }}
              data-ocid="game.toast"
            >
              {UMPIRE_SIGNAL_STYLES[umpireSignal].text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shot name flash */}
      <AnimatePresence>
        {lastShot && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <div
              className="font-display px-6 py-3 text-xl font-bold tracking-widest uppercase rounded-lg"
              style={{
                background: "rgba(11,46,78,0.85)",
                border: `2px solid ${pc}b3`,
                color: "#fff",
                textShadow: `0 0 16px ${pc}e6`,
              }}
            >
              {lastShot}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timing Quality Flash */}
      <AnimatePresence>
        {timingFlash && (
          <motion.div
            key={timingFlashKey}
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -15 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              top: "45%",
              left: "50%",
              transform: "translateX(-50%) translateY(-50%)",
              zIndex: 45,
            }}
          >
            <div
              className="font-display text-2xl font-extrabold tracking-widest uppercase px-6 py-3 rounded-xl"
              style={{
                color: TIMING_QUALITY_STYLES[timingFlash].color,
                textShadow: `0 0 24px ${TIMING_QUALITY_STYLES[timingFlash].glow}`,
                background: "rgba(5,10,25,0.8)",
                border: `2px solid ${TIMING_QUALITY_STYLES[timingFlash].color}66`,
                boxShadow: `0 0 32px ${TIMING_QUALITY_STYLES[timingFlash].glow}`,
              }}
              data-ocid="game.toast"
            >
              {TIMING_QUALITY_STYLES[timingFlash].label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timing Meter - shown while ball is bowled */}
      <AnimatePresence>
        {canSwing && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="absolute pointer-events-none"
            style={{
              right: 20,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 35,
            }}
          >
            {/* Meter track */}
            <div
              className="relative rounded-full overflow-hidden"
              style={{
                width: 18,
                height: 180,
                background: "rgba(11,46,78,0.85)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              {/* Zone: red bottom */}
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{ height: "12%", background: "rgba(248,113,113,0.55)" }}
              />
              {/* Zone: orange-red lower */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: "12%",
                  height: "16%",
                  background: "rgba(251,191,36,0.45)",
                }}
              />
              {/* Zone: yellow good lower */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: "28%",
                  height: "14%",
                  background: "rgba(74,222,128,0.35)",
                }}
              />
              {/* Zone: green perfect centre */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: "42%",
                  height: "16%",
                  background: "rgba(74,222,128,0.65)",
                }}
              />
              {/* Zone: yellow good upper */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: "58%",
                  height: "14%",
                  background: "rgba(74,222,128,0.35)",
                }}
              />
              {/* Zone: orange-red upper */}
              <div
                className="absolute left-0 right-0"
                style={{
                  bottom: "72%",
                  height: "16%",
                  background: "rgba(251,191,36,0.45)",
                }}
              />
              {/* Zone: red top */}
              <div
                className="absolute top-0 left-0 right-0"
                style={{ height: "12%", background: "rgba(248,113,113,0.55)" }}
              />
              {/* Animated indicator */}
              <div
                className="absolute left-0.5 right-0.5 rounded-full"
                style={{
                  height: 12,
                  background: "#ffffff",
                  boxShadow: "0 0 8px #fff, 0 0 16px rgba(255,255,255,0.7)",
                  animation: "timingIndicator 2s ease-in-out infinite",
                }}
              />
            </div>
            {/* Label */}
            <div
              className="text-center mt-1 font-body text-xs uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}
            >
              TIMING
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shot zones */}
      <AnimatePresence>
        {canSwing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ pointerEvents: "auto", zIndex: 20 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex h-full w-full">
              <button
                type="button"
                data-ocid="game.secondary_button"
                className="flex flex-col items-center justify-end pb-32 transition-all duration-150"
                style={{
                  width: "35%",
                  background: "rgba(30,80,200,0.10)",
                  border: "none",
                  borderRight: "1px solid rgba(30,80,200,0.25)",
                  cursor: "pointer",
                }}
                onClick={() => triggerShot("legside")}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(30,80,200,0.22)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(30,80,200,0.10)";
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">↙</span>
                  <span
                    className="font-display text-sm font-bold tracking-widest uppercase"
                    style={{ color: "rgba(100,160,255,0.85)" }}
                  >
                    Leg Side
                  </span>
                  <span
                    className="font-body text-xs"
                    style={{ color: "rgba(100,160,255,0.5)" }}
                  >
                    Sweep
                  </span>
                </div>
              </button>
              <button
                type="button"
                data-ocid="game.primary_button"
                className="flex flex-col items-center justify-end pb-32 transition-all duration-150"
                style={{
                  width: "30%",
                  background: "rgba(255,255,255,0.05)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => triggerShot("straight")}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.05)";
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">↑</span>
                  <span
                    className="font-display text-sm font-bold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    Straight
                  </span>
                  <span
                    className="font-body text-xs"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Drive
                  </span>
                </div>
              </button>
              <button
                type="button"
                data-ocid="game.toggle"
                className="flex flex-col items-center justify-end pb-32 transition-all duration-150"
                style={{
                  width: "35%",
                  background: `${pc}14`,
                  border: "none",
                  borderLeft: `1px solid ${pc}40`,
                  cursor: "pointer",
                }}
                onClick={() => triggerShot("offside")}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${pc}2e`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${pc}14`;
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">↘</span>
                  <span
                    className="font-display text-sm font-bold tracking-widest uppercase"
                    style={{ color: `${pc}d9` }}
                  >
                    Off Side
                  </span>
                  <span
                    className="font-body text-xs"
                    style={{ color: `${pc}80` }}
                  >
                    Cover Drive
                  </span>
                </div>
              </button>
            </div>
            <div className="absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-none">
              <span
                className="font-body text-xs tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                TAP ZONE • TIME YOUR SHOT!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replay Overlay */}
      <AnimatePresence>
        {replayActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ background: "rgba(5,15,30,0.72)", zIndex: 50 }}
            data-ocid="game.modal"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{
                  duration: 1.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <span
                  className="font-display text-6xl font-extrabold tracking-[0.25em] uppercase"
                  style={{
                    color: pc,
                    textShadow: `0 0 40px ${pc}cc, 0 0 80px ${pc}66`,
                  }}
                >
                  REPLAY
                </span>
              </motion.div>
              <div
                className="font-display text-xl font-bold tracking-widest uppercase"
                style={{
                  color: "rgba(255,255,255,0.85)",
                  textShadow: "0 0 16px rgba(255,255,255,0.3)",
                }}
              >
                {replayEvent}
              </div>
              <div
                className="font-body text-xs tracking-widest uppercase mt-2"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                SLOW MOTION · SIDE ANGLE
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Innings Break Overlay */}
      <AnimatePresence>
        {inningsBreak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: "rgba(0,20,10,0.88)",
              zIndex: 60,
              pointerEvents: "auto",
            }}
            data-ocid="game.dialog"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, y: 20, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full mx-4"
              style={{
                background: "rgba(0,40,20,0.92)",
                border: "2px solid rgba(20,200,80,0.4)",
                boxShadow:
                  "0 8px 60px rgba(0,0,0,0.7), 0 0 40px rgba(20,200,80,0.15)",
              }}
            >
              <div className="text-center">
                <div
                  className="font-display text-3xl font-extrabold tracking-widest uppercase mb-1"
                  style={{
                    color: "#22c55e",
                    textShadow: "0 0 24px rgba(34,197,94,0.6)",
                  }}
                >
                  End of Innings 1
                </div>
                <div className="font-body text-white/50 text-sm tracking-wider">
                  Player 2 batting complete
                </div>
              </div>
              <div
                className="rounded-xl px-6 py-4 w-full flex justify-around"
                style={{
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                <ScoreChip
                  label="RUNS"
                  value={String(innings1Score.runs)}
                  color="#22c55e"
                />
                <ScoreChip
                  label="WKTS"
                  value={`${innings1Score.wickets}/10`}
                  color="#22c55e"
                />
                <ScoreChip
                  label="OVERS"
                  value={`${innings1Score.overs}.${innings1Score.balls}`}
                  color="#22c55e"
                />
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🏏</div>
                <div
                  className="font-display text-lg font-bold tracking-wide"
                  style={{ color: "#fff" }}
                >
                  Player 1 — it's your turn to BAT!
                </div>
                <div className="font-body text-white/40 text-sm mt-1">
                  Target: {innings1Score.runs + 1} runs
                </div>
              </div>
              <button
                type="button"
                data-ocid="game.confirm_button"
                onClick={startInnings2}
                className="font-display font-bold uppercase tracking-wider px-8 py-3 rounded-xl text-sm transition-all duration-150 hover:scale-105"
                style={{
                  background: "#22c55e",
                  color: "#001a0a",
                  cursor: "pointer",
                  boxShadow: "0 0 24px rgba(34,197,94,0.4)",
                }}
              >
                Start Innings 2 →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              background: "rgba(10,5,0,0.90)",
              zIndex: 60,
              pointerEvents: "auto",
            }}
            data-ocid="game.dialog"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl max-w-sm w-full mx-4"
              style={{
                background: "rgba(30,15,0,0.95)",
                border: `2px solid ${pc}66`,
                boxShadow: `0 8px 60px rgba(0,0,0,0.8), 0 0 60px ${pc}33`,
              }}
            >
              <div className="text-center">
                <div
                  className="font-display text-4xl font-extrabold tracking-[0.2em] uppercase mb-2"
                  style={{ color: pc, textShadow: `0 0 30px ${pc}99` }}
                >
                  Match Over
                </div>
                <div
                  className="font-display text-xl font-bold tracking-wide"
                  style={{
                    color: "#FFD700",
                    textShadow: "0 0 16px rgba(255,215,0,0.6)",
                  }}
                >
                  {winnerText}
                </div>
              </div>
              <div className="w-full flex flex-col gap-3">
                <div
                  className="rounded-xl px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${pc}33`,
                  }}
                >
                  <div className="font-body text-xs text-white/40 uppercase tracking-widest mb-2">
                    Player 1 (Innings 2)
                  </div>
                  <div className="flex justify-around">
                    <ScoreChip
                      label="RUNS"
                      value={String(p1Innings.runs)}
                      color={pc}
                    />
                    <ScoreChip
                      label="WKTS"
                      value={`${p1Innings.wickets}/10`}
                      color={pc}
                    />
                    <ScoreChip
                      label="OVERS"
                      value={`${p1Innings.overs}.${p1Innings.balls}`}
                      color={pc}
                    />
                  </div>
                </div>
                <div
                  className="rounded-xl px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div className="font-body text-xs text-white/40 uppercase tracking-widest mb-2">
                    Player 2 (Innings 1)
                  </div>
                  <div className="flex justify-around">
                    <ScoreChip
                      label="RUNS"
                      value={String(p2Innings.runs)}
                      color="#aaa"
                    />
                    <ScoreChip
                      label="WKTS"
                      value={`${p2Innings.wickets}/10`}
                      color="#aaa"
                    />
                    <ScoreChip
                      label="OVERS"
                      value={`${p2Innings.overs}.${p2Innings.balls}`}
                      color="#aaa"
                    />
                  </div>
                </div>
              </div>
              <button
                type="button"
                data-ocid="game.primary_button"
                onClick={resetMultiplayer}
                className="font-display font-bold uppercase tracking-wider px-8 py-3 rounded-xl text-sm transition-all duration-150 hover:scale-105 w-full"
                style={{
                  background: pc,
                  color: "#0B2E4E",
                  cursor: "pointer",
                  boxShadow: `0 0 24px ${pc}66`,
                }}
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom HUD */}
      <div
        className="flex flex-col gap-2 p-4"
        style={{ pointerEvents: "auto", zIndex: 30, position: "relative" }}
      >
        {/* Multiplayer + Online toggles */}
        <AnimatePresence>
          {canBowl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
            >
              {!multiplayerEnabled ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      data-ocid="game.toggle"
                      onClick={() => setMpPanelOpen((v) => !v)}
                      className="self-start font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150"
                      style={{
                        background: mpPanelOpen
                          ? `${pc}33`
                          : "rgba(255,255,255,0.07)",
                        color: mpPanelOpen ? pc : "rgba(255,255,255,0.5)",
                        border: `1px solid ${
                          mpPanelOpen ? `${pc}66` : "rgba(255,255,255,0.15)"
                        }`,
                        cursor: "pointer",
                      }}
                    >
                      <Users size={11} className="inline mr-1" />
                      Multiplayer
                    </button>
                    <button
                      type="button"
                      data-ocid="game.secondary_button"
                      onClick={() => setOnlineLobbyOpen(true)}
                      className="self-start font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150"
                      style={{
                        background: onlineConnected
                          ? "rgba(0,200,80,0.15)"
                          : "rgba(255,255,255,0.07)",
                        color: onlineConnected
                          ? "#4ade80"
                          : "rgba(255,255,255,0.5)",
                        border: `1px solid ${
                          onlineConnected
                            ? "rgba(0,200,80,0.35)"
                            : "rgba(255,255,255,0.15)"
                        }`,
                        cursor: "pointer",
                      }}
                    >
                      <Wifi size={11} className="inline mr-1" />
                      {onlineConnected ? "Online ●" : "Online"}
                    </button>
                  </div>
                  <AnimatePresence>
                    {mpPanelOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="rounded-xl px-4 py-3 flex items-center gap-3"
                          style={{
                            background: "rgba(11,46,78,0.9)",
                            border: `1px solid ${pc}33`,
                          }}
                        >
                          <label
                            htmlFor="mp-overs"
                            className="font-body text-xs text-white/50 uppercase tracking-wider whitespace-nowrap"
                          >
                            Overs per Innings:
                          </label>
                          <input
                            id="mp-overs"
                            type="number"
                            min={1}
                            max={50}
                            value={mpOvers}
                            onChange={(e) =>
                              setMpOvers(
                                Math.max(
                                  1,
                                  Math.min(50, Number(e.target.value)),
                                ),
                              )
                            }
                            className="bg-white/10 border border-white/20 text-white rounded-md px-2 py-1 text-sm w-16 text-center"
                          />
                          <button
                            type="button"
                            data-ocid="game.primary_button"
                            onClick={() => {
                              startMultiplayer(mpOvers);
                              setMpPanelOpen(false);
                            }}
                            className="font-display font-bold uppercase tracking-wider px-4 py-1.5 rounded-lg text-xs transition-all duration-150 hover:scale-105"
                            style={{
                              background: pc,
                              color: "#0B2E4E",
                              cursor: "pointer",
                            }}
                          >
                            Start Match
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  type="button"
                  data-ocid="game.toggle"
                  onClick={resetMultiplayer}
                  className="self-start font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    background: "rgba(255,60,60,0.12)",
                    color: "rgba(255,120,120,0.8)",
                    border: "1px solid rgba(255,60,60,0.3)",
                    cursor: "pointer",
                  }}
                >
                  Exit Multiplayer
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bowling options panel */}
        <AnimatePresence>
          {canBowl && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{
                background: "rgba(11,46,78,0.9)",
                border: `1px solid ${pc}40`,
              }}
              data-ocid="game.panel"
            >
              {/* Bowler Type */}
              <div className="flex items-center gap-2">
                <span
                  className="font-body text-xs tracking-widest uppercase mr-1"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Bowler:
                </span>
                {(["pacer", "spinner"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    data-ocid={`game.${
                      type === "pacer" ? "primary_button" : "secondary_button"
                    }`}
                    onClick={() => handleBowlingTypeSelect(type)}
                    className="font-display text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md transition-all duration-150"
                    style={{
                      background: bowlingType === type ? pc : `${pc}1f`,
                      color: bowlingType === type ? "#0B2E4E" : `${pc}b3`,
                      border: `1px solid ${pc}66`,
                      cursor: "pointer",
                    }}
                  >
                    {type === "pacer" ? "⚡ Pacer" : "🌀 Spinner"}
                  </button>
                ))}
              </div>

              {/* Variant buttons */}
              <div className="flex flex-wrap gap-1.5">
                {currentVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => handleVariantSelect(v.id)}
                    className="font-body text-xs uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-150"
                    style={{
                      background:
                        bowlingVariant === v.id
                          ? `${pc}4d`
                          : "rgba(11,46,78,0.6)",
                      color:
                        bowlingVariant === v.id ? pc : "rgba(255,255,255,0.5)",
                      border: `1px solid ${
                        bowlingVariant === v.id
                          ? `${pc}99`
                          : "rgba(255,255,255,0.15)"
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Length selector */}
              <div className="flex items-center gap-2">
                <span
                  className="font-body text-xs tracking-widest uppercase mr-1"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Length:
                </span>
                {(["full", "good", "short"] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => setBowlingLength(len)}
                    className="font-body text-xs uppercase tracking-wider px-2.5 py-1 rounded transition-all duration-150"
                    style={{
                      background:
                        bowlingLength === len
                          ? "rgba(96,165,250,0.3)"
                          : "rgba(11,46,78,0.6)",
                      color:
                        bowlingLength === len
                          ? "#93c5fd"
                          : "rgba(255,255,255,0.5)",
                      border: `1px solid ${
                        bowlingLength === len
                          ? "rgba(96,165,250,0.6)"
                          : "rgba(255,255,255,0.15)"
                      }`,
                      cursor: "pointer",
                      fontWeight: bowlingLength === len ? 700 : 400,
                    }}
                  >
                    {len === "full"
                      ? "🟡 Full"
                      : len === "good"
                        ? "🟢 Good"
                        : "🔴 Short"}
                  </button>
                ))}
              </div>

              {/* Speed meter row */}
              <div className="flex items-center gap-3">
                <span
                  className="font-body text-xs tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Speed:
                </span>
                {/* Speed bar */}
                <div
                  className="relative flex-1 rounded-full overflow-hidden"
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full transition-none"
                    style={{
                      width: `${speedFill}%`,
                      background: speedColor,
                      boxShadow: `0 0 6px ${speedColor}`,
                      animation: speedLocked
                        ? "none"
                        : "speedOscillate 1.8s ease-in-out infinite",
                      transition: speedLocked ? "width 0.1s" : "none",
                    }}
                  />
                </div>
                {/* kph display */}
                <span
                  className="font-display text-sm font-bold tabular-nums"
                  style={{
                    color: speedLocked ? speedColor : "rgba(255,255,255,0.8)",
                    minWidth: 52,
                    textAlign: "right",
                  }}
                >
                  {speedDisplay} kph
                </span>
                {/* Lock button */}
                <button
                  type="button"
                  data-ocid="game.toggle"
                  onClick={lockSpeed}
                  disabled={speedLocked}
                  className="font-display text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all duration-100"
                  style={{
                    background: speedLocked
                      ? "rgba(255,255,255,0.08)"
                      : `${speedColor}33`,
                    color: speedLocked ? "rgba(255,255,255,0.3)" : speedColor,
                    border: `1px solid ${
                      speedLocked ? "rgba(255,255,255,0.12)" : `${speedColor}66`
                    }`,
                    cursor: speedLocked ? "not-allowed" : "pointer",
                  }}
                >
                  {speedLocked ? "✓ Locked" : "Lock!"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main scorecard + bowl button */}
        <div
          className="rounded-xl flex items-center gap-4 px-5 py-3"
          style={{
            background: "rgba(11,46,78,0.92)",
            border: `1.5px solid ${pc}66`,
            boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${pc}14`,
          }}
        >
          <div className="flex flex-1 items-center justify-around gap-2">
            <ScoreSegment
              label="RUNS"
              value={String(runs)}
              ocid="game.card"
              color={pc}
            />
            <Divider color={pc} />
            <ScoreSegment
              label="WKTS"
              value={`${wickets}/10`}
              ocid="game.row"
              color={pc}
            />
            <Divider color={pc} />
            <ScoreSegment
              label="OVERS"
              value={oversDisplay}
              ocid="game.section"
              color={pc}
            />
          </div>
          <button
            type="button"
            onClick={handleBowl}
            disabled={!canBowl}
            data-ocid="game.primary_button"
            className="font-display rounded-lg px-5 py-2 text-sm font-bold uppercase tracking-wider transition-all duration-150"
            style={{
              background: canBowl ? pc : `${pc}40`,
              color: canBowl ? "#0B2E4E" : `${pc}73`,
              cursor: canBowl ? "pointer" : "not-allowed",
              border: `1.5px solid ${pc}80`,
              minWidth: "80px",
              boxShadow: canBowl ? `0 0 16px ${pc}59` : "none",
            }}
          >
            {bowlBtnLabel}
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-center pb-1">
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noreferrer"
            className="font-body text-xs text-white/20 hover:text-white/40 transition-colors"
          >
            © {new Date().getFullYear()} Built with ❤️ using caffeine.ai
          </a>
        </div>
      </div>

      {/* Team Editor Modal */}
      <TeamEditorModal
        open={teamEditorOpen}
        onClose={() => setTeamEditorOpen(false)}
      />

      {/* Online Lobby Modal */}
      <OnlineLobbyModal
        open={onlineLobbyOpen}
        onClose={() => setOnlineLobbyOpen(false)}
      />
    </div>
  );
}

function ScoreSegment({
  label,
  value,
  ocid,
  color,
}: { label: string; value: string; ocid: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5" data-ocid={ocid}>
      <span
        className="font-body text-xs font-medium tracking-widest uppercase"
        style={{ color: `${color}a6` }}
      >
        {label}
      </span>
      <span
        className="font-display text-2xl font-extrabold leading-none"
        style={{ color: "#ffffff" }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider({ color }: { color: string }) {
  return <div className="h-10 w-px" style={{ background: `${color}40` }} />;
}

function ScoreChip({
  label,
  value,
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="font-body text-xs uppercase tracking-widest"
        style={{ color: `${color}99` }}
      >
        {label}
      </span>
      <span className="font-display text-xl font-extrabold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
