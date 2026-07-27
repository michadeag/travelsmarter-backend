const express = require('express');
const router = express.Router();
const vatRefundController = require('../controllers/vatRefundController');

router.post('/vat-refund-checker/calculate', vatRefundController.calculateVatRefund);
router.post('/vat-refund-checker/pdf', vatRefundController.generateVatRefundPdf);

module.exports = router;
