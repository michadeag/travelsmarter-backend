const express = require('express');
const router = express.Router();
const droneController = require('../controllers/droneController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/drone-checker/calculate', droneController.calculateDrone);
router.post('/drone-checker/pdf', droneController.generateDronePdf);

module.exports = router;
