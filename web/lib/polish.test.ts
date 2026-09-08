/**
 * P29 polish tests: sitemap + robots shape (pure functions of the static
 * topic catalogue — no fs, no network).
 *
 * Run from `web/`: `bun test lib/polish.test.ts`
 * (`test` / `describe` / `expect` are `bun test` globals, typed in
 * `bun-test.d.ts` so `tsc --noEmit` stays clean.)
 */
import sitemap from "../app/sitemap";
import robots from "../app/robots";

const SITE = "http://learneng.fermag.com.tr";

describe("sitemap", () => {
  test("covers the full static route set (108 URLs)", () => {
    const urls = sitemap();
    // 1 home + 4 levels + 48 learn + 48 quiz + 4 gates + final/review/stats
    expect(urls.length).toBe(108);
  });

  test("every entry is an absolute learneng URL", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(`${SITE}/`)).toBe(true);
    }
  });

  test("key routes are present", () => {
    const set = new Set(sitemap().map((entry) => entry.url));
    expect(set.has(`${SITE}/`)).toBe(true);
    expect(set.has(`${SITE}/levels/A1`)).toBe(true);
    expect(set.has(`${SITE}/learn/a1-01-verb-to-be`)).toBe(true);
    expect(set.has(`${SITE}/quiz/a1-01-verb-to-be`)).toBe(true);
    expect(set.has(`${SITE}/gate/A1`)).toBe(true);
    expect(set.has(`${SITE}/final`)).toBe(true);
    expect(set.has(`${SITE}/review`)).toBe(true);
    expect(set.has(`${SITE}/stats`)).toBe(true);
  });

  test("no duplicate URLs", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("robots", () => {
  test("allows the whole site and points at the sitemap", () => {
    const rules = robots();
    expect(JSON.stringify(rules).includes(`${SITE}/sitemap.xml`)).toBe(true);
    expect(JSON.stringify(rules).includes("*")).toBe(true);
  });
});
