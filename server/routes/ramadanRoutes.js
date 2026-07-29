const express = require('express');
const router = express.Router();
const ramadanController = require('../controllers/ramadanController');

router.post('/ramadan-checker/calculate', ramadanController.calculateRamadan);
router.post('/ramadan-checker/pdf', ramadanController.generateRamadanPdf);

module.exports = router;
