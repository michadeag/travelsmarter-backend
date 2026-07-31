const express = require('express');
const router = express.Router();
const bikeScooterController = require('../controllers/bikeScooterController');

router.post('/bike-scooter-checker/calculate', bikeScooterController.calculateBikeScooter);
router.post('/bike-scooter-checker/pdf', bikeScooterController.generateBikeScooterPdf);

module.exports = router;
