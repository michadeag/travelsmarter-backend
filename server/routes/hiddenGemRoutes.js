const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protectWithAdminFallback } = require('../middleware/auth');

// Ensure hidden_gems table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hidden_gems (
      id SERIAL PRIMARY KEY,
      month VARCHAR(7) NOT NULL UNIQUE,
      destination VARCHAR(255) NOT NULL,
      country VARCHAR(255) NOT NULL,
      tagline VARCHAR(500),
      description TEXT,
      why_now TEXT,
      best_time VARCHAR(255),
      daily_budget VARCHAR(100),
      flight_tip TEXT,
      image_url TEXT,
      flag_emoji VARCHAR(10),
      timing_score VARCHAR(20) DEFAULT 'green',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
ensureTable().catch(console.error);

// GET /api/hidden-gem/current — returns current month's gem (requires smart_traveler+)
router.get('/current', async (req, res) => {
  try {
    const month = new Date().toISOString().slice(0, 7); // e.g. "2026-06"

    // Check token for tier — optional auth
    let userTier = 'free';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const result = await pool.query('SELECT subscription_tier FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length > 0) userTier = result.rows[0].subscription_tier || 'free';
      } catch (_) {}
    }

    const allowed = ['smart_traveler', 'elite'].includes(userTier);

    const gemResult = await pool.query(
      'SELECT * FROM hidden_gems WHERE month = $1 OR month <= $1 ORDER BY month DESC LIMIT 1',
      [month]
    );

    if (gemResult.rows.length === 0) {
      return res.json({ success: true, gem: null, tier: userTier, allowed });
    }

    const gem = gemResult.rows[0];

    if (!allowed) {
      // Return teaser only — no full content
      return res.json({
        success: true,
        allowed: false,
        tier: userTier,
        gem: {
          month: gem.month,
          destination: gem.destination,
          country: gem.country,
          flag_emoji: gem.flag_emoji,
          tagline: gem.tagline,
        }
      });
    }

    res.json({ success: true, allowed: true, tier: userTier, gem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/hidden-gem/all — admin: list all gems
router.get('/all', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hidden_gems ORDER BY month DESC');
    res.json({ success: true, gems: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/hidden-gem/upsert — admin: create or update a gem
router.post('/upsert', protectWithAdminFallback, async (req, res) => {
  try {
    const {
      month, destination, country, tagline, description, why_now,
      best_time, daily_budget, flight_tip, image_url, flag_emoji, timing_score
    } = req.body;

    if (!month || !destination || !country) {
      return res.status(400).json({ success: false, error: 'month, destination, and country are required' });
    }

    const result = await pool.query(`
      INSERT INTO hidden_gems
        (month, destination, country, tagline, description, why_now, best_time, daily_budget, flight_tip, image_url, flag_emoji, timing_score, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_TIMESTAMP)
      ON CONFLICT (month) DO UPDATE SET
        destination = EXCLUDED.destination, country = EXCLUDED.country,
        tagline = EXCLUDED.tagline, description = EXCLUDED.description,
        why_now = EXCLUDED.why_now, best_time = EXCLUDED.best_time,
        daily_budget = EXCLUDED.daily_budget, flight_tip = EXCLUDED.flight_tip,
        image_url = EXCLUDED.image_url, flag_emoji = EXCLUDED.flag_emoji,
        timing_score = EXCLUDED.timing_score, updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [month, destination, country, tagline, description, why_now,
       best_time, daily_budget, flight_tip, image_url, flag_emoji, timing_score || 'green']
    );

    res.json({ success: true, gem: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/hidden-gem/:month — admin: delete a gem
router.delete('/:month', protectWithAdminFallback, async (req, res) => {
  try {
    await pool.query('DELETE FROM hidden_gems WHERE month = $1', [req.params.month]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
