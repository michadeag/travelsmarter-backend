const express = require('express');
const router = express.Router();
const kosherFoodController = require('../controllers/kosherFoodController');

router.post('/kosher-food-checker/calculate', kosherFoodController.calculateKosherFood);
router.post('/kosher-food-checker/pdf', kosherFoodController.generateKosherFoodPdf);

module.exports = router;
