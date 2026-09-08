/**
 * Unit tests for the P22 lesson loader + Markdown renderer.
 *
 * Gates: inline renderer edge cases, section splitting, and the full
 * 48-lesson acceptance proof (every Docs/grammar file loads, keeps its
 * 7-section shape, and yields non-empty HTML + sources).
 */

import {
  getLessonSlugs,
  loadAllLessons,
  loadLesson,
  parseLessonMarkdown,
  parseSources,
  renderBlocks,
  renderInline,
  splitSections,
} from "./lessons";

const SAMPLE = `# A1-01 Verb To Be (am / is / are)

## Goal
You can introduce yourself with am / is / are.

## Rule in 60 seconds
Pick \`am / is / are\` by subject: **I** takes am.

## Forms

| Form | Pattern | Examples |
|------|---------|----------|
| + Positive | I + am | I **am** tired. |

## 3 classic traps

### 1. Dropping be

- Wrong: He teacher.
- Right: He **is** a teacher.

## 10 example sentences

1. I **am** from Ankara.
2. She **is** late.

## Quick check

1. Fill in: She ___ a student.
<details><summary>Answer</summary>is — She <b>is</b> a student.</details>

## Sources

- https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar/verb-be
`;

describe("renderInline", () => {
  test("escapes HTML then applies code, bold and links", () => {
    expect(renderInline("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
    expect(renderInline("Use `am` now")).toBe("Use <code>am</code> now");
    expect(renderInline("a **b** c")).toBe("a <strong>b</strong> c");
    expect(renderInline("[BC](https://example.com/x)")).toBe(
      '<a href="https://example.com/x" rel="noopener">BC</a>',
    );
  });

  test("does not treat bold markers inside code spans as bold", () => {
    expect(renderInline("`**x**`")).toBe("<code>**x**</code>");
  });

  test("leaves plain numbers and years untouched", () => {
    expect(renderInline("I am 20 years old in 2020.")).toBe(
      "I am 20 years old in 2020.",
    );
  });
});

describe("splitSections", () => {
  test("extracts H1 and all seven sections", () => {
    const { h1, sections } = splitSections(SAMPLE);
    expect(h1).toBe("A1-01 Verb To Be (am / is / are)");
    expect(Object.keys(sections).sort()).toEqual(
      [
        "10 example sentences",
        "3 classic traps",
        "Forms",
        "Goal",
        "Quick check",
        "Rule in 60 seconds",
        "Sources",
      ].sort(),
    );
  });
});

describe("renderBlocks", () => {
  test("renders tables, lists, sub-heads, fences and details", () => {
    expect(renderBlocks("| A | B |\n|---|---|\n| 1 | 2 |")).toContain("<table>");
    expect(renderBlocks("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>");
    expect(renderBlocks("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
    expect(renderBlocks("### 1. Title")).toBe("<h3>1. Title</h3>");
    expect(renderBlocks("```text\nhave + V3\n```")).toContain(
      '<pre class="code-block"><code>have + V3</code></pre>',
    );
    expect(
      renderBlocks(
        "<details><summary>Answer</summary>is — ok.</details>",
      ),
    ).toContain('<details class="answer">');
  });
});

describe("parseSources", () => {
  test("turns bare URLs into labelled links", () => {
    const out = parseSources(
      "- https://learnenglish.britishcouncil.org/grammar/x\n",
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.href).toBe(
      "https://learnenglish.britishcouncil.org/grammar/x",
    );
    expect(out[0]?.label).toBe("learnenglish.britishcouncil.org/grammar/x");
  });
});

describe("parseLessonMarkdown", () => {
  test("builds a render-ready lesson from the sample", () => {
    const lesson = parseLessonMarkdown("a1-01-verb-to-be", SAMPLE);
    expect(lesson.code).toBe("A1-01");
    expect(lesson.title).toBe("Verb To Be (am / is / are)");
    expect(lesson.level).toBe("A1");
    expect(lesson.formsHtml).toContain("<table>");
    expect(lesson.trapsHtml).toContain("<h3>");
    expect(lesson.sources).toHaveLength(1);
  });

  test("throws when a section is missing", () => {
    expect(() => parseLessonMarkdown("a1-01-verb-to-be", "# T\n\n## Goal\nx\n")).toThrow(
      /missing sections/,
    );
  });

  test("throws on unknown slugs", () => {
    expect(() => parseLessonMarkdown("zz-99-nope", SAMPLE)).toThrow(/Unknown topic/);
  });
});

describe("full bank acceptance (P22: all 48 lessons render)", () => {
  test("slug catalogue holds 48 topics", () => {
    expect(getLessonSlugs()).toHaveLength(48);
  });

  test("every lesson loads with full shape and non-empty HTML", () => {
    const lessons = loadAllLessons();
    expect(lessons).toHaveLength(48);
    for (const lesson of lessons) {
      expect(lesson.goalHtml.length).toBeGreaterThan(0);
      expect(lesson.ruleHtml.length).toBeGreaterThan(0);
      expect(lesson.formsHtml.length).toBeGreaterThan(0);
      expect(lesson.trapsHtml.length).toBeGreaterThan(0);
      expect(lesson.examplesHtml.length).toBeGreaterThan(0);
      expect(lesson.quickCheckHtml.length).toBeGreaterThan(0);
      expect(lesson.sources.length).toBeGreaterThan(0);
      expect(lesson.formsHtml).toContain("<table>");
    }
  });

  test("H1 codes match their slugs", () => {
    for (const lesson of loadAllLessons()) {
      expect(lesson.slug.startsWith(lesson.code.toLowerCase())).toBe(true);
    }
  });

  test("spot check: b1 present perfect keeps its code fence", () => {
    const lesson = loadLesson("b1-01-present-perfect");
    expect(lesson.formsHtml).toContain("code-block");
    expect(lesson.formsHtml).toContain("have/has + V3");
  });
});
