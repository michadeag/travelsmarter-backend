const pool = require('../config/database');
const referralService = require('../services/referralService');

const CHANNEL_TYPES = ['blog', 'youtube', 'pinterest', 'instagram', 'newsletter', 'other'];
const PARTNER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';

// @desc Public application to become a referral partner (self-service signup)
// @route POST /api/referrals/apply
// @access Public
exports.applyAsPartner = async (req, res) => {
  try {
    const { name, email, website_url, channel_type, audience_size } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'name and email are required' });
    }

    const existing = await pool.query(
      `SELECT referral_code, status FROM referral_partners WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'You already applied with this email.',
        referralCode: existing.rows[0].referral_code,
        status: existing.rows[0].status,
      });
    }

    const referralCode = await referralService.generateUniqueReferralCode(name);
    const result = await pool.query(
      `INSERT INTO referral_partners (name, email, referral_code, channel_type, website_url, audience_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, referral_code, channel_type, status`,
      [
        name,
        email.toLowerCase(),
        referralCode,
        CHANNEL_TYPES.includes(channel_type) ? channel_type : 'other',
        website_url || null,
        audience_size || null,
      ]
    );

    res.status(201).json({ success: true, partner: result.rows[0] });
  } catch (error) {
    console.error('Referral apply error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc List all referral partners with click/conversion stats (admin)
// @route GET /api/referrals/admin/partners
exports.getAllPartners = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rp.*,
        COALESCE(clicks.click_count, 0) AS click_count,
        COALESCE(conv.conversion_count, 0) AS conversion_count,
        COALESCE(conv.total_earned, 0) AS total_earned
      FROM referral_partners rp
      LEFT JOIN (
        SELECT referral_code, COUNT(*) AS click_count
        FROM referral_clicks GROUP BY referral_code
      ) clicks ON clicks.referral_code = rp.referral_code
      LEFT JOIN (
        SELECT partner_id, COUNT(*) AS conversion_count, SUM(commission_amount) AS total_earned
        FROM referral_conversions GROUP BY partner_id
      ) conv ON conv.partner_id = rp.id
      ORDER BY rp.created_at DESC
    `);
    res.status(200).json({ success: true, partners: result.rows });
  } catch (error) {
    console.error('Get referral partners error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Approve/reject/suspend a partner (admin) — only 'approved' partners
// earn commissions, so this is the fraud-review gate before payouts start.
// @route PUT /api/referrals/admin/partners/:id
exports.updatePartnerStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (status && !PARTNER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${PARTNER_STATUSES.join(', ')}`,
      });
    }
    const result = await pool.query(
      `UPDATE referral_partners
       SET status = COALESCE($1, status), notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    res.status(200).json({ success: true, partner: result.rows[0] });
  } catch (error) {
    console.error('Update referral partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Redirect a referral link to the frontend (with ?ref= for attribution),
// logging the click. Works for any code so early clicks are visible during
// admin review, even before a partner is approved.
// @route GET /api/referrals/go/:code
// @access Public
exports.trackClick = async (req, res) => {
  try {
    const code = req.params.code;
    const partnerResult = await pool.query(
      `SELECT id FROM referral_partners WHERE referral_code = $1`,
      [code]
    );
    const partnerId = partnerResult.rows[0]?.id || null;

    pool.query(
      `INSERT INTO referral_clicks (referral_code, partner_id, source_page) VALUES ($1, $2, $3)`,
      [code, partnerId, req.query.from || req.get('referer') || null]
    ).catch(err => console.error('Failed to log referral click:', err.message));

    res.redirect(302, `${FRONTEND_URL}/?ref=${encodeURIComponent(code)}`);
  } catch (error) {
    console.error('Referral redirect error:', error);
    res.redirect(302, FRONTEND_URL);
  }
};

// @desc List commission conversions, optionally filtered by status (admin)
// @route GET /api/referrals/admin/conversions
exports.getAllConversions = async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE rc.status = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT rc.*, rp.name AS partner_name, rp.email AS partner_email, u.email AS user_email
       FROM referral_conversions rc
       JOIN referral_partners rp ON rp.id = rc.partner_id
       JOIN users u ON u.id = rc.user_id
       ${where}
       ORDER BY rc.created_at DESC`,
      params
    );
    res.status(200).json({ success: true, conversions: result.rows });
  } catch (error) {
    console.error('Get referral conversions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Mark an eligible conversion as paid out — manual for Phase 1, until
// Stripe Connect automates this in Phase 2.
// @route POST /api/referrals/admin/conversions/:id/mark-paid
exports.markConversionPaid = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE referral_conversions
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'eligible'
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found or not eligible for payout',
      });
    }
    res.status(200).json({ success: true, conversion: result.rows[0] });
  } catch (error) {
    console.error('Mark conversion paid error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
