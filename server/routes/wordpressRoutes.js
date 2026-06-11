const express = require('express');
const router = express.Router();
const wordpressService = require('../services/wordpressService');

router.get('/status', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const pool = require('../config/database');
    const r = await pool.query(`SELECT COUNT(*) AS total FROM wordpress_posts`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = wordpressService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/auth-url', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const authUrl = wordpressService.getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/exchange-token', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code fehlt' });
    await wordpressService.loadSettings();
    const result = await wordpressService.exchangeCodeForToken(code);
    res.json({ success: true, blogId: result.blog_id, blogUrl: result.blog_url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/sites', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const sites = await wordpressService.fetchSites();
    res.json({ success: true, sites });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/select-site', async (req, res) => {
  try {
    const { siteId, siteName } = req.body;
    if (!siteId) return res.status(400).json({ success: false, error: 'siteId required' });
    await pool.query(`INSERT INTO settings(key,value) VALUES('wordpress_site_id',$1) ON CONFLICT(key) DO UPDATE SET value=$1`, [String(siteId)]);
    if (siteName) await pool.query(`INSERT INTO settings(key,value) VALUES('wordpress_site_name',$1) ON CONFLICT(key) DO UPDATE SET value=$1`, [siteName]);
    await wordpressService.loadSettings();
    res.json({ success: true, siteId, siteName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const { topicIndex } = req.body;
    const result = await wordpressService.createAndPost(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const result = wordpressService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = wordpressService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: wordpressService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await wordpressService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
