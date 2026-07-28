const express = require('express');
const router = express.Router();
const souvenirExportController = require('../controllers/souvenirExportController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/souvenir-export-checker/calculate', souvenirExportController.calculateSouvenirExport);
router.post('/souvenir-export-checker/pdf', souvenirExportController.generateSouvenirExportPdf);

module.exports = router;
