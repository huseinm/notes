import { Folder, FolderStats, Note, SortOption } from './types';
import {
  applyServerSyncSnapshot,
  getLocalFoldersAndStats,
  loadLocalDb,
  loadServerConfig,
  normalizeServerUrl,
  queryLocalNotes,
  saveLocalDb,
  saveServerConfig,
  setSyncStatus
} from './sync/localStore';

function generateLocalId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getApiBase(): string | null {
  const config = loadServerConfig();
  if (config.mode === 'local_only') {
    return null;
  }
  if (config.mode === 'remote_server') {
    const base = normalizeServerUrl(config.serverUrl);
    return base ? `${base}/api` : null;
  }
  return '/api';
}

export function getServerOrigin(): string {
  const config = loadServerConfig();
  if (config.mode === 'remote_server') {
    return normalizeServerUrl(config.serverUrl);
  }
  return '';
}

function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const config = loadServerConfig();
  const headers: Record<string, string> = { ...extra };
  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }
  return headers;
}

// Resolve relative /uploads/... image paths when connected to a remote NAS server from Meta Quest APK
function resolveNoteImageUrls(note: Note): Note {
  const origin = getServerOrigin();
  if (!origin || !note.content) return note;
  const updatedContent = note.content.replace(
    /src=(["'])\/uploads\//g,
    `src=$1${origin}/uploads/`
  );
  return updatedContent === note.content ? note : { ...note, content: updatedContent };
}

// Normalize absolute server /uploads/... back to relative before sending to server
function normalizeContentForServer(content = ''): string {
  const origin = getServerOrigin();
  if (!origin || !content) return content;
  return content.split(`${origin}/uploads/`).join('/uploads/');
}

let activeSyncPromise: Promise<boolean> | null = null;

/**
 * Bi-directional sync with the self-hosted NAS/server.
 * Pushes all local notes/folders & queued deletions, and pulls merged server state.
 */
export async function syncWithServer(pushAllLocal = false): Promise<boolean> {
  const apiBase = getApiBase();
  if (!apiBase) {
    setSyncStatus('local_only');
    return false;
  }

  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      setSyncStatus('syncing');
      const db = loadLocalDb();

      const foldersToPush = pushAllLocal
        ? db.folders
        : db.folders.filter((f) => db.dirtyFolderIds.includes(f.id));
      const notesToPush = (
        pushAllLocal
          ? db.notes
          : db.notes.filter((n) => db.dirtyNoteIds.includes(n.id))
      ).map((n) => ({
        ...n,
        content: normalizeContentForServer(n.content)
      }));

      const deletedFoldersToPush = [...db.deletedFolderIds];
      const deletedNotesToPush = [...db.deletedNoteIds];

      const res = await fetch(`${apiBase}/sync`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          folders: foldersToPush,
          notes: notesToPush,
          deletedFolderIds: deletedFoldersToPush,
          deletedNoteIds: deletedNotesToPush
        })
      });

      if (res.status === 401) {
        setSyncStatus('auth_required', 'Server password required');
        return false;
      }

      if (!res.ok) {
        throw new Error(`Sync failed (${res.status})`);
      }

      const data = await res.json();
      const resolvedNotes = Array.isArray(data.notes)
        ? data.notes.map(resolveNoteImageUrls)
        : [];

      applyServerSyncSnapshot(
        Array.isArray(data.folders) ? data.folders : [],
        resolvedNotes,
        foldersToPush.map((f) => f.id),
        notesToPush.map((n) => n.id),
        deletedFoldersToPush,
        deletedNotesToPush
      );

      saveServerConfig({ lastSyncedAt: data.syncedAt || Date.now() });
      setSyncStatus('synced');
      return true;
    } catch (err: any) {
      setSyncStatus('offline', err?.message || 'Server unreachable — working offline');
      return false;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

/**
 * Connect and authenticate with a self-hosted server (or test connection)
 */
export async function connectToServer(options: {
  mode: 'same_origin' | 'remote_server' | 'local_only';
  serverUrl?: string;
  password?: string;
}): Promise<{ success: boolean; message: string; authRequired?: boolean }> {
  if (options.mode === 'local_only') {
    saveServerConfig({
      mode: 'local_only',
      serverUrl: '',
      authToken: null
    });
    setSyncStatus('local_only');
    return {
      success: true,
      message: 'Switched to Standalone On-Device mode. All notes are stored locally on this device.'
    };
  }

  const normalizedUrl =
    options.mode === 'remote_server' ? normalizeServerUrl(options.serverUrl || '') : '';
  if (options.mode === 'remote_server' && !normalizedUrl) {
    throw new Error('Please enter your server IP or URL (e.g. http://192.168.1.50:3000)');
  }

  const apiBase = options.mode === 'remote_server' ? `${normalizedUrl}/api` : '/api';
  const currentConfig = loadServerConfig();

  // 1. Check server health & auth status
  let statusRes: Response;
  try {
    statusRes = await fetch(`${apiBase}/auth/status`, {
      headers: currentConfig.authToken
        ? { Authorization: `Bearer ${currentConfig.authToken}` }
        : {}
    });
  } catch {
    throw new Error(
      `Could not reach server at ${normalizedUrl || window.location.origin}. Check that your NAS/server is running and on the same network.`
    );
  }

  if (!statusRes.ok) {
    throw new Error(`Server returned status ${statusRes.status}`);
  }

  const statusData = await statusRes.json();
  let token = currentConfig.authToken;

  // 2. If auth is required and either not authenticated or a new password was provided, log in
  if (statusData.authRequired && (!statusData.authenticated || options.password !== undefined)) {
    if (!options.password) {
      saveServerConfig({
        mode: options.mode,
        serverUrl: normalizedUrl
      });
      setSyncStatus('auth_required', 'Server requires a password');
      return {
        success: false,
        authRequired: true,
        message: 'This server is password-protected. Please enter your server password.'
      };
    }

    const loginRes = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: options.password })
    });

    if (!loginRes.ok) {
      const errData = await loginRes.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid server password');
    }

    const loginData = await loginRes.json();
    token = loginData.token || null;
  }

  // 3. Save config and perform a full 2-way merge sync (pushes any local offline notes + pulls server notes)
  saveServerConfig({
    mode: options.mode,
    serverUrl: normalizedUrl,
    authToken: token
  });

  const synced = await syncWithServer(true);
  if (!synced) {
    throw new Error('Connected to server, but initial synchronization failed.');
  }

  return {
    success: true,
    message: 'Connected and synced all notes with your server!'
  };
}

export async function updateServerPassword(newPassword: string): Promise<{ message: string }> {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error('Connect to a server first to configure server password protection.');
  }

  const res = await fetch(`${apiBase}/auth/password`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ newPassword })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update server password');
  }

  saveServerConfig({ authToken: data.token || null });
  return { message: data.message || 'Server password updated' };
}

// ============================================================================
// Offline-First Data Operations (Folders & Notes)
// ============================================================================

export async function getFolders(): Promise<{ folders: Folder[]; stats: FolderStats }> {
  const apiBase = getApiBase();
  if (apiBase) {
    const db = loadLocalDb();
    const hasPendingChanges =
      db.dirtyNoteIds.length > 0 ||
      db.dirtyFolderIds.length > 0 ||
      db.deletedNoteIds.length > 0 ||
      db.deletedFolderIds.length > 0;

    if (hasPendingChanges) {
      await syncWithServer(false);
    } else {
      try {
        const res = await fetch(`${apiBase}/folders`, { headers: getAuthHeaders() });
        if (res.status === 401) {
          setSyncStatus('auth_required', 'Server password required');
        } else if (res.ok) {
          const data = await res.json();
          const currentDb = loadLocalDb();
          saveLocalDb({
            ...currentDb,
            folders: data.folders
          });
          setSyncStatus('synced');
          return data;
        }
      } catch {
        setSyncStatus('offline', 'Working offline — changes saved on device');
      }
    }
  }
  return getLocalFoldersAndStats();
}

export async function createFolder(name: string): Promise<Folder> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Folder name is required');

  const db = loadLocalDb();
  const now = Date.now();
  const newFolder: Folder = {
    id: generateLocalId('folder'),
    name: trimmed,
    icon: 'folder',
    is_default: 0,
    note_count: 0,
    created_at: now,
    updated_at: now
  };

  saveLocalDb({
    ...db,
    folders: [...db.folders, newFolder],
    dirtyFolderIds: Array.from(new Set([...db.dirtyFolderIds, newFolder.id]))
  });

  await syncWithServer(false);
  return newFolder;
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Folder name is required');

  const db = loadLocalDb();
  const now = Date.now();
  let updatedFolder: Folder | null = null;

  const folders = db.folders.map((f) => {
    if (f.id === id) {
      updatedFolder = { ...f, name: trimmed, updated_at: now };
      return updatedFolder;
    }
    return f;
  });

  if (!updatedFolder) throw new Error('Folder not found');

  saveLocalDb({
    ...db,
    folders,
    dirtyFolderIds: Array.from(new Set([...db.dirtyFolderIds, id]))
  });

  await syncWithServer(false);
  return updatedFolder;
}

export async function deleteFolder(id: string): Promise<void> {
  const db = loadLocalDb();
  const folder = db.folders.find((f) => f.id === id);
  if (folder?.is_default) {
    throw new Error('Cannot delete the default Notes folder');
  }

  const defaultFolder = db.folders.find((f) => f.is_default === 1) || db.folders[0];
  const fallbackFolderId = defaultFolder ? defaultFolder.id : null;

  saveLocalDb({
    ...db,
    folders: db.folders.filter((f) => f.id !== id),
    notes: db.notes.map((n) =>
      n.folder_id === id ? { ...n, folder_id: fallbackFolderId, folder_name: defaultFolder?.name } : n
    ),
    dirtyFolderIds: db.dirtyFolderIds.filter((fid) => fid !== id),
    deletedFolderIds: Array.from(new Set([...db.deletedFolderIds, id]))
  });

  await syncWithServer(false);
}

export async function getNotes(options: {
  folder_id?: string;
  trashed?: boolean;
  q?: string;
  sort?: SortOption;
}): Promise<Note[]> {
  const apiBase = getApiBase();
  if (apiBase) {
    const db = loadLocalDb();
    const hasPendingChanges =
      db.dirtyNoteIds.length > 0 ||
      db.dirtyFolderIds.length > 0 ||
      db.deletedNoteIds.length > 0 ||
      db.deletedFolderIds.length > 0;

    if (hasPendingChanges) {
      await syncWithServer(false);
    } else {
      try {
        const params = new URLSearchParams();
        if (options.folder_id) params.set('folder_id', options.folder_id);
        if (options.trashed) params.set('trashed', '1');
        if (options.q) params.set('q', options.q);
        if (options.sort) params.set('sort', options.sort);

        const res = await fetch(`${apiBase}/notes?${params.toString()}`, {
          headers: getAuthHeaders()
        });
        if (res.status === 401) {
          setSyncStatus('auth_required', 'Server password required');
        } else if (res.ok) {
          const serverNotes: Note[] = (await res.json()).map(resolveNoteImageUrls);

          // If viewing all active notes without a search filter, refresh local cache
          if (!options.folder_id && !options.trashed && !options.q) {
            const currentDb = loadLocalDb();
            if (currentDb.dirtyNoteIds.length === 0) {
              const trashedLocal = currentDb.notes.filter((n) => n.is_trashed === 1);
              saveLocalDb({
                ...currentDb,
                notes: [...serverNotes, ...trashedLocal]
              });
            }
          }
          setSyncStatus('synced');
          return serverNotes;
        }
      } catch {
        setSyncStatus('offline', 'Working offline — changes saved on device');
      }
    }
  }

  return queryLocalNotes(options);
}

export async function getNote(id: string): Promise<Note> {
  const db = loadLocalDb();
  const localNote = db.notes.find((n) => n.id === id);

  const apiBase = getApiBase();
  if (apiBase && !db.dirtyNoteIds.includes(id)) {
    try {
      const res = await fetch(`${apiBase}/notes/${id}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const serverNote = resolveNoteImageUrls(await res.json());
        return serverNote;
      }
    } catch {
      setSyncStatus('offline', 'Working offline — changes saved on device');
    }
  }

  if (!localNote) throw new Error('Note not found');
  return localNote;
}

export async function createNote(data: {
  id?: string;
  folder_id?: string | null;
  title?: string;
  content?: string;
  plain_text?: string;
}): Promise<Note> {
  const db = loadLocalDb();
  const defaultFolder = db.folders.find((f) => f.is_default === 1) || db.folders[0];
  const targetFolderId =
    data.folder_id && data.folder_id !== 'all' ? data.folder_id : defaultFolder?.id || null;
  const targetFolder = db.folders.find((f) => f.id === targetFolderId);

  const now = Date.now();
  const newNote: Note = {
    id: data.id || generateLocalId('note'),
    folder_id: targetFolderId,
    folder_name: targetFolder?.name,
    title: data.title || '',
    content: data.content || '',
    plain_text: data.plain_text || '',
    is_pinned: 0,
    is_trashed: 0,
    created_at: now,
    updated_at: now
  };

  saveLocalDb({
    ...db,
    notes: [newNote, ...db.notes.filter((n) => n.id !== newNote.id)],
    dirtyNoteIds: Array.from(new Set([...db.dirtyNoteIds, newNote.id]))
  });

  syncWithServer(false);
  return newNote;
}

export async function updateNote(
  id: string,
  data: Partial<Pick<Note, 'title' | 'content' | 'plain_text' | 'folder_id' | 'is_pinned'>>
): Promise<Note> {
  const db = loadLocalDb();
  const now = Date.now();
  const defaultFolder = db.folders.find((f) => f.is_default === 1) || db.folders[0];

  const existing = db.notes.find((n) => n.id === id);
  const folderId =
    data.folder_id !== undefined
      ? data.folder_id
      : existing?.folder_id || defaultFolder?.id || null;
  const folder = db.folders.find((f) => f.id === folderId);

  const updatedNote: Note = existing
    ? {
        ...existing,
        ...data,
        folder_id: folderId,
        folder_name: folder?.name || existing.folder_name,
        is_pinned:
          data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : existing.is_pinned,
        updated_at: now
      }
    : {
        id,
        folder_id: folderId,
        folder_name: folder?.name,
        title: data.title || '',
        content: data.content || '',
        plain_text: data.plain_text || '',
        is_pinned: data.is_pinned ? 1 : 0,
        is_trashed: 0,
        created_at: now,
        updated_at: now
      };

  const nextNotes = existing
    ? db.notes.map((n) => (n.id === id ? updatedNote : n))
    : [updatedNote, ...db.notes];

  saveLocalDb({
    ...db,
    notes: nextNotes,
    dirtyNoteIds: Array.from(new Set([...db.dirtyNoteIds, id]))
  });

  // Try fast direct PUT if connected to server, otherwise background sync will push it
  const apiBase = getApiBase();
  if (apiBase) {
    try {
      const res = await fetch(`${apiBase}/notes/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...data,
          content:
            data.content !== undefined ? normalizeContentForServer(data.content) : undefined
        })
      });
      if (res.ok) {
        const serverUpdated = resolveNoteImageUrls(await res.json());
        const latestDb = loadLocalDb();
        saveLocalDb({
          ...latestDb,
          notes: latestDb.notes.map((n) => (n.id === id ? serverUpdated : n)),
          dirtyNoteIds: latestDb.dirtyNoteIds.filter((nid) => nid !== id)
        });
        setSyncStatus('synced');
        return serverUpdated;
      }
    } catch {
      setSyncStatus('offline', 'Working offline — changes saved on device');
    }
  }

  return updatedNote;
}

export async function togglePin(id: string): Promise<Note> {
  const db = loadLocalDb();
  const existing = db.notes.find((n) => n.id === id);
  if (!existing) throw new Error('Note not found');

  return updateNote(id, { is_pinned: existing.is_pinned ? 0 : 1 });
}

export async function trashNote(id: string): Promise<void> {
  const db = loadLocalDb();
  const now = Date.now();
  saveLocalDb({
    ...db,
    notes: db.notes.map((n) =>
      n.id === id ? { ...n, is_trashed: 1, is_pinned: 0, updated_at: now } : n
    ),
    dirtyNoteIds: Array.from(new Set([...db.dirtyNoteIds, id]))
  });

  await syncWithServer(false);
}

export async function restoreNote(id: string): Promise<Note> {
  const db = loadLocalDb();
  const now = Date.now();
  let restored: Note | null = null;

  const notes = db.notes.map((n) => {
    if (n.id === id) {
      restored = { ...n, is_trashed: 0, updated_at: now };
      return restored;
    }
    return n;
  });

  if (!restored) throw new Error('Note not found');

  saveLocalDb({
    ...db,
    notes,
    dirtyNoteIds: Array.from(new Set([...db.dirtyNoteIds, id]))
  });

  await syncWithServer(false);
  return restored;
}

export async function deleteNotePermanently(id: string): Promise<void> {
  const db = loadLocalDb();
  saveLocalDb({
    ...db,
    notes: db.notes.filter((n) => n.id !== id),
    dirtyNoteIds: db.dirtyNoteIds.filter((nid) => nid !== id),
    deletedNoteIds: Array.from(new Set([...db.deletedNoteIds, id]))
  });

  await syncWithServer(false);
}

export async function emptyTrash(): Promise<void> {
  const db = loadLocalDb();
  const trashedIds = db.notes.filter((n) => n.is_trashed === 1).map((n) => n.id);
  if (trashedIds.length === 0) return;

  saveLocalDb({
    ...db,
    notes: db.notes.filter((n) => n.is_trashed === 0),
    dirtyNoteIds: db.dirtyNoteIds.filter((id) => !trashedIds.includes(id)),
    deletedNoteIds: Array.from(new Set([...db.deletedNoteIds, ...trashedIds]))
  });

  await syncWithServer(false);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<string> {
  const apiBase = getApiBase();
  if (apiBase) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        const origin = getServerOrigin();
        return origin && result.url.startsWith('/') ? `${origin}${result.url}` : result.url;
      }
    } catch {
      setSyncStatus('offline', 'Offline — image embedded locally in note');
    }
  }

  // Offline / Local-only fallback: embed image as base64 Data URL so it is never lost
  return fileToDataUrl(file);
}

export async function exportLocalBackup(): Promise<void> {
  const db = loadLocalDb();
  const backupData = {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    folders: db.folders,
    notes: db.notes
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(backupJson: any): Promise<any> {
  const folders: Folder[] = Array.isArray(backupJson?.folders) ? backupJson.folders : [];
  const notes: Note[] = Array.isArray(backupJson?.notes) ? backupJson.notes : [];
  if (!folders.length && !notes.length) {
    throw new Error('Invalid or empty backup file');
  }

  const db = loadLocalDb();
  const folderMap = new Map(db.folders.map((f) => [f.id, f]));
  for (const f of folders) {
    if (f?.id) folderMap.set(f.id, f);
  }
  const noteMap = new Map(db.notes.map((n) => [n.id, n]));
  for (const n of notes) {
    if (n?.id) noteMap.set(n.id, n);
  }

  saveLocalDb({
    ...db,
    folders: Array.from(folderMap.values()),
    notes: Array.from(noteMap.values()),
    dirtyFolderIds: Array.from(new Set([...db.dirtyFolderIds, ...folders.map((f) => f.id)])),
    dirtyNoteIds: Array.from(new Set([...db.dirtyNoteIds, ...notes.map((n) => n.id)]))
  });

  await syncWithServer(true);

  return {
    success: true,
    importedFolders: folders.length,
    importedNotes: notes.length
  };
}
