import { describe, it, expect } from "vitest";
import { highlightCode } from "../src/lib/highlight";
describe("highlightCode", () => {
  it("highlights a labelled block", () => expect(highlightCode('<pre><code class="language-sql">select 1 from t</code></pre>')).toContain("hljs-keyword"));
  it("never lets markup through", () => {
    const out = highlightCode("<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>");
    expect(out).not.toContain("<script>");
  });
  it("leaves text without code blocks untouched", () => expect(highlightCode("<p>hi</p>")).toBe("<p>hi</p>"));
});
