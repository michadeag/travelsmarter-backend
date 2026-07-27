const express = require('express');
const router = express.Router();
const travelAdvisoryController = require('../controllers/travelAdvisoryController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/travel-advisory-checker/calculate', travelAdvisoryController.calculateTravelAdvisory);
router.post('/travel-advisory-checker/pdf', travelAdvisoryController.generateTravelAdvisoryPdf);

module.exports = router;
