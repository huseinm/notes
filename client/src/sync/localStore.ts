import { Folder, FolderStats, Note, SortOption } from '../types';

export type SyncConnectionStatus =
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'local_only'
  | 'auth_required';

export interface ServerConfig {
  mode: 'same_origin' | 'remote_server' | 'local_only';
  serverUrl: string;
  authToken: string | null;
  lastSyncedAt: number | null;
}

export interface SyncStatusSnapshot {
  status: SyncConnectionStatus;
  config: ServerConfig;
  pendingCount: number;
  lastError: string | null;
}

interface LocalDatabaseState {
  folders: Folder[];
  notes: Note[];
  dirtyFolderIds: string[];
  dirtyNoteIds: string[];
  deletedFolderIds: string[];
  deletedNoteIds: string[];
}

const STORAGE_DB_KEY = 'notes_offline_db_v1';
const STORAGE_CONFIG_KEY = 'notes_server_config_v1';

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }
  return window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';
}

export function normalizeServerUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

function getDefaultConfig(): ServerConfig {
  const native = isNativeApp();
  return {
    mode: native ? 'local_only' : 'same_origin',
    serverUrl: '',
    authToken: null,
    lastSyncedAt: null
  };
}

export function loadServerConfig(): ServerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!raw) return getDefaultConfig();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultConfig(),
      ...parsed
    };
  } catch {
    return getDefaultConfig();
  }
}

export function saveServerConfig(updates: Partial<ServerConfig>): ServerConfig {
  const current = loadServerConfig();
  const next: ServerConfig = {
    ...current,
    ...updates
  };
  if (next.serverUrl) {
    next.serverUrl = normalizeServerUrl(next.serverUrl);
  }
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(next));
  notifyListeners();
  return next;
}

function createInitialLocalDb(): LocalDatabaseState {
  const now = Date.now();
  const defaultFolderId = 'folder-default';
  return {
    folders: [
      {
        id: defaultFolderId,
        name: 'Notes',
        icon: 'folder',
        is_default: 1,
        note_count: 1,
        created_at: now,
        updated_at: now
      }
    ],
    notes: [
      {
        id: 'note-welcome',
        folder_id: defaultFolderId,
        folder_name: 'Notes',
        title: 'Welcome to Notes (Self-Hosted)',
        content: `<h1>Welcome to Notes (Self-Hosted)</h1><p>Your notes are stored locally on this device for instant offline access and can be synced in real time with your self-hosted NAS or server.</p>`,
        plain_text:
          'Welcome to Notes (Self-Hosted) Your notes are stored locally on this device for instant offline access and can be synced in real time with your self-hosted NAS or server.',
        is_pinned: 1,
        is_trashed: 0,
        created_at: now,
        updated_at: now
      }
    ],
    dirtyFolderIds: [],
    dirtyNoteIds: [],
    deletedFolderIds: [],
    deletedNoteIds: []
  };
}

export function loadLocalDb(): LocalDatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_DB_KEY);
    if (!raw) {
      const initial = createInitialLocalDb();
      saveLocalDb(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      dirtyFolderIds: Array.isArray(parsed.dirtyFolderIds) ? parsed.dirtyFolderIds : [],
      dirtyNoteIds: Array.isArray(parsed.dirtyNoteIds) ? parsed.dirtyNoteIds : [],
      deletedFolderIds: Array.isArray(parsed.deletedFolderIds) ? parsed.deletedFolderIds : [],
      deletedNoteIds: Array.isArray(parsed.deletedNoteIds) ? parsed.deletedNoteIds : []
    };
  } catch {
    return createInitialLocalDb();
  }
}

export function saveLocalDb(state: LocalDatabaseState): void {
  try {
    localStorage.setItem(STORAGE_DB_KEY, JSON.stringify(state));
    notifyListeners();
  } catch (err) {
    console.error('Failed to persist local DB:', err);
  }
}

// Compute folder counts and stats from local state
export function getLocalFoldersAndStats(): { folders: Folder[]; stats: FolderStats } {
  const db = loadLocalDb();
  const activeNotes = db.notes.filter((n) => n.is_trashed === 0);
  const trashedNotes = db.notes.filter((n) => n.is_trashed === 1);

  const foldersWithCounts = db.folders
    .map((f) => ({
      ...f,
      note_count: activeNotes.filter((n) => n.folder_id === f.id).length
    }))
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return b.is_default - a.is_default;
      return a.created_at - b.created_at;
    });

  return {
    folders: foldersWithCounts,
    stats: {
      all: activeNotes.length,
      trash: trashedNotes.length
    }
  };
}

// Query local notes with filtering, search, and sorting
export function queryLocalNotes(options: {
  folder_id?: string;
  trashed?: boolean;
  q?: string;
  sort?: SortOption;
}): Note[] {
  const db = loadLocalDb();
  const folderMap = new Map(db.folders.map((f) => [f.id, f.name]));
  const isTrashed = options.trashed ? 1 : 0;

  let filtered = db.notes
    .filter((n) => n.is_trashed === isTrashed)
    .map((n) => ({
      ...n,
      folder_name: n.folder_id ? folderMap.get(n.folder_id) || n.folder_name : n.folder_name
    }));

  if (options.folder_id && options.folder_id !== 'all' && isTrashed === 0) {
    filtered = filtered.filter((n) => n.folder_id === options.folder_id);
  }

  if (options.q && options.q.trim()) {
    const q = options.q.trim().toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.plain_text || '').toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return b.is_pinned - a.is_pinned;
    }
    switch (options.sort) {
      case 'updated_asc':
        return a.updated_at - b.updated_at;
      case 'created_desc':
        return b.created_at - a.created_at;
      case 'title_asc': {
        const titleA = ((a.title || '').trim() || (a.plain_text || '').trim()).toLowerCase();
        const titleB = ((b.title || '').trim() || (b.plain_text || '').trim()).toLowerCase();
        return titleA.localeCompare(titleB);
      }
      case 'updated_desc':
      default:
        return b.updated_at - a.updated_at;
    }
  });

  return filtered;
}

// Replace local folders & notes after a successful server sync while preserving any in-flight dirty edits
export function applyServerSyncSnapshot(
  serverFolders: Folder[],
  serverNotes: Note[],
  syncedFolderIds: string[],
  syncedNoteIds: string[],
  syncedDeletedFolderIds: string[],
  syncedDeletedNoteIds: string[]
): void {
  const db = loadLocalDb();

  const remainingDirtyFolders = db.dirtyFolderIds.filter((id) => !syncedFolderIds.includes(id));
  const remainingDirtyNotes = db.dirtyNoteIds.filter((id) => !syncedNoteIds.includes(id));
  const remainingDeletedFolders = db.deletedFolderIds.filter(
    (id) => !syncedDeletedFolderIds.includes(id)
  );
  const remainingDeletedNotes = db.deletedNoteIds.filter(
    (id) => !syncedDeletedNoteIds.includes(id)
  );

  saveLocalDb({
    folders: serverFolders,
    notes: serverNotes,
    dirtyFolderIds: remainingDirtyFolders,
    dirtyNoteIds: remainingDirtyNotes,
    deletedFolderIds: remainingDeletedFolders,
    deletedNoteIds: remainingDeletedNotes
  });
}

// Reactive sync status state
let currentStatus: SyncConnectionStatus = loadServerConfig().mode === 'local_only' ? 'local_only' : 'synced';
let currentError: string | null = null;
const listeners = new Set<(snapshot: SyncStatusSnapshot) => void>();

export function setSyncStatus(status: SyncConnectionStatus, error: string | null = null): void {
  currentStatus = status;
  currentError = error;
  notifyListeners();
}

export function getSyncSnapshot(): SyncStatusSnapshot {
  const config = loadServerConfig();
  const db = loadLocalDb();
  const pendingCount =
    db.dirtyNoteIds.length +
    db.dirtyFolderIds.length +
    db.deletedNoteIds.length +
    db.deletedFolderIds.length;

  return {
    status: config.mode === 'local_only' ? 'local_only' : currentStatus,
    config,
    pendingCount,
    lastError: currentError
  };
}

function notifyListeners(): void {
  const snap = getSyncSnapshot();
  listeners.forEach((fn) => fn(snap));
}

export function subscribeSyncStatus(listener: (snapshot: SyncStatusSnapshot) => void): () => void {
  listeners.add(listener);
  listener(getSyncSnapshot());
  return () => {
    listeners.delete(listener);
  };
}
