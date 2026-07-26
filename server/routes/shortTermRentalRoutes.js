const express = require('express');
const router = express.Router();
const shortTermRentalController = require('../controllers/shortTermRentalController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/short-term-rental-checker/calculate', shortTermRentalController.calculateShortTermRental);
router.post('/short-term-rental-checker/pdf', shortTermRentalController.generateShortTermRentalPdf);

module.exports = router;
