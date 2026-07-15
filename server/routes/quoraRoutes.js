const express = require('express');
const router = express.Router();
const quoraService = require('../services/quoraService');
const pool = require('../config/database');
const { protectWithAdminFallback } = require('../middleware/auth');

router.get('/status', async (req, res) => {
  try {
    await quoraService.loadSettings();
    const r = await pool.query(`SELECT COUNT(*) AS total FROM quora_answers WHERE status = 'posted'`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = quoraService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/topics', async (req, res) => {
  try {
    await quoraService.loadSettings();
    res.json({ success: true, topics: quoraService.getTopics() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// New copy-paste generate endpoint
router.post('/generate', protectWithAdminFallback, async (req, res) => {
  try {
    const { topicIndex } = req.body;
    const result = await quoraService.generatePost(
      topicIndex !== undefined ? parseInt(topicIndex) : null
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mark as manually posted
router.post('/log-manual', protectWithAdminFallback, async (req, res) => {
  try {
    const { dbId, postUrl } = req.body;
    if (!dbId) return res.status(400).json({ success: false, error: 'dbId required' });
    await quoraService.markAsPosted(dbId, postUrl);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await quoraService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy endpoints (kept for backward compat)
router.get('/questions', async (req, res) => {
  res.json({ success: true, questions: quoraService.getQuestions() });
});

router.get('/recent-answers', async (req, res) => {
  try {
    const answers = await quoraService.getRecentAnswers(20);
    res.json({ success: true, answers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
