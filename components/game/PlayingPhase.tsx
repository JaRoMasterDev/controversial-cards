"use client";

import type { RoomView, RoundView } from "@/lib/game/types";
import { PromptCard } from "@/components/cards/PromptCard";
import type { Act } from "@/components/useAction";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { Spinner } from "@/components/ui/Spinner";
import { ReadOnlyHand } from "./HandGrid";
import { HandPicker } from "./HandPicker";
import { RoundProgress, waitingPlayers } from "./RoundProgress";
import { judgeRole } from "./role";
import { Stage, StageHeading } from "./Stage";

export function PlayingPhase({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const me = view.you.id;
  if (round.judgeId === me && !round.twoPlayer) return <JudgeWaiting view={view} round={round} />;
  if (!round.participantIds.includes(me)) return <NotDealtIn view={view} round={round} />;
  if (round.yourSubmission) return <Submitted view={view} round={round} />;
  return <HandPicker key={round.number} view={view} round={round} act={act} />;
}

function JudgeWaiting({ view, round }: { view: RoomView; round: RoundView }) {
  return (
    <Stage
      card={<PromptCard text={round.prompt.text} pick={round.prompt.pick} />}
      caption="Read the question out loud"
    >
      <Panel>
        <Badge tone="judge">Judge</Badge>
        <h2 className="mt-2 text-2xl font-black tracking-tight">You&apos;re the judge</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Read the question out loud. When everyone has played, the answers appear here without names and you pick the
          funniest.
        </p>
        <div className="mt-5">
          <RoundProgress view={view} round={round} />
        </div>
      </Panel>
    </Stage>
  );
}

function Submitted({ view, round }: { view: RoomView; round: RoundView }) {
  const waiting = waitingPlayers(view, round).length;
  return (
    <Stage
      card={
        <PromptCard
          text={round.prompt.text}
          pick={round.prompt.pick}
          answers={(round.yourSubmission ?? []).map((c) => c.text)}
        />
      }
      caption="Your answer is in"
    >
      <Panel>
        <div className="flex items-center gap-3">
          <Spinner className="size-5 text-rose-600" />
          <h2 className="text-lg font-bold">
            {waiting > 0 ? `Waiting for ${waiting} more…` : "Everyone has played…"}
          </h2>
        </div>
        <div className="mt-4">
          <RoundProgress view={view} round={round} />
        </div>
      </Panel>
      <ReadOnlyHand cards={view.you.hand} />
    </Stage>
  );
}

function NotDealtIn({ view, round }: { view: RoomView; round: RoundView }) {
  const judge = view.players.find((p) => p.id === round.judgeId);
  return (
    <Stage
      card={<PromptCard text={round.prompt.text} pick={round.prompt.pick} />}
      caption={`${judge?.name ?? `The ${judgeRole(round)}`} is the ${judgeRole(round)}`}
    >
      <StageHeading title="You'll be dealt in next round">
        This round started before you joined. Watch how it goes, your cards are ready for the next one.
      </StageHeading>
      <Alert tone="info">
        <RoundProgress view={view} round={round} />
      </Alert>
      <ReadOnlyHand cards={view.you.hand} />
    </Stage>
  );
}
