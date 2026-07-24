const express = require('express');
const router = express.Router();
const carryOnController = require('../controllers/carryOnController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/carry-on-checker/calculate', carryOnController.calculateCarryOnFit);
router.post('/carry-on-checker/pdf', carryOnController.generateCarryOnPdf);

module.exports = router;
