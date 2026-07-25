const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminAuth');
const { protectWithAdminFallback } = require('../middleware/auth');
const {
  getAnalytics,
  getUserGrowth,
  getSubscriptionDistribution,
  getPopularHacks,
  trackPageview,
  getPageviews
} = require('../controllers/analyticsController');
const {
  trackFreeToolPageview,
  getDailyPageviews,
  getFreeToolsSummary,
  getTopFreeToolPages,
  getToolPromoTwitterStats,
  getToolPromoBloggerStats,
  getToolPromoWordpressStats
} = require('../controllers/freeToolAnalyticsController');

// All analytics routes require admin authentication
router.get('/summary', verifyAdminToken, getAnalytics);
router.get('/user-growth', verifyAdminToken, getUserGrowth);
router.get('/subscriptions', verifyAdminToken, getSubscriptionDistribution);
router.get('/popular-hacks', verifyAdminToken, getPopularHacks);

// Pageview tracking (POST is public, GET accepts both user and admin tokens)
router.post('/track', trackPageview);
router.get('/pageviews', protectWithAdminFallback, getPageviews);

// Free-tool pageview tracking (POST is public, beacon from every free-tool
// page; GET endpoints power the admin "Free Tools" analytics tab)
router.post('/free-tools/track', trackFreeToolPageview);
router.get('/free-tools/daily', verifyAdminToken, getDailyPageviews);
router.get('/free-tools/summary', verifyAdminToken, getFreeToolsSummary);
router.get('/free-tools/top', verifyAdminToken, getTopFreeToolPages);
router.get('/free-tools/twitter-posts', verifyAdminToken, getToolPromoTwitterStats);
router.get('/free-tools/blogger-posts', verifyAdminToken, getToolPromoBloggerStats);
router.get('/free-tools/wordpress-posts', verifyAdminToken, getToolPromoWordpressStats);

module.exports = router;
