const express = require('express');
const db = require('../db');

const router = express.Router();

// GET / — landing page
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wikipedia Reading Tracker</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fafafa; }
  .container { max-width: 420px; width: 100%; padding: 40px 24px; text-align: center; }
  h1 { font-size: 1.8rem; margin-bottom: 8px; }
  .subtitle { color: #666; margin-bottom: 32px; font-size: 1rem; line-height: 1.5; }
  form { display: flex; flex-direction: column; gap: 12px; }
  input[type="email"] { padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; outline: none; }
  input[type="email"]:focus { border-color: #333; }
  button { background: #333; color: #fff; border: none; border-radius: 8px; padding: 12px 20px; font-size: 1rem; cursor: pointer; }
  button:hover { background: #555; }
  .message { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.9rem; display: none; }
  .message.success { display: block; background: #e8f5e9; color: #2e7d32; }
  .message.error { display: block; background: #fce4ec; color: #c62828; }
  .info { margin-top: 32px; color: #999; font-size: 0.8rem; line-height: 1.6; }
</style></head><body>
<div class="container">
  <h1>📖 Wikipedia Tracker</h1>
  <p class="subtitle">Track every Wikipedia article you read. Get a public profile of your reading history.</p>
  <form id="loginForm">
    <input type="email" name="email" placeholder="you@example.com" required>
    <button type="submit">Send Magic Link</button>
  </form>
  <div class="message" id="message"></div>
  <div class="info">
    Enter your email to receive a sign-in link.<br>
    No password needed — we'll send you a magic link.
  </div>
</div>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('message');
  const email = e.target.email.value;
  msg.className = 'message';
  try {
    const resp = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await resp.json();
    if (resp.ok) {
      msg.className = 'message success';
      msg.textContent = data.message;
    } else {
      msg.className = 'message error';
      msg.textContent = data.error || 'Something went wrong';
    }
  } catch (err) {
    msg.className = 'message error';
    msg.textContent = 'Network error. Please try again.';
  }
});
</script>
</body></html>`);
});

// GET /u/:username — public profile
router.get('/u/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) {
    return res.status(404).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>User Not Found</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:80px auto;padding:0 20px;color:#333;text-align:center;}a{color:#333;}</style>
</head><body><h1>User not found</h1><p><a href="/">← Home</a></p></body></html>`);
  }

  const visits = db.prepare(
    'SELECT articleTitle, articleUrl, language, thumbnailUrl, visitedAt FROM visits WHERE userId = ? ORDER BY visitedAt DESC'
  ).all(user.id);

  const visitItems = visits.map(v => {
    const thumb = v.thumbnailUrl
      ? `<img src="${escapeHtml(v.thumbnailUrl)}" alt="" class="thumb">`
      : `<div class="thumb placeholder">📄</div>`;
    const date = new Date(v.visitedAt + 'Z');
    const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `<a href="${escapeHtml(v.articleUrl)}" class="visit" target="_blank">
      ${thumb}
      <div class="visit-info">
        <div class="visit-title">${escapeHtml(v.articleTitle)}</div>
        <div class="visit-time">${timeStr}</div>
      </div>
    </a>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(user.displayName)}'s Reading — Wikipedia Tracker</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; background: #fafafa; }
  .header { max-width: 600px; margin: 40px auto 24px; padding: 0 20px; }
  .header h1 { font-size: 1.5rem; }
  .header .count { color: #999; font-size: 0.85rem; margin-top: 4px; }
  .visits { max-width: 600px; margin: 0 auto; padding: 0 20px 40px; }
  .visit { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid #eee; text-decoration: none; color: inherit; }
  .visit:hover { background: #f0f0f0; }
  .thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .thumb.placeholder { display: flex; align-items: center; justify-content: center; background: #eee; font-size: 1.2rem; }
  .visit-info { min-width: 0; }
  .visit-title { font-weight: 500; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .visit-time { color: #999; font-size: 0.8rem; margin-top: 2px; }
  .empty { text-align: center; color: #999; padding: 40px 0; }
  a.home { color: #999; text-decoration: none; font-size: 0.8rem; }
  a.home:hover { color: #333; }
</style></head><body>
<div class="header">
  <a class="home" href="/">← Wikipedia Tracker</a>
  <h1>${escapeHtml(user.displayName)}'s Reading</h1>
  <div class="count">${visits.length} article${visits.length !== 1 ? 's' : ''} read</div>
</div>
<div class="visits">
  ${visits.length === 0 ? '<div class="empty">No articles read yet.</div>' : visitItems}
</div>
</body></html>`);
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;

