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
    color: "#F57C00",
    glow: "rgba(245,124,0,0.7)",
  },
  good: { label: "Good Shot", color: "#66BB6A", glow: "rgba(102,187,106,0.5)" },
  early: { label: "Early!", color: "#fbbf24", glow: "rgba(251,191,36,0.5)" },
  miss: { label: "MISS!", color: "#EF5350", glow: "rgba(239,83,80,0.6)" },
};

const UMPIRE_SIGNAL_STYLES: Record<
  string,
  { text: string; color: string; glow: string }
> = {
  four: { text: "FOUR!", color: "#00BCD4", glow: "rgba(0,188,212,0.7)" },
  six: { text: "SIX!", color: "#F57C00", glow: "rgba(245,124,0,0.8)" },
  out: { text: "OUT!", color: "#EF5350", glow: "rgba(239,83,80,0.8)" },
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

// ===== FIELD RADAR =====
function FieldRadar({ primaryColor: _primaryColor }: { primaryColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 110;
    const CENTER = SIZE / 2;

    const worldToMap = (x: number, z: number) => ({
      mx: CENTER + (x / 50) * (CENTER - 8),
      my: CENTER + (z / 50) * (CENTER - 8),
    });

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);

      // Background circle
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, CENTER - 1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,20,10,0.82)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,188,212,0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer boundary circle
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, CENTER - 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 30-yard circle
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, (CENTER - 6) * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 0.6;
      ctx.setLineDash([2, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pitch (center rectangle)
      const pw = 9;
      const ph = 28;
      ctx.fillStyle = "rgba(210,180,100,0.35)";
      ctx.fillRect(CENTER - pw / 2, CENTER - ph / 2, pw, ph);
      ctx.strokeStyle = "rgba(255,220,120,0.5)";
      ctx.lineWidth = 0.6;
      ctx.strokeRect(CENTER - pw / 2, CENTER - ph / 2, pw, ph);

      // Crease lines
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(CENTER - pw / 2 - 1, CENTER + ph / 2 - 6);
      ctx.lineTo(CENTER + pw / 2 + 1, CENTER + ph / 2 - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CENTER - pw / 2 - 1, CENTER - ph / 2 + 6);
      ctx.lineTo(CENTER + pw / 2 + 1, CENTER - ph / 2 + 6);
      ctx.stroke();

      // Fielders
      const fielders = fielderPositionsRef.current;
      for (const fp of fielders) {
        const { mx, my } = worldToMap(fp[0], fp[2]);
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#00BCD4";
        ctx.fill();
        ctx.strokeStyle = "rgba(0,188,212,0.7)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Ball
      const bp = ballPositionRef.current;
      const { mx: bx, my: by } = worldToMap(bp[0], bp[2]);
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#EF5350";
      ctx.fill();
      ctx.strokeStyle = "rgba(239,83,80,0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Batsman (gold)
      ctx.beginPath();
      ctx.arc(CENTER, CENTER + ph / 2 - 6, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#F57C00";
      ctx.fill();
      ctx.strokeStyle = "rgba(245,124,0,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bowler
      ctx.beginPath();
      ctx.arc(CENTER, CENTER - ph / 2 + 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,215,0,0.55)";
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
      className="flex flex-col items-center"
      style={{ pointerEvents: "none", gap: 6 }}
    >
      <canvas
        ref={canvasRef}
        width={110}
        height={110}
        style={{
          borderRadius: "50%",
          border: "1.5px solid rgba(0,188,212,0.45)",
          boxShadow: "0 0 16px rgba(0,188,212,0.2), 0 0 32px rgba(0,0,0,0.6)",
        }}
      />
      {/* MOVE BATSMAN section */}
      <div
        className="flex flex-col items-center gap-1"
        style={{ pointerEvents: "auto" }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
          }}
        >
          MOVE BATSMAN
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="game.secondary_button"
            style={{
              background: "rgba(0,188,212,0.12)",
              border: "1px solid rgba(0,188,212,0.4)",
              color: "#00BCD4",
              borderRadius: 4,
              width: 26,
              height: 20,
              cursor: "pointer",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            «
          </button>
          {/* Batsman silhouette icon */}
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "rgba(0,188,212,0.15)",
              border: "1px solid rgba(0,188,212,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}
          >
            🏏
          </div>
          <button
            type="button"
            data-ocid="game.secondary_button"
            style={{
              background: "rgba(0,188,212,0.12)",
              border: "1px solid rgba(0,188,212,0.4)",
              color: "#00BCD4",
              borderRadius: 4,
              width: 26,
              height: 20,
              cursor: "pointer",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== RC24 TIMING METER =====
function RC24TimingMeter() {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      const v = getMeterValue();
      if (indicatorRef.current) {
        indicatorRef.current.style.left = `calc(${v * 100}% - 7px)`;
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
      className="flex flex-col items-center"
      style={{ pointerEvents: "none", width: 200, gap: 2 }}
    >
      {/* Indicator arrow above bar */}
      <div
        style={{
          position: "relative",
          width: 200,
          height: 14,
          marginBottom: 0,
        }}
      >
        <div
          ref={indicatorRef}
          style={{
            position: "absolute",
            top: 2,
            left: "50%",
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "10px solid #ffffff",
            filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))",
            transition: "none",
          }}
        />
      </div>
      {/* Color bar */}
      <div
        style={{
          position: "relative",
          width: 200,
          height: 18,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* EARLY left - red */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "20%",
            background: "rgba(239,83,80,0.85)",
          }}
        />
        {/* GOOD left - yellow */}
        <div
          style={{
            position: "absolute",
            left: "20%",
            top: 0,
            bottom: 0,
            width: "15%",
            background: "rgba(251,191,36,0.8)",
          }}
        />
        {/* PERFECT center - orange/amber */}
        <div
          style={{
            position: "absolute",
            left: "35%",
            top: 0,
            bottom: 0,
            width: "30%",
            background: "rgba(245,124,0,0.95)",
            boxShadow: "0 0 10px rgba(245,124,0,0.7)",
          }}
        />
        {/* GOOD right - yellow */}
        <div
          style={{
            position: "absolute",
            left: "65%",
            top: 0,
            bottom: 0,
            width: "15%",
            background: "rgba(251,191,36,0.8)",
          }}
        />
        {/* LATE right - red */}
        <div
          style={{
            position: "absolute",
            left: "80%",
            top: 0,
            bottom: 0,
            width: "20%",
            background: "rgba(239,83,80,0.85)",
          }}
        />
      </div>
      {/* Zone labels */}
      <div
        style={{
          width: 200,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingLeft: 4,
          paddingRight: 4,
          marginTop: 2,
        }}
      >
        <span
          style={{
            color: "rgba(239,83,80,0.9)",
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          EARLY
        </span>
        <span
          style={{
            color: "rgba(245,124,0,1)",
            fontSize: 9,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          PERFECT
        </span>
        <span
          style={{
            color: "rgba(239,83,80,0.9)",
            fontSize: 8,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          LATE
        </span>
      </div>
    </div>
  );
}

// ===== D-PAD JOYSTICK =====
function DPadJoystick({
  onShot,
  enabled,
}: {
  onShot: (dir: "legside" | "straight" | "offside") => void;
  enabled: boolean;
}) {
  const SIZE = 140;
  const C = SIZE / 2;
  const INNER_R = 24;
  const ARROW_R = C - 18;

  const handleClick = (e: React.MouseEvent<SVGElement>) => {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - C;
    const y = e.clientY - rect.top - C;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < INNER_R) {
      onShot("straight");
      return;
    }
    const angle = Math.atan2(y, x) * (180 / Math.PI); // -180 to 180
    if (angle > 120 || angle < -120) {
      onShot("legside"); // left sector
    } else if (angle > -60 && angle < 60) {
      onShot("offside"); // right sector
    } else {
      onShot("straight"); // top/bottom
    }
  };

  const handleTouch = (e: React.TouchEvent<SVGElement>) => {
    if (!enabled) return;
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left - C;
    const y = touch.clientY - rect.top - C;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < INNER_R) {
      onShot("straight");
      return;
    }
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle > 120 || angle < -120) {
      onShot("legside");
    } else if (angle > -60 && angle < 60) {
      onShot("offside");
    } else {
      onShot("straight");
    }
  };

  // 8 directional arrow polygons
  const directions = Array.from({ length: 8 }, (_, i) => {
    const angleDeg = i * 45 - 90; // start from top (N)
    const angleRad = (angleDeg * Math.PI) / 180;
    const ax = C + Math.cos(angleRad) * ARROW_R;
    const ay = C + Math.sin(angleRad) * ARROW_R;
    const perpRad = angleRad + Math.PI / 2;
    const tipX = C + Math.cos(angleRad) * (ARROW_R + 10);
    const tipY = C + Math.sin(angleRad) * (ARROW_R + 10);
    const b1x = ax + Math.cos(perpRad) * 7;
    const b1y = ay + Math.sin(perpRad) * 7;
    const b2x = ax - Math.cos(perpRad) * 7;
    const b2y = ay - Math.sin(perpRad) * 7;
    // Color: left arrows = blue-ish, right = teal, top/bottom = white
    const deg = angleDeg < 0 ? angleDeg + 360 : angleDeg;
    let color = "rgba(255,255,255,0.55)";
    if (deg >= 157 && deg <= 270)
      color = "rgba(100,160,255,0.7)"; // left/legside
    else if (deg >= 0 && deg <= 112) color = "rgba(0,188,212,0.7)"; // right/offside
    return { tipX, tipY, b1x, b1y, b2x, b2y, color, deg };
  });

  return (
    <div
      style={{
        pointerEvents: enabled ? "auto" : "none",
        opacity: enabled ? 1 : 0.5,
      }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        role="img"
        aria-label="Shot direction pad: tap left for leg side, right for off side, center for straight"
        style={{ cursor: enabled ? "pointer" : "default", display: "block" }}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onShot("straight");
        }}
        onTouchEnd={handleTouch}
        tabIndex={enabled ? 0 : -1}
      >
        {/* Outer ring */}
        <circle
          cx={C}
          cy={C}
          r={C - 2}
          fill="rgba(0,30,15,0.80)"
          stroke="rgba(0,188,212,0.45)"
          strokeWidth={1.5}
        />
        {/* Inner glow ring */}
        <circle
          cx={C}
          cy={C}
          r={C - 8}
          fill="none"
          stroke="rgba(0,188,212,0.12)"
          strokeWidth={1}
        />
        {/* Directional arrows */}
        {directions.map((d) => (
          <polygon
            key={d.deg}
            points={`${d.tipX},${d.tipY} ${d.b1x},${d.b1y} ${d.b2x},${d.b2y}`}
            fill={d.color}
          />
        ))}
        {/* Center circle */}
        <circle
          cx={C}
          cy={C}
          r={INNER_R}
          fill="rgba(0,188,212,0.18)"
          stroke="rgba(0,188,212,0.6)"
          strokeWidth={1.5}
        />
        {/* Center dot */}
        <circle cx={C} cy={C} r={5} fill="rgba(0,188,212,0.7)" />
      </svg>
      <div
        style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.35)",
          fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: 4,
        }}
      >
        LEG · STRAIGHT · OFF
      </div>
    </div>
  );
}

// ===== BALL TYPE INDICATOR =====
function BallTypeIndicator({ variant }: { variant: string }) {
  const variantLabel = variant
    .replace("_", " ")
    .toUpperCase()
    .replace("SWING IN", "IN SWINGER")
    .replace("SWING OUT", "OUT SWINGER")
    .replace("OFFSPIN", "OFF SPIN")
    .replace("LEGSPIN", "LEG SPIN");

  const isInswinger = variant === "swing_in";
  const isOutswinger = variant === "swing_out";
  const isBouncerOrYorker = variant === "bouncer" || variant === "yorker";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded"
      style={{
        background: "rgba(10,21,32,0.88)",
        border: "1px solid rgba(0,188,212,0.35)",
        backdropFilter: "blur(4px)",
        pointerEvents: "none",
      }}
    >
      {/* Cricket ball icon */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #c0392b, #7b0000)",
          border: "1px solid rgba(255,255,255,0.2)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Seam line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            background: "rgba(255,255,255,0.4)",
            transform: "translateY(-50%) rotate(20deg)",
          }}
        />
      </div>
      {/* Direction arrows */}
      {isInswinger && (
        <span
          style={{
            color: "#fbbf24",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          ←←
        </span>
      )}
      {isOutswinger && (
        <span
          style={{
            color: "#fbbf24",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          →→
        </span>
      )}
      {isBouncerOrYorker && (
        <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700 }}>
          ↕
        </span>
      )}
      {!isInswinger && !isOutswinger && !isBouncerOrYorker && (
        <span
          style={{
            color: "#fbbf24",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          ↩↩
        </span>
      )}
      {/* Label */}
      <span
        style={{
          color: "#ffffff",
          fontSize: 9,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
        }}
      >
        {variantLabel}
      </span>
    </div>
  );
}

// ===== VERTICAL SPEED METER =====
function VerticalSpeedMeter({
  speedFill,
  speedDisplay,
  speedColor,
  onLock,
  locked,
}: {
  speedFill: number;
  speedDisplay: number;
  speedColor: string;
  onLock: () => void;
  locked: boolean;
}) {
  const BAR_HEIGHT = 140;
  const filledHeight = (speedFill / 100) * BAR_HEIGHT;
  const arrowY = BAR_HEIGHT - filledHeight;

  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ pointerEvents: locked ? "none" : "auto" }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 7,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 700,
        }}
      >
        SPD
      </span>
      <div
        style={{
          position: "relative",
          width: 14,
          height: BAR_HEIGHT,
          borderRadius: 4,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Gradient fill from bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: `${speedFill}%`,
            background: "linear-gradient(to top, #66BB6A, #fbbf24, #EF5350)",
            transition: locked ? "height 0.1s" : "none",
            borderRadius: 4,
          }}
        />
      </div>
      {/* Arrow indicator - points left */}
      <div
        style={{
          position: "absolute",
          right: 18,
          top: arrowY + 30, // 30px offset for label
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: `8px solid ${speedColor}`,
          filter: `drop-shadow(0 0 4px ${speedColor})`,
          transition: locked ? "top 0.1s" : "none",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          color: speedColor,
          fontSize: 8,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {speedDisplay}
        <br />
        <span style={{ fontWeight: 400, fontSize: 7 }}>kph</span>
      </span>
      {!locked && (
        <button
          type="button"
          data-ocid="game.toggle"
          onClick={onLock}
          style={{
            background: `${speedColor}22`,
            border: `1px solid ${speedColor}66`,
            color: speedColor,
            borderRadius: 4,
            padding: "2px 4px",
            fontSize: 7,
            fontWeight: 700,
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          LOCK
        </button>
      )}
      {locked && (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.3)",
            borderRadius: 4,
            padding: "2px 4px",
            fontSize: 7,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          ✓ SET
        </div>
      )}
    </div>
  );
}

// ===== RC24 BOTTOM SCOREBAR =====
function RCScorebar({
  runs,
  wickets,
  overs,
  balls,
  maxOvers,
  batsman1,
  batsman2,
  batsman1Runs,
  batsman1Balls,
  batsman2Runs,
  batsman2Balls,
  bowlerName,
  bowlerOvers,
  bowlerRuns,
  bowlerWickets,
  teamName,
  opponentName,
  lastEvent,
  eventKey,
}: {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  maxOvers: number;
  batsman1: string;
  batsman2: string;
  batsman1Runs: number;
  batsman1Balls: number;
  batsman2Runs: number;
  batsman2Balls: number;
  bowlerName: string;
  bowlerOvers: string;
  bowlerRuns: number;
  bowlerWickets: number;
  teamName: string;
  opponentName: string;
  lastEvent: string;
  eventKey: number;
}) {
  const oversDisplay = `${overs}.${balls}`;
  const tealDivider = "rgba(0,188,212,0.35)";

  return (
    <div
      style={{
        background: "rgba(8,16,30,0.97)",
        borderTop: "1.5px solid rgba(0,188,212,0.4)",
        display: "flex",
        alignItems: "stretch",
        height: 52,
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
      }}
    >
      {/* LEFT PANEL: India team + batsmen */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          borderRight: `1.5px solid ${tealDivider}`,
          minWidth: 0,
        }}
      >
        {/* India circular badge */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #1565C0, #0D47A1)",
            border: "2px solid rgba(0,188,212,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 8px rgba(0,188,212,0.3)",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 8,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0,
            }}
          >
            IND
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            IND
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  color: "#00E5FF",
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                *
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {batsman1.split(" ").pop()?.toUpperCase()}
              </span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 8 }}>
                {batsman1Runs}({batsman1Balls})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {batsman2.split(" ").pop()?.toUpperCase()}
              </span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 8 }}>
                {batsman2Runs}({batsman2Balls})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: Score */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          background: "rgba(0,188,212,0.04)",
          borderRight: `1.5px solid ${tealDivider}`,
          position: "relative",
          minWidth: 160,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {teamName.slice(0, 3).toUpperCase()}
          </span>
          <span
            style={{
              color: "#00E5FF",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            {runs}
            <span style={{ color: "rgba(0,229,255,0.7)" }}>-{wickets}</span>
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {opponentName.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>
            {oversDisplay}({maxOvers}) ov
          </span>
          <AnimatePresence mode="popLayout">
            {lastEvent && (
              <motion.span
                key={eventKey}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  color: "#F57C00",
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
                data-ocid="game.toast"
              >
                · {lastEvent}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT PANEL: Bowler + Australia */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              lineHeight: 1,
              textAlign: "right",
            }}
          >
            AUS
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              alignItems: "flex-end",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              {bowlerName.split(" ").pop()?.toUpperCase()}
            </span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 8 }}>
              {bowlerWickets}-{bowlerRuns}({bowlerOvers})
            </span>
          </div>
        </div>
        {/* Australia circular badge */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #1B5E20, #004D40)",
            border: "2px solid rgba(0,188,212,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 8px rgba(0,188,212,0.3)",
          }}
        >
          <span
            style={{
              color: "#FFD700",
              fontSize: 8,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: 0,
            }}
          >
            AUS
          </span>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN HUD =====
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
    primaryColor: _primaryColor2,
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
    onlineRoomCode: _onlineRoomCode,
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
    userMode,
    setUserMode,
  } = useGameStore();

  const { actor: _actor } = useActor();

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
  const [preDeliveryOverlay, setPreDeliveryOverlay] = useState(false);

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

  // AI bowling when user is batting
  useEffect(() => {
    if (userMode === "batting" && canBowl) {
      const t = setTimeout(
        () => {
          bowl();
          setSpeedLocked(false);
        },
        1800 + Math.random() * 800,
      );
      return () => clearTimeout(t);
    }
    return undefined;
  }, [userMode, canBowl, bowl]);

  // AI batting when user is bowling
  useEffect(() => {
    if (userMode === "bowling" && ballState === "bowled") {
      const aiDelay = 3000 + Math.random() * 600;
      const t = setTimeout(() => {
        const dirs = ["offside", "straight", "legside"] as const;
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const meterVal = 0.3 + Math.random() * 0.5;
        const quality = getTimingQuality(meterVal);
        timingQualityRef.current = quality;
        shotDirectionRef.current = dir;
        useGameStore.getState().setShotDirection(dir);
        if (quality !== "miss") {
          swingRequestRef.current = true;
          useGameStore.getState().swing();
        }
      }, aiDelay);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [userMode, ballState]);
  // Pre-delivery "GET READY" overlay
  useEffect(() => {
    if (ballState === "bowled") {
      setPreDeliveryOverlay(true);
      const t = setTimeout(() => setPreDeliveryOverlay(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ballState]);
  const oversDisplay = `${overs}.${balls}`;
  const _pc = "#00BCD4"; // Override with RC24 teal
  const _sc = secondaryColor;

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
    if (runs !== prevRuns.current || wickets !== prevWickets.current) {
      setEventKey((k) => k + 1);
      prevRuns.current = runs;
      prevWickets.current = wickets;
    }
  }, [runs, wickets]);

  const lockSpeed = () => {
    if (speedRafRef.current !== null) cancelAnimationFrame(speedRafRef.current);
    setBowlingSpeed(speedDisplay);
    setSpeedLocked(true);
    if (speedLockedTimerRef.current) clearTimeout(speedLockedTimerRef.current);
    speedLockedTimerRef.current = setTimeout(() => setSpeedLocked(false), 8000);
  };

  const handleBowl = () => {
    if (!canBowl) return;
    bowl();
    setSpeedLocked(false);
  };

  const triggerShot = (direction: "offside" | "straight" | "legside") => {
    if (!canSwing) return;
    const meterValue = getMeterValue();
    let quality = getTimingQuality(meterValue);

    if (footPosition === "advance" && quality === "early") quality = "good";

    timingQualityRef.current = quality;

    setTimingFlash(quality);
    setTimingFlashKey((k) => k + 1);
    if (timingFlashTimer.current) clearTimeout(timingFlashTimer.current);
    timingFlashTimer.current = setTimeout(() => setTimingFlash(null), 1600);

    shotDirectionRef.current = direction;
    useGameStore.getState().setShotDirection(direction);

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
      ? "BOWL"
      : "BOWL"
    : "BOWL";

  const _matchLabel = multiplayerEnabled
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
    speedFill > 80 ? "#EF5350" : speedFill > 55 ? "#fbbf24" : "#66BB6A";

  const totalBalls = balls + overs * 6;
  const _strikeRate =
    totalBalls > 0 ? ((runs / totalBalls) * 100).toFixed(0) : "0";
  const ausBowlers = AUS_SQUAD.filter(
    (p) => p.role === "bowl" || p.role === "all",
  );
  const bowler = {
    name: ausBowlers[overs % ausBowlers.length]?.name ?? "P. Cummins",
  };
  const _economy = overs > 0 ? (runs / overs).toFixed(1) : "0.0";

  // RC24 style constants
  const RC_DARK = "rgba(10,21,32,0.92)";
  const RC_TEAL = "#00BCD4";
  const RC_BTN_BG = "rgba(15,30,30,0.85)";
  const RC_BTN_BORDER = "rgba(0,188,212,0.6)";

  return (
    <div style={{ pointerEvents: "none" }} className="fixed inset-0">
      {/* ===== TOP-LEFT: Field Radar ===== */}
      <div
        className="absolute top-3 left-3"
        style={{
          background: RC_DARK,
          border: `1px solid ${RC_BTN_BORDER}`,
          backdropFilter: "blur(8px)",
          borderRadius: 12,
          padding: 8,
          pointerEvents: "none",
        }}
      >
        <FieldRadar primaryColor={RC_TEAL} />
      </div>

      {/* ===== TOP-RIGHT: Utility Buttons ===== */}
      <div
        className="absolute top-3 right-3 flex items-center gap-1.5"
        style={{ pointerEvents: "auto" }}
      >
        {onlineConnected && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-md"
            style={{
              background: "rgba(0,200,80,0.15)",
              border: "1px solid rgba(0,200,80,0.35)",
            }}
            data-ocid="game.panel"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
              {onlinePlayerRole === "host" ? "HOST" : "GUEST"}
            </span>
            <button
              type="button"
              onClick={() => setOnlineConnected(false)}
              className="text-white/30 hover:text-white/60 text-xs ml-1"
              style={{ cursor: "pointer", background: "none", border: "none" }}
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
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
          style={{
            background:
              lightingMode === "night"
                ? "rgba(30,10,80,0.7)"
                : "rgba(255,200,50,0.15)",
            border: `1px solid ${lightingMode === "night" ? "rgba(120,80,255,0.5)" : "rgba(255,200,50,0.45)"}`,
            color: lightingMode === "night" ? "#a78bfa" : "#fbbf24",
            cursor: "pointer",
          }}
        >
          {lightingMode === "day" ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        <button
          type="button"
          data-ocid="team_editor.open_modal_button"
          onClick={() => setTeamEditorOpen(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
          style={{
            background: `${RC_TEAL}22`,
            border: `1px solid ${RC_BTN_BORDER}`,
            color: RC_TEAL,
            cursor: "pointer",
          }}
        >
          <Settings size={14} />
        </button>
        <button
          type="button"
          data-ocid="game.open_modal_button"
          onClick={() => setOnlineLobbyOpen(true)}
          className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
          style={{
            background: onlineConnected ? "rgba(0,200,80,0.15)" : RC_BTN_BG,
            border: `1px solid ${onlineConnected ? "rgba(0,200,80,0.4)" : RC_BTN_BORDER}`,
            color: onlineConnected ? "#4ade80" : "rgba(255,255,255,0.5)",
            cursor: "pointer",
          }}
        >
          <Wifi size={13} />
        </button>
        {/* DIFF */}
        <div className="relative">
          <button
            type="button"
            data-ocid="game.toggle"
            onClick={() => setDifficultyOpen((v) => !v)}
            className="flex items-center justify-center h-7 px-2 rounded-lg transition-all hover:scale-110"
            style={{
              background: difficultyOpen ? `${RC_TEAL}33` : RC_BTN_BG,
              border: `1px solid ${RC_BTN_BORDER}`,
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            DIFF
          </button>
          {difficultyOpen && (
            <div
              className="absolute right-0 top-9 flex flex-col gap-1 p-2 rounded-xl"
              style={{
                background: "rgba(4,12,28,0.97)",
                border: `1px solid ${RC_BTN_BORDER}`,
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
                    background:
                      difficulty === d ? `${RC_TEAL}33` : "transparent",
                    color:
                      difficulty === d ? RC_TEAL : "rgba(255,255,255,0.55)",
                    border: `1px solid ${difficulty === d ? RC_BTN_BORDER : "transparent"}`,
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
        {/* STATS */}
        <button
          type="button"
          data-ocid="game.open_modal_button"
          onClick={() => setStatsOpen(true)}
          className="flex items-center justify-center h-7 px-2 rounded-lg transition-all hover:scale-110"
          style={{
            background: RC_BTN_BG,
            border: `1px solid ${RC_BTN_BORDER}`,
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          STATS
        </button>
        {/* BAT / BOWL MODE TOGGLE */}
        <button
          type="button"
          data-ocid="game.toggle"
          onClick={() =>
            setUserMode(userMode === "batting" ? "bowling" : "batting")
          }
          className="flex items-center justify-center h-7 px-2 rounded-lg transition-all hover:scale-110"
          style={{
            background:
              userMode === "batting" ? "rgba(245,124,0,0.25)" : `${RC_TEAL}33`,
            border: `1px solid ${userMode === "batting" ? "#F57C00" : RC_TEAL}`,
            color: userMode === "batting" ? "#F57C00" : RC_TEAL,
            cursor: "pointer",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.05em",
          }}
        >
          {userMode === "batting" ? "🏏 BAT" : "⚡ BOWL"}
        </button>
        {/* LOCAL MATCH */}
        <button
          type="button"
          data-ocid="game.toggle"
          onClick={() => setMpPanelOpen(!mpPanelOpen)}
          className="flex items-center justify-center h-7 px-2 rounded-lg transition-all hover:scale-110"
          style={{
            background: mpPanelOpen ? `${RC_TEAL}33` : RC_BTN_BG,
            border: `1px solid ${RC_BTN_BORDER}`,
            color: mpPanelOpen ? RC_TEAL : "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          <Users size={11} className="mr-1" />
          2P
        </button>
        {mpPanelOpen && (
          <div
            className="absolute right-0 top-9 flex flex-col gap-2 p-3 rounded-xl"
            style={{
              background: "rgba(4,12,28,0.97)",
              border: `1px solid ${RC_BTN_BORDER}`,
              backdropFilter: "blur(8px)",
              zIndex: 60,
              minWidth: 160,
            }}
          >
            {!multiplayerEnabled ? (
              <>
                <div className="flex items-center gap-2">
                  <span
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  >
                    Overs:
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={mpOvers}
                    onChange={(e) => setMpOvers(Number(e.target.value))}
                    className="text-xs font-bold w-12 px-2 py-1 rounded text-center"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${RC_BTN_BORDER}`,
                      color: "#fff",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="button"
                  data-ocid="game.primary_button"
                  onClick={() => {
                    startMultiplayer(mpOvers);
                    setMpPanelOpen(false);
                  }}
                  className="font-bold uppercase tracking-wider px-3 py-2 rounded-lg text-xs transition-all hover:scale-105"
                  style={{
                    background: RC_TEAL,
                    color: "#0B2E4E",
                    cursor: "pointer",
                  }}
                >
                  Start Match
                </button>
              </>
            ) : (
              <button
                type="button"
                data-ocid="game.toggle"
                onClick={() => {
                  resetMultiplayer();
                  setMpPanelOpen(false);
                }}
                className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg"
                style={{
                  background: "rgba(255,60,60,0.12)",
                  color: "rgba(255,120,120,0.8)",
                  border: "1px solid rgba(255,60,60,0.3)",
                  cursor: "pointer",
                }}
              >
                Exit Match
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== GET READY PRE-DELIVERY OVERLAY ===== */}
      <AnimatePresence>
        {preDeliveryOverlay && (
          <motion.div
            key="pre-delivery"
            initial={{ opacity: 0, scale: 0.7, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 54, top: "35%" }}
          >
            <div
              style={{
                color: "#00e5ff",
                fontSize: 42,
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textShadow:
                  "0 0 20px rgba(0,229,255,0.8), 0 0 50px rgba(0,229,255,0.5)",
                background: "rgba(0,10,30,0.72)",
                border: "2px solid rgba(0,229,255,0.4)",
                borderRadius: 16,
                padding: "10px 32px",
              }}
            >
              🏏 GET READY!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== UMPIRE SIGNAL OVERLAY ===== */}
      <AnimatePresence>
        {umpireSignal !== "none" && UMPIRE_SIGNAL_STYLES[umpireSignal] && (
          <motion.div
            key={umpireSignal}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 55 }}
          >
            <div
              className="text-7xl font-black tracking-[0.25em] uppercase px-10 py-5 rounded-3xl"
              style={{
                color: UMPIRE_SIGNAL_STYLES[umpireSignal].color,
                textShadow: `0 0 24px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}, 0 0 60px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}, 0 0 100px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}`,
                background: "rgba(0,0,0,0.75)",
                border: `3px solid ${UMPIRE_SIGNAL_STYLES[umpireSignal].color}88`,
                boxShadow: `0 0 60px ${UMPIRE_SIGNAL_STYLES[umpireSignal].glow}, inset 0 0 40px rgba(0,0,0,0.5)`,
              }}
              data-ocid="game.toast"
            >
              {UMPIRE_SIGNAL_STYLES[umpireSignal].text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== SHOT NAME FLASH ===== */}
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
              className="px-6 py-3 text-xl font-bold tracking-widest uppercase rounded-lg"
              style={{
                background: "rgba(10,21,32,0.9)",
                border: `2px solid ${RC_BTN_BORDER}`,
                color: "#fff",
                textShadow: `0 0 16px ${RC_TEAL}`,
              }}
            >
              {lastShot}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== TIMING QUALITY FLASH ===== */}
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
              top: "38%",
              left: "50%",
              transform: "translateX(-50%) translateY(-50%)",
              zIndex: 45,
            }}
          >
            <div
              className="text-3xl font-extrabold tracking-widest uppercase px-8 py-4 rounded-2xl"
              style={{
                color: TIMING_QUALITY_STYLES[timingFlash].color,
                textShadow: `0 0 24px ${TIMING_QUALITY_STYLES[timingFlash].glow}`,
                background: "rgba(5,10,25,0.9)",
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

      {/* ===== BATTING PHASE: Right-side controls ===== */}
      <AnimatePresence>
        {canSwing && userMode === "batting" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute"
            style={{
              right: 48,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              pointerEvents: "auto",
            }}
          >
            {/* RC24 Timing Meter */}
            <div
              style={{
                background: RC_DARK,
                border: `1px solid ${RC_BTN_BORDER}`,
                backdropFilter: "blur(6px)",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                TIMING
              </div>
              <RC24TimingMeter />
            </div>

            {/* Ball Type Indicator */}
            <BallTypeIndicator variant={bowlingVariant} />

            {/* SHOT TYPE BUTTONS: PUSH | STROKE | LOFT */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["push", "stroke", "loft"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  data-ocid="game.toggle"
                  onClick={() => {
                    setShotType(st);
                    shotTypeRef.current = st;
                  }}
                  style={{
                    background: shotType === st ? `${RC_TEAL}25` : RC_BTN_BG,
                    border: `1.5px solid ${shotType === st ? RC_TEAL : RC_BTN_BORDER}`,
                    color: shotType === st ? RC_TEAL : "#ffffff",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                    minWidth: 52,
                    boxShadow:
                      shotType === st ? `0 0 8px ${RC_TEAL}44` : "none",
                    transition: "all 0.1s",
                  }}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>

            {/* FOOT POSITION BUTTONS */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {/* BACK FOOT circular */}
              {(["back", "front", "advance", "leave"] as const).map((fp) => {
                const labels: Record<string, string> = {
                  back: "BACK\nFOOT",
                  front: "FRONT\nFOOT",
                  advance: "ADVANCE",
                  leave: "LEAVE",
                };
                const icons: Record<string, string> = {
                  back: "↩",
                  front: "↪",
                  advance: "⏩",
                  leave: "⛔",
                };
                const isCircular = fp === "back" || fp === "front";
                return (
                  <button
                    key={fp}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => setFootPosition(fp)}
                    style={{
                      background:
                        footPosition === fp ? `${RC_TEAL}25` : RC_BTN_BG,
                      border: `1.5px solid ${footPosition === fp ? RC_TEAL : RC_BTN_BORDER}`,
                      color:
                        footPosition === fp ? RC_TEAL : "rgba(255,255,255,0.8)",
                      borderRadius: isCircular ? "50%" : 20,
                      width: isCircular ? 46 : undefined,
                      height: isCircular ? 46 : undefined,
                      padding: isCircular ? 0 : "4px 10px",
                      fontSize: isCircular ? 18 : 9,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow:
                        footPosition === fp ? `0 0 10px ${RC_TEAL}44` : "none",
                      transition: "all 0.1s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isCircular ? (
                      <>
                        <span style={{ fontSize: 14 }}>{icons[fp]}</span>
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            lineHeight: 1,
                            marginTop: 1,
                          }}
                        >
                          {fp === "back" ? "BACK" : "FRNT"}
                        </span>
                      </>
                    ) : (
                      <span style={{ textTransform: "uppercase" }}>
                        {labels[fp]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BATTING PHASE: Vertical speed meter (far right) ===== */}
      <AnimatePresence>
        {canSwing && userMode === "batting" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute"
            style={{
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 30,
              background: RC_DARK,
              border: `1px solid ${RC_BTN_BORDER}`,
              backdropFilter: "blur(6px)",
              borderRadius: 8,
              padding: 8,
              pointerEvents: "auto",
            }}
          >
            <VerticalSpeedMeter
              speedFill={speedFill}
              speedDisplay={speedDisplay}
              speedColor={speedColor}
              onLock={lockSpeed}
              locked={speedLocked}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BATTING PHASE: D-pad joystick (bottom-left) ===== */}
      <AnimatePresence>
        {canSwing && userMode === "batting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute"
            style={{
              left: 12,
              bottom: 64,
              zIndex: 30,
              background: RC_DARK,
              border: `1px solid ${RC_BTN_BORDER}`,
              backdropFilter: "blur(6px)",
              borderRadius: "50%",
              padding: 4,
              pointerEvents: "auto",
            }}
          >
            <DPadJoystick onShot={triggerShot} enabled={canSwing} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BATTING PHASE: Swipe zone (transparent overlay) ===== */}
      <AnimatePresence>
        {canSwing && userMode === "batting" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ pointerEvents: "auto", zIndex: 15 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        )}
      </AnimatePresence>

      {/* ===== BOWLING PHASE: Right-side controls ===== */}
      <AnimatePresence>
        {canBowl && userMode === "bowling" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute"
            style={{
              right: 48,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              pointerEvents: "auto",
            }}
            data-ocid="game.panel"
          >
            {/* Bowler type: PACER / SPINNER */}
            <div
              style={{
                background: RC_DARK,
                border: `1px solid ${RC_BTN_BORDER}`,
                backdropFilter: "blur(6px)",
                borderRadius: 8,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                BOWLER TYPE
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {(["pacer", "spinner"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => handleBowlingTypeSelect(t)}
                    style={{
                      background:
                        bowlingType === t ? `${RC_TEAL}25` : RC_BTN_BG,
                      border: `1.5px solid ${bowlingType === t ? RC_TEAL : RC_BTN_BORDER}`,
                      color: bowlingType === t ? RC_TEAL : "#ffffff",
                      borderRadius: 6,
                      padding: "5px 12px",
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      cursor: "pointer",
                      boxShadow:
                        bowlingType === t ? `0 0 8px ${RC_TEAL}44` : "none",
                    }}
                  >
                    {t === "pacer" ? "⚡ PACE" : "🌀 SPIN"}
                  </button>
                ))}
              </div>
              {/* Variants */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                {currentVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => handleVariantSelect(v.id)}
                    style={{
                      background:
                        bowlingVariant === v.id
                          ? `${RC_TEAL}22`
                          : "rgba(0,0,0,0.4)",
                      border: `1px solid ${bowlingVariant === v.id ? RC_TEAL : "rgba(255,255,255,0.2)"}`,
                      color:
                        bowlingVariant === v.id
                          ? RC_TEAL
                          : "rgba(255,255,255,0.7)",
                      borderRadius: 5,
                      padding: "3px 8px",
                      fontSize: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {v.id === "swing_in"
                      ? "IN"
                      : v.id === "swing_out"
                        ? "OUT"
                        : v.id === "yorker"
                          ? "YK"
                          : v.id === "bouncer"
                            ? "BC"
                            : v.id === "offspin"
                              ? "OS"
                              : "LS"}
                  </button>
                ))}
              </div>
              {/* Length selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 8,
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  LEN:
                </span>
                {(["full", "good", "short"] as const).map((len) => (
                  <button
                    key={len}
                    type="button"
                    data-ocid="game.toggle"
                    onClick={() => setBowlingLength(len)}
                    style={{
                      background:
                        bowlingLength === len
                          ? "rgba(0,188,212,0.25)"
                          : "rgba(0,0,0,0.5)",
                      color:
                        bowlingLength === len
                          ? RC_TEAL
                          : "rgba(255,255,255,0.6)",
                      border: `1px solid ${bowlingLength === len ? RC_BTN_BORDER : "rgba(255,255,255,0.2)"}`,
                      borderRadius: 4,
                      width: 30,
                      height: 26,
                      fontSize: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {len === "full" ? "FL" : len === "good" ? "GD" : "SH"}
                  </button>
                ))}
              </div>
            </div>

            {/* BOWL button */}
            <button
              type="button"
              onClick={handleBowl}
              disabled={!canBowl}
              data-ocid="game.primary_button"
              style={{
                background: `linear-gradient(135deg, ${RC_TEAL}, #006080)`,
                color: "#ffffff",
                cursor: "pointer",
                border: `2px solid ${RC_TEAL}`,
                width: 64,
                height: 64,
                borderRadius: "50%",
                fontSize: 11,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                boxShadow: `0 0 20px ${RC_TEAL}66, 0 0 40px ${RC_TEAL}22`,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
                alignSelf: "flex-end",
              }}
            >
              {bowlBtnLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== BOWLING PHASE: Vertical speed meter (far right) ===== */}
      <AnimatePresence>
        {canBowl && userMode === "bowling" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute"
            style={{
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 30,
              background: RC_DARK,
              border: `1px solid ${RC_BTN_BORDER}`,
              backdropFilter: "blur(6px)",
              borderRadius: 8,
              padding: 8,
              pointerEvents: "auto",
            }}
          >
            <VerticalSpeedMeter
              speedFill={speedFill}
              speedDisplay={speedDisplay}
              speedColor={speedColor}
              onLock={lockSpeed}
              locked={speedLocked}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== REPLAY OVERLAY ===== */}
      <AnimatePresence>
        {replayActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 50 }}
          >
            <div
              className="absolute top-24 left-1/2 -translate-x-1/2"
              style={{
                background: "rgba(5,10,25,0.75)",
                border: `2px solid ${RC_BTN_BORDER}`,
                borderRadius: 8,
                padding: "6px 20px",
              }}
            >
              <span
                style={{
                  color: RC_TEAL,
                  fontSize: 18,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.3em",
                  textShadow: `0 0 16px ${RC_TEAL}`,
                }}
              >
                ◉ REPLAY
              </span>
            </div>
            {replayEvent && (
              <div
                className="absolute top-40 left-1/2 -translate-x-1/2"
                style={{
                  background: "rgba(5,10,25,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6,
                  padding: "4px 16px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  {replayEvent}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== INNINGS BREAK OVERLAY ===== */}
      <AnimatePresence>
        {inningsBreak && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: "rgba(5,10,25,0.88)",
              zIndex: 70,
              pointerEvents: "auto",
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col items-center gap-5 rounded-2xl p-8"
              style={{
                background: "rgba(10,21,32,0.97)",
                border: `2px solid ${RC_BTN_BORDER}`,
                maxWidth: 400,
                width: "90vw",
              }}
            >
              <div
                style={{
                  color: RC_TEAL,
                  fontSize: 22,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                }}
              >
                INNINGS BREAK
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {teamName} scored {innings1Score.runs}/{innings1Score.wickets}{" "}
                in {innings1Score.overs}.{innings1Score.balls} overs
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 11,
                  textAlign: "center",
                }}
              >
                Player 2 needs {innings1Score.runs + 1} to win
              </div>
              <button
                type="button"
                data-ocid="game.primary_button"
                onClick={startInnings2}
                style={{
                  background: `linear-gradient(135deg, ${RC_TEAL}, #006080)`,
                  color: "#ffffff",
                  border: `2px solid ${RC_TEAL}`,
                  borderRadius: 10,
                  padding: "12px 32px",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  boxShadow: `0 0 20px ${RC_TEAL}55`,
                }}
              >
                Start Innings 2
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== GAME OVER OVERLAY ===== */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: "rgba(5,10,25,0.9)",
              zIndex: 70,
              pointerEvents: "auto",
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col items-center gap-5 rounded-2xl p-8"
              style={{
                background: "rgba(10,21,32,0.97)",
                border: `2px solid ${RC_BTN_BORDER}`,
                maxWidth: 440,
                width: "90vw",
              }}
            >
              <div
                style={{
                  color: "#F57C00",
                  fontSize: 20,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  textShadow: "0 0 16px rgba(245,124,0,0.6)",
                }}
              >
                MATCH OVER
              </div>
              {multiplayerEnabled && (
                <div
                  style={{ color: "#F57C00", fontSize: 18, fontWeight: 800 }}
                >
                  {winnerText}
                </div>
              )}
              <div className="w-full flex flex-col gap-3">
                <div
                  className="rounded-xl px-5 py-4"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${RC_BTN_BORDER}`,
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: 8,
                    }}
                  >
                    Player 1 (Innings 2)
                  </div>
                  <div className="flex justify-around">
                    <ScoreChip
                      label="RUNS"
                      value={String(p1Innings.runs)}
                      color={RC_TEAL}
                    />
                    <ScoreChip
                      label="WKTS"
                      value={`${p1Innings.wickets}/10`}
                      color={RC_TEAL}
                    />
                    <ScoreChip
                      label="OVERS"
                      value={`${p1Innings.overs}.${p1Innings.balls}`}
                      color={RC_TEAL}
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
                  <div
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      marginBottom: 8,
                    }}
                  >
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
                style={{
                  background: `linear-gradient(135deg, ${RC_TEAL}, #006080)`,
                  color: "#ffffff",
                  border: `2px solid ${RC_TEAL}`,
                  borderRadius: 10,
                  padding: "12px 32px",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  width: "100%",
                  boxShadow: `0 0 20px ${RC_TEAL}55`,
                }}
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== STATS MODAL ===== */}
      {statsOpen && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: "rgba(5,10,25,0.88)",
            zIndex: 80,
            pointerEvents: "auto",
          }}
          onClick={() => setStatsOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setStatsOpen(false)}
          data-ocid="stats.modal"
        >
          <div
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{
              background: "rgba(10,21,32,0.98)",
              border: `1px solid ${RC_BTN_BORDER}`,
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
                style={{
                  color: RC_TEAL,
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                📊 Match Stats
              </span>
              <button
                type="button"
                data-ocid="stats.close_button"
                onClick={() => setStatsOpen(false)}
                style={{
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 8,
                }}
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
                          <span style={{ color: RC_TEAL, fontSize: 9 }}>
                            #{p.jersey}
                          </span>
                        </td>
                        <td
                          className="text-right py-1 px-2 font-bold"
                          style={{ color: isStriker ? RC_TEAL : undefined }}
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
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginBottom: 8,
                }}
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
                          style={{ color: bWickets > 0 ? RC_TEAL : undefined }}
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

      {/* ===== RUNNING PIP PANEL ===== */}
      {ballState === "hit" && (
        <div
          style={{
            position: "absolute",
            bottom: 68,
            right: 8,
            width: 120,
            height: 76,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(4px)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            zIndex: 35,
            overflow: "hidden",
          }}
        >
          <style>{`
            @keyframes run-anim {
              0%   { transform: translateX(-18px) scaleX(1); }
              48%  { transform: translateX(18px) scaleX(1); }
              50%  { transform: translateX(18px) scaleX(-1); }
              98%  { transform: translateX(-18px) scaleX(-1); }
              100% { transform: translateX(-18px) scaleX(1); }
            }
            @keyframes leg-l {
              0%,100% { transform: rotate(-35deg); }
              50% { transform: rotate(35deg); }
            }
            @keyframes leg-r {
              0%,100% { transform: rotate(35deg); }
              50% { transform: rotate(-35deg); }
            }
            @keyframes arm-l {
              0%,100% { transform: rotate(30deg); }
              50% { transform: rotate(-30deg); }
            }
            @keyframes arm-r {
              0%,100% { transform: rotate(-30deg); }
              50% { transform: rotate(30deg); }
            }
            @keyframes pip-pulse {
              0%,100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
          {/* Stick figure runner */}
          <div
            style={{
              position: "relative",
              width: 44,
              height: 44,
              animation: "run-anim 0.9s linear infinite",
            }}
          >
            {/* Head */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 17,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#f5c5a3",
                border: "1.5px solid rgba(255,255,255,0.4)",
              }}
            />
            {/* Body */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 20,
                width: 2.5,
                height: 14,
                background: "#fff",
                borderRadius: 2,
              }}
            />
            {/* Left arm */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 10,
                width: 10,
                height: 2.5,
                background: "#4fc3f7",
                borderRadius: 2,
                transformOrigin: "right center",
                animation: "arm-l 0.45s ease-in-out infinite",
              }}
            />
            {/* Right arm */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 22,
                width: 10,
                height: 2.5,
                background: "#4fc3f7",
                borderRadius: 2,
                transformOrigin: "left center",
                animation: "arm-r 0.45s ease-in-out infinite",
              }}
            />
            {/* Left leg */}
            <div
              style={{
                position: "absolute",
                top: 22,
                left: 14,
                width: 2.5,
                height: 14,
                background: "#f5f5f5",
                borderRadius: 2,
                transformOrigin: "top center",
                animation: "leg-l 0.45s ease-in-out infinite",
              }}
            />
            {/* Right leg */}
            <div
              style={{
                position: "absolute",
                top: 22,
                left: 22,
                width: 2.5,
                height: 14,
                background: "#f5f5f5",
                borderRadius: 2,
                transformOrigin: "top center",
                animation: "leg-r 0.45s ease-in-out infinite",
              }}
            />
          </div>
          {/* Ground line */}
          <div
            style={{
              width: 90,
              height: 1.5,
              background: "rgba(255,255,255,0.2)",
              borderRadius: 1,
            }}
          />
          <span
            style={{
              color: "#4fc3f7",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              animation: "pip-pulse 1s ease-in-out infinite",
            }}
          >
            🏃 RUNNING
          </span>
        </div>
      )}

      {/* ===== BOTTOM SCOREBAR ===== */}
      <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 40 }}>
        <RCScorebar
          runs={runs}
          wickets={wickets}
          overs={overs}
          balls={balls}
          maxOvers={maxOvers}
          batsman1={INDIA_SQUAD[0].name}
          batsman2={INDIA_SQUAD[1].name}
          batsman1Runs={runs}
          batsman1Balls={totalBalls}
          batsman2Runs={12}
          batsman2Balls={14}
          bowlerName={bowler.name}
          bowlerOvers={oversDisplay}
          bowlerRuns={runs}
          bowlerWickets={wickets}
          teamName={teamName}
          opponentName={opponentName}
          lastEvent={lastEvent}
          eventKey={eventKey}
        />
      </div>

      {/* ===== MODALS ===== */}
      <TeamEditorModal
        open={teamEditorOpen}
        onClose={() => setTeamEditorOpen(false)}
      />
      <OnlineLobbyModal
        open={onlineLobbyOpen}
        onClose={() => setOnlineLobbyOpen(false)}
      />
    </div>
  );
}

// ===== HELPER COMPONENTS =====
function ScoreChip({
  label,
  value,
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        style={{
          color: `${color}99`,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
      <span style={{ color, fontSize: 20, fontWeight: 900 }}>{value}</span>
    </div>
  );
}
