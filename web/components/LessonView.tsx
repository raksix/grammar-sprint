/**
 * LessonView — presentational renderer for one parsed lesson (P22).
 *
 * Server component: zero client JS (quick-check answers use native
 * `<details>`, all HTML is prerendered at build). Receives a `ParsedLesson`
 * plus prev/next neighbours inside the same level; every link it renders
 * points at a route that exists (`/` and `/levels/[level]` and
 * `/learn/[topic]`). The learn → quiz CTA lands with P23 (`QuizCard` +
 * `/quiz/[topic]`), deliberately not here — no dead buttons.
 */

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Crosshair,
  ExternalLink,
  ListOrdered,
  PenLine,
  Table,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ParsedLesson } from "../lib/lessons";
import { LEVELS_META } from "../lib/topics";

export interface LessonNavTarget {
  slug: string;
  title: string;
}

function Section({
  id,
  icon: Icon,
  title,
  hint,
  html,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  html: string;
}) {
  return (
    <section className={`lesson-sec lesson-sec-${id}`} aria-label={title}>
      <h2 className="lesson-sec-head">
        <span className="lesson-sec-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <span className="lesson-sec-title">{title}</span>
        <span className="lesson-sec-hint">{hint}</span>
      </h2>
      <div
        className="lesson-sec-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

export default function LessonView({
  lesson,
  prev,
  next,
}: {
  lesson: ParsedLesson;
  prev?: LessonNavTarget;
  next?: LessonNavTarget;
}) {
  const meta = LEVELS_META[lesson.level];
  const position = `${String(lesson.index + 1).padStart(2, "0")} / 12`;
  return (
    <div className="narrow lesson">
      <nav aria-label="Breadcrumb">
        <a className="back-link" href={`/levels/${lesson.level}`}>
          {lesson.level} topics
        </a>
      </nav>

      <header className="lesson-head">
        <span className="hero-kicker">
          {lesson.code} · {meta.code} {meta.name} · {position}
        </span>
        <h1>{lesson.title}</h1>
        <div
          className="lesson-goal"
          dangerouslySetInnerHTML={{ __html: lesson.goalHtml }}
        />
      </header>

      <Section
        id="rule"
        icon={Zap}
        title="Rule in 60 seconds"
        hint="The one pattern to memorise."
        html={lesson.ruleHtml}
      />
      <Section
        id="forms"
        icon={Table}
        title="Forms"
        hint="How it looks in sentences."
        html={lesson.formsHtml}
      />
      <Section
        id="traps"
        icon={TriangleAlert}
        title="3 classic traps"
        hint="Where Turkish speakers slip."
        html={lesson.trapsHtml}
      />
      <Section
        id="examples"
        icon={ListOrdered}
        title="10 example sentences"
        hint="Read aloud, twice."
        html={lesson.examplesHtml}
      />
      <Section
        id="quick-check"
        icon={PenLine}
        title="Quick check"
        hint="Cover the answers, say yours first."
        html={lesson.quickCheckHtml}
      />

      {lesson.sources.length > 0 ? (
        <section className="lesson-sec lesson-sec-sources" aria-label="Sources">
          <h2 className="lesson-sec-head">
            <span className="lesson-sec-icon" aria-hidden="true">
              <BookOpen size={18} strokeWidth={1.8} />
            </span>
            <span className="lesson-sec-title">Sources</span>
            <span className="lesson-sec-hint">Keep reading.</span>
          </h2>
          <ul className="lesson-sources">
            {lesson.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} rel="noopener">
                  <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="lesson-pager" aria-label="More topics">
        {prev !== undefined ? (
          <a className="pager-link pager-prev" href={`/learn/${prev.slug}`}>
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              <span className="pager-dir">Previous</span>
              <span className="pager-title">{prev.title}</span>
            </span>
          </a>
        ) : (
          <span className="pager-link pager-empty" aria-hidden="true" />
        )}
        <a className="pager-link pager-level" href={`/levels/${lesson.level}`}>
          <Crosshair size={16} strokeWidth={2} aria-hidden="true" />
          <span>
            <span className="pager-dir">Level</span>
            <span className="pager-title">
              All {lesson.level} topics
            </span>
          </span>
        </a>
        {next !== undefined ? (
          <a className="pager-link pager-next" href={`/learn/${next.slug}`}>
            <span>
              <span className="pager-dir">Next</span>
              <span className="pager-title">{next.title}</span>
            </span>
            <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
          </a>
        ) : (
          <span className="pager-link pager-empty" aria-hidden="true" />
        )}
      </nav>
    </div>
  );
}
