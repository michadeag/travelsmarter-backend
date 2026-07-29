const express = require('express');
const router = express.Router();
const soloFemaleTravelController = require('../controllers/soloFemaleTravelController');

router.post('/solo-female-travel-checker/calculate', soloFemaleTravelController.calculateSoloFemaleTravel);
router.post('/solo-female-travel-checker/pdf', soloFemaleTravelController.generateSoloFemaleTravelPdf);

module.exports = router;
