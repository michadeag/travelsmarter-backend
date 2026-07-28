const express = require('express');
const router = express.Router();
const photographyPermitController = require('../controllers/photographyPermitController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/photography-permit-checker/calculate', photographyPermitController.calculatePhotographyPermit);
router.post('/photography-permit-checker/pdf', photographyPermitController.generatePhotographyPermitPdf);

module.exports = router;
