const express = require('express');
const router = express.Router();
const smokingVapingController = require('../controllers/smokingVapingController');

router.post('/smoking-vaping-checker/calculate', smokingVapingController.calculateSmokingVaping);
router.post('/smoking-vaping-checker/pdf', smokingVapingController.generateSmokingVapingPdf);

module.exports = router;
