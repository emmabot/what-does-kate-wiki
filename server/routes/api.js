const express = require('express');
const db = require('../db');

const router = express.Router();

// Auth middleware — require Bearer token
function requireToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  const user = db.prepare('SELECT * FROM users WHERE apiToken = ?').get(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid API token' });
  }
  req.user = user;
  next();
}

// Fetch Wikipedia thumbnail
async function fetchThumbnail(articleTitle, language) {
  try {
    const lang = language || 'en';
    const encodedTitle = encodeURIComponent(articleTitle);
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.thumbnail?.source || null;
  } catch (err) {
    console.error('Failed to fetch Wikipedia thumbnail:', err.message);
    return null;
  }
}

// POST /api/visits — log a visit
router.post('/visits', requireToken, async (req, res) => {
  const { articleTitle, articleUrl, language } = req.body;
  if (!articleTitle || !articleUrl) {
    return res.status(400).json({ error: 'articleTitle and articleUrl are required' });
  }

  // Dedup: same URL + same user within 5 minutes
  // SQLite datetime('now') stores as 'YYYY-MM-DD HH:MM:SS' (no T, no Z)
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  const existing = db.prepare(
    'SELECT id FROM visits WHERE userId = ? AND articleUrl = ? AND visitedAt > ?'
  ).get(req.user.id, articleUrl, fiveMinAgo);

  if (existing) {
    return res.status(200).json({ message: 'Duplicate visit (within 5 min), skipped' });
  }

  // Fetch Wikipedia thumbnail
  const thumbnailUrl = await fetchThumbnail(articleTitle, language || 'en');

  db.prepare(
    'INSERT INTO visits (userId, articleTitle, articleUrl, language, thumbnailUrl) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, articleTitle, articleUrl, language || 'en', thumbnailUrl);

  res.status(201).json({ message: 'Visit logged', thumbnailUrl });
});

// GET /api/visits — list authenticated user's visits
router.get('/visits', requireToken, (req, res) => {
  const visits = db.prepare(
    'SELECT id, articleTitle, articleUrl, language, thumbnailUrl, visitedAt FROM visits WHERE userId = ? ORDER BY visitedAt DESC'
  ).all(req.user.id);
  res.json(visits);
});

module.exports = router;

