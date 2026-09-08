/**
 * Server-only level + full-bank loaders for the `/gate/[level]`,
 * `/final` and `/review` routes (P24).
 *
 * Same pattern as `topic-bank.ts` (build-time `parseBank` validation, pool
 * embedded as props, no runtime fetch): `loadLevelQuestions` gathers one
 * level's 12 topic files (300Q), `loadAllQuestions` gathers all 48 files
 * (1200Q). Kept separate from `bank.ts` on purpose: `bank.ts` stays
 * client-safe (no `node:fs` import), this module is imported only by
 * server components.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEVELS, parseBank } from "./bank";
import type { Level, Question } from "./bank";
import { TOPICS_BY_LEVEL } from "./topics";
import { resolveBankDir } from "./topic-bank";

function loadFile(dir: string, level: Level, slug: string): Question[] {
  const file = join(dir, level.toLowerCase(), `${slug}.json`);
  if (!existsSync(file)) throw new Error(`Bank file not found: ${file}`);
  return parseBank(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

/**
 * Load + validate one level's full pool (12 topics, 300Q) in curriculum
 * order. Throws on a missing file or schema violation.
 */
export function loadLevelQuestions(level: Level): Question[] {
  const dir = resolveBankDir();
  const out: Question[] = [];
  for (const topic of TOPICS_BY_LEVEL[level]) {
    for (const question of loadFile(dir, level, topic.slug)) {
      out.push(question);
    }
  }
  return out;
}

/**
 * Load + validate the whole bank (48 topics, 1200Q, A1 → B2 order).
 * Backs the `/final` sprint draw and the `/review` id lookup.
 */
export function loadAllQuestions(): Question[] {
  const dir = resolveBankDir();
  const out: Question[] = [];
  for (const level of LEVELS) {
    for (const topic of TOPICS_BY_LEVEL[level]) {
      for (const question of loadFile(dir, level, topic.slug)) {
        out.push(question);
      }
    }
  }
  return out;
}
