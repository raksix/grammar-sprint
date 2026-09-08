/**
 * Unit tests for `progress.ts` (P03 acceptance).
 *
 * Covers the versioned `gs-progress-v1` store: fresh defaults, the
 * save/load round-trip, the migrate guard (corrupt JSON / wrong
 * version → fresh default, never a throw), and every immutable
 * updater (asked ids, done topics, XP, review deck, gate records).
 *
 * Run from `web/`: `bun test lib/progress.test.ts`
 * (`test` / `expect` are `bun test` globals, typed in `bun-test.d.ts`.)
 */

import {
  addToReview,
  addXp,
  askedKey,
  clearReview,
  createMemoryStorage,
  defaultProgress,
  loadProgress,
  markTopicDone,
  openReviewCount,
  PROGRESS_KEY,
  PROGRESS_VERSION,
  recordAskedIds,
  recordGateAttempt,
  resetProgress,
  saveProgress,
} from "./progress";
import type { ReviewItem, StorageLike } from "./progress";

function reviewItem(questionId: string, topic = "a1-02-present-simple"): ReviewItem {
  return {
    questionId,
    topic,
    level: "A1",
    ruleRef: `Docs/grammar/A1/${topic}.md`,
    addedAt: "2026-09-08T00:00:00.000Z",
  };
}

test("defaultProgress is an empty v1 state", () => {
  const state = defaultProgress();
  expect(state.version).toBe(PROGRESS_VERSION);
  expect(state.xp).toBe(0);
  expect(state.doneTopics).toEqual([]);
  expect(state.reviewDeck).toEqual([]);
});

test("askedKey namespaces pools per topic and difficulty", () => {
  expect(askedKey("a1-02-present-simple", "easy")).toBe("a1-02-present-simple:easy");
});

test("loadProgress returns the default when storage is empty", () => {
  expect(loadProgress(createMemoryStorage())).toEqual(defaultProgress());
});

test("save then load round-trips the full state", () => {
  const storage = createMemoryStorage();
  let state = defaultProgress();
  state = addXp(state, 130);
  state = markTopicDone(state, "a1-02-present-simple");
  state = recordAskedIds(state, askedKey("a1-02-present-simple", "easy"), ["q1", "q2"]);
  state = addToReview(state, reviewItem("q9"));
  state = recordGateAttempt(state, "A1", 82, true);
  saveProgress(state, storage);

  const loaded = loadProgress(storage);
  expect(loaded).toEqual(state);
  expect(loaded.xp).toBe(130);
  expect(loaded.doneTopics).toEqual(["a1-02-present-simple"]);
  expect(loaded.gates["A1"]).toEqual({ passed: true, bestPct: 82, attempts: 1 });
});

test("migrate guard: corrupt JSON loads as a fresh default", () => {
  const storage = createMemoryStorage({ [PROGRESS_KEY]: "{not-json" });
  expect(loadProgress(storage)).toEqual(defaultProgress());
});

test("migrate guard: wrong version stamp loads as a fresh default", () => {
  const storage = createMemoryStorage({
    [PROGRESS_KEY]: JSON.stringify({ version: 999, xp: 5000 }),
  });
  expect(loadProgress(storage)).toEqual(defaultProgress());
});

test("migrate guard: non-object payload loads as a fresh default", () => {
  const storage = createMemoryStorage({ [PROGRESS_KEY]: "[1,2,3]" });
  expect(loadProgress(storage)).toEqual(defaultProgress());
});

test("recordAskedIds merges ids without duplicates", () => {
  const key = askedKey("a1-02-present-simple", "easy");
  let state = recordAskedIds(defaultProgress(), key, ["q1", "q2"]);
  state = recordAskedIds(state, key, ["q2", "q3"]);
  expect(state.askedIds[key]).toEqual(["q1", "q2", "q3"]);
});

test("markTopicDone is idempotent", () => {
  let state = markTopicDone(defaultProgress(), "a1-01-articles");
  state = markTopicDone(state, "a1-01-articles");
  expect(state.doneTopics).toEqual(["a1-01-articles"]);
});

test("addXp accumulates and ignores non-positive amounts", () => {
  let state = addXp(defaultProgress(), 100);
  state = addXp(state, 30);
  expect(state.xp).toBe(130);
  expect(addXp(state, 0)).toBe(state);
  expect(addXp(state, -10).xp).toBe(130);
});

test("addToReview dedupes by question id", () => {
  let state = addToReview(defaultProgress(), reviewItem("q1"));
  state = addToReview(state, reviewItem("q1"));
  state = addToReview(state, reviewItem("q2"));
  expect(state.reviewDeck).toHaveLength(2);
});

test("clearReview drops only the re-answered questions", () => {
  let state = defaultProgress();
  state = addToReview(state, reviewItem("q1"));
  state = addToReview(state, reviewItem("q2"));
  state = clearReview(state, ["q1"]);
  expect(state.reviewDeck).toHaveLength(1);
  expect(state.reviewDeck[0]?.questionId).toBe("q2");
});

test("openReviewCount totals globally and per topic", () => {
  let state = defaultProgress();
  state = addToReview(state, reviewItem("q1", "topic-a"));
  state = addToReview(state, reviewItem("q2", "topic-b"));
  expect(openReviewCount(state)).toBe(2);
  expect(openReviewCount(state, "topic-a")).toBe(1);
});

test("recordGateAttempt keeps the best pct and sticky pass", () => {
  let state = recordGateAttempt(defaultProgress(), "A1", 70, false);
  state = recordGateAttempt(state, "A1", 85, true);
  state = recordGateAttempt(state, "A1", 75, false);
  expect(state.gates["A1"]).toEqual({ passed: true, bestPct: 85, attempts: 3 });
});

test("resetProgress wipes storage and returns the default", () => {
  const storage = createMemoryStorage();
  saveProgress(addXp(defaultProgress(), 50), storage);
  const reset = resetProgress(storage);
  expect(reset).toEqual(defaultProgress());
  expect(loadProgress(storage)).toEqual(defaultProgress());
});

test("saveProgress never throws on a broken storage backend", () => {
  const broken: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota exceeded");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  };
  saveProgress(defaultProgress(), broken);
  expect(resetProgress(broken)).toEqual(defaultProgress());
});
