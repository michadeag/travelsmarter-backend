const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protectWithAdminFallback } = require('../middleware/auth');
const longtailPublisherService = require('../services/longtailPublisherService');
const { TEMPLATES, COUNTRIES } = require('../services/longtailTopicCatalog');

// @desc Stats for the admin dashboard: total published, remaining catalog
//   size, and the most recent pages — mostly for oversight, since this
//   pipeline is designed to run fully automatically with no daily
//   attention needed.
// @route GET /api/longtail/admin/stats
// @access Admin
router.get('/admin/stats', protectWithAdminFallback, async (req, res) => {
  try {
    const { rows: summaryRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE published_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE published_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*)::int AS all_time
      FROM longtail_pages
    `);
    const { rows: recent } = await pool.query(
      `SELECT slug, title, country_name, published_at FROM longtail_pages ORDER BY published_at DESC LIMIT 20`
    );
    const totalCatalog = TEMPLATES.length * COUNTRIES.length;
    res.json({ success: true, summary: { ...summaryRows[0], totalCatalog, remaining: totalCatalog - summaryRows[0].all_time }, recent });
  } catch (error) {
    console.error('longtail admin/stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Manually trigger one day's batch right now — for testing/verifying
//   the pipeline without waiting for the 11:20 AM ET cron.
// @route POST /api/longtail/admin/publish-now
// @access Admin
router.post('/admin/publish-now', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await longtailPublisherService.publishDailyBatch();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('longtail publish-now error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc Re-render every already-published page from stored content and
//   re-commit it — for rolling out a renderer/template fix to live pages
//   without waiting for new pages to naturally pick it up.
// @route POST /api/longtail/admin/republish-all
// @access Admin
router.post('/admin/republish-all', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await longtailPublisherService.republishAll();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('longtail republish-all error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
