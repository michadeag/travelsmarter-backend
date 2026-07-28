const express = require('express');
const router = express.Router();
const lgbtqSafetyController = require('../controllers/lgbtqSafetyController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/lgbtq-travel-safety-checker/calculate', lgbtqSafetyController.calculateLgbtqSafety);
router.post('/lgbtq-travel-safety-checker/pdf', lgbtqSafetyController.generateLgbtqSafetyPdf);

module.exports = router;
