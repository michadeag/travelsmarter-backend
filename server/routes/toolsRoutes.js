const express = require('express');
const router = express.Router();
const toolsController = require('../controllers/toolsController');

// Public, no auth — these are top-of-funnel lead-gen tools for anonymous visitors.
router.post('/best-time-to-book/calculate', toolsController.calculateBestTimeToBook);
router.post('/best-time-to-book/pdf', toolsController.generateBestTimeToBookPdf);

module.exports = router;
