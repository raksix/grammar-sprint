#!/usr/bin/env node
/**
 * validate-bank.mjs — canonical gate for the Grammar Sprint question bank.
 *
 * Reads every `web/data/bank/<level>/<topic>.json` file, enforces the schema
 * from `Docs/04-QUESTION-BANK-SPEC.md` plus the per-topic quotas every bank
 * piece (P04–P19) was built against, and regenerates `web/data/bank-stats.json`.
 *
 * Checks:
 *  - file is a JSON array; every entry passes the bank schema
 *    (required fields, level/difficulty/type enums, choices 3–4 with a
 *    single in-range `answer`, rewrite `answer_text` + non-empty `accept`)
 *  - id shape `<topic>-<e|m|h><nn>`; id letter matches `difficulty`;
 *    `topic`/`level` match the file path
 *  - single-answer flags: choices unique (exact + case-folded), rewrite
 *    `accept` variants unique after normalization
 *  - `explain_tr` non-empty, at most 2 sentences, no `...` / `…` ellipsis
 *  - gap-fill prompts contain `___`
 *  - `rule_ref` points at an existing file under the repo root
 *  - per-topic quotas: 25 questions = 8 easy / 9 medium / 8 hard,
 *    types 10 mcq / 10 gap-fill / 5 rewrite
 *  - global quotas: 1200 questions, 300 per level, 48 topics
 *  - zero duplicate ids and zero duplicate normalized stems bank-wide
 *
 * Exit 0 when everything passes (and `bank-stats.json` is written),
 * exit 1 with a failure list otherwise.
 *
 * Usage:
 *   node scripts/validate-bank.mjs [--stats-out <path>] [--no-write]
 * Run from `web/` (paths also resolve when invoked elsewhere in the repo).
 */

import { accessSync, constants, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = resolve(HERE, "..");
const REPO_DIR = resolve(WEB_DIR, "..");
const BANK_DIR = join(WEB_DIR, "data", "bank");
const DEFAULT_STATS_OUT = join(WEB_DIR, "data", "bank-stats.json");

const LEVELS = ["A1", "A2", "B1", "B2"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const TYPES = ["mcq", "gap-fill", "rewrite"];
// Suffixes that make a stem word a morphological giveaway of an answer word
// ("calling" -> "call"). Anything else ("haven't" vs "have") is not a leak.
const MORPH_SUFFIXES = ["ing", "ed", "d", "s", "es"];

const EXPECT_PER_TOPIC = 25;
const EXPECT_DIFFICULTY = { easy: 8, medium: 9, hard: 8 };
const EXPECT_TYPE = { mcq: 10, "gap-fill": 10, rewrite: 5 };
const EXPECT_TOTAL = 1200;
const EXPECT_PER_LEVEL = 300;
const EXPECT_TOPICS = 48;

/** Normalize a stem the way the dup scan defines it: NFKC, lowercase, apostrophe fold, strip trailing sentence punctuation, collapse spaces. */
function normalizeStem(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Naive sentence count (the same rule every P04–P19 run used): split on [.?!], drop empties. */
function sentenceCount(text) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const errors = [];
const fail = (message) => errors.push(message);

function checkQuestion(raw, fileLabel) {
  const idLabel =
    raw !== null && typeof raw === "object" && typeof raw.id === "string" && raw.id.length > 0
      ? raw.id
      : `<unknown-id> in ${fileLabel}`;
  const at = (field) => `${idLabel}: field "${field}"`;

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    fail(`${idLabel} must be a JSON object`);
    return null;
  }
  const q = raw;

  if (!isNonEmptyString(q.id)) fail(`${at("id")} must be a non-empty string`);
  if (!isNonEmptyString(q.topic)) fail(`${at("topic")} must be a non-empty string`);
  if (!isNonEmptyString(q.prompt)) fail(`${at("prompt")} must be a non-empty string`);
  if (!isNonEmptyString(q.prompt_tr)) fail(`${at("prompt_tr")} must be a non-empty string`);
  if (!isNonEmptyString(q.explain_tr)) fail(`${at("explain_tr")} must be a non-empty string`);
  if (!isNonEmptyString(q.rule_ref)) fail(`${at("rule_ref")} must be a non-empty string`);
  if (!LEVELS.includes(q.level)) fail(`${at("level")} must be one of ${LEVELS.join("/")}`);
  if (!DIFFICULTIES.includes(q.difficulty))
    fail(`${at("difficulty")} must be one of ${DIFFICULTIES.join("/")}`);
  if (!TYPES.includes(q.type)) fail(`${at("type")} must be one of ${TYPES.join("/")}`);
  if (q.trap_tr !== undefined && typeof q.trap_tr !== "string")
    fail(`${at("trap_tr")} must be a string when present`);

  // Id shape + id-letter/difficulty consistency + topic/level vs file path.
  if (typeof q.id === "string") {
    const match = q.id.match(/^([a-d][12]-\d{2}-[a-z0-9-]+)-([emh])(\d{2})$/);
    if (!match) {
      fail(`${at("id")} must look like <topic>-<e|m|h><nn> (got "${q.id}")`);
    } else {
      const [, idTopic, letter] = match;
      const want = letter === "e" ? "easy" : letter === "m" ? "medium" : "hard";
      if (q.difficulty !== want)
        fail(`${idLabel}: id letter "${letter}" implies "${want}" but difficulty is "${q.difficulty}"`);
      if (typeof q.topic === "string" && q.topic !== idTopic)
        fail(`${idLabel}: id topic prefix "${idTopic}" does not match topic "${q.topic}"`);
    }
  }

  if (q.type === "rewrite") {
    if (!isNonEmptyString(q.answer_text)) fail(`${at("answer_text")} must be a non-empty string`);
    if (!Array.isArray(q.accept) || q.accept.length === 0) {
      fail(`${idLabel}: rewrite needs a non-empty "accept" array`);
    } else {
      for (const variant of q.accept) {
        if (!isNonEmptyString(variant)) {
          fail(`${idLabel}: every "accept" variant must be a non-empty string`);
          break;
        }
      }
      // Single-answer hygiene: no two accepted variants identical after trim
      // (trailing `./?` duplicates are intentional — the normalize pipeline
      // strips them before compare, so authors list both forms for clarity).
      const trimmed = q.accept
        .filter((variant) => typeof variant === "string")
        .map((variant) => variant.trim());
      if (new Set(trimmed).size !== trimmed.length)
        fail(`${idLabel}: "accept" contains duplicate variants`);
    }
    if (q.choices !== undefined || q.answer !== undefined)
      fail(`${idLabel}: rewrite must not carry "choices"/"answer"`);
  } else if (q.type === "mcq" || q.type === "gap-fill") {
    if (!Array.isArray(q.choices) || q.choices.length < 3 || q.choices.length > 4) {
      fail(`${idLabel}: ${q.type} needs 3–4 "choices"`);
    } else {
      for (const choice of q.choices) {
        if (!isNonEmptyString(choice)) {
          fail(`${idLabel}: every choice must be a non-empty string`);
          break;
        }
      }
      // Single-answer flags: choices unique exactly and case-folded.
      if (new Set(q.choices).size !== q.choices.length)
        fail(`${idLabel}: "choices" contains duplicate options (ambiguous answer)`);
      const folded = q.choices.map((choice) => String(choice).toLowerCase().trim());
      if (new Set(folded).size !== folded.length)
        fail(`${idLabel}: "choices" contains case-insensitive duplicate options`);
    }
    const count = Array.isArray(q.choices) ? q.choices.length : 0;
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= count)
      fail(`${at("answer")} must be an integer index into "choices"`);
    if (q.answer_text !== undefined || q.accept !== undefined)
      fail(`${idLabel}: ${q.type} must not carry "answer_text"/"accept"`);
  }

  // Explanation quality bar: ≤ 2 sentences, no ellipsis scaffolding.
  if (typeof q.explain_tr === "string" && q.explain_tr.trim().length > 0) {
    if (q.explain_tr.includes("...") || q.explain_tr.includes("…"))
      fail(`${idLabel}: "explain_tr" must not contain "..." / "…" ellipsis`);
    const sentences = sentenceCount(q.explain_tr);
    if (sentences < 1 || sentences > 2)
      fail(`${idLabel}: "explain_tr" must be 1–2 sentences (found ${sentences})`);
  }

  if (q.type === "gap-fill" && typeof q.prompt === "string" && !q.prompt.includes("___"))
    fail(`${idLabel}: gap-fill prompt must contain "___"`);

  // No-giveaway rule (P32): the correct choice's distinguishing word must not
  // appear in the stem — neither verbatim nor as a morphological base
  // ("calling" gives away "call"). Contraction/prefix lookalikes
  // ("haven't"/"have", "sentence"/"sent") are exempt via the suffix set.
  if (
    (q.type === "mcq" || q.type === "gap-fill") &&
    Array.isArray(q.choices) &&
    typeof q.answer === "number" &&
    typeof q.prompt === "string"
  ) {
    const answerText = String(q.choices[q.answer] ?? "");
    const distractWords = new Set();
    q.choices.forEach((c, i) => {
      if (i === q.answer) return;
      for (const w of String(c).toLowerCase().match(/[a-z]{4,}/g) ?? [])
        distractWords.add(w);
    });
    const stem = q.prompt.toLowerCase().replace("___", "");
    const stemWords =
      stem.match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
    const STOP = new Set(["choose", "correct", "sentence", "with", "about", "pick"]);
    for (const w of answerText.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
      if (STOP.has(w) || distractWords.has(w)) continue;
      const leak = stemWords.some(
        (s) => s === w || MORPH_SUFFIXES.some((suf) => s === w + suf),
      );
      if (leak) fail(`${idLabel}: answer giveaway — "${w}" appears in the prompt`);
    }
  }

  if (typeof q.rule_ref === "string" && q.rule_ref.trim().length > 0) {
    try {
      accessSync(resolve(REPO_DIR, q.rule_ref), constants.R_OK);
    } catch {
      fail(`${idLabel}: "rule_ref" target missing: ${q.rule_ref}`);
    }
  }

  return q;
}

function main() {
  const args = process.argv.slice(2);
  let statsOut = DEFAULT_STATS_OUT;
  let writeStats = true;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--stats-out" && typeof args[i + 1] === "string") {
      statsOut = resolve(process.cwd(), args[i + 1]);
      i += 1;
    } else if (args[i] === "--no-write") {
      writeStats = false;
    } else {
      fail(`unknown argument "${args[i]}" (expected --stats-out <path> | --no-write)`);
    }
  }

  // Discover bank files.
  let files = [];
  try {
    for (const level of LEVELS) {
      const dir = join(BANK_DIR, level.toLowerCase());
      let entries = [];
      try {
        entries = readdirSync(dir).filter((name) => name.endsWith(".json")).sort();
      } catch {
        fail(`missing bank directory ${dir}`);
        continue;
      }
      for (const name of entries) files.push(join(dir, name));
    }
  } catch (error) {
    fail(`bank discovery failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const questions = [];
  const perFile = new Map();
  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      fail(`${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (!Array.isArray(raw)) {
      fail(`${file}: bank file must be a JSON array`);
      continue;
    }
    const slug = file.split("/").pop().replace(/\.json$/, "");
    const levelFromPath = file.includes("/b2/")
      ? "B2"
      : file.includes("/b1/")
        ? "B1"
        : file.includes("/a2/")
          ? "A2"
          : "A1";
    const seenInFile = new Set();
    const parsed = [];
    for (const entry of raw) {
      const q = checkQuestion(entry, file);
      if (q === null) continue;
      if (typeof q.id === "string") {
        if (seenInFile.has(q.id)) fail(`${file}: duplicate question id "${q.id}" inside file`);
        seenInFile.add(q.id);
      }
      if (q.topic !== slug) fail(`${q.id}: topic "${q.topic}" does not match file slug "${slug}"`);
      if (q.level !== levelFromPath)
        fail(`${q.id}: level "${q.level}" does not match directory level "${levelFromPath}"`);
      parsed.push(q);
      questions.push(q);
    }
    perFile.set(slug, parsed);
  }

  // Per-topic quotas.
  for (const [slug, list] of [...perFile.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (list.length !== EXPECT_PER_TOPIC)
      fail(`topic ${slug}: expected ${EXPECT_PER_TOPIC} questions, found ${list.length}`);
    for (const difficulty of DIFFICULTIES) {
      const count = list.filter((q) => q.difficulty === difficulty).length;
      if (count !== EXPECT_DIFFICULTY[difficulty])
        fail(
          `topic ${slug}: expected ${EXPECT_DIFFICULTY[difficulty]} ${difficulty}, found ${count}`,
        );
    }
    for (const type of TYPES) {
      const count = list.filter((q) => q.type === type).length;
      if (count !== EXPECT_TYPE[type])
        fail(`topic ${slug}: expected ${EXPECT_TYPE[type]} ${type}, found ${count}`);
    }
  }

  // Global quotas.
  if (perFile.size !== EXPECT_TOPICS)
    fail(`expected ${EXPECT_TOPICS} topic files, found ${perFile.size}`);
  if (questions.length !== EXPECT_TOTAL)
    fail(`expected ${EXPECT_TOTAL} questions, found ${questions.length}`);
  for (const level of LEVELS) {
    const count = questions.filter((q) => q.level === level).length;
    if (count !== EXPECT_PER_LEVEL)
      fail(`level ${level}: expected ${EXPECT_PER_LEVEL} questions, found ${count}`);
  }

  // Bank-wide dup scans: ids + normalized stems.
  const seenIds = new Map();
  for (const q of questions) {
    if (seenIds.has(q.id)) fail(`duplicate question id "${q.id}" (also in ${seenIds.get(q.id)})`);
    else seenIds.set(q.id, q.topic);
  }
  const seenStems = new Map();
  for (const q of questions) {
    if (typeof q.prompt !== "string") continue;
    const key = normalizeStem(q.prompt);
    if (seenStems.has(key)) {
      const other = seenStems.get(key);
      fail(`duplicate stem: "${q.id}" repeats "${other}" (${q.prompt.slice(0, 80)})`);
    } else {
      seenStems.set(key, q.id);
    }
  }

  if (errors.length > 0) {
    console.error(`validate-bank: FAIL — ${errors.length} problem(s) in ${files.length} files:`);
    for (const message of errors) console.error(`  - ${message}`);
    process.exit(1);
  }

  // Build stats (same shape as `BankStats` in `web/lib/bank.ts`, plus meta).
  const byLevel = { A1: 0, A2: 0, B1: 0, B2: 0 };
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  const byType = { mcq: 0, "gap-fill": 0, rewrite: 0 };
  const topics = [];
  for (const [slug, list] of [...perFile.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const topicDifficulty = { easy: 0, medium: 0, hard: 0 };
    const topicType = { mcq: 0, "gap-fill": 0, rewrite: 0 };
    for (const q of list) {
      byLevel[q.level] += 1;
      byDifficulty[q.difficulty] += 1;
      byType[q.type] += 1;
      topicDifficulty[q.difficulty] += 1;
      topicType[q.type] += 1;
    }
    topics.push({
      topic: slug,
      level: list[0]?.level ?? "A1",
      total: list.length,
      byDifficulty: topicDifficulty,
      byType: topicType,
    });
  }
  const stats = {
    generatedAt: new Date().toISOString(),
    files: files.length,
    total: questions.length,
    byLevel,
    byDifficulty,
    byType,
    topics,
  };

  if (writeStats) {
    writeFileSync(statsOut, `${JSON.stringify(stats, null, 2)}\n`, "utf8");
  }
  console.log(
    `validate-bank: PASS — ${questions.length}Q over ${files.length} files ` +
      `(A1 ${byLevel.A1}/A2 ${byLevel.A2}/B1 ${byLevel.B1}/B2 ${byLevel.B2}; ` +
      `mcq ${byType.mcq}/gap ${byType["gap-fill"]}/rewrite ${byType.rewrite})` +
      (writeStats ? ` → ${statsOut}` : " (stats write skipped)"),
  );
}

main();
