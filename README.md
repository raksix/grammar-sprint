# Grammar Sprint — A1 to B2 English Grammar in 2 Days

Open-source, sprint-based English grammar trainer. Takes a learner from CEFR A1 to B2 grammar in 2 days through bite-size lessons, gated level tests, and a 1000+ question bank (easy → medium → hard) with instant error feedback and no-repeat question rotation.

> Status: **docs pool phase** (like Lokma `Docs/` single-source). Code comes next. All specs live in `Docs/`.

## How it works

1. Learn one level's grammar set (A1 → A2 → B1 → B2).
2. Solve level quizzes (easy → medium → hard). Wrong answers show **why** (rule + correction).
3. Pass the level gate (general mixed test, ≥80%) to unlock the next level.
4. Finish B2 gate → sprint complete.

Key guarantees:

- **No-repeat questions** — seeded rotation, a question never repeats until the pool for that topic/difficulty is exhausted.
- **1000+ question pool** — JSON schema in `Docs/questions/`, quality rules enforced.
- **Error feedback** — every miss returns rule reference + correct form + typical-trap note.
- **2-day pacing** — Day 1: A1+A2, Day 2: B1+B2 (see `Docs/01-VISION-2DAY-SPRINT.md`).

## Docs pool

| File | What |
|---|---|
| `Docs/00-CONTEXT.md` | Single source of truth (read + update every prompt) |
| `Docs/01-VISION-2DAY-SPRINT.md` | Goal, pacing, gating rules |
| `Docs/02-CEFR-SCOPE-A1-B2.md` | Topic list per level (British Council / EAQUALS aligned) |
| `Docs/03-CURRICULUM-MAP.md` | Lesson order + dependencies |
| `Docs/04-QUESTION-BANK-SPEC.md` | 1000+ pool schema, difficulty ladder, no-repeat algorithm |
| `Docs/05-TEST-ENGINE-SPEC.md` | Quiz types, gates, scoring, feedback |
| `Docs/06-DESIGN-SYSTEM.md` | Claude colors, light/dark, anti-slop rules |
| `Docs/07-ARCHITECTURE.md` | Web app plan (stack, routes, data) |
| `Docs/08-SUBAGENT-PLAN.md` | Build-phase subagent split |
| `Docs/grammar/A1| A2|B1|B2/` | Per-topic lesson notes (TR explanations, EN examples) |
| `Docs/questions/` | Bank schema + samples (full bank in code phase) |

## Design

Claude-inspired palette — cream `#FAF9F5`, terracotta `#C96442`, ink `#262624` — with light/dark toggle. Light minimal, Stripe/Linear feel, serif display headings. No emoji icons (Lucide only). Full tokens in `Docs/06-DESIGN-SYSTEM.md`.

## Roadmap

- [x] Docs pool (this phase)
- [ ] Question bank expansion to 1000+ (code phase, subagent fan-out)
- [ ] Web app (Next.js): lessons, quizzes, gates, progress
- [ ] Streak/progress persistence, review deck for missed questions

## Contributing

Docs are English (code, commits, comments too). Chat in Turkish is fine. Every change is an atomic English commit, pushed immediately.

## License

MIT — see `LICENSE`.
