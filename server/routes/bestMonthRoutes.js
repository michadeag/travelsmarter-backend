const express = require('express');
const router = express.Router();
const bestMonthController = require('../controllers/bestMonthController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/best-month-checker/calculate', bestMonthController.calculateBestMonth);
router.post('/best-month-checker/pdf', bestMonthController.generateBestMonthPdf);

module.exports = router;
