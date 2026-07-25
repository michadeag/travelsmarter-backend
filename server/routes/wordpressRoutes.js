const express = require('express');
const router = express.Router();
const wordpressService = require('../services/wordpressService');
const { protectWithAdminFallback } = require('../middleware/auth');

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

router.post('/reload-settings', protectWithAdminFallback, async (req, res) => {
  try {
    const configured = await wordpressService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test connection with current credentials
router.post('/test-connection', protectWithAdminFallback, async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const result = await wordpressService.testConnection();
    res.json({ success: true, ...result });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    res.status(500).json({ success: false, error: detail });
  }
});

router.post('/publish', protectWithAdminFallback, async (req, res) => {
  try {
    const { topicIndex } = req.body;
    const result = await wordpressService.createAndPost(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    res.status(500).json({ success: false, error: detail });
  }
});

router.post('/scheduler/start', protectWithAdminFallback, async (req, res) => {
  try {
    await wordpressService.loadSettings();
    const result = wordpressService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', protectWithAdminFallback, async (req, res) => {
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

// Publish a full article promoting a random free-tool page right now (the
// same content/logic the 1x/day scheduler uses) — for manual testing/triggering.
router.post('/post-tool-promo', protectWithAdminFallback, async (req, res) => {
  try {
    const toolPromoWordpressService = require('../services/toolPromoWordpressService');
    const result = await toolPromoWordpressService.postRandomToolBlogArticle();
    if (result.success) {
      res.json({ success: true, message: 'Tool-promo blog post published', url: result.wpUrl, toolUrl: result.url, title: result.title });
    } else {
      res.status(400).json({ success: false, message: result.message || 'Failed to publish tool-promo blog post' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error publishing tool-promo blog post', error: err.message });
  }
});

module.exports = router;
