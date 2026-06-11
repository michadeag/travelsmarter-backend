const express = require('express');
const router = express.Router();
const slideshareService = require('../services/slideshareService');
const pool = require('../config/database');

router.get('/status', async (req, res) => {
  try {
    await slideshareService.loadSettings();
    const r = await pool.query(`SELECT COUNT(*) AS total FROM slideshare_posts WHERE status = 'posted'`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = slideshareService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    await slideshareService.loadSettings();
    res.json({ success: true, topics: slideshareService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  res.setTimeout(120000);
  try {
    const { topicIndex } = req.body;
    const result = await slideshareService.generatePresentation(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('SlideShare /generate error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/log-manual', async (req, res) => {
  try {
    const { dbId, postUrl } = req.body;
    if (!dbId) return res.status(400).json({ success: false, error: 'dbId required' });
    await slideshareService.markAsPosted(dbId, postUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await slideshareService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
