import type { Metadata } from "next";
import FinalCard from "../../components/FinalCard";
import { loadAllQuestions } from "../../lib/level-bank";

export const metadata: Metadata = {
  title: "Final sprint — Grammar Sprint",
  description:
    "50 questions across A1 to B2: 70% completes the 2-day grammar sprint.",
};

export default function FinalPage() {
  const pool = loadAllQuestions();
  return (
    <div className="narrow">
      <nav aria-label="Breadcrumb">
        <a className="back-link" href="/stats">
          My stats
        </a>
      </nav>
      <header className="quiz-head">
        <span className="hero-kicker">
          A1 → B2 · 50 questions · needs 70%
        </span>
        <h1>Final sprint</h1>
        <p className="lead">
          Everything from the last two days in one mixed run. Fresh unseen
          questions every attempt — your best score sticks.
        </p>
      </header>
      <FinalCard pool={pool} />
    </div>
  );
}
