const express = require('express');
const router = express.Router();
const { protectWithAdminFallback } = require('../middleware/auth');
const {
  getTripBriefTools,
  getTripBriefDestinations,
  getSampleTripBriefPdf,
  checkLifetimeAccess,
  createCheckoutSession,
  getBatchTripBriefPdf,
  getEtsyListingCopy,
} = require('../controllers/tripBriefController');

router.get('/tools', getTripBriefTools);
router.get('/destinations', getTripBriefDestinations);
router.get('/sample-pdf', getSampleTripBriefPdf);
router.post('/check-access', checkLifetimeAccess);
router.post('/checkout', createCheckoutSession);
router.get('/admin/batch-pdf', protectWithAdminFallback, getBatchTripBriefPdf);
router.get('/admin/etsy-listing', protectWithAdminFallback, getEtsyListingCopy);

module.exports = router;
