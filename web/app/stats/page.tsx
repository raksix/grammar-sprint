import type { Metadata } from "next";
import StatsView from "../../components/StatsView";

export const metadata: Metadata = {
  title: "My stats — Grammar Sprint",
  description:
    "XP, mastered topics, gate results and what needs restudy.",
};

export default function StatsPage() {
  return <StatsView />;
}
