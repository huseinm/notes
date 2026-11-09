import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const router = express.Router();

// GET all folders with active note counts
router.get('/', (req, res) => {
  try {
    const folders = db.prepare(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM notes n WHERE n.folder_id = f.id AND n.is_trashed = 0) as note_count
      FROM folders f
      ORDER BY f.is_default DESC, f.created_at ASC
    `).all();

    // Also get stats for "All Notes" and "Trash"
    const allNotesCount = db.prepare(`
      SELECT COUNT(*) as count FROM notes WHERE is_trashed = 0
    `).get().count;

    const trashCount = db.prepare(`
      SELECT COUNT(*) as count FROM notes WHERE is_trashed = 1
    `).get().count;

    res.json({
      folders,
      stats: {
        all: allNotesCount,
        trash: trashCount
      }
    });
  } catch (error) {
    console.error('Failed to get folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE folder
router.post('/', (req, res) => {
  try {
    const { name, icon = 'folder' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const id = `folder_${crypto.randomUUID()}`;
    const now = Date.now();

    db.prepare(`
      INSERT INTO folders (id, name, icon, is_default, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(id, name.trim(), icon, now, now);

    const newFolder = db.prepare('SELECT *, 0 as note_count FROM folders WHERE id = ?').get(id);
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Failed to create folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE folder (rename)
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const now = Date.now();
    db.prepare(`
      UPDATE folders 
      SET name = ?, icon = COALESCE(?, icon), updated_at = ?
      WHERE id = ?
    `).run(name.trim(), icon || folder.icon, now, id);

    const updated = db.prepare(`
      SELECT f.*, 
        (SELECT COUNT(*) FROM notes n WHERE n.folder_id = f.id AND n.is_trashed = 0) as note_count
      FROM folders f WHERE f.id = ?
    `).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Failed to update folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE folder
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    if (folder.is_default) {
      return res.status(400).json({ error: 'Cannot delete the default folder' });
    }

    // Set notes that belonged to this folder to folder_id = null (or default folder)
    const defaultFolder = db.prepare('SELECT id FROM folders WHERE is_default = 1 LIMIT 1').get();
    const fallbackId = defaultFolder ? defaultFolder.id : null;

    db.prepare('UPDATE notes SET folder_id = ? WHERE folder_id = ?').run(fallbackId, id);
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);

    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Failed to delete folder:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
