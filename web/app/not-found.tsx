import type { Metadata } from "next";
import { Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found — Grammar Sprint",
  description:
    "This page does not exist. Jump back into the A1 to B2 grammar sprint.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="narrow not-found">
      <Compass size={40} strokeWidth={1.6} aria-hidden="true" />
      <h1>Lost on the trail?</h1>
      <p className="lead">
        This page is not part of the sprint. Your progress is safe — pick up
        where you left off.
      </p>
      <div className="cta-row">
        <a className="btn btn-primary" href="/">
          Back to the start
        </a>
        <a className="btn btn-ghost" href="/levels/A1">
          A1 topics
        </a>
        <a className="btn btn-ghost" href="/review">
          Review deck
        </a>
      </div>
    </div>
  );
}
