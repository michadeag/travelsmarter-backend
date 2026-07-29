const express = require('express');
const router = express.Router();
const halalFoodController = require('../controllers/halalFoodController');

router.post('/halal-food-checker/calculate', halalFoodController.calculateHalalFood);
router.post('/halal-food-checker/pdf', halalFoodController.generateHalalFoodPdf);

module.exports = router;
