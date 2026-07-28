const express = require('express');
const router = express.Router();
const touristScamsController = require('../controllers/touristScamsController');

router.post('/tourist-scams-checker/calculate', touristScamsController.calculateTouristScams);
router.post('/tourist-scams-checker/pdf', touristScamsController.generateTouristScamsPdf);

module.exports = router;
