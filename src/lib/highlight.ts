import hljs from "highlight.js/lib/core";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import javascript from "highlight.js/lib/languages/javascript";
import powershell from "highlight.js/lib/languages/powershell";
import bash from "highlight.js/lib/languages/bash";
import delphi from "highlight.js/lib/languages/delphi"; // closest to AL (Pascal-like)
const langs = { sql, json, xml, javascript, powershell, bash, delphi };
for (const [n, l] of Object.entries(langs)) hljs.registerLanguage(n, l);
const unescape = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** Highlights <pre><code> blocks in already-sanitized article HTML. Output is escaped by highlight.js. */
export function highlightCode(html: string): string {
  return html.replace(/<pre><code(?: class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g, (_m, lang: string | undefined, code: string) => {
    const text = unescape(code), l = lang === "al" ? "delphi" : lang;
    const r = l && hljs.getLanguage(l) ? hljs.highlight(text, { language: l, ignoreIllegals: true }) : hljs.highlightAuto(text, Object.keys(langs));
    return `<pre><code class="hljs">${r.value}</code></pre>`;
  });
}
