/**
 * StatsView — XP, mastery and gate overview (P24).
 *
 * Client component for the `/stats` route. Reads `gs-progress-v1` after
 * mount (SSR-safe: first render uses the empty default so prerender and
 * hydration match). Shows the XP hero, per-level progress + gate records,
 * the final-sprint record, per-topic mastery
 * (`isTopicMastered`: quiz passed AND zero open review items) and the
 * attention list (topics with open misses, deep-linked to lesson and
 * review). Only links to routes that exist.
 */

"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flag,
  Trophy,
} from "lucide-react";
import { isTopicMastered } from "../lib/scoring";
import {
  defaultProgress,
  loadProgress,
  openReviewCount,
  type ProgressState,
} from "../lib/progress";
import {
  LEVEL_ORDER,
  TOPICS,
  TOPICS_BY_LEVEL,
  getLevelProgress,
  isLevelUnlocked,
} from "../lib/topics";

export default function StatsView() {
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const doneCount = TOPICS.filter((topic) =>
    progress.doneTopics.includes(topic.slug),
  ).length;
  const mastered = TOPICS.filter((topic) =>
    isTopicMastered(
      progress.doneTopics.includes(topic.slug),
      openReviewCount(progress, topic.slug),
    ),
  );
  const gatesCleared = LEVEL_ORDER.filter(
    (level) => progress.gates[level]?.passed === true,
  ).length;
  const openTotal = openReviewCount(progress);

  const attention = TOPICS.map((topic) => ({
    topic,
    open: openReviewCount(progress, topic.slug),
  })).filter((entry) => entry.open > 0);

  return (
    <div className="narrow">
      <header className="level-head">
        <span className="hero-kicker">Progress</span>
        <h1>Your stats</h1>
        <p className="lead">
          XP, mastered topics, gate results and what needs restudy — all from
          this device.
        </p>
      </header>

      <div className="stat-grid" aria-label="Totals">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true">
            <Trophy size={20} strokeWidth={1.8} />
          </span>
          <span className="stat-num">{progress.xp}</span>
          <span className="stat-label">XP earned</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {doneCount}/{TOPICS.length}
          </span>
          <span className="stat-label">Topics done</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {mastered.length}/{TOPICS.length}
          </span>
          <span className="stat-label">Mastered</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{gatesCleared}/4</span>
          <span className="stat-label">Gates cleared</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">
            {progress.final.attempts > 0 ? `${progress.final.bestPct}%` : "—"}
          </span>
          <span className="stat-label">
            Final best{progress.final.passed ? " · complete" : ""}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{openTotal}</span>
          <span className="stat-label">Open review</span>
        </div>
      </div>

      <section aria-label="Levels">
        <h2>Levels</h2>
        <ol className="stat-levels">
          {LEVEL_ORDER.map((level) => {
            const { done, total } = getLevelProgress(
              level,
              progress.doneTopics,
            );
            const gate = progress.gates[level];
            const unlocked = isLevelUnlocked(level, progress.gates);
            return (
              <li className="stat-level" key={level} data-level={level}>
                <span className="stat-level-code" aria-hidden="true">
                  {level}
                </span>
                <span className="stat-level-body">
                  <span className="stat-level-title">
                    {done}/{total} topics
                    {gate !== undefined && gate.attempts > 0
                      ? ` · gate best ${gate.bestPct}%${gate.passed ? " · cleared" : ""}`
                      : unlocked
                        ? " · gate not attempted"
                        : " · locked"}
                  </span>
                  <span className="stat-level-links">
                    <a href={`/levels/${level}`}>Topics</a>
                    {" · "}
                    <a href={`/gate/${level}`}>Gate</a>
                  </span>
                </span>
                {gate?.passed === true ? (
                  <CheckCircle2
                    size={18}
                    strokeWidth={2}
                    aria-label="Gate cleared"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Needs restudy">
        <h2>
          <Flag size={18} strokeWidth={2} aria-hidden="true" /> Needs restudy
        </h2>
        {attention.length === 0 ? (
          <p className="stat-empty">
            No open misses.{" "}
            {openTotal === 0 && doneCount > 0 ? (
              <>Every cleared topic is mastered.</>
            ) : (
              <>Misses from quizzes will appear here with their rule tag.</>
            )}
          </p>
        ) : (
          <ul className="stat-attention">
            {attention.map(({ topic, open }) => (
              <li key={topic.slug}>
                <span>
                  {topic.level} · {topic.title} — {open} open
                </span>{" "}
                <a href={`/learn/${topic.slug}`}>
                  <BookOpen size={14} strokeWidth={2} aria-hidden="true" />{" "}
                  Lesson
                </a>{" "}
                · <a href="/review">Review</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Final sprint">
        <h2>Final sprint</h2>
        <p>
          {progress.final.attempts > 0
            ? `Best ${progress.final.bestPct}% over ${progress.final.attempts} ${progress.final.attempts === 1 ? "attempt" : "attempts"}${progress.final.passed ? " — sprint complete." : " — 70% completes the sprint."}`
            : "50 questions across A1→B2. 70% completes the sprint."}{" "}
          <a href="/final">
            Take the final <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
          </a>
        </p>
        <h2>Mastered topics ({mastered.length})</h2>
        {mastered.length === 0 ? (
          <p className="stat-empty">
            Pass a topic quiz with zero open review items to master it.
          </p>
        ) : (
          <p className="stat-mastered">
            {mastered
              .map(
                (topic) =>
                  `${topic.level} ${TOPICS_BY_LEVEL[topic.level].indexOf(topic) + 1}`,
              )
              .join(" · ")}
          </p>
        )}
      </section>
    </div>
  );
}
