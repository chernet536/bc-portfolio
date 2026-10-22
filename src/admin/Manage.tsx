import { useEffect, useState } from "react";
import { sb } from "../lib/browser";
import { slugify } from "../lib/text";

export function Taxonomy() {
  const [cats, setCats] = useState<any[]>([]), [tags, setTags] = useState<any[]>([]), [name, setName] = useState(""), [kind, setKind] = useState("post"), [err, setErr] = useState("");
  const load = async () => { const [c, t] = await Promise.all([sb.from("categories").select("*").order("kind").order("name"), sb.from("tags").select("*").order("name")]); setCats(c.data ?? []); setTags(t.data ?? []); };
  useEffect(() => { load(); }, []);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(""); const slug = slugify(name);
    if (!slug) return setErr("Enter a category name.");
    const { error } = await sb.from("categories").insert({ kind, name: name.trim(), slug });
    if (error) return setErr(error.code === "23505" ? "That category already exists." : "Could not add the category.");
    setName(""); load();
  }
  const del = async (t: string, id: string) => { if (confirm("Delete this item?")) { const { error } = await sb.from(t).delete().eq("id", id); if (error) setErr("Delete failed."); else load(); } };
  return (<><h1>Categories and tags</h1>
    <form onSubmit={add} className="row2"><div><label htmlFor="cn">New category</label><input id="cn" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
      <div><label htmlFor="ck">Type</label><select id="ck" value={kind} onChange={(e) => setKind(e.target.value)}><option value="post">Article</option><option value="project">Project</option></select></div>
      <p><button>Add category</button></p></form>
    {err && <p className="err" role="alert">{err}</p>}
    <ul className="ledger">{cats.map((c) => <li key={c.id}><span>{c.name}</span><span className="meta">{c.kind} <button className="danger" onClick={() => del("categories", c.id)}>Delete</button></span></li>)}</ul>
    <h2>Tags</h2><p>Tags are created when you save an article or project.</p>
    <ul className="chips">{tags.map((t) => <li key={t.id}>{t.name} <button className="secondary" aria-label={`Delete tag ${t.name}`} onClick={() => del("tags", t.id)}>x</button></li>)}</ul></>);
}

export function Media() {
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState("");
  const load = () => sb.from("media").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const url = (p: string) => sb.storage.from("media").getPublicUrl(p).data.publicUrl;
  async function remove(r: any) {
    if (!confirm("Delete this image? Pages that use it will show a broken image.")) return;
    const s = await sb.storage.from("media").remove([r.path]);
    if (s.error) return setErr("Delete failed."); await sb.from("media").delete().eq("id", r.id); load();
  }
  async function replace(r: any, f?: File) {
    if (!f) return; setErr("");
    if (f.type !== r.mime_type) return setErr(`Replacement must be the same type (${r.mime_type}).`);
    if (f.size > 5 * 1024 * 1024) return setErr("The image must be 5 MB or smaller.");
    const s = await sb.storage.from("media").upload(r.path, f, { upsert: true, contentType: f.type });
    if (s.error) return setErr("Replace failed."); await sb.from("media").update({ size_bytes: f.size }).eq("id", r.id); load();
  }
  async function alt(r: any, v: string) { const { error } = await sb.from("media").update({ alt_text: v }).eq("id", r.id); if (error) setErr("Could not save alt text."); }
  return (<><h1>Media</h1><p>Upload images from the article and project editors.</p>{err && <p className="err" role="alert">{err}</p>}
    {!rows ? <p>Loading</p> : rows.length === 0 ? <p>No images yet.</p> :
      <ul className="ledger">{rows.map((r) => <li key={r.id}><img src={`${url(r.path)}?v=${r.size_bytes}`} alt={r.alt_text} style={{ height: "5rem" }} />
        <span className="meta">{Math.round(r.size_bytes / 1024)} KB</span>
        <p><label>Alt text<input defaultValue={r.alt_text} onBlur={(e) => alt(r, e.target.value)} /></label>
          <label>Replace<input type="file" accept={r.mime_type} onChange={(e) => replace(r, e.target.files?.[0])} /></label>
          <button className="danger" onClick={() => remove(r)}>Delete</button></p></li>)}</ul>}</>);
}

export function Messages() {
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState("");
  const load = () => sb.from("messages").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  return (<><h1>Messages</h1>{err && <p className="err" role="alert">{err}</p>}
    {!rows ? <p>Loading</p> : rows.length === 0 ? <p>No messages yet.</p> :
      <ul className="ledger">{rows.map((m) => <li key={m.id}><span><strong>{m.name}</strong> <a href={`mailto:${m.email}`}>{m.email}</a></span>
        <span className="meta">{new Date(m.created_at).toLocaleString("en-GB")}</span><p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
        <button className="danger" onClick={async () => { const { error } = await sb.from("messages").delete().eq("id", m.id); if (error) setErr("Delete failed."); else load(); }}>Delete</button></li>)}</ul>}</>);
}
