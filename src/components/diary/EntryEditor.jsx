import React, { useImperativeHandle, forwardRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const ToolbarButton = ({ onClick, isActive, children, ariaLabel }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className={`p-2 rounded flex items-center justify-center transition-colors ${
      isActive ? 'bg-gold text-midnight' : 'text-cream hover:bg-white/10'
    }`}
  >
    {children}
  </button>
);

const EntryEditor = forwardRef(({ content, onChange, editable = true }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        underline: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "What's on your mind today...",
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none font-serif leading-[1.8] text-ink min-h-[300px]',
      },
    },
  });

  // Update content when it changes externally and editor is not focused
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update editability
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
  }));

  if (!editor) return null;

  return (
    <div className="flex flex-col">
      {editable && (
        <div className="mb-4 flex items-center gap-1 bg-midnight-light p-1 rounded-lg border border-white/10 shadow-sm w-fit">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            ariaLabel="Bold"
          >
            <span className="font-bold font-sans">B</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            ariaLabel="Italic"
          >
            <span className="italic font-serif">I</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            ariaLabel="Underline"
          >
            <span className="underline font-sans">U</span>
          </ToolbarButton>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            ariaLabel="Bullet List"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            ariaLabel="Ordered List"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h14M7 12h14M7 16h14M3 8h.01M3 12h.01M3 16h.01" />
            </svg>
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} className="editor-content" />
      <style dangerouslySetInnerHTML={{__html: `
        .editor-content .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #6B5D4D;
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }
      `}} />
    </div>
  );
});

EntryEditor.displayName = 'EntryEditor';
export default EntryEditor;
