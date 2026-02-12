const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { Resend } = require('resend');
const db = require('../db');

const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const resend = new Resend(process.env.RESEND_API_KEY);

// POST /auth/login — send magic link
router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO magic_tokens (email, token, expiresAt) VALUES (?, ?, ?)').run(email, token, expiresAt);

  const magicLink = `${BASE_URL}/auth/verify?token=${token}`;
  console.log(`\n🔗 Magic link for ${email}: ${magicLink}\n`);

  try {
    await resend.emails.send({
      from: 'Wikipedia Tracker <onboarding@resend.dev>',
      to: email,
      subject: 'Your Magic Link — Wikipedia Reading Tracker',
      html: `<p>Click the link below to sign in:</p><p><a href="${magicLink}">${magicLink}</a></p><p>This link expires in 15 minutes.</p>`,
    });
  } catch (err) {
    console.error('Failed to send email via Resend:', err.message);
    // Don't fail the request — the link is logged to console for local dev
  }

  res.json({ message: 'Check your email for a magic link!' });
});

// GET /auth/verify?token=xxx — verify magic link
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send(errorPage('Missing token'));
  }

  const row = db.prepare('SELECT * FROM magic_tokens WHERE token = ?').get(token);
  if (!row) {
    return res.status(400).send(errorPage('Invalid token'));
  }
  if (row.usedAt) {
    return res.status(400).send(errorPage('This magic link has already been used'));
  }
  if (new Date(row.expiresAt) < new Date()) {
    return res.status(400).send(errorPage('This magic link has expired'));
  }

  // Mark token as used
  db.prepare('UPDATE magic_tokens SET usedAt = datetime(\'now\') WHERE id = ?').run(row.id);

  // Find or create user
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(row.email);
  if (!user) {
    const emailPrefix = row.email.split('@')[0];
    const displayName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    // Make username URL-safe
    let username = emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Ensure uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      username = username + Date.now().toString(36);
    }
    const apiToken = uuidv4();
    db.prepare('INSERT INTO users (email, displayName, username, apiToken) VALUES (?, ?, ?, ?)').run(row.email, displayName, username, apiToken);
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(row.email);
  }

  req.session.userId = user.id;
  res.redirect('/auth/token');
});

// GET /auth/token — show API token (requires session)
router.get('/token', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.redirect('/');
  }

  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your API Token</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 1.5rem; }
  .token-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 0.9rem; word-break: break-all; margin: 16px 0; }
  button { background: #333; color: #fff; border: none; border-radius: 6px; padding: 10px 20px; cursor: pointer; font-size: 0.9rem; }
  button:hover { background: #555; }
  .info { color: #666; font-size: 0.85rem; margin-top: 16px; }
  a { color: #333; }
</style></head><body>
  <h1>Welcome, ${user.displayName}!</h1>
  <p>Your API token:</p>
  <div class="token-box" id="token">${user.apiToken}</div>
  <button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent).then(()=>{this.textContent='Copied!'})">Copy Token</button>
  <p class="info">Paste this token into your browser extension to start tracking your Wikipedia reading.</p>
  <p class="info">Your public profile: <a href="/u/${user.username}">/u/${user.username}</a></p>
  <p class="info"><a href="/auth/logout">Sign out</a></p>
</body></html>`);
});

// GET /auth/logout — clear session
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Error</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; color: #333; }
  h1 { font-size: 1.5rem; color: #c00; }
  a { color: #333; }
</style></head><body>
  <h1>Error</h1>
  <p>${message}</p>
  <p><a href="/">← Back to home</a></p>
</body></html>`;
}

module.exports = router;

