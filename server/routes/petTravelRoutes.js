const express = require('express');
const router = express.Router();
const petTravelController = require('../controllers/petTravelController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/pet-travel-checker/calculate', petTravelController.calculatePetTravel);
router.post('/pet-travel-checker/pdf', petTravelController.generatePetTravelPdf);

module.exports = router;
