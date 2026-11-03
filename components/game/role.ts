import type { RoundView } from "@/lib/game/types";

/** What the round's judge is called. In two-player rounds they play a card too and are the leader. */
export function judgeRole(round: RoundView): "leader" | "judge" {
  return round.twoPlayer ? "leader" : "judge";
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
