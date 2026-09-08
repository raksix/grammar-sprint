/**
 * Question bank types, loader and per-topic stats.
 *
 * Single source of truth for the shape defined in
 * `Docs/04-QUESTION-BANK-SPEC.md`. Draw logic lives in `draw.ts`,
 * answer checking in `scoring.ts` / `normalize.ts` — this module only
 * describes questions, validates raw JSON, and aggregates stats.
 */

export const LEVELS = ["A1", "A2", "B1", "B2"] as const;
export type Level = (typeof LEVELS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPES = ["mcq", "gap-fill", "rewrite"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Shared fields every question carries. */
export interface QuestionBase {
  /** Unique id, `<topic>-<e|m|h><nn>` (e.g. `a1-02-e01`). */
  id: string;
  /** Topic slug (e.g. `a1-02-present-simple`). */
  topic: string;
  level: Level;
  difficulty: Difficulty;
  type: QuestionType;
  /** Stem shown to the learner. For gap-fill contains `___`. */
  prompt: string;
  /** Turkish explanation, max 2 sentences: names the rule + correction. */
  explain_tr: string;
  /** Optional classic TR-learner trap note. */
  trap_tr?: string;
  /** Pointer to the lesson file, e.g. `Docs/grammar/A1/a1-02-present-simple.md`. */
  rule_ref: string;
}

/** `mcq` (choose the correct sentence) or `gap-fill` (4 choices). */
export interface ChoiceQuestion extends QuestionBase {
  type: "mcq" | "gap-fill";
  /** 3–4 options; index of the single correct one is `answer`. */
  choices: string[];
  answer: number;
}

/** `rewrite` (transform: negative/question/passive/reported). */
export interface RewriteQuestion extends QuestionBase {
  type: "rewrite";
  /** Canonical correct sentence. */
  answer_text: string;
  /** Accepted variants (compared after the normalize pipeline). */
  accept: string[];
}

export type Question = ChoiceQuestion | RewriteQuestion;

export function isLevel(value: unknown): value is Level {
  return (
    typeof value === "string" &&
    (LEVELS as readonly string[]).includes(value)
  );
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === "string" &&
    (DIFFICULTIES as readonly string[]).includes(value)
  );
}

export function isQuestionType(value: unknown): value is QuestionType {
  return (
    typeof value === "string" &&
    (QUESTION_TYPES as readonly string[]).includes(value)
  );
}

export function isChoiceQuestion(q: Question): q is ChoiceQuestion {
  return q.type === "mcq" || q.type === "gap-fill";
}

export function isRewriteQuestion(q: Question): q is RewriteQuestion {
  return q.type === "rewrite";
}

/** Thrown by {@link parseBank} on the first schema violation found. */
export class BankValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(
  value: unknown,
  field: string,
  id: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BankValidationError(
      `question ${id}: field "${field}" must be a non-empty string`,
    );
  }
}

/**
 * Validate one raw object against the bank schema and return a typed
 * `Question`. Throws `BankValidationError` on any violation:
 * missing/empty required fields, bad enums, choice questions without
 * 3–4 choices or an in-range `answer`, rewrite questions without
 * `answer_text`/`accept`.
 */
export function parseQuestion(raw: unknown): Question {
  if (!isRecord(raw)) {
    throw new BankValidationError("question must be a JSON object");
  }
  const idLabel =
    typeof raw["id"] === "string" && raw["id"].length > 0
      ? raw["id"]
      : "<unknown-id>";

  assertNonEmptyString(raw["id"], "id", idLabel);
  assertNonEmptyString(raw["topic"], "topic", raw["id"]);
  assertNonEmptyString(raw["prompt"], "prompt", raw["id"]);
  assertNonEmptyString(raw["explain_tr"], "explain_tr", raw["id"]);
  assertNonEmptyString(raw["rule_ref"], "rule_ref", raw["id"]);

  if (!isLevel(raw["level"])) {
    throw new BankValidationError(
      `question ${raw["id"]}: field "level" must be one of A1/A2/B1/B2`,
    );
  }
  if (!isDifficulty(raw["difficulty"])) {
    throw new BankValidationError(
      `question ${raw["id"]}: field "difficulty" must be one of easy/medium/hard`,
    );
  }
  if (!isQuestionType(raw["type"])) {
    throw new BankValidationError(
      `question ${raw["id"]}: field "type" must be one of mcq/gap-fill/rewrite`,
    );
  }

  const trap_tr =
    raw["trap_tr"] === undefined ? undefined : raw["trap_tr"];
  if (trap_tr !== undefined && typeof trap_tr !== "string") {
    throw new BankValidationError(
      `question ${raw["id"]}: field "trap_tr" must be a string when present`,
    );
  }

  const base = {
    id: raw["id"],
    topic: raw["topic"],
    level: raw["level"],
    difficulty: raw["difficulty"],
    prompt: raw["prompt"],
    explain_tr: raw["explain_tr"],
    ...(trap_tr === undefined ? {} : { trap_tr }),
    rule_ref: raw["rule_ref"],
  };

  if (raw["type"] === "rewrite") {
    assertNonEmptyString(raw["answer_text"], "answer_text", raw["id"]);
    if (!Array.isArray(raw["accept"]) || raw["accept"].length === 0) {
      throw new BankValidationError(
        `question ${raw["id"]}: rewrite needs a non-empty "accept" array`,
      );
    }
    for (const variant of raw["accept"]) {
      if (typeof variant !== "string" || variant.trim().length === 0) {
        throw new BankValidationError(
          `question ${raw["id"]}: every "accept" variant must be a non-empty string`,
        );
      }
    }
    const rewrite: RewriteQuestion = {
      ...base,
      type: "rewrite",
      answer_text: raw["answer_text"],
      accept: raw["accept"] as string[],
    };
    return rewrite;
  }

  // mcq / gap-fill
  if (!Array.isArray(raw["choices"]) || raw["choices"].length < 3) {
    throw new BankValidationError(
      `question ${raw["id"]}: ${raw["type"]} needs at least 3 "choices"`,
    );
  }
  for (const choice of raw["choices"]) {
    if (typeof choice !== "string" || choice.trim().length === 0) {
      throw new BankValidationError(
        `question ${raw["id"]}: every choice must be a non-empty string`,
      );
    }
  }
  const choices = raw["choices"] as string[];
  if (
    typeof raw["answer"] !== "number" ||
    !Number.isInteger(raw["answer"]) ||
    raw["answer"] < 0 ||
    raw["answer"] >= choices.length
  ) {
    throw new BankValidationError(
      `question ${raw["id"]}: field "answer" must be an integer index into "choices"`,
    );
  }
  const choice: ChoiceQuestion = {
    ...base,
    type: raw["type"] as "mcq" | "gap-fill",
    choices,
    answer: raw["answer"],
  };
  return choice;
}

/**
 * Validate a raw JSON array (one `<topic>.json` file) into typed
 * questions. Also rejects duplicate ids inside the file.
 */
export function parseBank(raw: unknown): Question[] {
  if (!Array.isArray(raw)) {
    throw new BankValidationError("bank file must be a JSON array");
  }
  const questions = raw.map((entry) => parseQuestion(entry));
  const seen = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) {
      throw new BankValidationError(`duplicate question id "${q.id}"`);
    }
    seen.add(q.id);
  }
  return questions;
}

/** Counts for a single topic file. */
export interface TopicStats {
  topic: string;
  level: Level;
  total: number;
  byDifficulty: Record<Difficulty, number>;
  byType: Record<QuestionType, number>;
}

/** Aggregated counts over a whole bank (level or full). */
export interface BankStats {
  total: number;
  byLevel: Record<Level, number>;
  byDifficulty: Record<Difficulty, number>;
  byType: Record<QuestionType, number>;
  topics: TopicStats[];
}

function emptyDifficultyCounts(): Record<Difficulty, number> {
  return { easy: 0, medium: 0, hard: 0 };
}

function emptyTypeCounts(): Record<QuestionType, number> {
  return { mcq: 0, "gap-fill": 0, rewrite: 0 };
}

/**
 * Per-topic stats over an already-parsed question list. All questions
 * are expected to share one topic; mixed input still aggregates (the
 * `topic` label falls back to `"mixed"`).
 */
export function getTopicStats(questions: readonly Question[]): TopicStats {
  const first = questions[0];
  const topic = first !== undefined ? first.topic : "mixed";
  const level: Level = first !== undefined ? first.level : "A1";
  const byDifficulty = emptyDifficultyCounts();
  const byType = emptyTypeCounts();
  for (const q of questions) {
    byDifficulty[q.difficulty] += 1;
    byType[q.type] += 1;
  }
  return { topic, level, total: questions.length, byDifficulty, byType };
}

/** Aggregate stats over any question list (level slice or full bank). */
export function getBankStats(questions: readonly Question[]): BankStats {
  const byLevel: Record<Level, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
  const byDifficulty = emptyDifficultyCounts();
  const byType = emptyTypeCounts();
  const perTopic = new Map<string, Question[]>();
  for (const q of questions) {
    byLevel[q.level] += 1;
    byDifficulty[q.difficulty] += 1;
    byType[q.type] += 1;
    const bucket = perTopic.get(q.topic);
    if (bucket !== undefined) {
      bucket.push(q);
    } else {
      perTopic.set(q.topic, [q]);
    }
  }
  const topics: TopicStats[] = [...perTopic.values()].map((bucket) =>
    getTopicStats(bucket),
  );
  topics.sort((a, b) => a.topic.localeCompare(b.topic));
  return { total: questions.length, byLevel, byDifficulty, byType, topics };
}

/** Storage path convention: `web/data/bank/<level>/<topic>.json`. */
export function bankFilePath(level: Level, topic: string): string {
  return `web/data/bank/${level.toLowerCase()}/${topic}.json`;
}

/**
 * Browser loader: fetch one topic file as served from `public/`-style
 * static hosting (`/data/bank/<level>/<topic>.json`) and validate it.
 * Bank JSON files land in P04–P19; until then this rejects with a
 * `BankValidationError` on 404 so callers can show "not yet available".
 */
export async function loadTopicBank(
  level: Level,
  topic: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Question[]> {
  const url = `/data/bank/${level.toLowerCase()}/${topic}.json`;
  let response: Response;
  try {
    response = await fetchImpl(url);
  } catch {
    throw new BankValidationError(`cannot load bank file ${url}`);
  }
  if (!response.ok) {
    throw new BankValidationError(
      `bank file ${url} responded ${response.status}`,
    );
  }
  const raw: unknown = await response.json();
  return parseBank(raw);
}
