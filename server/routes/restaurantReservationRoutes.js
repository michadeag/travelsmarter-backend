const express = require('express');
const router = express.Router();
const restaurantReservationController = require('../controllers/restaurantReservationController');

router.post('/restaurant-reservation-checker/calculate', restaurantReservationController.calculateRestaurantReservation);
router.post('/restaurant-reservation-checker/pdf', restaurantReservationController.generateRestaurantReservationPdf);

module.exports = router;
