/**
 * Seeded no-repeat draw engine.
 *
 * Implements the "No-repeat algorithm" from `Docs/04-QUESTION-BANK-SPEC.md`
 * and the quiz sizes from `Docs/05-TEST-ENGINE-SPEC.md`:
 *
 * - Client holds `askedIds` per (topic, difficulty) in localStorage
 *   (persistence itself lives in `progress.ts`, P03).
 * - Draw = seeded shuffle (mulberry32, seed = userId + day) over unseen
 *   ids; when unseen empties, the full pool reshuffles (one full cycle
 *   completed, repeats allowed again).
 * - Topic quiz: 8Q = 3 easy / 3 medium / 2 hard.
 * - Level gate: 30Q = 10 easy / 12 medium / 8 hard, round-robin across the
 *   level's topics, unseen-first. Retakes never repeat the identical 30
 *   while unseen questions remain.
 *
 * All functions are pure and deterministic: the same
 * `(pool, askedIds, count, seed)` always yields the same draw. Randomness
 * only comes from the seed, so draws are reproducible per user + day.
 */

import { DIFFICULTIES, type Difficulty, type Question } from "./bank";

/** Topic quiz composition: 8 questions (3E / 3M / 2H). */
export const TOPIC_QUIZ_QUOTA: Record<Difficulty, number> = {
  easy: 3,
  medium: 3,
  hard: 2,
};

/** Level gate composition: 30 questions (10E / 12M / 8H). */
export const GATE_QUOTA: Record<Difficulty, number> = {
  easy: 10,
  medium: 12,
  hard: 8,
};

/** Total questions per topic quiz. */
export const TOPIC_QUIZ_SIZE = 8;

/** Total questions per level gate. */
export const GATE_SIZE = 30;

/**
 * mulberry32 — small fast seeded PRNG. Returns a function yielding floats
 * in `[0, 1)`. Same seed always yields the same sequence.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a 32-bit hash: turns an arbitrary string seed
 * (`userId + day`, e.g. `"u123-2026-09-08"`) into a uint32 for mulberry32.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Normalize a `number | string` seed to a uint32. */
export function normalizeSeed(seed: number | string): number {
  return typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
}

/**
 * Fisher-Yates shuffle driven by mulberry32. Pure: never mutates `items`,
 * returns a new array. Same `(items, seed)` always yields the same order.
 */
export function seededShuffle<T>(items: readonly T[], seed: number | string): T[] {
  const out = [...items];
  const rand = mulberry32(normalizeSeed(seed));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const upper = out[i] as T;
    const lower = out[j] as T;
    out[i] = lower;
    out[j] = upper;
  }
  return out;
}

/** Result of any draw call. */
export interface DrawResult {
  /** Questions drawn, in presentation order. */
  drawn: Question[];
  /**
   * Updated asked list: previous ids plus every newly drawn id, in
   * insertion order. The caller persists this (see `progress.ts`, P03).
   */
  askedIds: string[];
  /**
   * True when the draw wrapped around: unseen was exhausted so previously
   * asked questions were reshuffled in (a full cycle completed).
   */
  cycleCompleted: boolean;
}

type AskedInput = readonly string[] | ReadonlySet<string>;

function toAskedSet(askedIds: AskedInput): Set<string> {
  return askedIds instanceof Set ? new Set(askedIds) : new Set(askedIds);
}

/** True when the pool still holds ids absent from `askedIds`. */
export function hasUnseen(
  pool: readonly Question[],
  askedIds: AskedInput,
): boolean {
  const asked = toAskedSet(askedIds);
  return pool.some((q) => !asked.has(q.id));
}

/** True when both lists hold exactly the same id set (order-insensitive). */
export function sameIdSet(
  a: readonly Question[] | readonly string[],
  b: readonly Question[] | readonly string[],
): boolean {
  const keyOf = (entry: Question | string): string =>
    typeof entry === "string" ? entry : entry.id;
  if (a.length !== b.length) {
    return false;
  }
  const left = new Set<string>();
  for (const entry of a) {
    left.add(keyOf(entry));
  }
  for (const entry of b) {
    if (!left.has(keyOf(entry))) {
      return false;
    }
  }
  return left.size === b.length;
}

/**
 * Draw `count` questions unseen-first: every unseen question is taken
 * before any previously asked one repeats. When unseen runs out mid-draw,
 * the full pool reshuffles (`cycleCompleted: true`). When `count` exceeds
 * the pool size, further passes allow in-draw repeats so the caller always
 * gets exactly `count` questions (or the whole pool when it is empty —
 * then `drawn` is empty).
 */
export function drawUnseen(
  pool: readonly Question[],
  askedIds: AskedInput,
  count: number,
  seed: number | string,
): DrawResult {
  const asked = toAskedSet(askedIds);
  if (pool.length === 0 || count <= 0) {
    return { drawn: [], askedIds: [...asked], cycleCompleted: false };
  }
  const base = normalizeSeed(seed);
  const drawn: Question[] = [];
  const drawnIds = new Set<string>();
  let cycleCompleted = false;
  let round = 0;
  // Bounded: each pass draws at least one question, so `count` passes
  // always suffice; the `+ 1` covers the empty-source reset pass.
  while (drawn.length < count && round <= count + 1) {
    const fresh = pool.filter((q) => !asked.has(q.id) && !drawnIds.has(q.id));
    let source = fresh;
    if (source.length === 0) {
      // Unseen exhausted (or the pool is smaller than `count`): reshuffle
      // previously asked questions. A full cycle completed.
      cycleCompleted = true;
      source = pool.filter((q) => !drawnIds.has(q.id));
      if (source.length === 0) {
        // `count` exceeds the pool size: start a new pass, repeats allowed.
        drawnIds.clear();
        source = [...pool];
      }
    }
    const shuffled = seededShuffle(source, (base + round * 0x9e3779b9) >>> 0);
    for (const q of shuffled) {
      if (drawn.length >= count) {
        break;
      }
      drawn.push(q);
      drawnIds.add(q.id);
    }
    round += 1;
  }
  for (const q of drawn) {
    asked.add(q.id);
  }
  return { drawn, askedIds: [...asked], cycleCompleted };
}

function groupByDifficulty(
  pool: readonly Question[],
): Record<Difficulty, Question[]> {
  const groups: Record<Difficulty, Question[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const q of pool) {
    groups[q.difficulty].push(q);
  }
  return groups;
}

/**
 * Draw one topic quiz: 3 easy / 3 medium / 2 hard, unseen-first per
 * difficulty, final order seeded-shuffled so difficulties interleave.
 */
export function drawTopicQuiz(
  pool: readonly Question[],
  askedIds: AskedInput,
  seed: number | string,
): DrawResult {
  const asked = toAskedSet(askedIds);
  const seedText = String(seed);
  const groups = groupByDifficulty(pool);
  const drawn: Question[] = [];
  let cycleCompleted = false;
  for (const difficulty of DIFFICULTIES) {
    const part = drawUnseen(
      groups[difficulty],
      asked,
      TOPIC_QUIZ_QUOTA[difficulty],
      `${seedText}:topic:${difficulty}`,
    );
    for (const q of part.drawn) {
      drawn.push(q);
      asked.add(q.id);
    }
    cycleCompleted = cycleCompleted || part.cycleCompleted;
  }
  return {
    drawn: seededShuffle(drawn, `${seedText}:topic:order`),
    askedIds: [...asked],
    cycleCompleted,
  };
}

function sortedTopics(pool: readonly Question[]): string[] {
  const topics = new Set<string>();
  for (const q of pool) {
    topics.add(q.topic);
  }
  return [...topics].sort();
}

/**
 * Draw `quota` questions of one difficulty round-robin across topics:
 * each pass takes the next unseen question of every topic in turn, so no
 * topic dominates the gate. When unseen runs out, previously asked
 * questions reshuffle in (`cycleCompleted: true`). When the quota exceeds
 * the difficulty pool, in-draw repeats fill the remainder so the quota is
 * always met (bank files guarantee 8+ hard per topic, so this only bites
 * in tiny synthetic pools).
 */
function drawStratifiedDifficulty(
  pool: readonly Question[],
  asked: Set<string>,
  difficulty: Difficulty,
  quota: number,
  seed: string,
): { drawn: Question[]; cycleCompleted: boolean } {
  const inDifficulty = pool.filter((q) => q.difficulty === difficulty);
  const drawn: Question[] = [];
  const drawnIds = new Set<string>();
  if (inDifficulty.length === 0 || quota <= 0) {
    return { drawn, cycleCompleted: false };
  }
  const topics = sortedTopics(inDifficulty);
  const perTopic = new Map<string, Question[]>();
  for (const topic of topics) {
    perTopic.set(
      topic,
      seededShuffle(
        inDifficulty.filter((q) => q.topic === topic),
        `${seed}:${difficulty}:${topic}`,
      ),
    );
  }
  const takeNext = (unseenOnly: boolean): boolean => {
    let progressed = false;
    for (const topic of topics) {
      if (drawn.length >= quota) {
        break;
      }
      const bucket = perTopic.get(topic);
      if (bucket === undefined) {
        continue;
      }
      const next = bucket.find(
        (q) =>
          !drawnIds.has(q.id) && (!unseenOnly || !asked.has(q.id)),
      );
      if (next !== undefined) {
        drawn.push(next);
        drawnIds.add(next.id);
        progressed = true;
      }
    }
    return progressed;
  };
  // Phase 1: unseen-first round-robin.
  while (drawn.length < quota && takeNext(true)) {
    // Each pass adds ≥1 question; exits when no topic has unseen left.
  }
  // Phase 2: wrap to previously asked questions, same round-robin order.
  let cycleCompleted = false;
  let guard = 0;
  while (drawn.length < quota && guard <= quota + 1) {
    guard += 1;
    cycleCompleted = true;
    if (takeNext(false)) {
      continue;
    }
    // Quota exceeds the difficulty pool: reshuffled repeats fill the rest.
    const rest = seededShuffle(
      inDifficulty,
      `${seed}:${difficulty}:repeat:${guard}`,
    );
    let added = 0;
    for (const q of rest) {
      if (drawn.length >= quota) {
        break;
      }
      drawn.push(q);
      drawnIds.add(q.id);
      added += 1;
    }
    if (added === 0) {
      break;
    }
  }
  return { drawn, cycleCompleted };
}

function drawGateInner(
  pool: readonly Question[],
  asked: Set<string>,
  seed: string,
): { drawn: Question[]; cycleCompleted: boolean } {
  const all: Question[] = [];
  let cycleCompleted = false;
  for (const difficulty of DIFFICULTIES) {
    const part = drawStratifiedDifficulty(
      pool,
      asked,
      difficulty,
      GATE_QUOTA[difficulty],
      `${seed}:gate`,
    );
    for (const q of part.drawn) {
      all.push(q);
      asked.add(q.id);
    }
    cycleCompleted = cycleCompleted || part.cycleCompleted;
  }
  return {
    drawn: seededShuffle(all, `${seed}:gate:order`),
    cycleCompleted,
  };
}

/**
 * Draw a level gate: 30Q = 10 easy / 12 medium / 8 hard, round-robin
 * across the level's topics, unseen-first, final order seeded-shuffled
 * (a mixed general test, not grouped by difficulty).
 *
 * Retake rule: when `previousDrawIds` (the last gate's 30 ids) is given
 * and unseen questions remain, the draw is retried with bumped seeds
 * until the set differs — never the identical 30 twice in a row while
 * the bank still has fresh questions. When unseen exactly cover the
 * quotas the set is forced and returned as-is after bounded retries.
 */
export function drawGate(
  pool: readonly Question[],
  askedIds: AskedInput,
  seed: number | string,
  previousDrawIds?: readonly string[],
): DrawResult {
  const seedText = String(seed);
  const originalAsked = toAskedSet(askedIds);
  let workingAsked = new Set(originalAsked);
  let result = drawGateInner(pool, workingAsked, seedText);
  if (previousDrawIds !== undefined && previousDrawIds.length > 0) {
    let attempt = 0;
    while (
      attempt < 8 &&
      sameIdSet(result.drawn, previousDrawIds) &&
      hasUnseen(pool, originalAsked)
    ) {
      attempt += 1;
      workingAsked = new Set(originalAsked);
      result = drawGateInner(pool, workingAsked, `${seedText}:retake${attempt}`);
    }
  }
  return {
    drawn: result.drawn,
    askedIds: [...workingAsked],
    cycleCompleted: result.cycleCompleted,
  };
}
