import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useGameStore } from "../store/gameStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "main" | "create" | "join" | "waiting" | "joined";

export default function OnlineLobbyModal({ open, onClose }: Props) {
  const { actor } = useActor();
  const primaryColor = useGameStore((s) => s.primaryColor);
  const setOnlineRoom = useGameStore((s) => s.setOnlineRoom);
  const setOnlineConnected = useGameStore((s) => s.setOnlineConnected);

  const [tab, setTab] = useState<Tab>("main");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [maxOvers, setMaxOvers] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pc = primaryColor;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopPolling();
      setTab("main");
      setRoomCode("");
      setInputCode("");
      setError("");
      setLoading(false);
      setStatusMsg("");
    }
  }, [open, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startWaitingForOpponent = useCallback(
    (code: string) => {
      if (!actor) return;
      setTab("waiting");
      pollRef.current = setInterval(async () => {
        try {
          const room = await actor.getRoom(code);
          if (room?.player2Joined) {
            stopPolling();
            setOnlineRoom(code, "host");
            setOnlineConnected(true);
            setStatusMsg("Opponent joined! Starting...");
            setTab("joined");
            setTimeout(onClose, 1500);
          }
        } catch {
          // retry silently
        }
      }, 1500);
    },
    [actor, setOnlineRoom, setOnlineConnected, stopPolling, onClose],
  );

  const handleCreateRoom = async () => {
    if (!actor) return;
    setLoading(true);
    setError("");
    try {
      const code = await actor.createRoom(BigInt(maxOvers));
      setRoomCode(code);
      setLoading(false);
      startWaitingForOpponent(code);
    } catch {
      setError("Failed to create room. Please try again.");
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!actor) return;
    const code = inputCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter a valid room code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const success = await actor.joinRoom(code);
      if (success) {
        setOnlineRoom(code, "guest");
        setOnlineConnected(true);
        setStatusMsg("Joined! Starting...");
        setTab("joined");
        setTimeout(onClose, 1500);
      } else {
        setError("Room not found or already full.");
      }
    } catch {
      setError("Failed to join room. Please try again.");
    }
    setLoading(false);
  };

  const handleQuickMatch = async () => {
    if (!actor) return;
    setLoading(true);
    setError("");
    try {
      const code = await actor.quickMatch();
      const room = await actor.getRoom(code);
      if (room) {
        if (room.player2Joined) {
          await actor.joinRoom(code);
          setOnlineRoom(code, "guest");
          setOnlineConnected(true);
          setStatusMsg("Matched! Starting...");
          setTab("joined");
          setTimeout(onClose, 1500);
        } else {
          setRoomCode(code);
          setLoading(false);
          startWaitingForOpponent(code);
          return;
        }
      }
    } catch {
      setError("Quick match failed. Please try again.");
    }
    setLoading(false);
  };

  const copyCode = () => {
    if (roomCode) navigator.clipboard.writeText(roomCode);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.80)", zIndex: 110 }}
          data-ocid="online_lobby.modal"
        >
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 16, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md mx-4 rounded-2xl flex flex-col"
            style={{
              background: "#0B2E4E",
              border: `1.5px solid ${pc}55`,
              boxShadow: `0 8px 60px rgba(0,0,0,0.8), 0 0 40px ${pc}22`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: `1px solid ${pc}33` }}
            >
              <span
                className="font-display text-lg font-extrabold tracking-widest uppercase"
                style={{ color: pc }}
              >
                🌐 Online Lobby
              </span>
              <button
                type="button"
                data-ocid="online_lobby.close_button"
                onClick={onClose}
                className="text-white/40 hover:text-white/80 transition-colors text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 flex flex-col gap-5 min-h-[260px] justify-center">
              {/* Main screen */}
              {tab === "main" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <p className="font-body text-white/50 text-sm text-center">
                    Play cricket with friends online using the ICP network
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="online_lobby.primary_button"
                      onClick={() => {
                        setTab("create");
                        setError("");
                      }}
                      className="flex-1 flex flex-col items-center gap-2 rounded-xl py-5 transition-all duration-150 hover:scale-[1.03]"
                      style={{
                        background: `${pc}22`,
                        border: `2px solid ${pc}55`,
                        cursor: "pointer",
                      }}
                    >
                      <span className="text-3xl">🏟️</span>
                      <span
                        className="font-display font-bold uppercase tracking-wider text-sm"
                        style={{ color: pc }}
                      >
                        Create Room
                      </span>
                      <span className="font-body text-xs text-white/40">
                        Host a new match
                      </span>
                    </button>
                    <button
                      type="button"
                      data-ocid="online_lobby.secondary_button"
                      onClick={() => {
                        setTab("join");
                        setError("");
                      }}
                      className="flex-1 flex flex-col items-center gap-2 rounded-xl py-5 transition-all duration-150 hover:scale-[1.03]"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "2px solid rgba(255,255,255,0.15)",
                        cursor: "pointer",
                      }}
                    >
                      <span className="text-3xl">🔑</span>
                      <span className="font-display font-bold uppercase tracking-wider text-sm text-white">
                        Join Room
                      </span>
                      <span className="font-body text-xs text-white/40">
                        Enter a room code
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    data-ocid="online_lobby.toggle"
                    onClick={handleQuickMatch}
                    disabled={loading || !actor}
                    className="w-full py-2.5 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all duration-150 hover:opacity-90"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.7)",
                      cursor: loading ? "wait" : "pointer",
                    }}
                  >
                    {loading ? "Finding match..." : "⚡ Quick Match"}
                  </button>
                  {error && (
                    <p className="text-red-400 text-xs text-center font-body">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Create Room */}
              {tab === "create" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setTab("main")}
                    className="text-white/40 hover:text-white/70 text-xs font-body self-start transition-colors"
                  >
                    ← Back
                  </button>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-white/60 text-xs uppercase tracking-wider font-medium font-body"
                      htmlFor="ol-overs"
                    >
                      Overs per innings
                    </label>
                    <input
                      id="ol-overs"
                      data-ocid="online_lobby.input"
                      type="number"
                      min={1}
                      max={50}
                      value={maxOvers}
                      onChange={(e) =>
                        setMaxOvers(
                          Math.max(1, Math.min(50, Number(e.target.value))),
                        )
                      }
                      className="bg-white/5 border border-white/15 text-white rounded-lg px-3 py-2 text-sm w-28 focus:outline-none"
                      style={{ borderColor: `${pc}44` }}
                    />
                  </div>
                  <button
                    type="button"
                    data-ocid="online_lobby.confirm_button"
                    onClick={handleCreateRoom}
                    disabled={loading || !actor}
                    className="py-3 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all duration-150 hover:scale-105"
                    style={{
                      background: loading ? `${pc}66` : pc,
                      color: "#0B2E4E",
                      cursor: loading ? "wait" : "pointer",
                    }}
                  >
                    {loading ? "Creating..." : "Create Room"}
                  </button>
                  {error && (
                    <p className="text-red-400 text-xs text-center font-body">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Join Room */}
              {tab === "join" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setTab("main")}
                    className="text-white/40 hover:text-white/70 text-xs font-body self-start transition-colors"
                  >
                    ← Back
                  </button>
                  <div className="flex flex-col gap-2">
                    <label
                      className="text-white/60 text-xs uppercase tracking-wider font-medium font-body"
                      htmlFor="ol-room-code"
                    >
                      Room Code
                    </label>
                    <input
                      id="ol-room-code"
                      data-ocid="online_lobby.input"
                      type="text"
                      maxLength={12}
                      value={inputCode}
                      onChange={(e) =>
                        setInputCode(e.target.value.toUpperCase())
                      }
                      placeholder="e.g. ABC123"
                      className="bg-white/5 border border-white/15 text-white rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none uppercase"
                      style={{ borderColor: `${pc}44` }}
                    />
                  </div>
                  <button
                    type="button"
                    data-ocid="online_lobby.confirm_button"
                    onClick={handleJoinRoom}
                    disabled={loading || !actor}
                    className="py-3 rounded-xl font-display font-bold uppercase tracking-wider text-sm transition-all duration-150 hover:scale-105"
                    style={{
                      background: loading ? `${pc}66` : pc,
                      color: "#0B2E4E",
                      cursor: loading ? "wait" : "pointer",
                    }}
                  >
                    {loading ? "Joining..." : "Join Room"}
                  </button>
                  {error && (
                    <p className="text-red-400 text-xs text-center font-body">
                      {error}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Waiting for opponent */}
              {tab === "waiting" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-5"
                >
                  <button
                    type="button"
                    className="font-mono text-4xl font-extrabold tracking-[0.4em] px-6 py-4 rounded-xl flex items-center gap-3 cursor-pointer select-all"
                    style={{
                      background: `${pc}22`,
                      border: `2px solid ${pc}88`,
                      color: pc,
                    }}
                    onClick={copyCode}
                    title="Click to copy"
                    data-ocid="online_lobby.panel"
                  >
                    {roomCode}
                    <span className="text-sm text-white/40">📋</span>
                  </button>
                  <p className="font-body text-white/50 text-sm text-center">
                    Share this code with your opponent
                  </p>
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{
                      duration: 1.4,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="font-body text-xs uppercase tracking-widest"
                    style={{ color: pc }}
                    data-ocid="online_lobby.loading_state"
                  >
                    ⏳ Waiting for opponent to join...
                  </motion.div>
                  <button
                    type="button"
                    data-ocid="online_lobby.cancel_button"
                    onClick={() => {
                      stopPolling();
                      setTab("main");
                    }}
                    className="font-body text-xs text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}

              {/* Joined/Matched */}
              {tab === "joined" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4"
                  data-ocid="online_lobby.success_state"
                >
                  <span className="text-5xl">🏏</span>
                  <div
                    className="font-display text-2xl font-extrabold tracking-widest uppercase"
                    style={{ color: pc }}
                  >
                    {statusMsg || "Connected!"}
                  </div>
                  <p className="font-body text-white/40 text-sm">
                    Loading match...
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
