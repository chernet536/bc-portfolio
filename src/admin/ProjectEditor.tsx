import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { sb } from "../lib/browser";
import { slugify, isSlug, cleanVideoUrl } from "../lib/text";
import RichField from "./RichField";
import { uploadImage } from "./PostEditor";

const blank = { title: "", slug: "", summary: "", category_id: "", cover_url: "", video_url: "", doc_url: "", technologies: "", tags: "", featured: false, status: "draft",
  published_at: "", seo_title: "", seo_description: "", description_html: "", business_problem_html: "", solution_html: "", implementation_html: "", screenshots: [] as string[] };
const toLocal = (d: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const RICH: [string, string][] = [["description_html", "Overview"], ["business_problem_html", "Business problem"], ["solution_html", "Solution and architecture"], ["implementation_html", "Technical implementation"]];

export default function ProjectEditor({ id: initialId, onDone }: { id: string | null; onDone: () => void }) {
  const [id, setId] = useState(initialId), [f, setF] = useState<any>(blank), [cats, setCats] = useState<any[]>([]);
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initialId);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  useEffect(() => { sb.from("categories").select("id,name").eq("kind", "project").order("name").then(({ data }) => setCats(data ?? [])); }, []);
  useEffect(() => {
    if (!initialId) return;
    sb.from("projects").select("*,tags:project_tags(tag:tags(name))").eq("id", initialId).single().then(({ data, error }) => {
      if (error || !data) return setErr("Could not load this project.");
      setF({ ...blank, ...data, category_id: data.category_id ?? "", cover_url: data.cover_url ?? "", video_url: data.video_url ?? "", doc_url: data.doc_url ?? "", seo_title: data.seo_title ?? "", seo_description: data.seo_description ?? "",
        published_at: toLocal(data.published_at), technologies: data.technologies.join(", "), tags: data.tags.map((t: any) => t.tag.name).join(", ") });
    });
  }, [initialId]);
  const pick = async (file: File | undefined, apply: (u: string) => void) => { if (!file) return; setErr(""); try { apply(await uploadImage(file)); } catch (e: any) { setErr(e.message); } };

  async function save(status: "draft" | "published") {
    setErr(""); setMsg("");
    const slug = f.slug || slugify(f.title);
    if (!f.title.trim()) return setErr("Enter a title.");
    if (!isSlug(slug)) return setErr("The slug may contain only lowercase letters, numbers and single hyphens.");
    const video = f.video_url.trim() ? cleanVideoUrl(f.video_url) : null;
    if (f.video_url.trim() && !video) return setErr("The demo video link must be a full web address starting with https://");
    const docLink = f.doc_url.trim() ? cleanVideoUrl(f.doc_url) : null;
    if (f.doc_url.trim() && !docLink) return setErr("The documentation link must be a full web address starting with https://");
    const publishedAt = status === "published" ? new Date(f.published_at || Date.now()).toISOString() : f.published_at ? new Date(f.published_at).toISOString() : null;
    const row: any = { slug, title: f.title.trim(), summary: f.summary, cover_url: f.cover_url || null, video_url: video, doc_url: docLink, category_id: f.category_id || null, status, featured: f.featured,
      published_at: publishedAt, seo_title: f.seo_title || null, seo_description: f.seo_description || null, screenshots: f.screenshots,
      technologies: f.technologies.split(",").map((t: string) => t.trim()).filter(Boolean) };
    for (const [k] of RICH) row[k] = DOMPurify.sanitize(f[k]);
    setBusy(true); setMsg("Saving");
    const res = id ? await sb.from("projects").update(row).eq("id", id).select("id").single() : await sb.from("projects").insert(row).select("id").single();
    if (res.error || !res.data) { setMsg(""); setBusy(false); return setErr(res.error?.code === "23505" ? "Another project already uses this slug. Choose a different one." : "Save failed. Your changes were not stored."); }
    const pid = res.data.id; setId(pid);
    const names = [...new Set<string>(f.tags.split(",").map((t: string) => t.trim()).filter(Boolean))];
    await sb.from("project_tags").delete().eq("project_id", pid);
    if (names.length) {
      const up = await sb.from("tags").upsert(names.map((n) => ({ name: n, slug: slugify(n) })).filter((t) => t.slug), { onConflict: "slug" }).select("id");
      if (up.data?.length) await sb.from("project_tags").insert(up.data.map((t: any) => ({ project_id: pid, tag_id: t.id })));
    }
    setF((p: any) => ({ ...p, slug, status, published_at: toLocal(publishedAt) }));
    setMsg(`${status === "published" ? "Published" : "Draft saved"} at ${new Date().toLocaleTimeString("en-GB")}`); setBusy(false);
  }
  async function remove() {
    if (!id || !confirm("Delete this project permanently?")) return;
    const { error } = await sb.from("projects").delete().eq("id", id); if (error) setErr("Delete failed."); else onDone();
  }
  return (<div><p><button className="secondary" onClick={onDone}>Back to projects</button></p>
    <h1>{id ? "Edit project" : "New project"}</h1><p>Status: <strong>{f.status}</strong></p>
    <label htmlFor="t">Title</label><input id="t" value={f.title} maxLength={200} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
    <label htmlFor="s">Slug (the URL: /projects/{f.slug || "…"})</label><input id="s" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
    <label htmlFor="x">Summary</label><textarea id="x" rows={2} maxLength={500} value={f.summary} onChange={(e) => set("summary", e.target.value)} />
    <div className="row2"><div><label htmlFor="c">Category</label><select id="c" value={f.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label htmlFor="tg">Tags (comma separated)</label><input id="tg" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></div></div>
    <label htmlFor="te">Technologies (comma separated)</label><input id="te" value={f.technologies} onChange={(e) => set("technologies", e.target.value)} />
    <label htmlFor="vu">Solution demo video link (optional)</label>
    <input id="vu" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={f.video_url} onChange={(e) => set("video_url", e.target.value)} />
    <p className="hint">Paste a YouTube, Vimeo, OneDrive or Google Drive link. If filled, a “Watch Solution Demo Video” button appears on the project. Leave empty to hide the button.</p>
    <label htmlFor="du">Solution project documentation link (optional)</label>
    <input id="du" type="url" inputMode="url" placeholder="https://drive.google.com/…" value={f.doc_url} onChange={(e) => set("doc_url", e.target.value)} />
    <p className="hint">Paste a link to a PDF, Google Doc, OneDrive, SharePoint or Notion page (set sharing to “anyone with the link”). If filled, a “Project Documentation” button appears on the project. Leave empty to hide it.</p>
    <label htmlFor="cv">Cover image</label><input id="cv" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pick(e.target.files?.[0], (u) => set("cover_url", u))} />
    {f.cover_url && <p><img src={f.cover_url} alt="Cover preview" style={{ maxWidth: "16rem" }} /> <button type="button" className="secondary" onClick={() => set("cover_url", "")}>Remove cover</button></p>}
    <label htmlFor="sh">Add screenshot</label><input id="sh" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pick(e.target.files?.[0], (u) => set("screenshots", [...f.screenshots, u]))} />
    <ul className="chips">{f.screenshots.map((u: string, i: number) => <li key={u}><img src={u} alt={`Screenshot ${i + 1}`} style={{ height: "4rem" }} /> <button type="button" className="secondary" onClick={() => set("screenshots", f.screenshots.filter((x: string) => x !== u))}>Remove</button></li>)}</ul>
    {RICH.map(([k, l]) => <RichField key={k} label={l} value={f[k]} onChange={(h) => set(k, h)} onError={setErr} />)}
    <div className="row2"><div><label htmlFor="sd">Publication date</label><input id="sd" type="datetime-local" value={f.published_at} onChange={(e) => set("published_at", e.target.value)} /></div>
      <div><label><input type="checkbox" style={{ width: "auto" }} checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Show first on Home (featured)</label></div></div>
    <label htmlFor="st">SEO title (max 70)</label><input id="st" maxLength={70} value={f.seo_title} onChange={(e) => set("seo_title", e.target.value)} />
    <label htmlFor="sm">SEO description (max 160)</label><textarea id="sm" rows={2} maxLength={160} value={f.seo_description} onChange={(e) => set("seo_description", e.target.value)} />
    {err && <p className="err" role="alert">{err}</p>}{msg && <p className="ok" role="status">{msg}</p>}
    <p className="admin-bar"><button disabled={busy} onClick={() => save("draft")}>Save draft</button>
      <button disabled={busy} onClick={() => save("published")}>{f.status === "published" ? "Update published" : "Publish"}</button>
      {f.status === "published" && <button className="secondary" disabled={busy} onClick={() => save("draft")}>Unpublish</button>}
      <button className="secondary" onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview"}</button>
      {id && <button className="danger" onClick={remove}>Delete</button>}</p>
    {preview && <article className="prose" aria-label="Preview"><h1>{f.title}</h1><p className="lede">{f.summary}</p>
      {RICH.filter(([k]) => f[k]).map(([k, l]) => <section key={k}><h2>{l}</h2><div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(f[k]) }} /></section>)}</article>}
  </div>);
}
