"use client";

import type { RoomView, RoundView, SubmissionView } from "@/lib/game/types";
import { SubmissionCard } from "@/components/cards/SubmissionCard";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, TrophyIcon } from "@/components/ui/icons";
import { Countdown } from "./Countdown";
import { listNames } from "./RoundProgress";
import { Stage } from "./Stage";
import { nameOf, votesLabel, WinningCard } from "./WinningCard";

/** "You, Sam and Kim": names in a sentence, with you first. */
function names(view: RoomView, playerIds: string[]): string {
  const ordered = [...playerIds].sort((a, b) => Number(b === view.you.id) - Number(a === view.you.id));
  return listNames(ordered.map((id) => nameOf(view, id)));
}

/** "Sam · 2 votes" in voting rounds, just the name otherwise. */
function authorLabel(view: RoomView, submission: SubmissionView): string {
  const name = nameOf(view, submission.playerId);
  return submission.votes === null ? name : `${name} · ${votesLabel(submission.votes)}`;
}

export function RoundResultPhase({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const { run, pending, error } = useAction(act);
  const winnerIds = round.winnerPlayerIds;
  const youWon = winnerIds.includes(view.you.id);
  const tie = winnerIds.length > 1;
  const winner = view.players.find((p) => p.id === winnerIds[0]);
  const winningVotes = round.submissions.find((s) => s.id === round.winnerSubmissionIds[0])?.votes ?? null;
  const canAdvance = view.you.isHost || round.judgeId === view.you.id;
  // The stage card shows the first winner; tied winners lead the rest, then by votes.
  const others = round.submissions
    .filter((s) => s.id !== round.winnerSubmissionIds[0])
    .sort(
      (a, b) =>
        Number(round.winnerSubmissionIds.includes(b.id)) - Number(round.winnerSubmissionIds.includes(a.id)) ||
        (b.votes ?? 0) - (a.votes ?? 0),
    );
  // A tied vote can leave several players on or past the target; the game goes on until one leads.
  const top = Math.max(...view.players.map((p) => p.score));
  const leaders = view.players.filter((p) => p.score === top);
  const tiedAtTarget = top >= view.settings.pointsToWin && leaders.length > 1;

  let heading: string;
  let detail: string | null = null;
  if (tie) {
    heading = youWon ? "You share the round!" : "It's a tie!";
    const tied = names(view, winnerIds);
    detail =
      winningVotes === null
        ? `${tied} each get a point.`
        : `${tied} tied with ${votesLabel(winningVotes)} each, so ${winnerIds.length === 2 ? "both" : "all"} get a point.`;
  } else {
    heading = youWon ? "You win the round!" : `${nameOf(view, winnerIds[0] ?? null)} wins the round!`;
    if (winner) {
      detail = `${winningVotes === null ? "" : `${votesLabel(winningVotes)}. `}${
        youWon ? "You now have" : `${winner.name} now has`
      } ${winner.score} of ${view.settings.pointsToWin} points.`;
    }
  }

  return (
    <Stage card={<WinningCard view={view} round={round} />} caption={tie ? "One of the winning answers" : "The winning answer"}>
      <div className="animate-pop-in rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
        <TrophyIcon className="mx-auto size-9 text-amber-500" />
        <h2 className="mt-2 text-2xl font-black tracking-tight">{heading}</h2>
        {detail && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>}
        {tiedAtTarget && (
          <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            {names(view, leaders.map((p) => p.id))} are tied at {top} points. The next round decides the game.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="off">
          {round.nextRoundAt ? <Countdown until={round.nextRoundAt} /> : "The next round starts soon."}
        </p>
        {canAdvance && (
          <Button size="sm" variant="secondary" pending={pending} onClick={() => run({ type: "nextRound" })}>
            Next round
            {!pending && <ArrowRightIcon />}
          </Button>
        )}
        <ErrorText error={error} className="w-full" />
      </div>

      {others.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
            {others.length === 1 ? "The other answer" : "The other answers"}
          </h3>
          <ul className="grid gap-3 @xl:grid-cols-2">
            {others.map((submission) => (
              <li key={submission.id}>
                <SubmissionCard
                  prompt={round.prompt}
                  cards={submission.cards}
                  winner={round.winnerSubmissionIds.includes(submission.id)}
                  label={authorLabel(view, submission)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Stage>
  );
}
