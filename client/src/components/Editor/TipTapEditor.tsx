import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Note, Folder } from '../../types';
import { EditorToolbar } from './EditorToolbar';
import { uploadImage } from '../../api';
import { formatFullNoteTimestamp } from '../../utils/date';

function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const serializeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(serializeNode).join('');

    switch (tag) {
      case 'h1':
        return `# ${children.trim()}\n\n`;
      case 'h2':
        return `## ${children.trim()}\n\n`;
      case 'h3':
        return `### ${children.trim()}\n\n`;
      case 'p':
        return children.trim() ? `${children.trim()}\n\n` : '\n';
      case 'strong':
      case 'b':
        return `**${children}**`;
      case 'em':
      case 'i':
        return `*${children}*`;
      case 'u':
        return `<u>${children}</u>`;
      case 's':
      case 'del':
        return `~~${children}~~`;
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre' ? children : `\`${children}\``;
      case 'pre':
        return `\`\`\`\n${el.textContent?.trim() || ''}\n\`\`\`\n\n`;
      case 'blockquote':
        return (
          children
            .trim()
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n') + '\n\n'
        );
      case 'hr':
        return `---\n\n`;
      case 'br':
        return '\n';
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || 'image';
        return `![${alt}](${src})\n\n`;
      }
      case 'ul': {
        const isTaskList = el.getAttribute('data-type') === 'taskList';
        const items = Array.from(el.children)
          .map((li) => {
            if (isTaskList) {
              const checked = li.getAttribute('data-checked') === 'true';
              const text = (li as HTMLElement).innerText.trim();
              return `- [${checked ? 'x' : ' '}] ${text}`;
            }
            return `- ${serializeNode(li).trim()}`;
          })
          .join('\n');
        return `${items}\n\n`;
      }
      case 'ol': {
        const items = Array.from(el.children)
          .map((li, idx) => `${idx + 1}. ${serializeNode(li).trim()}`)
          .join('\n');
        return `${items}\n\n`;
      }
      case 'li':
        return children.trim();
      default:
        return children;
    }
  };

  return Array.from(doc.body.childNodes)
    .map(serializeNode)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface TipTapEditorProps {
  note: Note;
  folders: Folder[];
  onUpdateNote: (
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'plain_text' | 'folder_id' | 'is_pinned'>>
  ) => void;
  onTogglePin: () => void;
  onDeleteNote: () => void;
  isTrashView: boolean;
  onRestoreNote: () => void;
  onNewNote: () => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({
  note,
  folders,
  onUpdateNote,
  onTogglePin,
  onDeleteNote,
  isTrashView,
  onRestoreNote,
  onNewNote
}) => {
  const [title, setTitle] = useState(note.title || '');
  const titleRef = useRef(title);
  titleRef.current = title;
  const noteIdRef = useRef(note.id);
  noteIdRef.current = note.id;
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{
    noteId: string;
    title: string;
    content: string;
    plain_text: string;
  } | null>(null);
  const onUpdateNoteRef = useRef(onUpdateNote);
  onUpdateNoteRef.current = onUpdateNote;

  // Flush any pending debounced save on unmount or tab close
  useEffect(() => {
    const flushPendingSave = () => {
      if (saveTimeoutRef.current && pendingSaveRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        onUpdateNoteRef.current(pending.noteId, {
          title: pending.title,
          content: pending.content,
          plain_text: pending.plain_text
        });
      }
    };

    window.addEventListener('beforeunload', flushPendingSave);
    return () => {
      window.removeEventListener('beforeunload', flushPendingSave);
      flushPendingSave();
    };
  }, []);

  // Sync state ONLY when switching to a different note
  useEffect(() => {
    const noteTitle = note.title || '';
    setTitle(noteTitle);
    titleRef.current = noteTitle;
  }, [note.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Start writing your note...'
      }),
      Image.configure({
        inline: true,
        allowBase64: true
      })
    ],
    content: note.content || '',
    editable: !isTrashView,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] px-8 py-4 text-notes-lightText dark:text-notes-darkText'
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                uploadImage(file).then((url) => {
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url })
                    )
                  );
                }).catch((err) => {
                  console.error('Image paste failed:', err);
                });
                return true;
              }
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0 && files[0].type.startsWith('image/')) {
          event.preventDefault();
          uploadImage(files[0]).then((url) => {
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coordinates) {
              view.dispatch(
                view.state.tr.insert(
                  coordinates.pos,
                  view.state.schema.nodes.image.create({ src: url })
                )
              );
            }
          }).catch((err) => {
            console.error('Image drop failed:', err);
          });
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      scheduleSave(titleRef.current, html, text);
    }
  });

  // Keep editor content in sync when switching notes
  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content || '', false);
    }
  }, [note.id, editor]);

  // Handle title edit
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    const html = editor ? editor.getHTML() : note.content;
    const text = editor ? editor.getText() : note.plain_text;
    scheduleSave(newTitle, html, text);
  };

  const scheduleSave = (newTitle: string, newContent: string, newPlainText: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    pendingSaveRef.current = {
      noteId: noteIdRef.current,
      title: newTitle,
      content: newContent,
      plain_text: newPlainText
    };
    saveTimeoutRef.current = setTimeout(() => {
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      saveTimeoutRef.current = null;
      if (pending) {
        onUpdateNoteRef.current(pending.noteId, {
          title: pending.title,
          content: pending.content,
          plain_text: pending.plain_text
        });
      }
    }, 350);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      editor?.commands.focus('start');
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      const url = await uploadImage(file);
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err: any) {
      alert(`Image upload error: ${err.message}`);
    }
  };

  const handleMoveToFolder = (folderId: string) => {
    if (folderId === note.folder_id) return;

    // If there are pending unsaved edits, include them in the same update and clear the timer
    if (saveTimeoutRef.current && pendingSaveRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = null;
      onUpdateNote(note.id, {
        title: pending.title,
        content: pending.content,
        plain_text: pending.plain_text,
        folder_id: folderId
      });
    } else {
      onUpdateNote(note.id, { folder_id: folderId });
    }
  };

  const handleExport = (format: 'markdown' | 'txt' | 'html' | 'print') => {
    const firstLine = (note.plain_text || '').split('\n').map((s) => s.trim()).find((s) => s.length > 0) || '';
    const exportHeading = (title && title.trim()) || firstLine || 'Note';
    const filename = `${exportHeading.replace(/[/\\?%*:|"<>]/g, '_')}`;

    if (format === 'print') {
      window.print();
      return;
    }

    let mimeType = 'text/plain';
    let fileExt = '.txt';
    let contentToExport = '';

    if (format === 'html') {
      mimeType = 'text/html';
      fileExt = '.html';
      contentToExport = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${exportHeading}</title><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;}</style></head><body><h1>${exportHeading}</h1>${editor?.getHTML() || note.content}</body></html>`;
    } else if (format === 'markdown') {
      mimeType = 'text/markdown';
      fileExt = '.md';
      const htmlContent = editor ? editor.getHTML() : note.content;
      const mdBody = htmlToMarkdown(htmlContent);
      contentToExport = title && title.trim() ? `# ${title.trim()}\n\n${mdBody}` : mdBody;
    } else {
      contentToExport = `${exportHeading}\n\n${editor ? editor.getText() : note.plain_text}`;
    }

    const blob = new Blob([contentToExport], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}${fileExt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-notes-lightBg dark:bg-notes-darkBg text-notes-lightText dark:text-notes-darkText transition-colors">
      {/* Top Toolbar */}
      <EditorToolbar
        editor={editor}
        isPinned={note.is_pinned === 1}
        onTogglePin={onTogglePin}
        onDeleteNote={onDeleteNote}
        isTrashView={isTrashView}
        onRestoreNote={onRestoreNote}
        onNewNote={onNewNote}
        folders={folders}
        currentFolderId={note.folder_id}
        onMoveToFolder={handleMoveToFolder}
        onUploadImage={handleUploadImage}
        onExport={handleExport}
      />

      {/* Editor Body Area */}
      <div className="flex-1 overflow-y-auto max-w-4xl w-full mx-auto flex flex-col">
        {/* Centered Timestamp & Word Count Header */}
        <div className="pt-4 pb-1 px-8 text-center text-[11px] text-notes-lightMuted dark:text-notes-darkMuted select-none">
          <span>{formatFullNoteTimestamp(note.updated_at)}</span>
          {(() => {
            const raw = ((title ? title + ' ' : '') + (editor ? editor.getText() : note.plain_text)).trim();
            const wordCount = raw ? raw.split(/\s+/).length : 0;
            return wordCount > 0 ? (
              <span className="ml-2 opacity-75">
                · {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </span>
            ) : null;
          })()}
        </div>

        {/* Title Input */}
        <div className="px-8 pt-3 pb-2">
          <input
            ref={titleInputRef}
            type="text"
            disabled={isTrashView}
            placeholder="Title"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent outline-none border-none placeholder:text-notes-lightMuted/60 dark:placeholder:text-notes-darkMuted/60 text-notes-lightText dark:text-white tracking-tight"
          />
        </div>

        {/* TipTap Rich Text Area */}
        <div className="flex-1">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
