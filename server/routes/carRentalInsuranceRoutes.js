const express = require('express');
const router = express.Router();
const carRentalInsuranceController = require('../controllers/carRentalInsuranceController');

router.post('/car-rental-insurance-checker/calculate', carRentalInsuranceController.calculateCarRentalInsurance);
router.post('/car-rental-insurance-checker/pdf', carRentalInsuranceController.generateCarRentalInsurancePdf);

module.exports = router;
