const express = require('express');
const router = express.Router();
const streetFoodController = require('../controllers/streetFoodController');

router.post('/street-food-checker/calculate', streetFoodController.calculateStreetFood);
router.post('/street-food-checker/pdf', streetFoodController.generateStreetFoodPdf);

module.exports = router;
