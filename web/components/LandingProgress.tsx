/**
 * LandingProgress — live continue band for the landing page (P25).
 *
 * Client component: first render uses the empty default (so prerender and
 * hydration match), then swaps in the real `gs-progress-v1` after mount —
 * the same SSR-safe pattern as LevelMap/QuizCard. Every link points at a
 * route that exists: learn / quiz / gate / review / stats / final / levels.
 */

"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Flag,
  RotateCcw,
  Trophy,
} from "lucide-react";
import {
  defaultProgress,
  loadProgress,
  openReviewCount,
  type ProgressState,
} from "../lib/progress";
import { getContinueTarget } from "../lib/continue";
import { getTopic } from "../lib/topics";

export default function LandingProgress() {
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const target = getContinueTarget(progress.doneTopics, progress.gates);
  const open = openReviewCount(progress);
  const doneCount = progress.doneTopics.length;

  const topicTitle =
    target.kind === "topic"
      ? (getTopic(target.topic.slug)?.title ?? target.topic.slug)
      : null;

  const isTopic = target.kind === "topic";
  const isGate = target.kind === "gate";

  return (
    <section className="continue-band" aria-label="Continue where you left off">
      <div className="continue-main">
        <span className="hero-kicker">Your sprint</span>
        {isTopic ? (
          <>
            <h2 className="continue-title">Next up: {topicTitle}</h2>
            <p className="continue-sub">
              {doneCount === 0
                ? "Start with the first A1 topic — learn it, then quiz it the same hour."
                : `${doneCount}/48 topics done. Learn it, then quiz it the same hour.`}
            </p>
            <div className="cta-row">
              <a
                className="btn btn-primary"
                href={
                  target.kind === "topic"
                    ? target.learnHref
                    : "/learn/a1-01-verb-to-be"
                }
              >
                <BookOpen size={17} strokeWidth={2} aria-hidden="true" />
                Learn it
              </a>
              <a
                className="btn btn-ghost"
                href={
                  target.kind === "topic"
                    ? target.quizHref
                    : "/quiz/a1-01-verb-to-be"
                }
              >
                <ClipboardCheck size={17} strokeWidth={2} aria-hidden="true" />
                Quiz it
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </>
        ) : isGate ? (
          <>
            <h2 className="continue-title">
              Take the {target.kind === "gate" ? target.level : ""} gate — 30
              questions
            </h2>
            <p className="continue-sub">
              Every topic in the level is done. Score 80%+ to unlock the next
              level.
            </p>
            <div className="cta-row">
              <a
                className="btn btn-primary"
                href={target.kind === "gate" ? target.gateHref : "/gate/A1"}
              >
                <Flag size={17} strokeWidth={2} aria-hidden="true" />
                Take the {target.kind === "gate" ? target.level : ""} gate
              </a>
            </div>
          </>
        ) : (
          <>
            <h2 className="continue-title">Sprint complete — try the final</h2>
            <p className="continue-sub">
              All four gates cleared. The 50-question final mixes the whole
              bank.
            </p>
            <div className="cta-row">
              <a
                className="btn btn-primary"
                href={target.kind === "final" ? target.finalHref : "/final"}
              >
                <Flag size={17} strokeWidth={2} aria-hidden="true" />
                Take the final sprint
              </a>
            </div>
          </>
        )}
      </div>
      <ul className="continue-side" aria-label="Sprint shortcuts">
        <li>
          <a href="/review">
            <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
            Review deck{open > 0 ? ` · ${open} open` : " · clear"}
          </a>
        </li>
        <li>
          <a href="/stats">
            <Trophy size={16} strokeWidth={2} aria-hidden="true" />
            Stats · {progress.xp.toLocaleString("en-US")} XP
          </a>
        </li>
        <li>
          <a href="/levels/A1">
            <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
            Browse all levels
          </a>
        </li>
      </ul>
    </section>
  );
}
