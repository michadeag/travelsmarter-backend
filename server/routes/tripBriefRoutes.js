const express = require('express');
const router = express.Router();
const {
  getTripBriefTools,
  getTripBriefDestinations,
  checkLifetimeAccess,
  createCheckoutSession,
} = require('../controllers/tripBriefController');

router.get('/tools', getTripBriefTools);
router.get('/destinations', getTripBriefDestinations);
router.post('/check-access', checkLifetimeAccess);
router.post('/checkout', createCheckoutSession);

module.exports = router;
