import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function getActivePasswordHash() {
  if (process.env.AUTH_PASSWORD && process.env.AUTH_PASSWORD.trim().length > 0) {
    return hashPassword(process.env.AUTH_PASSWORD.trim());
  }
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('password_hash');
  return row && row.value ? row.value : null;
}

function deriveToken(passwordHash) {
  return crypto.createHmac('sha256', 'notes-self-hosted-auth-v1').update(passwordHash).digest('hex');
}

export function isAuthEnabled() {
  return Boolean(getActivePasswordHash());
}

export function isTokenValid(token) {
  const activeHash = getActivePasswordHash();
  if (!activeHash) return true;
  if (!token) return false;
  return token === deriveToken(activeHash);
}

function extractRequestToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.query.token === 'string') {
    return req.query.token;
  }
  return null;
}

export function requireAuth(req, res, next) {
  if (!isAuthEnabled()) {
    return next();
  }
  const token = extractRequestToken(req);
  if (isTokenValid(token)) {
    return next();
  }
  return res.status(401).json({
    error: 'Authentication required. Please enter your server password.',
    authRequired: true
  });
}

// GET /api/auth/status
router.get('/status', (req, res) => {
  const authRequired = isAuthEnabled();
  const token = extractRequestToken(req);
  const authenticated = !authRequired || isTokenValid(token);

  res.json({
    authRequired,
    authenticated,
    envLocked: Boolean(process.env.AUTH_PASSWORD && process.env.AUTH_PASSWORD.trim().length > 0),
    serverName: 'Notes Self-Hosted Server',
    version: '1.1.0'
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password = '' } = req.body;
  const activeHash = getActivePasswordHash();

  if (!activeHash) {
    return res.json({
      success: true,
      authRequired: false,
      token: null
    });
  }

  const candidateHash = hashPassword(password);
  if (candidateHash !== activeHash) {
    return res.status(401).json({ error: 'Invalid server password' });
  }

  return res.json({
    success: true,
    authRequired: true,
    token: deriveToken(activeHash)
  });
});

// POST /api/auth/password (Set, change, or clear optional server password)
router.post('/password', (req, res) => {
  if (process.env.AUTH_PASSWORD && process.env.AUTH_PASSWORD.trim().length > 0) {
    return res.status(400).json({
      error: 'Password is managed via the AUTH_PASSWORD environment variable in Docker.'
    });
  }

  const token = extractRequestToken(req);
  if (isAuthEnabled() && !isTokenValid(token)) {
    return res.status(401).json({ error: 'Current authentication required to change password' });
  }

  const { newPassword = '' } = req.body;
  const trimmed = String(newPassword).trim();

  if (!trimmed) {
    db.prepare('DELETE FROM settings WHERE key = ?').run('password_hash');
    return res.json({
      success: true,
      authRequired: false,
      token: null,
      message: 'Server password protection disabled'
    });
  }

  const newHash = hashPassword(trimmed);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('password_hash', newHash);

  return res.json({
    success: true,
    authRequired: true,
    token: deriveToken(newHash),
    message: 'Server password protection enabled'
  });
});

export default router;
