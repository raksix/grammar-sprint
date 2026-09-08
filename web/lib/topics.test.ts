/**
 * Unit tests for `topics.ts` (P21 lock-state logic).
 *
 * Run from `web/`: `bun test lib/topics.test.ts`
 * (`test` / `describe` / `expect` are `bun test` globals, typed in
 * `bun-test.d.ts` so `tsc --noEmit` stays clean.)
 */

import {
  LEVELS_META,
  TOPICS,
  TOPICS_BY_LEVEL,
  getLevelProgress,
  getTopic,
  getTopicStatus,
  isLevelUnlocked,
  parseLevelParam,
} from "./topics";

describe("catalogue", () => {
  test("holds 48 topics, 12 per level", () => {
    expect(TOPICS.length).toBe(48);
    for (const level of ["A1", "A2", "B1", "B2"] as const) {
      expect(TOPICS_BY_LEVEL[level].length).toBe(12);
      expect(LEVELS_META[level].code).toBe(level);
    }
  });

  test("slugs are unique and resolve back", () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(48);
    for (const topic of TOPICS) {
      expect(getTopic(topic.slug)?.title).toBe(topic.title);
    }
    expect(getTopic("no-such-topic")).toBe(undefined);
  });

  test("parseLevelParam is case-insensitive", () => {
    expect(parseLevelParam("a1")).toBe("A1");
    expect(parseLevelParam("B2")).toBe("B2");
    expect(parseLevelParam("C1")).toBe(undefined);
  });
});

describe("isLevelUnlocked", () => {
  test("A1 is always unlocked", () => {
    expect(isLevelUnlocked("A1", {})).toBe(true);
  });

  test("later levels need the previous gate passed", () => {
    expect(isLevelUnlocked("A2", {})).toBe(false);
    expect(
      isLevelUnlocked("A2", { A1: { passed: true, bestPct: 85, attempts: 1 } }),
    ).toBe(true);
    expect(
      isLevelUnlocked("A2", {
        A1: { passed: false, bestPct: 60, attempts: 2 },
      }),
    ).toBe(false);
    expect(
      isLevelUnlocked("B2", {
        A1: { passed: true, bestPct: 90, attempts: 1 },
        A2: { passed: true, bestPct: 82, attempts: 1 },
        B1: { passed: true, bestPct: 88, attempts: 1 },
      }),
    ).toBe(true);
    expect(
      isLevelUnlocked("B2", {
        A1: { passed: true, bestPct: 90, attempts: 1 },
        A2: { passed: true, bestPct: 82, attempts: 1 },
      }),
    ).toBe(false);
  });
});

describe("getTopicStatus", () => {
  test("linear chain inside an unlocked level", () => {
    const level = TOPICS_BY_LEVEL["A1"];
    const first = level[0];
    const second = level[1];
    if (first === undefined || second === undefined) {
      throw new Error("A1 fixture missing");
    }
    expect(getTopicStatus(first, [], true)).toBe("available");
    expect(getTopicStatus(second, [], true)).toBe("locked");
    expect(getTopicStatus(second, [first.slug], true)).toBe("available");
    expect(getTopicStatus(first, [first.slug], true)).toBe("done");
  });

  test("locked level locks every undone topic, done still wins", () => {
    const level = TOPICS_BY_LEVEL["B1"];
    const first = level[0];
    if (first === undefined) throw new Error("B1 fixture missing");
    expect(getTopicStatus(first, [], false)).toBe("locked");
    expect(getTopicStatus(first, [first.slug], false)).toBe("done");
  });
});

describe("getLevelProgress", () => {
  test("counts done topics of that level only", () => {
    const a1 = TOPICS_BY_LEVEL["A1"];
    const first = a1[0];
    if (first === undefined) throw new Error("A1 fixture missing");
    expect(getLevelProgress("A1", [])).toEqual({ done: 0, total: 12 });
    expect(getLevelProgress("A1", [first.slug])).toEqual({
      done: 1,
      total: 12,
    });
    expect(getLevelProgress("A2", [first.slug])).toEqual({
      done: 0,
      total: 12,
    });
  });
});
