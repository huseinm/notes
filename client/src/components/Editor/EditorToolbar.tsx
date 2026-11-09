import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  CheckSquare, 
  Table as TableIcon, 
  Pin, 
  Share2, 
  SquarePen, 
  Type, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Image as ImageIcon,
  ChevronDown,
  Download,
  Printer,
  FileCode,
  Folder as FolderIcon
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import { Folder } from '../../types';

interface EditorToolbarProps {
  editor: Editor | null;
  isPinned: boolean;
  onTogglePin: () => void;
  onDeleteNote: () => void;
  isTrashView: boolean;
  onRestoreNote: () => void;
  onNewNote: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onMoveToFolder: (folderId: string) => void;
  onUploadImage: (file: File) => Promise<void>;
  onExport: (format: 'markdown' | 'txt' | 'html' | 'print') => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  isPinned,
  onTogglePin,
  onDeleteNote,
  isTrashView,
  onRestoreNote,
  onNewNote,
  folders,
  currentFolderId,
  onMoveToFolder,
  onUploadImage,
  onExport
}) => {
  const [showTypographyMenu, setShowTypographyMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  if (!editor) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <div className="h-12 border-b border-apple-darkBorder/60 dark:border-apple-darkBorder/60 light:border-apple-lightBorder bg-apple-darkBg dark:bg-apple-darkBg light:bg-apple-lightBg flex items-center justify-between px-4 select-none gap-2">
      {/* Left side: Delete / Restore */}
      <div className="flex items-center gap-1.5">
        {isTrashView ? (
          <button
            onClick={onRestoreNote}
            title="Put Back Note"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
            <span>Restore</span>
          </button>
        ) : (
          <button
            onClick={onDeleteNote}
            title="Delete Note"
            className="p-1.5 rounded-md hover:bg-rose-500/15 text-apple-darkMuted dark:text-apple-darkMuted light:text-apple-lightMuted hover:text-rose-400 transition-colors"
          >
            <Trash2 size={17} />
          </button>
        )}

        {/* Move note to another folder */}
        {!isTrashView && (
          <div className="relative">
            <button
              onClick={() => setShowFolderMenu(!showFolderMenu)}
              title="Move to Folder"
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-apple-darkHover dark:hover:bg-apple-darkHover light:hover:bg-apple-lightHover text-xs text-apple-darkMuted dark:text-apple-darkMuted light:text-apple-lightMuted transition-colors"
            >
              <FolderIcon size={14} />
              <ChevronDown size={11} />
            </button>

            {showFolderMenu && (
              <div
                onMouseLeave={() => setShowFolderMenu(false)}
                className="absolute left-0 top-9 z-30 w-44 py-1 bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder dark:border-apple-darkBorder light:border-apple-lightBorder rounded-lg shadow-xl text-xs"
              >
                <div className="px-3 py-1 font-semibold text-[10px] text-apple-darkMuted uppercase">
                  Move Note to:
                </div>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onMoveToFolder(f.id);
                      setShowFolderMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-apple-darkHover dark:hover:bg-apple-darkHover light:hover:bg-apple-lightHover flex items-center justify-between ${
                      currentFolderId === f.id ? 'text-apple-yellow font-medium' : 'text-apple-darkText'
                    }`}
                  >
                    <span className="truncate">{f.name}</span>
                    {currentFolderId === f.id && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Middle side: Apple Notes Formatting Tools */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Typography Menu: Aa */}
        <div className="relative">
          <button
            onClick={() => setShowTypographyMenu(!showTypographyMenu)}
            title="Text Style (Aa)"
            className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-apple-darkHover dark:hover:bg-apple-darkHover light:hover:bg-apple-lightHover text-apple-yellow font-bold text-sm transition-colors"
          >
            <span>Aa</span>
            <ChevronDown size={12} />
          </button>

          {showTypographyMenu && (
            <div
              onMouseLeave={() => setShowTypographyMenu(false)}
              className="absolute left-0 top-9 z-30 w-40 py-1 bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder dark:border-apple-darkBorder light:border-apple-lightBorder rounded-lg shadow-xl text-xs space-y-0.5"
            >
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setShowTypographyMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center justify-between ${
                  editor.isActive('heading', { level: 1 }) ? 'text-apple-yellow font-bold' : ''
                }`}
              >
                <span className="font-bold text-base">Title</span>
                <span className="text-[10px] opacity-50">H1</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setShowTypographyMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center justify-between ${
                  editor.isActive('heading', { level: 2 }) ? 'text-apple-yellow font-semibold' : ''
                }`}
              >
                <span className="font-semibold text-sm">Heading</span>
                <span className="text-[10px] opacity-50">H2</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setShowTypographyMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center justify-between ${
                  editor.isActive('heading', { level: 3 }) ? 'text-apple-yellow font-medium' : ''
                }`}
              >
                <span className="font-medium text-xs">Subheading</span>
                <span className="text-[10px] opacity-50">H3</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setShowTypographyMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center justify-between ${
                  editor.isActive('paragraph') ? 'text-apple-yellow' : ''
                }`}
              >
                <span>Body</span>
                <span className="text-[10px] opacity-50">P</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock().run();
                  setShowTypographyMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-apple-darkHover font-mono flex items-center justify-between ${
                  editor.isActive('codeBlock') ? 'text-apple-yellow' : ''
                }`}
              >
                <span>Monospaced</span>
                <span className="text-[10px] opacity-50">Code</span>
              </button>
            </div>
          )}
        </div>

        {/* Checklist */}
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Checklist / To-do"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('taskList')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <CheckSquare size={17} />
        </button>

        {/* Table Menu */}
        <div className="relative">
          <button
            onClick={() => setShowTableMenu(!showTableMenu)}
            title="Table"
            className={`p-1.5 rounded-md transition-colors ${
              editor.isActive('table')
                ? 'bg-apple-yellow/20 text-apple-yellow'
                : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
            }`}
          >
            <TableIcon size={17} />
          </button>

          {showTableMenu && (
            <div
              onMouseLeave={() => setShowTableMenu(false)}
              className="absolute left-0 top-9 z-30 w-48 py-1 bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder rounded-lg shadow-xl text-xs space-y-0.5"
            >
              <button
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  setShowTableMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover"
              >
                Insert Table (3x3)
              </button>
              {editor.isActive('table') && (
                <>
                  <div className="border-t border-apple-darkBorder/40 my-1"></div>
                  <button
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run();
                      setShowTableMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover"
                  >
                    Add Row Below
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run();
                      setShowTableMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover"
                  >
                    Add Column Right
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteRow().run();
                      setShowTableMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover text-rose-400"
                  >
                    Delete Row
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run();
                      setShowTableMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover text-rose-400"
                  >
                    Delete Column
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setShowTableMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover text-rose-400"
                  >
                    Delete Entire Table
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-apple-darkBorder mx-1 hidden sm:block"></div>

        {/* Basic formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Cmd+B)"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('bold')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <Bold size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Cmd+I)"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('italic')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <Italic size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Cmd+U)"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('underline')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <UnderlineIcon size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('strike')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <Strikethrough size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          className={`p-1.5 rounded-md transition-colors hidden md:inline-flex ${
            editor.isActive('bulletList')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <List size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          className={`p-1.5 rounded-md transition-colors hidden md:inline-flex ${
            editor.isActive('orderedList')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <ListOrdered size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
          className={`p-1.5 rounded-md transition-colors hidden lg:inline-flex ${
            editor.isActive('blockquote')
              ? 'bg-apple-yellow/20 text-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <Quote size={16} />
        </button>

        {/* Image Attachment Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach Image"
          className="p-1.5 rounded-md hover:bg-apple-darkHover text-apple-darkMuted hover:text-white transition-colors"
        >
          <ImageIcon size={16} />
        </button>
      </div>

      {/* Right side: Pin, Export, New Note */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Pin Button */}
        <button
          onClick={onTogglePin}
          title={isPinned ? "Unpin Note" : "Pin Note to top"}
          className={`p-1.5 rounded-md transition-colors ${
            isPinned
              ? 'bg-apple-yellow/20 text-apple-yellow fill-apple-yellow'
              : 'hover:bg-apple-darkHover text-apple-darkMuted hover:text-white'
          }`}
        >
          <Pin size={17} className={isPinned ? 'fill-current' : ''} />
        </button>

        {/* Export / Share Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Share / Export Note"
            className="p-1.5 rounded-md hover:bg-apple-darkHover text-apple-darkMuted hover:text-white transition-colors"
          >
            <Share2 size={17} />
          </button>

          {showExportMenu && (
            <div
              onMouseLeave={() => setShowExportMenu(false)}
              className="absolute right-0 top-9 z-30 w-44 py-1 bg-[#252528] dark:bg-[#252528] light:bg-white border border-apple-darkBorder rounded-lg shadow-xl text-xs space-y-0.5"
            >
              <button
                onClick={() => {
                  onExport('markdown');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center gap-2"
              >
                <FileCode size={14} className="text-apple-yellow" />
                <span>Export as Markdown</span>
              </button>
              <button
                onClick={() => {
                  onExport('txt');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center gap-2"
              >
                <Download size={14} className="text-apple-yellow" />
                <span>Export Plain Text</span>
              </button>
              <button
                onClick={() => {
                  onExport('html');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center gap-2"
              >
                <Download size={14} className="text-apple-yellow" />
                <span>Export HTML</span>
              </button>
              <button
                onClick={() => {
                  onExport('print');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-apple-darkHover flex items-center gap-2"
              >
                <Printer size={14} className="text-apple-yellow" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* New Note Button (Apple Gold) */}
        {!isTrashView && (
          <button
            onClick={onNewNote}
            title="New Note (Cmd+N)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold text-xs transition-colors shadow-sm"
          >
            <SquarePen size={14} />
            <span className="hidden sm:inline">New Note</span>
          </button>
        )}
      </div>
    </div>
  );
};
