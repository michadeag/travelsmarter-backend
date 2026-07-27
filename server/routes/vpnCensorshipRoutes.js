const express = require('express');
const router = express.Router();
const vpnCensorshipController = require('../controllers/vpnCensorshipController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/vpn-censorship-checker/calculate', vpnCensorshipController.calculateVpnCensorship);
router.post('/vpn-censorship-checker/pdf', vpnCensorshipController.generateVpnCensorshipPdf);

module.exports = router;
