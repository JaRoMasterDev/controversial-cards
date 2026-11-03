import { describe, expect, it } from "vitest";
import {
  countBlanks,
  fillPrompt,
  MAX_ANSWER_LENGTH,
  MAX_CARDS_PER_LIST,
  MAX_PACK_NAME_LENGTH,
  MAX_PROMPT_LENGTH,
  parseCardList,
  pickCount,
  validatePackInput,
} from "../cards";

describe("countBlanks", () => {
  it("counts a single underscore as one blank", () => {
    expect(countBlanks("I like _.")).toBe(1);
  });

  it("counts a run of underscores as one blank", () => {
    expect(countBlanks("I like ___.")).toBe(1);
    expect(countBlanks("I like __________.")).toBe(1);
  });

  it("counts separate runs as separate blanks", () => {
    expect(countBlanks("_ and ___ walk into _.")).toBe(3);
  });

  it("returns 0 for a prompt without blanks", () => {
    expect(countBlanks("What's that smell?")).toBe(0);
    expect(countBlanks("")).toBe(0);
  });
});

describe("pickCount", () => {
  it("is 1 for a prompt without blanks", () => {
    expect(pickCount("What's that smell?")).toBe(1);
  });

  it("equals the number of blanks", () => {
    expect(pickCount("_")).toBe(1);
    expect(pickCount("___ plus ___")).toBe(2);
    expect(pickCount("_, _ and _.")).toBe(3);
  });
});

describe("fillPrompt", () => {
  it("splits a prompt into text and blank segments", () => {
    expect(fillPrompt("I like _ a lot.")).toEqual([
      { kind: "text", text: "I like " },
      { kind: "blank", answer: null },
      { kind: "text", text: " a lot." },
    ]);
  });

  it("treats ___ as a single blank", () => {
    expect(fillPrompt("I like ___.", ["Cats"])).toEqual([
      { kind: "text", text: "I like " },
      { kind: "blank", answer: "Cats" },
      { kind: "text", text: "." },
    ]);
  });

  it("fills blanks with answers in order", () => {
    expect(fillPrompt("_ is better than _.", ["Pizza", "Tacos"])).toEqual([
      { kind: "blank", answer: "Pizza" },
      { kind: "text", text: " is better than " },
      { kind: "blank", answer: "Tacos" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves blanks without an answer empty", () => {
    expect(fillPrompt("_ and _", ["Salt"])).toEqual([
      { kind: "blank", answer: "Salt" },
      { kind: "text", text: " and " },
      { kind: "blank", answer: null },
    ]);
  });

  it("strips an answer's trailing period inside a blank", () => {
    const segments = fillPrompt("I blame _.", ["My cat."]);
    expect(segments).toContainEqual({ kind: "blank", answer: "My cat" });
    expect(segments).not.toContainEqual({ kind: "blank", answer: "My cat." });
  });

  it("keeps other trailing punctuation inside a blank", () => {
    expect(fillPrompt("_", ["Why me?"])).toEqual([{ kind: "blank", answer: "Why me?" }]);
    expect(fillPrompt("_", ["Wow!"])).toEqual([{ kind: "blank", answer: "Wow!" }]);
  });

  it("keeps an ellipsis at the end of an answer inside a blank", () => {
    expect(fillPrompt("_", ["Wait for it..."])).toEqual([{ kind: "blank", answer: "Wait for it..." }]);
  });

  it("appends the answer after a prompt without blanks", () => {
    expect(fillPrompt("What's that smell?", ["My cat."])).toEqual([
      { kind: "text", text: "What's that smell?" },
      { kind: "text", text: " " },
      { kind: "blank", answer: "My cat." },
    ]);
  });

  it("appends an empty blank to a prompt without blanks when there is no answer", () => {
    expect(fillPrompt("What's that smell?")).toEqual([
      { kind: "text", text: "What's that smell?" },
      { kind: "text", text: " " },
      { kind: "blank", answer: null },
    ]);
  });
});

describe("parseCardList", () => {
  it("treats a missing list as empty without errors", () => {
    expect(parseCardList(undefined, "answers")).toEqual({ cards: [], errors: [] });
    expect(parseCardList(null, "answers")).toEqual({ cards: [], errors: [] });
  });

  it.each([["a string"], [42], [{ 0: "card" }], [true]])("rejects a non-array input (%j)", (input) => {
    const result = parseCardList(input, "prompts");
    expect(result.cards).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/JSON array of strings/);
  });

  it("rejects non-string items and names their position", () => {
    const result = parseCardList(["Fine.", 3, null, { text: "x" }, "Also fine."], "answers");
    expect(result.cards).toEqual(["Fine.", "Also fine."]);
    expect(result.errors).toEqual([
      "Answer #2 is not a string.",
      "Answer #3 is not a string.",
      "Answer #4 is not a string.",
    ]);
  });

  it("trims and collapses whitespace", () => {
    expect(parseCardList(["  A   big \n  dog.  ", "\tCats\t"], "answers")).toEqual({
      cards: ["A big dog.", "Cats"],
      errors: [],
    });
  });

  it("skips blank entries", () => {
    expect(parseCardList(["", "   ", "Real card."], "answers")).toEqual({ cards: ["Real card."], errors: [] });
  });

  it("dedupes case-insensitively, keeping the first spelling", () => {
    expect(parseCardList(["Cats.", "cats.", "  CATS.  ", "Dogs."], "answers")).toEqual({
      cards: ["Cats.", "Dogs."],
      errors: [],
    });
  });

  it("dedupes after whitespace is normalised", () => {
    expect(parseCardList(["A  dog.", "a dog."], "answers").cards).toEqual(["A dog."]);
  });

  it("accepts prompts with up to 3 blanks", () => {
    const prompts = ["No blanks?", "One _.", "_ and _.", "_, _ and ___."];
    expect(parseCardList(prompts, "prompts")).toEqual({ cards: prompts, errors: [] });
  });

  it("rejects prompts with more than 3 blanks", () => {
    const result = parseCardList(["_ _ _ _", "Fine _."], "prompts");
    expect(result.cards).toEqual(["Fine _."]);
    expect(result.errors).toEqual(["Question #1 has more than 3 blanks."]);
  });

  it("does not limit underscores in answers", () => {
    expect(parseCardList(["_ _ _ _ _"], "answers")).toEqual({ cards: ["_ _ _ _ _"], errors: [] });
  });

  it("rejects cards that are too long", () => {
    const longPrompt = "x".repeat(MAX_PROMPT_LENGTH + 1);
    const longAnswer = "y".repeat(MAX_ANSWER_LENGTH + 1);
    expect(parseCardList([longPrompt], "prompts").errors).toHaveLength(1);
    expect(parseCardList([longAnswer], "answers").errors).toHaveLength(1);
    expect(parseCardList(["x".repeat(MAX_PROMPT_LENGTH)], "prompts").errors).toEqual([]);
    expect(parseCardList(["y".repeat(MAX_ANSWER_LENGTH)], "answers").errors).toEqual([]);
  });

  it("rejects lists over the card limit", () => {
    const tooMany = Array.from({ length: MAX_CARDS_PER_LIST + 1 }, (_, i) => `Card ${i}`);
    const result = parseCardList(tooMany, "answers");
    expect(result.cards).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });
});

describe("validatePackInput", () => {
  it("returns the cleaned pack", () => {
    const result = validatePackInput("  My pack  ", ["  Why _?  ", "why _?"], ["Cats.", " cats. ", "Dogs."]);
    expect(result).toEqual({
      ok: true,
      pack: { name: "My pack", prompts: ["Why _?"], answers: ["Cats.", "Dogs."] },
    });
  });

  it("allows a pack with only questions or only answers", () => {
    expect(validatePackInput("Q", ["Why _?"], undefined).ok).toBe(true);
    expect(validatePackInput("A", [], ["Cats."]).ok).toBe(true);
  });

  it.each([[""], ["   "], [undefined], [42]])("requires a name (%j)", (name) => {
    const result = validatePackInput(name, ["Why _?"], ["Cats."]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/name/i);
  });

  it("truncates a long name", () => {
    const result = validatePackInput("n".repeat(100), ["Why _?"], ["Cats."]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pack.name).toHaveLength(MAX_PACK_NAME_LENGTH);
  });

  it("rejects an empty set", () => {
    for (const [prompts, answers] of [
      [[], []],
      [undefined, undefined],
      [["  "], [""]],
    ]) {
      const result = validatePackInput("Empty", prompts, answers);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.join(" ")).toMatch(/empty/i);
    }
  });

  it("rejects non-array lists", () => {
    expect(validatePackInput("Bad", "Why _?", ["Cats."]).ok).toBe(false);
    expect(validatePackInput("Bad", ["Why _?"], { a: "Cats." }).ok).toBe(false);
  });

  it("rejects the whole pack when any card is invalid", () => {
    const result = validatePackInput("Bad", ["Why _?", "_ _ _ _"], ["Cats.", 7]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(2);
  });
});
