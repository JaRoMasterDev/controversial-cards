"use client";

import { useCallback, useState } from "react";
import type { Action } from "@/lib/game/types";
import type { UseRoom } from "@/lib/client/useRoom";

export type Act = UseRoom["act"];

/**
 * Wraps `act` with a pending flag and the last error, for a button or form that sends
 * one kind of action. State arrives over the event stream, so nothing is refetched here.
 */
export function useAction(act: Act) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: Action) => {
      setPending(true);
      setError(null);
      const result = await act(action);
      setPending(false);
      if (result.error) setError(result.error);
      return result;
    },
    [act],
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError };
}
