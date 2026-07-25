const express = require('express');
const router = express.Router();
const airportAmenitiesController = require('../controllers/airportAmenitiesController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/airport-amenities-checker/calculate', airportAmenitiesController.calculateAirportAmenities);
router.post('/airport-amenities-checker/pdf', airportAmenitiesController.generateAirportAmenitiesPdf);

module.exports = router;
