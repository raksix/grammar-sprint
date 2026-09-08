# 00 — CONTEXT (single source of truth)

> Read this file at the start of EVERY prompt. Update it when facts change. Lokma-style: `Docs/` is the single source, this file is its index.

## Project

- **Name:** Grammar Sprint (`grammar-sprint`)
- **Repo:** https://github.com/raksix/grammar-sprint (public, MIT)
- **Local:** `/mnt/apopic/grammar-sprint`
- **Goal:** A1 → B2 English grammar in 2 days. Lesson → quiz → level gate → next level.
- **Phase:** docs pool (no code yet). Next phase: question-bank expansion + web app.

## Non-negotiables

- Docs + code + commits in **English**. Chat in Turkish.
- Every change = atomic English commit, push immediately.
- Design: Claude palette (cream `#FAF9F5`, terracotta `#C96442`, ink `#262624`), light/dark toggle, serif display, no emoji icons (Lucide).
- Question bank: **1000+**, easy→medium→hard, no-repeat until pool exhausted, every miss shows rule + correction + trap note.
- Gate: ≥80% mixed general test to unlock next level.
- Docs stay compact: one focused md per topic, no mega-files.

## Map

- `01-VISION-2DAY-SPRINT.md` — goal, pacing, gates
- `02-CEFR-SCOPE-A1-B2.md` — topic list per level
- `03-CURRICULUM-MAP.md` — lesson order + dependencies
- `04-QUESTION-BANK-SPEC.md` — schema, difficulty, no-repeat
- `05-TEST-ENGINE-SPEC.md` — quiz types, scoring, feedback
- `06-DESIGN-SYSTEM.md` — tokens, themes, components
- `07-ARCHITECTURE.md` — web app plan
- `08-SUBAGENT-PLAN.md` — build-phase split
- `grammar/A1| A2|B1|B2/` — per-topic lessons
- `questions/` — bank schema + samples

## CEFR topic counts (aligned w/ British Council EAQUALS + ESL-Tests)

- A1: 12 topics (be, present simple, present continuous, past be, articles, plurals, pronouns, possessives, prepositions, modals can, imperatives, there is/are + connectors)
- A2: 12 topics (past simple reg/irreg, past continuous, going to/will, comparatives, countable-uncountable, modals, zero+first conditional, gerund basics, adverbs frequency, relative who/which/that, reported basics)
- B1: 12 topics (present perfect, present perfect continuous, past perfect, 2nd+3rd conditional, passive, reported speech, modal deduction, used to/would, relative defining, gerund vs infinitive, question tags, linkers)
- B2: 12 topics (mixed conditionals, wish/if only, advanced passive, full reported range, participle clauses, causative have/get done, inversion, cleft/emphasis, subjunctive basics, reduced relatives, advanced conjunctions, narrative tenses)
- Total: **48 topics** → at ~25 questions each = **1200 pool**.

## Open items

- [ ] Fill 48 per-topic lesson files (subagent fan-out done this phase — skeleton + core 8 files by main agent, rest in code phase)
- [ ] Expand samples to full 1000+ bank (code phase)
- [ ] Web app scaffold (code phase per `07-ARCHITECTURE.md`)
