"use client";

import { useAction, type Act } from "@/components/useAction";

/** The host's kick action with a confirmation, shared by the lobby and the scoreboard. */
export function useKick(act: Act) {
  const { run, pending, error } = useAction(act);

  async function kick(player: { id: string; name: string }) {
    if (!window.confirm(`Remove ${player.name} from the room?`)) return;
    await run({ type: "kick", playerId: player.id });
  }

  return { kick, pending, error };
}
