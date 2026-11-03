"use client";

import type { RoomView } from "@/lib/game/types";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { LeaveRoomButton } from "./LeaveRoomButton";

/** Sticky footer of the lobby: the host's start button, or a waiting message for everyone else. */
export function StartBar({ view, act }: { view: RoomView; act: Act }) {
  const { run, pending, error } = useAction(act);
  const activeCount = view.players.filter((p) => p.active).length;
  const host = view.players.find((p) => p.isHost);

  let reason: string | null = null;
  if (activeCount < view.minPlayers) {
    const missing = view.minPlayers - activeCount;
    reason = `Waiting for ${missing} more player${missing === 1 ? "" : "s"} (at least ${view.minPlayers} needed).`;
  } else if (view.settings.packIds.length === 0) {
    reason = "Pick at least one card set to start.";
  }

  return (
    <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-background/85 backdrop-blur-md dark:border-zinc-800">
      <div className="mx-auto w-full max-w-5xl space-y-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        {view.you.isHost ? (
          <>
            {error ? (
              <ErrorText error={error} />
            ) : (
              reason && <p className="text-sm text-zinc-600 dark:text-zinc-400">{reason}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <LeaveRoomButton act={act} />
              <Button
                size="lg"
                className="min-w-40"
                disabled={reason !== null}
                pending={pending}
                onClick={() => run({ type: "startGame" })}
              >
                Start game
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <LeaveRoomButton act={act} />
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <Spinner className="size-3.5 text-rose-600" />
              Waiting for {host ? host.name : "the host"} to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
