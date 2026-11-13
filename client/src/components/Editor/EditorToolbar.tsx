import React, { useState, useRef, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  CheckSquare, 
  Table as TableIcon, 
  Pin, 
  Share2, 
  SquarePen, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Quote, 
  Image as ImageIcon,
  ChevronDown,
  ChevronLeft,
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
  onBackToList?: () => void;
}

type MenuType = 'folder' | 'typography' | 'table' | 'export' | null;

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
  onExport,
  onBackToList
}) => {
  const [openMenu, setOpenMenu] = useState<MenuType>(null);

  const folderMenuRef = useRef<HTMLDivElement | null>(null);
  const typographyMenuRef = useRef<HTMLDivElement | null>(null);
  const tableMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const refs: Record<Exclude<MenuType, null>, React.RefObject<HTMLDivElement | null>> = {
        folder: folderMenuRef,
        typography: typographyMenuRef,
        table: tableMenuRef,
        export: exportMenuRef
      };
      const activeRef = refs[openMenu];
      if (activeRef?.current && !activeRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    // Use capture phase so clicking inside ProseMirror or stopPropagation elements still closes dropdowns
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  if (!editor) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <div className="h-12 border-b border-notes-lightBorder dark:border-notes-darkBorder/60 bg-notes-lightBg dark:bg-notes-darkBg flex items-center justify-between px-4 select-none gap-2 transition-colors">
      {/* Left side: Mobile Back, Delete / Restore, Folder */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {onBackToList && (
          <button
            onClick={onBackToList}
            title="Back to Notes List"
            className="md:hidden flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-semibold text-amber-600 dark:text-notes-yellow hover:bg-notes-lightHover dark:hover:bg-notes-darkHover transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Notes</span>
          </button>
        )}

        {isTrashView ? (
          <button
            onClick={onRestoreNote}
            title="Put Back Note"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
            <span>Restore</span>
          </button>
        ) : (
          <button
            onClick={onDeleteNote}
            title="Delete Note"
            className="p-1.5 rounded-md hover:bg-rose-500/15 text-notes-lightMuted dark:text-notes-darkMuted hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
          >
            <Trash2 size={17} />
          </button>
        )}

        {/* Move note to another folder */}
        {!isTrashView && (
          <div className="relative" ref={folderMenuRef}>
            <button
              onClick={() => setOpenMenu(openMenu === 'folder' ? null : 'folder')}
              title="Move to Folder"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                openMenu === 'folder'
                  ? 'bg-notes-lightHover dark:bg-notes-darkHover text-black dark:text-white'
                  : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted'
              }`}
            >
              <FolderIcon size={14} className="text-notes-yellow" />
              <span className="max-w-[110px] truncate hidden sm:inline">
                {folders.find((f) => f.id === currentFolderId)?.name || 'Folder'}
              </span>
              <ChevronDown size={11} />
            </button>

            {openMenu === 'folder' && (
              <div className="absolute left-0 top-9 z-30 w-44 py-1 bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-lg shadow-xl text-xs">
                <div className="px-3 py-1 font-semibold text-[10px] text-notes-lightMuted dark:text-notes-darkMuted uppercase">
                  Move Note to:
                </div>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onMoveToFolder(f.id);
                      setOpenMenu(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center justify-between ${
                      currentFolderId === f.id ? 'text-amber-600 dark:text-notes-yellow font-medium' : 'text-notes-lightText dark:text-notes-darkText'
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

      {/* Middle side: Formatting Tools */}
      <div className="flex items-center gap-0.5 sm:gap-1">
        {/* Typography Menu: Aa */}
        <div className="relative" ref={typographyMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'typography' ? null : 'typography')}
            title="Text Style (Aa)"
            className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-amber-600 dark:text-notes-yellow font-bold text-sm transition-colors ${
              openMenu === 'typography'
                ? 'bg-notes-lightHover dark:bg-notes-darkHover'
                : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover'
            }`}
          >
            <span>Aa</span>
            <ChevronDown size={12} />
          </button>

          {openMenu === 'typography' && (
            <div className="absolute left-0 top-9 z-30 w-40 py-1 bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-lg shadow-xl text-xs space-y-0.5 text-notes-lightText dark:text-notes-darkText">
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setOpenMenu(null);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center justify-between ${
                  editor.isActive('heading', { level: 1 }) ? 'text-amber-600 dark:text-notes-yellow font-bold' : ''
                }`}
              >
                <span className="font-bold text-base">Title</span>
                <span className="text-[10px] opacity-50">H1</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setOpenMenu(null);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center justify-between ${
                  editor.isActive('heading', { level: 2 }) ? 'text-amber-600 dark:text-notes-yellow font-semibold' : ''
                }`}
              >
                <span className="font-semibold text-sm">Heading</span>
                <span className="text-[10px] opacity-50">H2</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setOpenMenu(null);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center justify-between ${
                  editor.isActive('heading', { level: 3 }) ? 'text-amber-600 dark:text-notes-yellow font-medium' : ''
                }`}
              >
                <span className="font-medium text-xs">Subheading</span>
                <span className="text-[10px] opacity-50">H3</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setOpenMenu(null);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center justify-between ${
                  editor.isActive('paragraph') ? 'text-amber-600 dark:text-notes-yellow' : ''
                }`}
              >
                <span>Body</span>
                <span className="text-[10px] opacity-50">P</span>
              </button>

              <button
                onClick={() => {
                  editor.chain().focus().toggleCodeBlock().run();
                  setOpenMenu(null);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover font-mono flex items-center justify-between ${
                  editor.isActive('codeBlock') ? 'text-amber-600 dark:text-notes-yellow' : ''
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
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <CheckSquare size={17} />
        </button>

        {/* Table Menu */}
        <div className="relative" ref={tableMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'table' ? null : 'table')}
            title="Table"
            className={`p-1.5 rounded-md transition-colors ${
              editor.isActive('table') || openMenu === 'table'
                ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
                : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
            }`}
          >
            <TableIcon size={17} />
          </button>

          {openMenu === 'table' && (
            <div className="absolute left-0 top-9 z-30 w-48 py-1 bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-lg shadow-xl text-xs space-y-0.5 text-notes-lightText dark:text-notes-darkText">
              <button
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover"
              >
                Insert Table (3x3)
              </button>
              {editor.isActive('table') && (
                <>
                  <div className="border-t border-notes-lightBorder dark:border-notes-darkBorder/40 my-1"></div>
                  <button
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover"
                  >
                    Add Row Below
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover"
                  >
                    Add Column Right
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteRow().run();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-rose-500"
                  >
                    Delete Row
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-rose-500"
                  >
                    Delete Column
                  </button>
                  <button
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setOpenMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-rose-500"
                  >
                    Delete Entire Table
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-notes-lightBorder dark:bg-notes-darkBorder mx-1 hidden sm:block"></div>

        {/* Basic formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Cmd+B)"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('bold')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <Bold size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Cmd+I)"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('italic')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <Italic size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Cmd+U)"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('underline')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <UnderlineIcon size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          className={`p-1.5 rounded-md transition-colors hidden sm:inline-flex ${
            editor.isActive('strike')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <Strikethrough size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          className={`p-1.5 rounded-md transition-colors hidden md:inline-flex ${
            editor.isActive('bulletList')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <List size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          className={`p-1.5 rounded-md transition-colors hidden md:inline-flex ${
            editor.isActive('orderedList')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <ListOrdered size={16} />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
          className={`p-1.5 rounded-md transition-colors hidden lg:inline-flex ${
            editor.isActive('blockquote')
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
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
          className="p-1.5 rounded-md hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white transition-colors"
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
              ? 'bg-notes-yellow/20 text-amber-700 dark:text-notes-yellow fill-notes-yellow'
              : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
          }`}
        >
          <Pin size={17} className={isPinned ? 'fill-current text-notes-yellow' : ''} />
        </button>

        {/* Export / Share Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
            title="Share / Export Note"
            className={`p-1.5 rounded-md transition-colors ${
              openMenu === 'export'
                ? 'bg-notes-lightHover dark:bg-notes-darkHover text-black dark:text-white'
                : 'hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white'
            }`}
          >
            <Share2 size={17} />
          </button>

          {openMenu === 'export' && (
            <div className="absolute right-0 top-9 z-30 w-44 py-1 bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-lg shadow-xl text-xs space-y-0.5 text-notes-lightText dark:text-notes-darkText">
              <button
                onClick={() => {
                  onExport('markdown');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center gap-2"
              >
                <FileCode size={14} className="text-notes-yellow" />
                <span>Export as Markdown</span>
              </button>
              <button
                onClick={() => {
                  onExport('txt');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center gap-2"
              >
                <Download size={14} className="text-notes-yellow" />
                <span>Export Plain Text</span>
              </button>
              <button
                onClick={() => {
                  onExport('html');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center gap-2"
              >
                <Download size={14} className="text-notes-yellow" />
                <span>Export HTML</span>
              </button>
              <button
                onClick={() => {
                  onExport('print');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover flex items-center gap-2"
              >
                <Printer size={14} className="text-notes-yellow" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* New Note Button */}
        {!isTrashView && (
          <button
            onClick={onNewNote}
            title="New Note (Cmd+N)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-notes-yellow hover:bg-notes-yellowHover text-black font-semibold text-xs transition-colors shadow-xs"
          >
            <SquarePen size={14} />
            <span className="hidden sm:inline">New Note</span>
          </button>
        )}
      </div>
    </div>
  );
};
