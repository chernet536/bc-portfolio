import { useEffect, useState } from "react";
import { sb } from "../lib/browser";
import PostEditor from "./PostEditor";
import ProjectEditor from "./ProjectEditor";
import ProfilePhoto from "./ProfilePhoto";
import { Taxonomy, Media, Messages } from "./Manage";

type Kind = "posts" | "projects";
type View = { name: "home" } | { name: "list"; kind: Kind } | { name: "edit"; kind: Kind; id: string | null } | { name: "tax" } | { name: "photo" } | { name: "media" } | { name: "msgs" };
const when = (d: string) => new Date(d).toLocaleString("en-GB");

function Login() {
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setErr("Sign-in failed. Check your email and password."); setBusy(false);
  }
  return (<div style={{ maxWidth: "26rem" }}><h1>Admin sign in</h1>
    <form onSubmit={submit}>
      <label htmlFor="e">Email</label><input id="e" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="p">Password</label><input id="p" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="err" role="alert">{err}</p>}
      <p><button disabled={busy}>{busy ? "Signing in" : "Sign in"}</button></p></form></div>);
}

function Overview({ go }: { go: (v: View) => void }) {
  const [s, setS] = useState<Record<string, number> | null>(null), [recent, setRecent] = useState<any[]>([]), [err, setErr] = useState("");
  useEffect(() => { (async () => {
    const c = (t: string, st: string) => sb.from(t).select("id", { count: "exact", head: true }).eq("status", st);
    const r = await Promise.all([c("posts", "published"), c("posts", "draft"), c("projects", "published"), c("projects", "draft"),
      sb.from("posts").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(5),
      sb.from("projects").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(5)]);
    if (r.some((x) => x.error)) { setErr("Could not load counts."); return; }
    setS({ pp: r[0].count ?? 0, pd: r[1].count ?? 0, jp: r[2].count ?? 0, jd: r[3].count ?? 0 });
    setRecent([...(r[4].data ?? []).map((x: any) => ({ ...x, kind: "Article" })), ...(r[5].data ?? []).map((x: any) => ({ ...x, kind: "Project" }))]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6));
  })(); }, []);
  if (err) return <p className="err" role="alert">{err}</p>;
  if (!s) return <p>Loading</p>;
  return (<><h1>Overview</h1>
    <div className="stats"><div><b>{s.pp}</b>Published articles</div><div><b>{s.pd}</b>Draft articles</div>
      <div><b>{s.jp}</b>Published projects</div><div><b>{s.jd}</b>Draft projects</div></div>
    <h2>Recently updated</h2>
    {recent.length === 0 ? <p>Nothing yet. <button className="link" onClick={() => go({ name: "edit", kind: "posts", id: null })}>Write your first article</button></p> :
      <ul className="ledger">{recent.map((x) => <li key={x.kind + x.id}><span>{x.title}</span><span className="meta">{x.kind} · {when(x.updated_at)}</span></li>)}</ul>}</>);
}

function Items({ kind, go }: { kind: Kind; go: (v: View) => void }) {
  const [rows, setRows] = useState<any[] | null>(null), [err, setErr] = useState("");
  const label = kind === "posts" ? "article" : "project";
  useEffect(() => { sb.from(kind).select("id,title,status,updated_at").order("updated_at", { ascending: false })
    .then(({ data, error }) => { if (error) setErr(`Could not load ${label}s.`); else setRows(data ?? []); }); }, [kind]);
  return (<><h1>{kind === "posts" ? "Articles" : "Projects"}</h1><p><button onClick={() => go({ name: "edit", kind, id: null })}>New {label}</button></p>
    {err && <p className="err" role="alert">{err}</p>}{!rows && !err && <p>Loading</p>}
    {rows && (rows.length === 0 ? <p>No {label}s yet.</p> :
      <ul className="ledger">{rows.map((r) => <li key={r.id}><button className="link" style={{ background: "none", color: "var(--accent)", textAlign: "left" }} onClick={() => go({ name: "edit", kind, id: r.id })}>{r.title}</button>
        <span className="meta">{r.status} · {when(r.updated_at)}</span></li>)}</ul>)}</>);
}

export default function AdminApp() {
  const [state, setState] = useState<"loading" | "out" | "in" | "denied">("loading");
  const [view, setView] = useState<View>({ name: "home" });
  async function check() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return setState("out");
    const { data } = await sb.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    setState(data ? "in" : "denied");
  }
  useEffect(() => { check(); const { data } = sb.auth.onAuthStateChange(() => { setTimeout(check, 0); }); return () => data.subscription.unsubscribe(); }, []);
  if (state === "loading") return <p>Loading</p>;
  if (state === "out") return <Login />;
  if (state === "denied") return (<><h1>Not authorized</h1><p>This account is not an administrator.</p><button onClick={() => sb.auth.signOut()}>Sign out</button></>);
  const nav = (label: string, v: View) => <button className="link" onClick={() => setView(v)}>{label}</button>;
  return (<><nav className="admin-bar" aria-label="Admin">
    {nav("Overview", { name: "home" })}{nav("Articles", { name: "list", kind: "posts" })}{nav("Projects", { name: "list", kind: "projects" })}
    {nav("Profile photo", { name: "photo" })}{nav("Categories", { name: "tax" })}{nav("Media", { name: "media" })}{nav("Messages", { name: "msgs" })}
    <button className="link" onClick={() => sb.auth.signOut()}>Sign out</button></nav>
    {view.name === "home" && <Overview go={setView} />}
    {view.name === "list" && <Items kind={view.kind} go={setView} />}
    {view.name === "tax" && <Taxonomy />}{view.name === "photo" && <ProfilePhoto />}{view.name === "media" && <Media />}{view.name === "msgs" && <Messages />}
    {view.name === "edit" && (view.kind === "posts"
      ? <PostEditor key={view.id ?? "new"} id={view.id} onDone={() => setView({ name: "list", kind: "posts" })} />
      : <ProjectEditor key={view.id ?? "new"} id={view.id} onDone={() => setView({ name: "list", kind: "projects" })} />)}</>);
}
