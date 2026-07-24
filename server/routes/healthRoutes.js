const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/health-checker/calculate', healthController.calculateHealthInfo);
router.post('/health-checker/pdf', healthController.generateHealthPdf);

module.exports = router;
