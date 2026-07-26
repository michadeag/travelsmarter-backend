const express = require('express');
const router = express.Router();
const passportValidityController = require('../controllers/passportValidityController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/passport-validity-checker/calculate', passportValidityController.calculatePassportValidity);
router.post('/passport-validity-checker/pdf', passportValidityController.generatePassportValidityPdf);

module.exports = router;
