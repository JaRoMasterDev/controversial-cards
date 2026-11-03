import type { RoomView, RoundView } from "@/lib/game/types";
import { PromptCard } from "@/components/cards/PromptCard";
import { TrophyIcon } from "@/components/ui/icons";

/** A player's display name; "You" for yourself unless `you` is false. */
export function nameOf(view: RoomView, playerId: string | null, you = true): string {
  if (playerId && you && playerId === view.you.id) return "You";
  return view.players.find((p) => p.id === playerId)?.name ?? "Someone who left";
}

/** The winning question card, gold-ringed with the winner's name. */
export function WinningCard({ view, round }: { view: RoomView; round: RoundView }) {
  const winning = round.submissions.find((s) => s.id === round.winnerSubmissionId);
  return (
    <PromptCard
      text={round.prompt.text}
      pick={round.prompt.pick}
      answers={winning?.cards.map((c) => c.text)}
      ring="winner"
      footer={
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-amber-300">
          <TrophyIcon className="size-3.5 shrink-0" />
          <span className="truncate">{nameOf(view, round.winnerPlayerId, false)}</span>
        </span>
      }
    />
  );
}
