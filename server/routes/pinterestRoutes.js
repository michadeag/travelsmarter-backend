const express = require('express');
const router = express.Router();
const pinterestService = require('../services/pinterestService');
const axios = require('axios');
const pool = require('../config/database');
const { protectWithAdminFallback } = require('../middleware/auth');

const PINTEREST_REDIRECT = 'https://api.travelsmarterapp.com/api/pinterest/callback';

// OAuth URL
router.get('/auth-url', protectWithAdminFallback, async (req, res) => {
  try {
    const r = await pool.query(`SELECT value FROM settings WHERE key = 'pinterest_app_id'`);
    const appId = r.rows[0]?.value;
    if (!appId) return res.status(400).json({ success: false, error: 'Pinterest App ID not set in Settings' });
    const url = `https://www.pinterest.com/oauth/?client_id=${appId}&redirect_uri=${encodeURIComponent(PINTEREST_REDIRECT)}&response_type=code&scope=boards:read,pins:read,pins:write&state=travelsmarter`;
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.send(`<h2>Pinterest Auth Error: ${error}</h2>`);
    if (!code) return res.send('<h2>No code received</h2>');

    const appIdR = await pool.query(`SELECT value FROM settings WHERE key = 'pinterest_app_id'`);
    const appSecR = await pool.query(`SELECT value FROM settings WHERE key = 'pinterest_app_secret'`);
    const appId = appIdR.rows[0]?.value;
    const appSecret = appSecR.rows[0]?.value;

    const tokenRes = await axios.post('https://api.pinterest.com/v5/oauth/token',
      `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(PINTEREST_REDIRECT)}`,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: { username: appId, password: appSecret }
      }
    );

    const accessToken = tokenRes.data.access_token;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('pinterest_access_token', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [accessToken]
    );

    res.send(`<h2>✅ Pinterest connected!</h2><p>Token saved. You can close this window.</p><script>setTimeout(()=>window.close(),3000)</script>`);
  } catch (err) {
    res.send(`<h2>❌ Error: ${err.response?.data?.message || err.message}</h2>`);
  }
});

// Load boards
router.get('/boards', protectWithAdminFallback, async (req, res) => {
  try {
    await pinterestService.loadSettings();
    const token = pinterestService.accessToken;
    if (!token) return res.status(400).json({ success: false, error: 'No access token — verbinde Pinterest zuerst' });
    const r = await axios.get('https://api.pinterest.com/v5/boards', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const boards = r.data.items.map(b => ({ id: b.id, name: b.name }));
    // Cache boards in DB for board-matching
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('pinterest_boards_json', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(boards)]
    );
    res.json({ success: true, boards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
  }
});

// Select a board
router.post('/select-board', protectWithAdminFallback, async (req, res) => {
  try {
    const { boardId, boardName } = req.body;
    if (!boardId) return res.status(400).json({ success: false, error: 'boardId required' });
    await pool.query(`INSERT INTO settings (key,value) VALUES('pinterest_board_id',$1) ON CONFLICT(key) DO UPDATE SET value=$1`, [boardId]);
    if (boardName) await pool.query(`INSERT INTO settings (key,value) VALUES('pinterest_board_name',$1) ON CONFLICT(key) DO UPDATE SET value=$1`, [boardName]);
    await pinterestService.loadSettings();
    res.json({ success: true, boardId, boardName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    await pinterestService.loadSettings();
    const r = await pool.query(`SELECT COUNT(*) AS total FROM pinterest_posts WHERE status = 'posted'`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = pinterestService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    await pinterestService.loadSettings();
    res.json({ success: true, topics: pinterestService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate pin for copy-paste
router.post('/generate', protectWithAdminFallback, async (req, res) => {
  res.setTimeout(120000); // 2 min timeout for image generation
  try {
    const { topicIndex } = req.body;
    const result = await pinterestService.generatePin(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('Pinterest /generate error:', detail);
    res.status(500).json({ success: false, error: detail });
  }
});

// Mark as manually posted
router.post('/log-manual', protectWithAdminFallback, async (req, res) => {
  try {
    const { dbId, pinUrl } = req.body;
    if (!dbId) return res.status(400).json({ success: false, error: 'dbId required' });
    await pinterestService.markAsPosted(dbId, pinUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await pinterestService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', protectWithAdminFallback, async (req, res) => {
  try {
    await pinterestService.loadSettings();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
