const express = require('express');
const router = express.Router();
const redditService = require('../services/redditService');
const pool = require('../config/database');

// GET /api/reddit/topics
router.get('/topics', async (req, res) => {
  try {
    await redditService.loadSettings();
    const topics = redditService.TOPIC_MAP || [];
    const counter = redditService.postCounter || 0;
    const nextIdx = counter % topics.length;
    res.json({ success: true, topics: topics.map((t, i) => ({
      index: i,
      title: t.topic.substring(0, 65),
      subreddits: t.subreddits,
      isNext: i === nextIdx
    })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/generate — generate post text only, no posting
router.post('/generate', async (req, res) => {
  try {
    await redditService.loadSettings();
    const { topicIndex } = req.body;
    const topics = redditService.TOPIC_MAP;
    const idx = (topicIndex != null && topics[topicIndex]) ? topicIndex : Math.floor(Math.random() * topics.length);
    const topicEntry = topics[idx];

    redditService.postCounter = (redditService.postCounter || 0) + 1;
    const includeCTA = redditService.postCounter % 3 === 0;
    const article = await redditService.generateArticle(topicEntry, includeCTA);

    // Save as draft
    const r = await pool.query(
      `INSERT INTO reddit_posts (title, body, subreddit, category, included_cta, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, 'draft', NOW()) RETURNING id`,
      [article.title, article.body, article.subreddits[0], article.category, includeCTA]
    );
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('reddit_post_counter', $1, 'text')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(redditService.postCounter)]
    );

    res.json({ success: true, ...article, includeCTA, dbId: r.rows[0].id });
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    res.status(500).json({ success: false, error: detail });
  }
});

// POST /api/reddit/log-manual — mark as manually posted
router.post('/log-manual', async (req, res) => {
  try {
    const { dbId, title, body, subreddit, category, redditUrl, includeCTA } = req.body;
    if (dbId) {
      await pool.query(
        `UPDATE reddit_posts SET status='posted', reddit_url=$1, posted_at=NOW() WHERE id=$2`,
        [redditUrl || null, dbId]
      );
    } else {
      await pool.query(
        `INSERT INTO reddit_posts (title, body, subreddit, category, included_cta, reddit_url, status, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'posted', NOW())`,
        [title, body, subreddit, category, includeCTA || false, redditUrl || null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reddit/status
router.get('/status', async (req, res) => {
  try {
    await redditService.loadSettings();
    const pool = require('../config/database');
    const r = await pool.query(`SELECT COUNT(*) AS total FROM reddit_posts`).catch(() => ({ rows: [{ total: 0 }] }));
    const status = redditService.getStatus();
    status.totalPosts = parseInt(r.rows[0].total) || 0;
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/reload-settings — call after saving credentials
router.post('/reload-settings', async (req, res) => {
  try {
    redditService.accessToken = null; // force token refresh
    const configured = await redditService.loadSettings();
    res.json({ success: true, configured });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/post-article — generate + post immediately
router.post('/post-article', async (req, res) => {
  try {
    const { subreddit } = req.body; // optional override
    const result = await redditService.createAndPost(subreddit || null);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reddit/recent-posts
router.get('/recent-posts', async (req, res) => {
  try {
    const posts = await redditService.getRecentPosts(20);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/scheduler/start
router.post('/scheduler/start', async (req, res) => {
  try {
    await redditService.loadSettings();
    const result = redditService.startScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reddit/scheduler/stop
router.post('/scheduler/stop', async (req, res) => {
  try {
    const result = redditService.stopScheduler();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
