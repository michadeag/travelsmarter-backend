const express = require('express');
const router = express.Router();
const taxiFareController = require('../controllers/taxiFareController');

router.post('/taxi-fare-checker/calculate', taxiFareController.calculateTaxiFare);
router.post('/taxi-fare-checker/pdf', taxiFareController.generateTaxiFarePdf);

module.exports = router;
