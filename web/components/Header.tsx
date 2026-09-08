"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Lock, Moon, Sun, Trophy } from "lucide-react";
import {
  defaultProgress,
  loadProgress,
  type ProgressState,
} from "../lib/progress";
import { LEVEL_ORDER, isLevelUnlocked } from "../lib/topics";

type Theme = "light" | "dark";

function resolveInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.getAttribute("data-theme");
    if (fromDom === "light" || fromDom === "dark") return fromDom;
  }
  try {
    const stored = window.localStorage.getItem("gs-theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* storage unavailable — fall through to system preference */
  }
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export default function Header() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(() =>
    defaultProgress(),
  );

  useEffect(() => {
    setTheme(resolveInitialTheme());
    setMounted(true);
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("gs-theme", theme);
    } catch {
      /* private mode etc. — theme still applies for this session */
    }
  }, [theme, mounted]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand" href="/" aria-label="Grammar Sprint home">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span className="brand-word">Grammar Sprint</span>
        </a>
        <nav className="stepper" aria-label="CEFR levels">
          {LEVEL_ORDER.map((level, i) => {
            const unlocked = isLevelUnlocked(level, progress.gates);
            const cleared = progress.gates[level]?.passed === true;
            return (
              <span
                key={level}
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {i > 0 && (
                  <span className="sep" aria-hidden="true">
                    &rsaquo;
                  </span>
                )}
                <a
                  href={`/levels/${level}`}
                  className={
                    cleared
                      ? "step-cleared"
                      : unlocked
                        ? "step-open"
                        : "step-locked"
                  }
                  aria-label={`${level} level${cleared ? " — gate cleared" : unlocked ? "" : " — locked, clear the previous gate"}`}
                >
                  {cleared ? (
                    <CheckCircle2
                      size={13}
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                  ) : unlocked ? null : (
                    <Lock size={13} strokeWidth={2.2} aria-hidden="true" />
                  )}
                  {level}
                </a>
              </span>
            );
          })}
        </nav>
        <a
          className="xp-pill"
          href="/stats"
          aria-label={`${progress.xp.toLocaleString("en-US")} XP — view stats`}
          title="View stats"
        >
          <Trophy size={15} strokeWidth={2} aria-hidden="true" />
          <span className="xp-num">
            {progress.xp.toLocaleString("en-US")}
          </span>
          <span className="xp-lbl">XP</span>
        </a>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
          title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          {mounted ? (
            theme === "light" ? (
              <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Sun size={18} strokeWidth={1.8} aria-hidden="true" />
            )
          ) : (
            <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
