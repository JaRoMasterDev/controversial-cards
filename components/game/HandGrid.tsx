import type { AnswerCard as Card } from "@/lib/game/types";
import { AnswerCard } from "@/components/cards/AnswerCard";

/** Grid of answer cards sized to the space available (container queries). */
export function HandGrid({
  cards,
  selectedIds = [],
  onToggle,
  disabled = false,
}: {
  cards: Card[];
  /** Selected card ids in pick order. */
  selectedIds?: string[];
  onToggle?: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4">
      {cards.map((card) => {
        const index = selectedIds.indexOf(card.id);
        return (
          <li key={card.id} className="animate-fade-up">
            <AnswerCard
              text={card.text}
              order={index === -1 ? null : index + 1}
              onSelect={onToggle ? () => onToggle(card.id) : undefined}
              disabled={disabled}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Your hand when you can't play from it right now. */
export function ReadOnlyHand({ cards, title = "Your hand" }: { cards: Card[]; title?: string }) {
  if (cards.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">{title}</h3>
      <div className="opacity-80">
        <HandGrid cards={cards} />
      </div>
    </section>
  );
}
