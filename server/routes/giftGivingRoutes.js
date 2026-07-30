const express = require('express');
const router = express.Router();
const giftGivingController = require('../controllers/giftGivingController');

router.post('/gift-giving-checker/calculate', giftGivingController.calculateGiftGiving);
router.post('/gift-giving-checker/pdf', giftGivingController.generateGiftGivingPdf);

module.exports = router;
