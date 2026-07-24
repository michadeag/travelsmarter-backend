const express = require('express');
const router = express.Router();
const waterController = require('../controllers/waterController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/water-safety-checker/calculate', waterController.calculateWaterSafety);
router.post('/water-safety-checker/pdf', waterController.generateWaterSafetyPdf);

module.exports = router;
