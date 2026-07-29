const express = require('express');
const router = express.Router();
const yellowFeverController = require('../controllers/yellowFeverController');

router.post('/yellow-fever-checker/calculate', yellowFeverController.calculateYellowFever);
router.post('/yellow-fever-checker/pdf', yellowFeverController.generateYellowFeverPdf);

module.exports = router;
