const express = require('express');
const router = express.Router();
const simController = require('../controllers/simController');

// Public, no auth — top-of-funnel lead-gen tool for anonymous visitors.
router.post('/sim-checker/calculate', simController.calculateSim);
router.post('/sim-checker/pdf', simController.generateSimPdf);

module.exports = router;
