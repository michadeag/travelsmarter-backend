const express = require('express');
const router = express.Router();
const pharmacyController = require('../controllers/pharmacyController');

router.post('/pharmacy-checker/calculate', pharmacyController.calculatePharmacy);
router.post('/pharmacy-checker/pdf', pharmacyController.generatePharmacyPdf);

module.exports = router;
