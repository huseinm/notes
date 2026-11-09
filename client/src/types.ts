export interface Note {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  plain_text: string;
  is_pinned: number;
  is_trashed: number;
  created_at: number;
  updated_at: number;
  folder_name?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  is_default: number;
  note_count: number;
  created_at: number;
  updated_at: number;
}

export interface FolderStats {
  all: number;
  trash: number;
}

export type ViewType = 'folder' | 'all' | 'trash';

export type SortOption = 'updated_desc' | 'updated_asc' | 'created_desc' | 'title_asc';
