import { Moon, Settings, Sun, Users, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import {
  ballPositionRef,
  bowlingTypeRef,
  bowlingVariantRef,
  fielderPositionsRef,
  shotDirectionRef,
  shotTypeRef,
  swingRequestRef,
  timingQualityRef,
} from "../refs/sharedRefs";
import { type Difficulty, useGameStore } from "../store/gameStore";
import OnlineLobbyModal from "./OnlineLobbyModal";
import TeamEditorModal from "./TeamEditorModal";

type TimingQuality = "perfect" | "good" | "early" | "miss";

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

function getMeterValue(): number {
  return (Math.sin((Date.now() / 1000) * Math.PI) + 1) / 2;
}

function getSpeedMeterValue(): number {
  return (Math.sin((Date.now() / 900) * Math.PI) + 1) / 2;
}

function speedToKph(v: number): number {
  return Math.round(60 + v * 90);
}

const TIMING_QUALITY_STYLES: Record<
  TimingQuality,
  { label: string; color: string; glow: string }
> = {
  perfect: {
    label: "PERFECT! ⚡",
    color: "#FFD700",
    glow: "rgba(255,215,0,0.7)",
  },
  good: { label: "Good Shot", color: "#4ade80", glow: "rgba(74,222,128,0.5)" },
  early: { label: "Early!", color: "#fbbf24", glow: "rgba(251,191,36,0.5)" },
  miss: { label: "MISS!", color: "#f87171", glow: "rgba(248,113,113,0.6)" },
};

const UMPIRE_SIGNAL_STYLES: Record<
  string,
  { text: string; color: string; glow: string }
> = {
  four: { text: "FOUR!", color: "#60a5fa", glow: "rgba(96,165,250,0.7)" },
  six: { text: "SIX!", color: "#FFD700", glow: "rgba(255,215,0,0.8)" },
  out: { text: "OUT!", color: "#f87171", glow: "rgba(248,113,113,0.8)" },
  wide: { text: "WIDE!", color: "#c084fc", glow: "rgba(192,132,252,0.7)" },
};

const INDIA_SQUAD = [
  { name: "R. Sharma", role: "bat", jersey: 45 },
  { name: "S. Gill", role: "bat", jersey: 77 },
  { name: "V. Kohli", role: "bat", jersey: 18 },
  { name: "KL Rahul", role: "bat", jersey: 1 },
  { name: "H. Pandya", role: "all", jersey: 228 },
  { name: "R. Jadeja", role: "all", jersey: 8 },
  { name: "R. Ashwin", role: "bowl", jersey: 99 },
  { name: "J. Bumrah", role: "bowl", jersey: 93 },
  { name: "M. Shami", role: "bowl", jersey: 11 },
  { name: "M. Siraj", role: "bowl", jersey: 17 },
  { name: "K. Yadav", role: "bowl", jersey: 23 },
];
const AUS_SQUAD = [
  { name: "D. Warner", role: "bat", jersey: 31 },
  { name: "U. Khawaja", role: "bat", jersey: 7 },
  { name: "S. Smith", role: "bat", jersey: 49 },
  { name: "M. Labuschagne", role: "bat", jersey: 4 },
  { name: "T. Head", role: "bat", jersey: 62 },
  { name: "A. Carey", role: "bat", jersey: 36 },
  { name: "P. Cummins", role: "bowl", jersey: 30 },
  { name: "M. Starc", role: "bowl", jersey: 56 },
  { name: "J. Hazlewood", role: "bowl", jersey: 38 },
  { name: "N. Lyon", role: "bowl", jersey: 67 },
  { name: "C. Green", role: "all", jersey: 52 },
];

// FieldRadar: SVG minimap showing fielder positions
function FieldRadar({
  primaryColor,
}: {
  primaryColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 72;
    const CENTER = SIZE / 2;

    const worldToMap = (x: number, z: number) => ({
      mx: CENTER + (x / 50) * (CENTER - 6),
      my: CENTER + (z / 50) * (CENTER - 6),
    });

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Background circle
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, CENTER - 1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(4,12,28,0.92)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Outer boundary circle
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, CENTER - 5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 30-yard circle
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, (CENTER - 5) * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pitch (center rectangle)
      const pw = 7;
      const ph = 22;
      ctx.fillStyle = "rgba(210,180,100,0.35)";
      ctx.fillRect(CENTER - pw / 2, CENTER - ph / 2, pw, ph);
      ctx.strokeStyle = "rgba(255,220,120,0.4)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(CENTER - pw / 2, CENTER - ph / 2, pw, ph);

      // Crease lines
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(CENTER - pw / 2 - 1, CENTER + ph / 2 - 5);
      ctx.lineTo(CENTER + pw / 2 + 1, CENTER + ph / 2 - 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CENTER - pw / 2 - 1, CENTER - ph / 2 + 5);
      ctx.lineTo(CENTER + pw / 2 + 1, CENTER - ph / 2 + 5);
      ctx.stroke();

      // Fielders
      const fielders = fielderPositionsRef.current;
      for (const fp of fielders) {
        const { mx, my } = worldToMap(fp[0], fp[2]);
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#60a5fa";
        ctx.fill();
        ctx.strokeStyle = "rgba(96,165,250,0.6)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Ball
      const bp = ballPositionRef.current;
      const { mx: bx, my: by } = worldToMap(bp[0], bp[2]);
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#f87171";
      ctx.fill();
      ctx.strokeStyle = "rgba(248,113,113,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Batsman (center-bottom of pitch)
      ctx.beginPath();
      ctx.arc(CENTER, CENTER + ph / 2 - 5, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      // Bowler (center-top of pitch)
      ctx.beginPath();
      ctx.arc(CENTER, CENTER - ph / 2 + 3, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,215,0,0.6)";
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="font-body text-xs uppercase tracking-[0.2em]"
        style={{ color: "rgba(255,255,255,0.45)", fontSize: 9 }}
      >
        FIELD
      </div>
      <canvas
        ref={canvasRef}
        width={72}
        height={72}
        style={{
          borderRadius: "50%",
          border: `1px solid ${primaryColor}55`,
          boxShadow: `0 0 12px rgba(0,0,0,0.6), 0 0 8px ${primaryColor}22`,
        }}
      />
    </div>
  );
}

// Horizontal WCC3-style timing meter
function HorizontalTimingMeter() {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      const v = getMeterValue();
      if (indicatorRef.current) {
        indicatorRef.current.style.left = `calc(${v * 100}% - 5px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ pointerEvents: "none", width: 182 }}
    >
      <div
        className="font-body text-xs uppercase tracking-[0.25em]"
        style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}
      >
        TIMING
      </div>
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: 182,
          height: 14,
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* LATE left */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "12%",
            background: "rgba(248,113,113,0.7)",
          }}
        />
        {/* EARLY left */}
        <div
          style={{
            position: "absolute",
            left: "12%",
            top: 0,
            bottom: 0,
            width: "16%",
            background: "rgba(251,191,36,0.6)",
          }}
        />
        {/* GOOD left */}
        <div
          style={{
            position: "absolute",
            left: "28%",
            top: 0,
            bottom: 0,
            width: "14%",
            background: "rgba(74,222,128,0.45)",
          }}
        />
        {/* PERFECT center */}
        <div
          style={{
            position: "absolute",
            left: "42%",
            top: 0,
            bottom: 0,
            width: "16%",
            background: "rgba(74,222,128,0.85)",
            boxShadow: "0 0 8px rgba(74,222,128,0.6)",
          }}
        />
        {/* GOOD right */}
        <div
          style={{
            position: "absolute",
            left: "58%",
            top: 0,
            bottom: 0,
            width: "14%",
            background: "rgba(74,222,128,0.45)",
          }}
        />
        {/* EARLY right */}
        <div
          style={{
            position: "absolute",
            left: "72%",
            top: 0,
            bottom: 0,
            width: "16%",
            background: "rgba(251,191,36,0.6)",
          }}
        />
        {/* LATE right */}
        <div
          style={{
            position: "absolute",
            left: "88%",
            top: 0,
            bottom: 0,
            width: "12%",
            background: "rgba(248,113,113,0.7)",
          }}
        />
        {/* Moving indicator */}
        <div
          ref={indicatorRef}
          style={{
            position: "absolute",
            top: 1,
            bottom: 1,
            width: 10,
            borderRadius: 3,
            background: "#fff",
            boxShadow: "0 0 6px #fff, 0 0 12px rgba(255,255,255,0.8)",
            transition: "none",
          }}
        />
      </div>
      {/* Zone labels */}
      <div className="flex justify-between w-full" style={{ width: 182 }}>
        {(
          [
            { lbl: "LATE", color: "rgba(248,113,113,0.7)", bold: false },
            { lbl: "EARLY", color: "rgba(251,191,36,0.7)", bold: false },
            { lbl: "GOOD", color: "rgba(74,222,128,0.65)", bold: false },
            { lbl: "PERFECT", color: "#4ade80", bold: true },
            { lbl: "GOOD", color: "rgba(74,222,128,0.65)", bold: false },
            { lbl: "EARLY", color: "rgba(251,191,36,0.7)", bold: false },
            { lbl: "LATE", color: "rgba(248,113,113,0.7)", bold: false },
          ] as const
        ).map((z) => (
          <span
            key={z.lbl + z.color}
            style={{
              color: z.color,
              fontSize: 7,
              fontWeight: z.bold ? 700 : 400,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {z.lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

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
    footPosition,
    setFootPosition,
    shotType,
    setShotType,
    difficulty,
    setDifficulty,
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
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

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

  // Animate speed meter with rAF when bowling phase
  useEffect(() => {
    if (canBowl && !speedLocked) {
      const animate = () => {
        const v = getSpeedMeterValue();
        setSpeedDisplay(speedToKph(v));
        speedRafRef.current = requestAnimationFrame(animate);
      };
      speedRafRef.current = requestAnimationFrame(animate);
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
    shotTypeRef.current = shotType as "push" | "stroke" | "loft";

    // Leave = no shot played
    if (footPosition === "leave") {
      useGameStore.getState().addRuns(0, "Leave");
      useGameStore.getState().resetBall();
      return;
    }

    const meterValue = getMeterValue();
    let quality = getTimingQuality(meterValue);

    // Advance foot gives slightly better timing window
    if (footPosition === "advance" && quality === "early") quality = "good";

    timingQualityRef.current = quality;

    setTimingFlash(quality);
    setTimingFlashKey((k) => k + 1);
    if (timingFlashTimer.current) clearTimeout(timingFlashTimer.current);
    timingFlashTimer.current = setTimeout(() => setTimingFlash(null), 1600);

    shotDirectionRef.current = direction;
    useGameStore.getState().setShotDirection(direction);

    // Shot type affects naming
    const shotTypeNames: Record<string, Record<string, string>> = {
      push: { offside: "Push", straight: "Push Drive", legside: "Glance" },
      stroke: {
        offside: "Cover Drive",
        straight: "Straight Drive",
        legside: "Sweep Shot",
      },
      loft: {
        offside: "Lofted Cover",
        straight: "Lofted Drive",
        legside: "Lofted Sweep",
      },
    };
    const name = shotTypeNames[shotType]?.[direction] ?? "Drive";
    setLastShot(name);
    if (shotTimerRef.current) clearTimeout(shotTimerRef.current);
    shotTimerRef.current = setTimeout(() => setLastShot(""), 2000);

    swingRequestRef.current = true;

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
    : "T20 MATCH";

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

  const speedFill = ((speedDisplay - 60) / 90) * 100;
  const speedColor =
    speedFill > 80 ? "#f87171" : speedFill > 55 ? "#fbbf24" : "#4ade80";

  // Batting card stats
  const batsman1 = { name: INDIA_SQUAD[0].name };
  const batsman2 = { name: INDIA_SQUAD[1].name };
  const totalBalls = balls + overs * 6;
  const strikeRate =
    totalBalls > 0 ? ((runs / totalBalls) * 100).toFixed(0) : "0";
  const ausBowlers = AUS_SQUAD.filter(
    (p) => p.role === "bowl" || p.role === "all",
  );
  const bowler = {
    name: ausBowlers[overs % ausBowlers.length]?.name ?? "P. Cummins",
  };
  const economy = overs > 0 ? (runs / overs).toFixed(1) : "0.0";

  return (
    <div
      style={{ pointerEvents: "none" }}
      className="fixed inset-0 flex flex-col justify-between"
    >
      {/* ===== TOP ROW ===== */}
      <div className="flex items-start justify-between px-3 pt-3 gap-2">
        {/* TOP-LEFT: Fielding Radar */}
        <div
          className="rounded-xl p-2"
          style={{
            background: "rgba(4,12,28,0.60)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(6px)",
            pointerEvents: "none",
            minWidth: 90,
          }}
        >
          <FieldRadar primaryColor={pc} />
        </div>

        {/* TOP-CENTER: Broadcast Scoreboard */}
        <div
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
          style={{
            background: "rgba(4,12,28,0.60)",
            border: `1px solid ${pc}44`,
            backdropFilter: "blur(8px)",
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${pc}1a`,
            minWidth: 160,
          }}
        >
          {/* Team vs Team */}
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-0.5 flex-col overflow-hidden rounded-full">
              <div className="flex-1" style={{ background: "#FF9933" }} />
              <div className="flex-1 bg-white" />
              <div className="flex-1" style={{ background: sc }} />
            </div>
            <span
              className="font-display text-xs font-bold tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {teamName}
            </span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>
              vs
            </span>
            <span
              className="font-display text-xs font-bold tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {opponentName}
            </span>
          </div>
          {/* Score */}
          <div className="flex items-baseline gap-1">
            <span
              className="font-display font-extrabold leading-none"
              style={{ color: "#fff", fontSize: 16 }}
            >
              {runs}
            </span>
            <span
              className="font-display font-bold"
              style={{ color: `${pc}cc`, fontSize: 16 }}
            >
              /{wickets}
            </span>
          </div>
          {/* Overs + match label */}
          <div className="flex items-center gap-2">
            <span
              className="font-body text-xs"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              ({oversDisplay} ov)
            </span>
            {multiplayerEnabled && (
              <span
                className="font-body text-xs uppercase tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  background: `${pc}22`,
                  color: `${pc}cc`,
                  fontSize: 9,
                  border: `1px solid ${pc}44`,
                }}
              >
                {matchLabel}
              </span>
            )}
          </div>
          {/* Event flash */}
          <AnimatePresence mode="popLayout">
            {lastEvent && (
              <motion.div
                key={eventKey}
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="font-display text-sm font-extrabold tracking-wide"
                style={{ color: pc }}
                data-ocid="game.toast"
              >
                {lastEvent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TOP-RIGHT: Control buttons */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(4,12,28,0.60)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(6px)",
            pointerEvents: "auto",
          }}
        >
          {onlineConnected && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md mr-1"
              style={{
                background: "rgba(0,200,80,0.15)",
                border: "1px solid rgba(0,200,80,0.35)",
              }}
              data-ocid="game.panel"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-body text-xs text-green-400 uppercase tracking-wider">
                {onlinePlayerRole === "host" ? "HOST" : "GUEST"}
              </span>
              <button
                type="button"
                onClick={() => setOnlineConnected(false)}
                className="text-white/30 hover:text-white/60 transition-colors text-xs ml-1"
                style={{ cursor: "pointer" }}
                title="Disconnect"
              >
                ✕
              </button>
            </div>
          )}
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
          <button
            type="button"
            data-ocid="game.open_modal_button"
            onClick={() => setOnlineLobbyOpen(true)}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110"
            style={{
              background: onlineConnected
                ? "rgba(0,200,80,0.15)"
                : "rgba(255,255,255,0.07)",
              border: `1px solid ${
                onlineConnected
                  ? "rgba(0,200,80,0.4)"
                  : "rgba(255,255,255,0.15)"
              }`,
              color: onlineConnected ? "#4ade80" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
            }}
            title="Online Play"
          >
            <Wifi size={13} />
          </button>
          {/* DIFF button */}
          <div className="relative">
            <button
              type="button"
              data-ocid="game.toggle"
              onClick={() => setDifficultyOpen((v) => !v)}
              className="flex items-center justify-center h-7 px-2 rounded-lg transition-all duration-150 hover:scale-110"
              style={{
                background: difficultyOpen
                  ? `${pc}33`
                  : "rgba(255,255,255,0.07)",
                border: `1px solid ${difficultyOpen ? `${pc}66` : "rgba(255,255,255,0.15)"}`,
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                fontSize: 9,
                fontWeight: 700,
              }}
              title="Difficulty"
            >
              DIFF
            </button>
            {difficultyOpen && (
              <div
                className="absolute right-0 top-9 flex flex-col gap-1 p-2 rounded-xl"
                style={{
                  background: "rgba(4,12,28,0.97)",
                  border: `1px solid ${pc}44`,
                  backdropFilter: "blur(8px)",
                  zIndex: 60,
                  minWidth: 90,
                }}
              >
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => {
                      setDifficulty(d);
                      setDifficultyOpen(false);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all"
                    style={{
                      background: difficulty === d ? `${pc}33` : "transparent",
                      color: difficulty === d ? pc : "rgba(255,255,255,0.55)",
                      border: `1px solid ${difficulty === d ? `${pc}66` : "transparent"}`,
                      cursor: "pointer",
                    }}
                  >
                    {d === "easy"
                      ? "🟢 Easy"
                      : d === "medium"
                        ? "🟡 Medium"
                        : "🔴 Hard"}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* STATS button */}
          <button
            type="button"
            data-ocid="game.open_modal_button"
            onClick={() => setStatsOpen(true)}
            className="flex items-center justify-center h-7 px-2 rounded-lg transition-all duration-150 hover:scale-110"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 9,
              fontWeight: 700,
            }}
            title="Match Stats"
          >
            STATS
          </button>
        </div>
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
            className="absolute top-28 left-1/2 -translate-x-1/2 pointer-events-none"
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
              top: "40%",
              left: "50%",
              transform: "translateX(-50%) translateY(-50%)",
              zIndex: 45,
            }}
          >
            <div
              className="font-display text-3xl font-extrabold tracking-widest uppercase px-8 py-4 rounded-2xl"
              style={{
                color: TIMING_QUALITY_STYLES[timingFlash].color,
                textShadow: `0 0 24px ${TIMING_QUALITY_STYLES[timingFlash].glow}`,
                background: "rgba(5,10,25,0.85)",
                border: `2px solid ${TIMING_QUALITY_STYLES[timingFlash].color}66`,
                boxShadow: `0 0 40px ${TIMING_QUALITY_STYLES[timingFlash].glow}`,
              }}
              data-ocid="game.toast"
            >
              {TIMING_QUALITY_STYLES[timingFlash].label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal Timing Meter (WCC3-style) */}
      <AnimatePresence>
        {canSwing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="absolute pointer-events-none flex justify-center"
            style={{
              bottom: 220,
              left: 0,
              right: 0,
              zIndex: 35,
            }}
          >
            <div
              className="px-4 py-2 rounded-xl"
              style={{
                background: "rgba(4,12,28,0.8)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
              }}
            >
              <HorizontalTimingMeter />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batting phase shot zones - transparent overlay */}
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
                className="flex flex-col items-center justify-end pb-80 transition-all duration-150"
                style={{
                  width: "35%",
                  background: "rgba(30,80,200,0.06)",
                  border: "none",
                  borderRight: "1px solid rgba(30,80,200,0.15)",
                  cursor: "pointer",
                }}
                onClick={() => triggerShot("legside")}
              >
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-xl">↙</span>
                  <span
                    className="font-display text-xs font-bold tracking-widest uppercase"
                    style={{ color: "rgba(100,160,255,0.85)" }}
                  >
                    Leg Side
                  </span>
                </div>
              </button>
              <button
                type="button"
                data-ocid="game.primary_button"
                className="flex flex-col items-center justify-end pb-80 transition-all duration-150"
                style={{
                  width: "30%",
                  background: "rgba(255,255,255,0.02)",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => triggerShot("straight")}
              >
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-xl">↑</span>
                  <span
                    className="font-display text-xs font-bold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    Straight
                  </span>
                </div>
              </button>
              <button
                type="button"
                data-ocid="game.toggle"
                className="flex flex-col items-center justify-end pb-80 transition-all duration-150"
                style={{
                  width: "35%",
                  background: `${pc}08`,
                  border: "none",
                  borderLeft: `1px solid ${pc}20`,
                  cursor: "pointer",
                }}
                onClick={() => triggerShot("offside")}
              >
                <div className="flex flex-col items-center gap-1 opacity-40">
                  <span className="text-xl">↘</span>
                  <span
                    className="font-display text-xs font-bold tracking-widest uppercase"
                    style={{ color: `${pc}cc` }}
                  >
                    Off Side
                  </span>
                </div>
              </button>
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

      {/* ===== BOTTOM HUD ===== */}
      <div
        className="flex flex-col gap-2 p-3"
        style={{ pointerEvents: "auto", zIndex: 30, position: "relative" }}
      >
        {/* Batting & Bowling Cards Row */}
        <div className="flex gap-2" style={{ justifyContent: "space-between" }}>
          {/* BATTING CARD */}
          <div
            className="rounded-xl px-2 py-1.5"
            style={{
              background: "rgba(4,12,28,0.60)",
              border: `1px solid ${pc}33`,
              backdropFilter: "blur(8px)",
              maxWidth: 140,
            }}
          >
            <div
              className="font-display text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: pc }}
            >
              🏏 BATTING
            </div>
            <div className="flex flex-col gap-0.5">
              <BatRow
                name={batsman1.name}
                runs={runs}
                balls={totalBalls}
                sr={strikeRate}
                active
                pc={pc}
              />
              <BatRow
                name={batsman2.name}
                runs={12}
                balls={14}
                sr="85"
                active={false}
                pc={pc}
              />
            </div>
          </div>

          {/* BOWLING CARD */}
          <div
            className="rounded-xl px-2 py-1.5"
            style={{
              background: "rgba(4,12,28,0.60)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              maxWidth: 140,
            }}
          >
            <div
              className="font-display text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "#60a5fa" }}
            >
              ⚽ BOWLING
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span
                  className="font-display font-bold"
                  style={{ color: "rgba(255,255,255,0.85)", fontSize: 9 }}
                >
                  {bowler.name}
                </span>
                <span
                  className="font-body text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(96,165,250,0.15)",
                    color: "#60a5fa",
                    fontSize: 9,
                  }}
                >
                  {bowlingType === "pacer" ? "⚡ PACE" : "🌀 SPIN"}
                </span>
              </div>
              <div className="flex gap-3">
                <BowlStat label="OVR" value={oversDisplay} />
                <BowlStat label="ECO" value={economy} />
                <BowlStat
                  label="TYPE"
                  value={bowlingVariant.replace("_", " ").toUpperCase()}
                />
              </div>
              {/* Speed display */}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="font-body text-xs"
                  style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}
                >
                  SPEED
                </span>
                <div
                  className="relative flex-1 rounded-full overflow-hidden"
                  style={{
                    height: 6,
                    background: "rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full"
                    style={{
                      width: `${speedFill}%`,
                      background: speedColor,
                      transition: speedLocked ? "width 0.1s" : "none",
                    }}
                  />
                </div>
                <span
                  className="font-display text-xs font-bold tabular-nums"
                  style={{
                    color: speedColor,
                    minWidth: 42,
                    textAlign: "right",
                  }}
                >
                  {speedDisplay} kph
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Multiplayer toggle */}
        <AnimatePresence>
          {canBowl && !multiplayerEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="rounded-xl px-3 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(4,12,28,0.75)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <button
                  type="button"
                  data-ocid="game.toggle"
                  onClick={() => setMpPanelOpen(!mpPanelOpen)}
                  className="font-display text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150"
                  style={{
                    background: mpPanelOpen
                      ? `${pc}33`
                      : "rgba(255,255,255,0.08)",
                    color: mpPanelOpen ? pc : "rgba(255,255,255,0.55)",
                    border: `1px solid ${
                      mpPanelOpen ? `${pc}55` : "rgba(255,255,255,0.15)"
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <Users size={11} className="inline mr-1" />
                  Local Match
                </button>
                {mpPanelOpen && (
                  <div className="flex items-center gap-2">
                    <span
                      className="font-body text-xs"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Overs:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={mpOvers}
                      onChange={(e) => setMpOvers(Number(e.target.value))}
                      className="font-display text-xs font-bold w-12 px-2 py-1 rounded text-center"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      data-ocid="game.primary_button"
                      onClick={() => {
                        startMultiplayer(mpOvers);
                        setMpPanelOpen(false);
                      }}
                      className="font-display font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg text-xs transition-all duration-150 hover:scale-105"
                      style={{
                        background: pc,
                        color: "#0B2E4E",
                        cursor: "pointer",
                      }}
                    >
                      Start Match
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {multiplayerEnabled && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                data-ocid="game.toggle"
                onClick={resetMultiplayer}
                className="font-body text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all duration-150"
                style={{
                  background: "rgba(255,60,60,0.12)",
                  color: "rgba(255,120,120,0.8)",
                  border: "1px solid rgba(255,60,60,0.3)",
                  cursor: "pointer",
                }}
              >
                Exit Multiplayer
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOWLING PHASE CONTROLS */}
        <AnimatePresence>
          {canBowl && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl px-3 py-2 flex flex-col gap-2"
              style={{
                background: "rgba(4,12,28,0.75)",
                border: `1px solid ${pc}40`,
                backdropFilter: "blur(8px)",
              }}
              data-ocid="game.panel"
            >
              {/* Bowler Type */}
              <div className="flex items-center gap-2">
                <span
                  className="font-body text-xs tracking-widest uppercase mr-1"
                  style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}
                >
                  TYPE:
                </span>
                {(["pacer", "spinner"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    data-ocid={`game.${
                      type === "pacer" ? "primary_button" : "secondary_button"
                    }`}
                    onClick={() => handleBowlingTypeSelect(type)}
                    className="flex flex-col items-center justify-center transition-all duration-150"
                    style={{
                      width: 36,
                      height: 30,
                      borderRadius: 4,
                      padding: 0,
                      background:
                        bowlingType === type ? `${pc}44` : "rgba(0,0,0,0.5)",
                      color:
                        bowlingType === type ? pc : "rgba(255,255,255,0.65)",
                      border: `1px solid ${bowlingType === type ? `${pc}88` : "rgba(255,255,255,0.2)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 10, lineHeight: 1 }}>
                      {type === "pacer" ? "⚡" : "🌀"}
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 700 }}>
                      {type === "pacer" ? "PCE" : "SPN"}
                    </span>
                  </button>
                ))}
              </div>
              {/* Variant buttons */}
              <div className="flex flex-wrap gap-1">
                {currentVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => handleVariantSelect(v.id)}
                    className="flex flex-col items-center justify-center transition-all duration-150"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      padding: 0,
                      background:
                        bowlingVariant === v.id ? `${pc}44` : "rgba(0,0,0,0.5)",
                      color:
                        bowlingVariant === v.id ? pc : "rgba(255,255,255,0.65)",
                      border: `1px solid ${bowlingVariant === v.id ? `${pc}88` : "rgba(255,255,255,0.2)"}`,
                      cursor: "pointer",
                      fontSize: 8,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ fontSize: 9, lineHeight: 1 }}>
                      {v.id === "swing_in"
                        ? "SI"
                        : v.id === "swing_out"
                          ? "SO"
                          : v.id === "yorker"
                            ? "YK"
                            : v.id === "bouncer"
                              ? "BC"
                              : v.id === "offspin"
                                ? "OS"
                                : "LS"}
                    </span>
                    <span style={{ fontSize: 7 }}>{v.label.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
              {/* Length selector */}
              <div className="flex items-center gap-2">
                <span
                  className="font-body text-xs tracking-widest uppercase mr-1"
                  style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}
                >
                  LENGTH:
                </span>
                {(["full", "good", "short"] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => setBowlingLength(len)}
                    className="flex flex-col items-center justify-center transition-all duration-150"
                    style={{
                      width: 34,
                      height: 30,
                      borderRadius: 4,
                      padding: 0,
                      background:
                        bowlingLength === len
                          ? "rgba(96,165,250,0.3)"
                          : "rgba(0,0,0,0.5)",
                      color:
                        bowlingLength === len
                          ? "#93c5fd"
                          : "rgba(255,255,255,0.6)",
                      border: `1px solid ${bowlingLength === len ? "rgba(96,165,250,0.6)" : "rgba(255,255,255,0.2)"}`,
                      cursor: "pointer",
                      fontSize: 8,
                      fontWeight: bowlingLength === len ? 700 : 400,
                    }}
                  >
                    <span style={{ fontSize: 10, lineHeight: 1 }}>
                      {len === "full" ? "🟡" : len === "good" ? "🟢" : "🔴"}
                    </span>
                    <span style={{ fontSize: 8 }}>
                      {len === "full" ? "FUL" : len === "good" ? "GD" : "SHT"}
                    </span>
                  </button>
                ))}
              </div>
              {/* Speed meter */}
              <div className="flex items-center gap-3">
                <span
                  className="font-body text-xs tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}
                >
                  SPEED:
                </span>
                <div
                  className="relative flex-1 rounded-full overflow-hidden"
                  style={{
                    height: 10,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-full"
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
                <button
                  type="button"
                  data-ocid="game.toggle"
                  onClick={lockSpeed}
                  disabled={speedLocked}
                  className="font-display text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    background: speedLocked
                      ? "rgba(255,255,255,0.06)"
                      : `${speedColor}33`,
                    color: speedLocked ? "rgba(255,255,255,0.3)" : speedColor,
                    border: `1px solid ${
                      speedLocked ? "rgba(255,255,255,0.1)" : `${speedColor}66`
                    }`,
                    cursor: speedLocked ? "not-allowed" : "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {speedLocked ? "✓ Locked" : "Lock!"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BATTING PHASE CONTROLS */}
        <AnimatePresence>
          {canSwing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-2"
            >
              {/* Combined Foot + Shot Type row */}
              <div
                className="rounded-xl px-2 py-1.5"
                style={{
                  background: "rgba(4,12,28,0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex gap-1 items-center">
                  {(
                    [
                      { id: "front", label: "FF", icon: "🦶", type: "foot" },
                      { id: "back", label: "BF", icon: "↩", type: "foot" },
                      { id: "advance", label: "ADV", icon: "⏩", type: "foot" },
                      { id: "leave", label: "LV", icon: "⛔", type: "foot" },
                    ] as const
                  ).map((fp) => (
                    <button
                      key={fp.id}
                      type="button"
                      data-ocid="game.toggle"
                      onClick={() => setFootPosition(fp.id)}
                      className="flex flex-col items-center justify-center transition-all duration-150"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 4,
                        padding: 0,
                        background:
                          footPosition === fp.id
                            ? `${pc}44`
                            : "rgba(0,0,0,0.5)",
                        color:
                          footPosition === fp.id ? pc : "rgba(255,255,255,0.7)",
                        border: `1px solid ${footPosition === fp.id ? `${pc}88` : "rgba(255,255,255,0.25)"}`,
                        cursor: "pointer",
                        boxShadow:
                          footPosition === fp.id ? `0 0 8px ${pc}44` : "none",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 9, lineHeight: 1 }}>
                        {fp.icon}
                      </span>
                      <span
                        style={{ fontSize: 7, fontWeight: 700, marginTop: 1 }}
                      >
                        {fp.label}
                      </span>
                    </button>
                  ))}
                  <div
                    style={{
                      width: 1,
                      height: 24,
                      background: "rgba(255,255,255,0.15)",
                      margin: "0 2px",
                      flexShrink: 0,
                    }}
                  />
                  {(
                    [
                      { id: "push", label: "PSH", icon: "▶" },
                      { id: "stroke", label: "STR", icon: "🏏" },
                      { id: "loft", label: "LFT", icon: "🚀" },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      data-ocid="game.toggle"
                      onClick={() => {
                        setShotType(st.id);
                        shotTypeRef.current = st.id as
                          | "push"
                          | "stroke"
                          | "loft";
                      }}
                      className="flex flex-col items-center justify-center transition-all duration-150"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 4,
                        padding: 0,
                        background:
                          shotType === st.id ? `${pc}44` : "rgba(0,0,0,0.5)",
                        color:
                          shotType === st.id ? pc : "rgba(255,255,255,0.7)",
                        border: `1px solid ${shotType === st.id ? `${pc}88` : "rgba(255,255,255,0.25)"}`,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 9, lineHeight: 1 }}>
                        {st.icon}
                      </span>
                      <span
                        style={{ fontSize: 7, fontWeight: 700, marginTop: 1 }}
                      >
                        {st.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Shot Direction */}
              <div
                className="rounded-xl overflow-hidden flex"
                style={{ border: `1px solid ${pc}30` }}
              >
                {[
                  {
                    dir: "legside" as const,
                    label: "LEG SIDE",
                    arrow: "↙️",
                    bg: "rgba(30,80,200,0.12)",
                    hoverBg: "rgba(30,80,200,0.25)",
                    color: "rgba(100,160,255,0.9)",
                  },
                  {
                    dir: "straight" as const,
                    label: "STRAIGHT",
                    arrow: "⬆️",
                    bg: "rgba(255,255,255,0.07)",
                    hoverBg: "rgba(255,255,255,0.14)",
                    color: "rgba(255,255,255,0.9)",
                  },
                  {
                    dir: "offside" as const,
                    label: "OFF SIDE",
                    arrow: "↘️",
                    bg: `${pc}18`,
                    hoverBg: `${pc}30`,
                    color: `${pc}ee`,
                  },
                ].map((z, i) => (
                  <button
                    key={z.dir}
                    type="button"
                    data-ocid={`game.${
                      i === 1 ? "primary_button" : "secondary_button"
                    }`}
                    onClick={() => triggerShot(z.dir)}
                    className="flex-1 flex flex-col items-center py-1 transition-all duration-150"
                    style={{
                      background: z.bg,
                      border: "none",
                      borderLeft:
                        i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        z.hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = z.bg;
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{z.arrow}</span>
                    <span
                      className="font-display text-xs font-bold uppercase tracking-widest mt-0.5"
                      style={{ color: z.color }}
                    >
                      {z.label}
                    </span>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      TAP TO PLAY
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main scorecard + bowl button */}
        <div
          className="rounded-xl flex items-center gap-4 px-5 py-3"
          style={{
            background: "rgba(4,12,28,0.95)",
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
          {canBowl && (
            <button
              type="button"
              onClick={handleBowl}
              disabled={!canBowl}
              data-ocid="game.primary_button"
              className="font-display font-bold uppercase tracking-wider transition-all duration-150 hover:scale-105"
              style={{
                background: pc,
                color: "#0B2E4E",
                cursor: "pointer",
                border: `1.5px solid ${pc}80`,
                width: 52,
                height: 52,
                borderRadius: "50%",
                fontSize: 11,
                boxShadow: `0 0 16px ${pc}59`,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {bowlBtnLabel}
            </button>
          )}
          {canSwing && (
            <div
              className="font-body text-xs uppercase tracking-widest animate-pulse"
              style={{ color: `${pc}aa`, fontSize: 10 }}
            >
              TAP SHOT ↓
            </div>
          )}
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

      {/* Match Stats Modal */}
      {statsOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            pointerEvents: "auto",
          }}
          onClick={() => setStatsOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setStatsOpen(false)}
          data-ocid="stats.modal"
        >
          <div
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "rgba(4,12,28,0.97)",
              border: `1px solid ${pc}44`,
              maxWidth: 480,
              width: "95vw",
              maxHeight: "80vh",
              overflowY: "auto",
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span
                className="font-display text-base font-bold tracking-wider uppercase"
                style={{ color: pc }}
              >
                📊 Match Stats
              </span>
              <button
                type="button"
                data-ocid="stats.close_button"
                onClick={() => setStatsOpen(false)}
                className="text-white/40 hover:text-white/80 transition-colors text-lg"
                style={{
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                ✕
              </button>
            </div>
            {/* Batting stats */}
            <div>
              <div
                className="font-display text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                🏏 Batting — {teamName}
              </div>
              <table
                className="w-full text-xs"
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <th className="text-left py-1 pr-2">Player</th>
                    <th className="text-right py-1 px-2">R</th>
                    <th className="text-right py-1 px-2">B</th>
                    <th className="text-right py-1 px-2">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {INDIA_SQUAD.slice(0, 6).map((p, i) => {
                    const isStriker = i === 2;
                    const pRuns = isStriker
                      ? runs
                      : Math.floor(Math.random() * 30);
                    const pBalls = isStriker
                      ? balls + overs * 6
                      : Math.floor(pRuns * 1.2);
                    const sr =
                      pBalls > 0 ? ((pRuns / pBalls) * 100).toFixed(0) : "0";
                    return (
                      <tr
                        key={p.name}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          color: isStriker ? "#fff" : "rgba(255,255,255,0.55)",
                        }}
                        data-ocid={`stats.item.${i + 1}`}
                      >
                        <td className="py-1 pr-2 font-medium">
                          {p.name}{" "}
                          <span style={{ color: pc, fontSize: 9 }}>
                            #{p.jersey}
                          </span>
                        </td>
                        <td
                          className="text-right py-1 px-2 font-bold"
                          style={{ color: isStriker ? pc : undefined }}
                        >
                          {pRuns}
                        </td>
                        <td className="text-right py-1 px-2">{pBalls}</td>
                        <td className="text-right py-1 px-2">{sr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Bowling stats */}
            <div>
              <div
                className="font-display text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                ⚡ Bowling — {opponentName}
              </div>
              <table
                className="w-full text-xs"
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <th className="text-left py-1 pr-2">Bowler</th>
                    <th className="text-right py-1 px-2">O</th>
                    <th className="text-right py-1 px-2">M</th>
                    <th className="text-right py-1 px-2">R</th>
                    <th className="text-right py-1 px-2">W</th>
                  </tr>
                </thead>
                <tbody>
                  {AUS_SQUAD.filter(
                    (p) => p.role === "bowl" || p.role === "all",
                  ).map((p, i) => {
                    const isCurrentBowler = i === overs % 4;
                    const bOvers = isCurrentBowler
                      ? overs
                      : Math.floor(Math.random() * 3);
                    const bRuns = isCurrentBowler
                      ? runs
                      : Math.floor(bOvers * 8 + Math.random() * 10);
                    const bWickets = isCurrentBowler
                      ? wickets
                      : Math.floor(Math.random() * 2);
                    return (
                      <tr
                        key={p.name}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          color: isCurrentBowler
                            ? "#fff"
                            : "rgba(255,255,255,0.55)",
                        }}
                        data-ocid={`stats.item.${i + 1}`}
                      >
                        <td className="py-1 pr-2 font-medium">{p.name}</td>
                        <td className="text-right py-1 px-2">{bOvers}</td>
                        <td className="text-right py-1 px-2">0</td>
                        <td className="text-right py-1 px-2">{bRuns}</td>
                        <td
                          className="text-right py-1 px-2 font-bold"
                          style={{ color: bWickets > 0 ? pc : undefined }}
                        >
                          {bWickets}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

function BatRow({
  name,
  runs: r,
  balls: b,
  sr,
  active,
  pc,
}: {
  name: string;
  runs: number;
  balls: number;
  sr: string;
  active: boolean;
  pc: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        {active && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: pc,
              display: "inline-block",
            }}
          />
        )}
        <span
          className="font-display text-xs font-bold truncate"
          style={{
            color: active ? "#fff" : "rgba(255,255,255,0.45)",
            maxWidth: 90,
            fontSize: 9,
          }}
        >
          {name}
        </span>
      </div>
      <div className="flex gap-2">
        <BatStat label="R" value={String(r)} active={active} pc={pc} />
        <BatStat label="B" value={String(b)} active={active} pc={pc} />
        <BatStat label="SR" value={sr} active={active} pc={pc} />
      </div>
    </div>
  );
}

function BatStat({
  label,
  value,
  active,
  pc,
}: { label: string; value: string; active: boolean; pc: string }) {
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 22 }}>
      <span
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: 7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: active ? pc : "rgba(255,255,255,0.5)",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function BowlStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{ minWidth: 36 }}>
      <span
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: 7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        {value}
      </span>
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
