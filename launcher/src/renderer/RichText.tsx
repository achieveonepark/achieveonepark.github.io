import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon, Undo2, Redo2, Quote } from 'lucide-react';

export function RichText({ content, onChange, readOnly = false }: { content: string; onChange?: (value: string) => void; readOnly?: boolean }) {
  const [linkInput, setLinkInput] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }), Markdown, Image, TableKit],
    content, contentType: 'markdown', editable: !readOnly,
    editorProps: { attributes: { class: 'prose-editor', 'aria-label': readOnly ? '본문 미리보기' : '본문 편집', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor }) => onChange?.(editor.getMarkdown()),
  });
  useEffect(() => {
    if (editor && editor.getMarkdown() !== content) editor.commands.setContent(content, { contentType: 'markdown', emitUpdate: false });
  }, [editor, content]);
  useEffect(() => { editor?.setEditable(!readOnly); }, [editor, readOnly]);
  if (!editor) return null;
  const buttons = [
    { icon: Bold, label: '굵게', active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: '기울임', active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Heading2, label: '소제목', active: editor.isActive('heading'), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: List, label: '목록', active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: '번호 목록', active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: '인용', active: editor.isActive('blockquote'), run: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: LinkIcon, label: '링크', active: editor.isActive('link'), run: () => setLinkInput(editor.getAttributes('link').href || 'https://') },
    { icon: Undo2, label: '실행 취소', active: false, run: () => editor.chain().focus().undo().run() },
    { icon: Redo2, label: '다시 실행', active: false, run: () => editor.chain().focus().redo().run() },
  ];
  return <div className={readOnly ? 'read-only-rich' : 'rich-editor'}>
    {!readOnly && <div className="rich-toolbar">{buttons.map(button => <button key={button.label} type="button" title={button.label} aria-label={button.label} aria-pressed={button.active} className={button.active ? 'active' : ''} onClick={button.run}><button.icon size={16} /></button>)}</div>}
    {linkInput !== null && <div className="link-input"><input aria-label="링크 주소" value={linkInput} onChange={event => setLinkInput(event.target.value)} placeholder="https://" /><button type="button" disabled={!/^https:\/\//.test(linkInput)} onClick={() => { editor.chain().focus().extendMarkRange('link').setLink({ href: linkInput }).run(); setLinkInput(null); }}>적용</button><button type="button" onClick={() => setLinkInput(null)}>취소</button></div>}
    <EditorContent editor={editor} />
  </div>;
}
