const express = require('express');
const router = express.Router();
const plugController = require('../controllers/plugController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/plug-checker/calculate', plugController.calculatePlugRequirement);
router.post('/plug-checker/pdf', plugController.generatePlugPdf);

module.exports = router;
