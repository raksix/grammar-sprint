# 03 — Curriculum Map (order + dependencies)

## Principle

Each topic lists `depends_on`. The app enforces order inside a level but allows review of passed levels anytime. Cross-level deps are soft (warn, don't block) except marked hard gates.

## A1 chain (linear)

```
a1-01 → a1-02 → a1-03 → a1-04 → a1-05 → a1-06 →
a1-07 → a1-08 → a1-09 → a1-10 → a1-11 → a1-12 → A1 GATE
```

Key deps: a1-03 needs a1-02 (simple vs continuous contrast). a1-04 needs a1-01 (be paradigm). a1-12 needs a1-05+a1-06 (much/many needs articles + countability intro).

## A2 chain

```
a2-01 → a2-02 → a2-03 (needs a2-01/02) → a2-04 → a2-05 →
a2-06 (needs A1 much/many) → a2-07 → a2-08 (needs a2-04) →
a2-09 → a2-10 → a2-11 → a2-12 → A2 GATE
```

Hard: a2-03 requires past-simple-be + past-simple-regular passed (quiz), else contrast questions confuse.

## B1 chain

```
b1-01 (needs A2 past simple) → b1-02 (needs b1-01) → b1-03 (needs b1-01) →
b1-04 (needs a2-08) → b1-05 (needs b1-04) → b1-06 → b1-07 (needs b1-01 for backshift) →
b1-08 → b1-09 → b1-10 (needs a2-11) → b1-11 (needs a2-09) → b1-12 → B1 GATE
```

## B2 chain

```
b2-01 (needs b1-04+b1-05) → b2-02 (needs b2-01) → b2-03 (needs b1-06) →
b2-04 (needs b1-07) → b2-05 → b2-06 → b2-07 → b2-08 →
b2-09 (needs b2-02) → b2-10 (needs b1-10) → b2-11 (needs b1-12) → b2-12 (needs b1-03) → B2 GATE
```

## Lesson template (every topic file follows it)

1. `Goal` — one sentence (what you can DO after).
2. `Rule in 60 seconds` — the minimal pattern (TR explanation).
3. `Forms` — table: + / − / ? with 2 examples each.
4. `3 classic traps` — TR learners' top mistakes (e.g. "he go" → "he goes").
5. `10 example sentences` — EN + TR gloss.
6. `Quick check` — 3 self-test items with answers hidden (details/summary in web).
7. `Sources` — 1–3 reference links.

Keep each file 80–150 lines. No mega-files.
