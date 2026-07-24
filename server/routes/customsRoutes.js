const express = require('express');
const router = express.Router();
const customsController = require('../controllers/customsController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/customs-checker/calculate', customsController.calculateCustoms);
router.post('/customs-checker/pdf', customsController.generateCustomsPdf);

module.exports = router;
