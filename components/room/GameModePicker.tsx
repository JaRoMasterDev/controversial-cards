"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { GameMode } from "@/lib/game/types";
import type { Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";

export const MODES: { value: GameMode; label: string; description: string }[] = [
  {
    value: "vote",
    label: "Everyone votes",
    description: "Everyone plays an answer, then votes for the funniest one that isn't their own.",
  },
  {
    value: "judge",
    label: "Rotating judge",
    description: "Each round one player sits out as the judge and picks the winner.",
  },
];

/** Host-only choice of how each round's winner is decided. */
export function GameModePicker({ value, act }: { value: GameMode; act: Act }) {
  const [mode, setOptimisticMode] = useOptimistic(value);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: GameMode) {
    if (next === mode) return;
    setError(null);
    startTransition(async () => {
      setOptimisticMode(next);
      const result = await act({ type: "updateSettings", mode: next });
      if (result.error) setError(result.error);
    });
  }

  return (
    <fieldset>
      <legend className="font-semibold">Who picks the winner</legend>
      <p className="text-sm text-zinc-500">With only two players, you take turns as the leader instead.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {MODES.map((option) => {
          const checked = option.value === mode;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                checked
                  ? "border-rose-300 bg-rose-50/70 dark:border-rose-500/40 dark:bg-rose-500/10"
                  : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              }`}
            >
              <input
                type="radio"
                name="game-mode"
                value={option.value}
                checked={checked}
                onChange={() => change(option.value)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-rose-600"
              />
              <span className="min-w-0">
                <span className="block font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <ErrorText error={error} className="mt-2" />
    </fieldset>
  );
}
