/**
 * Unit tests for `richtext.ts` (P31 acceptance).
 *
 * Bank `explain_tr` / `trap_tr` strings may carry <b>, <i>, <code>, <br>.
 * richText() must render those as real markup while keeping everything
 * else (scripts, handlers, links, unknown tags) inert escaped text.
 *
 * Run from `web/`: `bun test lib/richtext.test.ts`
 * (`test` / `expect` are `bun test` globals, typed in `bun-test.d.ts`.)
 */

import { richText } from "./richtext";

describe("richText", () => {
  test("passes plain text through escaped", () => {
    expect(richText("She lives here.")).toBe("She lives here.");
  });

  test("enables b/i/code/br", () => {
    expect(richText("fiile <b>-s</b> gelir")).toBe("fiile <b>-s</b> gelir");
    expect(richText("a <i>cat</i>")).toBe("a <i>cat</i>");
    expect(richText("use <code>has</code>")).toBe("use <code>has</code>");
    expect(richText("bir<br>iki")).toBe("bir<br>iki");
    expect(richText("bir<br/>iki")).toBe("bir<br>iki");
  });

  test("keeps scripts, handlers and links inert", () => {
    expect(richText("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(richText("<b onclick=\"x\">y</b>")).toBe(
      "&lt;b onclick=&quot;x&quot;&gt;y&lt;/b&gt;",
    );
    expect(richText("<a href=\"http://x\">y</a>")).toBe(
      "&lt;a href=&quot;http://x&quot;&gt;y&lt;/a&gt;",
    );
  });

  test("escapes stray angle brackets", () => {
    expect(richText("a < b and c > d")).toBe("a &lt; b and c &gt; d");
  });

  test("handles the screenshot case verbatim", () => {
    expect(
      richText("3. tekil şahısta (he/she/it) fiile <b>-s</b> gelir: She lives."),
    ).toBe(
      "3. tekil şahısta (he/she/it) fiile <b>-s</b> gelir: She lives.",
    );
  });
});
