const express = require('express');
const router = express.Router();
const pregnancyTravelController = require('../controllers/pregnancyTravelController');

router.post('/pregnancy-travel-checker/calculate', pregnancyTravelController.calculatePregnancyTravel);
router.post('/pregnancy-travel-checker/pdf', pregnancyTravelController.generatePregnancyTravelPdf);

module.exports = router;
