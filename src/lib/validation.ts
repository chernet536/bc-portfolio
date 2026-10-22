export type ContactInput = { name: string; email: string; body: string };
export function validateContact(f: Record<string, unknown>) {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (s(f.website)) return { ok: false as const, spam: true, errors: {} as Record<string, string> };
  const value: ContactInput = { name: s(f.name), email: s(f.email), body: s(f.body) };
  const errors: Record<string, string> = {};
  if (!value.name || value.name.length > 100) errors.name = "Enter your name (100 characters max).";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email) || value.email.length > 200) errors.email = "Enter a valid email address.";
  if (value.body.length < 5 || value.body.length > 5000) errors.body = "Write a message of 5 to 5000 characters.";
  return Object.keys(errors).length ? { ok: false as const, spam: false, errors } : { ok: true as const, value };
}
