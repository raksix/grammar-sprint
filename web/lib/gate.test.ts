/**
 * Unit tests for `gate.ts` (P24 acceptance).
 *
 * The retake rule under test: a failed gate locks retake until the review
 * deck is fully clear; first attempts and passed gates are never locked.
 *
 * Run from `web/`: `bun test lib/gate.test.ts`
 * (`test` / `expect` are `bun test` globals, typed in `bun-test.d.ts`.)
 */

import { canRetakeGate } from "./gate";
import type { GateRecord } from "./progress";

function record(overrides: Partial<GateRecord> = {}): GateRecord {
  return { passed: false, bestPct: 0, attempts: 0, ...overrides };
}

test("first attempt is open regardless of deck", () => {
  expect(canRetakeGate(undefined, 0)).toBe(true);
  expect(canRetakeGate(undefined, 5)).toBe(true);
  expect(canRetakeGate(record({ attempts: 0 }), 3)).toBe(true);
});

test("passed gate stays open even with open review items", () => {
  expect(
    canRetakeGate(record({ passed: true, bestPct: 92, attempts: 2 }), 4),
  ).toBe(true);
});

test("failed gate opens when the deck is fully clear", () => {
  expect(
    canRetakeGate(record({ passed: false, bestPct: 63, attempts: 1 }), 0),
  ).toBe(true);
});

test("failed gate locks while any review item is open", () => {
  expect(
    canRetakeGate(record({ passed: false, bestPct: 63, attempts: 1 }), 1),
  ).toBe(false);
  expect(
    canRetakeGate(record({ passed: false, bestPct: 77, attempts: 3 }), 12),
  ).toBe(false);
});

test("earlier pass is sticky: a later fail cannot re-lock", () => {
  // recordGateAttempt keeps passed:true once earned; canRetakeGate honors it.
  expect(
    canRetakeGate(record({ passed: true, bestPct: 80, attempts: 2 }), 2),
  ).toBe(true);
});
