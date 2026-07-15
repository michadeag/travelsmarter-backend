const express = require('express');
const router = express.Router();
const bloggerService = require('../services/bloggerService');
const pool = require('../config/database');
const { protectWithAdminFallback } = require('../middleware/auth');

router.get('/status', async (req, res) => {
  try {
    await bloggerService.loadSettings();
    const r = await pool.query(`SELECT COUNT(*) AS total FROM blogger_posts`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = bloggerService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', protectWithAdminFallback, async (req, res) => {
  try {
    await bloggerService.loadSettings();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Step 1: get OAuth2 URL for user to visit
router.get('/auth-url', protectWithAdminFallback, async (req, res) => {
  try {
    await bloggerService.loadSettings();
    const authUrl = bloggerService.getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// OAuth callback (Google redirects here)
router.get('/callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.send(`<h2>❌ Google Auth Error: ${error}</h2>`);
    if (!code) return res.send('<h2>No code received</h2>');
    await bloggerService.loadSettings();
    await bloggerService.exchangeCodeForToken(code);
    res.send(`<h2>✅ Google Blogger connected!</h2><p>Refresh Token saved. You can close this window.</p><script>setTimeout(()=>window.close(),3000)</script>`);
  } catch (err) {
    res.send(`<h2>❌ Error: ${err.message}</h2>`);
  }
});

// Step 2: exchange auth code for refresh token
router.post('/exchange-token', protectWithAdminFallback, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Authorization code required' });
    await bloggerService.loadSettings();
    const tokens = await bloggerService.exchangeCodeForToken(code);
    res.json({ success: true, message: 'Google account connected successfully', hasRefreshToken: !!tokens.refresh_token });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch blogs for this Google account (after connecting)
router.get('/blogs', protectWithAdminFallback, async (req, res) => {
  try {
    await bloggerService.loadSettings();
    const accessToken = await bloggerService.getAccessToken();
    const blogs = await bloggerService.fetchBlogId(accessToken);
    res.json({ success: true, blogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/select-blog', protectWithAdminFallback, async (req, res) => {
  try {
    const { blogId, blogName } = req.body;
    if (!blogId) return res.status(400).json({ success: false, error: 'blogId required' });
    await pool.query(`INSERT INTO settings(key,value) VALUES('blogger_blog_id',$1) ON CONFLICT(key) DO UPDATE SET value=$1`, [String(blogId)]);
    if (blogName) await pool.query(`INSERT INTO settings(key,value) VALUES('blogger_blog_name',$1) ON CONFLICT(key) DO UPDATE SET value=$1`, [blogName]);
    await bloggerService.loadSettings();
    res.json({ success: true, blogId, blogName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish', protectWithAdminFallback, async (req, res) => {
  try {
    const { topicIndex } = req.body;
    const result = await bloggerService.createAndPost(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', protectWithAdminFallback, async (req, res) => {
  try {
    await bloggerService.loadSettings();
    const result = bloggerService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', protectWithAdminFallback, async (req, res) => {
  try {
    const result = bloggerService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: bloggerService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await bloggerService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
