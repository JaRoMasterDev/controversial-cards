import type { RoomView } from "@/lib/game/types";
import { Panel } from "@/components/ui/Panel";
import { Spinner } from "@/components/ui/Spinner";
import { listNames } from "./RoundProgress";

/** A running game with too few players present: it waits for someone to come back. */
export function PausedPhase({ view }: { view: RoomView }) {
  const away = view.players.filter((p) => !p.active).map((p) => p.name);
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <Spinner className="size-5 text-rose-600" />
        <h2 className="text-xl font-black tracking-tight">Game paused</h2>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {away.length > 0 ? `Waiting for ${listNames(away)} to come back.` : "Waiting for another player."} A new round
        starts as soon as one more player is here. Scores and hands are kept.
      </p>
      <p className="mt-3 text-sm text-zinc-500">
        Others can also join with the room code{" "}
        <span className="font-mono font-bold tracking-widest text-zinc-900 dark:text-white">{view.code}</span>.
        {view.you.isHost && " As the host, you can end the game instead."}
      </p>
    </Panel>
  );
}
