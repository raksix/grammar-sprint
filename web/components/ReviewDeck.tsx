/**
 * ReviewDeck — missed-question re-answer flow (P24).
 *
 * Client component. The server route (`/review`) embeds the whole 1200Q
 * bank as props at build time; this component looks deck items up by id
 * and walks them one card at a time. A correct re-answer drops the item
 * from the deck (`clearReview` + persist); a miss keeps it and re-queues
 * it at the end of the session queue, so the deck clears exactly when
 * every item has been re-answered correctly once
 * (`Docs/05-TEST-ENGINE-SPEC.md` §Review deck). Clearing the deck is what
 * unlocks a failed gate's retake (`canRetakeGate`).
 *
 * Deck items whose question id no longer exists in the bank are dropped
 * once at mount (counted and reported, never silently kept).
 * Only links to routes that exist (`/learn/*`, `/levels/*`, `/stats`).
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  LayoutGrid,
  Trophy,
} from "lucide-react";
import type { Question } from "../lib/bank";
import { isChoiceQuestion, isRewriteQuestion } from "../lib/bank";
import { isRewriteCorrect } from "../lib/normalize";
import { richText } from "../lib/richtext";
import {
  clearReview,
  defaultProgress,
  loadProgress,
  saveProgress,
  type ProgressState,
  type ReviewItem,
} from "../lib/progress";
import { getTopic } from "../lib/topics";
import {
  isChoiceCorrect,
  learnSlugFromRuleRef,
  shuffleChoices,
  type ShuffledChoice,
} from "../lib/quiz";

export default function ReviewDeck({ pool }: { pool: Question[] }) {
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [cleared, setCleared] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const dayRef = useRef("");

  const byId = useMemo(() => {
    const map = new Map<string, Question>();
    for (const question of pool) map.set(question.id, question);
    return map;
  }, [pool]);

  useEffect(() => {
    const stored = loadProgress();
    dayRef.current = new Date().toISOString().slice(0, 10);
    const answerable: ReviewItem[] = [];
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const item of stored.reviewDeck) {
      if (seen.has(item.questionId)) continue;
      seen.add(item.questionId);
      if (byId.has(item.questionId)) {
        answerable.push(item);
      } else {
        missing.push(item.questionId);
      }
    }
    if (missing.length > 0) {
      const next = clearReview(stored, missing);
      saveProgress(next);
      setProgress(next);
      setSkipped(missing.length);
    } else {
      setProgress(stored);
    }
    setQueue(answerable);
    setReady(true);
  }, [byId]);

  const current: ReviewItem | null = queue[0] ?? null;
  const question: Question | null =
    current !== null ? (byId.get(current.questionId) ?? null) : null;

  const shuffled: ShuffledChoice[] = useMemo(() => {
    if (question === null || !isChoiceQuestion(question)) return [];
    return shuffleChoices(question, `review:${dayRef.current}:${question.id}`);
  }, [question]);

  const submit = useCallback(() => {
    if (question === null || submitted) return;
    let correct = false;
    if (isChoiceQuestion(question)) {
      if (selected === null) return;
      correct = isChoiceCorrect(question, selected);
    } else {
      if (typed.trim().length === 0) return;
      correct = isRewriteCorrect(typed, question.accept);
    }
    if (correct) {
      setProgress((prev) => {
        const next = clearReview(prev, [question.id]);
        saveProgress(next);
        return next;
      });
    }
    setWasCorrect(correct);
    setSubmitted(true);
  }, [question, submitted, selected, typed]);

  const next = useCallback(() => {
    if (!submitted || current === null) return;
    if (wasCorrect) {
      setQueue((prev) => prev.slice(1));
      setCleared((count) => count + 1);
    } else {
      setQueue((prev) =>
        prev.length <= 1 ? prev : [...prev.slice(1), prev[0] as ReviewItem],
      );
    }
    setSelected(null);
    setTyped("");
    setSubmitted(false);
  }, [submitted, wasCorrect, current]);

  if (!ready) {
    return (
      <div className="narrow quiz-wrap" aria-busy="true">
        <p className="quiz-loading">Opening your review deck…</p>
      </div>
    );
  }

  if (current === null || question === null) {
    return (
      <div className="narrow quiz-wrap">
        <div className="quiz-result quiz-result-pass" role="status">
          <span className="quiz-result-icon" aria-hidden="true">
            <Trophy size={28} strokeWidth={1.8} />
          </span>
          <p className="hero-kicker">Review deck clear</p>
          <p className="quiz-result-score">
            {cleared} cleared{skipped > 0 ? ` · ${skipped} retired` : ""}
          </p>
          <p className="quiz-result-line">
            {cleared > 0
              ? "Every miss re-answered correctly. Any locked gate retake is open again."
              : skipped > 0
                ? "Some saved questions no longer exist and were retired."
                : "Nothing waiting — misses from quizzes land here with their rule tag."}
          </p>
          <div className="cta-row quiz-result-actions">
            <a className="btn btn-primary" href="/stats">
              See my stats
            </a>
            <a className="btn btn-ghost" href="/">
              <LayoutGrid size={16} strokeWidth={2} aria-hidden="true" />
              All levels
            </a>
          </div>
        </div>
      </div>
    );
  }

  const topicTitle = getTopic(current.topic)?.title ?? current.topic;
  const ruleRef = learnSlugFromRuleRef(question.rule_ref);
  const ruleHref =
    ruleRef !== null && getTopic(ruleRef) !== undefined
      ? `/learn/${ruleRef}`
      : `/learn/${current.topic}`;
  const isChoice = isChoiceQuestion(question);
  const choiceQ = isChoice ? question : null;
  const rewriteQ = isRewriteQuestion(question) ? question : null;
  const canSubmit = submitted
    ? false
    : isChoice
      ? selected !== null
      : typed.trim().length > 0;
  const correctChoiceText =
    choiceQ !== null ? (choiceQ.choices[choiceQ.answer] ?? "") : null;

  return (
    <div className="narrow quiz-wrap">
      <p className="review-count" role="status">
        {queue.length} left in deck
        {cleared > 0 ? ` · ${cleared} cleared this session` : ""}
      </p>

      <article className="quiz-card" aria-label="Review card">
        <div className="quiz-badges">
          <span className="quiz-badge">
            {current.level} · {topicTitle}
          </span>
        </div>
        <p className="quiz-prompt">{question.prompt}</p>
        {question.prompt_tr ? (
          <p className="quiz-prompt-tr">{question.prompt_tr}</p>
        ) : null}

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
                  onClick={() => setSelected(choice.originalIndex)}
                >
                  {choice.text}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="quiz-rewrite">
            <label htmlFor="review-rewrite-input">Your sentence</label>
            <input
              id="review-rewrite-input"
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

        {!submitted ? (
          <button
            type="button"
            className="btn btn-primary quiz-submit"
            disabled={!canSubmit}
            onClick={submit}
          >
            Check answer
          </button>
        ) : (
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
              {wasCorrect
                ? "Correct — cleared from the deck."
                : "Not quite — it stays in the deck."}
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
              dangerouslySetInnerHTML={{ __html: richText(question.explain_tr) }}
            />
            {!wasCorrect && question.trap_tr !== undefined ? (
              <p
                className="quiz-feedback-trap"
                dangerouslySetInnerHTML={{ __html: richText(question.trap_tr) }}
              />
            ) : null}
            {!wasCorrect ? (
              <a className="quiz-feedback-rule" href={ruleHref}>
                <BookOpen size={15} strokeWidth={2} aria-hidden="true" />
                Review the rule in the lesson
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-primary quiz-next"
              onClick={next}
            >
              {queue.length <= 1 && wasCorrect
                ? "Finish review"
                : "Next card"}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
