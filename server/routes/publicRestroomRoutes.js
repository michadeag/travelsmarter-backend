const express = require('express');
const router = express.Router();
const publicRestroomController = require('../controllers/publicRestroomController');

router.post('/public-restroom-checker/calculate', publicRestroomController.calculatePublicRestroom);
router.post('/public-restroom-checker/pdf', publicRestroomController.generatePublicRestroomPdf);

module.exports = router;
