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
  getToolPromoWordpressStats,
  getToolPromoLinkedinStats,
  getLeadsSummary,
  getTopFreeToolLeads,
  getRecentLeads,
  getInvalidLeads,
  deleteInvalidLeads,
  deleteLead,
  getBundleConversionStats,
  trackToolCalculate,
  getFunnelStats,
  requeueFailedLeadEmails
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
router.post('/free-tools/track-calc', trackToolCalculate);
router.get('/free-tools/funnel', verifyAdminToken, getFunnelStats);
router.get('/free-tools/daily', verifyAdminToken, getDailyPageviews);
router.get('/free-tools/summary', verifyAdminToken, getFreeToolsSummary);
router.get('/free-tools/top', verifyAdminToken, getTopFreeToolPages);
router.get('/free-tools/twitter-posts', verifyAdminToken, getToolPromoTwitterStats);
router.get('/free-tools/blogger-posts', verifyAdminToken, getToolPromoBloggerStats);
router.get('/free-tools/wordpress-posts', verifyAdminToken, getToolPromoWordpressStats);
router.get('/free-tools/linkedin-posts', verifyAdminToken, getToolPromoLinkedinStats);

// Lead-capture reporting (tool_leads — actual email captures with a
// converted_to_user_id link to real signups, as opposed to the anonymous
// pageviews above)
router.get('/free-tools/leads-summary', verifyAdminToken, getLeadsSummary);
router.get('/free-tools/leads-top', verifyAdminToken, getTopFreeToolLeads);
router.get('/free-tools/leads-recent', verifyAdminToken, getRecentLeads);
router.get('/free-tools/invalid-leads', verifyAdminToken, getInvalidLeads);
router.delete('/free-tools/invalid-leads', verifyAdminToken, deleteInvalidLeads);
router.delete('/free-tools/leads/:id', verifyAdminToken, deleteLead);
router.post('/free-tools/requeue-failed-lead-emails', verifyAdminToken, requeueFailedLeadEmails);

// Health & Safety single-tool-PDF vs category-bundle-PDF conversion
// comparison — see categoryBundleController.js and the BUNDLE_ROLLOUT_DATE
// comment in freeToolAnalyticsController.js.
router.get('/free-tools/bundle-conversion', verifyAdminToken, getBundleConversionStats);

module.exports = router;
