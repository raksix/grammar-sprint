# 04 — App Architecture Research (open-source patterns)

> Goal: ground the static Next.js + JSON-bank + localStorage plan in
> Docs/07-ARCHITECTURE.md in proven open-source patterns. All repo URLs below
> are real and were verified via web search during this research.

## 1. Reference apps: static JSON bank + local quiz

- **Duolingo clones on Next.js** — the closest structural analogues
  (lesson → quiz → progress loop, static-deployable front end):
  - https://github.com/Luancss/next14-duolingo — lessons, quizzes, progress
    tracking in Next 14. Pattern to copy: route-per-lesson, server-rendered
    lesson shell + client quiz island.
  - https://github.com/mohannadofficial/duolingo-nextjs — Next.js + shadcn UI
    Duolingo clone. Pattern to copy: component-per-exercise-type.
  - https://github.com/DhavalDudheliya/DuoLingo_Clone — Next.js Duolingo-style
    app with auth; we copy the exercise flow but NOT the backend (v1 is
    backend-free per 07-ARCHITECTURE.md).
  - https://github.com/Rajat-Raghuvanshi-0512/duolingo-clone — minimal clone,
    useful as a "what the smallest working loop looks like" reference.
- **Khan Academy exercise stack** — the gold standard for mastery-gated flow:
  - https://github.com/Khan/khan-exercises — deprecated but readable framework:
    exercise = markup + problem seeds + hints; each attempt is seed-drawn.
    Direct inspiration for our `draw(engine)` + per-question `explain_tr`.
  - https://github.com/Khan/perseus — current renderer/editor (MIT, ~1.5k★):
    question JSON → renderer → answer-area components. Validates our
    "bank JSON → QuizCard" data flow; Perseus's widget registry maps to our
    per-type renderers (mcq / rewrite / dialogue).
- **Quiz-maker deterministic sampling** (unseen-first idea is established):
  - https://dev.to/harishteens/quiz-maker-algorithm-527g — deterministic
    pseudorandom per-user question list instead of storing arrays; same
    principle as our seeded draw + `askedIds`.

## 2. Spaced repetition: Anki SM-2 → FSRS (what to copy, what to skip)

- Anki core: https://github.com/ankitects/anki (~30k★). Since v23.10 ships two
  schedulers: classic SM-2 lineage and FSRS (FAQ:
  https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html).
- Minimal SM-2 ports: https://github.com/open-spaced-repetition/sm-2 and
  https://github.com/open-spaced-repetition/anki-sm-2 (MIT) — readable
  reference implementations of easiness/interval/next-review math.
- Modern scheduler: https://github.com/open-spaced-repetition/ts-fsrs
  (~760★, TypeScript, ESM/CJS/UMD, Node ≥20) + algorithm repo
  https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler.
- **Decision for Grammar Sprint v1:** do NOT ship FSRS. v1 review deck =
  missed-question queue grouped by rule (per 07-ARCHITECTURE.md `/review`).
  Keep the progress record shaped so FSRS fields (`stability`, `difficulty`,
  `due`) can be added later without a breaking migration; optionally adopt
  `ts-fsrs` in v2 when real interval data exists.

## 3. localStorage schema versioning + migration guards

- Purpose-built libs:
  - https://github.com/SebastianThiebaud/schema-versioned-storage —
    type-safe versioned localStorage with deterministic migrations.
  - https://github.com/gmaxlev/valistorage — localStorage/sessionStorage
    with versioning + migrations.
- Framework pattern (most instructive): zustand `persist` middleware
  (`version` + `migrate` options) —
  https://zustand.docs.pmnd.rs/reference/middlewares/persist — plus the
  production migration walkthrough "Safely Evolving Production localStorage
  Schemas with Zustand persist's version and migrate"
  (devcheolu.com). Real-world guard example:
  https://github.com/davidcjw/miles-wallet/pull/7.
- **Pattern to copy (no new dep):** `{ version: 1, state: {...} }` envelope
  under key `gs-progress-v1`; on load, `if (parsed.version !== CURRENT)`
  run a switch-based `migrate()` (drop unknown fields, backfill new ones,
  never throw — fall back to fresh state). This is exactly the `lib/progress.ts`
  "versioned key, migrate guard" row in 07-ARCHITECTURE.md.

## 4. Seeded RNG: mulberry32 + deterministic shuffle

- Canonical tiny impl: https://github.com/cprosche/mulberry32 (32-bit state,
  seed → `[0,1)` sequence; TS usage notes at
  https://context7.com/cprosche/mulberry32/llms.txt).
- How-to with Fisher–Yates: "How to Randomly Shuffle a List with a Seed in
  JavaScript" — https://www.javaspring.net/blog/javascript-random-ordering-with-seed/.
- **Decision:** hand-roll ~10-line `mulberry32` in `lib/draw.ts` (no dep);
  seed = `hash(topicId) ^ attemptNo`; Fisher–Yates for option order and
  question order; unseen-first filter on `askedIds` before shuffling so two
  learners rarely see the same set (cf. quizforge sampling note:
  https://github.com/vinayvobbili/quizforge/blob/9eda23b3/src/quizforge/sample.py).

## 5. Offline-first static export

- Next.js static export guides (official):
  https://nextjs.org/docs/app/guides/static-exports and
  https://nextjs.org/docs/pages/guides/static-exports; deploy notes at
  https://nextjs.org/docs/app/getting-started/deploying.
- **Decision:** `output: 'export'` (App Router), fully static host (any CDN/
  static host per 07-ARCHITECTURE.md); all lesson md→HTML at build time;
  no service worker in v1 (all assets already static; SW adds cache-
  invalidation risk for a 2-day sprint). Revisit SW only if offline-use
  demand is proven.

## 6. CI validation for the content bank

- Validator: https://github.com/ajv-validator/ajv (~14.7k★, fastest JSON
  Schema validator; docs https://ajv.js.org/) — compile one schema for
  `question.schema.json`, run over all `web/data/bank/*.json` in CI.
- **Decision:** `scripts/validate-bank.mjs` (node + ajv, zero framework):
  schema check → counts (≥21/topic) → dup-stem detection (normalized stem
  set) → single-answer check (exactly one `answer: true` / valid rewrite
  target). Fails the build on any violation; doubles as the unit-test
  fixture source for `lib/bank.ts`.

## 7. Education UX worth copying (lesson → quiz → gate; streak/XP)

- Khan mastery model: levels per skill (support article "How do Khan
  Academy's Mastery levels work", support.khanacademy.org) — maps to our
  topic done → level gate → final chain.
- Duolingo habit research (why streaks/XP retain):
  - https://blog.duolingo.com/how-duolingo-streak-builds-habit/ — streak as
    habit cue, loss-aversion framing.
  - https://doi.org/10.1109/iccoins.2018.8510568 and Jönköping study
    (http://urn.kb.se/resolve?urn=urn%3Anbn%3Ase%3Ahj%3Adiva-64753) — XP,
    streaks, and immediate feedback drive engagement; JAIST paper
    (dspace.jaist.ac.jp, ID 24026) isolates winning-streak effects.
- **What we copy (cheap, proven):** daily XP total, per-topic mastery %,
  weakest-3-rules links on `GateResult`, missed-question `ReviewDeck`
  grouped by rule. **What we skip:** leagues/leaderboards, push
  notifications, hearts/energy — retention theater that needs a backend.

## 8. Concrete decisions mapped to Docs/07-ARCHITECTURE.md

| 07 module/row | Decision | Source pattern |
|---|---|---|
| `lib/bank.ts` | Load static JSON; validate at build + CI with ajv | ajv-validator/ajv; Perseus question-JSON flow |
| `lib/draw.ts` | Hand-rolled mulberry32 + Fisher–Yates; unseen-first on `askedIds` | cprosche/mulberry32; quiz-maker seeded-list post |
| `lib/normalize.ts` | Lowercase/punct/whitespace fold for rewrite compare | Unit-tested pure fn (07 Testing row) |
| `lib/progress.ts` | `{version, state}` envelope, `gs-progress-v1`, switch `migrate()` | zustand-persist pattern; schema-versioned-storage |
| `lib/scoring.ts` | % + XP (10/correct, +streak bonus) + weakest-rules | Duolingo/Khan mastery notes above |
| `scripts/validate-bank.mjs` | ajv schema + counts + dup stems + single-answer | ajv + CI design (§6) |
| Routes `/…` | Static export; md→HTML at build; no SW v1 | Next static-export docs |
| `/review` | Missed queue grouped by rule; FSRS-ready fields later | Anki/FSRS deferred to v2 (ts-fsrs) |
| Testing | Unit: draw no-repeat, normalize, scoring; E2E: learn→quiz→gate→review, 0 console errors | 07 Testing row unchanged, confirmed sufficient |

**Test plan addition:** seed-fixed draw snapshot (same seed → same order),
migration test (v0 payload → v1 state, corrupt payload → fresh state),
bank fixture test (each sample topic passes `validate-bank.mjs`).
