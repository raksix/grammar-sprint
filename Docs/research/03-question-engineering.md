# 03 — Question Engineering Research (Grammar Sprint Bank)

Scope: 1000+ grammar items for TR learners, easy/medium/hard, no-repeat rotation.
Sources below are real URLs retrieved during research (Sep 2026).

## 1. Distractor taxonomy: diagnostic vs random

A diagnostic distractor encodes one attested learner error; a random distractor is merely
grammatically wrong. Language-testing practice (ALTE item-writer tradition) requires every
distractor to be plausible to a weaker candidate but clearly rejectable by a stronger one —
parallel in form/length, same word class, no trick spelling, exactly one key.
- ALTE item-writer guidelines (1995, upd. 2005) — plausibility, single-key, parallel options:
  https://www.scribd.com/document/387705213/ALTE-item-writer-guidelines-pdf
- ALTE Manual for Language Test Development and Examining (CEFR toolkit context):
  https://alte.wildapricot.org/MLTDE
- ALTELLA item-template model — distractor must target a named misconception, with stem/
  response/complexity/scoring specs per template (transferable to our bank schema):
  https://wida.wisc.edu/sites/default/files/resource/ALTELLA-Report-Developing-Item-Templates.pdf

Working taxonomy for Grammar Sprint (each gap-fill/mcq item = key + 3 typed distractors):
1. **L1-transfer** (TR interference: -s drop, article omission, have/has, since/for swap).
2. **Overgeneralization** (goed, costed, *more better, *enough good word-order).
3. **Form confusion** (don't/doesn't, was/were, who/which, will vs going to).
4. **Function confusion** (present perfect for definite past, for↔since, backshift omission).
Implication: every item stores `trap_tr` naming which class its distractors test (already in
spec §Quality bar item 2, "real learner errors"). Random-word distractors are banned.

## 2. Difficulty calibration for beginners (CEFR-aligned)

English Grammar Profile (EGP, built on Cambridge Learner Corpus, 40M+ words) describes what
learners demonstrably produce at each CEFR band; English Profile work shows B1 as the pivotal
transition point and documents form→function growth per structure (e.g. past perfect affirmative
at B1, use-after-because/reporting uses at B2).
- EGP overview slides (O'Keeffe/Mark, Cambridge Learner Corpus + CEFR mapping):
  https://spraakbanken.gu.se/sites/default/files/2023/Geraldine_grammar_GothenburgApril2023_2.pdf
- EGP competence study (criteria: frequency, correct-use rate, user/L1/context spread):
  https://doi.org/10.1075/ijcl.14086.oke
- Cambridge English Readability Dataset (KET=A2, PET=B1, FCE=B2 passage difficulty):
  https://researchdatasets.cambridge.org/cambridge-english-readability-dataset
- PET Handbook (B1 task model; Part 1 sentence-transformation 1–3 word gap format):
  http://www.iltea.org/cambridge/PET/pet_handbook.pdf
- CEFR wordlist calibration method (KET/PET sense-level assignment, learner-evidence first):
  https://www.cambridgeenglish.org/Images/23159-research-notes-41.pdf

Calibration rule for the bank: easy = one EGP-A1/A2 form, distractors from a different tense;
medium = two interacting forms at the same band (don't/doesn't, for/since, who/which);
hard = persistent cross-level traps (3rd -s, V3 irregulars, backshift, mixed conditionals).
This mirrors spec §Difficulty ladder and keeps A1 items answerable without B1 functions.

## 3. Turkish-learner error corpora (L1-TR interference per structure)

Turkish lacks articles and 3rd-person -s, uses different tense/aspect mapping, and has no
auxiliary-do/backshift equivalent — all confirmed across CLC-based studies:
- TR verb errors in CLC (n=16,851; top: tense TV > verb choice RV > form FV > agreement AGV;
  AGV persists A1→C2; make/do top problem verbs): https://doi.org/10.11114/jets.v5i9.2612
- TR syntactic errors (verb errors most frequent, then articles, then prepositions; article/
  preposition errors strongly interlingual): https://opensiuc.lib.siu.edu/theses/3403
- TR article acquisition (fluctuation definiteness/specificity; elementary = omission in
  definite contexts): https://open.metu.edu.tr/handle/11511/19565
- Prosodic-transfer account of TR article omission/substitution:
  https://benjamins.com/catalog/lald.47.04goa
- TR tense/aspect errors (61% semantic/pragmatic; top confusions: present↔past,
  progressive↔simple, perfect↔past; -s agreement 30% of syntactic errors; copula omission 79%
  of verb omissions): http://hdl.handle.net/11693/17438
- Present perfect specifically (TR learners substitute simple past/present; since/for adverb
  errors; Pres.C used for Pres.Prf.C): http://hdl.handle.net/11693/18096
- CLC 1993–2013 TR subcorpus (A2→C2: error variety rises, frequency falls, but taxonomies
  persist; 12/14 top TR taxonomies overlap global CLC): https://dergipark.org.tr/en/pub/dilder/article/1217990

Per-structure distractor seeds: 3rd -s drop (*he live); article omission (*I am teacher);
have/has (*she have); since/for (*since two years); present-perfect↔past (*I have seen him
yesterday); progressive overuse (*I am agree); backshift omission (*said he is tired);
make/do (*do a mistake vs make homework).

## 4. Auto-grading of rewrite/transform items (normalization)

PET-style transformation tasks accept multiple correct answers within 1–3 words, which forces
a normalization pipeline before exact-match. Standard NLP normalization stages (lowercase,
unicode fold, punctuation strip, whitespace collapse, contraction expansion):
- https://npblue.com/tech/nlp/processing/text-normalization/
- https://ingeotec.github.io/NLP-Course/topics/05TextNormalization/
- https://alvinntnu.github.io/NTNU_ENC2045_LECTURES/nlp/text-normalization-eng.html
Task format reference (transformation types + answer keys):
- https://www.myenglishpages.com/transformation-exercises-with-answers/
Pipeline for `type: rewrite`: trim → lowercase → NFKC fold → expand doesn't→does not (fixed
map) → strip trailing .!? → collapse spaces → compare against `accept[]`. Anything not in
`accept[]` is wrong (no fuzzy credit in v1).

## 5. Duplicate-stem detection (CI-usable)

Two-tier check balances cost and recall: (a) normalized Levenshtein ratio for near-identical
stems (cheap, runs on every PR); (b) embedding cosine (Sentence-BERT + FAISS) for paraphrase
duplicates (nightly or >threshold review queue).
- Paraphrase/duplicate framing + decomposable-attention baseline (Quora 400k pairs):
  https://web.stanford.edu/class/archive/cs/cs224n/cs224n.1194/reports/custom/15842506.pdf
- Sentence-BERT + FAISS duplicate-question system (reference architecture):
  https://github.com/j1s4nn/duplicate-question-pairs/tree/main/
- Feature-engineering survey (token/fuzzy/length features + classical ML):
  https://ijrar.org/papers/IJRAR22D1880.pdf
Bank CI: normalize (lowercase, strip punctuation/names→NAME) then flag pair if
Levenshtein ratio ≥ 0.85 OR same (topic, answer-pattern) + ratio ≥ 0.75. Keep the older id.

## 6. Seeded-shuffle no-repeat rotation

Fisher–Yates/Knuth gives O(n) unbiased permutations; seeding (mulberry32 / xoshiro128++)
makes per-user-per-day draws reproducible; a seen-set (asked_ids) layered on top gives
no-repeat cycles with reshuffle-on-exhaustion.
- QPGS design with Fisher–Yates for exam generation (O(n), non-repetitive):
  https://doi.org/10.52589/bjcnit-zck1bfkb
- Deterministic per-user daily quiz via seeded Fisher–Yates (seed = userId + date):
  https://dev.to/harishteens/quiz-maker-algorithm-527g
- Seeded reversible shuffle lib (xoshiro128++, Fisher–Yates):
  https://github.com/tuki0918/seeded-shuffle
- Integer-seed variant with reverse-shuffle: https://github.com/robbiespeed/seeded-shuffle
Bank rule: draw = seeded shuffle (seed=userId+day) over unseen ids per (topic, difficulty);
when unseen empties → reshuffle full pool (matches spec §No-repeat algorithm).

## 7. Ten enforceable bank rules (→ Docs/04-QUESTION-BANK-SPEC.md)

1. **Typed distractors.** Every mcq/gap-fill stores 3 distractors each mapped to §1 classes
   (L1-transfer/overgeneralization/form/function); add `distractor_types: string[3]` to the
   JSON object. CI: reject untyped or triple-same-class sets. → Spec §Quality bar 2.
2. **TR-trap quota.** Each topic's hard set must include ≥2 items from §3 seeds (3rd -s,
   article, have/has, since/for, backshift). CI: count per topic. → Spec §Difficulty ladder.
3. **CEFR-band gate.** Easy items may only test A1/A2 EGP forms; B1+ functions (perfect-
   continuous use, reporting, mixed conditional) are medium/hard only. CI: keyword gate on
   `rule_ref` level. → Spec §Difficulty ladder.
4. **Single-key proof.** Exactly one defensible answer; `answer` index in range, no duplicate
   choice text after normalization. CI: schema + normalized-uniqueness check. → §Quality 1.
5. **Explanation cap.** `explain_tr` ≤ 2 sentences and must name the rule + correction;
   `trap_tr` mandatory on hard items. CI: sentence-count + keyword check. → §Quality 3.
6. **Stem uniqueness.** Normalized Levenshtein ratio < 0.85 for any pair bank-wide (names
   masked); ≥0.75 + same topic flagged for human review. CI script. → §Quality 4.
7. **Rewrite accept-lists.** Every `type: rewrite` ships `accept[]` covering case/punct/
   contraction variants from §4 pipeline; min 2 variants; grader implements the exact
   pipeline. CI: run grader over `accept[]`, all must pass. → Spec §Types.
8. **Per-topic quota.** 8 easy / 9 medium / 8 hard per topic (min 7/7/7); type mix 40/40/20
   per topic (±1). CI: counts in `scripts/validate-bank.mjs`. → Spec §Target + §Types.
9. **Neutral content.** Only Ayşe/Mehmet/Elif/Can + neutral contexts; blocklist scan for
   cultural/religious/political terms. CI: lexicon grep. → §Quality 5.
10. **No-repeat contract.** Client persists `asked_ids` per (topic, difficulty); draws use
    seeded Fisher–Yates (seed=userId+day) unseen-first, reshuffle-on-exhaustion; gate tests
    10/12/8 stratified with no identical repeat while unseen remain. E2E test with fixed
    seed asserts this. → Spec §No-repeat algorithm.
