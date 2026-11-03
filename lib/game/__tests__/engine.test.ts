import { describe, expect, it, vi } from "vitest";

// Built-in packs are content owned by someone else; keep the engine tests independent of
// them. Every deck below comes from a pack imported through the engine's own action.
vi.mock("@/lib/packs", () => ({ BUILT_IN_PACKS: [] }));

import {
  activePlayers,
  addPlayer,
  applyAction,
  createRoom,
  findPlayerByToken,
  GameError,
  HAND_SIZE,
  MAX_PLAYERS,
  nextRound,
  removePlayer,
  RESULT_DELAY_MS,
  setActive,
  toView,
} from "../engine";
import type { Action, Player, Room, Submission } from "../types";

// ---------------------------------------------------------------------------
// Fixtures and helpers

const PICK1_PROMPTS = [
  "What's that smell?",
  "I never leave home without _.",
  "Why am I sticky?",
  "My secret talent: ___.",
  "_ is the future.",
];
const PICK2_PROMPTS = ["_ plus _ equals trouble.", "I traded _ for ___."];
const PICK3_PROMPTS = ["_ + _ = _.", "First _, then _, finally _."];

function makeAnswers(count: number, prefix = "Answer"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}.`);
}

interface SetupOptions {
  players?: number;
  prompts?: string[];
  answers?: number | string[];
  pointsToWin?: number;
}

interface Setup {
  room: Room;
  host: Player;
  players: Player[];
  packId: string;
}

/** A lobby with `players` players (host first) and a single imported test pack selected. */
function setupLobby({ players = 4, prompts = PICK1_PROMPTS, answers = 200, pointsToWin = 30 }: SetupOptions = {}): Setup {
  const { room, player: host } = createRoom("TEST", "Host");
  const all = [host];
  for (let i = 1; i < players; i++) all.push(addPlayer(room, `Player ${i}`));
  const answerTexts = typeof answers === "number" ? makeAnswers(answers) : answers;
  const { packId } = applyAction(room, host.id, { type: "importPack", name: "Test pack", prompts, answers: answerTexts });
  expect(packId).toBeTruthy();
  applyAction(room, host.id, { type: "updateSettings", packIds: [packId!], pointsToWin });
  return { room, host, players: all, packId: packId! };
}

function startGame(options: SetupOptions = {}): Setup {
  const setup = setupLobby(options);
  applyAction(setup.room, setup.host.id, { type: "startGame" });
  return setup;
}

/** Casts deliberately malformed actions (as a client could send them) to the Action type. */
function raw(action: Record<string, unknown>): Action {
  return action as unknown as Action;
}

function player(room: Room, id: string): Player {
  const found = room.players.find((p) => p.id === id);
  if (!found) throw new Error(`No player ${id}`);
  return found;
}

function judgeOf(room: Room): string {
  return room.round!.judgeId;
}

function handIds(room: Room, id: string): string[] {
  return player(room, id).hand.map((c) => c.id);
}

function firstCards(room: Room, id: string, count = room.round!.prompt.pick): string[] {
  return handIds(room, id).slice(0, count);
}

function submit(room: Room, id: string, cardIds = firstCards(room, id)): void {
  applyAction(room, id, { type: "submit", cardIds });
}

/** Active participants who still have to play this round. */
function pending(room: Room): string[] {
  const round = room.round!;
  return round.participantIds.filter(
    (id) => player(room, id).active && !round.submissions.some((s) => s.playerId === id),
  );
}

function submitAll(room: Room): void {
  for (const id of pending(room)) submit(room, id);
}

function submissionOf(room: Room, id: string): Submission {
  const found = room.round!.submissions.find((s) => s.playerId === id);
  if (!found) throw new Error(`No submission by ${id}`);
  return found;
}

/** Judge picks the submission whose author has the lowest score, which keeps games long. */
function pickLowest(room: Room, now?: number): Submission {
  const winning = [...room.round!.submissions].sort(
    (a, b) => player(room, a.playerId).score - player(room, b.playerId).score,
  )[0];
  applyAction(room, judgeOf(room), { type: "pickWinner", submissionId: winning.id }, now);
  return winning;
}

/** Plays a full round: everyone submits, the judge picks, the next round is dealt. */
function playRound(room: Room): void {
  submitAll(room);
  expect(room.phase).toBe("judging");
  pickLowest(room);
  expect(room.phase).toBe("roundResult");
  nextRound(room);
  expect(room.phase).toBe("playing");
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("Expected a GameError, but nothing was thrown.");
}

function expectGameError(fn: () => unknown, message?: RegExp, status?: number): GameError {
  const error = catchError(fn);
  expect(error).toBeInstanceOf(GameError);
  if (message) expect((error as GameError).message).toMatch(message);
  if (status !== undefined) expect((error as GameError).status).toBe(status);
  return error as GameError;
}

/** The action must throw a GameError and leave every part of the room as it was. */
function expectRejected(room: Room, playerId: string, action: Action, status?: number): GameError {
  const before = structuredClone(room);
  const error = expectGameError(() => applyAction(room, playerId, action), undefined, status);
  expect(room).toEqual(before);
  return error;
}

/** Every answer card is in exactly one place: a hand, a submission, the draw pile or the discard pile. */
function expectAnswersConserved(room: Room, total: number): void {
  const ids = [
    ...room.players.flatMap((p) => p.hand.map((c) => c.id)),
    ...(room.round?.submissions.flatMap((s) => s.cards.map((c) => c.id)) ?? []),
    ...room.answers.draw.map((c) => c.id),
    ...room.answers.discard.map((c) => c.id),
  ];
  expect(ids).toHaveLength(total);
  expect(new Set(ids).size).toBe(total);
}

function expectPromptsConserved(room: Room, total: number): void {
  const ids = [
    ...(room.round ? [room.round.prompt.id] : []),
    ...room.prompts.draw.map((c) => c.id),
    ...room.prompts.discard.map((c) => c.id),
  ];
  expect(ids).toHaveLength(total);
  expect(new Set(ids).size).toBe(total);
}

/** Small seeded PRNG so the randomised tests replay the same move sequence. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------

describe("starting a game", () => {
  it("can only be done by the host", () => {
    const { room, players } = setupLobby({ players: 4 });
    expectRejected(room, players[1].id, { type: "startGame" }, 403);
    expect(room.phase).toBe("lobby");
  });

  it("needs at least 3 active players", () => {
    const two = setupLobby({ players: 2 });
    expectGameError(() => applyAction(two.room, two.host.id, { type: "startGame" }), /at least 3 players/);
    expect(two.room.phase).toBe("lobby");

    const { room, host, players } = setupLobby({ players: 3 });
    setActive(room, players[2].id, false);
    expectRejected(room, host.id, { type: "startGame" });

    setActive(room, players[2].id, true);
    applyAction(room, host.id, { type: "startGame" });
    expect(room.phase).toBe("playing");
  });

  it("needs at least one card set selected", () => {
    const { room, host } = setupLobby({ players: 3 });
    applyAction(room, host.id, { type: "updateSettings", packIds: [] });
    expectGameError(() => applyAction(room, host.id, { type: "startGame" }), /card set/);
    expect(room.phase).toBe("lobby");
  });

  it("needs at least one question", () => {
    const { room, player: host } = createRoom("TEST", "Host");
    addPlayer(room, "B");
    addPlayer(room, "C");
    const { packId } = applyAction(room, host.id, {
      type: "importPack",
      name: "Answers only",
      prompts: [],
      answers: makeAnswers(100),
    });
    applyAction(room, host.id, { type: "updateSettings", packIds: [packId!] });
    expectGameError(() => applyAction(room, host.id, { type: "startGame" }), /no questions/);
    expect(room.phase).toBe("lobby");
  });

  it.each([3, 4, 6])("needs at least players × (handSize + 1) answers (%i players)", (count) => {
    const needed = count * (HAND_SIZE + 1);

    const short = setupLobby({ players: count, answers: needed - 1 });
    expectGameError(() => applyAction(short.room, short.host.id, { type: "startGame" }), /answers/);
    expect(short.room.phase).toBe("lobby");

    const exact = startGame({ players: count, answers: needed });
    expect(exact.room.phase).toBe("playing");
  });

  it("counts answers shared by several selected sets only once", () => {
    const { room, host, packId } = setupLobby({ players: 3, answers: 20 });
    const { packId: second } = applyAction(room, host.id, {
      type: "importPack",
      name: "Same answers, shouted",
      prompts: ["Why _?"],
      answers: makeAnswers(20).map((a) => a.toUpperCase()),
    });
    applyAction(room, host.id, { type: "updateSettings", packIds: [packId, second!] });
    expectGameError(() => applyAction(room, host.id, { type: "startGame" }), /20 answers/);
  });

  it("can't be started while a game is running", () => {
    const { room, host } = startGame({ players: 3 });
    expectRejected(room, host.id, { type: "startGame" }, 409);
  });

  it("deals every player 10 unique cards, resets scores and starts round 1", () => {
    const { room } = startGame({ players: 5, answers: 200 });
    expect(room.phase).toBe("playing");
    expect(room.winnerId).toBeNull();
    for (const p of room.players) {
      expect(p.hand).toHaveLength(HAND_SIZE);
      expect(p.score).toBe(0);
    }
    const dealt = room.players.flatMap((p) => p.hand.map((c) => c.id));
    expect(new Set(dealt).size).toBe(dealt.length);

    const round = room.round!;
    expect(round.number).toBe(1);
    expect(PICK1_PROMPTS).toContain(round.prompt.text);
    expect(round.submissions).toEqual([]);
    expect(round.participantIds.sort()).toEqual(
      room.players
        .filter((p) => p.id !== round.judgeId)
        .map((p) => p.id)
        .sort(),
    );
    expectAnswersConserved(room, 200);
    expectPromptsConserved(room, PICK1_PROMPTS.length);
  });

  it("resets scores and hands when a finished game is started again", () => {
    const { room, host } = startGame({ players: 3, pointsToWin: 1 });
    submitAll(room);
    pickLowest(room);
    expect(room.phase).toBe("gameOver");
    expect(room.players.some((p) => p.score === 1)).toBe(true);

    applyAction(room, host.id, { type: "startGame" });
    expect(room.phase).toBe("playing");
    expect(room.winnerId).toBeNull();
    expect(room.round!.number).toBe(1);
    for (const p of room.players) {
      expect(p.score).toBe(0);
      expect(p.hand).toHaveLength(HAND_SIZE);
    }
  });
});

describe("the judge", () => {
  it("is a random active player", () => {
    const firstJudges = new Map<string, number>();
    for (let game = 0; game < 60; game++) {
      const { room } = startGame({ players: 3 });
      const name = player(room, judgeOf(room)).name;
      firstJudges.set(name, (firstJudges.get(name) ?? 0) + 1);
    }
    // P(some player is never picked in 60 fair draws) ≈ 3 · (2/3)^60 ≈ 1e-10.
    expect([...firstJudges.keys()].sort()).toEqual(["Host", "Player 1", "Player 2"]);
  });

  it("is never an away player, and away players don't play", () => {
    const { room, host, players } = setupLobby({ players: 4 });
    const away = players[3];
    setActive(room, away.id, false);
    applyAction(room, host.id, { type: "startGame" });
    for (let i = 0; i < 20; i++) {
      expect(judgeOf(room)).not.toBe(away.id);
      expect(room.round!.participantIds).not.toContain(away.id);
      playRound(room);
    }
  });

  it("never plays cards", () => {
    const { room } = startGame({ players: 4 });
    const judge = judgeOf(room);
    expect(room.round!.participantIds).not.toContain(judge);
    expectRejected(room, judge, { type: "submit", cardIds: firstCards(room, judge) }, 403);
  });

  it.each([3, 4, 5])("judges exactly once per cycle of N rounds (%i players)", (count) => {
    const { room } = startGame({ players: count });
    const ids = room.players.map((p) => p.id).sort();
    for (let cycle = 0; cycle < 5; cycle++) {
      const judges: string[] = [];
      for (let i = 0; i < count; i++) {
        judges.push(judgeOf(room));
        playRound(room);
      }
      expect(judges.sort()).toEqual(ids);
    }
  });

  it("changes every round, including across cycle boundaries", () => {
    // With 3 players a cycle boundary repeats the previous judge 1/3 of the time unless prevented,
    // so 5 games × 80 rounds (~130 boundaries) would catch it.
    for (let game = 0; game < 5; game++) {
      const { room } = startGame({ players: 3 });
      let previous = judgeOf(room);
      for (let i = 0; i < 80; i++) {
        playRound(room);
        expect(judgeOf(room)).not.toBe(previous);
        previous = judgeOf(room);
      }
    }
  });

  it("alternates when only 2 players are active", () => {
    const { room, players } = startGame({ players: 3 });
    const away = players.find((p) => p.id !== judgeOf(room) && p.id !== room.hostId)!;
    setActive(room, away.id, false);
    expect(room.phase).toBe("playing");
    let previous = judgeOf(room);
    for (let i = 0; i < 30; i++) {
      playRound(room);
      expect(judgeOf(room)).not.toBe(previous);
      expect(judgeOf(room)).not.toBe(away.id);
      previous = judgeOf(room);
    }
  });
});

describe("submitting cards", () => {
  it("removes the played cards from the hand", () => {
    const { room } = startGame({ players: 3 });
    const [id] = room.round!.participantIds;
    const cardIds = firstCards(room, id);
    submit(room, id, cardIds);
    expect(handIds(room, id)).not.toContain(cardIds[0]);
    expect(player(room, id).hand).toHaveLength(HAND_SIZE - 1);
    expect(submissionOf(room, id).cards.map((c) => c.id)).toEqual(cardIds);
  });

  it("requires exactly `pick` cards", () => {
    const one = startGame({ players: 3 });
    const a = one.room.round!.participantIds[0];
    expectRejected(one.room, a, { type: "submit", cardIds: [] });
    expectRejected(one.room, a, { type: "submit", cardIds: firstCards(one.room, a, 2) });

    const two = startGame({ players: 3, prompts: PICK2_PROMPTS });
    expect(two.room.round!.prompt.pick).toBe(2);
    const b = two.room.round!.participantIds[0];
    expectRejected(two.room, b, { type: "submit", cardIds: firstCards(two.room, b, 1) });
    expectRejected(two.room, b, { type: "submit", cardIds: firstCards(two.room, b, 3) });
    submit(two.room, b, firstCards(two.room, b, 2));
  });

  it("only accepts cards from the player's own hand", () => {
    const { room } = startGame({ players: 4 });
    const [a, b] = room.round!.participantIds;
    expectRejected(room, a, { type: "submit", cardIds: firstCards(room, b, 1) });
    expectRejected(room, a, { type: "submit", cardIds: [firstCards(room, judgeOf(room), 1)[0]] });
    expectRejected(room, a, { type: "submit", cardIds: ["no-such-card"] });
    expectRejected(room, a, raw({ type: "submit", cardIds: "a1" }));
    expectRejected(room, a, raw({ type: "submit", cardIds: [1] }));
  });

  it("rejects the same card twice", () => {
    const { room } = startGame({ players: 3, prompts: PICK2_PROMPTS });
    const a = room.round!.participantIds[0];
    const [card] = firstCards(room, a, 1);
    expectRejected(room, a, { type: "submit", cardIds: [card, card] });
  });

  it("allows one submission per round", () => {
    const { room } = startGame({ players: 4 });
    const a = room.round!.participantIds[0];
    submit(room, a);
    expectRejected(room, a, { type: "submit", cardIds: firstCards(room, a) });
  });

  it("keeps the cards in the order they were played", () => {
    const { room } = startGame({ players: 4, prompts: PICK2_PROMPTS });
    const [a, b, c] = room.round!.participantIds;
    const [x, y] = firstCards(room, a, 2);
    submit(room, a, [y, x]);
    expect(submissionOf(room, a).cards.map((card) => card.id)).toEqual([y, x]);
    expect(toView(room, a).round!.yourSubmission!.map((card) => card.id)).toEqual([y, x]);

    submit(room, b);
    submit(room, c);
    expect(room.phase).toBe("judging");
    const shown = toView(room, judgeOf(room)).round!.submissions.find((s) => s.id === submissionOf(room, a).id)!;
    expect(shown.cards.map((card) => card.id)).toEqual([y, x]);
  });

  it("is only possible while playing", () => {
    const { room } = startGame({ players: 3 });
    submitAll(room);
    expect(room.phase).toBe("judging");
    const a = room.round!.participantIds[0];
    expectRejected(room, a, { type: "submit", cardIds: firstCards(room, a) }, 409);
  });
});

describe("three-blank prompts (Draw 2, Pick 3)", () => {
  it("deals pick - 1 extra cards to every player except the judge", () => {
    const { room } = startGame({ players: 4, prompts: PICK3_PROMPTS });
    for (let i = 0; i < 6; i++) {
      expect(room.round!.prompt.pick).toBe(3);
      expect(player(room, judgeOf(room)).hand).toHaveLength(HAND_SIZE);
      for (const id of room.round!.participantIds) expect(player(room, id).hand).toHaveLength(HAND_SIZE + 2);
      submitAll(room);
      for (const id of room.round!.participantIds) expect(player(room, id).hand).toHaveLength(HAND_SIZE - 1);
      pickLowest(room);
      nextRound(room);
    }
    expectAnswersConserved(room, 200);
  });

  it("deals no extra cards for two-blank prompts", () => {
    const { room } = startGame({ players: 4, prompts: PICK2_PROMPTS });
    expect(room.round!.prompt.pick).toBe(2);
    for (const p of room.players) expect(p.hand).toHaveLength(HAND_SIZE);
  });

  it("doesn't hand out the Draw 2 bonus twice when a three-blank round restarts", () => {
    const { room } = startGame({ players: 4, prompts: PICK3_PROMPTS });
    for (const id of room.round!.participantIds) expect(player(room, id).hand).toHaveLength(HAND_SIZE + 2);

    // The judge drops out, so the round restarts with another three-blank prompt.
    setActive(room, judgeOf(room), false);
    expect(room.phase).toBe("playing");
    expect(room.round!.prompt.pick).toBe(3);
    for (const id of room.round!.participantIds) expect(player(room, id).hand).toHaveLength(HAND_SIZE + 2);
  });
});

describe("judging", () => {
  it("starts once every active participant has submitted", () => {
    const { room } = startGame({ players: 4 });
    const [a, b, c] = room.round!.participantIds;
    submit(room, a);
    submit(room, b);
    expect(room.phase).toBe("playing");
    submit(room, c);
    expect(room.phase).toBe("judging");
    expect(room.round!.submissions).toHaveLength(3);
  });

  it("shows the submissions to everyone without saying who played them", () => {
    const { room } = startGame({ players: 4 });
    submitAll(room);
    const expected = room.round!.submissions.map((s) => ({ id: s.id, cards: s.cards, playerId: null }));
    for (const p of room.players) {
      const round = toView(room, p.id).round!;
      expect(round.submissions).toEqual(expected);
      expect(round.winnerPlayerId).toBeNull();
      expect(round.winnerSubmissionId).toBeNull();
    }
  });

  it("shuffles the submissions so their order doesn't give the authors away", () => {
    // With 4 submitters the shown order matches the play order 1 time in 24 when shuffled.
    let reordered = false;
    for (let i = 0; i < 20 && !reordered; i++) {
      const { room } = startGame({ players: 5 });
      const order = [...room.round!.participantIds];
      const ids = order.map((id) => {
        submit(room, id);
        return submissionOf(room, id).id;
      });
      const shown = toView(room, judgeOf(room)).round!.submissions.map((s) => s.id);
      if (shown.join() !== ids.join()) reordered = true;
    }
    expect(reordered).toBe(true);
  });

  it("doesn't leak submissions while players are still playing", () => {
    const { room } = startGame({ players: 4 });
    const [a, b] = room.round!.participantIds;
    const played = firstCards(room, a);
    submit(room, a, played);

    const own = toView(room, a).round!;
    expect(own.yourSubmission!.map((c) => c.id)).toEqual(played);
    expect(own.submissions).toEqual([]);

    for (const viewer of [b, judgeOf(room)]) {
      const view = toView(room, viewer);
      expect(view.round!.submissions).toEqual([]);
      expect(view.round!.yourSubmission).toBeNull();
      expect(view.round!.submittedCount).toBe(1);
      const json = JSON.stringify(view);
      for (const card of submissionOf(room, a).cards) {
        expect(json).not.toContain(JSON.stringify(card.id));
        expect(json).not.toContain(JSON.stringify(card.text));
      }
    }
  });

  it("never shows a player anyone else's hand or token", () => {
    const { room } = startGame({ players: 4 });
    const check = () => {
      for (const viewer of room.players) {
        const view = toView(room, viewer.id);
        expect(view.you.hand).toEqual(viewer.hand);
        const json = JSON.stringify(view);
        for (const other of room.players) {
          expect(json).not.toContain(other.token);
          if (other.id === viewer.id) continue;
          for (const card of other.hand) {
            expect(json).not.toContain(JSON.stringify(card.id));
            expect(json).not.toContain(JSON.stringify(card.text));
          }
        }
        for (const p of view.players) expect(Object.keys(p).sort()).toEqual(
          ["active", "hasSubmitted", "id", "isHost", "isJudge", "name", "score"],
        );
      }
    };
    check(); // playing
    submitAll(room);
    check(); // judging
    pickLowest(room);
    check(); // roundResult
  });
});

describe("picking the winner", () => {
  it("can only be done by the judge", () => {
    const { room } = startGame({ players: 4 });
    submitAll(room);
    const submissionId = room.round!.submissions[0].id;
    for (const id of room.round!.participantIds) expectRejected(room, id, { type: "pickWinner", submissionId }, 403);
    expect(room.phase).toBe("judging");
  });

  it("is only possible while judging, and only for a real submission", () => {
    const { room } = startGame({ players: 3 });
    const judge = judgeOf(room);
    const a = room.round!.participantIds[0];
    submit(room, a);
    expectRejected(room, judge, { type: "pickWinner", submissionId: submissionOf(room, a).id }, 409);
    submitAll(room);
    expectRejected(room, judge, { type: "pickWinner", submissionId: "nope" }, 404);
  });

  it("gives the winner a point, reveals the authors and schedules the next round", () => {
    const { room } = startGame({ players: 4 });
    submitAll(room);
    const now = 1_000_000;
    const winning = pickLowest(room, now);

    expect(room.phase).toBe("roundResult");
    expect(player(room, winning.playerId).score).toBe(1);
    for (const p of room.players) if (p.id !== winning.playerId) expect(p.score).toBe(0);
    expect(room.round!.winnerSubmissionId).toBe(winning.id);
    expect(room.round!.nextRoundAt).toBe(now + RESULT_DELAY_MS);

    for (const viewer of room.players) {
      const round = toView(room, viewer.id).round!;
      expect(round.winnerSubmissionId).toBe(winning.id);
      expect(round.winnerPlayerId).toBe(winning.playerId);
      expect(round.nextRoundAt).toBe(now + RESULT_DELAY_MS);
      for (const s of round.submissions) {
        expect(s.playerId).toBe(room.round!.submissions.find((real) => real.id === s.id)!.playerId);
      }
      expect(round.submissions.map((s) => s.playerId).sort()).toEqual([...room.round!.participantIds].sort());
    }
  });

  it("ends the game when a player reaches pointsToWin", () => {
    const { room } = startGame({ players: 3, pointsToWin: 3 });
    let rounds = 0;
    while (room.phase !== "gameOver") {
      submitAll(room);
      // Always reward the leader, so somebody gets to 3 quickly.
      const winning = [...room.round!.submissions].sort(
        (a, b) => player(room, b.playerId).score - player(room, a.playerId).score,
      )[0];
      applyAction(room, judgeOf(room), { type: "pickWinner", submissionId: winning.id });
      const top = Math.max(...room.players.map((p) => p.score));
      if (top < 3) {
        expect(room.phase).toBe("roundResult");
        nextRound(room);
      }
      expect(++rounds).toBeLessThan(20);
    }
    const winner = room.players.find((p) => p.score === 3)!;
    expect(room.winnerId).toBe(winner.id);
    expect(room.round!.nextRoundAt).toBeNull();
    expect(room.players.filter((p) => p.score >= 3)).toHaveLength(1);

    const view = toView(room, room.players[0].id);
    expect(view.phase).toBe("gameOver");
    expect(view.winnerId).toBe(winner.id);
    expect(view.round!.submissions.every((s) => s.playerId !== null)).toBe(true);
    expect(() => nextRound(room)).toThrow(GameError);
  });
});

describe("the next round", () => {
  it("refills hands to 10, picks a new judge and increments the round number", () => {
    const { room } = startGame({ players: 4, prompts: PICK2_PROMPTS });
    const judge = judgeOf(room);
    submitAll(room);
    const played = room.round!.submissions.flatMap((s) => s.cards.map((c) => c.id));
    pickLowest(room);
    nextRound(room);

    expect(room.phase).toBe("playing");
    expect(room.round!.number).toBe(2);
    expect(judgeOf(room)).not.toBe(judge);
    expect(room.round!.submissions).toEqual([]);
    expect(room.round!.winnerSubmissionId).toBeNull();
    expect(room.round!.nextRoundAt).toBeNull();
    for (const p of room.players) expect(p.hand).toHaveLength(HAND_SIZE);
    for (const id of played) expect(room.answers.discard.map((c) => c.id)).toContain(id);
    expectAnswersConserved(room, 200);
  });

  it("can be triggered by the host or the judge, not by other players", () => {
    const { room } = startGame({ players: 4 });
    submitAll(room);
    pickLowest(room);
    const bystander = room.players.find((p) => p.id !== room.hostId && p.id !== judgeOf(room))!;
    expectRejected(room, bystander.id, { type: "nextRound" }, 403);

    applyAction(room, judgeOf(room), { type: "nextRound" });
    expect(room.round!.number).toBe(2);

    submitAll(room);
    pickLowest(room);
    applyAction(room, room.hostId, { type: "nextRound" });
    expect(room.round!.number).toBe(3);
  });

  it("is only possible while the round result is shown", () => {
    const { room } = startGame({ players: 3 });
    expect(() => nextRound(room)).toThrow(GameError);
    submitAll(room);
    expect(() => nextRound(room)).toThrow(GameError);
    expectRejected(room, room.hostId, { type: "nextRound" }, 409);
  });
});

describe("decks", () => {
  it("reshuffles the discard pile into the answer deck when it runs out", () => {
    const total = 3 * (HAND_SIZE + 1);
    const { room } = startGame({ players: 3, answers: total });
    expect(room.answers.draw).toHaveLength(total - 3 * HAND_SIZE);

    const played = new Set<string>();
    let recycled = false;
    for (let i = 0; i < 30; i++) {
      submitAll(room);
      for (const s of room.round!.submissions) for (const c of s.cards) played.add(c.id);
      pickLowest(room);
      nextRound(room);
      for (const p of room.players) {
        expect(p.hand).toHaveLength(HAND_SIZE);
        if (p.hand.some((c) => played.has(c.id))) recycled = true;
      }
      expectAnswersConserved(room, total);
    }
    expect(recycled).toBe(true);
  });

  it.each([1, 2])("keeps working for many rounds with only %i question(s)", (count) => {
    const prompts = PICK1_PROMPTS.slice(0, count);
    const { room } = startGame({ players: 3, prompts });
    for (let i = 0; i < 60; i++) {
      expect(prompts).toContain(room.round!.prompt.text);
      expectPromptsConserved(room, count);
      playRound(room);
    }
    expect(room.round!.number).toBe(61);
  });
});

describe("players leaving or going away", () => {
  it("restarts the round with a different judge when the judge leaves, returning played cards", () => {
    const { room } = startGame({ players: 4 });
    const judge = judgeOf(room);
    const [a] = room.round!.participantIds;
    const played = firstCards(room, a);
    submit(room, a, played);

    applyAction(room, judge, { type: "leave" });

    expect(room.players.map((p) => p.id)).not.toContain(judge);
    expect(room.phase).toBe("playing");
    expect(judgeOf(room)).not.toBe(judge);
    expect(room.round!.participantIds).not.toContain(judge);
    expect(room.round!.participantIds).not.toContain(judgeOf(room));
    expect(room.round!.submissions).toEqual([]);
    expect(handIds(room, a)).toEqual(expect.arrayContaining(played));
    expect(player(room, a).hand).toHaveLength(HAND_SIZE);
    expect(room.notice).toMatch(/restart/);
    expectAnswersConserved(room, 200);
  });

  it("restarts the round with a different judge when the judge goes away during judging", () => {
    const { room } = startGame({ players: 4 });
    const judge = judgeOf(room);
    submitAll(room);
    expect(room.phase).toBe("judging");
    const played = new Map(room.round!.submissions.map((s) => [s.playerId, s.cards.map((c) => c.id)]));

    setActive(room, judge, false);

    expect(room.phase).toBe("playing");
    expect(judgeOf(room)).not.toBe(judge);
    expect(player(room, judgeOf(room)).active).toBe(true);
    expect(room.round!.participantIds).not.toContain(judge);
    expect(room.round!.submissions).toEqual([]);
    for (const [id, cards] of played) {
      expect(handIds(room, id)).toEqual(expect.arrayContaining(cards));
      expect(player(room, id).hand).toHaveLength(HAND_SIZE);
    }
    expect(room.notice).toMatch(/restart/);
    expectAnswersConserved(room, 200);
  });

  it("removes a leaving participant's submission", () => {
    const { room } = startGame({ players: 4 });
    const [a, b, c] = room.round!.participantIds;
    submit(room, a);
    const gone = submissionOf(room, a).cards.map((card) => card.id);
    applyAction(room, a, { type: "leave" });

    expect(room.round!.submissions).toEqual([]);
    expect(room.round!.participantIds).toEqual([b, c]);
    expect(room.phase).toBe("playing");
    for (const id of gone) expect(room.answers.discard.map((card) => card.id)).toContain(id);
    expectAnswersConserved(room, 200);

    submit(room, b);
    submit(room, c);
    expect(room.phase).toBe("judging");
    expect(room.round!.submissions.map((s) => s.playerId).sort()).toEqual([b, c].sort());
  });

  it("removes a kicked participant's submission during judging and keeps judging", () => {
    const { room } = startGame({ players: 5 });
    submitAll(room);
    const victim = room.round!.participantIds.find((id) => id !== room.hostId)!;
    const kicker = room.hostId;
    applyAction(room, kicker, { type: "kick", playerId: victim });

    expect(room.phase).toBe(judgeOf(room) === victim ? "playing" : "judging");
    expect(room.round!.submissions.map((s) => s.playerId)).not.toContain(victim);
    expect(room.round!.submissions).toHaveLength(3);
    expectAnswersConserved(room, 200);
  });

  it("restarts the round when every submission is withdrawn during judging", () => {
    const { room } = startGame({ players: 3 });
    const late = addPlayer(room, "Late"); // keeps 2 active players around once both submitters leave
    const judge = judgeOf(room);
    const [a, b] = room.round!.participantIds;
    submitAll(room);
    expect(room.phase).toBe("judging");
    applyAction(room, a, { type: "leave" });
    expect(room.phase).toBe("judging");
    applyAction(room, b, { type: "leave" });

    expect(room.phase).toBe("playing");
    expect(judgeOf(room)).not.toBe(judge);
    expect([judge, late.id]).toContain(judgeOf(room));
    expect(room.round!.submissions).toEqual([]);
    expectAnswersConserved(room, 200);
  });

  it("starts judging when the last pending participant goes away", () => {
    const { room } = startGame({ players: 4 });
    const [a, b, c] = room.round!.participantIds;
    submit(room, a);
    submit(room, b);
    setActive(room, c, false);
    expect(room.phase).toBe("judging");
    expect(room.round!.submissions.map((s) => s.playerId).sort()).toEqual([a, b].sort());
  });

  it("starts judging when the last pending participant leaves", () => {
    const { room } = startGame({ players: 4 });
    const [a, b, c] = room.round!.participantIds;
    submit(room, a);
    submit(room, b);
    applyAction(room, c, { type: "leave" });
    expect(room.phase).toBe("judging");
  });

  it("keeps an away participant's submission", () => {
    const { room } = startGame({ players: 4 });
    const [a] = room.round!.participantIds;
    submit(room, a);
    setActive(room, a, false);
    expect(room.round!.submissions.map((s) => s.playerId)).toEqual([a]);
  });

  it("returns to the lobby when fewer than 2 players are active", () => {
    const { room } = startGame({ players: 3 });
    const others = room.players.filter((p) => p.id !== room.hostId);

    setActive(room, others[0].id, false);
    expect(room.phase).not.toBe("lobby");
    expect(activePlayers(room)).toHaveLength(2);

    setActive(room, others[1].id, false);
    expect(room.phase).toBe("lobby");
    expect(room.round).toBeNull();
    expect(room.notice).toMatch(/Not enough players/);
    for (const p of room.players) expect(p.hand).toEqual([]);
  });

  it("returns to the lobby when players leave until only 1 is left", () => {
    const { room } = startGame({ players: 3 });
    const [a, b] = room.players.filter((p) => p.id !== room.hostId);
    applyAction(room, a.id, { type: "leave" });
    expect(room.phase).toBe("playing");
    expect(room.round!.participantIds).toHaveLength(1);
    applyAction(room, b.id, { type: "leave" });
    expect(room.phase).toBe("lobby");
    expect(room.players).toHaveLength(1);
  });

  it("returns to the lobby when a player leaves during the round result", () => {
    const { room } = startGame({ players: 3 });
    submitAll(room);
    pickLowest(room);
    const [a, b] = room.players.filter((p) => p.id !== room.hostId);
    setActive(room, a.id, false);
    expect(room.phase).toBe("roundResult");
    removePlayer(room, b.id);
    expect(room.phase).toBe("lobby");
  });

  it("passes the host role on to an active player when the host leaves", () => {
    const { room, host, players } = startGame({ players: 4 });
    setActive(room, players[1].id, false);
    applyAction(room, host.id, { type: "leave" });
    expect(room.players.map((p) => p.id)).not.toContain(host.id);
    expect(room.hostId).not.toBe(players[1].id);
    expect(player(room, room.hostId).active).toBe(true);
  });

  it("passes the host role on when the host goes away", () => {
    const { room, host } = setupLobby({ players: 3 });
    setActive(room, host.id, false);
    expect(room.hostId).not.toBe(host.id);
    expect(player(room, room.hostId).active).toBe(true);
    // Coming back doesn't take the role back.
    setActive(room, host.id, true);
    expect(room.hostId).not.toBe(host.id);
  });

  it("gives the host role to an active player once there is one, if the host went away alone", () => {
    const { room, player: host } = createRoom("TEST", "Host");
    setActive(room, host.id, false); // the host's tab closes while nobody else is in the room
    const guest = addPlayer(room, "Guest");
    expect(room.hostId).toBe(guest.id);
  });

  it("reports an empty room when the last player is removed", () => {
    const { room, player: host } = createRoom("TEST", "Host");
    const other = addPlayer(room, "Other");
    expect(removePlayer(room, other.id)).toBe(true);
    expect(removePlayer(room, host.id)).toBe(false);
    expect(room.players).toEqual([]);
  });

  it("empties the room when the last player leaves through an action", () => {
    const { room, player: host } = createRoom("TEST", "Host");
    applyAction(room, host.id, { type: "leave" });
    expect(room.players).toEqual([]);
  });
});

describe("joining", () => {
  it("adds a player to the lobby without a hand", () => {
    const { room } = createRoom("TEST", "Host");
    const p = addPlayer(room, "  New   Player  ");
    expect(p.name).toBe("New Player");
    expect(p.hand).toEqual([]);
    expect(p.active).toBe(true);
    expect(findPlayerByToken(room, p.token)).toBe(p);
  });

  it("deals a mid-game joiner a hand, but lets them play only from the next round", () => {
    const { room } = startGame({ players: 3 });
    const late = addPlayer(room, "Late");
    expect(late.hand).toHaveLength(HAND_SIZE);
    expect(room.round!.participantIds).not.toContain(late.id);
    expectRejected(room, late.id, { type: "submit", cardIds: firstCards(room, late.id, 1) }, 403);
    expectAnswersConserved(room, 200);

    submitAll(room);
    expect(room.phase).toBe("judging");
    pickLowest(room);
    nextRound(room);
    expect([...room.round!.participantIds, judgeOf(room)]).toContain(late.id);
  });

  it("gives a mid-game joiner a judge turn within the current cycle", () => {
    for (let i = 0; i < 10; i++) {
      const { room } = startGame({ players: 3 });
      const judges = [judgeOf(room)];
      const late = addPlayer(room, "Late");
      for (let r = 0; r < 3; r++) {
        playRound(room);
        judges.push(judgeOf(room));
      }
      expect(judges).toContain(late.id);
      expect(new Set(judges).size).toBe(4);
    }
  });

  it("lets someone reclaim an away player's seat by name", () => {
    const { room, players } = startGame({ players: 4 });
    const p = players[2];
    submitAll(room);
    pickLowest(room);
    nextRound(room);
    const { token, score } = p;
    const hand = handIds(room, p.id);

    setActive(room, p.id, false);
    const back = addPlayer(room, "  PLAYER 2 ");

    expect(back.id).toBe(p.id);
    expect(back.token).not.toBe(token);
    expect(back.active).toBe(true);
    expect(back.score).toBe(score);
    expect(back.hand.map((c) => c.id)).toEqual(hand);
    expect(room.players).toHaveLength(4);
    expect(findPlayerByToken(room, token)).toBeUndefined();
    expect(findPlayerByToken(room, back.token)).toBe(back);
  });

  it("rejects the name of an active player", () => {
    const { room } = startGame({ players: 3 });
    const before = structuredClone(room);
    expectGameError(() => addPlayer(room, "player 1"), /already taken/, 409);
    expectGameError(() => addPlayer(room, "HOST"), /already taken/, 409);
    expect(room).toEqual(before);
  });

  it("rejects empty or overlong names and a full room", () => {
    const { room } = createRoom("TEST", "Host");
    expectGameError(() => addPlayer(room, "   "), /name/i);
    expectGameError(() => addPlayer(room, "x".repeat(25)), /at most/);
    for (let i = 1; i < MAX_PLAYERS; i++) addPlayer(room, `P${i}`);
    expectGameError(() => addPlayer(room, "One too many"), /full/, 409);
    expect(room.players).toHaveLength(MAX_PLAYERS);
  });
});

describe("settings and permissions", () => {
  it("only lets the host change settings, manage packs and kick in the lobby", () => {
    const { room, players, packId } = setupLobby({ players: 4 });
    const guest = players[1].id;
    expectRejected(room, guest, { type: "updateSettings", pointsToWin: 5 }, 403);
    expectRejected(room, guest, { type: "updateSettings", packIds: [] }, 403);
    expectRejected(room, guest, { type: "importPack", name: "Mine", prompts: ["Why _?"], answers: ["Me."] }, 403);
    expectRejected(room, guest, { type: "removePack", packId }, 403);
    expectRejected(room, guest, { type: "kick", playerId: players[2].id }, 403);
    expectRejected(room, guest, { type: "kick", playerId: room.hostId }, 403);
  });

  it("only lets the host kick or go back to the lobby during a game", () => {
    const { room, players } = startGame({ players: 4 });
    const guest = players[1].id;
    expectRejected(room, guest, { type: "backToLobby" }, 403);
    expectRejected(room, guest, { type: "kick", playerId: players[2].id }, 403);
  });

  it("lets the host change settings", () => {
    const { room, host, packId } = setupLobby({ players: 3 });
    applyAction(room, host.id, { type: "updateSettings", pointsToWin: 12 });
    expect(room.settings.pointsToWin).toBe(12);
    applyAction(room, host.id, { type: "updateSettings", packIds: [packId, packId] });
    expect(room.settings.packIds).toEqual([packId]);
    expect(room.settings.handSize).toBe(HAND_SIZE);
  });

  it.each([
    ["pointsToWin 0", { pointsToWin: 0 }],
    ["pointsToWin 31", { pointsToWin: 31 }],
    ["fractional pointsToWin", { pointsToWin: 2.5 }],
    ["pointsToWin as a string", { pointsToWin: "7" }],
    ["NaN pointsToWin", { pointsToWin: Number.NaN }],
    ["packIds as a string", { packIds: "core" }],
    ["non-string pack ids", { packIds: [1] }],
    ["an unknown pack id", { packIds: ["does-not-exist"] }],
  ])("rejects invalid settings: %s", (_label, settings) => {
    const { room, host } = setupLobby({ players: 3 });
    expectRejected(room, host.id, raw({ type: "updateSettings", ...settings }));
  });

  it("rejects a settings change as a whole when any part of it is invalid", () => {
    const { room, host } = setupLobby({ players: 3 });
    const before = structuredClone(room.settings);
    expectRejected(room, host.id, raw({ type: "updateSettings", packIds: [], pointsToWin: 0 }));
    expect(room.settings).toEqual(before);
  });

  it("doesn't allow settings or pack changes while a game is running", () => {
    const { room, host, packId } = startGame({ players: 3 });
    expectRejected(room, host.id, { type: "updateSettings", pointsToWin: 5 }, 409);
    expectRejected(room, host.id, { type: "importPack", name: "Late", prompts: ["Why _?"], answers: ["Me."] }, 409);
    expectRejected(room, host.id, { type: "removePack", packId }, 409);
  });

  it("lets the host import and remove packs", () => {
    const { room, host, packId } = setupLobby({ players: 3 });
    const { packId: second } = applyAction(room, host.id, {
      type: "importPack",
      name: "  Second  ",
      prompts: ["Why _?", "why _?"],
      answers: ["Me.", " me. ", "You."],
    });
    expect(room.settings.packIds).toEqual([packId, second]);
    const view = toView(room, host.id);
    expect(view.packs.find((p) => p.id === second)).toMatchObject({
      name: "Second",
      promptCount: 1,
      answerCount: 2,
      custom: true,
    });

    applyAction(room, host.id, { type: "removePack", packId: second! });
    expect(room.customPacks.map((p) => p.id)).toEqual([packId]);
    expect(room.settings.packIds).toEqual([packId]);
    expectRejected(room, host.id, { type: "removePack", packId: "unknown" }, 404);
  });

  it("rejects invalid imports", () => {
    const { room, host } = setupLobby({ players: 3 });
    expectRejected(room, host.id, { type: "importPack", name: "", prompts: ["Why _?"], answers: ["Me."] });
    expectRejected(room, host.id, { type: "importPack", name: "Empty", prompts: [], answers: [] });
    expectRejected(room, host.id, { type: "importPack", name: "Bad", prompts: "Why _?", answers: ["Me."] });
    expectRejected(room, host.id, { type: "importPack", name: "Bad", prompts: ["_ _ _ _"], answers: ["Me."] });
  });

  it("lets the host kick players, but not themselves or strangers", () => {
    const { room, host, players } = startGame({ players: 4 });
    expectRejected(room, host.id, { type: "kick", playerId: host.id });
    expectRejected(room, host.id, { type: "kick", playerId: "stranger" }, 404);
    applyAction(room, host.id, { type: "kick", playerId: players[1].id });
    expect(room.players.map((p) => p.id)).not.toContain(players[1].id);
    expectAnswersConserved(room, 200);
  });

  it("lets the host go back to the lobby", () => {
    const { room, host } = startGame({ players: 3 });
    applyAction(room, host.id, { type: "backToLobby" });
    expect(room.phase).toBe("lobby");
    expect(room.round).toBeNull();
    for (const p of room.players) expect(p.hand).toEqual([]);
    expectRejected(room, host.id, { type: "backToLobby" });
  });

  it("rejects actions from people who aren't in the room, and unknown actions", () => {
    const { room, host } = setupLobby({ players: 3 });
    expectRejected(room, "stranger", { type: "startGame" }, 403);
    expectRejected(room, host.id, raw({ type: "explode" }));
  });

  it("leaves the notice unchanged when an action is rejected", () => {
    const { room } = startGame({ players: 4 });
    setActive(room, judgeOf(room), false); // restarts the round and sets a notice
    const notice = room.notice;
    expect(notice).toMatch(/restart/);

    const participant = room.round!.participantIds.find((id) => id !== room.hostId)!;
    expectGameError(() => applyAction(room, participant, { type: "pickWinner", submissionId: "x" }));
    expectGameError(() => applyAction(room, participant, { type: "backToLobby" }));
    expectGameError(() => applyAction(room, participant, { type: "submit", cardIds: [] }));
    expectGameError(() => applyAction(room, "stranger", { type: "leave" }));
    expect(room.notice).toBe(notice);
  });
});

// ---------------------------------------------------------------------------
// Randomised games with joins, departures and reconnects, checking the invariants
// after every move.

function expectConsistent(room: Room, totalAnswers: number, totalPrompts: number): void {
  expect(room.players.map((p) => p.id)).toContain(room.hostId);
  const inRound = room.phase === "playing" || room.phase === "judging" || room.phase === "roundResult";

  if (room.phase === "lobby") {
    expect(room.round).toBeNull();
    for (const p of room.players) expect(p.hand).toEqual([]);
    return;
  }

  expectAnswersConserved(room, totalAnswers);
  expectPromptsConserved(room, totalPrompts);
  const round = room.round!;
  expect(round.participantIds).not.toContain(round.judgeId);
  const authors = round.submissions.map((s) => s.playerId);
  expect(new Set(authors).size).toBe(authors.length);
  for (const s of round.submissions) {
    expect(round.participantIds).toContain(s.playerId);
    expect(s.cards).toHaveLength(round.prompt.pick);
  }

  if (inRound) expect(activePlayers(room).length).toBeGreaterThanOrEqual(2);
  if (room.phase === "playing" || room.phase === "judging") {
    expect(player(room, round.judgeId).active).toBe(true);
  }
  if (room.phase === "playing") expect(pending(room).length).toBeGreaterThan(0);
  if (room.phase === "judging") expect(round.submissions.length).toBeGreaterThan(0);
}

describe("randomised play", () => {
  it.each(Array.from({ length: 15 }, (_, i) => i + 1))("keeps the room consistent (seed %i)", (seed) => {
    const rand = mulberry32(seed);
    const pickOne = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
    const prompts = [...PICK1_PROMPTS, ...PICK2_PROMPTS, ...PICK3_PROMPTS];
    const totalAnswers = 400;
    const { room } = startGame({ players: 4, prompts, answers: totalAnswers, pointsToWin: 4 });

    let extra = 0;
    let game = 1;
    let previous = { game, number: room.round!.number, judgeId: judgeOf(room) };

    for (let step = 0; step < 400; step++) {
      const r = rand();
      if (r < 0.07) {
        const p = pickOne(room.players);
        setActive(room, p.id, !p.active);
      } else if (r < 0.1 && room.players.length > 3) {
        applyAction(room, pickOne(room.players).id, { type: "leave" });
      } else if (r < 0.13 && room.players.length < 9) {
        addPlayer(room, `Extra ${++extra}`);
      } else if (r < 0.15) {
        const away = room.players.filter((p) => !p.active);
        if (away.length > 0) addPlayer(room, pickOne(away).name.toUpperCase());
      } else {
        switch (room.phase) {
          case "lobby":
          case "gameOver":
            for (const p of room.players) setActive(room, p.id, true);
            while (activePlayers(room).length < 3) addPlayer(room, `Extra ${++extra}`);
            applyAction(room, room.hostId, { type: "startGame" });
            game++;
            break;
          case "playing": {
            const id = pickOne(pending(room));
            const hand = [...handIds(room, id)];
            const cardIds: string[] = [];
            while (cardIds.length < room.round!.prompt.pick) cardIds.push(hand.splice(Math.floor(rand() * hand.length), 1)[0]);
            submit(room, id, cardIds);
            break;
          }
          case "judging":
            applyAction(room, judgeOf(room), { type: "pickWinner", submissionId: pickOne(room.round!.submissions).id });
            break;
          case "roundResult":
            nextRound(room);
            break;
        }
      }

      expectConsistent(room, totalAnswers, prompts.length);

      if (room.round && room.phase !== "lobby") {
        const current = { game, number: room.round.number, judgeId: room.round.judgeId };
        if (current.game === previous.game && current.number === previous.number + 1) {
          expect(current.judgeId).not.toBe(previous.judgeId);
        }
        previous = current;
      }
    }
  });
});
