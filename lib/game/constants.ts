// Game limits shared by the engine and the UI. Kept free of imports so the client can
// use them without pulling in the engine (and the built-in card packs).

export const MIN_PLAYERS_TO_START = 3;
/** Below this many active players a running game returns to the lobby. */
export const MIN_PLAYERS_TO_CONTINUE = 2;
export const MAX_PLAYERS = 16;
export const HAND_SIZE = 10;
export const DEFAULT_POINTS_TO_WIN = 7;
export const MIN_POINTS_TO_WIN = 1;
export const MAX_POINTS_TO_WIN = 30;
export const MAX_CUSTOM_PACKS = 10;
export const MAX_NAME_LENGTH = 24;
export const RESULT_DELAY_MS = 12_000;
