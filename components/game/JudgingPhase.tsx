"use client";

import { useState } from "react";
import type { RoomView, RoundView } from "@/lib/game/types";
import { PromptCard } from "@/components/cards/PromptCard";
import { SubmissionCard } from "@/components/cards/SubmissionCard";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Stage, StageHeading, StickyActionBar } from "./Stage";

/** Anonymous submissions; the judge selects one and confirms. Mount with `key={round.number}`. */
export function JudgingPhase({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { run, pending, error } = useAction(act);
  const isJudge = round.judgeId === view.you.id;
  const judge = view.players.find((p) => p.id === round.judgeId);
  const yours = round.yourSubmission?.map((c) => c.id).join("|") ?? null;
  const selected = round.submissions.some((s) => s.id === selectedId) ? selectedId : null;

  return (
    <Stage
      card={<PromptCard text={round.prompt.text} pick={round.prompt.pick} />}
      caption={isJudge ? "Pick the funniest answer" : `${judge?.name ?? "The judge"} is the judge`}
    >
      {isJudge ? (
        <StageHeading title="Pick the winner">
          Read each answer out loud, then tap the funniest one and confirm.
        </StageHeading>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Spinner className="size-5 text-rose-600" />
          <div>
            <h2 className="font-bold">The judge is choosing…</h2>
            <p className="text-sm text-zinc-500">
              {judge?.name ?? "The judge"} is picking the funniest of {round.submissions.length} answers.
            </p>
          </div>
        </div>
      )}

      <ul className="grid gap-3 @xl:grid-cols-2">
        {round.submissions.map((submission) => {
          const isYours = yours !== null && submission.cards.map((c) => c.id).join("|") === yours;
          return (
            <li key={submission.id} className="animate-fade-up">
              <SubmissionCard
                prompt={round.prompt}
                cards={submission.cards}
                selected={selected === submission.id}
                onSelect={
                  isJudge ? () => setSelectedId((id) => (id === submission.id ? null : submission.id)) : undefined
                }
                disabled={pending}
                label={isYours ? "Your answer" : undefined}
              />
            </li>
          );
        })}
      </ul>

      {isJudge && (
        <StickyActionBar>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-zinc-500">
              {selected ? "Happy with that one?" : "Tap an answer to select it."}
            </p>
            <Button
              size="lg"
              disabled={!selected}
              pending={pending}
              onClick={() => selected && run({ type: "pickWinner", submissionId: selected })}
              className="shrink-0"
            >
              Pick winner
            </Button>
          </div>
          <ErrorText error={error} className="mt-2" />
        </StickyActionBar>
      )}
    </Stage>
  );
}
