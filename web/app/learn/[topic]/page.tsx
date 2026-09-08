import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LessonView from "../../../components/LessonView";
import { getLessonSlugs, loadLesson } from "../../../lib/lessons";
import { TOPICS_BY_LEVEL, getTopic, type TopicMeta } from "../../../lib/topics";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ topic: string }> {
  return getLessonSlugs().map((topic) => ({ topic }));
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: raw } = await params;
  const meta = getTopic(raw ?? "");
  if (meta === undefined) return { title: "Unknown topic — Grammar Sprint" };
  try {
    const lesson = loadLesson(meta.slug);
    return {
      title: `${lesson.code} ${lesson.title} — Grammar Sprint`,
      description: `Learn ${lesson.title} (${lesson.level}): ${plainText(lesson.goalHtml).slice(0, 140)}`,
    };
  } catch {
    return { title: `${meta.title} — Grammar Sprint` };
  }
}

function neighbours(topic: TopicMeta): {
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
} {
  const siblings = TOPICS_BY_LEVEL[topic.level];
  const prevTopic = siblings[topic.index - 1];
  const nextTopic = siblings[topic.index + 1];
  return {
    ...(prevTopic !== undefined
      ? { prev: { slug: prevTopic.slug, title: prevTopic.title } }
      : {}),
    ...(nextTopic !== undefined
      ? { next: { slug: nextTopic.slug, title: nextTopic.title } }
      : {}),
  };
}

export default async function LearnTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: raw } = await params;
  const meta = getTopic(raw ?? "");
  if (meta === undefined) notFound();
  let lesson;
  try {
    lesson = loadLesson(meta.slug);
  } catch {
    notFound();
  }
  const { prev, next } = neighbours(meta);
  return <LessonView lesson={lesson} prev={prev} next={next} />;
}
