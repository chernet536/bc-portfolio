import type { APIRoute } from "astro";
import { getSupabase } from "../lib/supabase";
export const GET: APIRoute = async ({ site, url }) => {
  const base = site ?? new URL(url.origin), db = getSupabase();
  const [p, j] = await Promise.all([db.from("posts").select("slug,updated_at"), db.from("projects").select("slug,updated_at")]);
  const row = (path: string, d?: string) => `<url><loc>${new URL(path, base).href}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`;
  const urls = ["/", "/about", "/projects", "/blog", "/contact"].map((x) => row(x))
    .concat((p.data ?? []).map((x) => row(`/blog/${x.slug}`, x.updated_at)), (j.data ?? []).map((x) => row(`/projects/${x.slug}`, x.updated_at)));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml", "Cache-Control": "public, s-maxage=300" } });
};
