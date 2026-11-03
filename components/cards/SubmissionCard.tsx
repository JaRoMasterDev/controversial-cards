import type { ReactNode } from "react";
import type { AnswerCard, PromptCard as Prompt } from "@/lib/game/types";
import { PromptCard } from "./PromptCard";

/**
 * One player's answer shown as the question filled with their cards. Becomes a toggle
 * when `onSelect` is given (the judge choosing a winner).
 */
export function SubmissionCard({
  prompt,
  cards,
  label,
  selected = false,
  winner = false,
  onSelect,
  disabled = false,
}: {
  prompt: Prompt;
  cards: AnswerCard[];
  /** Shown in the card's footer, e.g. the author's name. */
  label?: ReactNode;
  selected?: boolean;
  winner?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  const card = (
    <PromptCard
      size="md"
      text={prompt.text}
      pick={1}
      answers={cards.map((c) => c.text)}
      ring={winner ? "winner" : selected ? "selected" : "default"}
      footer={label ? <span className="min-w-0 truncate text-xs font-semibold text-zinc-300">{label}</span> : undefined}
      className={`h-full ${selected ? "-translate-y-0.5" : ""}`}
    />
  );

  if (!onSelect) return card;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className="block h-full w-full cursor-pointer rounded-2xl text-start transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] disabled:cursor-not-allowed"
    >
      {card}
    </button>
  );
}
