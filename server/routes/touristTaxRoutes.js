const express = require('express');
const router = express.Router();
const touristTaxController = require('../controllers/touristTaxController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/tourist-tax-checker/calculate', touristTaxController.calculateTouristTax);
router.post('/tourist-tax-checker/pdf', touristTaxController.generateTouristTaxPdf);

module.exports = router;
