import { Html } from "@react-three/drei";
import { useGameStore } from "../../store/gameStore";

const MARKERS = [
  {
    label: "FULL",
    z: 5.5,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.22)",
    border: "rgba(245,158,11,0.7)",
  },
  {
    label: "GOOD",
    z: 3.5,
    color: "#22C55E",
    bg: "rgba(34,197,94,0.22)",
    border: "rgba(34,197,94,0.7)",
  },
  {
    label: "SHORT",
    z: 1.5,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.22)",
    border: "rgba(239,68,68,0.6)",
  },
];

export default function BallLengthMarkers() {
  const userMode = useGameStore((s) => s.userMode);
  const ballState = useGameStore((s) => s.ballState);
  const bowlingLength = useGameStore((s) => s.bowlingLength);

  if (userMode !== "bowling" || ballState !== "idle") return null;

  return (
    <group>
      {MARKERS.map((m) => {
        const isActive = bowlingLength === m.label.toLowerCase();
        return (
          <group key={m.label} position={[0, 0, m.z]}>
            {/* Colored strip plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
              <planeGeometry args={[3.05, 0.32]} />
              <meshBasicMaterial
                color={m.color}
                opacity={isActive ? 0.7 : 0.4}
                transparent
              />
            </mesh>
            {/* Glow strip behind it */}
            {isActive && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]}>
                <planeGeometry args={[3.05, 0.5]} />
                <meshBasicMaterial color={m.color} opacity={0.18} transparent />
              </mesh>
            )}
            {/* Label */}
            <Html
              position={[2.0, 0.3, 0]}
              center
              distanceFactor={12}
              zIndexRange={[10, 20]}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  background: m.bg,
                  border: `1px solid ${m.border}`,
                  borderRadius: 4,
                  padding: "2px 8px",
                  color: m.color,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  backdropFilter: "blur(4px)",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? `0 0 8px ${m.border}` : "none",
                  opacity: isActive ? 1 : 0.7,
                }}
              >
                {m.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
