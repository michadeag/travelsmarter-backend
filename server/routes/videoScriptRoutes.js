const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const pool = require('../config/database');
const videoScriptService = require('../services/videoScriptService');

// @desc Get N random short-form video script ideas (rotated so repeats
//   surface last), each tied to one free tool.
// @route GET /api/video-scripts/admin/random?count=3
// @access Admin
router.get('/admin/random', protectWithAdminFallback, async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.query.count, 10) || 1, 1), 20);
    const ideas = await videoScriptService.getRandomIdeas(count);
    res.status(200).json({ success: true, ideas });
  } catch (error) {
    console.error('GET /video-scripts/admin/random error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc List every stored script idea (for the admin table view)
// @route GET /api/video-scripts/admin/all
// @access Admin
router.get('/admin/all', protectWithAdminFallback, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM video_script_ideas ORDER BY tool_name, hook'
    );
    res.status(200).json({ success: true, ideas: rows });
  } catch (error) {
    console.error('GET /video-scripts/admin/all error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
