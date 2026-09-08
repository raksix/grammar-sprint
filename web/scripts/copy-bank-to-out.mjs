/**
 * copy-bank-to-out.mjs — P28 deploy helper (zero-dep).
 *
 * `next build` with `output: "export"` copies `web/public/` into `web/out/`,
 * but the question bank lives in `web/data/bank/` (source of truth for the
 * build-time loaders in `lib/topic-bank.ts` / `lib/level-bank.ts`). The quiz,
 * gate and final routes embed their pools as props, yet the client-safe
 * `loadTopicBank()` in `lib/bank.ts` fetches `/data/bank/<level>/<topic>.json`
 * at runtime — so a static host must serve those files too.
 *
 * This script runs as `postbuild`: it mirrors `web/data/bank/*.json` plus
 * `web/data/bank-stats.json` into `web/out/data/`, making `web/out/` a
 * complete docroot (`cp -r web/out/. /var/www/learneng.fermag.com.tr/`).
 * Kept as a copy (not a `public/` duplicate) so the bank has exactly one
 * source of truth in git.
 */

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(here);
const srcData = join(webDir, "data");
const outData = join(webDir, "out", "data");

if (!existsSync(join(srcData, "bank"))) {
  console.error(`copy-bank-to-out: bank dir missing: ${join(srcData, "bank")}`);
  process.exit(1);
}
mkdirSync(outData, { recursive: true });
cpSync(join(srcData, "bank"), join(outData, "bank"), { recursive: true });
const stats = join(srcData, "bank-stats.json");
if (existsSync(stats)) cpSync(stats, join(outData, "bank-stats.json"));

console.log("copy-bank-to-out: bank mirrored into web/out/data/");
