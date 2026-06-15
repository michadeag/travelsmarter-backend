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

// All analytics routes require admin authentication
router.get('/summary', verifyAdminToken, getAnalytics);
router.get('/user-growth', verifyAdminToken, getUserGrowth);
router.get('/subscriptions', verifyAdminToken, getSubscriptionDistribution);
router.get('/popular-hacks', verifyAdminToken, getPopularHacks);

// Pageview tracking (POST is public, GET accepts both user and admin tokens)
router.post('/track', trackPageview);
router.get('/pageviews', protectWithAdminFallback, getPageviews);

module.exports = router;
