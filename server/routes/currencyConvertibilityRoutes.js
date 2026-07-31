const express = require('express');
const router = express.Router();
const currencyConvertibilityController = require('../controllers/currencyConvertibilityController');

router.post('/currency-convertibility-checker/calculate', currencyConvertibilityController.calculateCurrencyConvertibility);
router.post('/currency-convertibility-checker/pdf', currencyConvertibilityController.generateCurrencyConvertibilityPdf);

module.exports = router;
