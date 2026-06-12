const express = require('express');
const router = express.Router();
const instagramService = require('../services/instagramService');
const pool = require('../config/database');

router.get('/status', async (req, res) => {
  try {
    await instagramService.loadSettings();
    const r = await pool.query(`SELECT COUNT(*) AS total FROM instagram_posts WHERE status='posted'`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = instagramService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: instagramService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate preview (caption + image) without posting
router.post('/generate', async (req, res) => {
  res.setTimeout(180000);
  try {
    await instagramService.loadSettings();
    const { topicIndex } = req.body;
    const result = await instagramService.generatePreview(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Instagram /generate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Publish a previously generated draft
router.post('/publish', async (req, res) => {
  res.setTimeout(60000);
  try {
    await instagramService.loadSettings();
    const { dbId } = req.body;
    if (!dbId) return res.status(400).json({ success: false, error: 'dbId required' });
    const result = await instagramService.publishPost(dbId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Instagram /publish error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await instagramService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
