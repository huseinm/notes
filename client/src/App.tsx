import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { NotesList } from './components/NotesList';
import { TipTapEditor } from './components/Editor/TipTapEditor';
import { FolderModal } from './components/Modals/FolderModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { ShortcutsModal } from './components/Modals/ShortcutsModal';
import { Folder, FolderStats, Note, SortOption, ViewType } from './types';
import * as api from './api';
import { ChevronLeft, FileText, SquarePen } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state: default to dark as shown in user screenshot
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('apple_notes_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  // Layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<'sidebar' | 'list' | 'editor'>('list');

  // Data state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [stats, setStats] = useState<FolderStats>({ all: 0, trash: 0 });
  const [selectedView, setSelectedView] = useState<ViewType>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const selectedNoteIdRef = useRef<string | null>(null);
  selectedNoteIdRef.current = selectedNoteId;
  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('updated_desc');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Modals state
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync theme with HTML class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('apple_notes_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const data = await api.getFolders();
      setFolders(data.folders);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  // Load notes for current view/folder/search
  const loadNotes = useCallback(async () => {
    try {
      const isTrash = selectedView === 'trash';
      const folderId = selectedView === 'folder' ? selectedFolderId || undefined : undefined;
      const data = await api.getNotes({
        folder_id: folderId,
        trashed: isTrash,
        q: searchQuery,
        sort: sortOption
      });
      setNotes(data);

      // Auto-select first note if none selected or if selected note is not in list
      const currentSelectedId = selectedNoteIdRef.current;
      if (data.length > 0) {
        if (!currentSelectedId || !data.some((n) => n.id === currentSelectedId)) {
          setSelectedNoteId(data[0].id);
          setActiveNote(data[0]);
        } else {
          const current = data.find((n) => n.id === currentSelectedId);
          if (current) setActiveNote(current);
        }
      } else {
        setSelectedNoteId(null);
        setActiveNote(null);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }, [selectedView, selectedFolderId, searchQuery, sortOption]);

  // Initial load
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Handle switching note selection
  const handleSelectNote = async (noteId: string) => {
    setSelectedNoteId(noteId);
    setMobilePane('editor');
    try {
      const note = await api.getNote(noteId);
      setActiveNote(note);
    } catch (err) {
      console.error('Failed to load note detail:', err);
    }
  };

  // Handle creating a new note
  const handleNewNote = async () => {
    try {
      setSaveStatus('saving');
      // Folder assignment
      const targetFolderId = selectedView === 'folder' ? selectedFolderId : null;
      const newNote = await api.createNote({
        folder_id: targetFolderId,
        title: '',
        content: '',
        plain_text: ''
      });

      await loadFolders();
      await loadNotes();
      setSelectedNoteId(newNote.id);
      setActiveNote(newNote);
      setMobilePane('editor');
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to create note:', err);
      setSaveStatus('error');
    }
  };

  // Handle updating active note (auto-save & folder move)
  const handleUpdateNote = async (
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'plain_text' | 'folder_id' | 'is_pinned'>>
  ) => {
    try {
      setSaveStatus('saving');

      const isMovingFolder = updates.folder_id !== undefined;
      const currentNote = activeNote?.id === noteId ? activeNote : notes.find((n) => n.id === noteId);
      const oldFolderId = currentNote?.folder_id;

      // Optimistic UI update when moving a note to another folder
      if (isMovingFolder && oldFolderId !== updates.folder_id) {
        const targetFolder = folders.find((f) => f.id === updates.folder_id);

        // 1. Immediately update folder badge counts in the sidebar
        setFolders((prev) =>
          prev.map((f) => {
            if (f.id === oldFolderId) {
              return { ...f, note_count: Math.max(0, (f.note_count || 0) - 1) };
            }
            if (f.id === updates.folder_id) {
              return { ...f, note_count: (f.note_count || 0) + 1 };
            }
            return f;
          })
        );

        // 2. If viewing a specific folder and note was moved out of it, remove it immediately from list
        if (selectedView === 'folder' && selectedFolderId && updates.folder_id !== selectedFolderId) {
          const remaining = notes.filter((n) => n.id !== noteId);
          setNotes(remaining);
          if (selectedNoteId === noteId) {
            const nextNote = remaining[0] || null;
            setSelectedNoteId(nextNote ? nextNote.id : null);
            setActiveNote(nextNote);
          }
        } else {
          // In "All Notes" view, update folder_id and folder_name in-place without refreshing editor
          const optimisticPatch = {
            ...updates,
            folder_name: targetFolder?.name
          };
          setActiveNote((prev) => (prev && prev.id === noteId ? { ...prev, ...optimisticPatch } : prev));
          setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? { ...n, ...optimisticPatch } : n))
          );
        }
      }

      const updated = await api.updateNote(noteId, updates);

      // Only update activeNote/notes if the note wasn't moved out of the current folder view
      const movedOutOfCurrentFolder =
        isMovingFolder &&
        selectedView === 'folder' &&
        selectedFolderId &&
        updates.folder_id !== selectedFolderId;

      if (!movedOutOfCurrentFolder) {
        setActiveNote((prev) => (prev && prev.id === noteId ? updated : prev));
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, ...updated } : n))
        );
      }

      // Sync authoritative folder counts in background
      if (isMovingFolder) {
        await loadFolders();
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to update note:', err);
      setSaveStatus('error');
    }
  };

  // Toggle Pin
  const handleTogglePin = async () => {
    if (!activeNote) return;
    try {
      const updated = await api.togglePin(activeNote.id);
      setActiveNote(updated);
      await loadNotes();
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Delete / Trash Note
  const handleDeleteNote = async () => {
    if (!activeNote) return;
    try {
      if (selectedView === 'trash') {
        // Permanent delete
        if (confirm('Permanently delete this note? This action cannot be undone.')) {
          await api.deleteNotePermanently(activeNote.id);
          await loadFolders();
          await loadNotes();
        }
      } else {
        // Move to trash
        await api.trashNote(activeNote.id);
        await loadFolders();
        await loadNotes();
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  // Restore Note
  const handleRestoreNote = async () => {
    if (!activeNote) return;
    try {
      await api.restoreNote(activeNote.id);
      await loadFolders();
      await loadNotes();
    } catch (err) {
      console.error('Failed to restore note:', err);
    }
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    if (confirm('Are you sure you want to permanently empty the trash? All deleted notes will be lost.')) {
      try {
        await api.emptyTrash();
        await loadFolders();
        await loadNotes();
      } catch (err) {
        console.error('Failed to empty trash:', err);
      }
    }
  };

  // Folder actions
  const handleCreateFolder = async (name: string) => {
    try {
      const created = await api.createFolder(name);
      await loadFolders();
      setSelectedView('folder');
      setSelectedFolderId(created.id);
    } catch (err: any) {
      alert(`Error creating folder: ${err.message}`);
    }
  };

  const handleRenameFolderSave = async (id: string, name: string) => {
    try {
      await api.updateFolder(id, name);
      await loadFolders();
    } catch (err: any) {
      alert(`Error renaming folder: ${err.message}`);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder? Notes inside will be moved to the default folder.')) {
      try {
        await api.deleteFolder(folderId);
        if (selectedFolderId === folderId) {
          setSelectedView('all');
          setSelectedFolderId(null);
        }
        await loadFolders();
        await loadNotes();
      } catch (err: any) {
        alert(`Error deleting folder: ${err.message}`);
      }
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === 'Escape') {
        setEditingFolder(null);
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewNote();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setMobilePane('list');
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (isCmdOrCtrl && e.key === '\\') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      } else if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewNote]);

  // Current folder title calculation
  const getFolderTitle = () => {
    if (selectedView === 'all') return 'All Notes';
    if (selectedView === 'trash') return 'Recently Deleted';
    const folder = folders.find((f) => f.id === selectedFolderId);
    return folder ? folder.name : 'Notes';
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-apple-lightBg dark:bg-apple-darkBg font-sans text-apple-lightText dark:text-apple-darkText transition-colors">
      {/* Top Header */}
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        saveStatus={saveStatus}
      />

      {/* Main 3-Pane Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Mobile pane navigation breadcrumb on tiny screens */}
        <div className="md:hidden absolute top-2 left-2 z-40 flex items-center gap-1">
          {mobilePane !== 'sidebar' && (
            <button
              onClick={() => setMobilePane(mobilePane === 'editor' ? 'list' : 'sidebar')}
              className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-apple-yellow flex items-center text-xs gap-1"
            >
              <ChevronLeft size={16} />
              <span>{mobilePane === 'editor' ? 'Notes' : 'Folders'}</span>
            </button>
          )}
        </div>

        {/* Pane 1: Folders Sidebar */}
        <div
          className={`${
            !isSidebarOpen
              ? 'hidden'
              : mobilePane === 'sidebar'
              ? 'block w-full md:w-auto'
              : 'hidden md:block'
          }`}
        >
          <Sidebar
            folders={folders}
            stats={stats}
            selectedView={selectedView}
            selectedFolderId={selectedFolderId}
            onSelectView={(view, folderId) => {
              setSelectedView(view);
              setSelectedFolderId(folderId || null);
              setMobilePane('list');
            }}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={(f) => setEditingFolder(f)}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        {/* Pane 2: Notes List */}
        <div
          className={`${
            mobilePane === 'list' || mobilePane === 'sidebar' ? 'block' : 'hidden md:block'
          } ${mobilePane === 'list' ? 'w-full md:w-80' : 'w-80'}`}
        >
          <NotesList
            notes={notes}
            selectedNoteId={selectedNoteId}
            onSelectNote={handleSelectNote}
            onNewNote={handleNewNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortOption={sortOption}
            onSortChange={setSortOption}
            isTrashView={selectedView === 'trash'}
            onEmptyTrash={handleEmptyTrash}
            folderTitle={getFolderTitle()}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Pane 3: Note Editor */}
        <div
          className={`flex-1 flex flex-col h-full overflow-hidden ${
            mobilePane === 'editor' ? 'block w-full' : 'hidden md:flex'
          }`}
        >
          {activeNote ? (
            <TipTapEditor
              key={activeNote.id}
              note={activeNote}
              folders={folders}
              onUpdateNote={handleUpdateNote}
              onTogglePin={handleTogglePin}
              onDeleteNote={handleDeleteNote}
              isTrashView={selectedView === 'trash'}
              onRestoreNote={handleRestoreNote}
              onNewNote={handleNewNote}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-apple-lightMuted dark:text-apple-darkMuted">
              <FileText size={48} className="mb-3 opacity-30 stroke-[1.2]" />
              <h2 className="text-lg font-semibold mb-1">No Note Selected</h2>
              <p className="text-xs max-w-xs opacity-75 mb-4">
                Choose a note from the list on the left, or create a brand new note to begin writing.
              </p>
              {selectedView !== 'trash' && (
                <button
                  onClick={handleNewNote}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-apple-yellow hover:bg-apple-yellowHover text-black font-semibold text-xs shadow-sm transition-colors"
                >
                  <SquarePen size={15} />
                  <span>Create Note</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <FolderModal
        folder={editingFolder}
        isOpen={editingFolder !== null}
        onClose={() => setEditingFolder(null)}
        onSave={handleRenameFolderSave}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        stats={{
          totalNotes: stats.all,
          totalFolders: folders.length
        }}
        onRefreshData={async () => {
          await loadFolders();
          await loadNotes();
        }}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </div>
  );
};
