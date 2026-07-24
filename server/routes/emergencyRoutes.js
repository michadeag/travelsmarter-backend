const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/emergency-number-checker/calculate', emergencyController.calculateEmergencyNumbers);
router.post('/emergency-number-checker/pdf', emergencyController.generateEmergencyPdf);

module.exports = router;
