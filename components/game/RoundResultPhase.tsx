"use client";

import type { RoomView, RoundView } from "@/lib/game/types";
import { SubmissionCard } from "@/components/cards/SubmissionCard";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, TrophyIcon } from "@/components/ui/icons";
import { Countdown } from "./Countdown";
import { Stage } from "./Stage";
import { nameOf, WinningCard } from "./WinningCard";

export function RoundResultPhase({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const { run, pending, error } = useAction(act);
  const youWon = round.winnerPlayerId === view.you.id;
  const winner = view.players.find((p) => p.id === round.winnerPlayerId);
  const canAdvance = view.you.isHost || round.judgeId === view.you.id;
  const others = round.submissions.filter((s) => s.id !== round.winnerSubmissionId);

  return (
    <Stage card={<WinningCard view={view} round={round} />} caption="The winning answer">
      <div className="animate-pop-in rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
        <TrophyIcon className="mx-auto size-9 text-amber-500" />
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          {youWon ? "You win the round!" : `${nameOf(view, round.winnerPlayerId)} wins the round!`}
        </h2>
        {winner && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {youWon ? "You now have" : `${winner.name} now has`} {winner.score} of {view.settings.pointsToWin} points.
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
          <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">The other answers</h3>
          <ul className="grid gap-3 @xl:grid-cols-2">
            {others.map((submission) => (
              <li key={submission.id}>
                <SubmissionCard
                  prompt={round.prompt}
                  cards={submission.cards}
                  label={nameOf(view, submission.playerId)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Stage>
  );
}
