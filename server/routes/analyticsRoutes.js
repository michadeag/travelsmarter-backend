const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/adminAuth');
const {
  getAnalytics,
  getUserGrowth,
  getSubscriptionDistribution,
  getPopularHacks
} = require('../controllers/analyticsController');

// All analytics routes require admin authentication
router.get('/summary', verifyAdminToken, getAnalytics);
router.get('/user-growth', verifyAdminToken, getUserGrowth);
router.get('/subscriptions', verifyAdminToken, getSubscriptionDistribution);
router.get('/popular-hacks', verifyAdminToken, getPopularHacks);

module.exports = router;
