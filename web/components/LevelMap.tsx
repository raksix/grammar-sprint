"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import type { Level } from "../lib/bank";
import {
  defaultProgress,
  loadProgress,
  type ProgressState,
} from "../lib/progress";
import {
  LEVEL_ORDER,
  LEVELS_META,
  TOPICS_BY_LEVEL,
  getLevelProgress,
  getTopicStatus,
  isLevelUnlocked,
  type TopicStatus,
} from "../lib/topics";

const STATUS_META: Record<
  TopicStatus,
  { label: string; hint: string; Icon: typeof Circle }
> = {
  done: {
    label: "Done",
    Icon: CheckCircle2,
    hint: "Quiz cleared.",
  },
  available: {
    label: "Available",
    Icon: Circle,
    hint: "Ready to learn.",
  },
  locked: {
    label: "Locked",
    Icon: Lock,
    hint: "Clear the previous topic first.",
  },
};

/**
 * 12-topic grid for one CEFR level with live done/locked states.
 *
 * Reads `gs-progress-v1` from localStorage after mount (SSR-safe: the
 * first render uses the empty default so prerender and hydration match,
 * then the real progress swaps in). Topic cards are intentionally
 * link-free — `/learn/[topic]` (P22) and `/quiz/[topic]` (P23) do not
 * exist yet, and this piece ships zero dead buttons. P22/P23 upgrade
 * the cards to navigation.
 */
export default function LevelMap({ level }: { level: Level }) {
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const meta = LEVELS_META[level];
  const topics = TOPICS_BY_LEVEL[level];
  const unlocked = isLevelUnlocked(level, progress.gates);
  const { done, total } = getLevelProgress(level, progress.doneTopics);
  const gate = progress.gates[level];
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const prevLevel = levelIndex > 0 ? LEVEL_ORDER[levelIndex - 1] : undefined;
  const nextLevel =
    levelIndex >= 0 && levelIndex < LEVEL_ORDER.length - 1
      ? LEVEL_ORDER[levelIndex + 1]
      : undefined;

  return (
    <div className="narrow">
      <nav aria-label="Breadcrumb">
        <a className="back-link" href="/">
          All levels
        </a>
      </nav>
      <header className="level-head">
        <span className="hero-kicker">
          {meta.code} · {meta.name}
        </span>
        <h1>{meta.code} topics</h1>
        <p className="lead">{meta.blurb}</p>
        <div className="level-meta-row">
          <span
            className="progress-pill"
            aria-label={`${done} of ${total} topics done`}
          >
            {done}/{total} done
          </span>
          {gate !== undefined && gate.attempts > 0 ? (
            <span
              className={gate.passed ? "gate-pill gate-passed" : "gate-pill"}
              aria-label={`Gate best score ${gate.bestPct} percent${gate.passed ? ", passed" : ""}`}
            >
              Gate best {gate.bestPct}%
              {gate.passed ? " · cleared" : ""}
            </span>
          ) : (
            <span className="gate-pill">
              Gate needs 80%
              {nextLevel !== undefined ? ` to unlock ${nextLevel}` : ""}
            </span>
          )}
        </div>
      </header>

      {!unlocked && prevLevel !== undefined ? (
        <p className="level-locked-note" role="note">
          <Lock size={16} strokeWidth={2} aria-hidden="true" />
          {meta.code} unlocks after you clear the {prevLevel} gate at 80%.
        </p>
      ) : null}

      <ol className="topic-grid" aria-label={`${meta.code} topics`}>
        {topics.map((topic) => {
          const status = getTopicStatus(
            topic,
            progress.doneTopics,
            unlocked,
          );
          const { label, hint, Icon } = STATUS_META[status];
          const order = String(topic.index + 1).padStart(2, "0");
          return (
            <li
              key={topic.slug}
              className={`topic-card topic-${status}`}
              data-topic={topic.slug}
              data-status={status}
            >
              <span className="topic-order" aria-hidden="true">
                {order}
              </span>
              <span className="topic-body">
                <span className="topic-title">{topic.title}</span>
                <span className="topic-status">
                  <Icon size={15} strokeWidth={2} aria-hidden="true" />
                  {label} · {hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
