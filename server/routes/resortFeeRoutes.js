const express = require('express');
const router = express.Router();
const resortFeeController = require('../controllers/resortFeeController');

router.post('/resort-fee-checker/calculate', resortFeeController.calculateResortFee);
router.post('/resort-fee-checker/pdf', resortFeeController.generateResortFeePdf);

module.exports = router;
