/**
 * Lesson loading + zero-dependency Markdown rendering for `/learn/[topic]` (P22).
 *
 * Single source of truth stays `Docs/grammar/<LEVEL>/<slug>.md` (the docs-pool
 * files). At build time the server component in `app/learn/[topic]/page.tsx`
 * reads them with `loadLesson()` and prerenders static HTML, so the deployed
 * `web/out` bundle needs no runtime file access.
 *
 * The renderer is intentionally small: every one of the 48 lesson files uses
 * the same 7 `##` sections (Goal, Rule in 60 seconds, Forms, 3 classic traps,
 * 10 example sentences, Quick check, Sources) with paragraphs, bullet /
 * numbered lists, GFM tables, fenced code blocks and single-line `<details>`
 * answer blocks. Anything outside that shape falls back to escaped paragraphs
 * instead of failing the build.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Level } from "./bank";
import { TOPICS, getTopic } from "./topics";

/** One outbound link from the `Sources` section. */
export interface LessonSource {
  label: string;
  href: string;
}

/** A fully parsed lesson, ready for `LessonView` (all HTML, no Markdown). */
export interface ParsedLesson {
  /** Full slug, e.g. `a1-01-verb-to-be`. */
  slug: string;
  level: Level;
  /** 0-based position inside its level. */
  index: number;
  /** Short code from the H1, e.g. `A1-01`. */
  code: string;
  /** Human title from the H1, e.g. `Verb To Be (am / is / are)`. */
  title: string;
  goalHtml: string;
  ruleHtml: string;
  formsHtml: string;
  trapsHtml: string;
  examplesHtml: string;
  quickCheckHtml: string;
  sources: LessonSource[];
}

/** Section ids in document order (Sources is parsed separately). */
const SECTION_IDS = [
  "goal",
  "rule",
  "forms",
  "traps",
  "examples",
  "quick-check",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

const HEADING_TO_ID: Record<string, SectionId> = {
  Goal: "goal",
  "Rule in 60 seconds": "rule",
  Forms: "forms",
  "3 classic traps": "traps",
  "10 example sentences": "examples",
  "Quick check": "quick-check",
};

export function escapeHtml(src: string): string {
  return src
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Inline Markdown: `code`, **bold**, [label](url). Input must be one line. */
export function renderInline(src: string): string {
  const codes: string[] = [];
  const withCodes = src.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  let s = escapeHtml(withCodes);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(
    /\[([^\]]+)\]\((https?:[^)\s]+)\)/g,
    '<a href="$2" rel="noopener">$1</a>',
  );
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, idx: string) => codes[Number(idx)] ?? "");
  return s;
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|");
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  return isTableRow(t) && /-/.test(t) && /^[\s|:.-]+$/.test(t);
}

function splitRow(line: string): string[] {
  const t = line.trim();
  return t
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(header: string[], rows: string[][]): string {
  const thead =
    `<thead><tr>${header.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
  const tbody =
    `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

/**
 * Render one single-line `<details><summary>..</summary>body</details>`
 * block, or `undefined` when the line is not one.
 */
function renderDetailsLine(line: string): string | undefined {
  const m = line.trim().match(
    /^<details><summary>(.*?)<\/summary>(.*?)<\/details>$/,
  );
  if (!m) return undefined;
  const summary = escapeHtml((m[1] ?? "").trim());
  const body = renderInline((m[2] ?? "").trim());
  return `<details class="answer"><summary>${summary}</summary><p>${body}</p></details>`;
}

/** Block-level Markdown → HTML for one `##` section body. */
export function renderBlocks(src: string): string {
  const lines = src.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | undefined;

  const flushPara = (): void => {
    if (para.length === 0) return;
    const hardBreak = para.some((l) => /  $/.test(l));
    const text = para
      .map((l) => l.replace(/ $/, ""))
      .join(hardBreak ? "<br>" : " ");
    out.push(`<p>${renderInline(text.trim())}</p>`);
    para = [];
  };

  const flushList = (): void => {
    if (list === undefined || list.items.length === 0) {
      list = undefined;
      return;
    }
    const tag = list.ordered ? "ol" : "ul";
    out.push(
      `<${tag}>${list.items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</${tag}>`,
    );
    list = undefined;
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trim();

    if (line === "") {
      flushPara();
      flushList();
      i += 1;
      continue;
    }

    // Fenced code block.
    if (line.startsWith("```")) {
      flushPara();
      flushList();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && (lines[i] ?? "").trim() !== "```") {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1; // consume closing fence (or EOF)
      out.push(`<pre class="code-block"><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    // Multi-line <details> … </details> passthrough.
    if (line.startsWith("<details>")) {
      const single = renderDetailsLine(line);
      if (single !== undefined) {
        flushPara();
        flushList();
        out.push(single);
        i += 1;
        continue;
      }
      flushPara();
      flushList();
      const body: string[] = [];
      let summary = "";
      const open = line.match(/^<details><summary>(.*?)<\/summary>\s*$/);
      if (open) summary = (open[1] ?? "").trim();
      i += 1;
      while (i < lines.length && (lines[i] ?? "").trim() !== "</details>") {
        body.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      out.push(
        `<details class="answer"><summary>${escapeHtml(summary)}</summary><p>${renderInline(body.join(" ").trim())}</p></details>`,
      );
      continue;
    }

    // GFM table: header + separator + body rows.
    if (
      isTableRow(line) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1] ?? "")
    ) {
      flushPara();
      flushList();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i] ?? "")) {
        rows.push(splitRow(lines[i] ?? ""));
        i += 1;
      }
      out.push(renderTable(header, rows));
      continue;
    }

    // Sub-heading (used by the traps section).
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushPara();
      flushList();
      out.push(`<h3>${renderInline((h3[1] ?? "").trim())}</h3>`);
      i += 1;
      continue;
    }

    if (/^---+$/.test(line)) {
      flushPara();
      flushList();
      out.push("<hr>");
      i += 1;
      continue;
    }

    const quote = line.match(/^&gt;|^>/);
    if (quote) {
      flushPara();
      flushList();
      out.push(`<blockquote><p>${renderInline(line.replace(/^>\s?/, ""))}</p></blockquote>`);
      i += 1;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushPara();
      if (list === undefined || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push((bullet[1] ?? "").trim());
      i += 1;
      continue;
    }

    const indentedBullet = raw.match(/^\s{2,}[-*]\s+(.+)$/);
    if (indentedBullet && list !== undefined && !list.ordered) {
      list.items.push((indentedBullet[1] ?? "").trim());
      i += 1;
      continue;
    }

    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      flushPara();
      if (list === undefined || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push((numbered[1] ?? "").trim());
      i += 1;
      continue;
    }

    para.push(line);
    i += 1;
  }

  flushPara();
  flushList();
  return out.join("\n");
}

/** Parse the `Sources` section into outbound links. */
export function parseSources(src: string): LessonSource[] {
  const out: LessonSource[] = [];
  for (const raw of src.split("\n")) {
    const line = raw.trim().replace(/^[-*]\s+/, "");
    if (line === "") continue;
    const md = line.match(/\[([^\]]+)\]\((https?:[^)\s]+)\)/);
    if (md) {
      out.push({ label: (md[1] ?? "").trim(), href: (md[2] ?? "").trim() });
      continue;
    }
    const bare = line.match(/(https?:[^\s)]+)/);
    if (bare) {
      const href = (bare[1] ?? "").trim();
      out.push({ label: href.replace(/^https?:\/\//, ""), href });
    }
  }
  return out;
}

/** Split raw Markdown into H1 + `##` section bodies. */
export function splitSections(md: string): { h1: string; sections: Record<string, string> } {
  const sections: Record<string, string> = {};
  const lines = md.split("\n");
  let h1 = "";
  let current: string | undefined;
  const buf: string[] = [];
  const flush = (): void => {
    if (current !== undefined) sections[current] = buf.join("\n").trim();
    buf.length = 0;
  };
  for (const raw of lines) {
    const h1m = h1 === "" ? raw.match(/^#\s+(.+)$/) : null;
    if (h1m) {
      h1 = (h1m[1] ?? "").trim();
      continue;
    }
    const h2 = raw.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      current = (h2[1] ?? "").trim();
      continue;
    }
    if (current !== undefined) buf.push(raw);
  }
  flush();
  return { h1, sections };
}

/** Turn raw lesson Markdown into a render-ready `ParsedLesson`. */
export function parseLessonMarkdown(slug: string, md: string): ParsedLesson {
  const meta = getTopic(slug);
  if (meta === undefined) throw new Error(`Unknown topic slug: ${slug}`);
  const { h1, sections } = splitSections(md);
  if (h1 === "") throw new Error(`Lesson ${slug} has no H1 title`);
  // The slug is authoritative for the code (`a2-01-…` → `A2-01`): most H1s
  // repeat it as their first token, but the A2 files omit the prefix, so
  // only strip it when it is actually there.
  const slugCode = (slug.match(/^([a-z]\d-\d{2})/i)?.[1] ?? slug).toUpperCase();
  const firstToken = h1.split(/\s+/)[0] ?? "";
  const code = slugCode;
  const title =
    (firstToken.toUpperCase() === slugCode
      ? h1.slice(firstToken.length).trim()
      : h1.trim()) || meta.title;

  const missing = ["Sources", ...Object.keys(HEADING_TO_ID)].filter(
    (h) => sections[h] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(`Lesson ${slug} is missing sections: ${missing.join(", ")}`);
  }

  const html = (heading: string): string =>
    renderBlocks(sections[heading] ?? "");

  return {
    slug,
    level: meta.level,
    index: meta.index,
    code: code.toUpperCase(),
    title,
    goalHtml: html("Goal"),
    ruleHtml: html("Rule in 60 seconds"),
    formsHtml: html("Forms"),
    trapsHtml: html("3 classic traps"),
    examplesHtml: html("10 example sentences"),
    quickCheckHtml: html("Quick check"),
    sources: parseSources(sections["Sources"] ?? ""),
  };
}

function resolveLessonsDir(): string {
  const candidates = [
    join(process.cwd(), "..", "Docs", "grammar"),
    join(process.cwd(), "Docs", "grammar"),
    join(process.cwd(), "web", "..", "Docs", "grammar"),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  // Walk up from cwd (covers bun test / next build from nested dirs).
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    const probe = join(dir, "Docs", "grammar");
    if (existsSync(probe)) return probe;
    dir = join(dir, "..");
  }
  throw new Error(
    "Cannot locate Docs/grammar (tried cwd-relative candidates). " +
      `cwd=${process.cwd()}`,
  );
}

/** Read + parse one lesson by slug (throws on unknown slug or bad shape). */
export function loadLesson(slug: string): ParsedLesson {
  const meta = getTopic(slug);
  if (meta === undefined) throw new Error(`Unknown topic slug: ${slug}`);
  const file = join(resolveLessonsDir(), meta.level, `${slug}.md`);
  if (!existsSync(file)) throw new Error(`Lesson file not found: ${file}`);
  return parseLessonMarkdown(slug, readFileSync(file, "utf8"));
}

/** All 48 curriculum slugs in order (A1 → B2). */
export function getLessonSlugs(): string[] {
  return TOPICS.map((t) => t.slug);
}

/** Load every lesson (used by tests + the P22 acceptance proof). */
export function loadAllLessons(): ParsedLesson[] {
  return getLessonSlugs().map((slug) => loadLesson(slug));
}
