const express = require('express');
const router = express.Router();
const airQualityController = require('../controllers/airQualityController');

router.post('/air-quality-checker/calculate', airQualityController.calculateAirQuality);
router.post('/air-quality-checker/pdf', airQualityController.generateAirQualityPdf);

module.exports = router;
