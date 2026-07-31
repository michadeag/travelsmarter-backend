const express = require('express');
const router = express.Router();
const soloDiningController = require('../controllers/soloDiningController');

router.post('/solo-dining-checker/calculate', soloDiningController.calculateSoloDining);
router.post('/solo-dining-checker/pdf', soloDiningController.generateSoloDiningPdf);

module.exports = router;
