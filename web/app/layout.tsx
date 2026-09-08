import type { Metadata, Viewport } from "next";
import Header from "../components/Header";
import "./globals.css";

const SITE_URL = "http://learneng.fermag.com.tr";
const SITE_NAME = "Grammar Sprint";
const SITE_TAGLINE =
  "Lesson, quiz, level gate: sprint through A1 to B2 English grammar in two focused days.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Grammar Sprint — A1 to B2 English grammar in 2 days",
  description: SITE_TAGLINE,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: "Grammar Sprint — A1 to B2 English grammar in 2 days",
    description: SITE_TAGLINE,
  },
  twitter: {
    card: "summary",
    title: "Grammar Sprint — A1 to B2 English grammar in 2 days",
    description: SITE_TAGLINE,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF9F5",
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
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Header />
          <main className="main-col" id="main-content" tabIndex={-1}>
            {children}
          </main>
          <footer className="site-footer">
            <span>
              Grammar Sprint — open-source CEFR grammar trainer (MIT).
            </span>
            <nav className="site-footer-nav" aria-label="Footer">
              <a href="/levels/A1">Levels</a>
              <a href="/review">Review deck</a>
              <a href="/stats">Stats</a>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
