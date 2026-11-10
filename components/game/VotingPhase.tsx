"use client";

import { useState } from "react";
import type { RoomView, RoundView } from "@/lib/game/types";
import { PromptCard } from "@/components/cards/PromptCard";
import { SubmissionCard } from "@/components/cards/SubmissionCard";
import { useAction, type Act } from "@/components/useAction";
import { ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Spinner } from "@/components/ui/Spinner";
import { RoundProgress, waitingVoters } from "./RoundProgress";
import { Stage, StageHeading, StickyActionBar } from "./Stage";

/**
 * A voting round's anonymous answers: everyone picks a favourite other than their own and
 * confirms. Mount with `key={round.number}`.
 */
export function VotingPhase({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { run, pending, error } = useAction(act);
  const canVote = round.voterIds.includes(view.you.id) && round.yourVote === null;
  const selected = round.submissions.some((s) => s.id === selectedId && !s.yours) ? selectedId : null;
  const waiting = waitingVoters(view, round).length;

  let caption: string;
  let status;
  if (canVote) {
    caption = "Pick your favourite answer";
    status = (
      <StageHeading title="Vote for the funniest">
        Read the answers out loud, then tap your favourite and confirm. You can&apos;t vote for your own.
      </StageHeading>
    );
  } else {
    caption = round.yourVote ? "Your vote is in" : "Everyone is voting";
    status = (
      <Panel>
        <div className="flex items-center gap-3">
          <Spinner className="size-5 text-rose-600" />
          <div>
            <h2 className="text-lg font-bold">
              {waiting > 0 ? `Waiting for ${waiting} more vote${waiting === 1 ? "" : "s"}…` : "All votes are in…"}
            </h2>
            {!round.yourVote && (
              <p className="text-sm text-zinc-500">
                {round.participantIds.includes(view.you.id)
                  ? "There's no other answer for you to vote for this round."
                  : "You'll get to play and vote from the next round."}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <RoundProgress view={view} round={round} kind="vote" />
        </div>
      </Panel>
    );
  }

  return (
    <Stage card={<PromptCard text={round.prompt.text} pick={round.prompt.pick} />} caption={caption}>
      {status}

      <ul className="grid gap-3 @xl:grid-cols-2">
        {round.submissions.map((submission) => {
          const votedFor = round.yourVote === submission.id;
          return (
            <li key={submission.id} className={`animate-fade-up ${canVote && submission.yours ? "opacity-60" : ""}`}>
              <SubmissionCard
                prompt={round.prompt}
                cards={submission.cards}
                selected={votedFor || selected === submission.id}
                onSelect={
                  canVote && !submission.yours
                    ? () => setSelectedId((id) => (id === submission.id ? null : submission.id))
                    : undefined
                }
                disabled={pending}
                label={submission.yours ? "Your answer" : votedFor ? "Your vote" : undefined}
              />
            </li>
          );
        })}
      </ul>

      {canVote && (
        <StickyActionBar>
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-zinc-500">
              {selected ? "Happy with that one?" : "Tap an answer to vote for it."}
            </p>
            <Button
              size="lg"
              disabled={!selected}
              pending={pending}
              onClick={() => selected && run({ type: "vote", submissionId: selected })}
              className="shrink-0"
            >
              Vote
            </Button>
          </div>
          <ErrorText error={error} className="mt-2" />
        </StickyActionBar>
      )}
    </Stage>
  );
}
