/**
 * Server-only topic-bank loader for the `/quiz/[topic]` route (P23).
 *
 * Reads `web/data/bank/<level>/<topic>.json` from disk at build time and
 * validates it through `parseBank`, so each static quiz page embeds its
 * own 25Q pool as props — no runtime fetch, no extra static assets to
 * deploy. Kept separate from `bank.ts` on purpose: `bank.ts` stays
 * client-safe (no `node:fs` import), this module is imported only by
 * server components.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBank } from "./bank";
import type { Question } from "./bank";
import { getTopic } from "./topics";

export function resolveBankDir(): string {
  const candidates = [
    join(process.cwd(), "data", "bank"),
    join(process.cwd(), "web", "data", "bank"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  // Walk up from cwd (covers bun test / next build from nested dirs).
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    const probe = join(dir, "web", "data", "bank");
    if (existsSync(probe)) return probe;
    const flat = join(dir, "data", "bank");
    if (existsSync(flat)) return flat;
    dir = join(dir, "..");
  }
  throw new Error(
    `Cannot locate data/bank (tried cwd-relative candidates). cwd=${process.cwd()}`,
  );
}

/**
 * Load + validate one topic's 25Q pool by slug.
 * Throws on unknown slug, missing file, or schema violation.
 */
export function loadTopicQuestions(slug: string): Question[] {
  const meta = getTopic(slug);
  if (meta === undefined) throw new Error(`Unknown topic slug: ${slug}`);
  const file = join(
    resolveBankDir(),
    meta.level.toLowerCase(),
    `${slug}.json`,
  );
  if (!existsSync(file)) throw new Error(`Bank file not found: ${file}`);
  return parseBank(JSON.parse(readFileSync(file, "utf8")) as unknown);
}
