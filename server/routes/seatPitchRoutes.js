const express = require('express');
const router = express.Router();
const seatPitchController = require('../controllers/seatPitchController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/seat-pitch-checker/calculate', seatPitchController.calculateSeatPitch);
router.post('/seat-pitch-checker/pdf', seatPitchController.generateSeatPitchPdf);

module.exports = router;
