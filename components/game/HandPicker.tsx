"use client";

import { useState } from "react";
import type { AnswerCard, RoomView, RoundView } from "@/lib/game/types";
import { PromptCard } from "@/components/cards/PromptCard";
import { PromptText } from "@/components/cards/PromptText";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { HandGrid } from "./HandGrid";
import { Stage, StageHeading, StickyActionBar } from "./Stage";

const ORDINALS = ["first", "second", "third"];

/**
 * Your turn to play: pick `prompt.pick` cards in blank order and play them. Mount with
 * `key={round.number}` so the selection resets every round.
 */
export function HandPicker({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { run, pending, error } = useAction(act);
  const hand = view.you.hand;
  const pick = round.prompt.pick;

  // Ignore ids that are no longer in the hand.
  const chosen = selectedIds
    .map((id) => hand.find((card) => card.id === id))
    .filter((card): card is AnswerCard => card !== undefined);
  const chosenIds = chosen.map((c) => c.id);
  const answers = chosen.map((c) => c.text);
  const ready = chosen.length === pick;

  function toggle(id: string) {
    setSelectedIds((current) => {
      const valid = current.filter((x) => hand.some((c) => c.id === x));
      if (valid.includes(id)) return valid.filter((x) => x !== id);
      if (pick === 1) return [id];
      if (valid.length >= pick) return valid;
      return [...valid, id];
    });
  }

  const judge = view.players.find((p) => p.id === round.judgeId);
  const remaining = pick - chosen.length;
  const hint =
    pick === 1
      ? "Tap the answer you want to play."
      : `Tap ${pick} answers in the order they fill the blanks. Tap a card again to remove it.`;

  return (
    <Stage
      card={<PromptCard text={round.prompt.text} pick={pick} answers={answers} />}
      caption={chosen.length > 0 ? "Preview of your answer" : `${judge?.name ?? "The judge"} is the judge`}
    >
      <StageHeading title={pick === 1 ? "Play an answer" : `Pick ${pick} answers`}>{hint}</StageHeading>

      <HandGrid cards={hand} selectedIds={chosenIds} onToggle={toggle} disabled={pending} />

      <StickyActionBar>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            {chosen.length > 0 ? (
              <p dir="auto" className="line-clamp-2 font-semibold md:hidden">
                <PromptText
                  text={round.prompt.text}
                  answers={answers}
                  answerClassName="text-rose-600 dark:text-rose-400"
                />
              </p>
            ) : null}
            <p className={`text-zinc-500 ${chosen.length > 0 ? "hidden md:block" : ""}`}>
              {ready
                ? "Ready to play."
                : pick === 1
                  ? "Select an answer."
                  : `Select your ${ORDINALS[chosen.length] ?? "next"} answer (${remaining} to go).`}
            </p>
          </div>
          <Button
            size="lg"
            disabled={!ready}
            pending={pending}
            onClick={() => run({ type: "submit", cardIds: chosenIds })}
            className="shrink-0"
          >
            Play
          </Button>
        </div>
        <ErrorText error={error} className="mt-2" />
      </StickyActionBar>
    </Stage>
  );
}
