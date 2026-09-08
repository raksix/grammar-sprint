# Questions — bank schema + samples

Full spec: `../04-QUESTION-BANK-SPEC.md`. This folder holds the JSON Schema + 2 sample topic files proving the shape. The full 1000+ bank (48 topics × 25) is built in the code phase by bank agents 1–4 (see `../08-SUBAGENT-PLAN.md`).

## Layout (code phase)

```
web/data/bank/A1/a1-01-verb-to-be.json
... (48 files)
bank-stats.json  (generated)
```

## Samples here

- `samples/a1-02-present-simple.sample.json` — 6 questions (mcq + gap-fill + rewrite mix)
- `samples/b1-01-present-perfect.sample.json` — 5 questions (same mix)

## Validation (code phase, `web/scripts/validate-bank.mjs`)

- schema: all required fields, unique ids, answer index in range
- counts: ≥21 per topic (7/7/7 min), target 25 (8/9/8)
- dup stems: normalized Levenshtein check across bank
- single-answer: native-speaker review flag per topic
