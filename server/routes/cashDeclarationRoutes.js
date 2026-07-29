const express = require('express');
const router = express.Router();
const cashDeclarationController = require('../controllers/cashDeclarationController');

router.post('/cash-declaration-checker/calculate', cashDeclarationController.calculateCashDeclaration);
router.post('/cash-declaration-checker/pdf', cashDeclarationController.generateCashDeclarationPdf);

module.exports = router;
