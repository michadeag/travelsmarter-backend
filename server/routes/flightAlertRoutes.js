const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect } = require('../middleware/auth');
const { protectWithAdminFallback } = require('../middleware/auth');
const { getCheapestPrice, runDailyPriceCheck } = require('../services/flightPriceService');

// Middleware: only smart_traveler or elite can save alerts
function requirePaid(req, res, next) {
  const tier = (req.user?.subscriptionTier || req.user?.subscription_tier || 'free').toLowerCase();
  if (tier === 'free') {
    return res.status(403).json({ success: false, error: 'upgrade_required', message: 'Flight alerts are available to Smart Traveler and Elite members.' });
  }
  next();
}

// GET /api/flight-alerts/check-price — live price lookup (free users can preview)
router.get('/check-price', protect, async (req, res) => {
  try {
    const { origin, destination, travel_month } = req.query;
    if (!origin || !destination || !travel_month) {
      return res.status(400).json({ success: false, error: 'origin, destination, and travel_month are required' });
    }
    const price = await getCheapestPrice(
      origin.toUpperCase(),
      destination.toUpperCase(),
      travel_month
    );
    res.json({ success: true, price, origin: origin.toUpperCase(), destination: destination.toUpperCase(), travel_month });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/flight-alerts — list my alerts
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM flight_alerts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, alerts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/flight-alerts — create alert (paid only)
router.post('/', protect, requirePaid, async (req, res) => {
  try {
    const { origin, destination, origin_name, destination_name, travel_month, target_price } = req.body;
    if (!origin || !destination || !travel_month || !target_price) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // Max 5 active alerts per user
    const count = await pool.query(
      `SELECT COUNT(*) FROM flight_alerts WHERE user_id = $1 AND active = true`,
      [req.user.id]
    );
    if (parseInt(count.rows[0].count) >= 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 active alerts per account' });
    }

    // Get current price immediately
    let currentPrice = null;
    try {
      currentPrice = await getCheapestPrice(origin.toUpperCase(), destination.toUpperCase(), travel_month);
    } catch (_) {}

    const result = await pool.query(
      `INSERT INTO flight_alerts
        (user_id, origin, destination, origin_name, destination_name, travel_month, target_price, current_price, last_checked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)
       RETURNING *`,
      [req.user.id, origin.toUpperCase(), destination.toUpperCase(),
       origin_name || origin, destination_name || destination,
       travel_month, parseFloat(target_price), currentPrice]
    );

    res.json({ success: true, alert: result.rows[0], current_price: currentPrice });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/flight-alerts/:id — delete my alert
router.delete('/:id', protect, async (req, res) => {
  try {
    await pool.query(
      `UPDATE flight_alerts SET active = false WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/flight-alerts/admin/run-check — manually trigger price check (admin)
router.post('/admin/run-check', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await runDailyPriceCheck();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/flight-alerts/admin/all — admin view all alerts
router.get('/admin/all', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fa.*, u.email, u.first_name, u.subscription_tier
      FROM flight_alerts fa
      JOIN users u ON fa.user_id = u.id
      WHERE fa.active = true
      ORDER BY fa.created_at DESC
    `);
    res.json({ success: true, alerts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
