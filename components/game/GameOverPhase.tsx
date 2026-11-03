"use client";

import type { RoomView, RoundView } from "@/lib/game/types";
import { Avatar } from "@/components/room/Avatar";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TrophyIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { Spinner } from "@/components/ui/Spinner";
import { Confetti } from "./Confetti";
import { WinningCard } from "./WinningCard";
import { Stage } from "./Stage";

const MEDALS = ["bg-amber-400 text-amber-950", "bg-zinc-300 text-zinc-800", "bg-orange-300 text-orange-950"];

export function GameOverPhase({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const { run, pending, error } = useAction(act);
  const winner = view.players.find((p) => p.id === view.winnerId);
  const youWon = view.winnerId === view.you.id;
  const standings = [...view.players].sort((a, b) => b.score - a.score);

  return (
    <>
      <Confetti />
      <Stage card={<WinningCard view={view} round={round} />} caption="The winning card of the last round">
        <div className="animate-pop-in rounded-3xl bg-zinc-950 p-6 text-center text-white shadow-xl ring-1 ring-white/10">
          <TrophyIcon className="mx-auto size-12 text-amber-400" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Game over</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            {youWon ? "You win!" : `${winner?.name ?? "Someone"} wins!`}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            First to {view.settings.pointsToWin} point{view.settings.pointsToWin === 1 ? "" : "s"}.
          </p>
        </div>

        <Panel title="Final scores">
          <ol className="space-y-1">
            {standings.map((player) => {
              const rank = 1 + standings.filter((p) => p.score > player.score).length;
              return (
                <li
                  key={player.id}
                  className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                    player.id === view.winnerId ? "bg-amber-50 dark:bg-amber-500/10" : ""
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                      MEDALS[rank - 1] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {rank}
                  </span>
                  <Avatar name={player.name} away={!player.active} className="size-8 text-xs" />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {player.name}
                    {player.id === view.you.id && <span className="ml-1 font-normal text-zinc-500">(you)</span>}
                  </span>
                  <span className="text-lg font-black tabular-nums">{player.score}</span>
                </li>
              );
            })}
          </ol>
        </Panel>

        {view.you.isHost ? (
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" pending={pending} onClick={() => run({ type: "startGame" })} className="sm:flex-1">
                Play again
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={pending}
                onClick={() => run({ type: "backToLobby" })}
                className="sm:flex-1"
              >
                Back to lobby
              </Button>
            </div>
            <p className="text-center text-xs text-zinc-500">
              Play again starts a new game with the same card sets and resets the scores.
            </p>
            <ErrorText error={error} />
          </div>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Spinner className="size-4 text-rose-600" />
            Waiting for the host to start a new game
          </p>
        )}
      </Stage>
    </>
  );
}
