const express = require('express');
const router = express.Router();
const uvIndexController = require('../controllers/uvIndexController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/uv-index-checker/calculate', uvIndexController.calculateUvIndex);
router.post('/uv-index-checker/pdf', uvIndexController.generateUvIndexPdf);

module.exports = router;
