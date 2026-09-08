# Grammar Sprint — docs-pool plan + build roadmap

> **For Hermes:** docs pool first (this file), code phase via `Docs/08-SUBAGENT-PLAN.md` fan-out.

**Goal:** A1→B2 grammar in 2 days; gated sprint trainer; 1000+ no-repeat Q bank.

**Architecture:** static Next.js, JSON bank, localStorage progress, no backend v1 (see `Docs/07-ARCHITECTURE.md`).

---

## Docs pool (this phase) — status

- [x] Scaffold + README + LICENSE + 00-CONTEXT + specs 01–08 (commit 09c33d6, pushed)
- [x] questions README + 2 sample JSONs (this commit)
- [ ] 48 lesson files (4 subagents parallel: A1/A2/B1/B2; B2 retried after empty-return fail)
- [ ] Verify: 48 files exist, headings byte-identical, 80–150 lines, links live
- [ ] Atomic commits per level + push; update 00-CONTEXT open items

## Code phase (next — user says "sonra kodlamaya geceriz")

1. `engine` types + lib (draw/normalize/scoring/progress) + unit tests
2. Bank agents 1–4 parallel (12×25 JSON each) + validate-bank CI
3. UI shell (tokens, theme, Header, LevelMap) + learn/quiz components
4. E2E full loop (learn→quiz→gate→review), 0 console errors, deploy static host

## Risks

- Subagent empty-return (seen: B2 wrote 0 files, `ls` trap) → mitigation: write_file-only instruction + python-list verification + steer/retry (done).
- `ls` binary broken on 67 box → python os.listdir everywhere.
- Scope creep (vocab/speaking) → non-goals in 01-VISION; enforce.
