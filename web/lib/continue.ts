/**
 * Continue-where-you-left-off helpers for the landing + header (P25).
 *
 * Pure functions over `doneTopics` + gate records — the UI components
 * (`LandingProgress`, `Header`) stay thin and SSR-safe. All hrefs produced
 * here point at routes that exist (P21–P24): `/learn/[topic]`,
 * `/quiz/[topic]`, `/gate/[level]`, `/review`, `/stats`, `/final`,
 * `/levels/[level]`.
 */

import type { Level } from "./bank";
import {
  TOPICS,
  isLevelUnlocked,
  getTopicStatus,
  type TopicMeta,
} from "./topics";
import type { GateRecord } from "./progress";

/** Minimal progress surface the continue logic needs. */
export interface ContinueProgress {
  doneTopics: readonly string[];
  gates: Partial<Record<Level, GateRecord>>;
  reviewOpen: number;
  xp: number;
}

/** Where the sprint continues. */
export type ContinueTarget =
  | {
      kind: "topic";
      topic: TopicMeta;
      learnHref: string;
      quizHref: string;
    }
  | { kind: "gate"; level: Level; gateHref: string }
  | { kind: "final"; finalHref: string };

/**
 * First topic whose status is `available` in curriculum order
 * (`undefined` when everything is done or the next level is gate-locked).
 */
export function firstAvailableTopic(
  doneTopics: readonly string[],
  gates: Partial<Record<Level, GateRecord>>,
): TopicMeta | undefined {
  for (const topic of TOPICS) {
    const unlocked = isLevelUnlocked(topic.level, gates);
    if (getTopicStatus(topic, doneTopics, unlocked) === "available") {
      return topic;
    }
  }
  return undefined;
}

/** First level (in order) whose gate is not yet passed. */
export function firstUnpassedGate(
  gates: Partial<Record<Level, GateRecord>>,
): Level | undefined {
  const order: readonly Level[] = ["A1", "A2", "B1", "B2"];
  for (const level of order) {
    if (gates[level]?.passed !== true) return level;
  }
  return undefined;
}

/**
 * Single continue target for the landing band + header CTA:
 * - an available topic wins (learn + quiz links);
 * - otherwise the first unpassed gate (its level page is always viewable);
 * - when every gate is passed the final sprint is the target.
 */
export function getContinueTarget(
  doneTopics: readonly string[],
  gates: Partial<Record<Level, GateRecord>>,
): ContinueTarget {
  const topic = firstAvailableTopic(doneTopics, gates);
  if (topic !== undefined) {
    return {
      kind: "topic",
      topic,
      learnHref: `/learn/${topic.slug}`,
      quizHref: `/quiz/${topic.slug}`,
    };
  }
  const gate = firstUnpassedGate(gates);
  if (gate !== undefined) {
    return { kind: "gate", level: gate, gateHref: `/gate/${gate}` };
  }
  return { kind: "final", finalHref: "/final" };
}

/** Human XP label (`1234` → `"1,234 XP"`). */
export function formatXp(xp: number): string {
  const safe = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  return `${safe.toLocaleString("en-US")} XP`;
}
