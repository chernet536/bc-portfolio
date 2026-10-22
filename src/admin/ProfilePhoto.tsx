import { useEffect, useState } from "react";
import { sb } from "../lib/browser";
import { uploadImage } from "./PostEditor";

/** Shrinks big phone photos so they fit the 5 MB upload rule and load fast on the site. */
async function shrink(file: File, max = 1200): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "profile.jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

export default function ProfilePhoto() {
  const [url, setUrl] = useState<string | null>(null), [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    sb.from("site_settings").select("value").eq("key", "profile_photo").maybeSingle()
      .then(({ data }) => { setUrl((data?.value as any)?.url ?? null); setLoaded(true); });
  }, []);

  async function onFile(file?: File) {
    if (!file) return; setErr(""); setMsg(""); setBusy(true);
    try {
      const small = await shrink(file);
      const u = await uploadImage(small);
      const { error } = await sb.from("site_settings").upsert({ key: "profile_photo", value: { url: u } }, { onConflict: "key" });
      if (error) throw new Error("The image uploaded but could not be saved as your profile photo. Make sure you ran migration 0001 and are signed in as admin.");
      setUrl(u); setMsg("Photo saved. It appears on the Home and About pages within about a minute.");
    } catch (e: any) { setErr(e.message ?? "Upload failed."); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm("Remove your profile photo from the site?")) return;
    setBusy(true); setErr(""); setMsg("");
    const { error } = await sb.from("site_settings").delete().eq("key", "profile_photo");
    if (error) setErr("Could not remove the photo."); else { setUrl(null); setMsg("Photo removed. Initials are shown instead."); }
    setBusy(false);
  }
  return (<div className="panel"><h1>Profile photo</h1>
    <p>This photo is shown on your <strong>Home</strong> and <strong>About</strong> pages. Upload a new one any time to replace it. A portrait or square photo with your face near the centre works best; large photos are resized automatically.</p>
    <div className="photo-edit">
      <div className="portrait md">{!loaded ? null : url ? <img src={url} alt="Current profile photo" /> : <div className="portrait-ph">No photo</div>}</div>
      <div>
        <label htmlFor="pp">{url ? "Replace photo" : "Upload photo"}</label>
        <input id="pp" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
        {url && <p><button type="button" className="danger" disabled={busy} onClick={remove}>Remove photo</button></p>}
        {busy && <p role="status">Working…</p>}
        {err && <p className="err" role="alert">{err}</p>}{msg && <p className="ok" role="status">{msg}</p>}
      </div>
    </div></div>);
}
