import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Backup: Full database export as JSON
router.get('/backup', (req, res) => {
  try {
    const folders = db.prepare('SELECT * FROM folders').all();
    const notes = db.prepare('SELECT * FROM notes').all();

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      folders,
      notes
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="notes-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    console.error('Backup export failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import: Restore database from JSON backup
router.post('/import', (req, res) => {
  try {
    const { folders = [], notes = [] } = req.body;
    if (!Array.isArray(folders) || !Array.isArray(notes)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    const insertFolder = db.prepare(`
      INSERT OR REPLACE INTO folders (id, name, icon, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertNote = db.prepare(`
      INSERT OR REPLACE INTO notes (id, folder_id, title, content, plain_text, is_pinned, is_trashed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const f of folders) {
        insertFolder.run(f.id, f.name, f.icon || 'folder', f.is_default || 0, f.created_at || Date.now(), f.updated_at || Date.now());
      }
      for (const n of notes) {
        insertNote.run(n.id, n.folder_id, n.title, n.content, n.plain_text || '', n.is_pinned || 0, n.is_trashed || 0, n.created_at || Date.now(), n.updated_at || Date.now());
      }
    });

    transaction();

    res.json({
      success: true,
      importedFolders: folders.length,
      importedNotes: notes.length
    });
  } catch (error) {
    console.error('Backup import failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
