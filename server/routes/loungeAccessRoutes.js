const express = require('express');
const router = express.Router();
const loungeAccessController = require('../controllers/loungeAccessController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/lounge-access-checker/calculate', loungeAccessController.calculateLoungeAccess);
router.post('/lounge-access-checker/pdf', loungeAccessController.generateLoungeAccessPdf);

module.exports = router;
