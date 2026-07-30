const express = require('express');
const router = express.Router();
const {
  getTripBriefTools,
  getTripBriefDestinations,
  getSampleTripBriefPdf,
  checkLifetimeAccess,
  createCheckoutSession,
} = require('../controllers/tripBriefController');

router.get('/tools', getTripBriefTools);
router.get('/destinations', getTripBriefDestinations);
router.get('/sample-pdf', getSampleTripBriefPdf);
router.post('/check-access', checkLifetimeAccess);
router.post('/checkout', createCheckoutSession);

module.exports = router;
