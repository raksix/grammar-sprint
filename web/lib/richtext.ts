/**
 * richtext.ts — safe minimal rich-text for bank `explain_tr` / `trap_tr`.
 *
 * Bank authors write `<b>`, `<i>`, `<code>` (and `<br>`) inside explanation
 * strings. React escapes those to literal text, so this module converts them
 * to real markup through a strict allowlist: plain text and every
 * non-allowlisted tag is HTML-escaped; allowlisted tags pass only bare
 * (no attributes), and a closing tag passes only when its matching opening
 * tag already passed. Event handlers, links, scripts, and mismatched
 * closings stay inert text.
 */

const ALLOWED = new Set(["b", "strong", "i", "em", "code", "br"]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape everything except matched bare allowlisted tag pairs. */
export function richText(source: string): string {
  const openCounts = new Map<string, number>();
  const parts = source.split(/(<\/?[a-zA-Z]+[^<>]*>)/g);
  return parts
    .map((part) => {
      const m = part.match(/^<(\/?)([a-zA-Z]+)([^<>]*)>$/);
      if (m === null) return escapeHtml(part);
      const slash = m[1] ?? "";
      const name = (m[2] ?? "").toLowerCase();
      const attrs = m[3] ?? "";
      if (!ALLOWED.has(name)) return escapeHtml(part);
      if (name === "br") return "<br>";
      if (slash === "/") {
        const open = openCounts.get(name) ?? 0;
        if (open <= 0) return escapeHtml(part);
        openCounts.set(name, open - 1);
        return `</${name}>`;
      }
      if (attrs.trim().length > 0) return escapeHtml(part);
      openCounts.set(name, (openCounts.get(name) ?? 0) + 1);
      return `<${name}>`;
    })
    .join("");
}
