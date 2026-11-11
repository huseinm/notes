import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, uploadsDir } from './db.js';
import foldersRouter from './routes/folders.js';
import notesRouter from './routes/notes.js';
import uploadRouter from './routes/upload.js';
import exportRouter from './routes/export.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads route
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Notes Self-Hosted',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/folders', foldersRouter);
app.use('/api/notes', notesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/export', exportRouter);

// Serve frontend static assets if available (Production & Docker)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`Serving frontend static files from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  
  // SPA fallback
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

const server = app.listen(PORT, HOST, () => {
  console.log(`📝 Notes Server running at http://${HOST}:${PORT}`);
  console.log(`  Uploads directory: ${uploadsDir}`);
});

// Graceful shutdown for Docker / NAS environments
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing HTTP server and SQLite database...`);
  server.close(() => {
    try {
      db.close();
    } catch (err) {
      console.error('Error closing SQLite database:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
