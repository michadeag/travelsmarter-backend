const express = require('express');
const router = express.Router();
const laundryController = require('../controllers/laundryController');

router.post('/laundry-checker/calculate', laundryController.calculateLaundry);
router.post('/laundry-checker/pdf', laundryController.generateLaundryPdf);

module.exports = router;
