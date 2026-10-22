export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
export const isSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 120;
export const readingMinutes = (html: string) =>
  Math.max(1, Math.ceil(html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length / 200));
export const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function checkImage(f: { type: string; size: number }) {
  if (!ALLOWED_IMAGES.includes(f.type)) return "Use a JPEG, PNG, WebP or GIF image.";
  if (f.size > MAX_IMAGE_BYTES) return "The image must be 5 MB or smaller.";
  return null;
}
/** Returns a safe http(s) URL, or null. Blocks javascript:, data: and other schemes. */
export function cleanVideoUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > 500) return null;
  try { const u = new URL(t); return u.protocol === "https:" || u.protocol === "http:" ? u.href : null; } catch { return null; }
}
