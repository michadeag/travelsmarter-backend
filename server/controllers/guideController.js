const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');

// PDF travel guides ("100 Best Restaurants in Germany" etc.) — content is
// manually researched and written outside this app, then uploaded here as a
// finished PDF. Unlike the free-tool checkers, there is no computeResult()
// to generate this from; the database row + uploaded file IS the product.
const SINGLE_PRICE_CENTS = 499;
const BUNDLE_PRICE_CENTS = 2900;

// ---------- Admin ----------

// @desc List every guide (published or not) for the admin dashboard table.
//   Never includes pdf_data — the table just needs to know a PDF exists.
// @route GET /api/guides/admin
// @access Admin
exports.listGuidesAdmin = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title, subtitle, country_slug, country_name, category,
              price_cents, free_items, pdf_filename, pdf_size_bytes, published,
              created_at, updated_at
       FROM guides ORDER BY country_name ASC, category ASC, title ASC`
    );
    res.status(200).json({ success: true, guides: rows });
  } catch (error) {
    console.error('listGuidesAdmin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function parseFreeItems(raw) {
  if (!raw) return [];
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!Array.isArray(parsed)) throw new Error('free_items must be an array');
  return parsed.map(item => ({ name: String(item.name || '').trim(), blurb: String(item.blurb || '').trim() }))
    .filter(item => item.name);
}

// @desc Create a new guide, with the finished PDF uploaded as multipart form
//   data (field name "pdf"). Starts unpublished — flip published via the
//   toggle endpoint once the content has been reviewed.
// @route POST /api/guides/admin
// @access Admin
exports.createGuide = async (req, res) => {
  try {
    const { slug, title, subtitle, country_slug, country_name, category, price_cents } = req.body;
    if (!slug || !title || !country_slug || !country_name || !category) {
      return res.status(400).json({ success: false, error: 'slug, title, country_slug, country_name, and category are required' });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ success: false, error: 'slug must be lowercase letters, numbers, and hyphens only' });
    }

    let freeItems;
    try {
      freeItems = parseFreeItems(req.body.free_items);
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const pdfBuffer = req.file ? req.file.buffer : null;
    const pdfFilename = req.file ? req.file.originalname : null;
    const pdfSize = req.file ? req.file.size : null;

    const result = await pool.query(
      `INSERT INTO guides (slug, title, subtitle, country_slug, country_name, category, price_cents, free_items, pdf_data, pdf_filename, pdf_size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, slug, title, published`,
      [slug, title, subtitle || null, country_slug, country_name, category,
        price_cents ? parseInt(price_cents, 10) : SINGLE_PRICE_CENTS,
        JSON.stringify(freeItems), pdfBuffer, pdfFilename, pdfSize]
    );

    res.status(201).json({ success: true, guide: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'A guide with this slug already exists' });
    }
    console.error('createGuide error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Update a guide's metadata, and optionally replace the PDF
//   (only if a new file is uploaded — omitting it keeps the existing PDF).
// @route PUT /api/guides/admin/:id
// @access Admin
exports.updateGuide = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, country_slug, country_name, category, price_cents } = req.body;

    let freeItems;
    try {
      freeItems = req.body.free_items !== undefined ? parseFreeItems(req.body.free_items) : undefined;
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    const fields = [];
    const values = [];
    let i = 1;
    const set = (col, val) => { fields.push(`${col} = $${i++}`); values.push(val); };

    if (title !== undefined) set('title', title);
    if (subtitle !== undefined) set('subtitle', subtitle || null);
    if (country_slug !== undefined) set('country_slug', country_slug);
    if (country_name !== undefined) set('country_name', country_name);
    if (category !== undefined) set('category', category);
    if (price_cents !== undefined) set('price_cents', parseInt(price_cents, 10));
    if (freeItems !== undefined) set('free_items', JSON.stringify(freeItems));
    if (req.file) {
      set('pdf_data', req.file.buffer);
      set('pdf_filename', req.file.originalname);
      set('pdf_size_bytes', req.file.size);
    }
    set('updated_at', new Date());

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }
    values.push(id);

    const result = await pool.query(
      `UPDATE guides SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, slug, title, published`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }
    res.status(200).json({ success: true, guide: result.rows[0] });
  } catch (error) {
    console.error('updateGuide error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Flip published on/off. A guide needs a PDF uploaded before it can
//   be published — otherwise a paying customer would get an empty email.
// @route POST /api/guides/admin/:id/publish
// @access Admin
exports.togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { published } = req.body;

    if (published) {
      const check = await pool.query('SELECT pdf_data FROM guides WHERE id = $1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'Guide not found' });
      if (!check.rows[0].pdf_data) {
        return res.status(400).json({ success: false, error: 'Upload a PDF before publishing this guide' });
      }
    }

    const result = await pool.query(
      'UPDATE guides SET published = $1, updated_at = NOW() WHERE id = $2 RETURNING id, slug, published',
      [!!published, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Guide not found' });
    res.status(200).json({ success: true, guide: result.rows[0] });
  } catch (error) {
    console.error('togglePublish error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Delete a guide entirely.
// @route DELETE /api/guides/admin/:id
// @access Admin
exports.deleteGuide = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM guides WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Guide not found' });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('deleteGuide error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- Public ----------

// @desc Guide metadata for a landing page — published guides only, never
//   includes pdf_data (that only ever leaves the server as an email attachment
//   after a verified payment).
// @route GET /api/guides/public/:slug
// @access Public
exports.getGuidePublic = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT slug, title, subtitle, country_slug, country_name, category, price_cents, free_items, updated_at
       FROM guides WHERE slug = $1 AND published = true`,
      [req.params.slug]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Guide not found' });
    res.status(200).json({ success: true, guide: rows[0], bundlePriceCents: BUNDLE_PRICE_CENTS });
  } catch (error) {
    console.error('getGuidePublic error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Every published guide for a country — powers the country bundle
//   landing page. Bundle contents are computed live from this list rather
//   than fixed at purchase time, so a bundle buyer automatically gets any
//   guide added for that country later too.
// @route GET /api/guides/public?country=germany
// @access Public
exports.listGuidesByCountry = async (req, res) => {
  try {
    const { country } = req.query;
    if (!country) return res.status(400).json({ success: false, error: 'country query param is required' });

    const { rows } = await pool.query(
      `SELECT slug, title, subtitle, category, price_cents, free_items, country_name
       FROM guides WHERE country_slug = $1 AND published = true ORDER BY category ASC, title ASC`,
      [country]
    );
    res.status(200).json({
      success: true,
      countrySlug: country,
      countryName: rows[0]?.country_name || null,
      guides: rows,
      bundlePriceCents: BUNDLE_PRICE_CENTS,
    });
  } catch (error) {
    console.error('listGuidesByCountry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ---------- Checkout ----------

// @desc Create a Stripe Checkout session for a single guide ($4.99).
// @route POST /api/guides/checkout
// @access Public
exports.createGuideCheckout = async (req, res) => {
  try {
    const { slug, email, firstName, sourcePage } = req.body;
    if (!slug || !email) return res.status(400).json({ success: false, error: 'slug and email are required' });
    const normalizedEmail = email.toLowerCase().trim();

    const guideResult = await pool.query(
      'SELECT id, title, price_cents FROM guides WHERE slug = $1 AND published = true',
      [slug]
    );
    if (guideResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Guide not found' });
    }
    const guide = guideResult.rows[0];

    const purchaseResult = await pool.query(
      `INSERT INTO guide_purchases (email, first_name, purchase_type, guide_id, status, source_page)
       VALUES ($1, $2, 'single', $3, 'pending', $4) RETURNING id`,
      [normalizedEmail, firstName || null, guide.id, sourcePage || null]
    );
    const purchaseId = purchaseResult.rows[0].id;

    const session = await stripe.checkout.sessions.create({
      customer_email: normalizedEmail,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: guide.title, description: 'TravelSmarter PDF guide' },
          unit_amount: guide.price_cents,
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/guide-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/guide-${slug}.html`,
      metadata: { type: 'guide_purchase', purchaseId, purchaseType: 'single' },
    });

    await pool.query('UPDATE guide_purchases SET stripe_session_id = $1 WHERE id = $2', [session.id, purchaseId]);
    res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('createGuideCheckout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Create a Stripe Checkout session for a country bundle ($29 for
//   every published guide in that country).
// @route POST /api/guides/checkout-bundle
// @access Public
exports.createBundleCheckout = async (req, res) => {
  try {
    const { countrySlug, email, firstName, sourcePage } = req.body;
    if (!countrySlug || !email) return res.status(400).json({ success: false, error: 'countrySlug and email are required' });
    const normalizedEmail = email.toLowerCase().trim();

    const guidesResult = await pool.query(
      'SELECT country_name, price_cents FROM guides WHERE country_slug = $1 AND published = true',
      [countrySlug]
    );
    if (guidesResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No published guides for this country yet' });
    }
    const countryName = guidesResult.rows[0].country_name;

    // Guard against selling a "bundle" that costs more than its parts —
    // with only a few guides published for a country, $29 can exceed their
    // combined individual price. Refuse rather than overcharge.
    const singleTotalCents = guidesResult.rows.reduce((sum, g) => sum + g.price_cents, 0);
    if (BUNDLE_PRICE_CENTS >= singleTotalCents) {
      return res.status(400).json({ success: false, error: 'Bundle is not yet available for this country — not enough guides published' });
    }

    const purchaseResult = await pool.query(
      `INSERT INTO guide_purchases (email, first_name, purchase_type, country_slug, country_name, status, source_page)
       VALUES ($1, $2, 'bundle', $3, $4, 'pending', $5) RETURNING id`,
      [normalizedEmail, firstName || null, countrySlug, countryName, sourcePage || null]
    );
    const purchaseId = purchaseResult.rows[0].id;

    const session = await stripe.checkout.sessions.create({
      customer_email: normalizedEmail,
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${countryName} Guide Bundle`, description: 'Every TravelSmarter PDF guide for this destination' },
          unit_amount: BUNDLE_PRICE_CENTS,
        },
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/guide-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/guides-bundle-${countrySlug}.html`,
      metadata: { type: 'guide_purchase', purchaseId, purchaseType: 'bundle' },
    });

    await pool.query('UPDATE guide_purchases SET stripe_session_id = $1 WHERE id = $2', [session.id, purchaseId]);
    res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('createBundleCheckout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Called by subscriptionController's shared Stripe webhook handler
//   when checkout.session.completed carries metadata.type === 'guide_purchase'
//   — same "reuse one webhook endpoint, branch on metadata" pattern already
//   used for Trip Brief (see tripBriefController.handleTripBriefCheckoutCompleted).
// @access Internal (called from subscriptionController, not routed directly)
exports.handleGuideCheckoutCompleted = async (session) => {
  const purchaseId = session.metadata.purchaseId;

  const purchaseResult = await pool.query('SELECT * FROM guide_purchases WHERE id = $1', [purchaseId]);
  if (purchaseResult.rows.length === 0) {
    console.error(`Guide purchase not found: ${purchaseId}`);
    return;
  }
  const purchase = purchaseResult.rows[0];
  const amountPaid = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;

  await pool.query(
    `UPDATE guide_purchases SET status = 'paid', stripe_payment_intent_id = $1, amount_paid = $2 WHERE id = $3`,
    [session.payment_intent, amountPaid, purchaseId]
  );
  console.log(`✅ Guide purchase paid: ${purchaseId} (${purchase.purchase_type}) for ${purchase.email}`);

  try {
    let guides;
    let emailSubject;
    let emailIntro;

    if (purchase.purchase_type === 'single') {
      const g = await pool.query('SELECT title, pdf_data, pdf_filename, country_slug FROM guides WHERE id = $1', [purchase.guide_id]);
      if (g.rows.length === 0 || !g.rows[0].pdf_data) throw new Error('Guide PDF not available');
      guides = g.rows;
      emailSubject = `📄 Your "${guides[0].title}" guide is ready`;
      emailIntro = `Your <strong>${guides[0].title}</strong> guide is attached.`;
    } else {
      const g = await pool.query(
        'SELECT title, pdf_data, pdf_filename FROM guides WHERE country_slug = $1 AND published = true AND pdf_data IS NOT NULL',
        [purchase.country_slug]
      );
      if (g.rows.length === 0) throw new Error('No guide PDFs available for this bundle');
      guides = g.rows;
      emailSubject = `📚 Your ${purchase.country_name} Guide Bundle is ready`;
      emailIntro = `Every guide for <strong>${purchase.country_name}</strong> is attached (${guides.length} PDF${guides.length > 1 ? 's' : ''}).`;
    }

    await emailService.sendEmail({
      to: purchase.email,
      subject: emailSubject,
      html: `<p>Hi ${purchase.first_name || 'there'},</p>
<p>${emailIntro}</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Planning the rest of this trip too?</strong> The Trip Brief combines visa, money, health, and local-law checks into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
      attachments: guides.map(g => ({
        content: g.pdf_data.toString('base64'),
        filename: g.pdf_filename || `${(g.title || 'guide').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      })),
    });

    await pool.query(`UPDATE guide_purchases SET status = 'delivered', delivered_at = NOW() WHERE id = $1`, [purchaseId]);
  } catch (err) {
    console.error(`Guide PDF delivery failed for purchase ${purchaseId}:`, err.message);
    await pool.query(`UPDATE guide_purchases SET status = 'failed' WHERE id = $1`, [purchaseId]).catch(() => {});
  }
};

exports.SINGLE_PRICE_CENTS = SINGLE_PRICE_CENTS;
exports.BUNDLE_PRICE_CENTS = BUNDLE_PRICE_CENTS;
