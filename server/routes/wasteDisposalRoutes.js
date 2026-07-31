const express = require('express');
const router = express.Router();
const wasteDisposalController = require('../controllers/wasteDisposalController');

router.post('/waste-disposal-checker/calculate', wasteDisposalController.calculateWasteDisposal);
router.post('/waste-disposal-checker/pdf', wasteDisposalController.generateWasteDisposalPdf);

module.exports = router;
