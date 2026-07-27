const express = require('express');
const router = express.Router();
const drinkingAgeController = require('../controllers/drinkingAgeController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/drinking-age-checker/calculate', drinkingAgeController.calculateDrinkingAge);
router.post('/drinking-age-checker/pdf', drinkingAgeController.generateDrinkingAgePdf);

module.exports = router;
