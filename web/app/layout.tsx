import type { Metadata } from "next";
import Header from "../components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grammar Sprint — A1 to B2 English grammar in 2 days",
  description:
    "Lesson, quiz, level gate: sprint through A1 to B2 English grammar in two focused days.",
};

const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("gs-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <div className="shell">
          <Header />
          <main className="main-col">{children}</main>
          <footer className="site-footer">
            Grammar Sprint — open-source CEFR grammar trainer (MIT).
          </footer>
        </div>
      </body>
    </html>
  );
}
