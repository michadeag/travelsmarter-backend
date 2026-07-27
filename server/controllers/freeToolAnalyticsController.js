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
  'drinking-age-checker', 'vpn-censorship-checker',
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

exports.deriveToolSlug = deriveToolSlug;
exports.TOOL_BASE_SLUGS = TOOL_BASE_SLUGS;
