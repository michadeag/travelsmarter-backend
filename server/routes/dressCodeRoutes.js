const express = require('express');
const router = express.Router();
const dressCodeController = require('../controllers/dressCodeController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/dress-code-checker/calculate', dressCodeController.calculateDressCode);
router.post('/dress-code-checker/pdf', dressCodeController.generateDressCodePdf);

module.exports = router;
