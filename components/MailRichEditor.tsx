"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { colors, fonts, radius } from "@/lib/theme";

/**
 * WYSIWYG-editor voor het opstellen van een ledenmailing (vervangt de
 * eerdere textarea met een eigen markdown-achtige notatie). Bewust
 * beperkt tot Tiptap's StarterKit min de opmaak die we hier niet willen
 * aanbieden (citaten, codeblokken, horizontale lijn, doorstreping), plus
 * de losse Underline-extensie (niet in StarterKit inbegrepen) -- zonder
 * die extensie voert de browser CTRL+U zelf uit als een rauwe, door
 * ProseMirror niet-herkende DOM-opmaak, die dan bij het opslaan weer
 * verdwijnt; mét de extensie wordt het een echte, actieve mark net als
 * vet/cursief.
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
      Underline,
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
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        <WerkbalkKnop titel="Vet (Ctrl+B)" actief={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <IconVet />
        </WerkbalkKnop>
        <WerkbalkKnop titel="Cursief (Ctrl+I)" actief={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <IconCursief />
        </WerkbalkKnop>
        <WerkbalkKnop titel="Onderlijnen (Ctrl+U)" actief={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <IconOnderlijnd />
        </WerkbalkKnop>
        <Scheiding />
        <WerkbalkKnop titel="Kop" actief={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <IconKop tekst="H2" />
        </WerkbalkKnop>
        <WerkbalkKnop titel="Subkop" actief={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <IconKop tekst="H3" />
        </WerkbalkKnop>
        <Scheiding />
        <WerkbalkKnop titel="Opsomming" actief={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <IconBulletLijst />
        </WerkbalkKnop>
        <WerkbalkKnop titel="Genummerde lijst" actief={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <IconGenummerdeLijst />
        </WerkbalkKnop>
        <Scheiding />
        <WerkbalkKnop titel="Link invoegen" actief={editor.isActive("link")} onClick={voegLinkToe}>
          <IconLink />
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

function WerkbalkKnop({ actief, onClick, titel, children }: { actief: boolean; onClick: () => void; titel: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titel}
      aria-label={titel}
      aria-pressed={actief}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderRadius: radius.input,
        border: `1px solid ${actief ? colors.forest : colors.line}`,
        background: actief ? colors.forest : colors.white,
        color: actief ? colors.white : colors.ink,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Scheiding() {
  return <div style={{ width: 1, alignSelf: "stretch", background: colors.line, margin: "2px 2px" }} />;
}

/** Standaard, algemeen herkenbare opmaak-iconen (zelfde soort letter-/lijnpictogrammen als Gmail/Google Docs/Word) -- bewust als eigen, minimale inline SVG's i.p.v. een extra icon-library-dependency voor deze ene werkbalk. */

function IconVet() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M7 4h6.5a3.75 3.75 0 0 1 0 7.5H7z" />
      <path d="M7 11.5h7a4 4 0 0 1 0 8H7z" />
    </svg>
  );
}

function IconCursief() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="13.5" y1="4" x2="9.5" y2="20" />
      <line x1="15.5" y1="4" x2="10" y2="4" />
      <line x1="13.5" y1="20" x2="8" y2="20" />
    </svg>
  );
}

function IconOnderlijnd() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 4v7a6 6 0 0 0 12 0V4" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </svg>
  );
}

function IconKop({ tekst }: { tekst: string }) {
  return <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700 }}>{tekst}</span>;
}

function IconBulletLijst() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconGenummerdeLijst() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">
        1
      </text>
      <text x="1" y="14.5" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">
        2
      </text>
      <text x="1" y="21" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">
        3
      </text>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 14a4.5 4.5 0 0 0 6.4.3l2-2a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4-.3l-2 2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1" />
    </svg>
  );
}
