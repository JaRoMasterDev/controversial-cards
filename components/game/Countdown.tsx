"use client";

import { useEffect, useState } from "react";

/** The current time, updated from a timer (never read during render). Null until the first tick. */
function useNow(intervalMs: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}

/** "Next round in 9s", counting down to an epoch-ms deadline. */
export function Countdown({ until, label = "Next round in" }: { until: number; label?: string }) {
  const now = useNow(250);
  if (now === null) return <span>&nbsp;</span>;
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <span className="tabular-nums">
      {seconds > 0 ? (
        <>
          {label} <span className="font-black text-zinc-900 dark:text-white">{seconds}s</span>
        </>
      ) : (
        "Starting the next round…"
      )}
    </span>
  );
}
