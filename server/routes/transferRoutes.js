const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/airport-transfer-calculator/calculate', transferController.calculateTransfer);
router.post('/airport-transfer-calculator/pdf', transferController.generateTransferPdf);

module.exports = router;
