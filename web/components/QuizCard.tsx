/**
 * QuizCard — interactive 8Q topic quiz runner (P23).
 *
 * Client component. The server route (`/quiz/[topic]`) embeds the topic's
 * 25Q pool as props at build time; everything session-like happens here:
 * unseen-first draw (`drawTopicQuiz`, seeded `topic:day:attempt`), seeded
 * per-attempt choice shuffle, adaptive difficulty ordering
 * (`lib/quiz.ts`), rewrite checking (`normalize.ts`), grading + XP
 * (`scoring.ts`), and persistence (`progress.ts`: asked ids, XP, done
 * topics, review deck).
 *
 * Spec notes (`Docs/05-TEST-ENGINE-SPEC.md`):
 * - Correct → green panel + rule echo (`explain_tr`); wrong → red panel
 *   with `explain_tr` + `trap_tr` + deep link to the lesson (`rule_ref`).
 * - Misses join the review deck with their rule tag.
 * - The correct answer is resolved at submit from the bank copy and is
 *   never rendered (no `data-correct` markers) before submit.
 * - Only links to routes that exist (`/learn/*`, `/levels/*`, `/review` —
 *   the review route landed in P24, so misses link there).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  LayoutGrid,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Difficulty, Level, Question } from "../lib/bank";
import { isChoiceQuestion, isRewriteQuestion } from "../lib/bank";
import { TOPIC_QUIZ_SIZE, drawTopicQuiz } from "../lib/draw";
import { isRewriteCorrect } from "../lib/normalize";
import {
  addToReview,
  addXp,
  askedKey,
  defaultProgress,
  loadProgress,
  markTopicDone,
  recordAskedIds,
  saveProgress,
  type ProgressState,
  type ReviewItem,
} from "../lib/progress";
import {
  TOPIC_QUIZ_PASS_COUNT,
  gradeTopicQuiz,
  xpForAttempts,
  type ScoreBreakdown,
} from "../lib/scoring";
import { getTopic } from "../lib/topics";
import {
  answerAdaptive,
  initAdaptive,
  isChoiceCorrect,
  learnSlugFromRuleRef,
  nextAdaptiveQuestion,
  shuffleChoices,
  type AdaptiveState,
  type ShuffledChoice,
} from "../lib/quiz";

interface GradedAnswer {
  questionId: string;
  difficulty: Difficulty;
  topic: string;
  correct: boolean;
}

interface FinishedSummary {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  xp: number;
  missed: number;
  byDifficulty: Record<Difficulty, ScoreBreakdown>;
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

export default function QuizCard({
  pool,
  slug,
  level,
  title,
}: {
  pool: Question[];
  slug: string;
  level: Level;
  title: string;
}) {
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  /** Answered count doubles as the 0-based index of `current`. */
  const [answered, setAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [results, setResults] = useState<GradedAnswer[]>([]);
  const [finished, setFinished] = useState<FinishedSummary | null>(null);

  const sessionRef = useRef<AdaptiveState | null>(null);
  const drawnRef = useRef<Question[]>([]);
  const missesRef = useRef<ReviewItem[]>([]);
  const dayRef = useRef("");
  const finishGuardRef = useRef(false);

  const beginAttempt = useCallback(
    (stored: ProgressState, attemptNo: number, day: string) => {
      const asked = new Set<string>();
      const difficulties: Difficulty[] = ["easy", "medium", "hard"];
      for (const difficulty of difficulties) {
        const seen = stored.askedIds[askedKey(slug, difficulty)] ?? [];
        for (const id of seen) asked.add(id);
      }
      const drawn = drawTopicQuiz(pool, asked, `${slug}:${day}:${attemptNo}`);
      drawnRef.current = drawn.drawn;
      missesRef.current = [];
      finishGuardRef.current = false;
      const session = initAdaptive(drawn.drawn);
      sessionRef.current = session;
      const first = nextAdaptiveQuestion(session);
      setCurrent(first?.question ?? null);
      setAnswered(0);
      setSelected(null);
      setTyped("");
      setSubmitted(false);
      setResults([]);
      setFinished(null);
      setAttempt(attemptNo);
      setReady(true);
    },
    [pool, slug],
  );

  useEffect(() => {
    const stored = loadProgress();
    setProgress(stored);
    const day = new Date().toISOString().slice(0, 10);
    dayRef.current = day;
    beginAttempt(stored, 0, day);
  }, [beginAttempt]);

  const shuffled: ShuffledChoice[] = useMemo(() => {
    if (current === null || !isChoiceQuestion(current)) return [];
    return shuffleChoices(
      current,
      `${slug}:${dayRef.current}:${attempt}:${current.id}`,
    );
  }, [current, slug, attempt]);

  const ruleHref = useCallback(
    (question: Question): string => {
      const parsed = learnSlugFromRuleRef(question.rule_ref);
      if (parsed !== null && getTopic(parsed) !== undefined) {
        return `/learn/${parsed}`;
      }
      return `/learn/${slug}`;
    },
    [slug],
  );

  const finish = useCallback(
    (graded: GradedAnswer[]) => {
      if (finishGuardRef.current) return;
      finishGuardRef.current = true;
      const score = gradeTopicQuiz(graded);
      const xp = xpForAttempts(graded);
      const misses = missesRef.current;
      setProgress((prev) => {
        let next = prev;
        for (const question of drawnRef.current) {
          next = recordAskedIds(next, askedKey(slug, question.difficulty), [
            question.id,
          ]);
        }
        next = addXp(next, xp);
        if (score.passed) next = markTopicDone(next, slug);
        for (const miss of misses) next = addToReview(next, miss);
        saveProgress(next);
        return next;
      });
      setFinished({
        correct: score.correct,
        total: score.total,
        percent: score.percent,
        passed: score.passed,
        xp,
        missed: misses.length,
        byDifficulty: score.byDifficulty,
      });
    },
    [slug],
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
      questionId: current.id,
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
        level,
        ruleRef: current.rule_ref,
        addedAt: new Date().toISOString(),
      });
    }
    const session = sessionRef.current;
    if (session !== null) answerAdaptive(session, correct);
    setWasCorrect(correct);
    setSubmitted(true);
  }, [current, submitted, finished, selected, typed, results, level]);

  const next = useCallback(() => {
    if (!submitted || finished !== null) return;
    if (results.length >= TOPIC_QUIZ_SIZE) {
      finish(results);
      return;
    }
    const session = sessionRef.current;
    const picked = session === null ? null : nextAdaptiveQuestion(session);
    if (picked === null) {
      finish(results);
      return;
    }
    setCurrent(picked.question);
    setAnswered(results.length);
    setSelected(null);
    setTyped("");
    setSubmitted(false);
  }, [submitted, finished, results, finish]);

  const retake = useCallback(() => {
    beginAttempt(progress, attempt + 1, dayRef.current);
  }, [beginAttempt, progress, attempt]);

  if (!ready || current === null) {
    return (
      <div className="narrow quiz-wrap" aria-busy="true">
        <p className="quiz-loading">Preparing your 8 questions…</p>
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
            {finished.passed ? "Topic done" : "Keep going"}
          </p>
          <p className="quiz-result-score">
            {finished.correct}/{finished.total} · {finished.percent}%
          </p>
          <p className="quiz-result-line">
            {finished.passed
              ? `You cleared “${title}”. +${finished.xp} XP earned.`
              : `You need ${TOPIC_QUIZ_PASS_COUNT}/${finished.total} to mark this topic done. +${finished.xp} XP earned anyway.`}
          </p>
          <dl className="quiz-breakdown" aria-label="Score by difficulty">
            {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map(
              (difficulty) => {
                const bucket = finished.byDifficulty[difficulty];
                return (
                  <div className="quiz-breakdown-row" key={difficulty}>
                    <dt>{DIFFICULTY_LABEL[difficulty]}</dt>
                    <dd>
                      {bucket.correct}/{bucket.total} · {bucket.percent}%
                    </dd>
                  </div>
                );
              },
            )}
          </dl>
          {finished.missed > 0 ? (
            <p className="quiz-review-note">
              {finished.missed} missed{" "}
              {finished.missed === 1 ? "question" : "questions"} saved to your{" "}
              <a href="/review">review deck</a> with its rule tag — re-answer{" "}
              {finished.missed === 1 ? "it" : "them"} to master this topic.
            </p>
          ) : (
            <p className="quiz-review-note">
              Flawless run — nothing waiting in the review deck for this topic.
            </p>
          )}
          <div className="cta-row quiz-result-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={retake}
            >
              <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
              Retake with new questions
            </button>
            <a className="btn btn-ghost" href={`/learn/${slug}`}>
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Back to lesson
            </a>
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
  const isLast = results.length + 1 >= TOPIC_QUIZ_SIZE;
  const position = Math.min(results.length + 1, TOPIC_QUIZ_SIZE);
  const correctChoiceText =
    choiceQ !== null ? (choiceQ.choices[choiceQ.answer] ?? "") : null;

  return (
    <div className="narrow quiz-wrap">
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label={`Question ${position} of ${TOPIC_QUIZ_SIZE}`}
        aria-valuenow={position}
        aria-valuemin={1}
        aria-valuemax={TOPIC_QUIZ_SIZE}
      >
        <span className="quiz-progress-label">
          Question {position} of {TOPIC_QUIZ_SIZE}
        </span>
        <span className="quiz-progress-track" aria-hidden="true">
          <span
            className="quiz-progress-fill"
            style={{ width: `${(position / TOPIC_QUIZ_SIZE) * 100}%` }}
          />
        </span>
      </div>

      <article className="quiz-card" aria-label={`Quiz question ${position}`}>
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
            <label htmlFor="quiz-rewrite-input">Your sentence</label>
            <input
              id="quiz-rewrite-input"
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
              {isLast ? "See results" : "Next question"}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}
