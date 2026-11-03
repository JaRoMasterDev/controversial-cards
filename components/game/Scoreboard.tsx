"use client";

import type { PlayerView, RoomView } from "@/lib/game/types";
import type { Act } from "@/components/useAction";
import { Avatar } from "@/components/room/Avatar";
import { useKick } from "@/components/room/useKick";
import { ErrorText } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon, CrownIcon, XIcon } from "@/components/ui/icons";

type Status = "judge" | "leader" | "played" | "choosing" | "next" | "away" | null;

function statusOf(view: RoomView, player: PlayerView): Status {
  const round = view.round;
  if (!player.active) return "away";
  if (!round || view.phase === "gameOver") return null;
  // In two-player rounds the leader plays too, so while cards are being played they show that progress instead.
  if (round.judgeId === player.id && !(round.twoPlayer && view.phase === "playing")) {
    return round.twoPlayer ? "leader" : "judge";
  }
  if (!round.participantIds.includes(player.id)) return "next";
  if (view.phase === "playing") return player.hasSubmitted ? "played" : "choosing";
  return null;
}

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "judge":
      return <Badge tone="judge">Judge</Badge>;
    case "leader":
      return <Badge tone="judge">Leader</Badge>;
    case "played":
      return (
        <Badge tone="success">
          <CheckIcon className="size-3" />
          Played
        </Badge>
      );
    case "choosing":
      return <span className="text-xs text-zinc-400">Choosing…</span>;
    case "next":
      return <span className="text-xs text-zinc-400">Joins next round</span>;
    case "away":
      return <Badge tone="away">Away</Badge>;
    default:
      return null;
  }
}

/** The full scoreboard: sidebar on desktop, below the round on phones. Hosts can kick from here. */
export function Scoreboard({ view, act }: { view: RoomView; act: Act }) {
  const { kick, pending, error } = useKick(act);
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="px-1 pb-2 text-sm font-bold">Scores</h2>
      <ul className="space-y-0.5">
        {view.players.map((player) => {
          const isYou = player.id === view.you.id;
          return (
            <li
              key={player.id}
              className={`flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 ${isYou ? "bg-zinc-50 dark:bg-zinc-800/60" : ""}`}
            >
              <Avatar name={player.name} away={!player.active} className="size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className={`flex items-center gap-1 truncate text-sm font-semibold ${player.active ? "" : "text-zinc-400"}`}>
                  <span className="truncate">{player.name}</span>
                  {isYou && <span className="shrink-0 font-normal text-zinc-500">(you)</span>}
                  {player.isHost && (
                    <CrownIcon className="size-3.5 shrink-0 text-amber-500" aria-label="Host" role="img" aria-hidden={false} />
                  )}
                </p>
                <div className="mt-0.5 flex h-4 items-center">
                  <StatusBadge status={statusOf(view, player)} />
                </div>
              </div>
              <span className="w-7 text-right text-lg font-black tabular-nums" aria-label={`${player.score} points`}>
                {player.score}
              </span>
              {view.you.isHost && !isYou && (
                <button
                  type="button"
                  onClick={() => kick(player)}
                  disabled={pending}
                  aria-label={`Kick ${player.name}`}
                  title={`Kick ${player.name}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <ErrorText error={error} className="mt-2 px-1" />
    </section>
  );
}

/** One-line horizontal score strip for the top of the screen on phones. */
export function ScoreStrip({ view }: { view: RoomView }) {
  return (
    <ul
      aria-label="Scores"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {view.players.map((player) => {
        const status = statusOf(view, player);
        return (
          <li
            key={player.id}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm ${
              status === "judge" || status === "leader"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            } ${player.active ? "" : "opacity-50"}`}
          >
            <Avatar name={player.name} away={!player.active} className="size-6 text-[11px]" />
            <span className="max-w-24 truncate font-semibold">
              {player.id === view.you.id ? "You" : player.name}
            </span>
            <span className="font-black tabular-nums">{player.score}</span>
            {status === "played" && <CheckIcon className="size-3.5 text-emerald-500" aria-label="Played" />}
          </li>
        );
      })}
    </ul>
  );
}
