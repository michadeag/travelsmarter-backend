const express = require('express');
const router = express.Router();
const naturalDisasterController = require('../controllers/naturalDisasterController');

router.post('/natural-disaster-checker/calculate', naturalDisasterController.calculateNaturalDisaster);
router.post('/natural-disaster-checker/pdf', naturalDisasterController.generateNaturalDisasterPdf);

module.exports = router;
