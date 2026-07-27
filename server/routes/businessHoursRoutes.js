const express = require('express');
const router = express.Router();
const businessHoursController = require('../controllers/businessHoursController');

router.post('/business-hours-checker/calculate', businessHoursController.calculateBusinessHours);
router.post('/business-hours-checker/pdf', businessHoursController.generateBusinessHoursPdf);

module.exports = router;
