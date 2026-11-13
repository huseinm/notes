import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder as FolderIcon, 
  FolderPlus, 
  Trash2, 
  Layers, 
  MoreVertical, 
  Edit2, 
  Trash,
  FolderOpen
} from 'lucide-react';
import { Folder, FolderStats, ViewType } from '../types';

interface SidebarProps {
  folders: Folder[];
  stats: FolderStats;
  selectedView: ViewType;
  selectedFolderId: string | null;
  onSelectView: (view: ViewType, folderId?: string | null) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  stats,
  selectedView,
  selectedFolderId,
  onSelectView,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuFolderId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFolderId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuFolderId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuFolderId]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreating(false);
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0 border-r border-notes-lightBorder dark:border-notes-darkBorder bg-notes-lightSidebar dark:bg-notes-darkSidebar flex flex-col h-[calc(100vh-3rem)] select-none transition-colors">
      {/* Folder Section List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* All Notes */}
        <button
          onClick={() => onSelectView('all', null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedView === 'all'
              ? 'bg-notes-lightActive dark:bg-notes-darkActive text-notes-lightText dark:text-white font-semibold shadow-xs'
              : 'text-notes-lightText/80 dark:text-notes-darkText/80 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover'
          }`}
        >
          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
            <Layers size={17} className="text-notes-yellow flex-shrink-0" />
            <span className="truncate">All Notes</span>
          </div>
          <span className="text-xs text-notes-lightMuted dark:text-notes-darkMuted font-normal px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-black/20 min-w-[22px] text-center tabular-nums flex-shrink-0">
            {stats.all}
          </span>
        </button>

        {/* Separator / Header */}
        <div className="pt-3 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-notes-lightMuted dark:text-notes-darkMuted">
          Folders
        </div>

        {/* Individual Folders */}
        {folders.map((folder) => {
          const isSelected = selectedView === 'folder' && selectedFolderId === folder.id;
          const isMenuOpen = menuFolderId === folder.id;

          return (
            <div
              key={folder.id}
              ref={isMenuOpen ? menuRef : null}
              className="relative group"
            >
              <button
                onClick={() => onSelectView('folder', folder.id)}
                onContextMenu={(e) => {
                  if (!folder.is_default) {
                    e.preventDefault();
                    setMenuFolderId(folder.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-notes-lightActive dark:bg-notes-darkActive text-notes-lightText dark:text-white font-semibold shadow-xs'
                    : 'text-notes-lightText/80 dark:text-notes-darkText/80 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                  {isSelected ? (
                    <FolderOpen size={17} className="text-notes-yellow flex-shrink-0" />
                  ) : (
                    <FolderIcon size={17} className="text-notes-yellow flex-shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 3-dots Menu Button for Folder Actions (positioned to left of count) */}
                  {!folder.is_default && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFolderId(isMenuOpen ? null : folder.id);
                      }}
                      className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-notes-lightMuted dark:text-notes-darkMuted transition-opacity ${
                        isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      title="Folder options"
                    >
                      <MoreVertical size={13} />
                    </button>
                  )}

                  <span className="text-xs text-notes-lightMuted dark:text-notes-darkMuted font-normal px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-black/20 min-w-[22px] text-center tabular-nums">
                    {folder.note_count}
                  </span>
                </div>
              </button>

              {/* Context Dropdown */}
              {isMenuOpen && (
                <div
                  className="absolute right-2 top-9 z-30 w-36 py-1 bg-white dark:bg-[#252528] border border-notes-lightBorder dark:border-notes-darkBorder rounded-lg shadow-xl text-xs"
                >
                  <button
                    onClick={() => {
                      setMenuFolderId(null);
                      onRenameFolder(folder);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover text-notes-lightText dark:text-notes-darkText"
                  >
                    <Edit2 size={13} />
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      setMenuFolderId(null);
                      onDeleteFolder(folder.id);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-500/10 text-rose-500 dark:text-rose-400"
                  >
                    <Trash size={13} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Recently Deleted / Trash */}
        <div className="pt-3">
          <button
            onClick={() => onSelectView('trash', null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === 'trash'
                ? 'bg-notes-lightActive dark:bg-notes-darkActive text-notes-lightText dark:text-white font-semibold shadow-xs'
                : 'text-notes-lightText/80 dark:text-notes-darkText/80 hover:bg-notes-lightHover dark:hover:bg-notes-darkHover'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
              <Trash2 size={17} className="text-notes-lightMuted dark:text-notes-darkMuted flex-shrink-0" />
              <span className="truncate">Recently Deleted</span>
            </div>
            <span className="text-xs text-notes-lightMuted dark:text-notes-darkMuted font-normal px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-black/20 min-w-[22px] text-center tabular-nums flex-shrink-0">
              {stats.trash}
            </span>
          </button>
        </div>
      </div>

      {/* Footer: Create Folder Form / Button */}
      <div className="p-2 border-t border-notes-lightBorder dark:border-notes-darkBorder">
        {isCreating ? (
          <form onSubmit={handleCreateSubmit} className="space-y-1.5">
            <input
              type="text"
              autoFocus
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-black/30 border border-notes-lightBorder dark:border-notes-darkBorder outline-none focus:border-notes-yellow text-notes-lightText dark:text-white"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName('');
                }}
                className="text-[11px] px-2 py-1 rounded text-notes-lightMuted dark:text-notes-darkMuted hover:text-black dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-[11px] px-2.5 py-1 rounded bg-notes-yellow hover:bg-notes-yellowHover text-black font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-600 dark:text-notes-yellow hover:bg-notes-lightHover dark:hover:bg-notes-darkHover transition-colors"
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>
        )}
      </div>
    </aside>
  );
};
