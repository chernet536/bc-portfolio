import { getSupabase } from "./supabase";
import { cleanVideoUrl } from "./text";
export const safeVideoUrl = cleanVideoUrl;
export const safeLinkUrl = cleanVideoUrl;
export const PAGE_SIZE = 6;
type Cat = { name: string; slug: string } | null;
const norm = <T extends { category: unknown }>(r: T) =>
  ({ ...r, category: (Array.isArray(r.category) ? r.category[0] ?? null : r.category) as Cat });
export const cleanQuery = (q: string) => q.replace(/[%,()*\\]/g, " ").trim().slice(0, 60);
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export async function listPosts(o: { page?: number; q?: string; category?: string; limit?: number } = {}) {
  const page = Math.max(1, o.page ?? 1), size = o.limit ?? PAGE_SIZE, q = cleanQuery(o.q ?? "");
  let query = getSupabase()
    .from("posts")
    .select(`slug,title,excerpt,cover_url,published_at,reading_minutes,category:categories${o.category ? "!inner" : ""}(name,slug)`, { count: "exact" })
    .order("published_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (o.category) query = query.eq("category.slug", o.category);
  if (q) query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
  const { data, error, count } = await query;
  return { items: (data ?? []).map(norm), error, pages: Math.max(1, Math.ceil((count ?? 0) / size)) };
}
export async function listProjects(o: { q?: string; category?: string; featured?: boolean; limit?: number } = {}) {
  const q = cleanQuery(o.q ?? "");
  let query = getSupabase()
    .from("projects")
    .select(`slug,title,summary,cover_url,video_url,doc_url,technologies,published_at,featured,category:categories${o.category ? "!inner" : ""}(name,slug)`)
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (o.limit) query = query.limit(o.limit);
  if (o.category) query = query.eq("category.slug", o.category);
  if (o.featured) query = query.eq("featured", true);
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  const { data, error } = await query;
  return { items: (data ?? []).map(norm), error };
}
export async function getCategories(kind: "post" | "project") {
  const { data } = await getSupabase().from("categories").select("name,slug").eq("kind", kind).order("name");
  return data ?? [];
}
export async function getPost(slug: string) {
  const { data } = await getSupabase().from("posts")
    .select("*,category:categories(id,name,slug),tags:post_tags(tag:tags(name,slug))").eq("slug", slug).maybeSingle();
  return data;
}
export async function getRelatedPosts(categoryId: string | null, excludeSlug: string) {
  if (!categoryId) return [];
  const { data } = await getSupabase().from("posts").select("slug,title,published_at")
    .eq("category_id", categoryId).neq("slug", excludeSlug).order("published_at", { ascending: false }).limit(3);
  return data ?? [];
}
export async function getProject(slug: string) {
  const { data } = await getSupabase().from("projects")
    .select("*,category:categories(name,slug),tags:project_tags(tag:tags(name,slug))").eq("slug", slug).maybeSingle();
  return data;
}

/** Profile photo URL saved from /admin > Profile photo (table site_settings, key "profile_photo"). */
export async function getProfilePhoto(): Promise<string | null> {
  try {
    const { data } = await getSupabase().from("site_settings").select("value").eq("key", "profile_photo").maybeSingle();
    const url = (data?.value as { url?: unknown } | null)?.url;
    return typeof url === "string" && /^https?:\/\//.test(url) ? url : null;
  } catch { return null; }
}
