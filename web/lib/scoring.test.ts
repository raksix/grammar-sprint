/**
 * Unit tests for `scoring.ts` (P03 acceptance).
 *
 * Pins the numbers from `Docs/05-TEST-ENGINE-SPEC.md`: topic pass at
 * ≥6/8, gate pass at ≥80%, final at ≥70%, XP 10/20/30 with the +5
 * every-5-streak bonus, and mastery = passed + empty review deck.
 *
 * Run from `web/`: `bun test lib/scoring.test.ts`
 * (`test` / `expect` are `bun test` globals, typed in `bun-test.d.ts`.)
 */

import type { Difficulty } from "./bank";
import {
  FINAL_PASS_PCT,
  GATE_PASS_PCT,
  TOPIC_QUIZ_PASS_COUNT,
  gradeFinalSprint,
  gradeGate,
  gradeTopicQuiz,
  isTopicMastered,
  percentOf,
  xpForAttempts,
  xpForCorrect,
} from "./scoring";
import type { AttemptResult, TopicAttempt } from "./scoring";

function attempt(difficulty: Difficulty, correct: boolean): AttemptResult {
  return { difficulty, correct };
}

function topicAttempt(
  topic: string,
  difficulty: Difficulty,
  correct: boolean,
): TopicAttempt {
  return { topic, difficulty, correct };
}

/** N correct then M wrong, all at one difficulty (ordered!). */
function run(
  difficulty: Difficulty,
  correctCount: number,
  wrongCount: number,
  topic = "t1",
): TopicAttempt[] {
  const out: TopicAttempt[] = [];
  for (let i = 0; i < correctCount; i += 1) {
    out.push(topicAttempt(topic, difficulty, true));
  }
  for (let i = 0; i < wrongCount; i += 1) {
    out.push(topicAttempt(topic, difficulty, false));
  }
  return out;
}

test("threshold constants match the spec", () => {
  expect(TOPIC_QUIZ_PASS_COUNT).toBe(6);
  expect(GATE_PASS_PCT).toBe(80);
  expect(FINAL_PASS_PCT).toBe(70);
});

test("percentOf rounds and never NaNs on empty input", () => {
  expect(percentOf(6, 8)).toBe(75);
  expect(percentOf(24, 30)).toBe(80);
  expect(percentOf(0, 0)).toBe(0);
});

test("xpForCorrect pays base XP by difficulty", () => {
  expect(xpForCorrect("easy", 1)).toBe(10);
  expect(xpForCorrect("medium", 1)).toBe(20);
  expect(xpForCorrect("hard", 1)).toBe(30);
});

test("xpForCorrect adds +5 exactly on the 5th/10th consecutive correct", () => {
  expect(xpForCorrect("easy", 5)).toBe(15);
  expect(xpForCorrect("hard", 10)).toBe(35);
  expect(xpForCorrect("easy", 4)).toBe(10);
  expect(xpForCorrect("medium", 6)).toBe(20);
});

test("xpForAttempts resets the streak on a miss", () => {
  expect(
    xpForAttempts([
      attempt("easy", true),
      attempt("easy", true),
      attempt("medium", false),
      attempt("hard", true),
    ]),
  ).toBe(50);
});

test("xpForAttempts awards the streak bonus mid-sequence", () => {
  const fiveEasy: AttemptResult[] = [
    attempt("easy", true),
    attempt("easy", true),
    attempt("easy", true),
    attempt("easy", true),
    attempt("easy", true),
  ];
  expect(xpForAttempts(fiveEasy)).toBe(55);
});

test("gradeTopicQuiz passes at 6/8 and fails at 5/8", () => {
  const passed = gradeTopicQuiz([...run("easy", 3, 0), ...run("medium", 2, 2), ...run("hard", 1, 0)]);
  expect(passed.total).toBe(8);
  expect(passed.correct).toBe(6);
  expect(passed.percent).toBe(75);
  expect(passed.passed).toBe(true);

  const failed = gradeTopicQuiz([...run("easy", 3, 0), ...run("medium", 1, 3), ...run("hard", 1, 0)]);
  expect(failed.correct).toBe(5);
  expect(failed.passed).toBe(false);
});

test("gradeTopicQuiz reports a per-difficulty breakdown", () => {
  const score = gradeTopicQuiz([...run("easy", 3, 0), ...run("medium", 2, 1), ...run("hard", 0, 2)]);
  expect(score.byDifficulty["easy"]).toEqual({ total: 3, correct: 3, percent: 100 });
  expect(score.byDifficulty["medium"]).toEqual({ total: 3, correct: 2, percent: 67 });
  expect(score.byDifficulty["hard"]).toEqual({ total: 2, correct: 0, percent: 0 });
});

test("gradeGate passes at exactly 80% (24/30) and fails at 23/30", () => {
  const passing: TopicAttempt[] = [
    ...run("easy", 8, 2, "t1"),
    ...run("medium", 9, 3, "t2"),
    ...run("hard", 7, 1, "t3"),
  ];
  expect(passing).toHaveLength(30);
  const passScore = gradeGate(passing);
  expect(passScore.correct).toBe(24);
  expect(passScore.percent).toBe(80);
  expect(passScore.passed).toBe(true);

  const failing: TopicAttempt[] = [
    ...run("easy", 8, 2, "t1"),
    ...run("medium", 8, 4, "t2"),
    ...run("hard", 7, 1, "t3"),
  ];
  const failScore = gradeGate(failing);
  expect(failScore.correct).toBe(23);
  expect(failScore.percent).toBe(77);
  expect(failScore.passed).toBe(false);
});

test("gradeGate reports per-topic breakdown plus weakest 3 first", () => {
  const results: TopicAttempt[] = [
    ...run("easy", 6, 4, "t-weak"),
    ...run("medium", 9, 1, "t-strong"),
    ...run("hard", 8, 2, "t-mid"),
  ];
  const score = gradeGate(results);
  expect(score.byTopic["t-weak"]).toEqual({ total: 10, correct: 6, percent: 60 });
  expect(score.byTopic["t-strong"]).toEqual({ total: 10, correct: 9, percent: 90 });
  expect(score.weakestTopics).toEqual(["t-weak", "t-mid", "t-strong"]);
});

test("gradeFinalSprint passes at 70% with XP only", () => {
  const score = gradeFinalSprint(run("medium", 35, 15));
  expect(score.total).toBe(50);
  expect(score.percent).toBe(70);
  expect(score.passed).toBe(true);
  expect(score.xp).toBeGreaterThan(0);

  const failed = gradeFinalSprint(run("medium", 34, 16));
  expect(failed.percent).toBe(68);
  expect(failed.passed).toBe(false);
});

test("isTopicMastered needs a pass AND an empty review deck", () => {
  expect(isTopicMastered(true, 0)).toBe(true);
  expect(isTopicMastered(true, 2)).toBe(false);
  expect(isTopicMastered(false, 0)).toBe(false);
});
