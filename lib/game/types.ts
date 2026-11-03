// Shared game types. Used by the server (engine, store, API routes) and the client (UI).

/** A named set of cards. Prompts use "_" (or a run of underscores) for each blank. */
export interface CardPack {
  id: string;
  name: string;
  description?: string;
  /** BCP 47 language tag of the card text, e.g. "en" or "de". */
  language?: string;
  /** Set for cards adapted from someone else's work: who to credit and under which licence. */
  source?: PackSource;
  prompts: string[];
  answers: string[];
}

/** Attribution for an adapted set, shown on the credits page as its licence requires. */
export interface PackSource {
  /** Title of the original work. */
  title: string;
  /** Author or publisher of the original work. */
  author: string;
  /** The edition the cards were taken from, e.g. "German print-and-play edition". */
  edition: string;
  /** Copyright notice printed on the original, kept as the licence asks. */
  copyright?: string;
  url: string;
  license: string;
  licenseUrl: string;
}

export interface PackSummary {
  id: string;
  name: string;
  description?: string;
  language?: string;
  /** Licence name for adapted sets, e.g. "CC BY-NC-SA 2.0". */
  license?: string;
  promptCount: number;
  answerCount: number;
  custom: boolean;
}

export interface AnswerCard {
  id: string;
  text: string;
}

export interface PromptCard {
  id: string;
  text: string;
  /** How many answer cards a player must play (number of blanks, minimum 1). */
  pick: number;
}

export type Phase = "lobby" | "playing" | "judging" | "roundResult" | "gameOver";

export interface Settings {
  packIds: string[];
  pointsToWin: number;
  handSize: number;
}

export interface Player {
  id: string;
  token: string;
  name: string;
  score: number;
  hand: AnswerCard[];
  /** False once the player has had no open connection for the grace period. */
  active: boolean;
  joinedAt: number;
}

export interface Submission {
  id: string;
  playerId: string;
  cards: AnswerCard[];
}

export interface Round {
  number: number;
  judgeId: string;
  prompt: PromptCard;
  /** Players expected to submit this round (snapshot at round start). */
  participantIds: string[];
  submissions: Submission[];
  winnerSubmissionId: string | null;
  /** Epoch ms when the next round starts automatically (roundResult phase only). */
  nextRoundAt: number | null;
}

export interface Deck<T> {
  draw: T[];
  discard: T[];
}

export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  settings: Settings;
  customPacks: CardPack[];
  answers: Deck<AnswerCard>;
  prompts: Deck<PromptCard>;
  round: Round | null;
  /** Shuffled order of players still due to judge in the current cycle. */
  judgeQueue: string[];
  lastJudgeId: string | null;
  winnerId: string | null;
  /** Short message shown to everyone, e.g. why a round was restarted. */
  notice: string | null;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Client-facing view of a room, personalised per player. Never contains other
// players' hands or tokens, and hides who submitted what until the result.

export interface PlayerView {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isJudge: boolean;
  active: boolean;
  /** True when this player is a participant who has already played this round. */
  hasSubmitted: boolean;
}

export interface SubmissionView {
  id: string;
  cards: AnswerCard[];
  /** Only revealed in roundResult / gameOver. */
  playerId: string | null;
}

export interface RoundView {
  number: number;
  judgeId: string;
  prompt: PromptCard;
  participantIds: string[];
  submittedCount: number;
  /** Empty while playing; shuffled and anonymous while judging; attributed afterwards. */
  submissions: SubmissionView[];
  yourSubmission: AnswerCard[] | null;
  winnerSubmissionId: string | null;
  winnerPlayerId: string | null;
  nextRoundAt: number | null;
}

export interface RoomView {
  code: string;
  phase: Phase;
  you: { id: string; name: string; isHost: boolean; hand: AnswerCard[] };
  hostId: string;
  players: PlayerView[];
  settings: Settings;
  packs: PackSummary[];
  round: RoundView | null;
  winnerId: string | null;
  notice: string | null;
  minPlayers: number;
}

// ---------------------------------------------------------------------------
// Actions a player can send to POST /api/rooms/[code]/action

export type Action =
  | { type: "updateSettings"; packIds?: string[]; pointsToWin?: number }
  | { type: "importPack"; name: string; prompts: unknown; answers: unknown }
  | { type: "removePack"; packId: string }
  | { type: "startGame" }
  | { type: "submit"; cardIds: string[] }
  | { type: "pickWinner"; submissionId: string }
  | { type: "nextRound" }
  | { type: "kick"; playerId: string }
  | { type: "leave" }
  | { type: "backToLobby" };

/** Messages pushed over the SSE stream GET /api/rooms/[code]/events */
export type ServerEvent =
  | { type: "state"; view: RoomView }
  | { type: "removed"; reason: "kicked" | "left" }
  | { type: "error"; code: "ROOM_NOT_FOUND" | "INVALID_TOKEN"; message: string };
