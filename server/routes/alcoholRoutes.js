const express = require('express');
const router = express.Router();
const alcoholController = require('../controllers/alcoholController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/alcohol-checker/calculate', alcoholController.calculateAlcohol);
router.post('/alcohol-checker/pdf', alcoholController.generateAlcoholPdf);

module.exports = router;
