import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const router = express.Router();

// Helper to extract clean plain text from html if not provided
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

// GET all notes with filtering, search, and sorting
router.get('/', (req, res) => {
  try {
    const { folder_id, trashed = '0', q = '', sort = 'updated_desc' } = req.query;
    const isTrashed = trashed === '1' ? 1 : 0;

    let query = `
      SELECT n.id, n.folder_id, n.title, n.content, n.plain_text, n.is_pinned, n.is_trashed, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.is_trashed = ?
    `;
    const params = [isTrashed];

    // Filter by folder if specified and not in trash view
    if (folder_id && folder_id !== 'all' && isTrashed === 0) {
      query += ` AND n.folder_id = ?`;
      params.push(folder_id);
    }

    // Search query
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      query += ` AND (n.title LIKE ? OR n.plain_text LIKE ?)`;
      params.push(searchTerm, searchTerm);
    }

    // Sorting
    // In Apple Notes, pinned notes are always pinned to the top within their active view
    query += ` ORDER BY n.is_pinned DESC`;

    switch (sort) {
      case 'updated_asc':
        query += `, n.updated_at ASC`;
        break;
      case 'created_desc':
        query += `, n.created_at DESC`;
        break;
      case 'created_asc':
        query += `, n.created_at ASC`;
        break;
      case 'title_asc':
        query += `, LOWER(n.title) ASC`;
        break;
      case 'updated_desc':
      default:
        query += `, n.updated_at DESC`;
        break;
    }

    const notes = db.prepare(query).all(...params);
    res.json(notes);
  } catch (error) {
    console.error('Failed to get notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single note by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare(`
      SELECT n.*, f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `).get(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Failed to get note:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE note
router.post('/', (req, res) => {
  try {
    const { folder_id, title = 'New Note', content = '', plain_text = '' } = req.body;

    // If folder_id not provided, assign default folder
    let targetFolderId = folder_id;
    if (!targetFolderId || targetFolderId === 'all') {
      const defaultFolder = db.prepare('SELECT id FROM folders WHERE is_default = 1 LIMIT 1').get();
      targetFolderId = defaultFolder ? defaultFolder.id : null;
    }

    const id = `note_${crypto.randomUUID()}`;
    const now = Date.now();
    const finalPlainText = plain_text || cleanPlainText(content);

    db.prepare(`
      INSERT INTO notes (id, folder_id, title, content, plain_text, is_pinned, is_trashed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)
    `).run(id, targetFolderId, title, content, finalPlainText, now, now);

    const newNote = db.prepare(`
      SELECT n.*, f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `).get(id);

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Failed to create note:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE note
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, plain_text, folder_id, is_pinned } = req.body;

    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const now = Date.now();
    const updatedTitle = title !== undefined ? title : existing.title;
    const updatedContent = content !== undefined ? content : existing.content;
    const updatedPlainText = plain_text !== undefined ? plain_text : cleanPlainText(updatedContent);
    const updatedFolderId = folder_id !== undefined ? folder_id : existing.folder_id;
    const updatedPinned = is_pinned !== undefined ? (is_pinned ? 1 : 0) : existing.is_pinned;

    db.prepare(`
      UPDATE notes
      SET title = ?, content = ?, plain_text = ?, folder_id = ?, is_pinned = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedTitle, updatedContent, updatedPlainText, updatedFolderId, updatedPinned, now, id);

    const updated = db.prepare(`
      SELECT n.*, f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Failed to update note:', error);
    res.status(500).json({ error: error.message });
  }
});

// TOGGLE PIN
router.patch('/:id/pin', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const newPinned = existing.is_pinned ? 0 : 1;
    const now = Date.now();

    db.prepare(`
      UPDATE notes
      SET is_pinned = ?, updated_at = ?
      WHERE id = ?
    `).run(newPinned, now, id);

    const updated = db.prepare(`
      SELECT n.*, f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Failed to toggle pin:', error);
    res.status(500).json({ error: error.message });
  }
});

// MOVE TO TRASH
router.patch('/:id/trash', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const now = Date.now();
    db.prepare(`
      UPDATE notes
      SET is_trashed = 1, is_pinned = 0, updated_at = ?
      WHERE id = ?
    `).run(now, id);

    res.json({ success: true, message: 'Note moved to trash' });
  } catch (error) {
    console.error('Failed to trash note:', error);
    res.status(500).json({ error: error.message });
  }
});

// RESTORE FROM TRASH
router.patch('/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const now = Date.now();
    db.prepare(`
      UPDATE notes
      SET is_trashed = 0, updated_at = ?
      WHERE id = ?
    `).run(now, id);

    const restored = db.prepare(`
      SELECT n.*, f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `).get(id);

    res.json(restored);
  } catch (error) {
    console.error('Failed to restore note:', error);
    res.status(500).json({ error: error.message });
  }
});

// PERMANENTLY DELETE NOTE
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    res.json({ success: true, message: 'Note permanently deleted' });
  } catch (error) {
    console.error('Failed to delete note permanently:', error);
    res.status(500).json({ error: error.message });
  }
});

// EMPTY TRASH
router.post('/trash/empty', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM notes WHERE is_trashed = 1').run();
    res.json({ success: true, deletedCount: info.changes });
  } catch (error) {
    console.error('Failed to empty trash:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
