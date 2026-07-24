const express = require('express');
const router = express.Router();
const rideshareController = require('../controllers/rideshareController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/rideshare-checker/calculate', rideshareController.calculateRideshare);
router.post('/rideshare-checker/pdf', rideshareController.generateRideshareePdf);

module.exports = router;
