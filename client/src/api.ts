import { Folder, FolderStats, Note, SortOption } from './types';

const API_BASE = '/api';

export async function getFolders(): Promise<{ folders: Folder[]; stats: FolderStats }> {
  const res = await fetch(`${API_BASE}/folders`);
  if (!res.ok) throw new Error('Failed to load folders');
  return res.json();
}

export async function createFolder(name: string): Promise<Folder> {
  const res = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create folder');
  }
  return res.json();
}

export async function updateFolder(id: string, name: string): Promise<Folder> {
  const res = await fetch(`${API_BASE}/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to rename folder');
  }
  return res.json();
}

export async function deleteFolder(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/folders/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete folder');
  }
}

export async function getNotes(options: {
  folder_id?: string;
  trashed?: boolean;
  q?: string;
  sort?: SortOption;
}): Promise<Note[]> {
  const params = new URLSearchParams();
  if (options.folder_id) params.set('folder_id', options.folder_id);
  if (options.trashed) params.set('trashed', '1');
  if (options.q) params.set('q', options.q);
  if (options.sort) params.set('sort', options.sort);

  const res = await fetch(`${API_BASE}/notes?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load notes');
  return res.json();
}

export async function getNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`);
  if (!res.ok) throw new Error('Failed to load note');
  return res.json();
}

export async function createNote(data: {
  folder_id?: string | null;
  title?: string;
  content?: string;
  plain_text?: string;
}): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(
  id: string,
  data: Partial<Pick<Note, 'title' | 'content' | 'plain_text' | 'folder_id' | 'is_pinned'>>
): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

export async function togglePin(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/pin`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to toggle pin');
  return res.json();
}

export async function trashNote(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${id}/trash`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to trash note');
}

export async function restoreNote(id: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/notes/${id}/restore`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to restore note');
  return res.json();
}

export async function deleteNotePermanently(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to permanently delete note');
}

export async function emptyTrash(): Promise<void> {
  const res = await fetch(`${API_BASE}/notes/trash/empty`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to empty trash');
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload image');
  }
  const result = await res.json();
  return result.url;
}

export async function importBackup(backupJson: any): Promise<any> {
  const res = await fetch(`${API_BASE}/export/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupJson)
  });
  if (!res.ok) throw new Error('Import failed');
  return res.json();
}
