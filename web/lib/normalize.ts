/**
 * Rewrite-answer normalization pipeline (`type: rewrite` checking).
 *
 * Exact-match compare after: trim → lowercase → NFKC fold →
 * curly-apostrophe fold → contraction expansion (fixed map, e.g.
 * `doesn't` → `does not`, `I'm` → `I am`) → strip trailing `.`/`!`/`?`
 * → collapse inner whitespace. Anything not in the question's `accept`
 * list after this pipeline is wrong (no fuzzy credit in v1).
 *
 * See `Docs/04-QUESTION-BANK-SPEC.md` (rewrite row) and
 * `Docs/research/03-question-engineering.md` §4.
 */

/**
 * Fixed contraction → expansion map.
 * All keys are lowercase with a straight apostrophe; the input is
 * lowercased and apostrophe-folded before lookup, so `Doesn't`,
 * `DOESN’T` and `doesn't` all hit the same entry.
 */
const CONTRACTIONS: Record<string, string> = {
  "can't": "cannot",
  "won't": "will not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "hasn't": "has not",
  "haven't": "have not",
  "hadn't": "had not",
  "couldn't": "could not",
  "shouldn't": "should not",
  "wouldn't": "would not",
  "mustn't": "must not",
  "needn't": "need not",
  "i'm": "i am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "we're": "we are",
  "they're": "they are",
  "that's": "that is",
  "there's": "there is",
  "what's": "what is",
  "who's": "who is",
  "where's": "where is",
  "when's": "when is",
  "why's": "why is",
  "how's": "how is",
  "here's": "here is",
  "let's": "let us",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "i'll": "i will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "it'll": "it will",
  "we'll": "we will",
  "they'll": "they will",
  "i'd": "i would",
  "you'd": "you would",
  "he'd": "he would",
  "she'd": "she would",
  "we'd": "we would",
  "they'd": "they would",
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest-first alternation so `she's` wins over any shorter overlap. */
const CONTRACTION_PATTERN = new RegExp(
  `\\b(${Object.keys(CONTRACTIONS)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|")})\\b`,
  "g",
);

/**
 * Run the full normalization pipeline over a raw learner answer (or an
 * `accept` variant — both sides go through the same stages, so compare
 * is always normalized-to-normalized).
 */
export function normalizeAnswer(raw: string): string {
  let out = raw.trim().toLowerCase().normalize("NFKC");
  // Fold curly/single-quote apostrophes to the straight form used as map keys.
  out = out.replace(/[‘’‛]/g, "'");
  out = out.replace(CONTRACTION_PATTERN, (match) => CONTRACTIONS[match] ?? match);
  // Strip trailing sentence punctuation (`.`, `!`, `?`, or runs like `?!`).
  out = out.replace(/[.?!]+$/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

/**
 * True when the learner's rewrite matches any accepted variant after
 * normalization. Empty input is always wrong (never matches, even if an
 * `accept` list were degenerate).
 */
export function isRewriteCorrect(
  userAnswer: string,
  accepted: readonly string[],
): boolean {
  const normalized = normalizeAnswer(userAnswer);
  if (normalized.length === 0) {
    return false;
  }
  return accepted.some((variant) => normalizeAnswer(variant) === normalized);
}
