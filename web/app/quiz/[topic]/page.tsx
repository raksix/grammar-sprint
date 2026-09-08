import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuizCard from "../../../components/QuizCard";
import { getLessonSlugs } from "../../../lib/lessons";
import { loadTopicQuestions } from "../../../lib/topic-bank";
import { getTopic, type TopicMeta } from "../../../lib/topics";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ topic: string }> {
  return getLessonSlugs().map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: raw } = await params;
  const meta = getTopic(raw ?? "");
  if (meta === undefined) return { title: "Unknown quiz — Grammar Sprint" };
  return {
    title: `Quiz: ${meta.title} — Grammar Sprint`,
    description: `8-question ${meta.level} quiz on ${meta.title}: instant rule feedback, adaptive difficulty.`,
  };
}

export default async function QuizTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: raw } = await params;
  const meta: TopicMeta | undefined = getTopic(raw ?? "");
  if (meta === undefined) notFound();
  let pool;
  try {
    pool = loadTopicQuestions(meta.slug);
  } catch {
    notFound();
  }
  return (
    <div className="narrow">
      <nav aria-label="Breadcrumb">
        <a className="back-link" href={`/learn/${meta.slug}`}>
          Lesson: {meta.title}
        </a>
      </nav>
      <header className="quiz-head">
        <span className="hero-kicker">
          {meta.level} quiz · 8 questions · adapts as you answer
        </span>
        <h1>Quiz: {meta.title}</h1>
        <p className="lead">
          3 easy, 3 medium, 2 hard. Every miss shows the rule in Turkish with
          a link back to the lesson.
        </p>
      </header>
      <QuizCard
        pool={pool}
        slug={meta.slug}
        level={meta.level}
        title={meta.title}
      />
    </div>
  );
}
