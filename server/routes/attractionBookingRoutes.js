const express = require('express');
const router = express.Router();
const attractionBookingController = require('../controllers/attractionBookingController');

router.post('/attraction-booking-checker/calculate', attractionBookingController.calculateAttractionBooking);
router.post('/attraction-booking-checker/pdf', attractionBookingController.generateAttractionBookingPdf);

module.exports = router;
