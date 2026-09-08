/**
 * FinalCard — interactive 50Q final-sprint runner (P24).
 *
 * Client component. The server route (`/final`) embeds the whole 1200Q
 * bank as props at build time; the session runs here: unseen-first
 * stratified draw (`drawFinal`, seeded `final:day:attempt`), seeded
 * per-attempt choice shuffle, the same submit feedback as the topic quiz,
 * grading (`gradeFinalSprint`: percent + XP, pass at ≥ 70%), and
 * persistence (`progress.ts`: asked ids, XP, final record via
 * `recordFinalAttempt`, misses into the review deck).
 *
 * The final has no retake lock (the gate rule does not apply here):
 * every attempt draws fresh unseen questions and the best percent sticks.
 * Only links to routes that exist (`/learn/*`, `/stats`, `/review`).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Difficulty, Question } from "../lib/bank";
import { isChoiceQuestion, isRewriteQuestion } from "../lib/bank";
import { FINAL_SIZE, drawFinal } from "../lib/draw";
import { isRewriteCorrect } from "../lib/normalize";
import { richText } from "../lib/richtext";
import {
  addToReview,
  addXp,
  askedKey,
  defaultProgress,
  loadProgress,
  recordAskedIds,
  recordFinalAttempt,
  saveProgress,
  type ProgressState,
  type ReviewItem,
} from "../lib/progress";
import {
  FINAL_PASS_PCT,
  gradeFinalSprint,
  xpForAttempts,
  type AttemptResult,
} from "../lib/scoring";
import { getTopic } from "../lib/topics";
import {
  isChoiceCorrect,
  learnSlugFromRuleRef,
  shuffleChoices,
  type ShuffledChoice,
} from "../lib/quiz";

interface GradedAnswer extends AttemptResult {
  levelLabel: string;
}

interface FinishedSummary {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  xp: number;
  missed: number;
  bestPct: number;
  attempts: number;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function typeLabel(question: Question): string {
  if (question.type === "rewrite") return "Rewrite";
  if (question.type === "gap-fill") return "Fill the gap";
  return "Choose";
}

export default function FinalCard({ pool }: { pool: Question[] }) {
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  /** Answered count doubles as the 0-based index of `current`. */
  const [answered, setAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [results, setResults] = useState<GradedAnswer[]>([]);
  const [finished, setFinished] = useState<FinishedSummary | null>(null);

  const missesRef = useRef<ReviewItem[]>([]);
  const dayRef = useRef("");
  const finishGuardRef = useRef(false);

  const beginAttempt = useCallback(
    (stored: ProgressState, attemptNo: number, day: string) => {
      const asked = new Set<string>();
      for (const ids of Object.values(stored.askedIds)) {
        for (const id of ids) asked.add(id);
      }
      const drawn = drawFinal(pool, asked, `final:${day}:${attemptNo}`);
      missesRef.current = [];
      finishGuardRef.current = false;
      setQueue(drawn.drawn);
      setCurrent(drawn.drawn[0] ?? null);
      setAnswered(0);
      setSelected(null);
      setTyped("");
      setSubmitted(false);
      setResults([]);
      setFinished(null);
      setAttempt(attemptNo);
      setReady(true);
    },
    [pool],
  );

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    const day = new Date().toISOString().slice(0, 10);
    dayRef.current = day;
    beginAttempt(stored, stored.final.attempts, day);
  }, [beginAttempt]);

  const shuffled: ShuffledChoice[] = useMemo(() => {
    if (current === null || !isChoiceQuestion(current)) return [];
    return shuffleChoices(
      current,
      `final:${dayRef.current}:${attempt}:${current.id}`,
    );
  }, [current, attempt]);

  const ruleHref = useCallback((question: Question): string => {
    const parsed = learnSlugFromRuleRef(question.rule_ref);
    if (parsed !== null && getTopic(parsed) !== undefined) {
      return `/learn/${parsed}`;
    }
    return "/review";
  }, []);

  const finish = useCallback(
    (graded: GradedAnswer[]) => {
      if (finishGuardRef.current) return;
      finishGuardRef.current = true;
      const score = gradeFinalSprint(graded);
      const xp = xpForAttempts(graded);
      const misses = missesRef.current;
      let next = progress;
      for (const question of queue) {
        next = recordAskedIds(next, askedKey(question.topic, question.difficulty), [
          question.id,
        ]);
      }
      next = addXp(next, xp);
      next = recordFinalAttempt(next, score.percent, score.passed);
      for (const miss of misses) next = addToReview(next, miss);
      saveProgress(next);
      setProgress(next);
      setFinished({
        correct: score.correct,
        total: score.total,
        percent: score.percent,
        passed: score.passed,
        xp,
        missed: misses.length,
        bestPct: next.final.bestPct,
        attempts: next.final.attempts,
      });
    },
    [queue, progress],
  );

  const submit = useCallback((picked: number | null = null) => {
    if (current === null || submitted || finished !== null) return;
    let correct = false;
    if (isChoiceQuestion(current)) {
      const idx = picked ?? selected;
      if (idx === null) return;
      setSelected(idx);
      correct = isChoiceCorrect(current, idx);
    } else {
      if (typed.trim().length === 0) return;
      correct = isRewriteCorrect(typed, current.accept);
    }
    const graded: GradedAnswer = {
      difficulty: current.difficulty,
      levelLabel: current.level,
      correct,
    };
    const updated = [...results, graded];
    setResults(updated);
    if (!correct) {
      missesRef.current.push({
        questionId: current.id,
        topic: current.topic,
        level: current.level,
        ruleRef: current.rule_ref,
        addedAt: new Date().toISOString(),
      });
    }
    setWasCorrect(correct);
    setSubmitted(true);
  }, [current, submitted, finished, selected, typed, results]);

  const next = useCallback(() => {
    if (!submitted || finished !== null) return;
    if (results.length >= FINAL_SIZE) {
      finish(results);
      return;
    }
    const picked = queue[results.length] ?? null;
    if (picked === null) {
      finish(results);
      return;
    }
    setCurrent(picked);
    setAnswered(results.length);
    setSelected(null);
    setTyped("");
    setSubmitted(false);
  }, [submitted, finished, results, queue, finish]);

  const retake = useCallback(() => {
    beginAttempt(progress, attempt + 1, dayRef.current);
  }, [beginAttempt, progress, attempt]);

  if (!ready || current === null) {
    return (
      <div className="narrow quiz-wrap" aria-busy="true">
        <p className="quiz-loading">Preparing your 50 final questions…</p>
      </div>
    );
  }

  if (finished !== null) {
    return (
      <div className="narrow quiz-wrap">
        <div
          className={`quiz-result ${finished.passed ? "quiz-result-pass" : "quiz-result-fail"}`}
          role="status"
        >
          <span className="quiz-result-icon" aria-hidden="true">
            {finished.passed ? (
              <Trophy size={28} strokeWidth={1.8} />
            ) : (
              <CircleAlert size={28} strokeWidth={1.8} />
            )}
          </span>
          <p className="hero-kicker">
            {finished.passed ? "Sprint complete" : "Final sprint — not yet"}
          </p>
          <p className="quiz-result-score">
            {finished.correct}/{finished.total} · {finished.percent}%
          </p>
          <p className="quiz-result-line">
            {finished.passed
              ? `You finished the A1→B2 sprint. Best ${finished.bestPct}% over ${finished.attempts} ${finished.attempts === 1 ? "attempt" : "attempts"}. +${finished.xp} XP earned.`
              : `You need ${FINAL_PASS_PCT}% to complete the sprint (best so far ${finished.bestPct}%). +${finished.xp} XP earned anyway.`}
          </p>
          <p className="quiz-review-note">
            {finished.missed > 0
              ? `${finished.missed} ${finished.missed === 1 ? "miss was" : "misses were"} saved to your review deck.`
              : "Flawless run — nothing waiting in the review deck."}
          </p>
          <div className="cta-row quiz-result-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={retake}
            >
              <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
              Run it again, new questions
            </button>
            <a className="btn btn-ghost" href="/stats">
              <BarChart3 size={16} strokeWidth={2} aria-hidden="true" />
              See my stats
            </a>
            {finished.missed > 0 ? (
              <a className="btn btn-ghost" href="/review">
                <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
                Review my misses
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const isChoice = isChoiceQuestion(current);
  const choiceQ = isChoiceQuestion(current) ? current : null;
  const rewriteQ = isRewriteQuestion(current) ? current : null;
  const canSubmit = submitted
    ? false
    : isChoice
      ? selected !== null
      : typed.trim().length > 0;
  const isLast = results.length + 1 >= FINAL_SIZE;
  const position = Math.min(results.length + 1, FINAL_SIZE);
  const correctChoiceText =
    choiceQ !== null ? (choiceQ.choices[choiceQ.answer] ?? "") : null;

  return (
    <div className="narrow quiz-wrap">
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label={`Question ${position} of ${FINAL_SIZE}`}
        aria-valuenow={position}
        aria-valuemin={1}
        aria-valuemax={FINAL_SIZE}
      >
        <span className="quiz-progress-label">
          Final question {position} of {FINAL_SIZE} · {current.level}
        </span>
        <span className="quiz-progress-track" aria-hidden="true">
          <span
            className="quiz-progress-fill"
            style={{ width: `${(position / FINAL_SIZE) * 100}%` }}
          />
        </span>
      </div>

      <article className="quiz-card" aria-label={`Final question ${position}`}>
        <div className="quiz-badges">
          <span className={`quiz-badge quiz-diff-${current.difficulty}`}>
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          <span className="quiz-badge">{typeLabel(current)}</span>
        </div>
        <p className="quiz-prompt">{current.prompt}</p>

        {isChoice ? (
          <div className="quiz-choices" role="group" aria-label="Answer choices">
            {shuffled.map((choice) => {
              const isPicked = selected === choice.originalIndex;
              const showVerdict = submitted;
              const isAnswer =
                showVerdict &&
                choiceQ !== null &&
                choice.originalIndex === choiceQ.answer;
              const isBadPick =
                showVerdict && isPicked && !wasCorrect;
              return (
                <button
                  key={choice.originalIndex}
                  type="button"
                  className={`quiz-choice${isPicked ? " is-picked" : ""}${isAnswer ? " is-correct" : ""}${isBadPick ? " is-wrong" : ""}`}
                  aria-pressed={isPicked}
                  disabled={submitted}
                  onClick={() => {
                    if (submitted) return;
                    setSelected(choice.originalIndex);
                    submit(choice.originalIndex);
                  }}
                >
                  {choice.text}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="quiz-rewrite">
            <label htmlFor="final-rewrite-input">Your sentence</label>
            <input
              id="final-rewrite-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              disabled={submitted}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
          </div>
        )}

        {!submitted && !isChoice ? (
          <button
            type="button"
            className="btn btn-primary quiz-submit"
            disabled={!canSubmit}
            onClick={() => submit()}
          >
            Check answer
          </button>
        ) : null}
        {isChoice && !submitted ? (
          <p className="quiz-hint">Tap an answer — the result appears instantly.</p>
        ) : null}
        {submitted ? (
          <div
            className={`quiz-feedback ${wasCorrect ? "quiz-feedback-ok" : "quiz-feedback-err"}`}
            role="status"
            aria-live="polite"
          >
            <p className="quiz-feedback-head">
              {wasCorrect ? (
                <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <CircleAlert size={18} strokeWidth={2} aria-hidden="true" />
              )}
              {wasCorrect ? "Correct." : "Not quite."}
            </p>
            {!wasCorrect && isChoice && correctChoiceText !== null ? (
              <p className="quiz-feedback-answer">
                The correct choice is “{correctChoiceText}”.
              </p>
            ) : null}
            {!wasCorrect && rewriteQ !== null ? (
              <p className="quiz-feedback-answer">
                One correct form is “{rewriteQ.answer_text}”.
              </p>
            ) : null}
            <p
              className="quiz-feedback-explain"
              dangerouslySetInnerHTML={{ __html: richText(current.explain_tr) }}
            />
            {!wasCorrect && current.trap_tr !== undefined ? (
              <p
                className="quiz-feedback-trap"
                dangerouslySetInnerHTML={{ __html: richText(current.trap_tr) }}
              />
            ) : null}
            {!wasCorrect ? (
              <a className="quiz-feedback-rule" href={ruleHref(current)}>
                <BookOpen size={15} strokeWidth={2} aria-hidden="true" />
                Review the rule in the lesson
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-primary quiz-next"
              onClick={next}
            >
              {isLast ? "See final result" : `Next question (${answered + 1}/${FINAL_SIZE} done)`}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}
