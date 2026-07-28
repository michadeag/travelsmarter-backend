const express = require('express');
const router = express.Router();
const overweightBaggageController = require('../controllers/overweightBaggageController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/overweight-baggage-checker/calculate', overweightBaggageController.calculateOverweightBaggage);
router.post('/overweight-baggage-checker/pdf', overweightBaggageController.generateOverweightBaggagePdf);

module.exports = router;
