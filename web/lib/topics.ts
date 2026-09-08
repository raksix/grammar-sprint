/**
 * Topic catalogue + lock-state helpers for the level pages (P21).
 *
 * Single source of truth for the 48-topic grid rendered by
 * `components/LevelMap.tsx` on `/levels/[level]`. Titles mirror the H1 of
 * each lesson file in `Docs/grammar/<LEVEL>/` (prefix codes stripped).
 *
 * Lock rules (from `Docs/03-CURRICULUM-MAP.md` + `05-TEST-ENGINE-SPEC.md`):
 * - A1 is always unlocked. A2/B1/B2 unlock when the PREVIOUS level's gate
 *   record exists with `passed: true` (sticky — a later fail never
 *   re-locks; see `recordGateAttempt` in `progress.ts`).
 * - Inside an unlocked level the chain is linear: topic 0 is available,
 *   topic N is available only when topic N-1 is in `doneTopics`.
 * - A topic in `doneTopics` is `done` regardless of locks.
 */

import { LEVELS, isLevel } from "./bank";
import type { Level } from "./bank";
import type { GateRecord } from "./progress";

/** Display metadata for one CEFR level. */
export interface LevelMeta {
  code: Level;
  name: string;
  blurb: string;
}

/** One row of the 48-topic grid. */
export interface TopicMeta {
  /** Full slug, e.g. `a1-02-present-simple` (matches bank + lesson file). */
  slug: string;
  level: Level;
  /** 0-based position inside its level (drives the linear lock chain). */
  index: number;
  /** Human title, e.g. `Present Simple`. */
  title: string;
}

/** Lock state of one topic card. */
export type TopicStatus = "done" | "available" | "locked";

export const LEVEL_ORDER: readonly Level[] = LEVELS;

export const LEVELS_META: Record<Level, LevelMeta> = {
  A1: {
    code: "A1",
    name: "Breakthrough",
    blurb: "Be, present tenses, articles, plurals, everyday prepositions.",
  },
  A2: {
    code: "A2",
    name: "Waystage",
    blurb: "Past tenses, going to / will, comparatives, conditionals zero + one.",
  },
  B1: {
    code: "B1",
    name: "Threshold",
    blurb: "Perfect tenses, passive, reported speech, second + third conditional.",
  },
  B2: {
    code: "B2",
    name: "Vantage",
    blurb: "Mixed conditionals, inversion, clefts, narrative tenses.",
  },
};

const TITLES: Record<Level, string[]> = {
  A1: [
    "Verb To Be (am / is / are)",
    "Present Simple",
    "Present Continuous",
    "Past Simple of Be (was / were)",
    "Articles (a / an / the / zero)",
    "Nouns and Plurals",
    "Pronouns (subject / object)",
    "Possessives ('s, pronouns, have got)",
    "Prepositions (in / on / at + movement)",
    "Modals: can / can't / could",
    "Imperatives and let's / like + -ing",
    "There is / are, much / many, connectors",
  ],
  A2: [
    "Past Simple: Regular Verbs",
    "Past Simple: Irregular Verbs",
    "Past Continuous",
    "Going To vs Will",
    "Comparatives and Superlatives",
    "Countable and Uncountable Nouns",
    "Modals at A2: could, should, may, might, must, have to",
    "Zero and First Conditional",
    "Gerund Basics: verb + -ing vs Infinitive",
    "Adverbs of Frequency and Manner",
    "Relative Clauses (Basic): who / which / that",
    "Reported Speech (Basic): say / tell Statements",
  ],
  B1: [
    "Present Perfect",
    "Present Perfect Continuous",
    "Past Perfect",
    "Second Conditional",
    "Third Conditional",
    "Passive Basic",
    "Reported Speech",
    "Modal Deduction",
    "Used To and Would",
    "Relative Clauses Defining",
    "Gerund vs Infinitive",
    "Question Tags and Linkers",
  ],
  B2: [
    "Mixed Conditionals",
    "Wish / If Only",
    "Advanced Passive",
    "Reported Speech Range",
    "Participle Clauses",
    "Causative",
    "Inversion",
    "Cleft Sentences and Emphasis",
    "Subjunctive Basics",
    "Reduced Relative Clauses",
    "Advanced Conjunctions and Linkers",
    "Narrative Tenses",
  ],
};

const SLUGS: Record<Level, string[]> = {
  A1: [
    "a1-01-verb-to-be",
    "a1-02-present-simple",
    "a1-03-present-continuous",
    "a1-04-past-simple-be",
    "a1-05-articles",
    "a1-06-nouns-plurals",
    "a1-07-pronouns",
    "a1-08-possessives",
    "a1-09-prepositions",
    "a1-10-modals-can",
    "a1-11-imperatives",
    "a1-12-there-is-are-connectors",
  ],
  A2: [
    "a2-01-past-simple-regular",
    "a2-02-past-simple-irregular",
    "a2-03-past-continuous",
    "a2-04-going-to-will",
    "a2-05-comparatives-superlatives",
    "a2-06-countable-uncountable",
    "a2-07-modals-a2",
    "a2-08-zero-first-conditional",
    "a2-09-gerund-basics",
    "a2-10-adverbs-frequency-manner",
    "a2-11-relative-basic",
    "a2-12-reported-basic",
  ],
  B1: [
    "b1-01-present-perfect",
    "b1-02-present-perfect-continuous",
    "b1-03-past-perfect",
    "b1-04-second-conditional",
    "b1-05-third-conditional",
    "b1-06-passive-basic",
    "b1-07-reported-speech",
    "b1-08-modal-deduction",
    "b1-09-used-to-would",
    "b1-10-relative-defining",
    "b1-11-gerund-infinitive",
    "b1-12-question-tags-linkers",
  ],
  B2: [
    "b2-01-mixed-conditionals",
    "b2-02-wish-if-only",
    "b2-03-passive-advanced",
    "b2-04-reported-range",
    "b2-05-participle-clauses",
    "b2-06-causative",
    "b2-07-inversion",
    "b2-08-cleft-emphasis",
    "b2-09-subjunctive-basics",
    "b2-10-reduced-relatives",
    "b2-11-advanced-conjunctions",
    "b2-12-narrative-tenses",
  ],
};

function buildTopics(): TopicMeta[] {
  const out: TopicMeta[] = [];
  for (const level of LEVEL_ORDER) {
    const slugs = SLUGS[level];
    const titles = TITLES[level];
    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i];
      const title = titles[i];
      if (slug === undefined || title === undefined) continue;
      out.push({ slug, level, index: i, title });
    }
  }
  return out;
}

/** All 48 topics in curriculum order (A1 → B2). */
export const TOPICS: readonly TopicMeta[] = buildTopics();

/** Topics grouped per level (12 each, index order). */
export const TOPICS_BY_LEVEL: Record<Level, readonly TopicMeta[]> = {
  A1: TOPICS.filter((t) => t.level === "A1"),
  A2: TOPICS.filter((t) => t.level === "A2"),
  B1: TOPICS.filter((t) => t.level === "B1"),
  B2: TOPICS.filter((t) => t.level === "B2"),
};

const BY_SLUG: Record<string, TopicMeta> = Object.fromEntries(
  TOPICS.map((t) => [t.slug, t]),
);

/** Look up one topic by slug (`undefined` for unknown slugs). */
export function getTopic(slug: string): TopicMeta | undefined {
  return BY_SLUG[slug];
}

/** Parse a `[level]` route param (case-insensitive, `undefined` if unknown). */
export function parseLevelParam(value: string): Level | undefined {
  const upper = value.toUpperCase();
  return isLevel(upper) ? (upper as Level) : undefined;
}

/**
 * Is a level unlocked? A1 always is; any other level needs the previous
 * level's gate record with `passed: true`.
 */
export function isLevelUnlocked(
  level: Level,
  gates: Partial<Record<Level, GateRecord>>,
): boolean {
  if (level === "A1") return true;
  const prev = LEVEL_ORDER[LEVEL_ORDER.indexOf(level) - 1];
  if (prev === undefined) return false;
  return gates[prev]?.passed === true;
}

/**
 * Status of one topic: `done` wins over everything, then the level lock,
 * then the linear chain (topic 0 is free, others need the predecessor
 * in `doneTopics`).
 */
export function getTopicStatus(
  topic: TopicMeta,
  doneTopics: readonly string[],
  levelUnlocked: boolean,
): TopicStatus {
  if (doneTopics.includes(topic.slug)) return "done";
  if (!levelUnlocked) return "locked";
  if (topic.index === 0) return "available";
  const siblings = TOPICS_BY_LEVEL[topic.level];
  const prev = siblings[topic.index - 1];
  if (prev === undefined) return "available";
  return doneTopics.includes(prev.slug) ? "available" : "locked";
}

/** `done/total` counts for one level's progress pill. */
export function getLevelProgress(
  level: Level,
  doneTopics: readonly string[],
): { done: number; total: number } {
  const topics = TOPICS_BY_LEVEL[level];
  const done = topics.filter((t) => doneTopics.includes(t.slug)).length;
  return { done, total: topics.length };
}
