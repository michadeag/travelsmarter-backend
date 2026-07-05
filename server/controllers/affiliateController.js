const pool = require('../config/database');

// Seed candidate partners found in the existing hack content, so there's a
// ready checklist to fill in as each affiliate program approves you —
// fallback_url is the plain public site, used until affiliate_url is set.
const SEED_PARTNERS = [
  { slug: 'wise', name: 'Wise', category: 'money', fallback_url: 'https://wise.com' },
  { slug: 'airalo', name: 'Airalo', category: 'esim', fallback_url: 'https://www.airalo.com' },
  { slug: 'nordvpn', name: 'NordVPN', category: 'vpn', fallback_url: 'https://nordvpn.com' },
  { slug: 'booking-com', name: 'Booking.com', category: 'accommodation', fallback_url: 'https://www.booking.com' },
  { slug: 'airbnb', name: 'Airbnb', category: 'accommodation', fallback_url: 'https://www.airbnb.com' },
  { slug: 'chase-sapphire-preferred', name: 'Chase Sapphire Preferred', category: 'credit_cards', fallback_url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred' },
  { slug: 'chase-sapphire-reserve', name: 'Chase Sapphire Reserve', category: 'credit_cards', fallback_url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/reserve' },
  { slug: 'amex-platinum', name: 'Amex Platinum', category: 'credit_cards', fallback_url: 'https://www.americanexpress.com/us/credit-cards/card/platinum/' },
  { slug: 'amex-gold', name: 'Amex Gold', category: 'credit_cards', fallback_url: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/' },
  { slug: 'capital-one-venture', name: 'Capital One Venture', category: 'credit_cards', fallback_url: 'https://www.capitalone.com/credit-cards/venture/' },
  { slug: 'citi-premier', name: 'Citi Premier', category: 'credit_cards', fallback_url: 'https://www.citi.com/credit-cards/citi-premier-credit-card' },
  { slug: 'safetywing', name: 'SafetyWing', category: 'insurance', fallback_url: 'https://safetywing.com' },
  { slug: 'revolut', name: 'Revolut', category: 'money', fallback_url: 'https://www.revolut.com' },
  { slug: 'n26', name: 'N26', category: 'money', fallback_url: 'https://n26.com' },
  { slug: 'kayak', name: 'Kayak', category: 'flights', fallback_url: 'https://www.kayak.com' },
  { slug: 'the-fork', name: 'The Fork', category: 'dining', fallback_url: 'https://www.thefork.com' },
  { slug: 'charles-schwab', name: 'Charles Schwab', category: 'money', fallback_url: 'https://www.schwab.com' },
  { slug: 'priority-pass', name: 'Priority Pass', category: 'lounge_access', fallback_url: 'https://www.prioritypass.com' },
];

async function seedAffiliatePartners() {
  for (const p of SEED_PARTNERS) {
    await pool.query(
      `INSERT INTO affiliate_partners (slug, name, category, fallback_url, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (slug) DO NOTHING`,
      [p.slug, p.name, p.category, p.fallback_url]
    );
  }
}

// @desc List all affiliate partners (admin)
// @route GET /api/affiliate/admin
exports.getAllPartners = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ap.*, COALESCE(c.click_count, 0) AS click_count
      FROM affiliate_partners ap
      LEFT JOIN (
        SELECT partner_slug, count(*) AS click_count
        FROM affiliate_clicks GROUP BY partner_slug
      ) c ON c.partner_slug = ap.slug
      ORDER BY ap.category, ap.name
    `);
    res.status(200).json({ success: true, partners: result.rows });
  } catch (error) {
    console.error('Get affiliate partners error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Create a new affiliate partner (admin)
// @route POST /api/affiliate/admin
exports.createPartner = async (req, res) => {
  try {
    const { slug, name, category, fallback_url, affiliate_url, notes } = req.body;
    if (!slug || !name) {
      return res.status(400).json({ success: false, error: 'slug and name are required' });
    }
    const result = await pool.query(
      `INSERT INTO affiliate_partners (slug, name, category, fallback_url, affiliate_url, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [slug.toLowerCase(), name, category || null, fallback_url || null, affiliate_url || null, notes || null]
    );
    res.status(201).json({ success: true, partner: result.rows[0] });
  } catch (error) {
    console.error('Create affiliate partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Update an affiliate partner — this is the main action: paste in the
// affiliate_url once accepted into that program
// @route PUT /api/affiliate/admin/:id
exports.updatePartner = async (req, res) => {
  try {
    const { name, category, fallback_url, affiliate_url, is_active, notes } = req.body;
    const result = await pool.query(
      `UPDATE affiliate_partners
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           fallback_url = COALESCE($3, fallback_url),
           affiliate_url = $4,
           is_active = COALESCE($5, is_active),
           notes = COALESCE($6, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, category, fallback_url, affiliate_url !== undefined ? affiliate_url : null, is_active, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Partner not found' });
    }
    res.status(200).json({ success: true, partner: result.rows[0] });
  } catch (error) {
    console.error('Update affiliate partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Delete an affiliate partner (admin)
// @route DELETE /api/affiliate/admin/:id
exports.deletePartner = async (req, res) => {
  try {
    await pool.query(`DELETE FROM affiliate_partners WHERE id = $1`, [req.params.id]);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete affiliate partner error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Redirect to a partner's current best link (affiliate if set, else
// fallback), logging the click. This is the stable link content should use —
// approving a new program later only requires an admin edit, not a content change.
// @route GET /api/affiliate/go/:slug
// @access Public
exports.redirectToPartner = async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const result = await pool.query(
      `SELECT affiliate_url, fallback_url, is_active FROM affiliate_partners WHERE slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.redirect(302, process.env.FRONTEND_URL || 'https://travelsmarterapp.com');
    }

    const partner = result.rows[0];
    const usedAffiliateLink = !!(partner.is_active && partner.affiliate_url);
    const destination = usedAffiliateLink
      ? partner.affiliate_url
      : (partner.fallback_url || process.env.FRONTEND_URL || 'https://travelsmarterapp.com');

    pool.query(
      `INSERT INTO affiliate_clicks (partner_slug, source_page, used_affiliate_link)
       VALUES ($1, $2, $3)`,
      [slug, req.query.from || req.get('referer') || null, usedAffiliateLink]
    ).catch(err => console.error('Failed to log affiliate click:', err.message));

    res.redirect(302, destination);
  } catch (error) {
    console.error('Affiliate redirect error:', error);
    res.redirect(302, process.env.FRONTEND_URL || 'https://travelsmarterapp.com');
  }
};

exports.seedAffiliatePartners = seedAffiliatePartners;
