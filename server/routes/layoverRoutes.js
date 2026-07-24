const express = require('express');
const router = express.Router();
const layoverController = require('../controllers/layoverController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/layover-checker/calculate', layoverController.calculateLayover);
router.post('/layover-checker/pdf', layoverController.generateLayoverPdf);

module.exports = router;
