import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store database in DATA_DIR or default to ../data
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Uploads directory for images and attachments
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'notes.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'folder',
    is_default INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    folder_id TEXT,
    title TEXT NOT NULL DEFAULT 'New Note',
    content TEXT NOT NULL DEFAULT '',
    plain_text TEXT NOT NULL DEFAULT '',
    is_pinned INTEGER DEFAULT 0,
    is_trashed INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
  CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notes_trashed ON notes(is_trashed);
  CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);
`);

// Seed default folder and sample note if empty
const folderCount = db.prepare('SELECT COUNT(*) as count FROM folders').get().count;
if (folderCount === 0) {
  const now = Date.now();
  const defaultFolderId = 'folder-default';
  
  db.prepare(`
    INSERT INTO folders (id, name, icon, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(defaultFolderId, 'Notes', 'folder', 1, now, now);

  const sampleContent = `<h1>Welcome to Apple Notes (Self-Hosted)</h1>
<p>A lightweight, private, and beautiful notes app built for self-hosting on your NAS, server, or homelab.</p>
<h2>✨ Key Features</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Self-hosted with Docker &amp; single SQLite database</p></div></li>
  <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Fast instantaneous auto-saving</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Pin your most important notes to the top</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Organize with folders or view All Notes</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Rich text formatting: Headings, Bold, Lists, and Tables</p></div></li>
</ul>
<h2>📋 Pizza Dough / Poolish Example</h2>
<table style="border-collapse: collapse; width: 100%;">
  <tbody>
    <tr>
      <th style="border: 1px solid #444; padding: 6px 10px; text-align: left;">Ingredient</th>
      <th style="border: 1px solid #444; padding: 6px 10px; text-align: left;">Quantity</th>
      <th style="border: 1px solid #444; padding: 6px 10px; text-align: left;">Notes</th>
    </tr>
    <tr>
      <td style="border: 1px solid #444; padding: 6px 10px;">Water</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">300ml</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">Room temperature</td>
    </tr>
    <tr>
      <td style="border: 1px solid #444; padding: 6px 10px;">Flour</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">300g</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">Type 00 or strong flour</td>
    </tr>
    <tr>
      <td style="border: 1px solid #444; padding: 6px 10px;">Dry Yeast</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">5g</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">Active or instant</td>
    </tr>
    <tr>
      <td style="border: 1px solid #444; padding: 6px 10px;">Honey</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">5g</td>
      <td style="border: 1px solid #444; padding: 6px 10px;">Helps yeast fermentation</td>
    </tr>
  </tbody>
</table>
<p></p>
<p><em>Enjoy your clean, distraction-free writing!</em></p>`;

  const plainText = `Welcome to Apple Notes (Self-Hosted)
A lightweight, private, and beautiful notes app built for self-hosting on your NAS, server, or homelab.
Key Features: Self-hosted with Docker, Fast instantaneous auto-saving, Pin important notes...`;

  db.prepare(`
    INSERT INTO notes (id, folder_id, title, content, plain_text, is_pinned, is_trashed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'note-welcome',
    defaultFolderId,
    'Welcome to Apple Notes (Self-Hosted)',
    sampleContent,
    plainText,
    1,
    0,
    now,
    now
  );
}

export { db, dataDir, uploadsDir };
