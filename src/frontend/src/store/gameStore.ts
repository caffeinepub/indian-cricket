import { create } from "zustand";

export type BallState = "idle" | "bowled" | "hit" | "dead";
export type UmpireSignal = "none" | "four" | "six" | "out" | "wide";
export type BowlingLength = "full" | "good" | "short";

export interface Player {
  id: number;
  name: string;
  jerseyNumber: number;
}

const DEFAULT_PLAYERS: Player[] = [
  { id: 1, name: "Rohit Sharma", jerseyNumber: 45 },
  { id: 2, name: "Shubman Gill", jerseyNumber: 77 },
  { id: 3, name: "Virat Kohli", jerseyNumber: 18 },
  { id: 4, name: "Shreyas Iyer", jerseyNumber: 41 },
  { id: 5, name: "KL Rahul", jerseyNumber: 1 },
  { id: 6, name: "Hardik Pandya", jerseyNumber: 228 },
  { id: 7, name: "Ravindra Jadeja", jerseyNumber: 8 },
  { id: 8, name: "R Ashwin", jerseyNumber: 99 },
  { id: 9, name: "Jasprit Bumrah", jerseyNumber: 93 },
  { id: 10, name: "Mohammed Siraj", jerseyNumber: 16 },
  { id: 11, name: "Mohammed Shami", jerseyNumber: 11 },
];

const STORAGE_KEY = "cricket_team_settings";

export interface TeamSettings {
  teamName: string;
  opponentName: string;
  players: Player[];
  primaryColor: string;
  secondaryColor: string;
  maxOvers: number;
  helmetColor: string;
  batColor: string;
  padsColor: string;
  glovesColor: string;
  skinTone: string;
}

interface InningsScore {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
}

interface GameStore extends TeamSettings {
  runs: number;
  wickets: number;
  balls: number;
  overs: number;
  ballState: BallState;
  lastEvent: string;
  shotDirection: "offside" | "straight" | "legside";
  bowlingType: "pacer" | "spinner";
  bowlingVariant: string;
  replayActive: boolean;
  replayEvent: string;

  // New: bowling controls
  bowlingLength: BowlingLength;
  setBowlingLength: (l: BowlingLength) => void;
  bowlingSpeed: number; // 0-100
  setBowlingSpeed: (s: number) => void;

  // New: umpire
  umpireSignal: UmpireSignal;
  setUmpireSignal: (s: UmpireSignal) => void;

  lightingMode: "day" | "night";
  setLightingMode: (m: "day" | "night") => void;

  onlineRoomCode: string;
  onlinePlayerRole: "host" | "guest" | null;
  onlineConnected: boolean;
  setOnlineRoom: (code: string, role: "host" | "guest") => void;
  setOnlineConnected: (v: boolean) => void;
  clearOnlineRoom: () => void;

  multiplayerEnabled: boolean;
  currentInnings: 1 | 2;
  innings1Score: InningsScore;
  innings2Score: InningsScore;
  inningsBreak: boolean;
  gameOver: boolean;
  currentBattingPlayer: 1 | 2;

  bowl: () => void;
  swing: () => void;
  addRuns: (n: number, shotName?: string) => void;
  takeWicket: (dismissalType?: string) => void;
  resetBall: () => void;
  setShotDirection: (d: "offside" | "straight" | "legside") => void;
  setBowlingType: (t: "pacer" | "spinner") => void;
  setBowlingVariant: (v: string) => void;
  startReplay: (event: string) => void;
  endReplay: () => void;
  setTeamSettings: (settings: Partial<TeamSettings>) => void;
  saveTeamSettings: () => void;
  loadTeamSettings: () => void;
  startMultiplayer: (maxOvers: number) => void;
  endInnings: () => void;
  startInnings2: () => void;
  endGame: () => void;
  resetMultiplayer: () => void;
}

function loadFromStorage(): Partial<TeamSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TeamSettings>;
      if (parsed.players) {
        parsed.players = parsed.players.map((p, i) => {
          if (typeof p.id === "number") return p;
          return { ...p, id: i + 1 };
        });
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

const saved = loadFromStorage();

// Umpire signal auto-reset timers
let umpireResetTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  runs: 0,
  wickets: 0,
  balls: 0,
  overs: 0,
  ballState: "idle",
  lastEvent: "",
  shotDirection: "straight",
  bowlingType: "pacer",
  bowlingVariant: "swing_in",
  replayActive: false,
  replayEvent: "",

  bowlingLength: "good",
  setBowlingLength: (l) => set({ bowlingLength: l }),
  bowlingSpeed: 50,
  setBowlingSpeed: (s) => set({ bowlingSpeed: s }),

  umpireSignal: "none",
  setUmpireSignal: (s) => {
    if (umpireResetTimer) clearTimeout(umpireResetTimer);
    set({ umpireSignal: s });
    if (s !== "none") {
      umpireResetTimer = setTimeout(() => {
        set({ umpireSignal: "none" });
        umpireResetTimer = null;
      }, 2800);
    }
  },

  teamName: saved.teamName ?? "India",
  opponentName: saved.opponentName ?? "Australia",
  players: saved.players ?? DEFAULT_PLAYERS,
  primaryColor: saved.primaryColor ?? "#F36C21",
  secondaryColor: saved.secondaryColor ?? "#138808",
  maxOvers: saved.maxOvers ?? 5,
  helmetColor: saved.helmetColor ?? "#003d99",
  batColor: saved.batColor ?? "#8B5E3C",
  padsColor: saved.padsColor ?? "#e8e8e8",
  glovesColor: saved.glovesColor ?? "#dddddd",
  skinTone: saved.skinTone ?? "#f5c5a3",

  lightingMode: "day",
  setLightingMode: (m) => set({ lightingMode: m }),

  onlineRoomCode: "",
  onlinePlayerRole: null,
  onlineConnected: false,
  setOnlineRoom: (code, role) =>
    set({ onlineRoomCode: code, onlinePlayerRole: role }),
  setOnlineConnected: (v) => set({ onlineConnected: v }),
  clearOnlineRoom: () =>
    set({ onlineRoomCode: "", onlinePlayerRole: null, onlineConnected: false }),

  multiplayerEnabled: false,
  currentInnings: 1,
  innings1Score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
  innings2Score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
  inningsBreak: false,
  gameOver: false,
  currentBattingPlayer: 2,

  bowl: () =>
    set((s) => {
      if (s.ballState !== "idle") return s;
      const newBalls = s.balls + 1;
      const over = newBalls >= 6;
      const newOvers = over ? s.overs + 1 : s.overs;
      const finalBalls = over ? 0 : newBalls;
      if (s.multiplayerEnabled && newOvers >= s.maxOvers) {
        setTimeout(() => get().endInnings(), 1000);
      }
      return {
        ballState: "bowled",
        balls: finalBalls,
        overs: newOvers,
        lastEvent: "Bowled!",
      };
    }),

  swing: () =>
    set((s) => (s.ballState === "bowled" ? { ballState: "hit" } : s)),

  addRuns: (n, shotName?: string) => {
    const label =
      n === 0
        ? "Miss!"
        : n === 4
          ? "FOUR! 🎯"
          : n === 6
            ? "SIX! 🚀"
            : `${n} Run${n === 1 ? "" : "s"}!`;
    const eventText = shotName ? `${shotName} — ${label}` : label;
    set((s) => ({ runs: s.runs + n, lastEvent: eventText }));
    if (n === 4) get().setUmpireSignal("four");
    else if (n >= 6) get().setUmpireSignal("six");
    if (n >= 4) get().startReplay(n === 6 ? "SIX! 🚀" : "BOUNDARY! 🎯");
  },

  takeWicket: (dismissalType?: string) => {
    set((s) => {
      const newWickets = s.wickets + 1;
      if (s.multiplayerEnabled && newWickets >= 10)
        setTimeout(() => get().endInnings(), 1000);
      const eventText = dismissalType ? `${dismissalType} 🏏` : "WICKET! 🏏";
      return { wickets: newWickets, lastEvent: eventText };
    });
    get().setUmpireSignal("out");
    get().startReplay(dismissalType ? `${dismissalType}!` : "WICKET! 🏏");
  },

  resetBall: () => set({ ballState: "idle" }),
  setShotDirection: (d) => set({ shotDirection: d }),
  setBowlingType: (t) => set({ bowlingType: t }),
  setBowlingVariant: (v) => set({ bowlingVariant: v }),

  startReplay: (event: string) => {
    set({ replayActive: true, replayEvent: event });
    setTimeout(() => get().endReplay(), 5000);
  },

  endReplay: () => set({ replayActive: false }),
  setTeamSettings: (settings) => set((s) => ({ ...s, ...settings })),

  saveTeamSettings: () => {
    const s = get();
    const data: TeamSettings = {
      teamName: s.teamName,
      opponentName: s.opponentName,
      players: s.players,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      maxOvers: s.maxOvers,
      helmetColor: s.helmetColor,
      batColor: s.batColor,
      padsColor: s.padsColor,
      glovesColor: s.glovesColor,
      skinTone: s.skinTone,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  },

  loadTeamSettings: () => {
    const data = loadFromStorage();
    set((s) => ({ ...s, ...data }));
  },

  startMultiplayer: (maxOvers: number) =>
    set({
      multiplayerEnabled: true,
      maxOvers,
      currentInnings: 1,
      currentBattingPlayer: 2,
      runs: 0,
      wickets: 0,
      balls: 0,
      overs: 0,
      innings1Score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      innings2Score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      inningsBreak: false,
      gameOver: false,
      ballState: "idle",
      lastEvent: "",
    }),

  endInnings: () => {
    const s = get();
    if (s.currentInnings === 1) {
      set({
        innings1Score: {
          runs: s.runs,
          wickets: s.wickets,
          overs: s.overs,
          balls: s.balls,
        },
        inningsBreak: true,
        ballState: "idle",
      });
    } else {
      set({
        innings2Score: {
          runs: s.runs,
          wickets: s.wickets,
          overs: s.overs,
          balls: s.balls,
        },
        gameOver: true,
        ballState: "idle",
      });
    }
  },

  startInnings2: () =>
    set({
      currentInnings: 2,
      currentBattingPlayer: 1,
      runs: 0,
      wickets: 0,
      balls: 0,
      overs: 0,
      inningsBreak: false,
      ballState: "idle",
      lastEvent: "",
    }),

  endGame: () => set({ gameOver: true }),

  resetMultiplayer: () =>
    set({
      multiplayerEnabled: false,
      gameOver: false,
      inningsBreak: false,
      currentInnings: 1,
      currentBattingPlayer: 2,
      runs: 0,
      wickets: 0,
      balls: 0,
      overs: 0,
      innings1Score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      innings2Score: { runs: 0, wickets: 0, overs: 0, balls: 0 },
      lastEvent: "",
      ballState: "idle",
    }),
}));
