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
  const [title, setTitle] = useState(note.title);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state when note changes
  useEffect(() => {
    setTitle(note.title);
  }, [note.id, note.title]);

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
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-8 py-4'
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
      scheduleSave(title, html, text);
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
    const html = editor ? editor.getHTML() : note.content;
    const text = editor ? editor.getText() : note.plain_text;
    scheduleSave(newTitle, html, text);
  };

  const scheduleSave = (newTitle: string, newContent: string, newPlainText: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdateNote(note.id, {
        title: newTitle || 'Untitled Note',
        content: newContent,
        plain_text: newPlainText
      });
    }, 400);
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
    onUpdateNote(note.id, { folder_id: folderId });
  };

  const handleExport = (format: 'markdown' | 'txt' | 'html' | 'print') => {
    const filename = `${(title || 'Note').replace(/[/\\?%*:|"<>]/g, '_')}`;

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
      contentToExport = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:-apple-system,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;}</style></head><body><h1>${title}</h1>${editor?.getHTML() || note.content}</body></html>`;
    } else if (format === 'markdown') {
      mimeType = 'text/markdown';
      fileExt = '.md';
      // Basic markdown conversion from html
      const rawText = editor ? editor.getText() : note.plain_text;
      contentToExport = `# ${title}\n\n${rawText}`;
    } else {
      contentToExport = `${title}\n\n${editor ? editor.getText() : note.plain_text}`;
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
    <div className="flex-1 flex flex-col h-[calc(100vh-3rem)] overflow-hidden bg-apple-darkBg dark:bg-apple-darkBg light:bg-apple-lightBg">
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
        {/* Title Input */}
        <div className="px-8 pt-8 pb-2">
          <input
            ref={titleInputRef}
            type="text"
            disabled={isTrashView}
            placeholder="Title"
            value={title}
            onChange={handleTitleChange}
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent outline-none border-none placeholder:text-apple-darkMuted/60 text-white dark:text-white light:text-black tracking-tight"
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
