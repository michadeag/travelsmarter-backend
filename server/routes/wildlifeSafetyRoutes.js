const express = require('express');
const router = express.Router();
const wildlifeSafetyController = require('../controllers/wildlifeSafetyController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/wildlife-safety-checker/calculate', wildlifeSafetyController.calculateWildlifeSafety);
router.post('/wildlife-safety-checker/pdf', wildlifeSafetyController.generateWildlifeSafetyPdf);

module.exports = router;
