"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

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

const LEVELS = ["A1", "A2", "B1", "B2"] as const;

export default function Header() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(resolveInitialTheme());
    setMounted(true);
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
          {LEVELS.map((level, i) => (
            <span key={level} style={{ display: "inline-flex", alignItems: "center" }}>
              {i > 0 && (
                <span className="sep" aria-hidden="true">
                  &rsaquo;
                </span>
              )}
              <a href={`/#level-${level.toLowerCase()}`}>{level}</a>
            </span>
          ))}
        </nav>
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
