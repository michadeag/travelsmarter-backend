const express = require('express');
const router = express.Router();
const queueCultureController = require('../controllers/queueCultureController');

router.post('/queue-culture-checker/calculate', queueCultureController.calculateQueueCulture);
router.post('/queue-culture-checker/pdf', queueCultureController.generateQueueCulturePdf);

module.exports = router;
