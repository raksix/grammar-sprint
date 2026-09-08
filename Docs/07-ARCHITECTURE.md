# 07 — Architecture (web app plan, code phase)

## Stack

Next.js (static export) + TypeScript + plain CSS variables (no Tailwind dependency in v1 — tokens in `globals.css`). Question bank as static JSON (`web/data/bank/`). Progress in localStorage (`gs-progress-v1`: done topics, asked ids, review deck, XP, gates). No backend, no auth in v1. Deploy: any static host.

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing: 2-day plan, level map entry, start CTA |
| `/levels/[level]` | Topic list for A1/A2/B1/B2 with lock states |
| `/learn/[topic]` | Lesson render (md → HTML at build) |
| `/quiz/[topic]` | 8Q topic quiz |
| `/gate/[level]` | 30Q level gate |
| `/final` | 50Q sprint final |
| `/review` | Missed-question deck |
| `/stats` | XP, per-topic mastery, weakest rules |

## Data flow

```
bank JSON → draw(engine.ts, seeded, unseen-first) → QuizCard
  → submit → feedback(explain_tr/trap_tr/rule_ref)
  → progress store → review deck / gates / stats
```

## Modules (code phase)

- `lib/bank.ts` — load + validate + stats
- `lib/draw.ts` — seeded shuffle + no-repeat draw (mulberry32)
- `lib/normalize.ts` — rewrite answer compare
- `lib/progress.ts` — localStorage store (versioned key, migrate guard)
- `lib/scoring.ts` — percents, breakdowns, XP
- `components/*` — per `06-DESIGN-SYSTEM.md`
- `scripts/validate-bank.mjs` — CI: schema, counts (≥21/topic), dup stems, single-answer check

## Testing

- Unit: draw (no-repeat cycle), normalize (punct/case), scoring (thresholds).
- E2E (test-hermes): full loop learn → quiz → gate unlock → review clear, 0 console errors.
