import express from 'express';
import { db } from '../db.js';

const router = express.Router();

function cleanPlainText(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// POST /api/sync
// Bi-directional offline-first synchronization endpoint for Meta Quest & Web clients
router.post('/', (req, res) => {
  try {
    const {
      folders: incomingFolders = [],
      notes: incomingNotes = [],
      deletedFolderIds = [],
      deletedNoteIds = []
    } = req.body || {};

    const syncTransaction = db.transaction(() => {
      const defaultFolderRow = db.prepare('SELECT id FROM folders WHERE is_default = 1 LIMIT 1').get();
      const defaultFolderId = defaultFolderRow ? defaultFolderRow.id : 'folder-default';

      // 1. Apply permanent note deletions
      if (Array.isArray(deletedNoteIds) && deletedNoteIds.length > 0) {
        const delNoteStmt = db.prepare('DELETE FROM notes WHERE id = ?');
        for (const noteId of deletedNoteIds) {
          if (noteId) delNoteStmt.run(noteId);
        }
      }

      // 2. Apply folder deletions (protect default folder, move notes to default folder)
      if (Array.isArray(deletedFolderIds) && deletedFolderIds.length > 0) {
        const moveNotesStmt = db.prepare('UPDATE notes SET folder_id = ? WHERE folder_id = ?');
        const delFolderStmt = db.prepare('DELETE FROM folders WHERE id = ? AND is_default = 0');
        for (const folderId of deletedFolderIds) {
          if (folderId && folderId !== defaultFolderId) {
            moveNotesStmt.run(defaultFolderId, folderId);
            delFolderStmt.run(folderId);
          }
        }
      }

      // 3. Merge incoming folders (Last-Write-Wins by updated_at)
      if (Array.isArray(incomingFolders)) {
        const getFolderStmt = db.prepare('SELECT * FROM folders WHERE id = ?');
        const insertFolderStmt = db.prepare(`
          INSERT INTO folders (id, name, icon, is_default, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const updateFolderStmt = db.prepare(`
          UPDATE folders SET name = ?, updated_at = ? WHERE id = ?
        `);

        for (const f of incomingFolders) {
          if (!f || !f.id || !f.name) continue;
          if (Array.isArray(deletedFolderIds) && deletedFolderIds.includes(f.id)) continue;

          const existing = getFolderStmt.get(f.id);
          const now = Date.now();
          if (!existing) {
            insertFolderStmt.run(
              f.id,
              String(f.name).trim(),
              f.icon || 'folder',
              f.is_default ? 1 : 0,
              f.created_at || now,
              f.updated_at || now
            );
          } else if ((f.updated_at || 0) > (existing.updated_at || 0)) {
            updateFolderStmt.run(String(f.name).trim(), f.updated_at, f.id);
          }
        }
      }

      // 4. Merge incoming notes (Last-Write-Wins by updated_at)
      if (Array.isArray(incomingNotes)) {
        const getNoteStmt = db.prepare('SELECT * FROM notes WHERE id = ?');
        const checkFolderStmt = db.prepare('SELECT id FROM folders WHERE id = ?');
        const insertNoteStmt = db.prepare(`
          INSERT INTO notes (id, folder_id, title, content, plain_text, is_pinned, is_trashed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const updateNoteStmt = db.prepare(`
          UPDATE notes
          SET folder_id = ?, title = ?, content = ?, plain_text = ?, is_pinned = ?, is_trashed = ?, updated_at = ?
          WHERE id = ?
        `);

        for (const n of incomingNotes) {
          if (!n || !n.id) continue;
          if (Array.isArray(deletedNoteIds) && deletedNoteIds.includes(n.id)) continue;

          // Ensure target folder exists, otherwise assign default folder
          let targetFolderId = n.folder_id || defaultFolderId;
          if (!checkFolderStmt.get(targetFolderId)) {
            targetFolderId = defaultFolderId;
          }

          const existing = getNoteStmt.get(n.id);
          const now = Date.now();
          const title = n.title || '';
          const content = n.content || '';
          const plainText = n.plain_text !== undefined ? n.plain_text : cleanPlainText(content);
          const isPinned = n.is_pinned ? 1 : 0;
          const isTrashed = n.is_trashed ? 1 : 0;

          if (!existing) {
            insertNoteStmt.run(
              n.id,
              targetFolderId,
              title,
              content,
              plainText,
              isPinned,
              isTrashed,
              n.created_at || now,
              n.updated_at || now
            );
          } else if ((n.updated_at || 0) > (existing.updated_at || 0)) {
            updateNoteStmt.run(
              targetFolderId,
              title,
              content,
              plainText,
              isPinned,
              isTrashed,
              n.updated_at,
              n.id
            );
          }
        }
      }
    });

    syncTransaction();

    // Return full merged state
    const folders = db.prepare(`
      SELECT 
        f.id, 
        f.name, 
        f.icon, 
        f.is_default, 
        f.created_at, 
        f.updated_at,
        COUNT(CASE WHEN n.is_trashed = 0 THEN 1 END) as note_count
      FROM folders f
      LEFT JOIN notes n ON n.folder_id = f.id
      GROUP BY f.id
      ORDER BY f.is_default DESC, f.created_at ASC
    `).all();

    const totalAllNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE is_trashed = 0').get().count;
    const totalTrashedNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE is_trashed = 1').get().count;

    const notes = db.prepare(`
      SELECT n.id, n.folder_id, n.title, n.content, n.plain_text, n.is_pinned, n.is_trashed, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      ORDER BY n.is_pinned DESC, n.updated_at DESC
    `).all();

    res.json({
      success: true,
      syncedAt: Date.now(),
      folders,
      stats: {
        all: totalAllNotes,
        trash: totalTrashedNotes
      },
      notes
    });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
