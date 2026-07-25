const express = require('express');
const router = express.Router();
const languageController = require('../controllers/languageController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/language-checker/calculate', languageController.calculateLanguage);
router.post('/language-checker/pdf', languageController.generateLanguagePdf);

module.exports = router;
