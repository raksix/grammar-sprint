/* `test` / `describe` / `expect` are `bun test` globals (typed in bun-test.d.ts). */
import {
  firstAvailableTopic,
  firstUnpassedGate,
  formatXp,
  getContinueTarget,
} from "./continue";
import { TOPICS } from "./topics";

describe("firstAvailableTopic", () => {
  test("fresh progress starts at a1-01", () => {
    expect(firstAvailableTopic([], {})?.slug).toBe("a1-01-verb-to-be");
  });

  test("linear chain: after a1-01 done, a1-02 is next", () => {
    expect(
      firstAvailableTopic(["a1-01-verb-to-be"], {})?.slug,
    ).toBe("a1-02-present-simple");
  });

  test("A2 stays locked until the A1 gate passes", () => {
    const done = TOPICS.filter((t) => t.level === "A1").map((t) => t.slug);
    expect(firstAvailableTopic(done, {})).toBeUndefined();
  });

  test("passing the A1 gate opens a2-01", () => {
    const done = TOPICS.filter((t) => t.level === "A1").map((t) => t.slug);
    const topic = firstAvailableTopic(done, {
      A1: { passed: true, bestPct: 85, attempts: 1 },
    });
    expect(topic?.slug).toBe("a2-01-past-simple-regular");
  });
});

describe("firstUnpassedGate", () => {
  test("fresh progress points at A1", () => {
    expect(firstUnpassedGate({})).toBe("A1");
  });

  test("skips passed gates in order", () => {
    expect(
      firstUnpassedGate({
        A1: { passed: true, bestPct: 90, attempts: 1 },
        B1: { passed: true, bestPct: 88, attempts: 2 },
      }),
    ).toBe("A2");
  });

  test("all passed returns undefined", () => {
    expect(
      firstUnpassedGate({
        A1: { passed: true, bestPct: 90, attempts: 1 },
        A2: { passed: true, bestPct: 91, attempts: 1 },
        B1: { passed: true, bestPct: 92, attempts: 1 },
        B2: { passed: true, bestPct: 93, attempts: 1 },
      }),
    ).toBeUndefined();
  });
});

describe("getContinueTarget", () => {
  test("fresh progress targets the first topic with learn+quiz hrefs", () => {
    const target = getContinueTarget([], {});
    expect(target.kind).toBe("topic");
    if (target.kind === "topic") {
      expect(target.learnHref).toBe("/learn/a1-01-verb-to-be");
      expect(target.quizHref).toBe("/quiz/a1-01-verb-to-be");
    }
  });

  test("A1 done but gate locked targets the A1 gate", () => {
    const done = TOPICS.filter((t) => t.level === "A1").map((t) => t.slug);
    const target = getContinueTarget(done, {});
    expect(target).toEqual({ kind: "gate", level: "A1", gateHref: "/gate/A1" });
  });

  test("everything done and passed targets the final", () => {
    const done = TOPICS.map((t) => t.slug);
    const target = getContinueTarget(done, {
      A1: { passed: true, bestPct: 90, attempts: 1 },
      A2: { passed: true, bestPct: 90, attempts: 1 },
      B1: { passed: true, bestPct: 90, attempts: 1 },
      B2: { passed: true, bestPct: 90, attempts: 1 },
    });
    expect(target).toEqual({ kind: "final", finalHref: "/final" });
  });
});

describe("formatXp", () => {
  test("zero and negatives read 0 XP", () => {
    expect(formatXp(0)).toBe("0 XP");
    expect(formatXp(-40)).toBe("0 XP");
  });

  test("thousands get a separator", () => {
    expect(formatXp(1234)).toBe("1,234 XP");
  });
});
