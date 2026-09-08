import { ArrowRight, BookOpen, ClipboardCheck, Flag } from "lucide-react";

const LEVELS = [
  {
    code: "A1",
    name: "Breakthrough",
    blurb: "Be, present tenses, articles, plurals, everyday prepositions.",
    topics: 12,
    questions: 300,
  },
  {
    code: "A2",
    name: "Waystage",
    blurb: "Past tenses, going to / will, comparatives, conditionals zero + one.",
    topics: 12,
    questions: 300,
  },
  {
    code: "B1",
    name: "Threshold",
    blurb: "Perfect tenses, passive, reported speech, second + third conditional.",
    topics: 12,
    questions: 300,
  },
  {
    code: "B2",
    name: "Vantage",
    blurb: "Mixed conditionals, inversion, clefts, narrative tenses.",
    topics: 12,
    questions: 300,
  },
] as const;

const STEPS = [
  {
    icon: BookOpen,
    title: "1 · Learn",
    text: "One compact lesson per topic: forms table, examples, traps to avoid.",
  },
  {
    icon: ClipboardCheck,
    title: "2 · Quiz",
    text: "8 questions per topic, unseen-first — every miss shows the rule.",
  },
  {
    icon: Flag,
    title: "3 · Gate",
    text: "Score 80%+ on the mixed level gate to unlock the next level.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="narrow">
      <section className="hero">
        <span className="hero-kicker">A1 → B2 · Two-day sprint</span>
        <h1>English grammar, sprinted — not studied.</h1>
        <p className="lead">
          Forty-eight compact lessons and 1,200 practice questions. Learn a
          topic, quiz it the same hour, and clear the level gate to move on.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#levels">
            Start the sprint
            <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
          </a>
          <a className="btn btn-ghost" href="#how">
            How it works
          </a>
        </div>
        <div className="stat-strip" aria-label="Sprint at a glance">
          <div className="stat">
            <span className="num">48</span>
            <span className="lbl">topics</span>
          </div>
          <div className="stat">
            <span className="num">1,200</span>
            <span className="lbl">questions</span>
          </div>
          <div className="stat">
            <span className="num">4</span>
            <span className="lbl">level gates</span>
          </div>
          <div className="stat">
            <span className="num">80%</span>
            <span className="lbl">to unlock next</span>
          </div>
        </div>
      </section>

      <h2 className="section-title" id="levels">
        The four levels
      </h2>
      <p className="section-sub">
        Day one covers A1–A2, day two B1–B2. Each level ends with a mixed gate
        test.
      </p>
      <section className="level-grid" aria-label="CEFR levels">
        {LEVELS.map((level) => (
          <article
            className="level-card"
            key={level.code}
            id={`level-${level.code.toLowerCase()}`}
          >
            <h3>{level.code}</h3>
            <p>
              <strong>{level.name}.</strong> {level.blurb}
            </p>
            <div className="meta">
              <span>
                {level.topics} topics · {level.questions} questions
              </span>
            </div>
          </article>
        ))}
      </section>

      <h2 className="section-title" id="how">
        How a sprint hour works
      </h2>
      <p className="section-sub">
        Repeat the same tight loop for every topic — no planning overhead.
      </p>
      <section className="how-steps" aria-label="How it works">
        {STEPS.map((step) => (
          <article className="how-step" key={step.title}>
            <span className="step-icon" aria-hidden="true">
              <step.icon size={20} strokeWidth={1.8} />
            </span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
