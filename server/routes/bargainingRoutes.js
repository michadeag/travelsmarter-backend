const express = require('express');
const router = express.Router();
const bargainingController = require('../controllers/bargainingController');

router.post('/bargaining-checker/calculate', bargainingController.calculateBargaining);
router.post('/bargaining-checker/pdf', bargainingController.generateBargainingPdf);

module.exports = router;
