const express = require('express');
const router = express.Router();
const tippingController = require('../controllers/tippingController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/tipping-calculator/calculate', tippingController.calculateTip);
router.post('/tipping-calculator/pdf', tippingController.generateTippingPdf);

module.exports = router;
