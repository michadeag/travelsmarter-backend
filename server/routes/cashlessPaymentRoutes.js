const express = require('express');
const router = express.Router();
const cashlessPaymentController = require('../controllers/cashlessPaymentController');

router.post('/cashless-payment-checker/calculate', cashlessPaymentController.calculateCashlessPayment);
router.post('/cashless-payment-checker/pdf', cashlessPaymentController.generateCashlessPaymentPdf);

module.exports = router;
