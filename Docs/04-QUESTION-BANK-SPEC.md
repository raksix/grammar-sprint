# 04 — Question Bank Spec (1000+ pool)

## Target

48 topics × 25 questions = **1200**. Minimum shippable: 48 × 21 = 1008. Per topic: 8 easy / 9 medium / 8 hard (min 7/7/7).

## Question object (JSON)

```json
{
  "id": "a1-02-e03",
  "topic": "a1-02-present-simple",
  "level": "A1",
  "difficulty": "easy",
  "type": "gap-fill",
  "prompt": "She ___ in Istanbul.",
  "choices": ["live", "lives", "living", "lived"],
  "answer": 1,
  "explain_tr": "3. tekil şahısta (he/she/it) fiile -s gelir: She lives.",
  "trap_tr": "Türkçede kişi eki olmadığı için -s unutulur.",
  "rule_ref": "Docs/grammar/A1/a1-02-present-simple.md"
}
```

Fields required: `id` (unique, `<topic>-<e|m|h><nn>`), `topic`, `level`, `difficulty`, `type`, `prompt`, `answer`, `explain_tr`, `rule_ref`. `choices` required for `mcq`/`gap-fill`; `type: rewrite` uses `answer_text` + `accept` list instead.

## Types (mix per topic)

- `mcq` (choose the correct sentence) — 40%
- `gap-fill` (4 choices) — 40%
- `rewrite` (transform: negative/question/passive/reported) — 20%, exact-match via `accept` variants (normalize pipeline: lowercase → NFKC → contraction expansion (`doesn't`→`does not`, `I'm`→`I am`) → collapse spaces → strip trailing `.` — research D3).

## Difficulty ladder

- **easy**: one rule, distractors obviously wrong (wrong tense entirely).
- **medium**: two interacting forms (don't vs doesn't; for vs since; who vs which).
- **hard**: classic TR-learner traps (3rd -s, V3 irregular, backshift, mixed conditional flip).

## Quality bar (every question must pass)

1. Exactly one defensible answer (native-speaker check; no dialect ambiguity).
2. Distractors = real learner errors, not random words.
3. `explain_tr` ≤ 2 sentences, names the rule + gives the correction.
4. No duplicate stem within the bank (normalize + Levenshtein check in CI).
5. No cultural/religious/political content. Names: Ayşe/Mehmet/Elif/Can + neutral contexts.

## No-repeat algorithm

- Client holds `asked_ids` per (topic, difficulty) in localStorage.
- Draw = seeded shuffle (mulberry32, seed = userId + day) over unseen ids; when unseen empties, reshuffle full pool (a full cycle completed → allow repeats).
- Gate tests draw stratified: 30Q = 10 easy / 12 medium / 8 hard across the level's topics (round-robin, unseen-first).
- Same rule for retakes: never show the identical 30 twice in a row while unseen remain.

## Storage (v1)

Static JSON: `web/data/bank/<level>/<topic>.json`. Validated by `scripts/validate-bank.mjs` (schema + counts + dup stems). Stats file `bank-stats.json` generated at build.
