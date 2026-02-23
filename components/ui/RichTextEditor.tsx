"use client";

import { useEffect, type ReactNode } from "react";
import { Node, mergeAttributes, type Content } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { Bold, Heading1, Heading2, Italic, List, ListOrdered, Redo2, Text, Undo2 } from "lucide-react";
import Button from "@/components/ui/Button";

type Props = {
  value: string;
  onChange: (html: string) => void;
  label?: string;
};

const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      playsinline: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes({ controls: "true", playsinline: "true" }, HTMLAttributes)];
  },
});

function ToolbarButton({
  active = false,
  disabled = false,
  onClick,
  title,
  icon,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "outline"}
      className="h-8 min-w-8 px-2"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon}
    </Button>
  );
}

export default function RichTextEditor({ value, onChange, label = "Content Editor" }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        orderedList: false,
        paragraph: false,
      }),
      Heading.configure({ levels: [1, 2] }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Image.configure({
        allowBase64: false,
      }),
      VideoNode,
      OrderedList,
      Paragraph,
    ],
    content: (value || "<p></p>") as Content,
    editorProps: {
      attributes: {
        class:
          "min-h-48 rounded-b-lg border border-t-0 border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_video]:my-3 [&_video]:h-auto [&_video]:max-w-full [&_video]:rounded-lg [&_a]:text-[var(--color-primary)] [&_a]:underline",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || "<p></p>";
    if (editor.getHTML() === nextValue) return;
    editor.commands.setContent(nextValue, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      <div className="rounded-lg border border-[var(--color-border)] bg-slate-50 p-2">
        <div className="flex flex-wrap gap-1">
          <ToolbarButton
            title="Paragraph"
            icon={<Text size={14} />}
            active={Boolean(editor?.isActive("paragraph"))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          />
          <ToolbarButton
            title="Heading 1"
            icon={<Heading1 size={14} />}
            active={Boolean(editor?.isActive("heading", { level: 1 }))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <ToolbarButton
            title="Heading 2"
            icon={<Heading2 size={14} />}
            active={Boolean(editor?.isActive("heading", { level: 2 }))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            title="Bold"
            icon={<Bold size={14} />}
            active={Boolean(editor?.isActive("bold"))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            title="Italic"
            icon={<Italic size={14} />}
            active={Boolean(editor?.isActive("italic"))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            title="Bullet List"
            icon={<List size={14} />}
            active={Boolean(editor?.isActive("bulletList"))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            title="Ordered List"
            icon={<ListOrdered size={14} />}
            active={Boolean(editor?.isActive("orderedList"))}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            title="Undo"
            icon={<Undo2 size={14} />}
            disabled={!editor || !editor.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolbarButton
            title="Redo"
            icon={<Redo2 size={14} />}
            disabled={!editor || !editor.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          />
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
