const express = require('express');
const router = express.Router();
const baggageFeeController = require('../controllers/baggageFeeController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/baggage-fee-calculator/calculate', baggageFeeController.calculateBaggageFee);
router.post('/baggage-fee-calculator/pdf', baggageFeeController.generateBaggageFeePdf);

module.exports = router;
