import React from 'react';
import { 
  Search, 
  X, 
  Pin, 
  Trash2, 
  ArrowUpDown, 
  FileText,
  Plus,
  Folder as FolderIcon
} from 'lucide-react';
import { Note, SortOption } from '../types';
import { formatAppleDate } from '../utils/date';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onNewNote: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  isTrashView: boolean;
  onEmptyTrash: () => void;
  folderTitle: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onNewNote,
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  isTrashView,
  onEmptyTrash,
  folderTitle,
  searchInputRef
}) => {
  const pinnedNotes = notes.filter((n) => n.is_pinned === 1 && !isTrashView);
  const regularNotes = notes.filter((n) => n.is_pinned === 0 || isTrashView);

  const renderNoteCard = (note: Note) => {
    const isSelected = note.id === selectedNoteId;
    const formattedDate = formatAppleDate(note.updated_at);

    // Dynamic title determination like native Apple Notes:
    // 1. If explicit title is set, use it
    // 2. Otherwise extract first non-empty line of content
    // 3. If note is completely empty, display "New Note" in placeholder style
    const firstLine = (note.plain_text || '')
      .split('\n')
      .map((s) => s.trim())
      .find((s) => s.length > 0) || '';

    const hasCustomTitle = Boolean(note.title && note.title.trim());
    const displayTitle = hasCustomTitle ? note.title.trim() : (firstLine || 'New Note');
    const isPlaceholderTitle = !hasCustomTitle && !firstLine;

    // Excerpt: clean text preview after the title
    let excerpt = (note.plain_text || '').trim();
    if (displayTitle && excerpt.startsWith(displayTitle)) {
      excerpt = excerpt.slice(displayTitle.length).trim();
    }
    if (!excerpt) {
      excerpt = 'No additional text';
    }

    return (
      <button
        key={note.id}
        onClick={() => onSelectNote(note.id)}
        className={`w-full text-left p-3 rounded-xl transition-all mb-1 select-none flex flex-col justify-between ${
          isSelected
            ? 'bg-apple-lightActive dark:bg-apple-darkActive text-apple-lightText dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
            : 'hover:bg-apple-lightHover/70 dark:hover:bg-apple-darkHover/60 text-apple-lightText/90 dark:text-apple-darkText/90'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`font-semibold text-sm leading-snug line-clamp-1 flex-1 ${
              isPlaceholderTitle ? 'italic opacity-60' : ''
            }`}
          >
            {displayTitle}
          </h3>
          {note.is_pinned === 1 && !isTrashView && (
            <Pin size={12} className="text-apple-yellow flex-shrink-0 mt-0.5 fill-apple-yellow" />
          )}
        </div>

        <div className="mt-1 flex items-baseline gap-2 text-xs">
          <span className="font-medium text-apple-lightMuted dark:text-apple-darkMuted flex-shrink-0">
            {formattedDate}
          </span>
          <span className="truncate opacity-75 text-apple-lightMuted dark:text-apple-darkMuted">
            {excerpt}
          </span>
        </div>

        {folderTitle === 'All Notes' && note.folder_name && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-apple-lightMuted dark:text-apple-darkMuted opacity-80">
            <FolderIcon size={11} className="flex-shrink-0" />
            <span className="truncate">{note.folder_name}</span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="w-80 flex-shrink-0 border-r border-apple-lightBorder dark:border-apple-darkBorder bg-apple-lightPanel dark:bg-[#202023] flex flex-col h-[calc(100vh-3rem)] transition-colors">
      {/* Top Bar: Search and Sort */}
      <div className="p-3 pb-2 border-b border-apple-lightBorder dark:border-apple-darkBorder/60 space-y-2">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-apple-lightMuted dark:text-apple-darkMuted"
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search all notes...`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg bg-black/5 dark:bg-black/30 border border-apple-lightBorder dark:border-apple-darkBorder/60 outline-none focus:border-apple-yellow text-apple-lightText dark:text-white placeholder:text-apple-lightMuted dark:placeholder:text-apple-darkMuted"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick New Note button in mobile / compact mode */}
          {!isTrashView && (
            <button
              onClick={onNewNote}
              title="New Note (Cmd+N)"
              className="p-1.5 rounded-lg bg-apple-yellow/20 hover:bg-apple-yellow text-amber-700 dark:text-apple-yellow hover:text-black transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Subhead / Sort and count */}
        <div className="flex items-center justify-between text-[11px] text-apple-lightMuted dark:text-apple-darkMuted px-1">
          <span className="font-medium truncate max-w-[150px]">
            {folderTitle} ({notes.length})
          </span>

          <div className="flex items-center gap-1">
            <ArrowUpDown size={12} />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-[11px] outline-none cursor-pointer text-apple-lightMuted dark:text-apple-darkMuted hover:text-black dark:hover:text-white"
            >
              <option value="updated_desc" className="bg-white dark:bg-[#252528] text-black dark:text-white">Date Modified</option>
              <option value="created_desc" className="bg-white dark:bg-[#252528] text-black dark:text-white">Date Created</option>
              <option value="title_asc" className="bg-white dark:bg-[#252528] text-black dark:text-white">Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trash View Banner */}
      {isTrashView && notes.length > 0 && (
        <div className="p-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between text-xs">
          <span className="text-rose-600 dark:text-rose-400 font-medium">Deleted notes</span>
          <button
            onClick={onEmptyTrash}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-700 dark:text-rose-300 hover:text-white transition-colors"
          >
            <Trash2 size={12} />
            Empty Trash
          </button>
        </div>
      )}

      {/* Notes List Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {notes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-apple-lightMuted dark:text-apple-darkMuted">
            <FileText size={36} className="mb-2 opacity-40 stroke-[1.5]" />
            <p className="text-sm font-medium">No Notes</p>
            <p className="text-xs mt-1 opacity-70">
              {searchQuery
                ? 'No notes matching your search'
                : isTrashView
                ? 'Recently deleted notes will appear here'
                : 'Click + to create your first note'}
            </p>
          </div>
        ) : (
          <div>
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-apple-lightMuted dark:text-apple-darkMuted">
                  <Pin size={11} className="fill-current text-apple-yellow" />
                  <span>Pinned</span>
                </div>
                <div>{pinnedNotes.map(renderNoteCard)}</div>
              </div>
            )}

            {/* Notes Section */}
            {regularNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <div className="px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-apple-lightMuted dark:text-apple-darkMuted">
                    Notes
                  </div>
                )}
                <div>{regularNotes.map(renderNoteCard)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
