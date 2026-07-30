const express = require('express');
const router = express.Router();
const weddingLegalController = require('../controllers/weddingLegalController');

router.post('/wedding-legal-checker/calculate', weddingLegalController.calculateWeddingLegal);
router.post('/wedding-legal-checker/pdf', weddingLegalController.generateWeddingLegalPdf);

module.exports = router;
