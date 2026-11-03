"use client";

import { useMemo, useState, type FormEvent } from "react";
import { MAX_PACK_NAME_LENGTH, parseCardList, pickCount, validatePackInput, type PackInput } from "@/lib/game/cards";
import { savePack } from "@/lib/client/savedPacks";
import { AnswerCard } from "@/components/cards/AnswerCard";
import { PromptCard } from "@/components/cards/PromptCard";
import { useAction, type Act } from "@/components/useAction";
import { Alert, ErrorText } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DownloadIcon } from "@/components/ui/icons";
import { inputClasses, labelClasses } from "@/components/ui/fields";
import { JsonListField } from "./JsonListField";

interface JsonResult {
  value: unknown;
  error: string | null;
}

function parseJson(text: string): JsonResult {
  if (!text.trim()) return { value: undefined, error: null };
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: undefined, error: error instanceof Error ? error.message : "Invalid JSON." };
  }
}

interface Preview {
  touched: boolean;
  promptsJson: JsonResult;
  answersJson: JsonResult;
  prompts: string[];
  answers: string[];
  errors: string[];
  pack: PackInput | null;
}

function buildPreview(name: string, promptsText: string, answersText: string): Preview {
  const promptsJson = parseJson(promptsText);
  const answersJson = parseJson(answersText);
  const prompts = parseCardList(promptsJson.value, "prompts").cards;
  const answers = parseCardList(answersJson.value, "answers").cards;
  const result = validatePackInput(name, promptsJson.value, answersJson.value);
  const jsonBroken = promptsJson.error !== null || answersJson.error !== null;
  return {
    touched: Boolean(name.trim() || promptsText.trim() || answersText.trim()),
    promptsJson,
    answersJson,
    prompts,
    answers,
    // A list that isn't valid JSON is reported under its own field.
    errors: result.ok ? [] : result.errors.filter((e) => !(jsonBroken && e.startsWith("The card set is empty"))),
    pack: result.ok && !jsonBroken ? result.pack : null,
  };
}

function describePrompts(prompts: string[]): string {
  const multi = prompts.filter((p) => pickCount(p) > 1).length;
  const base = `${prompts.length} question${prompts.length === 1 ? "" : "s"}`;
  return multi > 0 ? `${base} (${multi} with more than one blank)` : base;
}

const MAX_ERRORS_SHOWN = 5;

/** Host-only form to add a card set from two JSON arrays. */
export function ImportCardSet({ act }: { act: Act }) {
  const [name, setName] = useState("");
  const [promptsText, setPromptsText] = useState("");
  const [answersText, setAnswersText] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const { run, pending, error } = useAction(act);

  const preview = useMemo(() => buildPreview(name, promptsText, answersText), [name, promptsText, answersText]);

  // Editing after a successful import starts a new one.
  const edit = (set: (value: string) => void) => (value: string) => {
    setSuccess(null);
    set(value);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pack = preview.pack;
    if (!pack) return;
    setSuccess(null);
    const result = await run({ type: "importPack", name: pack.name, prompts: pack.prompts, answers: pack.answers });
    if (result.error) return;
    const saved = savePack(pack);
    setSuccess(
      saved
        ? `Added “${pack.name}” to the room and saved it on this device.`
        : `Added “${pack.name}” to the room. It couldn't be saved on this device.`,
    );
    setName("");
    setPromptsText("");
    setAnswersText("");
  }

  const shownErrors = preview.errors.slice(0, MAX_ERRORS_SHOWN);
  const hiddenErrors = preview.errors.length - shownErrors.length;

  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-bold tracking-tight">Import a card set</span>
          <span className="block text-sm text-zinc-500">Bring your own questions and answers as JSON.</span>
        </span>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg font-bold transition-transform group-open:rotate-45 dark:bg-zinc-800"
        >
          +
        </span>
      </summary>

      <form onSubmit={onSubmit} className="space-y-4 border-t border-zinc-100 p-4 sm:p-5 dark:border-zinc-800" noValidate>
        <div className="rounded-xl bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-400">
          <p>
            Each list is a plain JSON array of strings. In a question, <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100">_</code>{" "}
            marks a blank (up to three). A question without a blank takes one answer. You can leave one of the lists
            empty.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a
              href="/examples/questions.json"
              download
              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline dark:text-rose-400"
            >
              <DownloadIcon className="size-3.5" />
              questions.json template
            </a>
            <a
              href="/examples/answers.json"
              download
              className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline dark:text-rose-400"
            >
              <DownloadIcon className="size-3.5" />
              answers.json template
            </a>
          </p>
        </div>

        <div>
          <label htmlFor="import-name" className={labelClasses}>
            Card set name
          </label>
          <input
            id="import-name"
            className={inputClasses}
            value={name}
            onChange={(e) => edit(setName)(e.target.value)}
            maxLength={MAX_PACK_NAME_LENGTH}
            placeholder="e.g. Road trip"
            autoComplete="off"
          />
        </div>

        <JsonListField
          id="import-questions"
          label="Questions"
          value={promptsText}
          onChange={edit(setPromptsText)}
          placeholder={'["Nothing ruins a picnic like _.", "_ + _ = a very long Monday."]'}
          jsonError={preview.promptsJson.error}
        />

        <JsonListField
          id="import-answers"
          label="Answers"
          value={answersText}
          onChange={edit(setAnswersText)}
          placeholder={'["A suspiciously large spoon.", "Grandma\'s secret playlist."]'}
          jsonError={preview.answersJson.error}
        />

        {preview.touched && (
          <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Preview</p>
            <p className="text-sm font-medium">
              {describePrompts(preview.prompts)} · {preview.answers.length} answer{preview.answers.length === 1 ? "" : "s"}
            </p>
            {shownErrors.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-red-600 dark:text-red-400">
                {shownErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {hiddenErrors > 0 && <li>…and {hiddenErrors} more.</li>}
              </ul>
            )}
            {(preview.prompts.length > 0 || preview.answers.length > 0) && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {preview.prompts.slice(0, 2).map((text) => (
                  <PromptCard key={`q-${text}`} text={text} pick={pickCount(text)} size="sm" />
                ))}
                {preview.answers.slice(0, 2).map((text) => (
                  <AnswerCard key={`a-${text}`} text={text} size="sm" />
                ))}
              </div>
            )}
          </div>
        )}

        <ErrorText error={error} />
        {success && <Alert tone="success">{success}</Alert>}

        <Button type="submit" className="w-full sm:w-auto" disabled={!preview.pack} pending={pending}>
          Add card set to the room
        </Button>
      </form>
    </details>
  );
}
