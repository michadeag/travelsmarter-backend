const express = require('express');
const router = express.Router();
const visaController = require('../controllers/visaController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/visa-checker/calculate', visaController.calculateVisaRequirement);
router.post('/visa-checker/pdf', visaController.generateVisaPdf);

module.exports = router;
