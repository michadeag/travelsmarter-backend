const express = require('express');
const router = express.Router();
const pinterestService = require('../services/pinterestService');
const axios = require('axios');
const pool = require('../config/database');

const PINTEREST_REDIRECT = 'https://api.travelsmarterapp.com/api/pinterest/callback';

// Step 1: Generate OAuth URL
router.get('/auth-url', async (req, res) => {
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

// Step 2: OAuth callback — exchange code for access token
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

    res.send(`<h2>✅ Pinterest connected!</h2><p>Access Token saved. You can close this window and return to the dashboard.</p><script>setTimeout(()=>window.close(),3000)</script>`);
  } catch (err) {
    res.send(`<h2>❌ Error: ${err.response?.data?.message || err.message}</h2>`);
  }
});

// Step 3: Load boards
router.get('/boards', async (req, res) => {
  try {
    await pinterestService.loadSettings();
    const token = pinterestService.credentials.accessToken;
    if (!token) return res.status(400).json({ success: false, error: 'No access token' });
    const r = await axios.get('https://api.pinterest.com/v5/boards', {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json({ success: true, boards: r.data.items.map(b => ({ id: b.id, name: b.name })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    await pinterestService.loadSettings();
    const pool = require('../config/database');
    const r = await pool.query(`SELECT COUNT(*) AS total FROM pinterest_posts`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = pinterestService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    const configured = await pinterestService.loadSettings();
    const c = pinterestService.credentials;
    res.json({
      success: true,
      configured,
      debug: {
        hasAccessToken: !!c.accessToken,
        accessTokenLength: c.accessToken?.length || 0,
        hasBoardId: !!c.boardId,
        boardId: c.boardId || null,
        hasIdeogramKey: !!c.ideogramKey,
        ideogramKeyLength: c.ideogramKey?.length || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/post-pin', async (req, res) => {
  try {
    const result = await pinterestService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: pinterestService.getTopics() });
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

router.post('/scheduler/start', async (req, res) => {
  try {
    await pinterestService.loadSettings();
    const result = pinterestService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = pinterestService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
