# 05 — Test Engine Spec

## Quiz types

| Type | Size | When | Pass |
|---|---|---|---|
| Topic quiz | 8Q (3E/3M/2H) | after each topic | ≥6/8 marks topic done |
| Level gate | 30Q (10E/12M/8H, mixed topics) | after all topics in level | ≥80% unlocks next level |
| Final sprint | 50Q mixed A1–B2 | after B2 gate | ≥70% = sprint complete |
| Review deck | missed questions only | anytime + forced before retake | clear by re-answering each once |

## Flow (per question)

1. Show prompt + choices (or input for rewrite). No timer in v1 (timer optional later).
2. On submit: correct → green + 1-line rule echo. Wrong → red + `explain_tr` + `trap_tr` + link to lesson (`rule_ref`).
3. Wrong answers enter the review deck with the rule tag.
4. Difficulty adapts within topic quiz: 2 consecutive correct → next question steps up; 2 wrong → steps down (bounded by quiz composition).

## Scoring

- Topic quiz: percent + per-difficulty breakdown.
- Gate: percent + per-topic breakdown (shows weakest 3 topics → deep links).
- XP: easy 10 / medium 20 / hard 30. Streak bonus +5 per 5-streak. No penalties.
- Mastery per topic: `mastered` when topic quiz passed AND no review-deck items for that topic.

## Retake rules

- New questions every attempt (no-repeat draw). If pool exhausted, reshuffle.
- Gate fail (<80%): show per-topic breakdown + force review deck clear before retake button enables.

## Anti-gaming

- Choices shuffled per attempt (seeded). Rewrite answers normalized (lowercase, trim, collapse spaces, strip trailing `.`).
- No answer in DOM before submit (answer index resolved at submit from bank copy, not rendered).
