/**
 * Unit tests for `draw.ts` (P02 acceptance).
 *
 * Core property under test: a FULL cycle completes with ZERO repeats
 * until every pooled question has been drawn once — only then does the
 * engine reshuffle previously asked questions (`cycleCompleted: true`).
 *
 * Run from `web/`: `bun test lib/draw.test.ts`
 * (`test` / `describe` / `expect` are `bun test` globals, typed in
 * `bun-test.d.ts` so `tsc --noEmit` stays clean.)
 */

import type { Difficulty, Level, Question } from "./bank";
import {
  FINAL_QUOTA,
  GATE_QUOTA,
  TOPIC_QUIZ_QUOTA,
  drawFinal,
  drawGate,
  drawTopicQuiz,
  drawUnseen,
  hashSeed,
  hasUnseen,
  mulberry32,
  sameIdSet,
  seededShuffle,
} from "./draw";

function makeQuestion(
  id: string,
  topic: string,
  level: Level,
  difficulty: Difficulty,
): Question {
  return {
    id,
    topic,
    level,
    difficulty,
    type: "mcq",
    prompt: `Choose the correct sentence for ${id}.`,
    choices: [`${id} option a`, `${id} option b`, `${id} option c`],
    answer: 0,
    explain_tr: `Kural aciklamasi ${id}.`,
    rule_ref: `Docs/grammar/${level}/${topic}.md`,
  };
}

function makePool(
  topics: readonly string[],
  level: Level,
  per: Record<Difficulty, number>,
  prefix: string,
): Question[] {
  const pool: Question[] = [];
  const diffs: readonly Difficulty[] = ["easy", "medium", "hard"];
  const letters: Record<Difficulty, string> = {
    easy: "e",
    medium: "m",
    hard: "h",
  };
  for (const topic of topics) {
    for (const d of diffs) {
      for (let i = 1; i <= per[d]; i += 1) {
        const num = String(i).padStart(2, "0");
        pool.push(
          makeQuestion(
            `${prefix}-${topic}-${letters[d]}${num}`,
            `${prefix}-${topic}`,
            level,
            d,
          ),
        );
      }
    }
  }
  return pool;
}

function ids(questions: readonly Question[]): string[] {
  return questions.map((q) => q.id);
}

function uniqueCount(values: readonly string[]): number {
  return new Set(values).size;
}

function countByDifficulty(questions: readonly Question[]): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) {
    counts[q.difficulty] += 1;
  }
  return counts;
}

function countByTopic(questions: readonly Question[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const q of questions) {
    counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
  }
  return counts;
}

describe("mulberry32", () => {
  test("same seed yields the same sequence", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i += 1) {
      expect(a()).toBe(b());
    }
  });

  test("values stay in [0, 1)", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 100; i += 1) {
      const v = rand();
      expect(v >= 0).toBe(true);
      expect(v < 1).toBe(true);
    }
  });

  test("different seeds diverge", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let differ = false;
    for (let i = 0; i < 5; i += 1) {
      if (a() !== b()) {
        differ = true;
      }
    }
    expect(differ).toBe(true);
  });
});

describe("hashSeed", () => {
  test("deterministic uint32", () => {
    expect(hashSeed("u123-2026-09-08")).toBe(hashSeed("u123-2026-09-08"));
    const h = hashSeed("u123-2026-09-08");
    expect(Number.isInteger(h)).toBe(true);
    expect(h >= 0).toBe(true);
    expect(h <= 0xffffffff).toBe(true);
  });

  test("different inputs (usually) hash differently", () => {
    expect(hashSeed("user-a-2026-09-08") === hashSeed("user-b-2026-09-08")).toBe(
      false,
    );
  });
});

describe("seededShuffle", () => {
  test("same seed gives the same order", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    expect(seededShuffle(items, "day-1")).toEqual(seededShuffle(items, "day-1"));
  });

  test("preserves every element, does not mutate input", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const before = [...items];
    const shuffled = seededShuffle(items, "day-1");
    expect([...shuffled].sort()).toEqual([...items].sort());
    expect(items).toEqual(before);
  });

  test("different seed reorders a 10-element array", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const first = seededShuffle(items, "seed-one").join(",");
    const second = seededShuffle(items, "seed-two").join(",");
    expect(first === second).toBe(false);
  });
});

describe("drawUnseen", () => {
  test("draws the requested count, all unique, no wrap on fresh pool", () => {
    const pool = makePool(["t1"], "A1", { easy: 10, medium: 0, hard: 0 }, "a1");
    const result = drawUnseen(pool, [], 4, "s1");
    expect(result.drawn).toHaveLength(4);
    expect(uniqueCount(ids(result.drawn))).toBe(4);
    expect(result.cycleCompleted).toBe(false);
    expect(result.askedIds).toHaveLength(4);
  });

  test("FULL cycle with ZERO repeats until exhaustion (P02 acceptance)", () => {
    const pool = makePool(["t1"], "A1", { easy: 10, medium: 0, hard: 0 }, "a1");
    const first = drawUnseen(pool, [], 4, "cycle-seed");
    expect(first.cycleCompleted).toBe(false);
    const second = drawUnseen(pool, first.askedIds, 4, "cycle-seed");
    expect(second.cycleCompleted).toBe(false);
    // 8 drawn so far, every id unique: zero repeats until exhaustion.
    const seenSoFar = [...ids(first.drawn), ...ids(second.drawn)];
    expect(seenSoFar).toHaveLength(8);
    expect(uniqueCount(seenSoFar)).toBe(8);
    // Third draw: 2 unseen remain, so it must contain both, then wrap.
    const unseenBefore = ids(pool).filter(
      (id) => !second.askedIds.includes(id),
    );
    expect(unseenBefore).toHaveLength(2);
    const third = drawUnseen(pool, second.askedIds, 4, "cycle-seed");
    expect(third.drawn).toHaveLength(4);
    for (const id of unseenBefore) {
      expect(ids(third.drawn)).toContain(id);
    }
    expect(third.cycleCompleted).toBe(true);
    // After the full cycle every pool id has been asked at least once.
    expect(hasUnseen(pool, third.askedIds)).toBe(false);
  });

  test("deterministic for identical inputs", () => {
    const pool = makePool(["t1"], "A1", { easy: 10, medium: 0, hard: 0 }, "a1");
    const a = drawUnseen(pool, [], 4, "det-seed");
    const b = drawUnseen(pool, [], 4, "det-seed");
    expect(ids(a.drawn)).toEqual(ids(b.drawn));
  });

  test("count larger than pool fills with repeats and flags the cycle", () => {
    const pool = makePool(["t1"], "A1", { easy: 3, medium: 0, hard: 0 }, "a1");
    const result = drawUnseen(pool, [], 5, "overflow-seed");
    expect(result.drawn).toHaveLength(5);
    expect(uniqueCount(ids(result.drawn))).toBe(3);
    expect(result.cycleCompleted).toBe(true);
  });

  test("empty pool draws nothing", () => {
    const result = drawUnseen([], [], 4, "empty-seed");
    expect(result.drawn).toHaveLength(0);
    expect(result.cycleCompleted).toBe(false);
  });
});

describe("drawTopicQuiz", () => {
  const pool = makePool(["t1"], "A1", { easy: 8, medium: 9, hard: 8 }, "a1");

  test("composition is 3 easy / 3 medium / 2 hard", () => {
    const result = drawTopicQuiz(pool, [], "quiz-seed");
    expect(result.drawn).toHaveLength(8);
    const counts = countByDifficulty(result.drawn);
    expect(counts.easy).toBe(TOPIC_QUIZ_QUOTA.easy);
    expect(counts.medium).toBe(TOPIC_QUIZ_QUOTA.medium);
    expect(counts.hard).toBe(TOPIC_QUIZ_QUOTA.hard);
    expect(uniqueCount(ids(result.drawn))).toBe(8);
    expect(result.cycleCompleted).toBe(false);
  });

  test("consecutive quizzes do not repeat while unseen remain", () => {
    const first = drawTopicQuiz(pool, [], "quiz-seed");
    const second = drawTopicQuiz(pool, first.askedIds, "quiz-seed");
    const overlap = ids(second.drawn).filter((id) =>
      first.askedIds.includes(id),
    );
    expect(overlap).toHaveLength(0);
  });

  test("full topic cycle: 24 unique across three quizzes, wrap on fourth", () => {
    const cyclePool = makePool(["t1"], "A1", { easy: 9, medium: 9, hard: 9 }, "a1");
    const first = drawTopicQuiz(cyclePool, [], "topic-cycle");
    const second = drawTopicQuiz(cyclePool, first.askedIds, "topic-cycle");
    const third = drawTopicQuiz(cyclePool, second.askedIds, "topic-cycle");
    const seen = [...ids(first.drawn), ...ids(second.drawn), ...ids(third.drawn)];
    expect(seen).toHaveLength(24);
    expect(uniqueCount(seen)).toBe(24);
    const fourth = drawTopicQuiz(cyclePool, third.askedIds, "topic-cycle");
    expect(fourth.drawn).toHaveLength(8);
    expect(fourth.cycleCompleted).toBe(true);
  });
});

describe("drawGate", () => {
  const topics = ["t1", "t2", "t3", "t4"];
  const pool = makePool(topics, "A1", { easy: 4, medium: 5, hard: 3 }, "a1");

  test("composition is 10 easy / 12 medium / 8 hard, all unique", () => {
    const result = drawGate(pool, [], "gate-seed");
    expect(result.drawn).toHaveLength(30);
    const counts = countByDifficulty(result.drawn);
    expect(counts.easy).toBe(GATE_QUOTA.easy);
    expect(counts.medium).toBe(GATE_QUOTA.medium);
    expect(counts.hard).toBe(GATE_QUOTA.hard);
    expect(uniqueCount(ids(result.drawn))).toBe(30);
    expect(result.cycleCompleted).toBe(false);
  });

  test("round-robin spreads each difficulty across topics (max-min <= 1)", () => {
    const result = drawGate(pool, [], "gate-seed");
    const diffs: readonly Difficulty[] = ["easy", "medium", "hard"];
    for (const d of diffs) {
      const perTopic = countByTopic(result.drawn.filter((q) => q.difficulty === d));
      expect(perTopic.size).toBe(topics.length);
      const values = [...perTopic.values()];
      let min = values[0] ?? 0;
      let max = values[0] ?? 0;
      for (const v of values) {
        if (v < min) {
          min = v;
        }
        if (v > max) {
          max = v;
        }
      }
      expect(max - min <= 1).toBe(true);
    }
  });

  test("unseen-first: asked ids are avoided while unseen remain", () => {
    const asked = ids(pool).slice(0, 10);
    const result = drawGate(pool, asked, "gate-seed");
    const overlap = ids(result.drawn).filter((id) => asked.includes(id));
    expect(overlap).toHaveLength(0);
  });

  test("retake never repeats the identical 30 while unseen remain", () => {
    const first = drawGate(pool, [], "retake-seed");
    const second = drawGate(
      pool,
      first.askedIds,
      "retake-seed",
      ids(first.drawn),
    );
    expect(second.drawn).toHaveLength(30);
    expect(sameIdSet(second.drawn, ids(first.drawn))).toBe(false);
  });
});

describe("drawFinal", () => {
  const pool = [
    ...makePool(["t1", "t2", "t3"], "A1", { easy: 8, medium: 9, hard: 8 }, "a1"),
    ...makePool(["t4", "t5", "t6"], "B2", { easy: 8, medium: 9, hard: 8 }, "b2"),
  ];

  test("composition is 20 easy / 20 medium / 10 hard, all unique", () => {
    const result = drawFinal(pool, [], "final-seed");
    expect(result.drawn).toHaveLength(50);
    const counts = countByDifficulty(result.drawn);
    expect(counts.easy).toBe(FINAL_QUOTA.easy);
    expect(counts.medium).toBe(FINAL_QUOTA.medium);
    expect(counts.hard).toBe(FINAL_QUOTA.hard);
    expect(uniqueCount(ids(result.drawn))).toBe(50);
    expect(result.cycleCompleted).toBe(false);
  });

  test("round-robin spreads each difficulty across topics (max-min <= 1)", () => {
    const result = drawFinal(pool, [], "final-seed");
    const diffs: readonly Difficulty[] = ["easy", "medium", "hard"];
    for (const d of diffs) {
      const perTopic = countByTopic(result.drawn.filter((q) => q.difficulty === d));
      expect(perTopic.size).toBe(6);
      const values = [...perTopic.values()];
      let min = values[0] ?? 0;
      let max = values[0] ?? 0;
      for (const v of values) {
        if (v < min) {
          min = v;
        }
        if (v > max) {
          max = v;
        }
      }
      expect(max - min <= 1).toBe(true);
    }
  });

  test("mixes both levels", () => {
    const result = drawFinal(pool, [], "final-seed");
    const levels = new Set(result.drawn.map((q) => q.level));
    expect(levels.has("A1")).toBe(true);
    expect(levels.has("B2")).toBe(true);
  });

  test("unseen-first: asked ids are avoided while unseen remain", () => {
    const asked = ids(pool).slice(0, 20);
    const result = drawFinal(pool, asked, "final-seed");
    const overlap = ids(result.drawn).filter((id) => asked.includes(id));
    expect(overlap).toHaveLength(0);
  });

  test("retake never repeats the identical 50 while unseen remain", () => {
    const first = drawFinal(pool, [], "final-retake-seed");
    const second = drawFinal(
      pool,
      first.askedIds,
      "final-retake-seed",
      ids(first.drawn),
    );
    expect(second.drawn).toHaveLength(50);
    expect(sameIdSet(second.drawn, ids(first.drawn))).toBe(false);
  });
});

describe("sameIdSet", () => {
  test("order-insensitive equality", () => {
    expect(sameIdSet(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
    expect(sameIdSet(["a", "b"], ["a", "b", "c"])).toBe(false);
    expect(sameIdSet(["a", "b"], ["a", "x"])).toBe(false);
  });
});
