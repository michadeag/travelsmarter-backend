const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/currency-checker/calculate', currencyController.calculateCurrency);
router.post('/currency-checker/pdf', currencyController.generateCurrencyPdf);

module.exports = router;
