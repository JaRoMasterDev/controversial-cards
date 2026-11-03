// Card text helpers shared by server and client: blank parsing, prompt filling and
// validation of user-imported card lists.

/** A run of underscores marks one blank, so "_" and "____" both count as one. */
const BLANK = /_+/g;

export const MAX_PICK = 3;
export const MAX_PROMPT_LENGTH = 300;
export const MAX_ANSWER_LENGTH = 200;
export const MAX_CARDS_PER_LIST = 2000;
export const MAX_PACK_NAME_LENGTH = 40;

export function countBlanks(text: string): number {
  return text.match(BLANK)?.length ?? 0;
}

/** Number of answer cards a prompt takes. Prompts without a blank take one answer. */
export function pickCount(text: string): number {
  return Math.max(1, countBlanks(text));
}

export type PromptSegment = { kind: "text"; text: string } | { kind: "blank"; answer: string | null };

/**
 * Splits a prompt into text and blank segments, filling blanks with answers in order.
 * A prompt without blanks gets one trailing blank so its answer is shown after it.
 */
export function fillPrompt(prompt: string, answers: string[] = []): PromptSegment[] {
  const parts = prompt.split(BLANK);
  const segments: PromptSegment[] = [];
  parts.forEach((text, i) => {
    if (text) segments.push({ kind: "text", text });
    if (i < parts.length - 1) segments.push({ kind: "blank", answer: blankAnswer(answers[i]) });
  });
  if (parts.length === 1) {
    segments.push({ kind: "text", text: " " });
    segments.push({ kind: "blank", answer: answers[0] ?? null });
  }
  return segments;
}

/**
 * The prompt supplies its own punctuation, so drop an answer's single trailing period
 * inside a blank (an ellipsis is kept).
 */
function blankAnswer(answer: string | undefined): string | null {
  if (answer === undefined) return null;
  return answer.replace(/([^.])\.$/, "$1");
}

export interface ParsedCardList {
  cards: string[];
  errors: string[];
}

/** Validates one imported list: a JSON array of strings (already parsed). */
export function parseCardList(input: unknown, kind: "prompts" | "answers"): ParsedCardList {
  const label = kind === "prompts" ? "Question" : "Answer";
  const errors: string[] = [];
  if (input === undefined || input === null || input === "") return { cards: [], errors };
  if (!Array.isArray(input)) {
    return { cards: [], errors: [`${label} list must be a JSON array of strings.`] };
  }
  if (input.length > MAX_CARDS_PER_LIST) {
    errors.push(`${label} list has ${input.length} cards; the limit is ${MAX_CARDS_PER_LIST}.`);
    return { cards: [], errors };
  }
  const maxLength = kind === "prompts" ? MAX_PROMPT_LENGTH : MAX_ANSWER_LENGTH;
  const seen = new Set<string>();
  const cards: string[] = [];
  input.forEach((item, i) => {
    const where = `${label} #${i + 1}`;
    if (typeof item !== "string") {
      errors.push(`${where} is not a string.`);
      return;
    }
    const text = item.trim().replace(/\s+/g, " ");
    if (!text) return;
    if (text.length > maxLength) {
      errors.push(`${where} is longer than ${maxLength} characters.`);
      return;
    }
    if (kind === "prompts" && countBlanks(text) > MAX_PICK) {
      errors.push(`${where} has more than ${MAX_PICK} blanks.`);
      return;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cards.push(text);
  });
  return { cards, errors };
}

export interface PackInput {
  name: string;
  prompts: string[];
  answers: string[];
}

/** Validates a full import. Returns the cleaned pack or the reasons it was rejected. */
export function validatePackInput(
  name: unknown,
  prompts: unknown,
  answers: unknown,
): { ok: true; pack: PackInput } | { ok: false; errors: string[] } {
  const cleanName = typeof name === "string" ? name.trim().slice(0, MAX_PACK_NAME_LENGTH) : "";
  const p = parseCardList(prompts, "prompts");
  const a = parseCardList(answers, "answers");
  const errors = [...p.errors, ...a.errors];
  if (!cleanName) errors.unshift("Give the card set a name.");
  if (errors.length === 0 && p.cards.length === 0 && a.cards.length === 0) {
    errors.push("The card set is empty. Add at least one question or answer.");
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, pack: { name: cleanName, prompts: p.cards, answers: a.cards } };
}
