const pool = require('../config/database');

/**
 * Get platform analytics data
 */
exports.getAnalytics = async (req, res) => {
  try {
    const [signups, conversions, churn, ltv] = await Promise.all([
      getSignupStats(),
      getConversionStats(),
      getChurnStats(),
      getLTVStats()
    ]);

    res.json({
      success: true,
      data: {
        signups,
        conversions,
        churn,
        ltv
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics'
    });
  }
};

/**
 * Get signup statistics
 */
async function getSignupStats() {
  try {
    // Get signups this month
    const thisMonth = await pool.query(`
      SELECT COUNT(*) as count FROM users
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    `);

    const thisMonthCount = parseInt(thisMonth.rows[0].count) || 0;

    // Get signups last month
    const lastMonth = await pool.query(`
      SELECT COUNT(*) as count FROM users
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    `);

    const lastMonthCount = parseInt(lastMonth.rows[0].count) || 0;

    // Calculate percentage change
    let percentChange = 0;
    if (lastMonthCount > 0) {
      percentChange = (((thisMonthCount - lastMonthCount) / lastMonthCount) * 100).toFixed(1);
    }

    return {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      percentChange: parseFloat(percentChange),
      label: thisMonthCount > lastMonthCount ? `+${percentChange}% vs last month` : `${percentChange}% vs last month`
    };
  } catch (error) {
    console.error('Error getting signup stats:', error);
    return { thisMonth: 0, lastMonth: 0, percentChange: 0, label: 'Error loading' };
  }
}

/**
 * Get conversion statistics (free to paid)
 */
async function getConversionStats() {
  try {
    // Get users with paid subscriptions
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM users
      WHERE subscription_tier IN ('smart_traveler', 'elite')
    `);

    const paidUsers = parseInt(result.rows[0].count) || 0;

    // Get total users
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalResult.rows[0].count) || 1;

    const conversionRate = ((paidUsers / totalUsers) * 100).toFixed(1);

    return {
      rate: parseFloat(conversionRate),
      paidUsers,
      totalUsers,
      label: `Free → Paid (${paidUsers}/${totalUsers} users)`
    };
  } catch (error) {
    console.error('Error getting conversion stats:', error);
    return { rate: 0, paidUsers: 0, totalUsers: 0, label: 'Error loading' };
  }
}

/**
 * Get churn statistics
 */
async function getChurnStats() {
  try {
    // Get users who had active subscriptions but now don't
    // For simplicity, count users who signed up but have free tier
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM users
      WHERE subscription_tier = 'free' AND created_at < CURRENT_DATE - INTERVAL '30 days'
    `);

    const churnedUsers = parseInt(result.rows[0].count) || 0;

    // Get total users who signed up more than 30 days ago
    const totalResult = await pool.query(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
    `);

    const totalEligible = parseInt(totalResult.rows[0].count) || 1;
    const churnRate = ((churnedUsers / totalEligible) * 100).toFixed(1);

    return {
      rate: parseFloat(churnRate),
      churnedUsers,
      label: 'Monthly churn rate'
    };
  } catch (error) {
    console.error('Error getting churn stats:', error);
    return { rate: 0, churnedUsers: 0, label: 'Error loading' };
  }
}

/**
 * Get lifetime value statistics
 */
async function getLTVStats() {
  try {
    // Calculate average subscription value
    const result = await pool.query(`
      SELECT
        AVG(CASE
          WHEN subscription_tier = 'elite' THEN 29.99
          WHEN subscription_tier = 'smart_traveler' THEN 9.99
          ELSE 0
        END) as avg_monthly,
        COUNT(*) as user_count
      FROM users
      WHERE subscription_tier IN ('smart_traveler', 'elite')
    `);

    const avgMonthly = parseFloat(result.rows[0].avg_monthly) || 0;
    // Estimate LTV as monthly * 12 months average subscription length
    const estimatedLTV = (avgMonthly * 12).toFixed(2);

    return {
      ltv: parseFloat(estimatedLTV),
      monthlyAvg: parseFloat(avgMonthly.toFixed(2)),
      label: 'Estimated lifetime value per user'
    };
  } catch (error) {
    console.error('Error getting LTV stats:', error);
    return { ltv: 0, monthlyAvg: 0, label: 'Error loading' };
  }
}

/**
 * Get user growth over time
 */
exports.getUserGrowth = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE_TRUNC('month', created_at)::DATE as month,
        COUNT(*) as signups
      FROM users
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `);

    const data = result.rows.map(row => ({
      month: row.month,
      signups: parseInt(row.signups)
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching user growth:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user growth data'
    });
  }
};

/**
 * Get subscription tier distribution
 */
exports.getSubscriptionDistribution = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        subscription_tier,
        COUNT(*) as count
      FROM users
      GROUP BY subscription_tier
    `);

    const data = result.rows.map(row => ({
      tier: row.subscription_tier,
      count: parseInt(row.count)
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching subscription distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription data'
    });
  }
};

/**
 * Track a pageview (public endpoint, no auth required)
 */
exports.trackPageview = async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        page VARCHAR(255) NOT NULL,
        referrer TEXT,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { page, referrer } = req.body;
    if (!page) return res.status(400).json({ success: false, message: 'page required' });

    await pool.query(
      'INSERT INTO page_views (page, referrer) VALUES ($1, $2)',
      [page, referrer || null]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking pageview:', error);
    res.status(500).json({ success: false, message: 'Failed to track pageview' });
  }
};

/**
 * Get pageview stats for a page (admin only)
 */
exports.getPageviews = async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        page VARCHAR(255) NOT NULL,
        referrer TEXT,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const page = req.query.page || 'welcome.html';

    const [total, today, week, byDay] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM page_views WHERE page = $1', [page]),
      pool.query(
        'SELECT COUNT(*) as count FROM page_views WHERE page = $1 AND visited_at >= CURRENT_DATE',
        [page]
      ),
      pool.query(
        'SELECT COUNT(*) as count FROM page_views WHERE page = $1 AND visited_at >= CURRENT_DATE - INTERVAL \'7 days\'',
        [page]
      ),
      pool.query(
        `SELECT DATE(visited_at) as day, COUNT(*) as count
         FROM page_views WHERE page = $1 AND visited_at >= CURRENT_DATE - INTERVAL '29 days'
         GROUP BY DATE(visited_at) ORDER BY day ASC`,
        [page]
      )
    ]);

    res.json({
      success: true,
      data: {
        page,
        total: parseInt(total.rows[0].count),
        today: parseInt(today.rows[0].count),
        last7Days: parseInt(week.rows[0].count),
        byDay: byDay.rows.map(r => ({ day: r.day, count: parseInt(r.count) }))
      }
    });
  } catch (error) {
    console.error('Error fetching pageviews:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pageviews' });
  }
};

/**
 * Get most popular hacks
 */
exports.getPopularHacks = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        h.id,
        h.title,
        COUNT(sh.user_id) as saved_count,
        h.description
      FROM hacks h
      LEFT JOIN saved_hacks sh ON h.id = sh.hack_id
      GROUP BY h.id, h.title, h.description
      ORDER BY saved_count DESC
      LIMIT 5
    `);

    const data = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      savedCount: parseInt(row.saved_count),
      description: row.description
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching popular hacks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hacks data'
    });
  }
};
