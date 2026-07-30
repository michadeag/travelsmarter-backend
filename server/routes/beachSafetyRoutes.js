const express = require('express');
const router = express.Router();
const beachSafetyController = require('../controllers/beachSafetyController');

router.post('/beach-safety-checker/calculate', beachSafetyController.calculateBeachSafety);
router.post('/beach-safety-checker/pdf', beachSafetyController.generateBeachSafetyPdf);

module.exports = router;
