const express = require('express');
const router = express.Router();
const medicationLegalityController = require('../controllers/medicationLegalityController');

router.post('/medication-legality-checker/calculate', medicationLegalityController.calculateMedicationLegality);
router.post('/medication-legality-checker/pdf', medicationLegalityController.generateMedicationLegalityPdf);

module.exports = router;
