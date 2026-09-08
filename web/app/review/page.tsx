import type { Metadata } from "next";
import ReviewDeck from "../../components/ReviewDeck";
import { loadAllQuestions } from "../../lib/level-bank";

export const metadata: Metadata = {
  title: "Review deck — Grammar Sprint",
  description:
    "Re-answer every missed question once to clear the deck and unlock gate retakes.",
};

export default function ReviewPage() {
  const pool = loadAllQuestions();
  return (
    <div className="narrow">
      <nav aria-label="Breadcrumb">
        <a className="back-link" href="/stats">
          My stats
        </a>
      </nav>
      <header className="quiz-head">
        <span className="hero-kicker">Missed questions · one correct re-answer clears each</span>
        <h1>Review deck</h1>
        <p className="lead">
          A correct answer drops the card; a miss sends it to the back of
          the queue. Clear the whole deck to unlock a failed gate&apos;s
          retake.
        </p>
      </header>
      <ReviewDeck pool={pool} />
    </div>
  );
}
