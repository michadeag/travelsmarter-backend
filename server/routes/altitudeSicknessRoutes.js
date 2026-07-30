const express = require('express');
const router = express.Router();
const altitudeSicknessController = require('../controllers/altitudeSicknessController');

router.post('/altitude-sickness-checker/calculate', altitudeSicknessController.calculateAltitudeSickness);
router.post('/altitude-sickness-checker/pdf', altitudeSicknessController.generateAltitudeSicknessPdf);

module.exports = router;
