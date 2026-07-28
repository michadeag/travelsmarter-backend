const express = require('express');
const router = express.Router();
const accessibleTravelController = require('../controllers/accessibleTravelController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/accessible-travel-checker/calculate', accessibleTravelController.calculateAccessibleTravel);
router.post('/accessible-travel-checker/pdf', accessibleTravelController.generateAccessibleTravelPdf);

module.exports = router;
