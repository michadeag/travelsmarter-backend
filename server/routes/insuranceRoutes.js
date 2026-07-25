const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/insurance-cost-estimator/calculate', insuranceController.calculateInsurance);
router.post('/insurance-cost-estimator/pdf', insuranceController.generateInsurancePdf);

module.exports = router;
