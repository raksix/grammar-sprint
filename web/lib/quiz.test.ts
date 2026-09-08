/**
 * Unit tests for `quiz.ts` (P23 adaptive session engine).
 *
 * Run from `web/`: `bun test lib/quiz.test.ts`
 * (`test` / `describe` / `expect` are `bun test` globals, typed in
 * `bun-test.d.ts` so `tsc --noEmit` stays clean.)
 */

import type { Question } from "./bank";
import { drawTopicQuiz } from "./draw";
import {
  adaptiveRemaining,
  answerAdaptive,
  initAdaptive,
  isChoiceCorrect,
  learnSlugFromRuleRef,
  nextAdaptiveQuestion,
  shuffleChoices,
  stepDown,
  stepUp,
} from "./quiz";

let counter = 0;

function makeQuestion(
  overrides: Partial<Question> & { id: string },
): Question {
  counter += 1;
  const difficulty = overrides.difficulty ?? "easy";
  const type = overrides.type ?? "mcq";
  const base = {
    id: overrides.id,
    topic: overrides.topic ?? "a1-01-verb-to-be",
    level: overrides.level ?? ("A1" as const),
    difficulty,
    prompt: overrides.prompt ?? `Prompt ${counter}`,
    explain_tr: overrides.explain_tr ?? "Kural aciklamasi.",
    rule_ref: overrides.rule_ref ?? "Docs/grammar/A1/a1-01-verb-to-be.md",
  };
  if (type === "rewrite") {
    return {
      ...base,
      type: "rewrite",
      answer_text: "She is happy.",
      accept: ["She is happy"],
    };
  }
  return {
    ...base,
    type: type as "mcq" | "gap-fill",
    choices: ["She are happy.", "She is happy.", "She be happy."],
    answer: 1,
  };
}

/** 25Q synthetic topic pool matching the real quota shape (8E/9M/8H). */
function makePool(): Question[] {
  const pool: Question[] = [];
  for (let i = 0; i < 8; i += 1) {
    pool.push(
      makeQuestion({ id: `t-e${i}`, difficulty: "easy", prompt: `Easy ${i}` }),
    );
  }
  for (let i = 0; i < 9; i += 1) {
    pool.push(
      makeQuestion({
        id: `t-m${i}`,
        difficulty: "medium",
        prompt: `Medium ${i}`,
      }),
    );
  }
  for (let i = 0; i < 8; i += 1) {
    pool.push(
      makeQuestion({ id: `t-h${i}`, difficulty: "hard", prompt: `Hard ${i}` }),
    );
  }
  return pool;
}

describe("shuffleChoices", () => {
  test("is deterministic per seed and preserves the answer mapping", () => {
    const q = makeQuestion({ id: "s-1" });
    if (q.type !== "mcq" && q.type !== "gap-fill") throw new Error("bad fix");
    const first = shuffleChoices(q, "attempt-1");
    const second = shuffleChoices(q, "attempt-1");
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    const answerSlot = first.find((c) => c.originalIndex === q.answer);
    expect(answerSlot?.text).toBe("She is happy.");
    const indices = first.map((c) => c.originalIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  test("isChoiceCorrect resolves from the bank copy", () => {
    const q = makeQuestion({ id: "s-2" });
    if (q.type !== "mcq" && q.type !== "gap-fill") throw new Error("bad fix");
    expect(isChoiceCorrect(q, 1)).toBe(true);
    expect(isChoiceCorrect(q, 0)).toBe(false);
    expect(isChoiceCorrect(q, 2)).toBe(false);
  });
});

describe("step bounds", () => {
  test("clamps at hard and easy", () => {
    expect(stepUp("easy")).toBe("medium");
    expect(stepUp("medium")).toBe("hard");
    expect(stepUp("hard")).toBe("hard");
    expect(stepDown("hard")).toBe("medium");
    expect(stepDown("medium")).toBe("easy");
    expect(stepDown("easy")).toBe("easy");
  });
});

describe("adaptive pointer", () => {
  test("two consecutive correct answers step up", () => {
    const state = initAdaptive([]);
    expect(state.pointer).toBe("medium");
    answerAdaptive(state, true);
    expect(state.pointer).toBe("medium");
    answerAdaptive(state, true);
    expect(state.pointer).toBe("hard");
  });

  test("two consecutive misses step down", () => {
    const state = initAdaptive([]);
    answerAdaptive(state, false);
    expect(state.pointer).toBe("medium");
    answerAdaptive(state, false);
    expect(state.pointer).toBe("easy");
  });

  test("a mixed run holds the pointer", () => {
    const state = initAdaptive([]);
    answerAdaptive(state, true);
    answerAdaptive(state, false);
    answerAdaptive(state, true);
    answerAdaptive(state, false);
    expect(state.pointer).toBe("medium");
  });

  test("pointer never leaves easy..hard", () => {
    const state = initAdaptive([]);
    for (let i = 0; i < 6; i += 1) answerAdaptive(state, true);
    expect(state.pointer).toBe("hard");
    for (let i = 0; i < 8; i += 1) answerAdaptive(state, false);
    expect(state.pointer).toBe("easy");
  });
});

describe("adaptive draw", () => {
  test("falls back to neighbours when the pointer pool is empty", () => {
    const state = initAdaptive([makeQuestion({ id: "only-easy" })]);
    state.pointer = "hard";
    const picked = nextAdaptiveQuestion(state);
    expect(picked?.from).toBe("easy");
    expect(nextAdaptiveQuestion(state)).toBe(null);
  });

  test("a full 8Q session consumes the whole composition exactly once", () => {
    const pool = makePool();
    const drawn = drawTopicQuiz(pool, [], "quiz-test-seed");
    expect(drawn.drawn).toHaveLength(8);
    const state = initAdaptive(drawn.drawn);
    // All-correct script: pointer climbs but every card is still asked once.
    const seen = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const picked = nextAdaptiveQuestion(state);
      expect(picked === null).toBe(false);
      if (picked === null) throw new Error("drained early");
      seen.add(picked.question.id);
      answerAdaptive(state, true);
    }
    expect(seen.size).toBe(8);
    expect(adaptiveRemaining(state)).toBe(0);
    expect(nextAdaptiveQuestion(state)).toBe(null);
  });

  test("all-wrong script also completes 8 unique questions", () => {
    const pool = makePool();
    const drawn = drawTopicQuiz(pool, [], "quiz-test-seed-wrong");
    const state = initAdaptive(drawn.drawn);
    const seen = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const picked = nextAdaptiveQuestion(state);
      if (picked === null) throw new Error("drained early");
      seen.add(picked.question.id);
      answerAdaptive(state, false);
    }
    expect(seen.size).toBe(8);
    expect(state.pointer).toBe("easy");
  });
});

describe("learnSlugFromRuleRef", () => {
  test("extracts the lesson slug from a bank rule ref", () => {
    expect(learnSlugFromRuleRef("Docs/grammar/A1/a1-02-present-simple.md")).toBe(
      "a1-02-present-simple",
    );
    expect(
      learnSlugFromRuleRef("Docs/grammar/B2/b2-07-inversion.md"),
    ).toBe("b2-07-inversion");
  });

  test("returns null for garbage refs", () => {
    expect(learnSlugFromRuleRef("")).toBe(null);
    expect(learnSlugFromRuleRef("no-extension")).toBe(null);
  });
});
