const express = require('express');
const router = express.Router();
const rentalAgeController = require('../controllers/rentalAgeController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/rental-age-checker/calculate', rentalAgeController.calculateRentalAge);
router.post('/rental-age-checker/pdf', rentalAgeController.generateRentalAgePdf);

module.exports = router;
