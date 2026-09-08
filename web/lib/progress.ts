/**
 * Versioned localStorage progress store (`gs-progress-v1`).
 *
 * Holds done topics, asked ids (per `topic:difficulty`, feeding the
 * no-repeat draw in `draw.ts`), the review deck, XP and gate records.
 * No backend, no auth in v1 (see `Docs/07-ARCHITECTURE.md`).
 *
 * Safety rules:
 * - SSR-safe: without a `window.localStorage` (static-export prerender,
 *   tests) every function degrades to in-memory behaviour — `load`
 *   returns the default, `save` is a no-op. Nothing throws.
 * - Migrate guard: corrupt JSON, a non-object payload, or any version
 *   stamp other than `PROGRESS_VERSION` loads as a FRESH default (old
 *   shapes are dropped, never crash the app).
 * - Updates are immutable (each helper returns a new state object), so
 *   React callers can set state directly with the return value.
 */

import { isLevel } from "./bank";
import type { Difficulty, Level } from "./bank";

/** localStorage key for the whole progress blob. */
export const PROGRESS_KEY = "gs-progress-v1";

/** Current schema version. Bump when the shape changes (old blobs reset). */
export const PROGRESS_VERSION = 1;

/** One missed question waiting to be re-answered. */
export interface ReviewItem {
  questionId: string;
  topic: string;
  level: Level;
  ruleRef: string;
  /** ISO timestamp of when the miss was recorded. */
  addedAt: string;
}

/** Best-so-far record for one level gate. */
export interface GateRecord {
  passed: boolean;
  bestPct: number;
  attempts: number;
}

export interface ProgressState {
  version: number;
  xp: number;
  doneTopics: string[];
  /** Asked question ids keyed by `askedKey(topic, difficulty)`. */
  askedIds: Record<string, string[]>;
  reviewDeck: ReviewItem[];
  gates: Partial<Record<Level, GateRecord>>;
}

/** Minimal storage surface — `window.localStorage` satisfies it. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Fresh, empty progress. */
export function defaultProgress(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    xp: 0,
    doneTopics: [],
    askedIds: {},
    reviewDeck: [],
    gates: {},
  };
}

/** In-memory `StorageLike` for tests and previews (no browser needed). */
export function createMemoryStorage(initial?: Record<string, string>): StorageLike {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

/** SSR-safe accessor: `null` outside the browser (prerender/tests). */
function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Storage key for asked ids of one (topic, difficulty) pool — the
 * per-pool seen-set the no-repeat draw (`draw.ts`) consumes.
 */
export function askedKey(topic: string, difficulty: Difficulty): string {
  return `${topic}:${difficulty}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isReviewItem(value: unknown): value is ReviewItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["questionId"] === "string" &&
    typeof record["topic"] === "string" &&
    isLevel(record["level"]) &&
    typeof record["ruleRef"] === "string" &&
    typeof record["addedAt"] === "string"
  );
}

function isGateRecord(value: unknown): value is GateRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record["passed"] === "boolean" &&
    typeof record["bestPct"] === "number" &&
    Number.isFinite(record["bestPct"]) &&
    typeof record["attempts"] === "number" &&
    Number.isFinite(record["attempts"])
  );
}

/**
 * Load progress, falling back to a fresh default on: missing storage,
 * missing key, corrupt JSON, non-object payload, or a version stamp
 * mismatch (migrate guard). Same-version blobs with a damaged field
 * keep every valid field and reset only the damaged one.
 */
export function loadProgress(storage?: StorageLike | null): ProgressState {
  const store = storage ?? defaultStorage();
  if (store === null) {
    return defaultProgress();
  }
  let raw: unknown;
  try {
    const text = store.getItem(PROGRESS_KEY);
    if (text === null || text.length === 0) {
      return defaultProgress();
    }
    raw = JSON.parse(text) as unknown;
  } catch {
    return defaultProgress();
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return defaultProgress();
  }
  const record = raw as Record<string, unknown>;
  if (record["version"] !== PROGRESS_VERSION) {
    return defaultProgress();
  }
  const base = defaultProgress();
  const xp =
    typeof record["xp"] === "number" &&
    Number.isFinite(record["xp"]) &&
    record["xp"] >= 0
      ? Math.floor(record["xp"])
      : base.xp;
  const doneTopics = isStringArray(record["doneTopics"])
    ? [...new Set(record["doneTopics"])]
    : base.doneTopics;
  const askedIds: Record<string, string[]> = {};
  if (
    typeof record["askedIds"] === "object" &&
    record["askedIds"] !== null &&
    !Array.isArray(record["askedIds"])
  ) {
    for (const [key, value] of Object.entries(
      record["askedIds"] as Record<string, unknown>,
    )) {
      if (isStringArray(value)) {
        askedIds[key] = [...new Set(value)];
      }
    }
  }
  const reviewDeck: ReviewItem[] = [];
  if (Array.isArray(record["reviewDeck"])) {
    const seen = new Set<string>();
    for (const entry of record["reviewDeck"]) {
      if (isReviewItem(entry) && !seen.has(entry.questionId)) {
        seen.add(entry.questionId);
        reviewDeck.push(entry);
      }
    }
  }
  const gates: Partial<Record<Level, GateRecord>> = {};
  if (
    typeof record["gates"] === "object" &&
    record["gates"] !== null &&
    !Array.isArray(record["gates"])
  ) {
    for (const [level, value] of Object.entries(
      record["gates"] as Record<string, unknown>,
    )) {
      if (isLevel(level) && isGateRecord(value)) {
        gates[level] = { ...value };
      }
    }
  }
  return { version: PROGRESS_VERSION, xp, doneTopics, askedIds, reviewDeck, gates };
}

/**
 * Persist progress. Never throws (private-mode / quota failures leave
 * progress in memory for the session instead of crashing the quiz).
 */
export function saveProgress(state: ProgressState, storage?: StorageLike | null): void {
  const store = storage ?? defaultStorage();
  if (store === null) {
    return;
  }
  try {
    store.setItem(PROGRESS_KEY, JSON.stringify({ ...state, version: PROGRESS_VERSION }));
  } catch {
    // Storage unavailable — caller keeps the in-memory state.
  }
}

/** Merge newly asked ids into one pool's seen-set (deduped). */
export function recordAskedIds(
  state: ProgressState,
  key: string,
  ids: readonly string[],
): ProgressState {
  const merged = [...(state.askedIds[key] ?? [])];
  for (const id of ids) {
    if (!merged.includes(id)) {
      merged.push(id);
    }
  }
  return { ...state, askedIds: { ...state.askedIds, [key]: merged } };
}

/** Mark a topic done (idempotent — re-marking returns the same state). */
export function markTopicDone(state: ProgressState, topic: string): ProgressState {
  if (state.doneTopics.includes(topic)) {
    return state;
  }
  return { ...state, doneTopics: [...state.doneTopics, topic] };
}

/** Add XP (non-positive amounts are ignored). */
export function addXp(state: ProgressState, amount: number): ProgressState {
  if (!Number.isFinite(amount) || amount <= 0) {
    return state;
  }
  return { ...state, xp: state.xp + Math.floor(amount) };
}

/** Push a miss into the review deck (one entry per question id). */
export function addToReview(state: ProgressState, item: ReviewItem): ProgressState {
  if (state.reviewDeck.some((entry) => entry.questionId === item.questionId)) {
    return state;
  }
  return { ...state, reviewDeck: [...state.reviewDeck, { ...item }] };
}

/** Drop re-answered questions from the review deck. */
export function clearReview(
  state: ProgressState,
  questionIds: readonly string[],
): ProgressState {
  const ids = new Set(questionIds);
  if (state.reviewDeck.every((entry) => !ids.has(entry.questionId))) {
    return state;
  }
  return {
    ...state,
    reviewDeck: state.reviewDeck.filter((entry) => !ids.has(entry.questionId)),
  };
}

/** Count still-open review items, optionally scoped to one topic. */
export function openReviewCount(state: ProgressState, topic?: string): number {
  if (topic === undefined) {
    return state.reviewDeck.length;
  }
  return state.reviewDeck.filter((entry) => entry.topic === topic).length;
}

/**
 * Record one gate attempt: attempts +1, best percent kept, `passed`
 * sticky once earned (a later fail never un-unlocks a level).
 */
export function recordGateAttempt(
  state: ProgressState,
  level: Level,
  pct: number,
  passed: boolean,
): ProgressState {
  const previous = state.gates[level];
  return {
    ...state,
    gates: {
      ...state.gates,
      [level]: {
        passed: (previous?.passed ?? false) || passed,
        bestPct: Math.max(previous?.bestPct ?? 0, pct),
        attempts: (previous?.attempts ?? 0) + 1,
      },
    },
  };
}

/** Wipe stored progress and return a fresh default. */
export function resetProgress(storage?: StorageLike | null): ProgressState {
  const store = storage ?? defaultStorage();
  if (store !== null) {
    try {
      store.removeItem(PROGRESS_KEY);
    } catch {
      // Ignore — the in-memory default below is authoritative anyway.
    }
  }
  return defaultProgress();
}
