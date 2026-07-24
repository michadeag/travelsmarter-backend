const express = require('express');
const router = express.Router();
const carbonController = require('../controllers/carbonController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/carbon-calculator/calculate', carbonController.calculateCarbon);
router.post('/carbon-calculator/pdf', carbonController.generateCarbonPdf);

module.exports = router;
