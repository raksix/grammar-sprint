/**
 * Topic-quiz session engine (P23).
 *
 * Pure, client-safe helpers behind `components/QuizCard.tsx` and the
 * `/quiz/[topic]` route. Implements the runtime half of
 * `Docs/05-TEST-ENGINE-SPEC.md`:
 *
 * - Choices are shuffled per attempt (seeded, deterministic) and the
 *   correct answer is resolved at submit from the bank copy — never
 *   rendered into the DOM beforehand.
 * - Difficulty adapts within the drawn 8Q set: 2 consecutive correct
 *   answers step the next pick up, 2 consecutive misses step it down,
 *   bounded by the drawn composition (3 easy / 3 medium / 2 hard, see
 *   `draw.ts` `TOPIC_QUIZ_QUOTA`). The session never invents questions
 *   outside the draw.
 * - `learnSlugFromRuleRef` turns a bank `rule_ref`
 *   (`Docs/grammar/A1/a1-02-present-simple.md`) into a lesson slug so
 *   feedback can deep-link the rule (`/learn/<slug>`).
 *
 * The adaptive state is session-scoped and MUTABLE by design (created
 * fresh per attempt by `initAdaptive`): `nextAdaptiveQuestion` pops from
 * the pools, `answerAdaptive` moves the pointer. Tests and the component
 * both treat one state object as one attempt.
 */

import type { ChoiceQuestion, Difficulty, Question } from "./bank";
import { seededShuffle } from "./draw";

/** One rendered choice: display text plus its index in the bank copy. */
export interface ShuffledChoice {
  text: string;
  /** Index into the original `choices` array (compared to `answer`). */
  originalIndex: number;
}

/**
 * Deterministic per-attempt shuffle of a choice question's options.
 * Same `(question, seed)` always yields the same order.
 */
export function shuffleChoices(
  question: ChoiceQuestion,
  seed: number | string,
): ShuffledChoice[] {
  const order = seededShuffle(
    question.choices.map((_, index) => index),
    seed,
  );
  return order.map((originalIndex) => {
    const text = question.choices[originalIndex];
    if (text === undefined) {
      throw new Error(
        `shuffleChoices: index ${originalIndex} out of range for ${question.id}`,
      );
    }
    return { text, originalIndex };
  });
}

/**
 * True when the picked original index is the bank answer. Call at submit
 * time with the bank copy — the result is never pre-rendered.
 */
export function isChoiceCorrect(
  question: ChoiceQuestion,
  selectedOriginalIndex: number,
): boolean {
  return selectedOriginalIndex === question.answer;
}

/** One step harder (clamped at `hard`). */
export function stepUp(difficulty: Difficulty): Difficulty {
  if (difficulty === "easy") return "medium";
  if (difficulty === "medium") return "hard";
  return "hard";
}

/** One step easier (clamped at `easy`). */
export function stepDown(difficulty: Difficulty): Difficulty {
  if (difficulty === "hard") return "medium";
  if (difficulty === "medium") return "easy";
  return "easy";
}

/** Remaining pools plus the adaptive pointer for one attempt. */
export interface AdaptiveState {
  pools: Record<Difficulty, Question[]>;
  /** Difficulty the next pick prefers (starts at `medium`). */
  pointer: Difficulty;
  /** Consecutive correct answers since the last step (or miss). */
  runCorrect: number;
  /** Consecutive misses since the last step (or correct answer). */
  runWrong: number;
}

/**
 * Split a drawn set into per-difficulty queues (draw order preserved)
 * and point at `medium`. One state object = one quiz attempt.
 */
export function initAdaptive(drawn: readonly Question[]): AdaptiveState {
  const pools: Record<Difficulty, Question[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const question of drawn) {
    pools[question.difficulty].push(question);
  }
  return { pools, pointer: "medium", runCorrect: 0, runWrong: 0 };
}

/** Preference order for a pick: want first, then nearest neighbours. */
function fallbackOrder(want: Difficulty): Difficulty[] {
  if (want === "easy") return ["easy", "medium", "hard"];
  if (want === "hard") return ["hard", "medium", "easy"];
  return ["medium", "easy", "hard"];
}

/**
 * Pop the next question: head of the pointer's pool when it still has
 * cards, otherwise the nearest pool that does. Returns `null` when every
 * pool is empty. Mutates `state.pools`.
 */
export function nextAdaptiveQuestion(
  state: AdaptiveState,
): { question: Question; from: Difficulty } | null {
  for (const difficulty of fallbackOrder(state.pointer)) {
    const head = state.pools[difficulty][0];
    if (head !== undefined) {
      state.pools[difficulty] = state.pools[difficulty].slice(1);
      return { question: head, from: difficulty };
    }
  }
  return null;
}

/**
 * Feed one graded answer back into the pointer: 2 consecutive correct
 * step up, 2 consecutive misses step down (both reset the run so a
 * longer streak steps again only after 2 more). Clamped at the ends.
 * Mutates `state`.
 */
export function answerAdaptive(state: AdaptiveState, correct: boolean): void {
  if (correct) {
    state.runCorrect += 1;
    state.runWrong = 0;
    if (state.runCorrect >= 2) {
      state.pointer = stepUp(state.pointer);
      state.runCorrect = 0;
    }
    return;
  }
  state.runWrong += 1;
  state.runCorrect = 0;
  if (state.runWrong >= 2) {
    state.pointer = stepDown(state.pointer);
    state.runWrong = 0;
  }
}

/** Total questions still unpicked across all pools. */
export function adaptiveRemaining(state: AdaptiveState): number {
  return (
    state.pools.easy.length +
    state.pools.medium.length +
    state.pools.hard.length
  );
}

/**
 * Extract the lesson slug from a bank `rule_ref`
 * (`Docs/grammar/A1/a1-02-present-simple.md` → `a1-02-present-simple`).
 * Returns `null` for anything that is not a plausible slug file ref.
 */
export function learnSlugFromRuleRef(ruleRef: string): string | null {
  const match = /([^/]+)\.md\s*$/.exec(ruleRef.trim());
  if (match === null) return null;
  const slug = match[1] as string;
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}
