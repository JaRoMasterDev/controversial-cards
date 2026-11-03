// Pure game rules. Every function mutates the Room it is given and throws GameError
// for invalid moves. No I/O, timers or connections here — see lib/server/store.ts.

import { BUILT_IN_PACKS } from "@/lib/packs";
import { pickCount, validatePackInput } from "./cards";
import type {
  Action,
  AnswerCard,
  CardPack,
  Deck,
  PackSummary,
  Player,
  PromptCard,
  Room,
  RoomView,
  Round,
} from "./types";

import {
  DEFAULT_POINTS_TO_WIN,
  HAND_SIZE,
  MAX_CUSTOM_PACKS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MAX_POINTS_TO_WIN,
  MIN_PLAYERS_TO_CONTINUE,
  MIN_PLAYERS_TO_START,
  MIN_POINTS_TO_WIN,
  RESULT_DELAY_MS,
} from "./constants";

export * from "./constants";

export class GameError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "GameError";
  }
}

// ---------------------------------------------------------------------------
// Randomness

export function randomId(): string {
  return crypto.randomUUID();
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

// ---------------------------------------------------------------------------
// Room and players

export function createRoom(code: string, hostName: string, now = Date.now()): { room: Room; player: Player } {
  const player = newPlayer(cleanName(hostName), now);
  const room: Room = {
    code,
    hostId: player.id,
    phase: "lobby",
    players: [player],
    settings: {
      packIds: BUILT_IN_PACKS.length > 0 ? [BUILT_IN_PACKS[0].id] : [],
      pointsToWin: DEFAULT_POINTS_TO_WIN,
      handSize: HAND_SIZE,
    },
    customPacks: [],
    answers: { draw: [], discard: [] },
    prompts: { draw: [], discard: [] },
    round: null,
    judgeQueue: [],
    lastJudgeId: null,
    winnerId: null,
    notice: null,
    createdAt: now,
    updatedAt: now,
  };
  return { room, player };
}

/**
 * Adds a player. A name matching an inactive player reclaims that seat (score and hand),
 * so someone who lost their tab can get back in.
 */
export function addPlayer(room: Room, name: string, now = Date.now()): Player {
  const clean = cleanName(name);
  const existing = room.players.find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (existing) {
    if (existing.active) throw new GameError("That name is already taken in this room.", 409);
    existing.token = randomId();
    existing.active = true;
    ensureActiveHost(room);
    touch(room, now);
    return existing;
  }
  if (room.players.length >= MAX_PLAYERS) throw new GameError("This room is full.", 409);

  const player = newPlayer(clean, now);
  room.players.push(player);
  if (room.phase !== "lobby") {
    // Joins mid-game: dealt in now, plays from the next round, and gets a judge turn this cycle.
    player.hand = drawAnswers(room, room.settings.handSize);
    if (room.phase !== "gameOver") room.judgeQueue.splice(randomInt(room.judgeQueue.length + 1), 0, player.id);
  }
  ensureActiveHost(room);
  touch(room, now);
  return player;
}

/** Removes a player for good (left or kicked). Returns false when the room is now empty. */
export function removePlayer(room: Room, playerId: string, now = Date.now()): boolean {
  const player = getPlayer(room, playerId);
  room.players = room.players.filter((p) => p.id !== playerId);
  room.answers.discard.push(...player.hand);
  room.judgeQueue = room.judgeQueue.filter((id) => id !== playerId);
  if (room.players.length === 0) return false;

  ensureActiveHost(room);
  handleDeparture(room, player, true);
  touch(room, now);
  return true;
}

/** Marks a player as connected or away. Away players are skipped as judge and submitter. */
export function setActive(room: Room, playerId: string, active: boolean, now = Date.now()): void {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.active === active) return;
  player.active = active;
  ensureActiveHost(room);
  if (!active) handleDeparture(room, player, false);
  touch(room, now);
}

/** Keeps the host role with someone who is present: an away or departed host hands it on. */
function ensureActiveHost(room: Room): void {
  const host = room.players.find((p) => p.id === room.hostId);
  if (host?.active) return;
  const next = room.players.find((p) => p.active) ?? (host ? undefined : room.players[0]);
  if (next) room.hostId = next.id;
}

function handleDeparture(room: Room, player: Player, removed: boolean): void {
  const round = room.round;
  if (round && (room.phase === "playing" || room.phase === "judging")) {
    if (round.judgeId === player.id) {
      cancelRound(room, `${player.name} ${removed ? "left" : "went away"}, so the round restarts with a new judge.`);
      return;
    }
    if (removed) {
      round.participantIds = round.participantIds.filter((id) => id !== player.id);
      const own = round.submissions.find((s) => s.playerId === player.id);
      if (own) {
        round.submissions = round.submissions.filter((s) => s !== own);
        room.answers.discard.push(...own.cards);
      }
      if (room.phase === "judging" && round.submissions.length === 0) {
        cancelRound(room, "Every submission was withdrawn, so the round restarts.");
        return;
      }
    }
    maybeStartJudging(room);
  }
  if (isInGame(room) && activePlayers(room).length < MIN_PLAYERS_TO_CONTINUE) {
    returnToLobby(room, "Not enough players left to continue, so the game ended.");
  }
}

// ---------------------------------------------------------------------------
// Actions

/** Applies a player's action. Returns extra data for the caller (e.g. a new pack id). */
export function applyAction(room: Room, playerId: string, action: Action, now = Date.now()): { packId?: string } {
  getPlayer(room, playerId);
  const previousNotice = room.notice;
  room.notice = null;
  try {
    const result = dispatch(room, playerId, action, now);
    touch(room, now);
    return result;
  } catch (error) {
    // Moves are validated before anything changes, so a rejected move leaves the room as it was.
    room.notice = previousNotice;
    throw error;
  }
}

function dispatch(room: Room, playerId: string, action: Action, now: number): { packId?: string } {
  let result: { packId?: string } = {};
  switch (action?.type) {
    case "updateSettings":
      updateSettings(room, playerId, action.packIds, action.pointsToWin);
      break;
    case "importPack":
      result = { packId: importPack(room, playerId, action.name, action.prompts, action.answers) };
      break;
    case "removePack":
      removePack(room, playerId, action.packId);
      break;
    case "startGame":
      startGame(room, playerId);
      break;
    case "submit":
      submit(room, playerId, action.cardIds);
      break;
    case "pickWinner":
      pickWinner(room, playerId, action.submissionId, now);
      break;
    case "nextRound":
      if (room.hostId !== playerId && room.round?.judgeId !== playerId) {
        throw new GameError("Only the host or the judge can start the next round.", 403);
      }
      nextRound(room);
      break;
    case "kick":
      requireHost(room, playerId);
      if (action.playerId === playerId) throw new GameError("You can't kick yourself. Leave the room instead.");
      if (!room.players.some((p) => p.id === action.playerId)) throw new GameError("That player isn't in the room.", 404);
      removePlayer(room, action.playerId, now);
      break;
    case "leave":
      removePlayer(room, playerId, now);
      break;
    case "backToLobby":
      requireHost(room, playerId);
      if (room.phase === "lobby") throw new GameError("The room is already in the lobby.");
      returnToLobby(room, null);
      break;
    default:
      throw new GameError("Unknown action.");
  }
  return result;
}

function updateSettings(room: Room, playerId: string, packIds: unknown, pointsToWin: unknown): void {
  requireHost(room, playerId);
  requirePhase(room, "lobby", "gameOver");
  if (packIds !== undefined) {
    if (!Array.isArray(packIds) || !packIds.every((id) => typeof id === "string")) {
      throw new GameError("packIds must be a list of pack ids.");
    }
    const known = new Set(allPacks(room).map((p) => p.id));
    const unknown = packIds.find((id) => !known.has(id));
    if (unknown) throw new GameError(`Unknown card set: ${unknown}`, 404);
  }
  if (
    pointsToWin !== undefined &&
    (typeof pointsToWin !== "number" ||
      !Number.isInteger(pointsToWin) ||
      pointsToWin < MIN_POINTS_TO_WIN ||
      pointsToWin > MAX_POINTS_TO_WIN)
  ) {
    throw new GameError(`Points to win must be a whole number from ${MIN_POINTS_TO_WIN} to ${MAX_POINTS_TO_WIN}.`);
  }
  // Apply only once everything is valid, so a rejected change leaves the settings as they were.
  if (packIds !== undefined) room.settings.packIds = [...new Set(packIds as string[])];
  if (pointsToWin !== undefined) room.settings.pointsToWin = pointsToWin as number;
}

function importPack(room: Room, playerId: string, name: unknown, prompts: unknown, answers: unknown): string {
  requireHost(room, playerId);
  requirePhase(room, "lobby", "gameOver");
  if (room.customPacks.length >= MAX_CUSTOM_PACKS) {
    throw new GameError(`A room can hold at most ${MAX_CUSTOM_PACKS} imported card sets.`);
  }
  const result = validatePackInput(name, prompts, answers);
  if (!result.ok) throw new GameError(result.errors.slice(0, 5).join(" "));
  const pack: CardPack = { id: `custom-${randomId().slice(0, 8)}`, ...result.pack };
  room.customPacks.push(pack);
  room.settings.packIds.push(pack.id);
  return pack.id;
}

function removePack(room: Room, playerId: string, packId: string): void {
  requireHost(room, playerId);
  requirePhase(room, "lobby", "gameOver");
  if (!room.customPacks.some((p) => p.id === packId)) throw new GameError("Only imported card sets can be removed.", 404);
  room.customPacks = room.customPacks.filter((p) => p.id !== packId);
  room.settings.packIds = room.settings.packIds.filter((id) => id !== packId);
}

function startGame(room: Room, playerId: string): void {
  requireHost(room, playerId);
  requirePhase(room, "lobby", "gameOver");
  const players = activePlayers(room);
  if (players.length < MIN_PLAYERS_TO_START) {
    throw new GameError(`You need at least ${MIN_PLAYERS_TO_START} players to start.`);
  }
  const packs = allPacks(room).filter((p) => room.settings.packIds.includes(p.id));
  if (packs.length === 0) throw new GameError("Pick at least one card set.");

  const promptTexts = unique(packs.flatMap((p) => p.prompts));
  const answerTexts = unique(packs.flatMap((p) => p.answers));
  const neededAnswers = room.players.length * (room.settings.handSize + 1);
  if (promptTexts.length === 0) throw new GameError("The selected card sets have no questions.");
  if (answerTexts.length < neededAnswers) {
    throw new GameError(
      `The selected card sets have ${answerTexts.length} answers, but ${room.players.length} players need at least ${neededAnswers}.`,
    );
  }

  room.prompts = {
    draw: shuffle(promptTexts.map((text, i) => ({ id: `q${i}`, text, pick: pickCount(text) }))),
    discard: [],
  };
  room.answers = { draw: shuffle(answerTexts.map((text, i) => ({ id: `a${i}`, text }))), discard: [] };
  for (const p of room.players) {
    p.score = 0;
    p.hand = [];
  }
  room.round = null;
  room.judgeQueue = [];
  room.lastJudgeId = null;
  room.winnerId = null;
  startRound(room);
}

function submit(room: Room, playerId: string, cardIds: unknown): void {
  requirePhase(room, "playing");
  const round = room.round!;
  if (round.judgeId === playerId) throw new GameError("The judge doesn't play cards this round.", 403);
  if (!round.participantIds.includes(playerId)) throw new GameError("You'll be dealt in next round.", 403);
  if (round.submissions.some((s) => s.playerId === playerId)) throw new GameError("You already played this round.");
  if (!Array.isArray(cardIds) || !cardIds.every((id) => typeof id === "string")) {
    throw new GameError("cardIds must be a list of card ids.");
  }
  if (cardIds.length !== round.prompt.pick) throw new GameError(`Play exactly ${round.prompt.pick} card(s).`);
  if (new Set(cardIds).size !== cardIds.length) throw new GameError("You can't play the same card twice.");

  const player = getPlayer(room, playerId);
  const cards = cardIds.map((id) => {
    const card = player.hand.find((c) => c.id === id);
    if (!card) throw new GameError("That card isn't in your hand.");
    return card;
  });
  player.hand = player.hand.filter((c) => !cardIds.includes(c.id));
  round.submissions.push({ id: randomId(), playerId, cards });
  maybeStartJudging(room);
}

function pickWinner(room: Room, playerId: string, submissionId: unknown, now: number): void {
  requirePhase(room, "judging");
  const round = room.round!;
  if (round.judgeId !== playerId) throw new GameError("Only the judge picks the winner.", 403);
  const winning = round.submissions.find((s) => s.id === submissionId);
  if (!winning) throw new GameError("That submission doesn't exist.", 404);

  const winner = getPlayer(room, winning.playerId);
  winner.score += 1;
  round.winnerSubmissionId = winning.id;
  if (winner.score >= room.settings.pointsToWin) {
    room.phase = "gameOver";
    room.winnerId = winner.id;
    round.nextRoundAt = null;
  } else {
    room.phase = "roundResult";
    round.nextRoundAt = now + RESULT_DELAY_MS;
  }
}

/** Ends the shown round result and deals the next round. Called by players or the store's timer. */
export function nextRound(room: Room): void {
  requirePhase(room, "roundResult");
  const round = room.round!;
  room.prompts.discard.push(round.prompt);
  for (const s of round.submissions) room.answers.discard.push(...s.cards);
  room.notice = null;
  startRound(room);
}

// ---------------------------------------------------------------------------
// Round mechanics

function startRound(room: Room): void {
  const active = activePlayers(room);
  if (active.length < MIN_PLAYERS_TO_CONTINUE) {
    returnToLobby(room, "Not enough players left to continue, so the game ended.");
    return;
  }
  const judgeId = nextJudge(room);
  const prompt = drawPrompt(room);

  // Hands are topped up to the hand size, and for "Draw 2, Pick 3" prompts to pick - 1
  // above it. Topping up (rather than adding) keeps a restarted round from dealing twice.
  refillHands(room);
  const target = room.settings.handSize + (prompt.pick >= 3 ? prompt.pick - 1 : 0);
  for (const p of active) {
    if (p.id !== judgeId && p.hand.length < target) p.hand.push(...drawAnswers(room, target - p.hand.length));
  }
  // Someone holding fewer cards than the prompt needs (a nearly empty deck) sits the round out.
  const participantIds = active.filter((p) => p.id !== judgeId && p.hand.length >= prompt.pick).map((p) => p.id);
  if (participantIds.length === 0) {
    returnToLobby(room, "The answer deck ran out of cards, so the game ended. Add more card sets.");
    return;
  }

  const round: Round = {
    number: (room.round?.number ?? 0) + 1,
    judgeId,
    prompt,
    participantIds,
    submissions: [],
    winnerSubmissionId: null,
    nextRoundAt: null,
  };
  room.round = round;
  room.phase = "playing";
}

/**
 * Judges are drawn at random from a shuffled queue of active players, so the role
 * changes every round and everyone judges once per cycle before anyone repeats.
 */
function nextJudge(room: Room): string {
  const activeIds = activePlayers(room).map((p) => p.id);
  room.judgeQueue = room.judgeQueue.filter((id) => activeIds.includes(id));
  if (room.judgeQueue.length === 0) {
    const fresh = shuffle(activeIds);
    if (fresh.length > 1 && fresh[0] === room.lastJudgeId) fresh.push(fresh.shift()!);
    room.judgeQueue = fresh;
  }
  const id = room.judgeQueue.shift()!;
  room.lastJudgeId = id;
  return id;
}

function maybeStartJudging(room: Room): void {
  if (room.phase !== "playing" || !room.round) return;
  const round = room.round;
  const waiting = round.participantIds.filter((id) => {
    const p = room.players.find((pl) => pl.id === id);
    return p?.active && !round.submissions.some((s) => s.playerId === id);
  });
  if (waiting.length > 0) return;
  if (round.submissions.length === 0) {
    cancelRound(room, "Nobody was left to play a card, so the round restarts.");
    return;
  }
  round.submissions = shuffle(round.submissions);
  room.phase = "judging";
}

/** Abandons the current round: played cards go back to their owners and a new round starts. */
function cancelRound(room: Room, notice: string): void {
  const round = room.round!;
  for (const s of round.submissions) {
    const owner = room.players.find((p) => p.id === s.playerId);
    if (owner) owner.hand.push(...s.cards);
    else room.answers.discard.push(...s.cards);
  }
  room.prompts.draw.unshift(round.prompt);
  room.notice = notice;
  startRound(room);
  // startRound may have ended the game; keep the explanation from that instead.
  if (room.phase !== "lobby") room.notice = notice;
}

function returnToLobby(room: Room, notice: string | null): void {
  room.phase = "lobby";
  room.round = null;
  room.judgeQueue = [];
  for (const p of room.players) p.hand = [];
  room.notice = notice;
}

function refillHands(room: Room): void {
  for (const p of room.players) {
    const missing = room.settings.handSize - p.hand.length;
    if (missing > 0) p.hand.push(...drawAnswers(room, missing));
  }
}

function drawAnswers(room: Room, count: number): AnswerCard[] {
  const drawn: AnswerCard[] = [];
  for (let i = 0; i < count; i++) {
    const card = drawFrom(room.answers);
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

function drawPrompt(room: Room): PromptCard {
  const card = drawFrom(room.prompts);
  if (!card) throw new GameError("The question deck is empty.", 500);
  return card;
}

/** Draws from the top; reshuffles the discard pile into the deck when it runs out. */
function drawFrom<T>(deck: Deck<T>): T | undefined {
  if (deck.draw.length === 0 && deck.discard.length > 0) {
    deck.draw = shuffle(deck.discard);
    deck.discard = [];
  }
  return deck.draw.pop();
}

// ---------------------------------------------------------------------------
// Views

export function toView(room: Room, viewerId: string): RoomView {
  const me = getPlayer(room, viewerId);
  const round = room.round;
  const revealed = room.phase === "roundResult" || room.phase === "gameOver";
  const inRound = room.phase === "playing" || room.phase === "judging" || room.phase === "roundResult";
  const winning = round?.submissions.find((s) => s.id === round.winnerSubmissionId);

  return {
    code: room.code,
    phase: room.phase,
    you: { id: me.id, name: me.name, isHost: room.hostId === me.id, hand: me.hand },
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: room.hostId === p.id,
      isJudge: inRound && round?.judgeId === p.id,
      active: p.active,
      hasSubmitted: !!round?.submissions.some((s) => s.playerId === p.id),
    })),
    settings: { ...room.settings, packIds: [...room.settings.packIds] },
    packs: allPacks(room).map(summarize),
    round: round && {
      number: round.number,
      judgeId: round.judgeId,
      prompt: round.prompt,
      participantIds: [...round.participantIds],
      submittedCount: round.submissions.length,
      submissions:
        room.phase === "playing"
          ? []
          : round.submissions.map((s) => ({ id: s.id, cards: s.cards, playerId: revealed ? s.playerId : null })),
      yourSubmission: round.submissions.find((s) => s.playerId === viewerId)?.cards ?? null,
      winnerSubmissionId: round.winnerSubmissionId,
      winnerPlayerId: revealed && winning ? winning.playerId : null,
      nextRoundAt: round.nextRoundAt,
    },
    winnerId: room.winnerId,
    notice: room.notice,
    minPlayers: MIN_PLAYERS_TO_START,
  };
}

// ---------------------------------------------------------------------------
// Helpers

export function findPlayerByToken(room: Room, token: string): Player | undefined {
  return room.players.find((p) => p.token === token);
}

export function activePlayers(room: Room): Player[] {
  return room.players.filter((p) => p.active);
}

function allPacks(room: Room): CardPack[] {
  return [...BUILT_IN_PACKS, ...room.customPacks];
}

function summarize(pack: CardPack): PackSummary {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    language: pack.language,
    license: pack.source?.license,
    promptCount: pack.prompts.length,
    answerCount: pack.answers.length,
    custom: pack.id.startsWith("custom-"),
  };
}

function isInGame(room: Room): boolean {
  return room.phase === "playing" || room.phase === "judging" || room.phase === "roundResult";
}

function getPlayer(room: Room, playerId: string): Player {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new GameError("You're not in this room.", 403);
  return player;
}

function requireHost(room: Room, playerId: string): void {
  if (room.hostId !== playerId) throw new GameError("Only the host can do that.", 403);
}

function requirePhase(room: Room, ...phases: Room["phase"][]): void {
  if (!phases.includes(room.phase)) throw new GameError("You can't do that right now.", 409);
}

function newPlayer(name: string, now: number): Player {
  return { id: randomId(), token: randomId(), name, score: 0, hand: [], active: true, joinedAt: now };
}

export function cleanName(name: unknown): string {
  const clean = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!clean) throw new GameError("Enter a name.");
  if (clean.length > MAX_NAME_LENGTH) throw new GameError(`Names can be at most ${MAX_NAME_LENGTH} characters.`);
  return clean;
}

function unique(texts: string[]): string[] {
  const seen = new Set<string>();
  return texts.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function touch(room: Room, now: number): void {
  room.updatedAt = now;
}
