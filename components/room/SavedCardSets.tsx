"use client";

import { useState } from "react";
import type { RoomView } from "@/lib/game/types";
import { MAX_PACK_NAME_LENGTH } from "@/lib/game/cards";
import { forgetPack, useSavedPacks, type SavedPack } from "@/lib/client/savedPacks";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

const normalize = (name: string) => name.trim().slice(0, MAX_PACK_NAME_LENGTH).toLowerCase();

/** Host-only list of card sets imported earlier in this browser. */
export function SavedCardSets({ view, act }: { view: RoomView; act: Act }) {
  const saved = useSavedPacks();
  const { run, pending, error } = useAction(act);
  const [busyName, setBusyName] = useState<string | null>(null);

  if (saved.length === 0) return null;

  const inRoom = new Set(view.packs.filter((p) => p.custom).map((p) => normalize(p.name)));

  async function add(pack: SavedPack) {
    setBusyName(pack.name);
    await run({ type: "importPack", name: pack.name, prompts: pack.prompts, answers: pack.answers });
    setBusyName(null);
  }

  function forget(pack: SavedPack) {
    if (window.confirm(`Forget “${pack.name}” on this device? Rooms that already have it keep it.`)) {
      forgetPack(pack.name);
    }
  }

  return (
    <Panel title="Saved on this device">
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {saved.map((pack) => {
          const added = inRoom.has(normalize(pack.name));
          return (
            <li key={pack.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{pack.name}</p>
                <p className="text-xs text-zinc-500">
                  {pack.prompts.length} questions · {pack.answers.length} answers
                </p>
              </div>
              <div className="flex items-center gap-1">
                {added ? (
                  <Badge tone="success">In this room</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    pending={busyName === pack.name}
                    onClick={() => add(pack)}
                  >
                    Add to room
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => forget(pack)}>
                  Forget
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <ErrorText error={error} className="mt-2" />
    </Panel>
  );
}
