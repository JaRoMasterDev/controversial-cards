"use client";

import type { RoomView } from "@/lib/game/types";
import { LeaveRoomButton } from "@/components/room/LeaveRoomButton";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

/** Leave room for everyone, plus the host's End game during a running game. */
export function GameControls({ view, act }: { view: RoomView; act: Act }) {
  const end = useAction(act);
  const canEnd = view.you.isHost && view.phase !== "gameOver";

  async function endGame() {
    if (!window.confirm("End the game for everyone and go back to the lobby? Scores will be lost.")) return;
    await end.run({ type: "backToLobby" });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LeaveRoomButton act={act} confirmFirst={view.phase !== "gameOver"} />
        {canEnd && (
          <Button variant="danger" size="sm" pending={end.pending} onClick={endGame}>
            End game
          </Button>
        )}
      </div>
      <ErrorText error={end.error} />
    </div>
  );
}
