"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import type { PackSummary, RoomView } from "@/lib/game/types";
import { useAction, type Act } from "@/components/useAction";
import { Alert, ErrorText } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChevronIcon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { languageName } from "./languages";
import { PointsToWin } from "./PointsToWin";

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function totals(packs: PackSummary[]) {
  return {
    questions: packs.reduce((sum, p) => sum + p.promptCount, 0),
    answers: packs.reduce((sum, p) => sum + p.answerCount, 0),
  };
}

/** Warnings about the selection, mirroring the checks the server runs when the game starts. */
function selectionWarning(view: RoomView, selected: PackSummary[]): string | null {
  if (selected.length === 0) return "Pick at least one card set.";
  const { questions, answers } = totals(selected);
  if (questions === 0) return "The selected card sets have no questions.";
  const needed = view.players.length * (view.settings.handSize + 1);
  if (answers < needed) {
    return `${view.players.length} players need at least ${needed} answers, but the selection has ${answers}. Add another card set.`;
  }
  return null;
}

function Totals({ packs }: { packs: PackSummary[] }) {
  const { questions, answers } = totals(packs);
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{plural(packs.length, "card set")}</span>
      {" · "}
      {plural(questions, "question")} · {plural(answers, "answer")}
    </p>
  );
}

const CUSTOM_GROUP = "custom";

interface PackGroup {
  key: string;
  label: string;
  /** English name when the label is a native language name. */
  hint?: string;
  packs: PackSummary[];
}

/**
 * Groups the print-and-play sets by language in the server's order. Everything else (the app's own
 * sets and imports) goes into one Custom group, which the server lists last.
 */
function groupPacks(packs: PackSummary[]): PackGroup[] {
  const groups: PackGroup[] = [];
  for (const pack of packs) {
    // Only the adapted print-and-play sets carry a licence.
    const key = pack.license ? (pack.language ?? "other") : CUSTOM_GROUP;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const name = key === CUSTOM_GROUP ? { native: "Custom", english: "Custom" } : languageName(key);
      group = { key, label: name.native, hint: name.english === name.native ? undefined : name.english, packs: [] };
      groups.push(group);
    }
    group.packs.push(pack);
  }
  return groups;
}

/** Credits adapted sets as their licence requires, with a link to the full attribution. */
function LicenseNote({ packs }: { packs: PackSummary[] }) {
  const licenses = [...new Set(packs.flatMap((p) => (p.license ? [p.license] : [])))];
  if (licenses.length === 0) return null;
  return (
    <p className="text-xs leading-relaxed text-zinc-500">
      The Classic and Family sets are adapted from free print-and-play decks and shared under {licenses.join(", ")}, for
      non-commercial play only.{" "}
      <Link href="/credits" target="_blank" className="font-semibold text-zinc-700 underline underline-offset-2 dark:text-zinc-300">
        Credits and licence
      </Link>
    </p>
  );
}

function PackRow({
  pack,
  checked,
  onToggle,
  onRemove,
  removing,
}: {
  pack: PackSummary;
  checked: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  removing: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-2 rounded-xl border p-3 transition-colors ${
        checked
          ? "border-rose-300 bg-rose-50/70 dark:border-rose-500/40 dark:bg-rose-500/10"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-rose-600"
          checked={checked}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{pack.name}</span>
            {pack.custom && <Badge tone="custom">Imported</Badge>}
          </span>
          {pack.description && (
            <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-400">{pack.description}</span>
          )}
          <span className="mt-1 block text-xs font-medium text-zinc-500">
            {plural(pack.promptCount, "question")} · {plural(pack.answerCount, "answer")}
          </span>
        </span>
      </label>
      {onRemove && (
        <Button variant="danger" size="sm" disabled={removing} onClick={onRemove} aria-label={`Remove ${pack.name}`}>
          Remove
        </Button>
      )}
    </li>
  );
}

export function CardSetsPanel({ view, act }: { view: RoomView; act: Act }) {
  return view.you.isHost ? <HostCardSets view={view} act={act} /> : <CardSetsSummary view={view} />;
}

function HostCardSets({ view, act }: { view: RoomView; act: Act }) {
  const [selectedIds, setOptimisticIds] = useOptimistic(view.settings.packIds);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const remove = useAction(act);

  function toggle(packId: string) {
    const next = selectedIds.includes(packId) ? selectedIds.filter((id) => id !== packId) : [...selectedIds, packId];
    setError(null);
    startTransition(async () => {
      setOptimisticIds(next);
      const result = await act({ type: "updateSettings", packIds: next });
      if (result.error) setError(result.error);
    });
  }

  async function removePack(pack: PackSummary) {
    if (!window.confirm(`Remove “${pack.name}” from this room?`)) return;
    await remove.run({ type: "removePack", packId: pack.id });
  }

  const selected = view.packs.filter((p) => selectedIds.includes(p.id));
  const warning = selectionWarning(view, selected);
  const groups = groupPacks(view.packs);
  // Open the first language and every group with a selected set; imports always start open.
  const [openGroups, setOpenGroups] = useState(
    () =>
      new Set([
        CUSTOM_GROUP,
        ...groups.slice(0, 1).map((g) => g.key),
        ...groups.filter((g) => g.packs.some((p) => view.settings.packIds.includes(p.id))).map((g) => g.key),
      ]),
  );

  function setGroupOpen(key: string, open: boolean) {
    setOpenGroups((current) => {
      if (current.has(key) === open) return current;
      const next = new Set(current);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  return (
    <Panel title="Card sets">
      <div className="space-y-1">
        {groups.map((group) => {
          const selectedCount = group.packs.filter((p) => selectedIds.includes(p.id)).length;
          return (
            <details
              key={group.key}
              open={openGroups.has(group.key)}
              onToggle={(e) => setGroupOpen(group.key, e.currentTarget.open)}
              className="group/lang"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-2 [&::-webkit-details-marker]:hidden">
                <ChevronIcon className="size-4 shrink-0 text-zinc-400 transition-transform group-open/lang:rotate-90" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{group.label}</span>
                  {group.hint && <span className="ml-2 text-sm text-zinc-500">{group.hint}</span>}
                </span>
                <span className="shrink-0 text-xs font-medium text-zinc-500">
                  {selectedCount > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400">{selectedCount} selected</span>
                  ) : (
                    plural(group.packs.length, "set")
                  )}
                </span>
              </summary>
              <ul className="space-y-2 pb-3">
                {group.packs.map((pack) => (
                  <PackRow
                    key={pack.id}
                    pack={pack}
                    checked={selectedIds.includes(pack.id)}
                    onToggle={() => toggle(pack.id)}
                    onRemove={pack.custom ? () => removePack(pack) : undefined}
                    removing={remove.pending}
                  />
                ))}
              </ul>
            </details>
          );
        })}
      </div>
      {view.packs.length === 0 && <p className="text-sm text-zinc-500">No card sets yet. Import one below.</p>}

      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Totals packs={selected} />
        {warning && <Alert tone="notice">{warning}</Alert>}
        <ErrorText error={error ?? remove.error} />
        <LicenseNote packs={view.packs} />
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <PointsToWin value={view.settings.pointsToWin} act={act} />
      </div>
    </Panel>
  );
}

function CardSetsSummary({ view }: { view: RoomView }) {
  const selected = view.packs.filter((p) => view.settings.packIds.includes(p.id));
  return (
    <Panel title="Card sets">
      {selected.length === 0 ? (
        <p className="text-sm text-zinc-500">The host hasn&apos;t picked a card set yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((pack) => (
            <li
              key={pack.id}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm font-semibold dark:border-zinc-700"
            >
              {pack.name}
              {pack.custom && <Badge tone="custom">Imported</Badge>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 space-y-1 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Totals packs={selected} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          First to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{plural(view.settings.pointsToWin, "point")}</span>{" "}
          wins.
        </p>
      </div>
      <p className="mt-3 text-xs text-zinc-500">Only the host can change the card sets and the score.</p>
      <div className="mt-2">
        <LicenseNote packs={selected} />
      </div>
    </Panel>
  );
}
