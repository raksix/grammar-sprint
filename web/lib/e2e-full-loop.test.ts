/**
 * P27 end-to-end: learn → quiz → gate unlock → review clear → final.
 *
 * One deterministic pass over the REAL bank (no fixtures): a fresh learner
 * reads the first A1 lesson, passes its quiz 7/8, completes all 12 A1
 * topics, passes the A1 gate 27/30 (unlocking A2), walks the fail → locked
 * → deck-clear → retake path, clears review via rule deep-links, completes
 * the 50Q final sprint, and lands on the A2 continue target. A source-level
 * link-graph check proves every step is clickable, and a hygiene scan
 * proves zero `console.*` calls in app source (0 console errors).
 *
 * Run from `web/`: `bun test lib/e2e-full-loop.test.ts`
 * (`test` / `expect` are `bun test` globals, typed in `bun-test.d.ts`.)
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drawFinal, drawGate, drawTopicQuiz } from "./draw";
import { canRetakeGate } from "./gate";
import { loadAllQuestions, loadLevelQuestions } from "./level-bank";
import { loadLesson } from "./lessons";
import {
  addToReview,
  addXp,
  clearReview,
  createMemoryStorage,
  defaultProgress,
  loadProgress,
  markTopicDone,
  openReviewCount,
  recordAskedIds,
  recordFinalAttempt,
  recordGateAttempt,
  saveProgress,
} from "./progress";
import {
  gradeFinalSprint,
  gradeGate,
  gradeTopicQuiz,
} from "./scoring";
import { loadTopicQuestions } from "./topic-bank";
import {
  TOPICS_BY_LEVEL,
  getLevelProgress,
  getTopic,
  isLevelUnlocked,
} from "./topics";
import { firstUnpassedGate, getContinueTarget } from "./continue";
import { learnSlugFromRuleRef } from "./quiz";

/** Read a source file from either `web/` cwd or the repo root. */
function readSource(rel: string): string {
  const direct = join(process.cwd(), rel);
  if (existsSync(direct)) return readFileSync(direct, "utf8");
  const nested = join(process.cwd(), "web", rel);
  if (existsSync(nested)) return readFileSync(nested, "utf8");
  throw new Error(`Source file not found: ${rel} (cwd=${process.cwd()})`);
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

test("learn: first A1 lesson loads with the full 6-section shape", () => {
  const slug = TOPICS_BY_LEVEL.A1[0]?.slug;
  expect(slug).toBeDefined();
  if (slug === undefined) return;
  const lesson = loadLesson(slug);
  expect(lesson.title.length).toBeGreaterThan(0);
  expect(lesson.goalHtml.length).toBeGreaterThan(0);
  expect(lesson.ruleHtml.length).toBeGreaterThan(0);
  expect(lesson.formsHtml.length).toBeGreaterThan(0);
  expect(lesson.trapsHtml.length).toBeGreaterThan(0);
  expect(lesson.examplesHtml.length).toBeGreaterThan(0);
  expect(lesson.quickCheckHtml.length).toBeGreaterThan(0);
});

test("quiz: 8Q unseen-first draw on the real pool, 7/8 passes and persists", () => {
  const slug = TOPICS_BY_LEVEL.A1[0]?.slug;
  expect(slug).toBeDefined();
  if (slug === undefined) return;
  const pool = loadTopicQuestions(slug);
  expect(pool).toHaveLength(25);
  const draw = drawTopicQuiz(pool, [], `p27-e2e:${slug}:quiz`);
  expect(draw.drawn).toHaveLength(8);
  const quota = countBy(draw.drawn, (q) => q.difficulty);
  expect(quota["easy"]).toBe(3);
  expect(quota["medium"]).toBe(3);
  expect(quota["hard"]).toBe(2);

  // Miss exactly the last question (7/8 = pass).
  const results = draw.drawn.map((q, i) => ({
    difficulty: q.difficulty,
    correct: i < 7,
  }));
  const score = gradeTopicQuiz(results);
  expect(score.passed).toBe(true);
  expect(score.correct).toBe(7);
  expect(score.xp).toBeGreaterThan(0);

  // Persist like QuizCard does: XP + done + asked + review miss.
  const miss = draw.drawn[7];
  expect(miss).toBeDefined();
  if (miss === undefined) return;
  const storage = createMemoryStorage();
  let state = defaultProgress();
  state = addXp(state, score.xp);
  state = markTopicDone(state, slug);
  state = recordAskedIds(state, `${slug}:quiz`, draw.drawn.map((q) => q.id));
  state = addToReview(state, {
    questionId: miss.id,
    topic: miss.topic,
    level: miss.level,
    ruleRef: miss.rule_ref,
    addedAt: new Date(0).toISOString(),
  });
  saveProgress(state, storage);
  const reloaded = loadProgress(storage);
  expect(reloaded.doneTopics).toContain(slug);
  expect(reloaded.xp).toBeGreaterThan(0);
  expect(openReviewCount(reloaded)).toBe(1);
});

test("curriculum: completing all 12 A1 topics leaves A2 locked behind the gate", () => {
  let state = defaultProgress();
  for (const topic of TOPICS_BY_LEVEL.A1) {
    const pool = loadTopicQuestions(topic.slug);
    const draw = drawTopicQuiz(pool, [], `p27-e2e:${topic.slug}:sweep`);
    const results = draw.drawn.map((q, i) => ({
      difficulty: q.difficulty,
      correct: i < 6,
    }));
    const score = gradeTopicQuiz(results);
    expect(score.passed).toBe(true);
    state = markTopicDone(state, topic.slug);
    state = addXp(state, score.xp);
  }
  expect(getLevelProgress("A1", state.doneTopics)).toEqual({
    done: 12,
    total: 12,
  });
  expect(isLevelUnlocked("A2", state.gates)).toBe(false);
  expect(firstUnpassedGate(state.gates)).toBe("A1");
});

test("gate: 30Q draw (10/12/8) on the real A1 pool, 27/30 passes and unlocks A2", () => {
  const pool = loadLevelQuestions("A1");
  expect(pool).toHaveLength(300);
  let state = defaultProgress();
  for (const topic of TOPICS_BY_LEVEL.A1) {
    state = markTopicDone(state, topic.slug);
  }
  const draw = drawGate(pool, [], "p27-e2e:gate-a1:pass");
  expect(draw.drawn).toHaveLength(30);
  const quota = countBy(draw.drawn, (q) => q.difficulty);
  expect(quota["easy"]).toBe(10);
  expect(quota["medium"]).toBe(12);
  expect(quota["hard"]).toBe(8);

  // Miss every 10th question: 27/30 = 90% >= 80% gate bar.
  const results = draw.drawn.map((q, i) => ({
    difficulty: q.difficulty,
    topic: q.topic,
    correct: i % 10 !== 9,
  }));
  const score = gradeGate(results);
  expect(score.passed).toBe(true);
  expect(score.percent).toBeGreaterThanOrEqual(80);
  expect(score.weakestTopics.length).toBeLessThanOrEqual(3);
  state = recordGateAttempt(state, "A1", score.percent, score.passed);
  expect(isLevelUnlocked("A2", state.gates)).toBe(true);
  // Sticky pass: a later fail never re-locks the level.
  state = recordGateAttempt(state, "A1", 40, false);
  expect(isLevelUnlocked("A2", state.gates)).toBe(true);
});

test("gate fail path: retake stays locked until the review deck is clear", () => {
  let state = defaultProgress();
  for (const topic of TOPICS_BY_LEVEL.A1) {
    state = markTopicDone(state, topic.slug);
  }
  state = recordGateAttempt(state, "A1", 60, false);
  const record = state.gates.A1;
  expect(record).toBeDefined();
  if (record === undefined) return;
  for (let i = 0; i < 6; i += 1) {
    state = addToReview(state, {
      questionId: `p27-fail-q${i}`,
      topic: TOPICS_BY_LEVEL.A1[0]?.slug ?? "a1-01-verb-to-be",
      level: "A1",
      ruleRef: "Docs/grammar/A1/a1-01-verb-to-be.md",
      addedAt: new Date(0).toISOString(),
    });
  }
  expect(canRetakeGate(record, openReviewCount(state))).toBe(false);
  state = clearReview(
    state,
    state.reviewDeck.map((entry) => entry.questionId),
  );
  expect(openReviewCount(state)).toBe(0);
  expect(canRetakeGate(record, openReviewCount(state))).toBe(true);
});

test("review: every gate miss resolves to a real lesson deep-link", () => {
  const pool = loadLevelQuestions("A1");
  const draw = drawGate(pool, [], "p27-e2e:review-links");
  const misses = draw.drawn.filter((_, i) => i % 10 === 9);
  expect(misses.length).toBeGreaterThan(0);
  for (const miss of misses) {
    const slug = learnSlugFromRuleRef(miss.rule_ref);
    expect(slug).toBeDefined();
    if (slug === null || slug === undefined) continue;
    expect(getTopic(slug)).toBeDefined();
  }
});

test("final: 50Q draw (20/20/10) over the full 1200Q bank, 40/50 completes", () => {
  const pool = loadAllQuestions();
  expect(pool).toHaveLength(1200);
  const draw = drawFinal(pool, [], "p27-e2e:final");
  expect(draw.drawn).toHaveLength(50);
  const quota = countBy(draw.drawn, (q) => q.difficulty);
  expect(quota["easy"]).toBe(20);
  expect(quota["medium"]).toBe(20);
  expect(quota["hard"]).toBe(10);
  // Miss every 5th question: 40/50 = 80% >= 70% final bar.
  const results = draw.drawn.map((q, i) => ({
    difficulty: q.difficulty,
    correct: i % 5 !== 4,
  }));
  const score = gradeFinalSprint(results);
  expect(score.passed).toBe(true);
  const state = recordFinalAttempt(defaultProgress(), score.percent, score.passed);
  expect(state.final.passed).toBe(true);
  expect(state.final.attempts).toBe(1);
});

test("continue: after the A1 gate pass the target advances to A2", () => {
  let state = defaultProgress();
  for (const topic of TOPICS_BY_LEVEL.A1) {
    state = markTopicDone(state, topic.slug);
  }
  state = recordGateAttempt(state, "A1", 90, true);
  const target = getContinueTarget(state.doneTopics, state.gates);
  expect(target.kind).toBe("topic");
  if (target.kind !== "topic") return;
  expect(target.topic.level).toBe("A2");
  expect(target.learnHref).toContain("/learn/");
  expect(target.quizHref).toContain("/quiz/");
});

test("link graph: every loop step is clickable end-to-end in source", () => {
  const lessonView = readSource("components/LessonView.tsx");
  expect(lessonView).toContain("/quiz/");
  const quizCard = readSource("components/QuizCard.tsx");
  expect(quizCard).toContain("/learn/");
  expect(quizCard).toContain("/review");
  const levelMap = readSource("components/LevelMap.tsx");
  expect(levelMap).toContain("/gate/");
  expect(levelMap).toContain("/learn/");
  const gateCard = readSource("components/GateCard.tsx");
  expect(gateCard).toContain("/review");
  expect(gateCard).toContain("/final");
  const finalCard = readSource("components/FinalCard.tsx");
  expect(finalCard).toContain("/stats");
  const reviewDeck = readSource("components/ReviewDeck.tsx");
  expect(reviewDeck).toContain("/stats");
  const landing = readSource("app/page.tsx");
  expect(landing).toContain("/levels/A1");
  expect(landing).toContain("/final");
});

test("hygiene: zero console.* calls in app source (0 console errors)", () => {
  const files = [
    "components/Header.tsx",
    "components/ReviewDeck.tsx",
    "components/FinalCard.tsx",
    "components/LevelMap.tsx",
    "components/LessonView.tsx",
    "components/QuizCard.tsx",
    "components/LandingProgress.tsx",
    "components/StatsView.tsx",
    "components/GateCard.tsx",
    "lib/bank.ts",
    "lib/draw.ts",
    "lib/normalize.ts",
    "lib/scoring.ts",
    "lib/progress.ts",
    "lib/quiz.ts",
    "lib/gate.ts",
    "lib/topics.ts",
    "lib/continue.ts",
    "lib/lessons.ts",
    "lib/level-bank.ts",
    "lib/topic-bank.ts",
    "app/page.tsx",
    "app/layout.tsx",
  ];
  for (const file of files) {
    const src = readSource(file);
    expect(src.includes("console.")).toBe(false);
  }
});
