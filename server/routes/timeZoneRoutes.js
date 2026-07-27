const express = require('express');
const router = express.Router();
const timeZoneController = require('../controllers/timeZoneController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/time-zone-checker/calculate', timeZoneController.calculateTimeZone);
router.post('/time-zone-checker/pdf', timeZoneController.generateTimeZonePdf);

module.exports = router;
