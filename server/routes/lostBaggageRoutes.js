const express = require('express');
const router = express.Router();
const lostBaggageController = require('../controllers/lostBaggageController');

router.post('/lost-baggage-checker/calculate', lostBaggageController.calculateLostBaggage);
router.post('/lost-baggage-checker/pdf', lostBaggageController.generateLostBaggagePdf);

module.exports = router;
