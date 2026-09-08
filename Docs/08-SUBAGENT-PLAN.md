# 08 — Subagent Plan (code phase fan-out)

Run AFTER docs pool merges. Each agent owns ONLY its files; main agent wires shared files, QAs, commits + pushes per agent.

## Agents

| # | Agent | Owns | Done when |
|---|---|---|---|
| 1 | `bank-a1` | `web/data/bank/A1/*.json` (12×25) + lesson md polish A1 | validate-bank passes A1 (≥300Q, 0 dups) |
| 2 | `bank-a2` | `web/data/bank/A2/*.json` + lesson polish A2 | same, A2 |
| 3 | `bank-b1` | `web/data/bank/B1/*.json` + lesson polish B1 | same, B1 |
| 4 | `bank-b2` | `web/data/bank/B2/*.json` + lesson polish B2 | same, B2 |
| 5 | `engine` | `web/lib/{draw,normalize,scoring,progress,bank}.ts` + unit tests | `bun test` green |
| 6 | `ui-shell` | layout, theme, Header, LevelMap, tokens `globals.css` | light/dark toggle works, 0 console errors |
| 7 | `ui-learn-quiz` | LessonView, QuizCard, GateResult, ReviewDeck, Stats | full loop E2E passes |

## Rules for agents

- Read `Docs/00-CONTEXT.md` + your spec first. Write ONLY your files.
- Shared files (`bank.ts` types, routes) are read-only for bank agents — propose changes in your report, don't touch.
- Explanations Turkish (`explain_tr`), everything else English.
- Each agent commits its own work (atomic English messages), main agent pushes after QA.
- QA gate per agent: `validate-bank` (bank agents) / `tsc --noEmit` + E2E (ui agents).

## Sequence

1. `engine` types first (bank agents need the schema) — or ship `bank.ts` types in docs phase (preferred).
2. Bank agents 1–4 in parallel.
3. UI agents 6–7 after engine lands.
4. Main: wire routes, full bank validation (1200Q), E2E, deploy.
