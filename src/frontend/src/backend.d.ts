import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Room {
    code: string;
    player1Joined: boolean;
    state: RoomGameState;
    player2Joined: boolean;
    phase: string;
    maxOvers: bigint;
}
export interface RoomGameState {
    inningsBreak: boolean;
    wickets1: bigint;
    wickets2: bigint;
    ballState: string;
    balls1: bigint;
    balls2: bigint;
    overs1: bigint;
    overs2: bigint;
    currentInnings: bigint;
    gameOver: boolean;
    lastEvent: string;
    runs1: bigint;
    runs2: bigint;
}
export interface Score {
    player: string;
    score: bigint;
}
export interface backendInterface {
    createRoom(maxOvers: bigint): Promise<string>;
    getRoom(code: string): Promise<Room | null>;
    getTopScores(): Promise<Array<Score>>;
    joinRoom(code: string): Promise<boolean>;
    listOpenRooms(): Promise<Array<string>>;
    quickMatch(): Promise<string>;
    submitScore(player: string, score: bigint): Promise<void>;
    updateRoomState(code: string, state: RoomGameState): Promise<boolean>;
}
