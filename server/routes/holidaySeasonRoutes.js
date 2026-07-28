const express = require('express');
const router = express.Router();
const holidaySeasonController = require('../controllers/holidaySeasonController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/holiday-season-checker/calculate', holidaySeasonController.calculateHolidaySeason);
router.post('/holiday-season-checker/pdf', holidaySeasonController.generateHolidaySeasonPdf);

module.exports = router;
