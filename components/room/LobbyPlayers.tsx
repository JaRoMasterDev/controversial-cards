"use client";

import type { RoomView } from "@/lib/game/types";
import type { Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CrownIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "./Avatar";
import { useKick } from "./useKick";

export function LobbyPlayers({ view, act }: { view: RoomView; act: Act }) {
  const { kick, pending, error } = useKick(act);
  const activeCount = view.players.filter((p) => p.active).length;

  return (
    <Panel
      title={`Players (${view.players.length})`}
      action={
        <span className="text-xs font-medium text-zinc-500">
          {activeCount} here{activeCount < view.minPlayers && ` · ${view.minPlayers} needed`}
        </span>
      }
    >
      <ul className="-my-1 divide-y divide-zinc-100 dark:divide-zinc-800">
        {view.players.map((player) => {
          const isYou = player.id === view.you.id;
          return (
            <li key={player.id} className="flex animate-fade-up items-center gap-3 py-2.5">
              <Avatar name={player.name} away={!player.active} />
              <span className={`min-w-0 flex-1 truncate font-semibold ${player.active ? "" : "text-zinc-400"}`}>
                {player.name}
                {isYou && <span className="ml-1 font-normal text-zinc-500">(you)</span>}
              </span>
              {player.isHost && (
                <Badge tone="host">
                  <CrownIcon className="size-3" />
                  Host
                </Badge>
              )}
              {!player.active && <Badge tone="away">Away</Badge>}
              {view.you.isHost && !isYou && (
                <Button variant="danger" size="sm" disabled={pending} onClick={() => kick(player)}>
                  Kick
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <ErrorText error={error} className="mt-2" />
      {view.players.length < view.minPlayers && (
        <p className="mt-3 text-sm text-zinc-500">
          Share the code or the invite link. You need at least {view.minPlayers} players to start.
        </p>
      )}
      {activeCount === 2 && (
        <p className="mt-3 text-sm text-zinc-500">
          Two-player mode: you take turns as the leader. The leader plays a card too, then picks the funnier of the two
          answers. With three or more players, the judge only judges.
        </p>
      )}
    </Panel>
  );
}
