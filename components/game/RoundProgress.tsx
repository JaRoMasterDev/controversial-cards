import type { RoomView, RoundView } from "@/lib/game/types";

/** Participants who still have to play (away players are skipped by the server). */
export function waitingPlayers(view: RoomView, round: RoundView) {
  return view.players.filter((p) => round.participantIds.includes(p.id) && p.active && !p.hasSubmitted);
}

/** Voters who still have to vote in a voting round (away players are skipped by the server). */
export function waitingVoters(view: RoomView, round: RoundView) {
  return view.players.filter((p) => round.voterIds.includes(p.id) && p.active && !p.hasVoted);
}

export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length > 4) return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "3 of 5 played" (or "voted") with a bar and who we're still waiting for. */
export function RoundProgress({ view, round, kind = "play" }: { view: RoomView; round: RoundView; kind?: "play" | "vote" }) {
  const voting = kind === "vote";
  const total = voting ? round.voterIds.length : round.participantIds.length;
  const done = Math.min(voting ? round.votedCount : round.submittedCount, total);
  const waiting = (voting ? waitingVoters : waitingPlayers)(view, round).map((p) =>
    p.id === view.you.id ? "you" : p.name,
  );
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">
          {done} of {total} {voting ? "voted" : "played"}
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
        aria-label={voting ? "Votes cast" : "Answers played"}
      >
        <div
          className="h-full rounded-full bg-rose-500 transition-[width] duration-500"
          style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
