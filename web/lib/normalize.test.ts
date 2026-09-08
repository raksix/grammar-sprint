/**
 * Unit tests for `normalize.ts` (P03 acceptance).
 *
 * The pipeline must equate the forms learners actually type
 * (`doesn't`, `DOESN'T`, `does not`, trailing `.`, extra spaces…)
 * with the canonical `accept` variants — and nothing else.
 *
 * Run from `web/`: `bun test lib/normalize.test.ts`
 * (`test` / `expect` are `bun test` globals, typed in `bun-test.d.ts`.)
 */

import { isRewriteCorrect, normalizeAnswer } from "./normalize";

test("lowercases and trims surrounding whitespace", () => {
  expect(normalizeAnswer("  She Lives. ")).toBe("she lives");
});

test("expands doesn't to does not", () => {
  expect(normalizeAnswer("She doesn't like tea.")).toBe("she does not like tea");
});

test("expansion is case-insensitive (DOESN'T, Doesn't)", () => {
  expect(normalizeAnswer("DOESN'T she agree?")).toBe("does not she agree");
  expect(normalizeAnswer("Doesn't she agree?")).toBe("does not she agree");
});

test("expands I'm to i am", () => {
  expect(normalizeAnswer("I'm ready!")).toBe("i am ready");
});

test("expands can't to cannot and won't to will not", () => {
  expect(normalizeAnswer("I can't go")).toBe("i cannot go");
  expect(normalizeAnswer("She won't come")).toBe("she will not come");
});

test("strips trailing sentence punctuation (. ! ? and runs)", () => {
  expect(normalizeAnswer("She lives here.")).toBe("she lives here");
  expect(normalizeAnswer("Are you ready?!")).toBe("are you ready");
  expect(normalizeAnswer("Really???")).toBe("really");
});

test("collapses inner whitespace", () => {
  expect(normalizeAnswer("she   lives\tin  istanbul")).toBe("she lives in istanbul");
});

test("folds curly apostrophes before expansion", () => {
  expect(normalizeAnswer("She doesn’t live here.")).toBe("she does not live here");
});

test("keeps inner punctuation that is not a contraction or ending", () => {
  expect(normalizeAnswer("Well, she lives here.")).toBe("well, she lives here");
});

test("isRewriteCorrect matches any accepted variant after normalization", () => {
  expect(
    isRewriteCorrect("She doesn't live here", [
      "She does not live here.",
      "She doesn't reside here.",
    ]),
  ).toBe(true);
  expect(isRewriteCorrect("SHE DOES NOT LIVE HERE.", ["She does not live here."])).toBe(
    true,
  );
});

test("isRewriteCorrect rejects genuinely wrong answers", () => {
  expect(isRewriteCorrect("She don't live here", ["She does not live here."])).toBe(
    false,
  );
  expect(isRewriteCorrect("She lives here", ["She does not live here."])).toBe(false);
});

test("isRewriteCorrect rejects empty input", () => {
  expect(isRewriteCorrect("   ", ["She does not live here."])).toBe(false);
  expect(isRewriteCorrect("...", ["She does not live here."])).toBe(false);
});
