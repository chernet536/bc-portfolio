import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { uploadImage } from "./PostEditor";

export default function RichField({ label, value, onChange, onError }: { label: string; value: string; onChange: (h: string) => void; onError: (m: string) => void }) {
  const editor = useEditor({ extensions: [StarterKit, Image], content: value, immediatelyRender: false, onUpdate: ({ editor }) => onChange(editor.getHTML()) });
  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false }); }, [value, editor]);
  const c = () => editor?.chain().focus();
  const b = (t: string, run: () => void, on?: boolean) => <button type="button" aria-pressed={on} onClick={run}>{t}</button>;
  return (<div><label>{label}</label>
    <div className="toolbar" role="toolbar" aria-label={`${label} formatting`}>
      {b("Bold", () => c()?.toggleBold().run(), editor?.isActive("bold"))}{b("H3", () => c()?.toggleHeading({ level: 3 }).run(), editor?.isActive("heading"))}
      {b("List", () => c()?.toggleBulletList().run(), editor?.isActive("bulletList"))}{b("Code", () => c()?.toggleCodeBlock().run(), editor?.isActive("codeBlock"))}
      <label style={{ margin: 0, padding: ".3rem .6rem", border: "1px solid var(--line)", cursor: "pointer" }}>Image
        <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          try { c()?.setImage({ src: await uploadImage(f), alt: "" }).run(); } catch (x: any) { onError(x.message); } }} /></label></div>
    <EditorContent editor={editor} /></div>);
}
