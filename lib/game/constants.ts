// Game limits shared by the engine and the UI. Kept free of imports so the client can
// use them without pulling in the engine (and the built-in card packs).

/** With exactly two players, rounds switch to two-player mode: the leader (judge) plays a card too. */
export const MIN_PLAYERS_TO_START = 2;
/** Below this many active players a running game pauses until someone is back. */
export const MIN_PLAYERS_TO_CONTINUE = 2;
/** Voting rounds need this many active players; with fewer (two), rounds have a leader instead. */
export const MIN_PLAYERS_TO_VOTE = 3;
export const MAX_PLAYERS = 16;
export const HAND_SIZE = 10;
export const DEFAULT_POINTS_TO_WIN = 7;
/** New rooms let everyone vote for the best answer; the host can switch to a rotating judge. */
export const DEFAULT_MODE = "vote" as const;
export const MIN_POINTS_TO_WIN = 1;
export const MAX_POINTS_TO_WIN = 30;
export const MAX_CUSTOM_PACKS = 10;
export const MAX_NAME_LENGTH = 24;
export const RESULT_DELAY_MS = 12_000;
/** The live stream sends a ping this often; a client that hears nothing for longer reconnects. */
export const PING_INTERVAL_MS = 20_000;
