/**
 * GateCard — interactive 30Q level-gate runner (P24).
 *
 * Client component. The server route (`/gate/[level]`) embeds the level's
 * 300Q pool as props at build time; the session runs here: unseen-first
 * stratified draw (`drawGate`, seeded `level:gate:day:attempt`), seeded
 * per-attempt choice shuffle, the same submit feedback as the topic quiz
 * (`explain_tr` + `trap_tr` + lesson deep link), grading (`gradeGate`:
 * percent + per-topic breakdown + weakest 3), and persistence
 * (`progress.ts`: asked ids, XP, gate record via `recordGateAttempt`,
 * misses into the review deck).
 *
 * Spec notes (`Docs/05-TEST-ENGINE-SPEC.md`):
 * - Pass at ≥ 80% unlocks the next level (sticky via `recordGateAttempt`).
 * - Fail shows the per-topic breakdown with weakest-topic lesson links
 *   and LOCKS retake until the review deck is fully clear
 *   (`canRetakeGate` in `lib/gate.ts`).
 * - The correct answer is resolved at submit from the bank copy and is
 *   never rendered (no `data-correct` markers) before submit.
 * - Only links to routes that exist (`/learn/*`, `/levels/*`, `/review`,
 *   `/final` — all live as of P24).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Flag,
  LayoutGrid,
  Lock,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Difficulty, Level, Question } from "../lib/bank";
import { isChoiceQuestion, isRewriteQuestion } from "../lib/bank";
import { GATE_SIZE, drawGate } from "../lib/draw";
import { canRetakeGate } from "../lib/gate";
import { isRewriteCorrect } from "../lib/normalize";
import {
  addToReview,
  addXp,
  askedKey,
  defaultProgress,
  loadProgress,
  recordAskedIds,
  recordGateAttempt,
  saveProgress,
  type GateRecord,
  type ProgressState,
  type ReviewItem,
} from "../lib/progress";
import {
  GATE_PASS_PCT,
  gradeGate,
  xpForAttempts,
  type ScoreBreakdown,
  type TopicAttempt,
} from "../lib/scoring";
import {
  LEVEL_ORDER,
  LEVELS_META,
  TOPICS_BY_LEVEL,
  getTopic,
} from "../lib/topics";
import {
  isChoiceCorrect,
  learnSlugFromRuleRef,
  shuffleChoices,
  type ShuffledChoice,
} from "../lib/quiz";

interface FinishedSummary {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  xp: number;
  missed: number;
  byTopic: Record<string, ScoreBreakdown>;
  weakestTopics: string[];
  /** Gate record AFTER this attempt was persisted. */
  gate: GateRecord;
  /** Open review items AFTER this attempt's misses were added. */
  openReviews: number;
  /** Retake allowed right now (pass, or deck fully clear). */
  retakeOpen: boolean;
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

export default function GateCard({
  pool,
  level,
}: {
  pool: Question[];
  level: Level;
}) {
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
  const [results, setResults] = useState<TopicAttempt[]>([]);
  const [finished, setFinished] = useState<FinishedSummary | null>(null);

  const missesRef = useRef<ReviewItem[]>([]);
  const dayRef = useRef("");
  const finishGuardRef = useRef(false);

  const beginAttempt = useCallback(
    (stored: ProgressState, attemptNo: number, day: string) => {
      const asked = new Set<string>();
      for (const topic of TOPICS_BY_LEVEL[level]) {
        const difficulties: Difficulty[] = ["easy", "medium", "hard"];
        for (const difficulty of difficulties) {
          const seen = stored.askedIds[askedKey(topic.slug, difficulty)] ?? [];
          for (const id of seen) asked.add(id);
        }
      }
      const drawn = drawGate(pool, asked, `${level}:gate:${day}:${attemptNo}`);
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
    [pool, level],
  );

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    const day = new Date().toISOString().slice(0, 10);
    dayRef.current = day;
    beginAttempt(stored, stored.gates[level]?.attempts ?? 0, day);
  }, [beginAttempt, level]);

  const shuffled: ShuffledChoice[] = useMemo(() => {
    if (current === null || !isChoiceQuestion(current)) return [];
    return shuffleChoices(
      current,
      `${level}:gate:${dayRef.current}:${attempt}:${current.id}`,
    );
  }, [current, level, attempt]);

  const ruleHref = useCallback(
    (question: Question): string => {
      const parsed = learnSlugFromRuleRef(question.rule_ref);
      if (parsed !== null && getTopic(parsed) !== undefined) {
        return `/learn/${parsed}`;
      }
      return `/levels/${level}`;
    },
    [level],
  );

  const finish = useCallback(
    (graded: TopicAttempt[]) => {
      if (finishGuardRef.current) return;
      finishGuardRef.current = true;
      const score = gradeGate(graded);
      const xp = xpForAttempts(graded);
      const misses = missesRef.current;
      let next = progress;
      for (const question of queue) {
        next = recordAskedIds(next, askedKey(question.topic, question.difficulty), [
          question.id,
        ]);
      }
      next = addXp(next, xp);
      next = recordGateAttempt(next, level, score.percent, score.passed);
      for (const miss of misses) next = addToReview(next, miss);
      saveProgress(next);
      setProgress(next);
      const gate = next.gates[level] ?? {
        passed: score.passed,
        bestPct: score.percent,
        attempts: 1,
      };
      const openReviews = next.reviewDeck.length;
      setFinished({
        correct: score.correct,
        total: score.total,
        percent: score.percent,
        passed: score.passed,
        xp,
        missed: misses.length,
        byTopic: score.byTopic,
        weakestTopics: score.weakestTopics,
        gate,
        openReviews,
        retakeOpen: canRetakeGate(gate, openReviews),
      });
    },
    [level, queue, progress],
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
    const graded: TopicAttempt = {
      difficulty: current.difficulty,
      topic: current.topic,
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
    if (results.length >= GATE_SIZE) {
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

  const meta = LEVELS_META[level];
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const nextLevel =
    levelIndex >= 0 && levelIndex < LEVEL_ORDER.length - 1
      ? LEVEL_ORDER[levelIndex + 1]
      : undefined;

  if (!ready || current === null) {
    return (
      <div className="narrow quiz-wrap" aria-busy="true">
        <p className="quiz-loading">Preparing your 30 gate questions…</p>
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
            {finished.passed
              ? `${level} gate cleared`
              : `${level} gate — not yet`}
          </p>
          <p className="quiz-result-score">
            {finished.correct}/{finished.total} · {finished.percent}%
          </p>
          <p className="quiz-result-line">
            {finished.passed
              ? nextLevel !== undefined
                ? `You unlocked ${nextLevel}. +${finished.xp} XP earned.`
                : `You cleared the last gate. +${finished.xp} XP earned — the final sprint awaits.`
              : `You need ${GATE_PASS_PCT}% to unlock ${nextLevel ?? "the next level"}. +${finished.xp} XP earned anyway.`}
          </p>
          <dl className="quiz-breakdown" aria-label="Score by topic">
            {TOPICS_BY_LEVEL[level].map((topic) => {
              const bucket = finished.byTopic[topic.slug] ?? {
                total: 0,
                correct: 0,
                percent: 0,
              };
              return (
                <div className="quiz-breakdown-row" key={topic.slug}>
                  <dt>{topic.title}</dt>
                  <dd>
                    {bucket.correct}/{bucket.total} · {bucket.percent}%
                  </dd>
                </div>
              );
            })}
          </dl>
          {finished.passed ? (
            <p className="quiz-review-note">
              {finished.missed > 0
                ? `${finished.missed} ${finished.missed === 1 ? "miss was" : "misses were"} saved to your review deck — clear them on the review page.`
                : "Flawless run — nothing waiting in the review deck."}
            </p>
          ) : (
            <div className="gate-weakest" aria-label="Weakest topics">
              <p className="gate-weakest-head">
                <Flag size={16} strokeWidth={2} aria-hidden="true" />
                Restudy these first:
              </p>
              <ul>
                {finished.weakestTopics.map((slug) => {
                  const topic = getTopic(slug);
                  const title = topic?.title ?? slug;
                  return (
                    <li key={slug}>
                      <a href={`/learn/${slug}`}>{title}</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div className="cta-row quiz-result-actions">
            {finished.retakeOpen ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={retake}
              >
                <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
                {finished.passed ? "Practice again, new questions" : "Retake the gate"}
              </button>
            ) : (
              <p className="gate-locked-note" role="note">
                <Lock size={16} strokeWidth={2} aria-hidden="true" />
                Retake locked — clear your review deck first (
                {finished.openReviews} open).{" "}
                <a href="/review">Go to review</a>
              </p>
            )}
            {finished.passed && nextLevel !== undefined ? (
              <a className="btn btn-ghost" href={`/levels/${nextLevel}`}>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                Continue to {nextLevel} topics
              </a>
            ) : null}
            {finished.passed && nextLevel === undefined ? (
              <a className="btn btn-ghost" href="/final">
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                Take the final sprint
              </a>
            ) : null}
            {!finished.passed ? (
              <a className="btn btn-ghost" href="/review">
                <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
                Review my misses
              </a>
            ) : null}
            <a className="btn btn-ghost" href={`/levels/${level}`}>
              <LayoutGrid size={16} strokeWidth={2} aria-hidden="true" />
              {level} topics
            </a>
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
  const isLast = results.length + 1 >= GATE_SIZE;
  const position = Math.min(results.length + 1, GATE_SIZE);
  const correctChoiceText =
    choiceQ !== null ? (choiceQ.choices[choiceQ.answer] ?? "") : null;

  return (
    <div className="narrow quiz-wrap">
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label={`Question ${position} of ${GATE_SIZE}`}
        aria-valuenow={position}
        aria-valuemin={1}
        aria-valuemax={GATE_SIZE}
      >
        <span className="quiz-progress-label">
          Gate question {position} of {GATE_SIZE}
        </span>
        <span className="quiz-progress-track" aria-hidden="true">
          <span
            className="quiz-progress-fill"
            style={{ width: `${(position / GATE_SIZE) * 100}%` }}
          />
        </span>
      </div>

      <article className="quiz-card" aria-label={`Gate question ${position}`}>
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
            <label htmlFor="gate-rewrite-input">Your sentence</label>
            <input
              id="gate-rewrite-input"
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
            <p className="quiz-feedback-explain">{current.explain_tr}</p>
            {!wasCorrect && current.trap_tr !== undefined ? (
              <p className="quiz-feedback-trap">{current.trap_tr}</p>
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
              {isLast ? "See gate result" : `Next question (${answered + 1}/${GATE_SIZE} done)`}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </article>

      <p className="quiz-footnote">
        {meta.code} {meta.name} · pass at {GATE_PASS_PCT}% to unlock{" "}
        {nextLevel ?? "the final sprint"} ·{" "}
        <a href={`/levels/${level}`}>
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" /> Back to{" "}
          {level} topics
        </a>
      </p>
    </div>
  );
}
