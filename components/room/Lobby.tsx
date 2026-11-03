"use client";

import type { RoomView } from "@/lib/game/types";
import type { Act } from "@/components/useAction";
import { Alert } from "@/components/ui/Alert";
import { CardSetsPanel } from "./CardSetsPanel";
import { ImportCardSet } from "./ImportCardSet";
import { InvitePanel } from "./InvitePanel";
import { LobbyPlayers } from "./LobbyPlayers";
import { RoomHeader } from "./RoomHeader";
import { SavedCardSets } from "./SavedCardSets";
import { StartBar } from "./StartBar";

export function Lobby({ view, act }: { view: RoomView; act: Act }) {
  const isHost = view.you.isHost;
  return (
    <div className="flex flex-1 flex-col">
      <RoomHeader code={view.code} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-5 sm:px-6 sm:py-8">
        {view.notice && <Alert tone="notice">{view.notice}</Alert>}
        {isHost && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You&apos;re the <span className="font-semibold text-zinc-900 dark:text-zinc-100">host</span>. Invite your
            friends, pick the card sets and start the game when everyone is in.
          </p>
        )}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
          <div className="space-y-5">
            <InvitePanel code={view.code} />
            <LobbyPlayers view={view} act={act} />
          </div>
          <div className="space-y-5">
            <CardSetsPanel view={view} act={act} />
            {isHost && <ImportCardSet act={act} />}
            {isHost && <SavedCardSets view={view} act={act} />}
          </div>
        </div>
      </main>
      <StartBar view={view} act={act} />
    </div>
  );
}
