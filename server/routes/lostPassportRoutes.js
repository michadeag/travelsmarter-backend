const express = require('express');
const router = express.Router();
const lostPassportController = require('../controllers/lostPassportController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/lost-passport-checker/calculate', lostPassportController.calculateLostPassport);
router.post('/lost-passport-checker/pdf', lostPassportController.generateLostPassportPdf);

module.exports = router;
