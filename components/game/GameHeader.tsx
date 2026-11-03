import type { RoomView } from "@/lib/game/types";
import { LogoMark } from "@/components/ui/Logo";

export function GameHeader({ view }: { view: RoomView }) {
  const round = view.round;
  const judge = round ? view.players.find((p) => p.id === round.judgeId) : undefined;
  const winner = view.players.find((p) => p.id === view.winnerId);
  const youJudge = round?.judgeId === view.you.id;

  let title: string;
  let subtitle: string;
  if (view.phase === "gameOver") {
    title = "Game over";
    subtitle = winner ? `${winner.id === view.you.id ? "You" : winner.name} won` : "Thanks for playing";
  } else {
    title = `Round ${round?.number ?? 1}`;
    subtitle = youJudge ? "You're the judge" : `Judge: ${judge?.name ?? "someone who left"}`;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-background/85 backdrop-blur-md dark:border-zinc-800">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <LogoMark className="size-7" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight">
            {title}
            <span className="font-medium text-zinc-500"> · First to {view.settings.pointsToWin}</span>
          </p>
          <p className={`truncate text-xs font-medium ${youJudge && view.phase !== "gameOver" ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"}`}>
            {subtitle}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          Room <span className="font-mono font-bold tracking-widest text-zinc-900 dark:text-white">{view.code}</span>
        </span>
      </div>
    </header>
  );
}
