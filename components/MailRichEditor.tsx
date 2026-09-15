"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { colors, fonts, radius } from "@/lib/theme";

/**
 * WYSIWYG-editor voor het opstellen van een ledenmailing (vervangt de
 * eerdere textarea met een eigen markdown-achtige notatie). Bewust
 * beperkt tot Tiptap's StarterKit min de opmaak die we hier niet willen
 * aanbieden (citaten, codeblokken, horizontale lijn, doorstreping) --
 * enkel vet/cursief/koppen(2-3)/lijsten/links, dezelfde opmaak als
 * voordien, nu via een echte WYSIWYG-editor i.p.v. getypte notatie.
 * `onChange` geeft de rauwe HTML door (`editor.getHTML()`) -- die wordt
 * server-side altijd nog gesaneerd vóór verzending (lib/mailSanitize.ts),
 * dus deze HTML zelf hoeft niet vertrouwd te worden.
 */
export default function MailRichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    // Voorkomt een SSR/hydration-mismatch (Tiptap rendert enkel client-side).
    immediatelyRender: false,
  });

  if (!editor) return null;

  function voegLinkToe() {
    const url = window.prompt("Naar welke link?", "https://");
    if (!url || !editor) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <WerkbalkKnop actief={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>V</strong>et
        </WerkbalkKnop>
        <WerkbalkKnop actief={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>C</em>ursief
        </WerkbalkKnop>
        <WerkbalkKnop actief={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          Kop
        </WerkbalkKnop>
        <WerkbalkKnop actief={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          Subkop
        </WerkbalkKnop>
        <WerkbalkKnop actief={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • Lijst
        </WerkbalkKnop>
        <WerkbalkKnop actief={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. Lijst
        </WerkbalkKnop>
        <WerkbalkKnop actief={editor.isActive("link")} onClick={voegLinkToe}>
          🔗 Link
        </WerkbalkKnop>
      </div>

      <div className="mail-editor-inhoud" style={{ border: `1px solid ${colors.line}`, borderRadius: radius.input, padding: "10px 12px", background: colors.white, minHeight: 220 }}>
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .mail-editor-inhoud .ProseMirror {
          outline: none;
          font-family: ${fonts.body};
          font-size: 14px;
          color: ${colors.ink};
          line-height: 1.5;
        }
        .mail-editor-inhoud h2 {
          font-family: ${fonts.display};
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .mail-editor-inhoud h3 {
          font-family: ${fonts.display};
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .mail-editor-inhoud p {
          margin: 0 0 10px;
        }
        .mail-editor-inhoud ul,
        .mail-editor-inhoud ol {
          margin: 0 0 10px;
          padding-left: 22px;
        }
        .mail-editor-inhoud a {
          color: ${colors.forest};
        }
      `}</style>
    </div>
  );
}

function WerkbalkKnop({ actief, onClick, children }: { actief: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 10px",
        borderRadius: radius.badge,
        border: `1px solid ${actief ? colors.forest : colors.line}`,
        background: actief ? colors.forest : colors.white,
        color: actief ? colors.white : colors.ink,
        fontFamily: fonts.body,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
