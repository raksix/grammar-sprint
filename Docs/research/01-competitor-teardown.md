# 01 — Competitor Teardown (grammar quiz UX)

> Scope: 5 sites. Per site: quiz types, wrong-answer feedback, difficulty/gating, progress persistence, 1 strength + 1 weakness. Ends with 8 mechanics to copy + 4 anti-patterns mapped to our specs (04 Question Bank, 05 Test Engine).

## 1. Test-English.com
- URL: https://test-english.com
- Quiz types: Multiple-choice grammar tests per level (A1–C1); each test ~10–20 questions; also exam-style (B1 Preliminary, B2 First) and comparison exercises.
- Wrong-answer feedback: Instant tick/cross on submit per question; "Show answer" reveals correct choice with short rule note; end-of-test score summary with per-question review list.
- Difficulty/gating: Level picker on homepage (A1, A2, B1, B2, C1); tests ordered easy→hard within a level; no hard gate — user can jump to any level/test freely.
- Progress persistence: No account required; progress not saved across sessions (guest mode). Some tests store last score in memory only.
- Strength: Huge level-indexed test library — user finds "their" test in seconds; great SEO/IA model for our `/practice/<level>/<topic>` routing.
- Weakness: No spaced review of missed items — wrong answers vanish after the test ends; no retry-same-rule loop.

## 2. Ego4u.com (English Grammar Online)
- URL: https://www.ego4u.com
- Quiz types: Short topical exercises (usually 10 questions): multiple choice, gap-fill (type-in), matching, negative/question rewrites; each exercise tied to one grammar page.
- Wrong-answer feedback: "Check" button grades the set; wrong fields turn red with correct answer shown inline; brief rule recap above the exercise links back to theory. Explanations are short and in simple English.
- Difficulty/gating: Exercises tagged by level (A1–B2) and ordered within each topic page from easy to hard; no gating — all content open.
- Progress persistence: No login, no persistence; exercises reset on reload (typed answers lost).
- Strength: Theory-exercise pairing is 1:1 — every rule page has a matching drill directly below, which is exactly our `rule_ref` ↔ question link model.
- Weakness: Type-in answers use strict string match with thin normalization; learners get marked wrong for harmless variants (punctuation/case) — the trap our `accept`-list + normalize rule must avoid.

## 3. Perfect-English-Grammar.com
- URL: https://www.perfect-english-grammar.com
- Quiz types: Printable + interactive quizzes per topic (conditionals, perfect tenses, reported speech, modals); mostly gap-fill with 4 options or type-in; explanation PDFs for purchase.
- Wrong-answer feedback: "Check answers" reveals score + correct answers; short grammar note per answer group (not per question); explanations skew toward rule restatement rather than error diagnosis.
- Difficulty/gating: Topics grouped beginner → advanced; within a topic, Exercise 1 is easier than Exercise 2/3; fully open navigation, no locks.
- Progress persistence: None (stateless site); downloadables act as the "persistence" (print and track yourself).
- Strength: Distractor quality — wrong options mirror classic learner errors (e.g. `would have gone` vs `would go`), which matches our 04-spec rule "distractors = real learner errors".
- Weakness: Zero adaptivity or per-question diagnostics — a learner who misses 3/10 on conditionals gets no "weakest rule" breakdown; our gate's per-topic breakdown (05-spec) fills this gap.

## 4. British Council LearnEnglish
- URL: https://learnenglish.britishcouncil.org
- Quiz types: Grammar lessons (A1–C1) each with 2-stage check: Grammar-snack task (MCQ/gap) + Grammar-in-use exercise; plus separate "English levels" self-check tests.
- Wrong-answer feedback: Immediate per-question feedback with "True/False + why" style; correct answers show a 1-line rule echo; "Finish" screen shows score + retry button; tone is encouraging, never punitive.
- Difficulty/gating: CEFR-banded sections (A1–C1); free navigation, but site recommends completing the level-check first; MyLevel tracking suggests next steps.
- Progress persistence: Free account (MyEnglish) saves completed lessons + scores; guests get session-only scoring.
- Strength: Feedback tone + two-stage check (recognition → production) — the model for our topic quiz (recognition MCQ) → rewrite question (production) mix in 04-spec (40/40/20).
- Weakness: Review loop is shallow — retry replays the identical questions; no unseen-first no-repeat draw like our 04-spec `asked_ids` + seeded shuffle.

## 5. Duolingo (English course)
- URL: https://www.duolingo.com
- Quiz types: Bite-size lesson loop: MCQ, translation both directions, listening tap-the-words, speaking (optional); hearts/XP/streak economy wrapped around a skill tree.
- Wrong-answer feedback: Instant red/green flash + correct answer shown; one-tap "why" opens a short community/grammar note; mistakes respawn later in the same lesson (mistake-revival loop).
- Difficulty/gating: Skill tree + leagues; hearts limit retries; placement test sets start node; spaced "cracked skills" force review before advancing.
- Progress persistence: Full account persistence (cloud): XP, streak, skill crowns, mistake bank; offline queue syncs on reconnect.
- Strength: Mistake-revival + streak economy — our review-deck (05-spec) and XP/streak bonus should copy this loop directly.
- Weakness: Grammar is implicit (pattern-matching over explicit rules) — a learner can finish a skill without ever reading the rule; our `explain_tr` + `rule_ref` explicit-rule feedback (04/05-spec) is the counter-design.

## 6. Side-by-side matrix

| Capability | test-english | ego4u | perfect-eg | BC LearnEnglish | Duolingo |
|---|---|---|---|---|---|
| Level-indexed library | yes (A1–C1) | by topic+level | beginner→adv | CEFR bands | skill tree |
| Instant per-Q feedback | yes | on Check | on Check | yes | yes (flash) |
| Rule echo on correct | short note | recap link | group note | 1-line echo | community note |
| Wrong-answer diagnosis | review list | inline correct | restatement | why-style | revival loop |
| Typed-answer tolerance | n/a (MCQ) | strict (weak) | strict | tolerant | tolerant + typos |
| Gating/locks | none | none | none | suggested | hearts/tree |
| Cross-session progress | no | no | no (PDF) | account | cloud full |
| Missed-item review | no (gap) | no | no (gap) | shallow retry | revival (best) |
| No-repeat rotation | no | no | no | no (replays same) | spaced skills |

Takeaway: nobody combines all four of our pillars (explicit rule feedback + no-repeat + review deck + gates). That combination IS the product gap.

## 7. Mechanics to copy (8)

1. Level-indexed library IA (test-english) → 04 bank layout `web/data/bank/<level>/<topic>.json`; route `/practice/<level>/<topic>`.
2. Theory-exercise 1:1 pairing (ego4u) → every question carries `rule_ref` to `Docs/grammar/<level>/`; 05 flow shows lesson link on every wrong answer.
3. Real-error distractors (perfect-english-grammar) → 04 quality bar §2: distractors = TR-learner errors (3rd -s, V3, backshift); encode the trap in `trap_tr`.
4. Two-stage check: recognition → production (British Council) → 04 type mix mcq 40 / gap-fill 40 / rewrite 20 per topic.
5. Instant per-question feedback with rule echo (British Council + Duolingo) → 05 flow step 2: correct = green + rule echo; wrong = red + `explain_tr` + `trap_tr`.
6. Mistake-revival review deck (Duolingo) → 05 review deck: wrong answers queue with rule tag; gate retake locked until deck cleared.
7. Streak/XP economy, no penalties (Duolingo) → 05 scoring: easy 10 / med 20 / hard 30, +5 per 5-streak, no negative points.
8. Gate with per-topic breakdown → weakest-3 deep links (fills perfect-english-grammar's gap) → 05 gate: ≥80% unlock, breakdown shows weakest 3 topics.

## 8. Anti-patterns to avoid (4)

1. Vanishing mistakes (test-english: no review of wrong items) → 05 review deck persists missed questions; `mastered` requires empty deck per topic.
2. Strict string-match on typed answers (ego4u) → 04 `rewrite` uses `accept` variants + normalize (lowercase/trim/collapse/strip `.`); 05 anti-gaming codifies it.
3. Identical-question retries (British Council) → 04 no-repeat draw (`asked_ids` + mulberry32 seeded shuffle, unseen-first; stratified 10E/12M/8H gates).
4. Implicit-only grammar, answers leaked in DOM (Duolingo-style pattern grind / naive clients) → 04/05 explicit `explain_tr` ≤ 2 sentences on every item + 05 anti-gaming: answer resolved at submit, never rendered pre-submit; choices shuffled per attempt.

## 9. Spec deltas (applied to 04/05)

- D1 (04): add `route` convention `/practice/<level>/<topic>` mirroring bank layout.
- D2 (05): wrong-answer panel MUST contain lesson deep-link (`rule_ref`) — ego4u parity.
- D3 (04): rewrite tolerance = `accept[]` + normalize pipeline (lowercase, NFKC, contraction expansion, strip trailing `.`); add CI test with doesn't/does-not pairs.
- D4 (05): gate breakdown shows weakest 3 topics with retry links; retake locked until review deck cleared (Duolingo revival loop, explicit-rule variant).
- D5 (05): never replay identical questions while unseen remain (BC weakness → our no-repeat draw).
