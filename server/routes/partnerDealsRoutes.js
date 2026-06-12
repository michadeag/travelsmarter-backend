const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Public: get active deals (frontend does tier-gating)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let q = `SELECT id, title, description, category, discount_badge, affiliate_url, logo_url, is_verified, click_count, sort_order
             FROM partner_deals WHERE is_active = true`;
    const params = [];
    if (category && category !== 'all') {
      params.push(category);
      q += ` AND category = $${params.length}`;
    }
    q += ` ORDER BY sort_order ASC, created_at DESC`;
    const r = await pool.query(q, params);
    res.json({ success: true, deals: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Track affiliate click
router.post('/:id/click', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE partner_deals SET click_count = click_count + 1 WHERE id = $1 RETURNING affiliate_url`,
      [req.params.id]
    );
    res.json({ success: true, url: r.rows[0]?.affiliate_url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: get all deals including inactive
router.get('/admin', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM partner_deals ORDER BY sort_order ASC, created_at DESC`);
    res.json({ success: true, deals: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: create deal
router.post('/', async (req, res) => {
  try {
    const { title, description, category, discountBadge, affiliateUrl, logoUrl, isVerified, sortOrder } = req.body;
    if (!title || !affiliateUrl) return res.status(400).json({ success: false, error: 'title and affiliateUrl required' });
    const r = await pool.query(
      `INSERT INTO partner_deals (title, description, category, discount_badge, affiliate_url, logo_url, is_verified, sort_order, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW()) RETURNING id`,
      [title, description||'', category||'other', discountBadge||'', affiliateUrl, logoUrl||'', isVerified!==false, sortOrder||0]
    );
    res.json({ success: true, id: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: update deal
router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, discountBadge, affiliateUrl, logoUrl, isVerified, isActive, sortOrder } = req.body;
    await pool.query(
      `UPDATE partner_deals SET title=$1, description=$2, category=$3, discount_badge=$4, affiliate_url=$5,
       logo_url=$6, is_verified=$7, is_active=$8, sort_order=$9 WHERE id=$10`,
      [title, description, category, discountBadge, affiliateUrl, logoUrl, isVerified!==false, isActive!==false, sortOrder||0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: delete deal
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM partner_deals WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
