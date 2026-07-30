const express = require('express');
const router = express.Router();
const familyTravelController = require('../controllers/familyTravelController');

router.post('/family-travel-checker/calculate', familyTravelController.calculateFamilyTravel);
router.post('/family-travel-checker/pdf', familyTravelController.generateFamilyTravelPdf);

module.exports = router;
