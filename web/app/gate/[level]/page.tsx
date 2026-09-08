import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GateCard from "../../../components/GateCard";
import { LEVELS } from "../../../lib/bank";
import type { Level } from "../../../lib/bank";
import { loadLevelQuestions } from "../../../lib/level-bank";
import { LEVELS_META, parseLevelParam } from "../../../lib/topics";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ level: string }> {
  return LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level: raw } = await params;
  const level = parseLevelParam(raw ?? "");
  if (level === undefined) return { title: "Unknown gate — Grammar Sprint" };
  const meta = LEVELS_META[level];
  return {
    title: `${meta.code} gate — Grammar Sprint`,
    description: `30-question ${meta.code} ${meta.name} gate: pass at 80% to unlock the next level.`,
  };
}

export default async function GateLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level: raw } = await params;
  const level: Level | undefined = parseLevelParam(raw ?? "");
  if (level === undefined) notFound();
  let pool;
  try {
    pool = loadLevelQuestions(level);
  } catch {
    notFound();
  }
  const meta = LEVELS_META[level];
  return (
    <div className="narrow">
      <nav aria-label="Breadcrumb">
        <a className="back-link" href={`/levels/${level}`}>
          {level} topics
        </a>
      </nav>
      <header className="quiz-head">
        <span className="hero-kicker">
          {meta.code} {meta.name} · 30 questions · needs 80%
        </span>
        <h1>{level} gate</h1>
        <p className="lead">
          Mixed questions from all 12 {level} topics. Pass at 80% to unlock
          the next level — a fail locks retake until your review deck is
          clear.
        </p>
      </header>
      <GateCard pool={pool} level={level} />
    </div>
  );
}
