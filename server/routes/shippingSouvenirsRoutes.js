const express = require('express');
const router = express.Router();
const shippingSouvenirsController = require('../controllers/shippingSouvenirsController');

router.post('/shipping-souvenirs-checker/calculate', shippingSouvenirsController.calculateShippingSouvenirs);
router.post('/shipping-souvenirs-checker/pdf', shippingSouvenirsController.generateShippingSouvenirsPdf);

module.exports = router;
