# 02 — Sprint Pedagogy: Learning-Science Grounding for the 2-Day Grammar Sprint

> Scope: is a 2-day A1→B2 grammar sprint defensible, and what design choices make it stick?
> Verdict: defensible as a **recognition + controlled-production sprint over high-frequency forms**,
> NOT as full B2 competence. The sprint buys coverage and initial proceduralization; **retention is
> bought by the review system after it**. Every recommendation below maps to a spec change in §9.

## 1. The honest framing: what 2 days can and cannot do

- Two days (~16h contact) cannot produce durable B2 proficiency. What massed intensive exposure CAN do
  is establish **form recognition, rule articulation, and controlled written production** of the highest-frequency
  structures — provided retrieval, spacing, and interleaving are engineered in (see §§2–5).
- The sprint must therefore promise "B2 grammar coverage, test-proven, with a retention system" — and the
  spec's real guarantee is the **gate + review-deck loop**, not the weekend alone.
- Design implication: optimize the sprint for **initial learning strength + scheduled re-exposure**, and ship
  the post-sprint schedule (Day 1 / 3 / 7) as a first-class feature, not an afterthought.

## 2. Retrieval practice (testing effect): the engine of the sprint

- Testing beats restudying for retention, even without feedback, across the classic Roediger & Karpicke program:
  repeated testing during learning strongly enhances delayed retention vs. repeated study
  ([Karpicke & Roediger 2007, JML](https://learninglab.psych.purdue.edu/downloads/2007/2007_Karpicke_Roediger_JML.pdf);
  [review, 2006](https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_Review.pdf);
  [Karpicke & Roediger 2008, Science](https://web.mit.edu/educationgroup/HHMIEducationGroup/wp-content/uploads/2011/04/14-Karpicke-Roediger-2008.pdf)).
- Dunlosky et al.'s (2013) review of 10 learning techniques rates **practice testing and distributed practice
  as HIGH utility** — the only two top-rated strategies — while rereading, highlighting, and summarization rate LOW
  ([AFT summary PDF](https://www.aft.org/sites/default/files/dunlosky_0.pdf);
  [ERIC full text](https://files.eric.ed.gov/fulltext/EJ1021069.pdf)).
- Brown, Roediger & McDaniel (2014), *Make It Stick*, translate this into practitioner rules: retrieval +
  spacing + interleaving + elaboration beat massed rereading
  ([HUP](https://www.hup.harvard.edu/books/9780674419377);
  [strategy summaries](https://www.retrievalpractice.org/make-it-stick)).
- Sprint consequence: **every topic must be tested, not just taught**. The current 10-min-lesson + 10-min-quiz
  rhythm is exactly right; the lesson must never be allowed to run without its quiz. Add a 2-question
  cold-recall opener per lesson on the *previous* topic (§9.5).

## 3. Spaced repetition for GRAMMAR (not just vocab)

- Spacing effects generalize to L2 grammar: spaced distribution outperforms massed instruction on grammar
  outcomes in EFL studies ([TEL Journal study](https://www.teljournal.org/article_53183.html);
  [ESPACE L2 project, ERIC](https://files.eric.ed.gov/fulltext/ED625177.pdf)).
- "Lag effects" (spacing between two encounters with the same grammar form) hold under a desirable-difficulties
  account — longer lags help delayed retention even when they hurt immediate performance
  ([Cambridge, Applied Psycholinguistics](https://www.cambridge.org/core/journals/applied-psycholinguistics/article/lag-effects-in-grammar-learning-a-desirable-difficulties-perspective/A9E9F6888901DBF1F2D7B52EC084C010)).
- Practical SRS: the SM-2 algorithm (SuperMemo) schedules repetitions at expanding intervals from quality grades
  ([SM-2 spec](https://super-memory.com/english/ol/sm2.htm);
  [open implementation](https://github.com/open-spaced-repetition/sm-2/)); adaptive forgetting-curve models
  (e.g. Settles & Meeder) fit per-item half-lives instead of fixed steps
  ([doi:10.1145/2939672.2939850](https://doi.org/10.1145/2939672.2939850)).
- Forgetting-curve practice converges on a **1 → 3 → 7 → 14 → 30 day** expansion for new declarative material.
  Inside a 2-day sprint this compresses to: **same-block → next-block → next-day** (Leitner boxes 1/2/3, §9.3),
  then the post-sprint schedule takes over at Day 3 / Day 7 / Day 14.
- Sprint consequence: the review deck is not a "missed list" — it is a **3-box Leitner deck with intervals**,
  and gate retakes must draw from it, not from fresh questions alone.

## 4. Interleaving vs. blocking for grammar

- Across domains, interleaved practice (abcbcacab) beats blocked practice (aaabbbccc) on delayed tests
  ([Taylor & Rohrer 2010](http://uweb.cas.usf.edu/~drohrer/pdfs/Taylor&Rohrer2010ACP.pdf);
  [doi:10.1002/acp.1598](https://doi.org/10.1002/acp.1598)).
- The effect replicates specifically for grammar: mixing grammar exercises beats blocking for long-term retention
  ([ModL, doi:10.1111/modl.12581](https://doi.org/10.1111/modl.12581)); a field experiment confirms interleaved
  grammar practice in real classrooms
  ([APA, doi:10.1037/edu0000917](https://psycnet.apa.org/doiLanding?doi=10.1037%2Fedu0000917)); working-memory
  interactions are examined in the L2-syntax proceduralization literature
  ([doi:10.1177/1362168820913985](https://journals.sagepub.com/doi/10.1177/1362168820913985)).
- Sprint consequence: **teach blocked, test interleaved**. Lessons stay single-topic (blocking aids initial
  encoding), but every gate and every review session must interleave topics with a no-3-in-a-row rule (§9.4).
  Add one cumulative mixed block per half-day (Day 1 PM opener mixes Day 1 AM topics, etc.).

## 5. Feedback timing and explanation depth

- The corrective-feedback timing literature (immediate vs. delayed CF) finds **both timings can work**; delayed CF
  often matches or exceeds immediate CF on delayed posttests for new structures, while immediate CF helps
  encoding during communicative tasks
  ([overview, doi:10.1017/s0261444824000478](https://doi.org/10.1017/s0261444824000478);
  [past-tense study, SSLA](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/effects-of-immediate-and-delayed-corrective-feedback-on-l2-development/B4B2D455749B752BD4F6DD636ACD688F);
  [past-passive study, doi:10.1111/modl.12315](https://doi.org/10.1111/modl.12315)).
- For a self-paced written quiz app the synthesis is: **immediate correctness signal + rule explanation, but
  DELAYED retest** — never re-ask the same item back-to-back; require ≥3 intervening items before a missed rule
  resurfaces, so the retest measures retrieval, not echoic memory.
- Explanation depth: keep it shallow-in-the-moment (1 rule + 1 trap + 1 contrastive example + lesson link),
  because the learning event is the *retest*, not the paragraph. Long explanations invite rereading — the exact
  LOW-utility strategy Dunlosky warns against.

## 6. Mastery thresholds: why 80% is the right gate

- Bloom's mastery-learning thesis: ~90% of students can master material given time + corrective feedback loops;
  the gate + correctives + retake cycle IS the method
  ([ERIC ED053419](https://files.eric.ed.gov/fulltext/ED053419.pdf);
  [Guskey's lessons](https://tguskey.com/wp-content/uploads/Mastery-Learning-3-Lessons-of-Mastery-Learning.pdf)).
  The EEF Toolkit likewise treats mastery learning as a structured correctives-driven approach
  ([EEF](https://educationendowmentfoundation.org.uk/)).
- ITS practice converges on **~80% as the advancement threshold**, and a randomized experiment on mastery
  thresholds directly compares threshold levels on downstream learning
  ([JEDM](https://jedm.educationaldatamining.org/index.php/JEDM/article/download/900/253)).
- Sprint consequence: **keep the 80% (24/30) level gate and 6/8 (75%) topic pass** — they sit exactly on the
  field standard. What needs tightening is not the number but the *meaning*: a gate pass with a non-empty
  review deck is not mastery; `mastered` = gate passed AND deck empty for that level's topics (§9.2).

## 7. Load limits and block length

- Microlearning evidence supports **5–15 min focused segments** for retention and engagement
  ([meta-analysis, doi:10.33365/jm.v7i2.517](https://doi.org/10.33365/jm.v7i2.517);
  [review, doi:10.1016/j.heliyon.2024.e41413](https://doi.org/10.1016/j.heliyon.2024.e41413))
  — consistent with the 10+10 topic rhythm.
- The 25-min Pomodoro (Cirillo) has recent efficacy evidence for study focus
  ([PMC review](https://pmc.ncbi.nlm.nih.gov/articles/PMC12532815/)); break-timing research compares fixed
  systematic breaks (e.g. 6 min per 24 min) against self-regulated breaks
  ([BJEP](https://bpspsychub.onlinelibrary.wiley.com/doi/10.1111/bjep.12593);
  [MDPI Flowtime comparison](https://www.mdpi.com/2076-328X/15/7/861)).
- Sprint consequence: **lock blocks at 25/5, max 8/day, with a 20-min break every 4 blocks** (§9.1). Twelve
  topics per half-day is the ceiling, not the floor — if a gate fails, the schedule yields (review replaces
  new content) rather than stacking debt.

## 8. What could kill the sprint (risks, stated plainly)

1. **Fluency illusion**: blocked topic quizzes feel easy (recent exposure) and inflate confidence. The interleaved
   gates are the only honest measure — weight them accordingly in UX copy.
2. **No delayed retention check**: without a Day-7 retest the "≥70% final" proves same-weekend performance only.
3. **Retake gaming**: memorizing fresh-question patterns across rapid retakes. The forced deck-clear + intervening-item
   rule + choice shuffling (already spec'd) are the defense — keep all three.
4. **Cramming collapse**: 48 topics × shallow encoding with zero sleep-adjacent spacing fails. Protect sleep: no new
   content after block 8; Day 2 AM opens with Day 1 interleaved review.

## 9. Eight concrete spec changes (for 01-VISION + 05-TEST-ENGINE)

1. **[01] Block law (exact): 25-min work / 5-min break; 20-min break every 4 blocks; hard cap 8 blocks/day.**
   No new topics after block 8. Gate failures consume the next block as review (schedule yields, debt never stacks).
2. **[01+05] Gate stays 80% (24/30), topic pass stays 6/8 — but redefine mastery:** topic = `mastered` only when
   quiz passed AND zero open deck items for that topic; level = `mastered` only when gate passed AND level deck empty.
   Final stays ≥70% same-weekend, PLUS a recommended Day-7 30Q retest at ≥70% for "durable" status.
3. **[05] Review deck becomes Leitner 3-box with fixed intervals:** Box 1 → resurfaces same block; Box 2 → next block;
   Box 3 → next day; correct recall promotes, wrong demotes to Box 1. Gate retake draws ≥50% from deck items first.
4. **[05] Feedback rule (exact): immediate correctness + ≤3-line explanation** (rule echo + trap + 1 contrastive
   example + lesson link); **retest delay ≥3 intervening items** before the same rule resurfaces. No instant retry.
5. **[05] Retrieval opener:** every lesson opens with 2 cold-recall questions on the previous topic (no explanation
   shown first); wrong answers seed the deck. Every half-day opens with a 10Q cumulative interleaved warm-up.
6. **[05] Interleave constraint (exact):** level gates and warm-ups must satisfy **no 3 consecutive questions from
   the same topic**, enforced by the sampler; topic quizzes stay blocked (single-topic) by design.
7. **[01] Daily load ceiling (exact):** ≤12 new topics per day (≤6 per half-day); each topic = 10-min lesson +
   10-min quiz inside one 25-min block (2 topics/block, 3 blocks per half-day + 1 gate/review block). A1 in Day 1 AM
   means 12 topics = 6 blocks — over budget; either extend Day 1 or cut A1 new-topics to 6/half-day (see note).
8. **[01] Sleep + post-sprint schedule (exact):** Day 2 AM block 1 is Day-1 interleaved review (no new content);
   ship Day-3 / Day-7 / Day-14 review sessions (1 → 3 → 7 expansion) as spec'd features; "sprint complete" without
   Day-7 retest is labeled **provisional**, Day-7 pass upgrades it to **durable**.

*Note on change 7:* as written, 01-VISION schedules 12 topics per half-day at 20 min/topic = 4h = ~8 Pomodoros
with zero slack for gates/retakes — infeasible. Either halve new-topics per half-day (6 new + review/gate blocks)
or extend each day beyond 8 blocks (violates change 1). Recommend: 6 new topics per half-day, 48 topics need
re-scoping (fewer topics or 4-day variant) — flag for 03-CURRICULUM-MAP.
