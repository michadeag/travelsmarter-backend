const express = require('express');
const router = express.Router();
const greetingController = require('../controllers/greetingController');

router.post('/greeting-checker/calculate', greetingController.calculateGreeting);
router.post('/greeting-checker/pdf', greetingController.generateGreetingPdf);

module.exports = router;
