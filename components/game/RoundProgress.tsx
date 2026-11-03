import type { RoomView, RoundView } from "@/lib/game/types";

/** Participants who still have to play (away players are skipped by the server). */
export function waitingPlayers(view: RoomView, round: RoundView) {
  return view.players.filter((p) => round.participantIds.includes(p.id) && p.active && !p.hasSubmitted);
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length > 4) return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "3 of 5 played" with a bar and who we're still waiting for. */
export function RoundProgress({ view, round }: { view: RoomView; round: RoundView }) {
  const total = round.participantIds.length;
  const done = Math.min(round.submittedCount, total);
  const waiting = waitingPlayers(view, round).map((p) => (p.id === view.you.id ? "you" : p.name));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">
          {done} of {total} played
        </span>
        {waiting.length > 0 && (
          <span className="min-w-0 truncate text-zinc-500">Waiting for {listNames(waiting)}</span>
        )}
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Answers played"
      >
        <div
          className="h-full rounded-full bg-rose-500 transition-[width] duration-500"
          style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
