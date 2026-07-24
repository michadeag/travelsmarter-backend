const express = require('express');
const router = express.Router();
const delayCompensationController = require('../controllers/delayCompensationController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/delay-compensation-checker/calculate', delayCompensationController.calculateDelayCompensation);
router.post('/delay-compensation-checker/pdf', delayCompensationController.generateDelayCompensationPdf);

module.exports = router;
