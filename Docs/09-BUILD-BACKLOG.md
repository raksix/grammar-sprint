# 09 — Build Backlog (loop worker's ordered queue)

The cron worker does EXACTLY ONE piece per run, top-to-bottom. Never reorder. Mark done by appending to `10-EXECUTION-LOG.md` (same commit as the piece). A piece is done only when its acceptance line passes + committed + pushed.

## Wave 0 — Web scaffold + engine lib

- [ ] P00 Scaffold: `web/` Next.js static export, TS strict, `globals.css` tokens from `06-DESIGN-SYSTEM.md`, root layout, Header (brand + A1→B2 stepper + theme toggle), `/` landing. ACCEPT: `npm run build` 0 errors, light/dark toggle works.
- [ ] P01 `web/lib/bank.ts`: Question/bank types from `04-QUESTION-BANK-SPEC.md` + loader + per-topic stats. ACCEPT: `tsc --noEmit` clean.
- [ ] P02 `web/lib/draw.ts`: mulberry32 + Fisher-Yates + unseen-first draw over `askedIds` + stratified gate draw (10E/12M/8H). ACCEPT: unit test proves full cycle with zero repeats until exhaustion.
- [ ] P03 `web/lib/normalize.ts` + `scoring.ts` + `progress.ts` (versioned localStorage `gs-progress-v1` + migrate guard) + unit tests. ACCEPT: `bun test` green (normalize covers doesn't/does-not, case, trailing `.`).

## Wave 1 — Question bank (4 pieces per level, 3 topics × 25Q each)

- [ ] P04 Bank A1/1: `a1-01,a1-02,a1-03` (75Q). ACCEPT: validate-bank passes (schema, ≥25/topic, 0 dup stems).
- [ ] P05 Bank A1/2: `a1-04,a1-05,a1-06` (75Q). Same gate.
- [ ] P06 Bank A1/3: `a1-07,a1-08,a1-09` (75Q). Same gate.
- [ ] P07 Bank A1/4: `a1-10,a1-11,a1-12` (75Q). Same gate.
- [ ] P08 Bank A2/1: `a2-01,a2-02,a2-03` (75Q). Same gate.
- [ ] P09 Bank A2/2: `a2-04,a2-05,a2-06` (75Q). Same gate.
- [ ] P10 Bank A2/3: `a2-07,a2-08,a2-09` (75Q). Same gate.
- [ ] P11 Bank A2/4: `a2-10,a2-11,a2-12` (75Q). Same gate.
- [ ] P12 Bank B1/1: `b1-01,b1-02,b1-03` (75Q). Same gate.
- [ ] P13 Bank B1/2: `b1-04,b1-05,b1-06` (75Q). Same gate.
- [ ] P14 Bank B1/3: `b1-07,b1-08,b1-09` (75Q). Same gate.
- [ ] P15 Bank B1/4: `b1-10,b1-11,b1-12` (75Q). Same gate.
- [ ] P16 Bank B2/1: `b2-01,b2-02,b2-03` (75Q). Same gate.
- [ ] P17 Bank B2/2: `b2-04,b2-05,b2-06` (75Q). Same gate.
- [ ] P18 Bank B2/3: `b2-07,b2-08,b2-09` (75Q). Same gate.
- [ ] P19 Bank B2/4: `b2-10,b2-11,b2-12` (75Q). Same gate.
- [ ] P20 `web/scripts/validate-bank.mjs` + `bank-stats.json` generation; FULL bank green (1200Q, quotas 8/9/8, dup scan, single-answer flags). ACCEPT: script exits 0 on full bank.

## Wave 2 — UI routes

- [ ] P21 LevelMap + `/levels/[level]` (48-topic grid, locked/done states). ACCEPT: build clean, 0 console errors.
- [ ] P22 LessonView + `/learn/[topic]` (md→HTML at build, forms table, traps callout, quick-check). ACCEPT: all 48 lessons render.
- [ ] P23 QuizCard + `/quiz/[topic]` (8Q flow, per-question feedback with `rule_ref` link, adaptive step). ACCEPT: full quiz completable, wrong answer shows rule+trap.
- [ ] P24 GateResult + `/gate/[level]` + `/final` + `/review` + `/stats`. ACCEPT: gate unlocks next level at ≥80%, retake locked until deck cleared.
- [ ] P25 Landing polish + Header stepper wiring + XP display. ACCEPT: learn→quiz→gate→review loop clickable end-to-end by hand.

## Wave 3 — QA + deploy

- [ ] P26 Full unit suite + `tsc` + production build green. ACCEPT: 0 failures.
- [ ] P27 E2E full loop (learn→quiz→gate unlock→review clear) with 0 console errors. ACCEPT: report with proof.
- [ ] P28 Deploy to **http://learneng.fermag.com.tr** (DNS already → 67). Recipe: `npm run build`, copy `web/out/*` to `/var/www/learneng.fermag.com.tr/`, nginx vhost port 80 (server_name learneng.fermag.com.tr, root + `try_files $uri $uri/ $uri.html =404`), `nginx -t && nginx -s reload`. ACCEPT: curl 200 on `/`, `/levels/A1`, one `/learn/<topic>`, one bank JSON; no console errors. (HTTPS only if user asks later.)
- [ ] P29 Buffer/polish (a11y labels, OG/meta, sitemap, 404). ACCEPT: build green.

## After P29

Remaining iters (up to 500) = hardening: more questions per topic (30+), timed mode, PWA offline, FSRS review (v2). If NOTHING in this file is unchecked and all acceptance lines hold, report COMPLETE and change nothing.
