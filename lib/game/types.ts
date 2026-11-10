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

/**
 * "judging" is the phase in which the winner is decided: by the judge (or leader), or by
 * everyone's votes in a voting round.
 */
export type Phase = "lobby" | "playing" | "judging" | "roundResult" | "gameOver";

/**
 * How a round's winner is chosen. "vote": everyone plays and then votes for their favourite
 * answer. "judge": a rotating judge picks it. Either way, a game with exactly two active
 * players plays two-player rounds, where a rotating leader plays too and picks the winner.
 */
export type GameMode = "vote" | "judge";

export interface Settings {
  packIds: string[];
  pointsToWin: number;
  handSize: number;
  mode: GameMode;
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

export interface Vote {
  playerId: string;
  submissionId: string;
}

export interface Round {
  number: number;
  /** Null in voting rounds, which have no judge. */
  judgeId: string | null;
  /** Two-player round: the judge (called the leader) plays a card too, then picks the winner. */
  twoPlayer: boolean;
  /** Voting round: every participant plays, then votes for one answer other than their own. */
  voting: boolean;
  prompt: PromptCard;
  /** Players expected to submit (and, in voting rounds, to vote) this round (snapshot at round start). */
  participantIds: string[];
  submissions: Submission[];
  votes: Vote[];
  /** Several in a voting round when answers tie for the most votes; each author scores. */
  winnerSubmissionIds: string[];
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
  /** True when this player has already voted this round (voting rounds only). */
  hasVoted: boolean;
}

export interface SubmissionView {
  id: string;
  cards: AnswerCard[];
  /** Only revealed in roundResult / gameOver. */
  playerId: string | null;
  /** Whether the viewer played this submission. */
  yours: boolean;
  /** Votes received; only in voting rounds, once the result is shown. */
  votes: number | null;
}

export interface RoundView {
  number: number;
  /** Null in voting rounds. */
  judgeId: string | null;
  /** The judge plays too and picks between the two answers, their own included. */
  twoPlayer: boolean;
  /** Everyone plays, then everyone votes. */
  voting: boolean;
  prompt: PromptCard;
  participantIds: string[];
  submittedCount: number;
  /** Participants who can vote: everyone with someone else's answer to vote for (voting rounds only). */
  voterIds: string[];
  votedCount: number;
  /** Empty while playing; shuffled and anonymous while judging; attributed afterwards. */
  submissions: SubmissionView[];
  yourSubmission: AnswerCard[] | null;
  /** The submission you voted for, if any. */
  yourVote: string | null;
  winnerSubmissionIds: string[];
  /** Revealed with the result; one entry per winning submission, in the same order. */
  winnerPlayerIds: string[];
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
  | { type: "updateSettings"; packIds?: string[]; pointsToWin?: number; mode?: GameMode }
  | { type: "importPack"; name: string; prompts: unknown; answers: unknown }
  | { type: "removePack"; packId: string }
  | { type: "startGame" }
  | { type: "submit"; cardIds: string[] }
  | { type: "pickWinner"; submissionId: string }
  | { type: "vote"; submissionId: string }
  | { type: "nextRound" }
  | { type: "kick"; playerId: string }
  | { type: "leave" }
  | { type: "backToLobby" };

/** Messages pushed over the SSE stream GET /api/rooms/[code]/events */
export type ServerEvent =
  | { type: "state"; view: RoomView }
  | { type: "removed"; reason: "kicked" | "left" }
  | { type: "error"; code: "ROOM_NOT_FOUND" | "INVALID_TOKEN"; message: string };
