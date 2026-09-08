# 06 — Design System (Claude-inspired)

## Palette

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAF9F5` (cream) | `#262624` (ink) |
| `--surface` | `#FFFFFF` | `#2E2C2A` |
| `--ink` | `#262624` | `#F2EFE9` |
| `--muted` | `#6B6660` | `#A8A29A` |
| `--accent` | `#C96442` (terracotta) | `#D97B57` (opened terracotta) |
| `--accent-ink` | `#FFFFFF` | `#262624` |
| `--line` | `#E8E2D9` | `#3D3A37` |
| `--ok` | `#2F7D4F` | `#4CAF7D` |
| `--err` | `#B3261E` | `#E57373` |

Buttons terracotta-brown, serif display headings (Georgia / "Source Serif" fallback stack), sans body (Inter system stack). Radius `10px`, hairline borders, generous whitespace. Light minimal Stripe/Linear feel.

## Themes

- `data-theme="light|dark"`, localStorage `gs-theme`, system preference default, head inline script to avoid FOUC.
- Toggle in header (sun/moon Lucide icons).

## Rules (anti-slop)

- No gradients, no glassmorphism, no purple/blue AI-defaults.
- No emoji / unicode-symbol icons anywhere — Lucide line icons only (nav, status, arrows, chevrons).
- Labels above inputs (no placeholder-only fields).
- Content column max `720px` for lessons; quiz cards max `640px`.

## Components (v1)

- `Header` (brand + level stepper A1→B2 + theme toggle)
- `LessonView` (forms table, traps callout, examples, quick-check details)
- `QuizCard` (progress bar, choices, submit, feedback panel with rule link)
- `GateResult` (score ring, per-topic bars, weakest-3 links, retake/review CTAs)
- `ReviewDeck` (missed list grouped by rule)
- `LevelMap` (48-topic grid with done/locked states)
