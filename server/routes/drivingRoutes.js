const express = require('express');
const router = express.Router();
const drivingController = require('../controllers/drivingController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/driving-checker/calculate', drivingController.calculateDriving);
router.post('/driving-checker/pdf', drivingController.generateDrivingPdf);

module.exports = router;
