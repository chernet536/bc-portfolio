import { describe, it, expect } from "vitest";
import { slugify, isSlug, readingMinutes, checkImage, cleanVideoUrl } from "../src/lib/text";
describe("text helpers", () => {
  it("slugifies titles", () => expect(slugify("  Business Central: Data Archiving! ")).toBe("business-central-data-archiving"));
  it("validates slugs", () => { expect(isSlug("a-b")).toBe(true); expect(isSlug("A b")).toBe(false); expect(isSlug("a--b")).toBe(false); });
  it("estimates reading time", () => { expect(readingMinutes("<p>hi</p>")).toBe(1); expect(readingMinutes("<p>" + "word ".repeat(450) + "</p>")).toBe(3); });
  it("rejects bad uploads", () => {
    expect(checkImage({ type: "application/pdf", size: 10 })).not.toBeNull();
    expect(checkImage({ type: "image/png", size: 6 * 1024 * 1024 })).not.toBeNull();
    expect(checkImage({ type: "image/png", size: 1000 })).toBeNull();
  });
  it("accepts only http(s) video links", () => {
    expect(cleanVideoUrl("https://youtu.be/abc123")).toBe("https://youtu.be/abc123");
    expect(cleanVideoUrl("  https://vimeo.com/1 ")).toBe("https://vimeo.com/1");
    expect(cleanVideoUrl("javascript:alert(1)")).toBeNull();
    expect(cleanVideoUrl("not a url")).toBeNull();
    expect(cleanVideoUrl("")).toBeNull();
  });
});
