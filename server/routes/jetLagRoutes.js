const express = require('express');
const router = express.Router();
const jetLagController = require('../controllers/jetLagController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/jet-lag-calculator/calculate', jetLagController.calculateJetLag);
router.post('/jet-lag-calculator/pdf', jetLagController.generateJetLagPdf);

module.exports = router;
