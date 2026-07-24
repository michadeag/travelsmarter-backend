const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/budget-calculator/calculate', budgetController.calculateBudget);
router.post('/budget-calculator/pdf', budgetController.generateBudgetPdf);

module.exports = router;
