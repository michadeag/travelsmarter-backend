const express = require('express');
const router = express.Router();
const minorConsentController = require('../controllers/minorConsentController');

router.post('/minor-consent-checker/calculate', minorConsentController.calculateMinorConsent);
router.post('/minor-consent-checker/pdf', minorConsentController.generateMinorConsentPdf);

module.exports = router;
