const express = require('express');
const router = express.Router();
const punctualityController = require('../controllers/punctualityController');

router.post('/punctuality-checker/calculate', punctualityController.calculatePunctuality);
router.post('/punctuality-checker/pdf', punctualityController.generatePunctualityPdf);

module.exports = router;
