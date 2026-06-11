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

// Mark as posted AND optionally save as goodie
router.post('/log-manual', async (req, res) => {
  try {
    const { dbId, postUrl, saveAsGoodie, goodieTitle, goodieDescription, goodieCategory } = req.body;
    if (!dbId) return res.status(400).json({ success: false, error: 'dbId required' });

    await slideshareService.markAsPosted(dbId, postUrl);

    let goodieId = null;
    if (saveAsGoodie && postUrl) {
      const r = await pool.query(
        `INSERT INTO goodies (title, description, slideshare_url, category, active, created_at)
         VALUES ($1, $2, $3, $4, true, NOW()) RETURNING id`,
        [goodieTitle || 'Travel Guide', goodieDescription || '', postUrl, goodieCategory || 'travel']
      );
      goodieId = r.rows[0].id;
    }

    res.json({ success: true, goodieId });
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

// ─── GOODIES LIBRARY ─────────────────────────────────────────────────────────

// Get all goodies (admin)
router.get('/goodies', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM goodies ORDER BY created_at DESC`);
    res.json({ success: true, goodies: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add goodie manually
router.post('/goodies', async (req, res) => {
  try {
    const { title, description, slideshareUrl, pdfUrl, category, thumbnailUrl } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'title required' });
    const r = await pool.query(
      `INSERT INTO goodies (title, description, slideshare_url, pdf_url, category, thumbnail_url, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING id`,
      [title, description || '', slideshareUrl || null, pdfUrl || null, category || 'travel', thumbnailUrl || null]
    );
    res.json({ success: true, id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update goodie
router.put('/goodies/:id', async (req, res) => {
  try {
    const { title, description, slideshareUrl, pdfUrl, category, thumbnailUrl, active } = req.body;
    await pool.query(
      `UPDATE goodies SET title=$1, description=$2, slideshare_url=$3, pdf_url=$4, category=$5, thumbnail_url=$6, active=$7 WHERE id=$8`,
      [title, description, slideshareUrl, pdfUrl, category, thumbnailUrl, active !== false, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete goodie
router.delete('/goodies/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM goodies WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Public endpoint — used by the app/website to show goodies to users
router.get('/goodies/public', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, description, slideshare_url, pdf_url, category, thumbnail_url, download_count
       FROM goodies WHERE active = true ORDER BY created_at DESC`
    );
    res.json({ success: true, goodies: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Track download
router.post('/goodies/:id/download', async (req, res) => {
  try {
    await pool.query(`UPDATE goodies SET download_count = download_count + 1 WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
