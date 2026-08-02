const pool = require('../config/database');

// Base slugs for every free lead-gen tool's generic page. Used to bucket a
// raw page path (e.g. "/customs-checker-jamaica.html") into its parent tool
// for aggregate reporting. Kept as a static list rather than derived from
// backend routes since this needs to match static frontend filenames, which
// don't necessarily mirror the API route slugs 1:1. New tools must be added
// here to be tracked — sorted longest-first so prefix matching never picks
// a shorter, unrelated slug by accident.
const TOOL_BASE_SLUGS = [
  'best-time-to-book-flights', 'carry-on-size-checker', 'visa-requirement-checker',
  'jet-lag-calculator', 'packing-list-generator', 'travel-budget-calculator',
  'power-plug-checker', 'tipping-calculator', 'layover-checker',
  'travel-health-checker', 'water-safety-checker', 'flight-carbon-calculator',
  'airport-transfer-calculator', 'baggage-fee-calculator', 'emergency-number-checker',
  'rideshare-checker', 'driving-checker', 'sim-checker',
  'delay-compensation-checker', 'customs-checker', 'best-month-checker',
  'currency-checker', 'language-checker', 'transit-checker',
  'airport-amenities-checker', 'drone-checker', 'alcohol-checker',
  'seat-pitch-checker', 'insurance-cost-estimator', 'pet-travel-checker',
  'passport-validity-checker', 'public-holiday-checker', 'rental-age-checker',
  'atm-fee-checker', 'dress-code-checker', 'lost-passport-checker',
  'tourist-tax-checker', 'short-term-rental-checker', 'uv-index-checker',
  'departure-tax-checker', 'wildlife-safety-checker', 'time-zone-checker',
  'drinking-age-checker', 'vpn-censorship-checker', 'smoking-vaping-checker',
  'natural-disaster-checker', 'cashless-payment-checker', 'etiquette-checker',
  'business-hours-checker', 'internet-speed-checker', 'airport-arrival-time-checker',
  'medication-legality-checker', 'vat-refund-checker', 'resort-fee-checker',
  'travel-advisory-checker', 'lgbtq-travel-safety-checker', 'lounge-access-checker',
  'accessible-travel-checker', 'holiday-season-checker', 'overweight-baggage-checker',
  'photography-permit-checker', 'souvenir-export-checker', 'tourist-scams-checker', 'lost-baggage-checker', 'cash-declaration-checker', 'yellow-fever-checker', 'digital-nomad-visa-checker', 'solo-female-travel-checker', 'minor-consent-checker', 'ramadan-checker', 'halal-food-checker', 'kosher-food-checker', 'car-rental-insurance-checker', 'pregnancy-travel-checker', 'sports-equipment-checker', 'wedding-legal-checker', 'luggage-storage-checker', 'public-restroom-checker', 'beach-safety-checker', 'air-quality-checker', 'street-food-checker', 'altitude-sickness-checker', 'onward-travel-checker', 'family-travel-checker',
].sort((a, b) => b.length - a.length);

function deriveToolSlug(pagePath) {
  const clean = String(pagePath).replace(/^\//, '').replace(/\.html$/i, '').split('?')[0].split('#')[0];
  if (clean === 'free-travel-tools') return 'free-travel-tools-hub';
  for (const slug of TOOL_BASE_SLUGS) {
    if (clean === slug || clean.startsWith(slug + '-')) return slug;
  }
  return null;
}

// @desc Record a pageview beacon from a free-tool page. Public, fire-and-
//   forget from the visitor's browser — always resolve 200 so a tracking
//   failure never surfaces as a visible error on the page.
// @route POST /api/analytics/free-tools/track
// @access Public
exports.trackFreeToolPageview = async (req, res) => {
  try {
    const { path: rawPath } = req.body;
    if (!rawPath || typeof rawPath !== 'string' || rawPath.length > 300) {
      return res.status(200).json({ success: true, tracked: false });
    }
    const toolSlug = deriveToolSlug(rawPath);
    if (!toolSlug) {
      return res.status(200).json({ success: true, tracked: false });
    }
    await pool.query(
      'INSERT INTO free_tool_page_views (page_path, tool_slug) VALUES ($1, $2)',
      [rawPath.slice(0, 300), toolSlug]
    );
    res.status(200).json({ success: true, tracked: true });
  } catch (error) {
    console.error('trackFreeToolPageview error:', error.message);
    res.status(200).json({ success: true, tracked: false });
  }
};

// @desc Daily pageview totals across all free-tool pages, for a chart.
// @route GET /api/analytics/free-tools/daily?days=30
// @access Admin
exports.getDailyPageviews = async (req, res) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
    const { rows } = await pool.query(
      `SELECT to_char(date_trunc('day', viewed_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS views
       FROM free_tool_page_views
       WHERE viewed_at >= NOW() - ($1 || ' days')::interval
       GROUP BY 1
       ORDER BY 1 ASC`,
      [days]
    );
    res.json({ success: true, days, data: rows });
  } catch (error) {
    console.error('getDailyPageviews error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Top-level totals (today / yesterday / 7d / 30d / all-time) across
//   all free-tool pages.
// @route GET /api/analytics/free-tools/summary
// @access Admin
exports.getFreeToolsSummary = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE viewed_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE viewed_at >= date_trunc('day', NOW()) - interval '1 day'
                            AND viewed_at < date_trunc('day', NOW()))::int AS yesterday,
        COUNT(*) FILTER (WHERE viewed_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*) FILTER (WHERE viewed_at >= NOW() - interval '30 days')::int AS last_30_days,
        COUNT(*)::int AS all_time
      FROM free_tool_page_views
    `);
    res.json({ success: true, summary: rows[0] });
  } catch (error) {
    console.error('getFreeToolsSummary error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Top pages or top tools by view count, over a given period.
// @route GET /api/analytics/free-tools/top?period=today&limit=10&groupBy=page
// @access Admin
exports.getTopFreeToolPages = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const period = ['today', '7days', '30days', 'all'].includes(req.query.period) ? req.query.period : 'today';
    const groupBy = req.query.groupBy === 'tool' ? 'tool' : 'page';

    let whereClause = '';
    if (period === 'today') whereClause = `WHERE viewed_at >= date_trunc('day', NOW())`;
    else if (period === '7days') whereClause = `WHERE viewed_at >= NOW() - interval '7 days'`;
    else if (period === '30days') whereClause = `WHERE viewed_at >= NOW() - interval '30 days'`;

    const selectCols = groupBy === 'tool' ? 'tool_slug' : 'page_path, tool_slug';
    const groupCols = groupBy === 'tool' ? 'tool_slug' : 'page_path, tool_slug';

    const { rows } = await pool.query(
      `SELECT ${selectCols}, COUNT(*)::int AS views
       FROM free_tool_page_views
       ${whereClause}
       GROUP BY ${groupCols}
       ORDER BY views DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, period, groupBy, data: rows });
  } catch (error) {
    console.error('getTopFreeToolPages error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Counts + recent list of tweets that promoted a free-tool page
//   (posted by toolPromoTwitterService's 3x/day scheduler), for the "Free
//   Tools" admin tab's post counter.
// @route GET /api/analytics/free-tools/twitter-posts
// @access Admin
exports.getToolPromoTwitterStats = async (req, res) => {
  try {
    const { rows: summaryRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE posted_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '30 days')::int AS last_30_days,
        COUNT(*)::int AS all_time
      FROM twitter_posts
      WHERE tool_slug IS NOT NULL
    `);

    const { rows: recent } = await pool.query(`
      SELECT tool_slug, url, tweet_id, posted_at
      FROM twitter_posts
      WHERE tool_slug IS NOT NULL
      ORDER BY posted_at DESC
      LIMIT 10
    `);

    res.json({ success: true, summary: summaryRows[0], recent });
  } catch (error) {
    console.error('getToolPromoTwitterStats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Counts + recent list of Blogger articles that promoted a free-tool
//   page (posted by toolPromoBloggerService's 1x/day scheduler), for the
//   "Free Tools" admin tab's post counter.
// @route GET /api/analytics/free-tools/blogger-posts
// @access Admin
exports.getToolPromoBloggerStats = async (req, res) => {
  try {
    const { rows: summaryRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE posted_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '30 days')::int AS last_30_days,
        COUNT(*)::int AS all_time
      FROM blogger_posts
      WHERE tool_slug IS NOT NULL
    `);

    const { rows: recent } = await pool.query(`
      SELECT tool_slug, tool_url, title, blogger_url, posted_at
      FROM blogger_posts
      WHERE tool_slug IS NOT NULL
      ORDER BY posted_at DESC
      LIMIT 10
    `);

    res.json({ success: true, summary: summaryRows[0], recent });
  } catch (error) {
    console.error('getToolPromoBloggerStats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Counts + recent list of LinkedIn posts that promoted a free-tool
//   page (posted by toolPromoLinkedinService's 1x/day scheduler), for the
//   "Free Tools" admin tab's post counter.
// @route GET /api/analytics/free-tools/linkedin-posts
// @access Admin
exports.getToolPromoLinkedinStats = async (req, res) => {
  try {
    const { rows: summaryRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE posted_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '30 days')::int AS last_30_days,
        COUNT(*)::int AS all_time
      FROM linkedin_posts
      WHERE tool_slug IS NOT NULL
    `);

    const { rows: recent } = await pool.query(`
      SELECT tool_slug, tool_url, linkedin_post_id, posted_at
      FROM linkedin_posts
      WHERE tool_slug IS NOT NULL
      ORDER BY posted_at DESC
      LIMIT 10
    `);

    res.json({ success: true, summary: summaryRows[0], recent });
  } catch (error) {
    console.error('getToolPromoLinkedinStats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Counts + recent list of WordPress articles that promoted a
//   free-tool page (posted by toolPromoWordpressService's 1x/day
//   scheduler), for the "Free Tools" admin tab's post counter.
// @route GET /api/analytics/free-tools/wordpress-posts
// @access Admin
exports.getToolPromoWordpressStats = async (req, res) => {
  try {
    const { rows: summaryRows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE posted_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*) FILTER (WHERE posted_at >= NOW() - interval '30 days')::int AS last_30_days,
        COUNT(*)::int AS all_time
      FROM wordpress_posts
      WHERE tool_slug IS NOT NULL
    `);

    const { rows: recent } = await pool.query(`
      SELECT tool_slug, tool_url, title, wp_url, posted_at
      FROM wordpress_posts
      WHERE tool_slug IS NOT NULL
      ORDER BY posted_at DESC
      LIMIT 10
    `);

    res.json({ success: true, summary: summaryRows[0], recent });
  } catch (error) {
    console.error('getToolPromoWordpressStats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Top-level LEAD totals (today/yesterday/7d/30d/all-time) from
//   tool_leads — the actual email captures (PDF downloads), as opposed to
//   the anonymous pageviews above. Also reports how many have converted to
//   a real account (converted_to_user_id, set on signup — see
//   authController.signup).
// @route GET /api/analytics/free-tools/leads-summary
// @access Admin
exports.getLeadsSummary = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()))::int AS today,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW()) - interval '1 day'
                            AND created_at < date_trunc('day', NOW()))::int AS yesterday,
        COUNT(*) FILTER (WHERE created_at >= NOW() - interval '7 days')::int AS last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - interval '30 days')::int AS last_30_days,
        COUNT(*)::int AS all_time,
        COUNT(*) FILTER (WHERE converted_to_user_id IS NOT NULL)::int AS converted_all_time
      FROM tool_leads
    `);
    res.json({ success: true, summary: rows[0] });
  } catch (error) {
    console.error('getLeadsSummary error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Top pages or top tools by LEAD count (email captures, not just
//   views), plus how many of those leads converted to a real account —
//   the lead-side counterpart to getTopFreeToolPages above.
// @route GET /api/analytics/free-tools/leads-top?period=today&limit=10&groupBy=page
// @access Admin
exports.getTopFreeToolLeads = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const period = ['today', '7days', '30days', 'all'].includes(req.query.period) ? req.query.period : 'today';
    const groupBy = req.query.groupBy === 'tool' ? 'tool' : 'page';

    let whereClause = '';
    if (period === 'today') whereClause = `WHERE created_at >= date_trunc('day', NOW())`;
    else if (period === '7days') whereClause = `WHERE created_at >= NOW() - interval '7 days'`;
    else if (period === '30days') whereClause = `WHERE created_at >= NOW() - interval '30 days'`;

    const selectCols = groupBy === 'tool' ? 'tool_slug' : 'source_page, tool_slug';
    const groupCols = groupBy === 'tool' ? 'tool_slug' : 'source_page, tool_slug';

    const { rows } = await pool.query(
      `SELECT ${selectCols}, COUNT(*)::int AS leads,
              COUNT(*) FILTER (WHERE converted_to_user_id IS NOT NULL)::int AS converted
       FROM tool_leads
       ${whereClause}
       GROUP BY ${groupCols}
       ORDER BY leads DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, period, groupBy, data: rows });
  } catch (error) {
    console.error('getTopFreeToolLeads error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Most recent individual leads — email, tool, exact source page, and
//   whether they've since converted to a real account.
// @route GET /api/analytics/free-tools/leads-recent?limit=20
// @access Admin
exports.getRecentLeads = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { rows } = await pool.query(
      `SELECT email, first_name, tool_slug, source_page, created_at,
              (converted_to_user_id IS NOT NULL) AS converted
       FROM tool_leads
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('getRecentLeads error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Same shape as server.js's POST /api/tools/*/pdf guard — kept in sync
// manually since one is a Postgres regex (~) and the other a JS RegExp.
const INVALID_EMAIL_SQL = `email !~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'`;

// @desc Preview tool_leads rows with a malformed email (not a real
//   address — e.g. a tool slug used as a placeholder during ad hoc API
//   testing before the format guard existed). Call before DELETE to see
//   exactly what would be removed.
// @route GET /api/analytics/free-tools/invalid-leads
// @access Admin
exports.getInvalidLeads = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, first_name, tool_slug, source_page, created_at
       FROM tool_leads
       WHERE ${INVALID_EMAIL_SQL}
       ORDER BY created_at DESC`
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('getInvalidLeads error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc Permanently delete every tool_leads row with a malformed email
//   (cascades to tool_lead_scheduled_emails, cancelling their drip too).
//   Irreversible — the admin UI shows the preview list and asks for
//   confirmation before calling this.
// @route DELETE /api/analytics/free-tools/invalid-leads
// @access Admin
exports.deleteInvalidLeads = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM tool_leads WHERE ${INVALID_EMAIL_SQL} RETURNING id`
    );
    res.json({ success: true, deleted: rows.length });
  } catch (error) {
    console.error('deleteInvalidLeads error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Health & Safety tools switched from a single-tool PDF offer to a
// multi-check category-bundle PDF offer on this date — see
// categoryBundleController.js. Everything below exists to answer one
// question with real data instead of a guess: did that change actually
// raise the tool-page-to-lead conversion rate.
const BUNDLE_ROLLOUT_DATE = '2026-07-30';
const BUNDLE_CATEGORY_SLUG = 'bundle-health-safety';
const BUNDLE_CATEGORY_TOOL_SLUGS = [
  'travel-health-checker', 'yellow-fever-checker', 'pregnancy-travel-checker',
  'water-safety-checker', 'uv-index-checker', 'wildlife-safety-checker',
  'natural-disaster-checker', 'emergency-number-checker', 'tourist-scams-checker',
  'solo-female-travel-checker', 'beach-safety-checker', 'air-quality-checker',
  'street-food-checker', 'altitude-sickness-checker', 'travel-advisory-checker',
];

// A bundle lead's own tool_slug is just 'bundle-health-safety' — it doesn't
// say which of the 15 tool pages the visitor actually converted on. That's
// only recoverable from source_page, run through the same deriveToolSlug()
// used for pageview attribution. Pre-rollout leads already carry the
// correct tool_slug directly and pass through untouched.
function attributeLeadToTool(lead) {
  if (lead.tool_slug === BUNDLE_CATEGORY_SLUG) {
    return lead.source_page ? deriveToolSlug(lead.source_page) : null;
  }
  return BUNDLE_CATEGORY_TOOL_SLUGS.includes(lead.tool_slug) ? lead.tool_slug : null;
}

// @desc Before/after conversion rate (leads ÷ pageviews) for the 15
//   Health & Safety tools, split at BUNDLE_ROLLOUT_DATE, both as a daily
//   series (combined across all 15) and a per-tool before/after
//   breakdown — the actual data needed to judge whether the category-
//   bundle PDF change (single-tool offer -> multi-check bundle offer)
//   moved the needle, instead of guessing.
// @route GET /api/analytics/free-tools/bundle-conversion?days=60
// @access Admin
exports.getBundleConversionStats = async (req, res) => {
  try {
    const days = Math.min(180, Math.max(7, parseInt(req.query.days, 10) || 60));

    const { rows: viewRows } = await pool.query(
      `SELECT to_char(date_trunc('day', viewed_at), 'YYYY-MM-DD') AS date, tool_slug, COUNT(*)::int AS views
       FROM free_tool_page_views
       WHERE viewed_at >= NOW() - ($1 || ' days')::interval
         AND tool_slug = ANY($2)
       GROUP BY 1, 2`,
      [days, BUNDLE_CATEGORY_TOOL_SLUGS]
    );

    const { rows: leadRows } = await pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS date, tool_slug, source_page
       FROM tool_leads
       WHERE created_at >= NOW() - ($1 || ' days')::interval
         AND (tool_slug = ANY($2) OR tool_slug = $3)`,
      [days, BUNDLE_CATEGORY_TOOL_SLUGS, BUNDLE_CATEGORY_SLUG]
    );

    // date -> tool_slug -> {views, leads}
    const byDate = {};
    const ensure = (date, tool) => {
      if (!byDate[date]) byDate[date] = {};
      if (!byDate[date][tool]) byDate[date][tool] = { views: 0, leads: 0 };
      return byDate[date][tool];
    };

    for (const row of viewRows) ensure(row.date, row.tool_slug).views += row.views;
    for (const row of leadRows) {
      const tool = attributeLeadToTool(row);
      if (tool && BUNDLE_CATEGORY_TOOL_SLUGS.includes(tool)) ensure(row.date, tool).leads += 1;
    }

    // Combined daily series across all 15 tools.
    const daily = Object.keys(byDate).sort().map(date => {
      const tools = byDate[date];
      const views = Object.values(tools).reduce((s, t) => s + t.views, 0);
      const leads = Object.values(tools).reduce((s, t) => s + t.leads, 0);
      return { date, views, leads, rate: views > 0 ? +(leads / views * 100).toFixed(2) : null };
    });

    const sumPeriod = (predicate) => {
      let views = 0, leads = 0, dayCount = 0;
      for (const d of daily) {
        if (!predicate(d.date)) continue;
        views += d.views; leads += d.leads; dayCount++;
      }
      return { days: dayCount, views, leads, rate: views > 0 ? +(leads / views * 100).toFixed(2) : null };
    };
    const before = sumPeriod(date => date < BUNDLE_ROLLOUT_DATE);
    const after = sumPeriod(date => date >= BUNDLE_ROLLOUT_DATE);

    // Per-tool before/after breakdown.
    const perTool = BUNDLE_CATEGORY_TOOL_SLUGS.map(tool => {
      const acc = { before: { views: 0, leads: 0 }, after: { views: 0, leads: 0 } };
      for (const date of Object.keys(byDate)) {
        const cell = byDate[date][tool];
        if (!cell) continue;
        const bucket = date < BUNDLE_ROLLOUT_DATE ? acc.before : acc.after;
        bucket.views += cell.views; bucket.leads += cell.leads;
      }
      const rate = (b) => b.views > 0 ? +(b.leads / b.views * 100).toFixed(2) : null;
      return {
        tool_slug: tool,
        before: { ...acc.before, rate: rate(acc.before) },
        after: { ...acc.after, rate: rate(acc.after) },
      };
    });

    res.json({
      success: true,
      rolloutDate: BUNDLE_ROLLOUT_DATE,
      days,
      daily,
      beforeAfter: { before, after },
      perTool,
    });
  } catch (error) {
    console.error('getBundleConversionStats error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deriveToolSlug = deriveToolSlug;
exports.TOOL_BASE_SLUGS = TOOL_BASE_SLUGS;
