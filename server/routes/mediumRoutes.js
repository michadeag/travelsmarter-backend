const express = require('express');
const router = express.Router();
const mediumService = require('../services/mediumService');

router.get('/status', async (req, res) => {
  try {
    await mediumService.loadSettings();
    const pool = require('../config/database');
    const r = await pool.query(`SELECT COUNT(*) AS total FROM medium_posts`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = mediumService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reload-settings', async (req, res) => {
  try {
    mediumService.userId = null;
    const configured = await mediumService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const result = await mediumService.createAndPost();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    res.json({ success: true, topics: mediumService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await mediumService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/medium/generate — generate article + image for manual copy-paste
router.post('/generate', async (req, res) => {
  try {
    const { topicIndex } = req.body;
    const result = await mediumService.generateForManual(topicIndex ?? null);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/medium/log-manual — mark a generated article as posted
router.post('/log-manual', async (req, res) => {
  try {
    const { dbId, title, body, tags, category, mediumUrl, includeCTA } = req.body;
    if (!dbId && !title) return res.status(400).json({ success: false, error: 'dbId or title required' });
    await mediumService.logManual({ dbId, title, body, tags, category, mediumUrl, includeCTA });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/start', async (req, res) => {
  try {
    await mediumService.loadSettings();
    const result = mediumService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = mediumService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
