"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { MAX_POINTS_TO_WIN, MIN_POINTS_TO_WIN } from "@/components/ui/fields";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

const stepClasses =
  "grid size-10 place-items-center rounded-xl border border-zinc-300 bg-white text-zinc-800 transition hover:bg-zinc-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

/** Host-only stepper for the target score. */
export function PointsToWin({ value, act }: { value: number; act: Act }) {
  const [points, setOptimisticPoints] = useOptimistic(value);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: number) {
    const clamped = Math.min(MAX_POINTS_TO_WIN, Math.max(MIN_POINTS_TO_WIN, next));
    if (clamped === points) return;
    setError(null);
    startTransition(async () => {
      setOptimisticPoints(clamped);
      const result = await act({ type: "updateSettings", pointsToWin: clamped });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold" id="points-label">
            Points to win
          </p>
          <p className="text-sm text-zinc-500">First player to reach this score wins.</p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-labelledby="points-label">
          <button
            type="button"
            className={stepClasses}
            onClick={() => change(points - 1)}
            disabled={points <= MIN_POINTS_TO_WIN}
            aria-label="Fewer points"
          >
            <MinusIcon />
          </button>
          <output className="w-9 text-center text-2xl font-black tabular-nums" aria-live="polite">
            {points}
          </output>
          <button
            type="button"
            className={stepClasses}
            onClick={() => change(points + 1)}
            disabled={points >= MAX_POINTS_TO_WIN}
            aria-label="More points"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
      <ErrorText error={error} className="mt-2" />
    </div>
  );
}
