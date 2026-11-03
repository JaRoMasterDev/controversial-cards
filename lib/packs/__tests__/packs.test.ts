import { describe, expect, it } from "vitest";
import { validatePackInput } from "@/lib/game/cards";
import { BUILT_IN_PACKS } from "@/lib/packs";

describe("built-in card sets", () => {
  it("have unique ids", () => {
    const ids = BUILT_IN_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(BUILT_IN_PACKS.map((p) => [p.id, p] as const))("%s passes import validation unchanged", (_, pack) => {
    const result = validatePackInput(pack.name, pack.prompts, pack.answers);
    expect(result.ok ? [] : result.errors).toEqual([]);
    if (!result.ok) return;
    // Validation trims, collapses spaces and drops duplicates, so equality means the data is already clean.
    expect(result.pack).toEqual({ name: pack.name, prompts: pack.prompts, answers: pack.answers });
    expect(pack.prompts.length).toBeGreaterThan(0);
    expect(pack.answers.length).toBeGreaterThan(0);
  });

  it.each(BUILT_IN_PACKS.map((p) => [p.id, p] as const))("%s has no blanks in its answers", (_, pack) => {
    expect(pack.answers.filter((a) => a.includes("_"))).toEqual([]);
  });

  const adapted = BUILT_IN_PACKS.filter((p) => p.source);

  it("include the adapted print-and-play sets", () => {
    expect(adapted.length).toBeGreaterThan(0);
  });

  it.each(adapted.map((p) => [p.id, p] as const))("%s carries its attribution and language", (_, pack) => {
    const source = pack.source!;
    expect(pack.language).toBeTruthy();
    for (const field of ["title", "author", "edition", "url", "license", "licenseUrl"] as const) {
      expect(source[field], field).toBeTruthy();
    }
    expect(source.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\/licenses\//);
  });

  it.each(adapted.map((p) => [p.id, p] as const))("%s never names the original game on a card", (_, pack) => {
    // The title only belongs in the credits, not on the cards themselves.
    const title = pack.source!.title.toLowerCase();
    expect([...pack.prompts, ...pack.answers].filter((card) => card.toLowerCase().includes(title))).toEqual([]);
  });
});
