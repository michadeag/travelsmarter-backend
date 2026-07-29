const express = require('express');
const router = express.Router();
const digitalNomadVisaController = require('../controllers/digitalNomadVisaController');

router.post('/digital-nomad-visa-checker/calculate', digitalNomadVisaController.calculateDigitalNomadVisa);
router.post('/digital-nomad-visa-checker/pdf', digitalNomadVisaController.generateDigitalNomadVisaPdf);

module.exports = router;
