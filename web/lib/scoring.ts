/**
 * Scoring: percents, per-difficulty / per-topic breakdowns, XP and pass
 * thresholds for topic quizzes, level gates and the final sprint.
 *
 * Rules (from `Docs/05-TEST-ENGINE-SPEC.md`):
 * - Topic quiz: 8Q, done at ≥ 6/8, with a per-difficulty breakdown.
 * - Level gate: 30Q, passes at ≥ 80%, with a per-topic breakdown and
 *   the weakest 3 topics surfaced as deep-link targets.
 * - Final sprint: 50Q mixed A1–B2, complete at ≥ 70%.
 * - XP: easy 10 / medium 20 / hard 30, plus a +5 streak bonus every
 *   5th consecutive correct answer. No penalties.
 * - Topic mastery: quiz passed AND zero open review-deck items.
 */

import type { Difficulty } from "./bank";

/** Topic quiz shape: 8 questions (3E/3M/2H, see `draw.ts`). */
export const TOPIC_QUIZ_QUESTIONS = 8;

/** Correct answers needed to mark a topic done. */
export const TOPIC_QUIZ_PASS_COUNT = 6;

/** Level-gate pass threshold (percent). */
export const GATE_PASS_PCT = 80;

/** Final-sprint completion threshold (percent). */
export const FINAL_PASS_PCT = 70;

/** Base XP per correct answer, by difficulty. */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

/** +5 XP every Nth consecutive correct answer. */
export const STREAK_BONUS_EVERY = 5;
export const STREAK_BONUS_XP = 5;

/** One graded attempt: correctness plus the difficulty it was earned at. */
export interface AttemptResult {
  difficulty: Difficulty;
  correct: boolean;
}

/** A gate/final attempt additionally tagged with its topic. */
export interface TopicAttempt extends AttemptResult {
  topic: string;
}

export interface ScoreBreakdown {
  total: number;
  correct: number;
  percent: number;
}

export interface TopicQuizScore {
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
  xp: number;
  byDifficulty: Record<Difficulty, ScoreBreakdown>;
}

export interface GateScore {
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
  xp: number;
  byTopic: Record<string, ScoreBreakdown>;
  /** Up to 3 worst topics by percent (deep-link targets after a fail). */
  weakestTopics: string[];
}

export interface FinalScore {
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
  xp: number;
}

/** Whole percent, rounded. Empty attempt lists score 0 (never NaN). */
export function percentOf(correct: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((correct / total) * 100);
}

/**
 * XP for one correct answer. `streakLength` is the running
 * consecutive-correct count *including* this answer (1-based): the
 * bonus lands exactly on the 5th, 10th, 15th, … in a row.
 */
export function xpForCorrect(difficulty: Difficulty, streakLength: number): number {
  const base = XP_BY_DIFFICULTY[difficulty];
  const bonus =
    streakLength >= STREAK_BONUS_EVERY && streakLength % STREAK_BONUS_EVERY === 0
      ? STREAK_BONUS_XP
      : 0;
  return base + bonus;
}

/**
 * Total XP over an ordered attempt list. The streak resets on every
 * miss; wrong answers earn nothing (no penalties).
 */
export function xpForAttempts(results: readonly AttemptResult[]): number {
  let xp = 0;
  let streak = 0;
  for (const result of results) {
    if (result.correct) {
      streak += 1;
      xp += xpForCorrect(result.difficulty, streak);
    } else {
      streak = 0;
    }
  }
  return xp;
}

function emptyBreakdown(): ScoreBreakdown {
  return { total: 0, correct: 0, percent: 0 };
}

const DIFFICULTY_ORDER: readonly Difficulty[] = ["easy", "medium", "hard"];

/**
 * Grade an 8Q topic quiz: percent + per-difficulty breakdown + XP.
 * Pass = at least `TOPIC_QUIZ_PASS_COUNT` correct.
 */
export function gradeTopicQuiz(results: readonly AttemptResult[]): TopicQuizScore {
  const byDifficulty: Record<Difficulty, ScoreBreakdown> = {
    easy: emptyBreakdown(),
    medium: emptyBreakdown(),
    hard: emptyBreakdown(),
  };
  let correct = 0;
  for (const result of results) {
    const bucket = byDifficulty[result.difficulty];
    bucket.total += 1;
    if (result.correct) {
      bucket.correct += 1;
      correct += 1;
    }
  }
  for (const difficulty of DIFFICULTY_ORDER) {
    const bucket = byDifficulty[difficulty];
    bucket.percent = percentOf(bucket.correct, bucket.total);
  }
  return {
    total: results.length,
    correct,
    percent: percentOf(correct, results.length),
    passed: correct >= TOPIC_QUIZ_PASS_COUNT,
    xp: xpForAttempts(results),
    byDifficulty,
  };
}

/**
 * Grade a 30Q level gate: percent + per-topic breakdown + XP.
 * Pass = percent ≥ `GATE_PASS_PCT`. `weakestTopics` holds the worst
 * (lowest percent) topics, up to 3 — ties break toward larger buckets,
 * then alphabetically, so the order is deterministic.
 */
export function gradeGate(results: readonly TopicAttempt[]): GateScore {
  const byTopic: Record<string, ScoreBreakdown> = {};
  let correct = 0;
  for (const result of results) {
    let bucket = byTopic[result.topic];
    if (bucket === undefined) {
      bucket = emptyBreakdown();
      byTopic[result.topic] = bucket;
    }
    bucket.total += 1;
    if (result.correct) {
      bucket.correct += 1;
      correct += 1;
    }
  }
  for (const bucket of Object.values(byTopic)) {
    bucket.percent = percentOf(bucket.correct, bucket.total);
  }
  const weakestTopics = Object.entries(byTopic)
    .sort(
      (a, b) =>
        a[1].percent - b[1].percent ||
        b[1].total - a[1].total ||
        (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0),
    )
    .slice(0, 3)
    .map(([topic]) => topic);
  return {
    total: results.length,
    correct,
    percent: percentOf(correct, results.length),
    passed: percentOf(correct, results.length) >= GATE_PASS_PCT,
    xp: xpForAttempts(results),
    byTopic,
    weakestTopics,
  };
}

/**
 * Grade the 50Q final sprint: percent + XP only (no breakdown — the
 * per-topic detail lives on the gate scores). Pass = ≥ `FINAL_PASS_PCT`.
 */
export function gradeFinalSprint(results: readonly AttemptResult[]): FinalScore {
  const correct = results.filter((result) => result.correct).length;
  return {
    total: results.length,
    correct,
    percent: percentOf(correct, results.length),
    passed: percentOf(correct, results.length) >= FINAL_PASS_PCT,
    xp: xpForAttempts(results),
  };
}

/**
 * A topic counts as mastered when its quiz passed AND no review-deck
 * items remain open for it (per `05-TEST-ENGINE-SPEC.md` §Scoring).
 */
export function isTopicMastered(topicPassed: boolean, openReviewCount: number): boolean {
  return topicPassed && openReviewCount <= 0;
}
