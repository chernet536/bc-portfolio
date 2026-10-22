import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import DOMPurify from "dompurify";
import { sb } from "../lib/browser";
import { slugify, isSlug, readingMinutes, checkImage } from "../lib/text";

const blank = { title: "", slug: "", excerpt: "", category_id: "", cover_url: "", featured: false, status: "draft",
  published_at: "", seo_title: "", seo_description: "", tags: "" };
const toLocal = (d: string | null) => (d ? new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export async function uploadImage(file: File): Promise<string> {
  const bad = checkImage(file); if (bad) throw new Error(bad);
  const ext = file.type.split("/")[1];
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) throw new Error("Upload failed. Check that you are signed in as an administrator.");
  await sb.from("media").insert({ path, mime_type: file.type, size_bytes: file.size });
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export default function PostEditor({ id: initialId, onDone }: { id: string | null; onDone: () => void }) {
  const [id, setId] = useState(initialId), [f, setF] = useState<any>(blank), [cats, setCats] = useState<any[]>([]);
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initialId);
  const editor = useEditor({ extensions: [StarterKit, Image], content: "", immediatelyRender: false });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => { sb.from("categories").select("id,name").eq("kind", "post").order("name").then(({ data }) => setCats(data ?? [])); }, []);
  useEffect(() => {
    if (!initialId || !editor) return;
    sb.from("posts").select("*,tags:post_tags(tag:tags(name))").eq("id", initialId).single().then(({ data, error }) => {
      if (error || !data) return setErr("Could not load this article.");
      setF({ ...blank, ...data, category_id: data.category_id ?? "", cover_url: data.cover_url ?? "", seo_title: data.seo_title ?? "",
        seo_description: data.seo_description ?? "", published_at: toLocal(data.published_at), tags: data.tags.map((t: any) => t.tag.name).join(", ") });
      editor.commands.setContent(data.content_html);
    });
  }, [initialId, editor]);

  async function pickImage(file: File | undefined, apply: (url: string) => void) {
    if (!file) return; setErr("");
    try { apply(await uploadImage(file)); } catch (e: any) { setErr(e.message); }
  }

  async function save(status: "draft" | "published") {
    setErr(""); setMsg("");
    const slug = f.slug || slugify(f.title);
    if (!f.title.trim()) return setErr("Enter a title.");
    if (!isSlug(slug)) return setErr("The slug may contain only lowercase letters, numbers and single hyphens.");
    const html = DOMPurify.sanitize(editor?.getHTML() ?? "");
    const publishedAt = status === "published" ? new Date(f.published_at || Date.now()).toISOString() : f.published_at ? new Date(f.published_at).toISOString() : null;
    const row = { slug, title: f.title.trim(), excerpt: f.excerpt, content_html: html, cover_url: f.cover_url || null, category_id: f.category_id || null,
      status, featured: f.featured, published_at: publishedAt, seo_title: f.seo_title || null, seo_description: f.seo_description || null,
      reading_minutes: readingMinutes(html) };
    setBusy(true); setMsg("Saving");
    const res = id ? await sb.from("posts").update(row).eq("id", id).select("id").single() : await sb.from("posts").insert(row).select("id").single();
    if (res.error || !res.data) {
      setMsg(""); setBusy(false);
      return setErr(res.error?.code === "23505" ? "Another article already uses this slug. Choose a different one." : "Save failed. Your changes were not stored.");
    }
    const postId = res.data.id; setId(postId);
    const names = [...new Set<string>(f.tags.split(",").map((t: string) => t.trim()).filter(Boolean))];
    await sb.from("post_tags").delete().eq("post_id", postId);
    if (names.length) {
      const up = await sb.from("tags").upsert(names.map((n) => ({ name: n, slug: slugify(n) })).filter((t) => t.slug), { onConflict: "slug" }).select("id");
      if (up.data?.length) await sb.from("post_tags").insert(up.data.map((t: any) => ({ post_id: postId, tag_id: t.id })));
    }
    setF((p: any) => ({ ...p, slug, status, published_at: toLocal(publishedAt) }));
    setMsg(`${status === "published" ? "Published" : "Draft saved"} at ${new Date().toLocaleTimeString("en-GB")}`); setBusy(false);
  }

  async function remove() {
    if (!id || !confirm("Delete this article permanently?")) return;
    const { error } = await sb.from("posts").delete().eq("id", id);
    if (error) setErr("Delete failed."); else onDone();
  }
  const btn = (label: string, run: () => void, pressed?: boolean) =>
    <button type="button" aria-pressed={pressed} onClick={run}>{label}</button>;
  const c = editor?.chain().focus();

  return (<div><p><button className="secondary" onClick={onDone}>Back to articles</button></p>
    <h1>{id ? "Edit article" : "New article"}</h1>
    <p>Status: <strong>{f.status}</strong></p>
    <label htmlFor="t">Title</label>
    <input id="t" value={f.title} maxLength={200} onChange={(e) => { set("title", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
    <label htmlFor="s">Slug (the URL: /blog/{f.slug || "…"})</label>
    <input id="s" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} />
    <label htmlFor="x">Excerpt</label><textarea id="x" rows={2} maxLength={500} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
    <div className="row2"><div><label htmlFor="c">Category</label>
      <select id="c" value={f.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label htmlFor="tg">Tags (comma separated)</label><input id="tg" value={f.tags} onChange={(e) => set("tags", e.target.value)} /></div></div>
    <label htmlFor="cv">Cover image</label>
    <input id="cv" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pickImage(e.target.files?.[0], (u) => set("cover_url", u))} />
    {f.cover_url && <p><img src={f.cover_url} alt="Cover preview" style={{ maxWidth: "16rem" }} /> <button type="button" className="secondary" onClick={() => set("cover_url", "")}>Remove cover</button></p>}
    <label>Content</label>
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {btn("Bold", () => c?.toggleBold().run(), editor?.isActive("bold"))}{btn("Italic", () => c?.toggleItalic().run(), editor?.isActive("italic"))}
      {btn("H2", () => c?.toggleHeading({ level: 2 }).run(), editor?.isActive("heading", { level: 2 }))}{btn("H3", () => c?.toggleHeading({ level: 3 }).run(), editor?.isActive("heading", { level: 3 }))}
      {btn("List", () => c?.toggleBulletList().run(), editor?.isActive("bulletList"))}{btn("Numbered", () => c?.toggleOrderedList().run(), editor?.isActive("orderedList"))}
      {btn("Code block", () => c?.toggleCodeBlock().run(), editor?.isActive("codeBlock"))}
      {btn("Link", () => { const u = prompt("Link address (https://…)"); if (u && /^https?:\/\//.test(u)) c?.setLink({ href: u }).run(); })}
      <label className="secondary" style={{ margin: 0, padding: ".3rem .6rem", border: "1px solid var(--line)", cursor: "pointer" }}>Insert image
        <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => pickImage(e.target.files?.[0], (u) => editor?.chain().focus().setImage({ src: u, alt: "" }).run())} /></label></div>
    <EditorContent editor={editor} />
    <div className="row2"><div><label htmlFor="sd">Publication date</label><input id="sd" type="datetime-local" value={f.published_at} onChange={(e) => set("published_at", e.target.value)} /></div>
      <div><label><input type="checkbox" style={{ width: "auto" }} checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured article</label></div></div>
    <label htmlFor="st">SEO title (max 70)</label><input id="st" maxLength={70} value={f.seo_title} onChange={(e) => set("seo_title", e.target.value)} />
    <label htmlFor="sm">SEO description (max 160)</label><textarea id="sm" rows={2} maxLength={160} value={f.seo_description} onChange={(e) => set("seo_description", e.target.value)} />
    {err && <p className="err" role="alert">{err}</p>}{msg && <p className="ok" role="status">{msg}</p>}
    <p className="admin-bar"><button disabled={busy} onClick={() => save("draft")}>Save draft</button>
      <button disabled={busy} onClick={() => save("published")}>{f.status === "published" ? "Update published" : "Publish"}</button>
      {f.status === "published" && <button className="secondary" disabled={busy} onClick={() => save("draft")}>Unpublish</button>}
      <button className="secondary" onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview"}</button>
      {id && <button className="danger" onClick={remove}>Delete</button>}</p>
    {preview && <article className="prose" aria-label="Preview"><h1>{f.title}</h1><div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editor?.getHTML() ?? "") }} /></article>}
  </div>);
}
