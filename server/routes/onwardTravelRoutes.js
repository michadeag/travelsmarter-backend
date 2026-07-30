const express = require('express');
const router = express.Router();
const onwardTravelController = require('../controllers/onwardTravelController');

router.post('/onward-travel-checker/calculate', onwardTravelController.calculateOnwardTravel);
router.post('/onward-travel-checker/pdf', onwardTravelController.generateOnwardTravelPdf);

module.exports = router;
