"use client";

import type { RoomView } from "@/lib/game/types";
import type { Act } from "@/components/useAction";
import { Alert } from "@/components/ui/Alert";
import { FullScreenSpinner } from "@/components/ui/Spinner";
import { GameControls } from "./GameControls";
import { GameHeader } from "./GameHeader";
import { GameOverPhase } from "./GameOverPhase";
import { JudgingPhase } from "./JudgingPhase";
import { PlayingPhase } from "./PlayingPhase";
import { RoundResultPhase } from "./RoundResultPhase";
import { Scoreboard, ScoreStrip } from "./Scoreboard";

/** A running game: phases playing, judging, roundResult and gameOver. */
export function Game({ view, act }: { view: RoomView; act: Act }) {
  const round = view.round;
  if (!round) return <FullScreenSpinner label="Dealing the cards…" />;

  let phase;
  switch (view.phase) {
    case "playing":
      phase = <PlayingPhase view={view} round={round} act={act} />;
      break;
    case "judging":
      phase = <JudgingPhase key={round.number} view={view} round={round} act={act} />;
      break;
    case "roundResult":
      phase = <RoundResultPhase key={round.number} view={view} round={round} act={act} />;
      break;
    default:
      phase = <GameOverPhase view={view} round={round} act={act} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <GameHeader view={view} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-6 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="lg:hidden">
            <ScoreStrip view={view} />
          </div>
          {view.notice && <Alert tone="notice">{view.notice}</Alert>}
          {phase}
        </div>
        <aside className="mt-8 space-y-4 lg:sticky lg:top-20 lg:mt-0">
          <Scoreboard view={view} act={act} />
          <GameControls view={view} act={act} />
        </aside>
      </main>
    </div>
  );
}
