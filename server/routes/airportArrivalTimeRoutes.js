const express = require('express');
const router = express.Router();
const airportArrivalTimeController = require('../controllers/airportArrivalTimeController');

router.post('/airport-arrival-time-checker/calculate', airportArrivalTimeController.calculateAirportArrivalTime);
router.post('/airport-arrival-time-checker/pdf', airportArrivalTimeController.generateAirportArrivalTimePdf);

module.exports = router;
