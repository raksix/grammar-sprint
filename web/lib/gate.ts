/**
 * Level-gate flow helpers (P24).
 *
 * Client-safe, pure. Encodes the retake rule from
 * `Docs/05-TEST-ENGINE-SPEC.md`: a failed gate (<80%) forces the review
 * deck clear before the retake button enables — the learner must
 * re-answer every miss on `/review` first. Passed gates (and first
 * attempts) are never locked.
 */

import type { GateRecord } from "./progress";

/**
 * True when the gate may be (re)taken right now.
 *
 * - Never attempted → open (first attempt, deck state irrelevant).
 * - Already passed → open (practice retakes stay free once unlocked).
 * - Attempted but not passed → open only when the review deck is fully
 *   clear (`openReviews === 0`).
 */
export function canRetakeGate(
  record: GateRecord | undefined,
  openReviews: number,
): boolean {
  if (record === undefined || record.attempts === 0) return true;
  if (record.passed) return true;
  return openReviews <= 0;
}
