const express = require('express');
const router = express.Router();
const internetSpeedController = require('../controllers/internetSpeedController');

router.post('/internet-speed-checker/calculate', internetSpeedController.calculateInternetSpeed);
router.post('/internet-speed-checker/pdf', internetSpeedController.generateInternetSpeedPdf);

module.exports = router;
