const express = require('express');
const router = express.Router();
const departureTaxController = require('../controllers/departureTaxController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/departure-tax-checker/calculate', departureTaxController.calculateDepartureTax);
router.post('/departure-tax-checker/pdf', departureTaxController.generateDepartureTaxPdf);

module.exports = router;
