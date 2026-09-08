import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LevelMap from "../../../components/LevelMap";
import { LEVELS } from "../../../lib/bank";
import { LEVELS_META, parseLevelParam } from "../../../lib/topics";

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
  if (level === undefined) return { title: "Unknown level — Grammar Sprint" };
  const meta = LEVELS_META[level];
  return {
    title: `${meta.code} topics (${meta.name}) — Grammar Sprint`,
    description: `${meta.code} ${meta.name}: ${meta.blurb}`,
  };
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level: raw } = await params;
  const level = parseLevelParam(raw ?? "");
  if (level === undefined) notFound();
  return <LevelMap level={level} />;
}
