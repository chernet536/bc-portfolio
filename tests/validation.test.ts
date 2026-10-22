import { describe, it, expect } from "vitest";
import { validateContact } from "../src/lib/validation";
describe("validateContact", () => {
  it("accepts a valid message", () => expect(validateContact({ name: "A", email: "a@b.co", body: "Hello there" }).ok).toBe(true));
  it("rejects bad email and short body", () => {
    const r = validateContact({ name: "A", email: "nope", body: "hi" });
    expect(r.ok).toBe(false); if (!r.ok) expect(Object.keys(r.errors)).toEqual(["email", "body"]);
  });
  it("flags honeypot as spam", () => { const r = validateContact({ name: "A", email: "a@b.co", body: "Hello there", website: "x" }); expect(!r.ok && r.spam).toBe(true); });
  it("rejects non-string input", () => expect(validateContact({ name: 5, email: null, body: {} }).ok).toBe(false));
});
