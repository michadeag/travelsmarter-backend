const express = require('express');
const router = express.Router();
const publicHolidayController = require('../controllers/publicHolidayController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/public-holiday-checker/calculate', publicHolidayController.calculatePublicHoliday);
router.post('/public-holiday-checker/pdf', publicHolidayController.generatePublicHolidayPdf);

module.exports = router;
