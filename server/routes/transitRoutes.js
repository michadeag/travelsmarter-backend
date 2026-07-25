const express = require('express');
const router = express.Router();
const transitController = require('../controllers/transitController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/transit-checker/calculate', transitController.calculateTransit);
router.post('/transit-checker/pdf', transitController.generateTransitPdf);

module.exports = router;
