const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protectWithAdminFallback } = require('../middleware/auth');
const { getCheapestPrice, runDailyPriceCheck } = require('../services/flightPriceService');
const jwt = require('jsonwebtoken');

// Flexible auth: accepts both user tokens and admin tokens
async function flexAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'admin') {
      req.user = { id: decoded.id, email: decoded.email, subscription_tier: 'elite', isAdmin: true };
      return next();
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token invalid: ' + err.message });
  }
}

// Only smart_traveler or elite can save alerts
function requirePaid(req, res, next) {
  if (req.user?.isAdmin) return next();
  const tier = (req.user?.subscription_tier || 'free').toLowerCase();
  if (tier === 'free') {
    return res.status(403).json({ success: false, error: 'upgrade_required', message: 'Flight alerts are available to Smart Traveler and Elite members.' });
  }
  next();
}

// GET /api/flight-alerts/diag â€” check config without auth
router.get('/diag', async (req, res) => {
  const key = process.env.SERPAPI_KEY;
  if (!key) return res.json({ configured: false, error: 'SERPAPI_KEY not set' });
  try {
    const axios = require('axios');
    const { data, status } = await axios.get('https://serpapi.com/search', {
      params: { engine: 'google_flights', departure_id: 'FRA', arrival_id: 'JFK', outbound_date: '2026-09-15', return_date: '2026-09-22', currency: 'USD', hl: 'en', adults: 1, api_key: key },
      timeout: 15000
    });
    const count = [...(data.best_flights || []), ...(data.other_flights || [])].length;
    res.json({ configured: true, apiStatus: status, flightsFound: count });
  } catch (e) {
    const status = e.response?.status;
    const msg = e.response?.data?.error || e.message;
    res.json({ configured: true, error: msg, apiStatus: status });
  }
});

// GET /api/flight-alerts/check-price â€” live price lookup (no auth required for preview)
router.get('/check-price', async (req, res) => {
  try {
    const { origin, destination, travel_month } = req.query;
    if (!origin || !destination || !travel_month) {
      return res.status(400).json({ success: false, error: 'origin, destination, and travel_month are required' });
    }
    if (!process.env.RAPIDAPI_KEY) {
      return res.status(500).json({ success: false, error: 'RAPIDAPI_KEY not configured on server' });
    }
    console.log(`[FlightAlert] Checking price: ${origin} -> ${destination} ${travel_month}`);
    const price = await getCheapestPrice(
      origin.toUpperCase(),
      destination.toUpperCase(),
      travel_month
    );
    console.log(`[FlightAlert] Result: $${price}`);
    res.json({ success: true, price, origin: origin.toUpperCase(), destination: destination.toUpperCase(), travel_month });
  } catch (err) {
    console.error('[FlightAlert] check-price error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/flight-alerts â€” list my alerts
router.get('/', flexAuth, async (req, res) => {
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

// POST /api/flight-alerts â€” create alert (paid only)
router.post('/', flexAuth, requirePaid, async (req, res) => {
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

// DELETE /api/flight-alerts/:id â€” delete my alert
router.delete('/:id', flexAuth, async (req, res) => {
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

// POST /api/flight-alerts/admin/run-check â€” manually trigger price check (admin)
router.post('/admin/run-check', protectWithAdminFallback, async (req, res) => {
  try {
    const result = await runDailyPriceCheck();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/flight-alerts/admin/all â€” admin view all alerts
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


