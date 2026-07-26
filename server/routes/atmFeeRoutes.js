const express = require('express');
const router = express.Router();
const atmFeeController = require('../controllers/atmFeeController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/atm-fee-checker/calculate', atmFeeController.calculateAtmFee);
router.post('/atm-fee-checker/pdf', atmFeeController.generateAtmFeePdf);

module.exports = router;
