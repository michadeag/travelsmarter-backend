const express = require('express');
const router = express.Router();
const restaurantPaceController = require('../controllers/restaurantPaceController');

router.post('/restaurant-pace-checker/calculate', restaurantPaceController.calculateRestaurantPace);
router.post('/restaurant-pace-checker/pdf', restaurantPaceController.generateRestaurantPacePdf);

module.exports = router;
